import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import axios from "axios";
import { LRUCache } from "lru-cache";
import { v4 as uuidv4 } from "uuid";

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
      (order: any) => order.billing?.email?.toLowerCase() === email.toLowerCase()
    );
  } catch (err) {
    console.error("WooCommerce check failed:", err);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const deviceId = req.cookies.device_id || uuidv4();
  const key = `access-check:${ip}`;
  const current = rateLimiter.get(key) || 0;

  if (current >= 5) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }
  rateLimiter.set(key, current + 1);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, type, reference, source = "analysis" } = req.body;

  if (!email || !type) {
    return res.status(400).json({ error: "Missing email or type" });
  }

  const emailLower = email.toLowerCase();
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  try {
    // Log the request
    await supabaseAdmin.from("access_log").insert({
      email: emailLower,
      ip,
      device_id: deviceId,
      action: type,
    });

    // Check how many unique emails have been used per IP/device
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
// @ts-expect-error: Supabase typing is too strict here
const uniqueEmailsFromIP = [...new Set(ipAttempts.map((a) => a.email))];
// @ts-expect-error: Supabase typing is too strict here

    const uniqueEmailsFromDevice = [...new Set(deviceAttempts.map((a) => a.email))];

    if (
      uniqueEmailsFromIP.length >= 3 || 
      uniqueEmailsFromDevice.length >= 3
    ) {
      return res.status(429).json({
        error: "You’ve reached the trial limit. Please try again in the next 12 hours.",
      });
    }

    const { data: existing } = await supabaseAdmin
      .from("free_access_once")
      .select("email")
      .eq("email", emailLower)
      .maybeSingle();

    if (existing && type !== "mark-analysis") {
      return res.status(200).json({
        access_granted: false,
        reason: "already_used",
      });
    }

    // 🔍 Check access type
    if (type === "check") {
      const hasWoo = await checkWooOrder(emailLower);
      return res.status(200).json({
        access_granted: hasWoo,
        source: hasWoo ? "woocommerce" : undefined,
        reason: hasWoo ? undefined : "requires_payment",
      });
    }

    if (type === "mark-paid") {
      if (!reference) {
        return res.status(400).json({ error: "Missing payment reference" });
      }

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
        await supabaseAdmin
          .from("paystack_verified")
          .upsert({ email: emailLower, reference });

        return res.status(200).json({
          access_granted: true,
          source: "paystack",
        });
      }

      return res.status(200).json({
        access_granted: false,
        reason: "payment_failed",
      });
    }

    if (type === "mark-analysis") {
      if (existing) {
        return res.status(200).json({
          success: false,
          reason: "already_exists",
        });
      }

      const hasWoo = await checkWooOrder(emailLower);

      const { data: paystackVerified } = await supabaseAdmin
        .from("paystack_verified")
        .select("email")
        .eq("email", emailLower)
        .maybeSingle();

      const hasPaystack = !!paystackVerified;

      if (!hasWoo && !hasPaystack) {
        return res.status(403).json({
          success: false,
          reason: "no_payment",
        });
      }

      const { error: insertError } = await supabaseAdmin
        .from("free_access_once")
        .insert({
          email: emailLower,
          source,
          payment_verified: hasPaystack,
        });

      if (insertError) throw insertError;

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Invalid type" });
  } catch (error: any) {
    console.error("🔥 Supabase access error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
