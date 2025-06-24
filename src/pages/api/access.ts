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

// Rate limiting: 5 requests per IP per minute
const rateLimiter = new LRUCache<string, number>({
  max: 500,
  ttl: 60 * 1000, // 1 minute
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const deviceId = req.cookies.device_id || uuidv4();
  const key = `access-check:${ip}`;
  const current = rateLimiter.get(key) || 0;

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

  if (!email || !type) {
    return res.status(400).json({ error: "Missing email or type" });
  }

  const emailLower = email.toLowerCase();

  try {
    // Log access attempt
    await supabaseAdmin.from("access_log").insert({
      email: emailLower,
      ip,
      device_id: deviceId,
      action: type,
    });

    // Unique email attempts by IP
    const { data: ipAttempts, error: ipErr } = await supabaseAdmin
      .from("access_log")
      .select("email")
      .eq("ip", ip)
      .eq("action", "check");

    if (ipErr) throw ipErr;

    const uniqueEmailsByIP = [
      ...new Set(ipAttempts.map((entry) => entry.email)),
    ];

    // Unique email attempts by device
    const { data: deviceAttempts, error: devErr } = await supabaseAdmin
      .from("access_log")
      .select("email")
      .eq("device_id", deviceId)
      .eq("action", "check");

    if (devErr) throw devErr;

    const uniqueEmailsByDevice = [
      ...new Set(deviceAttempts.map((entry) => entry.email)),
    ];

    if (
      (!uniqueEmailsByIP.includes(emailLower) &&
        uniqueEmailsByIP.length >= 2) ||
      (!uniqueEmailsByDevice.includes(emailLower) &&
        uniqueEmailsByDevice.length >= 2)
    ) {
      return res.status(429).json({
        error:
          "You can only try access for 2 email addresses per device and IP.",
      });
    }

    // Check if already granted
    const { data: existing } = await supabaseAdmin
      .from("free_access_once")
      .select("email")
      .eq("email", emailLower)
      .maybeSingle();

    if (existing && type !== "mark-analysis") {
      return res
        .status(200)
        .json({ access_granted: false, reason: "already_used" });
    }

    // ✅ WooCommerce verification
    if (type === "check") {
      const orderResponse = await axios.get(`${WC_BASE_URL}/orders`, {
        auth: WC_AUTH,
        params: {
          status: "completed",
          per_page: 100,
        },
      });

      const orders = orderResponse.data.filter(
        (order: any) => order.billing?.email?.toLowerCase() === emailLower
      );

      if (orders.length > 0) {
        return res
          .status(200)
          .json({ access_granted: true, source: "woocommerce" });
      } else {
        return res
          .status(200)
          .json({ access_granted: false, reason: "requires_payment" });
      }
    }

    // ✅ Paystack verification
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
        return res
          .status(200)
          .json({ access_granted: true, source: "paystack" });
      }

      return res
        .status(200)
        .json({ access_granted: false, reason: "payment_failed" });
    }

    // ✅ Mark analysis success + insert access record
    if (type === "mark-analysis") {
      if (existing) {
        return res
          .status(200)
          .json({ success: false, reason: "already_exists" });
      }

      const { error: insertError } = await supabaseAdmin
        .from("free_access_once")
        .insert({
          email: emailLower,
          source,
          payment_verified: false,
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
