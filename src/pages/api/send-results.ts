// pages/api/send-results.ts
import type { NextApiRequest, NextApiResponse } from "next";
import sendgrid from "@sendgrid/mail";

sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { to, resultsHtml, recommendations } = req.body;

  try {
    await sendgrid.send({
      to,
      from: "hello@beautyhub.ng",
      subject: "Your Skin Analysis Results and Product Recommendations",
      html: `
        <h2>Your Skin Analysis Results</h2>
        ${resultsHtml}
        <h2>Recommended Products</h2>
        <ul>
          ${recommendations
            .map((prod: { name: string; description?: string }) => `<li><strong>${prod.name}</strong>: ${prod.description || ""}</li>`)
            .join("")}
        </ul>
      `,
    });

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Email sending failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
