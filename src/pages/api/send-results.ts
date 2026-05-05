// pages/api/send-results.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { to, resultsHtml, recommendations } = req.body;

  const emailTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Skin Analysis Results</title>
      <style>
        /* Reset styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        /* Email client compatibility */
        body, table, td, p, a, li, blockquote {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        
        table, td {
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        
        img {
          -ms-interpolation-mode: bicubic;
          border: 0;
          height: auto;
          line-height: 100%;
          outline: none;
          text-decoration: none;
        }
        
        /* Base styles */
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #fcfcfc;
          color: #333333;
          line-height: 1.6;
          padding: 20px;
        }
        
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }
        
        .header {
          background-color: #f847b4;
          padding: 40px 20px;
          text-align: center;
          color: #ffffff;
        }
        
        .logo {
          max-width: 120px;
          margin-bottom: 20px;
        }
        
        .header h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        
        .content {
          padding: 40px 30px;
        }
        
        .greeting {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 25px;
          color: #f847b4;
        }
        
        .section {
          margin-bottom: 35px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #fef2f9;
          color: #2c3e50;
        }
        
        .results-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        
        .result-item {
          background-color: #fef6fb;
          padding: 15px;
          border-radius: 8px;
        }
        
        .result-label {
          display: block;
          font-size: 12px;
          text-transform: uppercase;
          color: #f847b4;
          font-weight: 700;
          margin-bottom: 5px;
        }
        
        .result-value {
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .product-container {
          display: block;
        }
        
        .product-item {
          margin-bottom: 20px;
          padding: 20px;
          border: 1px solid #f0f0f0;
          border-radius: 10px;
          text-align: left;
        }
        
        .product-step {
          font-size: 11px;
          font-weight: 700;
          color: #f847b4;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        
        .product-image {
          margin-bottom: 15px;
          border-radius: 8px;
        }
        
        .product-name {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        
        .product-brand {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
        }
        
        .product-price {
          font-weight: 700;
          color: #f847b4;
          margin-bottom: 15px;
        }
        
        .product-shop-btn {
          display: inline-block;
          padding: 10px 20px;
          background-color: #000000;
          color: #ffffff;
          text-decoration: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
        }
        
        .cta-section {
          background-color: #fef6fb;
          padding: 40px 30px;
          text-align: center;
          border-radius: 12px;
          margin-top: 20px;
        }
        
        .cta-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 15px;
          color: #2c3e50;
        }
        
        .cta-button {
          display: inline-block;
          padding: 15px 35px;
          background-color: #f847b4;
          color: #ffffff;
          text-decoration: none;
          border-radius: 30px;
          font-weight: 700;
          margin-top: 20px;
        }
        
        .footer {
          padding: 40px 20px;
          text-align: center;
          background-color: #ffffff;
          color: #999999;
          font-size: 12px;
        }
        
        .footer-logo {
          max-width: 80px;
          margin-bottom: 20px;
          opacity: 0.5;
        }
        
        .social-links a {
          margin: 0 10px;
          color: #f847b4;
          text-decoration: none;
          font-weight: 600;
        }
        
        .powered-by {
          margin-top: 20px;
          font-size: 10px;
          letter-spacing: 1px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <img src="https://res.cloudinary.com/debcfaccq/image/upload/v1753339613/Asset_12BH_n3ygpt.png" alt="Beauty Bay Logo" class="logo" />
          <h1>Perfect Skin By Beauty Bay</h1>
          <p>AI-Powered Skin Analysis</p>
        </div>
        
        <!-- Main Content -->
        <div class="content">
          <div class="greeting">
            Hello Beautiful! 💕
          </div>
          
          <!-- Results Section -->
          <div class="section">
            <div class="results-section">
              <h2 class="section-title">✨ Your Skin Analysis</h2>
              <div class="results-container">
                ${resultsHtml.replace(
                  /<p><strong>(\w+):<\/strong>\s*([^<]+)<\/p>/g,
                  `
                  <div class="result-item">
                    <span class="result-label">$1</span>
                    <span class="result-value">$2</span>
                  </div>
                `
                )}
              </div>
            </div>
          </div>
          
          <!-- Recommendations Section -->
          <div class="section">
            <div class="recommendations-section">
              <h2 class="section-title">🌟 Recommended Products</h2>
              <div class="product-container">
                ${recommendations
                  .map(
                    (prod: {
                      name: string;
                      description?: string;
                      image?: string;
                      price_html?: string;
                      brand?: string;
                      step?: string;
                      link?: string;
                      proof?: string;
                      expertRecommendation?: string;
                    }) => `
                    <div class="product-item">
                      <div class="product-step">${prod.step || "Product"}</div>
                      <img
                        src="${
                          prod.image
                            ? prod.image
                            : "https://placehold.co/80x80/f8f8f8/cccccc?text=Product"
                        }"
                        alt="${prod.name}"
                        class="product-image"
                        width="80"
                        height="80"
                      />
                      <div class="product-name">${prod.name}</div>
                      <div class="product-brand">${
                        prod.brand || "Beauty Bay"
                      }</div>
                      <div class="product-price">${prod.price_html || "₦0"}</div>
                      ${
                        prod.expertRecommendation
                          ? `<div style="font-size: 11px; color: #f847b4; font-style: italic; margin-top: 5px; font-weight: bold;">✨ ${prod.expertRecommendation}</div>`
                          : ""
                      }
                      ${
                        prod.proof
                          ? `<div style="font-size: 10px; color: #27ae60; margin-top: 3px; font-weight: bold;">✅ Evidence: ${prod.proof}</div>`
                          : ""
                      }
                      <a href="${
                        prod.link || "https://beautybayafrica.com"
                      }" class="product-shop-btn">Shop Now</a>
                    </div>
                  `
                  )
                  .join("")}
              </div>
            </div>
          </div>
          
          <!-- Call to Action -->
          <div class="cta-section">
            <h3 class="cta-title">Ready to Transform Your Skin? 🚀</h3>
            <p class="cta-text">Visit our website to explore more products</p>
            <a href="https://beautybayafrica.com" class="cta-button">Shop Now</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-content">
            <img src="https://res.cloudinary.com/debcfaccq/image/upload/v1753339613/Asset_12BH_n3ygpt.png" alt="Beauty Bay Logo" class="footer-logo" />
            <p>Your ultimate destination for authentic skincare, fragrances, makeup, and more, all under one virtual roof.</p>
            <p class="powered-by">Powered by CRE8LAB</p>
          </div>
          
          <div class="social-links">
            <a href="https://www.instagram.com/beautyhubco.ng/">Instagram</a>
            <a href="https://wa.me/2348162598682">WhatsApp</a>
            <a href="mailto:hello@beautybayafrica.com">Email</a>
          </div>
          
          <div class="footer-text">
            <p>© 2025 Beauty Bay. All rights reserved.</p>
            <p>This email was sent to you because you requested a skin analysis report.</p>
            <p>www.beautybayafrica.com</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const API_KEY = process.env.MAILCHIMP_API_KEY; // Mailchimp Transactional API key
    if (!API_KEY) throw new Error("Mailchimp API key is missing");

    await axios.post("https://mandrillapp.com/api/1.0/messages/send.json", {
      key: API_KEY,
      message: {
        html: emailTemplate,
        subject: "✨ Your Personalized Skin Analysis Results - Beauty Bay",
        from_email: "hello@beautybayafrica.com",
        from_name: "Beauty Bay",
        to: [{ email: to, type: "to" }],
      },
    });

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Email sending failed:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}