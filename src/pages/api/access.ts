// /pages/api/access.ts
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
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const deviceId = req.cookies.device_id || uuidv4();
  const key = `access-check:${ip}`;
  const current = rateLimiter.get(key) || 0;

  if (current >= 5) {
    return res
      .status(429)
      .json({ error: "Too many requests. Please try again later." });
  }
  rateLimiter.set(key, current + 1);

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { email, type } = req.body; // type = "check" | "mark-paid"
  if (!email || !type)
    return res.status(400).json({ error: "Missing email or type" });

  const emailLower = email.toLowerCase();

  try {
    // Log all attempts to a log table
    await supabaseAdmin.from("access_log").insert({
      email: emailLower,
      ip,
      device_id: deviceId,
      action: type,
    });

    // Check how many unique emails this IP has tried before
    const { data: ipAttempts, error: ipErr } = await supabaseAdmin
      .from("access_log")
      .select("email")
      .eq("ip", ip)
      .eq("action", "check");

    if (ipErr) throw ipErr;

    const uniqueEmailsByIP = Array.from(
      new Set(ipAttempts.map((entry) => entry.email))
    );

    // Check how many unique emails this device has tried before
    const { data: deviceAttempts, error: devErr } = await supabaseAdmin
      .from("access_log")
      .select("email")
      .eq("device_id", deviceId)
      .eq("action", "check");

    if (devErr) throw devErr;

    const uniqueEmailsByDevice = Array.from(
      new Set(deviceAttempts.map((entry) => entry.email))
    );

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

    // 1. First check if already used free access
    const { data: existing } = await supabaseAdmin
      .from("free_access_once")
      .select("email")
      .eq("email", emailLower)
      .maybeSingle();

    if (existing) {
      return res
        .status(200)
        .json({ access_granted: false, reason: "already_used" });
    }

    if (type === "check") {
      // 2. Check WooCommerce completed orders
      const orderResponse = await axios.get(`${WC_BASE_URL}/orders`, {
        auth: WC_AUTH,
        params: { status: "completed", per_page: 100 },
      });

      const orders = orderResponse.data.filter(
        (order: any) => order.billing?.email?.toLowerCase() === emailLower
      );

      if (orders.length > 0) {
        // Save to Supabase with source: woocommerce
        await supabaseAdmin.from("free_access_once").insert({
          email: emailLower,
          source: "woocommerce",
          payment_verified: false,
        });
        return res
          .status(200)
          .json({ access_granted: true, source: "woocommerce" });
      } else {
        return res
          .status(200)
          .json({ access_granted: false, reason: "requires_payment" });
      }
    }
    if (type === "mark-paid") {
      const { email, reference } = req.body;
      console.log(email)
      const verifyRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      });
    
      if (verifyRes.data.status === true && verifyRes.data.data.status === "success") {
        return res.status(200).json({ access_granted: true });
      }
    
      return res.status(400).json({ access_granted: false });
    }

    return res.status(400).json({ error: "Invalid type" });
  } catch (error: any) {
    console.error("🔥 Supabase access error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
