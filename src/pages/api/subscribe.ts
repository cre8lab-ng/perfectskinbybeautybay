import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  // Mailchimp Configuration from environment variables
  const API_KEY = process.env.MAILCHIMP_API_KEY;
  const LIST_ID = process.env.MAILCHIMP_LIST_ID;
  const DATACENTER = API_KEY?.split("-")[1]; // e.g., us1, us20

  if (!API_KEY || !LIST_ID || !DATACENTER) {
    console.error("Mailchimp environment variables are missing.");
    return res.status(500).json({ error: "Newsletter service is not configured correctly." });
  }

  try {
    const url = `https://${DATACENTER}.api.mailchimp.com/3.0/lists/${LIST_ID}/members`;

    const data = {
      email_address: email,
      status: "subscribed", // or "pending" for double opt-in
    };

    const options = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `api_key ${API_KEY}`,
      },
    };

    await axios.post(url, data, options);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    // Handle cases where the user is already subscribed
    if (error.response?.data?.title === "Member Exists") {
      return res.status(200).json({ 
        success: true, 
        message: "You're already subscribed! ✨" 
      });
    }

    console.error("Mailchimp subscription error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Failed to subscribe. Please try again later." });
  }
}
