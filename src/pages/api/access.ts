import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import axios from "axios";
import { LRUCache } from "lru-cache";

const WC_BASE_URL = "https://beautyhub.ng/wp-json/wc/v3";
const WC_AUTH = {
  username: process.env.WC_KEY!,
  password: process.env.WC_SECRET!,
};

const rateLimiter = new LRUCache<string, number>({
  max: 500,
  ttl: 60 * 1000,
});

async function checkWooOrder(email: string): Promise<boolean> {
  try {
    const response = await axios.get(`${WC_BASE_URL}/orders`, {
      auth: WC_AUTH,
      params: { status: "completed", per_page: 100 },
    });

    return response.data.some(
      (order: any) =>
        order.billing?.email?.toLowerCase() === email.toLowerCase()
    );
  } catch (err) {
    console.error("WooCommerce check failed:", err);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const rawDeviceId = req.cookies.device_id?.trim();
  if (!rawDeviceId || rawDeviceId === "") {
    return res.status(400).json({
      error: "Missing device ID. Please enable cookies to continue.",
    });
  }
  const deviceId = rawDeviceId;

  const key = `access-check:${ip}`;
  const current = rateLimiter.get(key) || 0;
  const userAgent = req.headers["user-agent"] || "unknown";

  if (current >= 5) {
    return res
      .status(429)
      .json({ error: "Too many requests. Please try again later." });
  }
  rateLimiter.set(key, current + 1);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, type, reference, source = "analysis" } = req.body;
  console.log(source);
  if (!email || !type) {
    return res.status(400).json({ error: "Missing email or type" });
  }

  const emailLower = email.toLowerCase();
  const twelveHoursAgo = new Date(
    Date.now() - 12 * 60 * 60 * 1000
  ).toISOString();

  try {
    // Log request
    await supabaseAdmin.from("access_log").insert({
      email: emailLower,
      ip,
      device_id: deviceId,
      action: type,
      user_agent: userAgent,
    });

    // IP/Device-level trial limit
    const [{ data: ipAttempts }, { data: deviceAttempts }] = await Promise.all([
      supabaseAdmin
        .from("access_log")
        .select("email")
        .eq("ip", ip)
        .eq("action", "check")
        .gte("created_at", twelveHoursAgo),
      supabaseAdmin
        .from("access_log")
        .select("email")
        .eq("device_id", deviceId)
        .eq("action", "check")
        .gte("created_at", twelveHoursAgo),
    ]);

    const uniqueEmailsFromIP = [
      ...new Set((ipAttempts || []).map((a: any) => a.email)),
    ];
    const uniqueEmailsFromDevice = [
      ...new Set((deviceAttempts || []).map((a: any) => a.email)),
    ];

    if (uniqueEmailsFromIP.length >= 3 || uniqueEmailsFromDevice.length >= 3) {
      return res.status(429).json({
        error:
          "You’ve reached the trial limit. Please try again in the next 12 hours.",
      });
    }

    // Fetch payment and usage counts
    const [paymentCountRes, accessCountRes] = await Promise.all([
      supabaseAdmin
        .from("paystack_payment_log")
        .select("*", { count: "exact", head: true })
        .eq("email", emailLower),

      supabaseAdmin
        .from("access_log_email")
        .select("*", { count: "exact", head: true })
        .eq("email", emailLower),
    ]);

    const paymentCount = paymentCountRes.count ?? 0;
    const accessCount = accessCountRes.count ?? 0;

    const hasWooOrder = await checkWooOrder(emailLower);

    let accessAllowed = false;
    let accessSource: string | undefined = undefined;
    let reason: string | undefined = undefined;

    if (paymentCount > 0) {
      const allowedPaystackAccess = paymentCount * 2;
      if (accessCount < allowedPaystackAccess) {
        accessAllowed = true;
        accessSource = "paystack";
      } else {
        reason = "limit_reached";
      }
    } else if (hasWooOrder) {
      const allowedWooAccess = 2;
      if (accessCount < allowedWooAccess) {
        accessAllowed = true;
        accessSource = "woocommerce";
      } else {
        reason = "limit_reached";
      }
    }

    // 🔍 Handle "check"
    if (type === "check") {
      return res.status(200).json({
        access_granted: accessAllowed,
        source: accessSource,
        reason,
      });
    }

    // ✅ Handle "mark-paid"
    if (type === "mark-paid") {
      if (!reference) {
        return res.status(400).json({ error: "Missing payment reference" });
      }

      try {
        // 🔒 Check if this reference already exists
        const { count: existingPayment } = await supabaseAdmin
          .from("paystack_payment_log")
          .select("*", { count: "exact", head: true })
          .eq("reference", reference);

        if ((existingPayment ?? 0) > 0) {
          return res.status(200).json({
            access_granted: false,
            reason: "duplicate_payment",
          });
        }

        // 🔍 Verify payment with Paystack
        const verifyRes = await axios.get(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
          }
        );

        const isSuccessful =
          verifyRes.data?.status === true &&
          verifyRes.data?.data?.status === "success";

        if (isSuccessful) {
          // 🧾 Log the payment in your DB
          await supabaseAdmin.from("paystack_payment_log").insert({
            email: emailLower,
            reference,
            amount: verifyRes.data.data.amount,
            currency: verifyRes.data.data.currency,
            created_at: new Date().toISOString(),
          });

          return res.status(200).json({
            access_granted: true,
            source: "paystack",
          });
        }

        return res.status(200).json({
          access_granted: false,
          reason: "payment_failed",
        });
      } catch (err: any) {
        console.error(
          "❌ Paystack verification error:",
          err?.response?.data || err
        );
        return res.status(500).json({ error: "Payment verification failed" });
      }
    }

    // ✅ Handle "mark-analysis"
    if (type === "mark-analysis") {
      if (!accessAllowed) {
        return res.status(200).json({
          success: false,
          reason: reason || "not_allowed",
        });
      }

      try {
        await supabaseAdmin.from("access_log_email").insert({
          email: emailLower,
          source: accessSource,
          created_at: new Date().toISOString(),
        });

        return res.status(200).json({ success: true });
      } catch (insertError: any) {
        console.error("🛑 Access insert failed:", insertError.message);
        return res.status(200).json({
          success: false,
          reason: "insert_failed",
          detail: insertError.message,
        });
      }
    }

    return res.status(400).json({ error: "Invalid type" });
  } catch (error: any) {
    console.error("🔥 Supabase access error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
