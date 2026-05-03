// pages/api/send-results.ts
import type { NextApiRequest, NextApiResponse } from "next";
import sendgrid from "@sendgrid/mail";

sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          background-color: #ffd9f0;
          margin: 0;
          padding: 0;
          line-height: 1.6;
          color: #1a1a1a;
          width: 100% !important;
          min-width: 100%;
        }
        
        .email-wrapper {
          width: 100%;
          background-color: #ffd9f0;
          padding: 20px 0;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(248, 71, 180, 0.15);
        }
        
        /* Header */
        .header {
          background-color: #ffffff;
          padding: 40px 20px;
          text-align: center;
          border-bottom: 1px solid #ffd9f0;
        }
        
        .logo {
          width: 60px;
          height: auto;
          margin-bottom: 16px;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        
        .header h1 {
          color: #f847b4;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          line-height: 1.2;
        }
        
        .header p {
          color: #666;
          font-size: 14px;
          font-weight: 400;
          margin: 0;
        }
        
        /* Content container */
        .content {
          padding: 30px 20px;
        }
        
        .greeting {
          font-size: 18px;
          color: #f847b4;
          margin-bottom: 30px;
          font-weight: 600;
          text-align: center;
        }
        
        /* Section styles */
        .section {
          margin-bottom: 40px;
        }
        
        .section-title {
          color: #1a1a1a;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 20px;
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 2px solid #ffd9f0;
        }
        
        /* Results section - using table for better mobile support */
        .results-section {
          background-color: #ffd9f0;
          border-radius: 12px;
          padding: 24px 16px;
          margin-bottom: 30px;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .result-item {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 12px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(248, 71, 180, 0.1);
          display: block;
          width: 100%;
        }
        
        .result-label {
          color: #666;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          display: block;
        }
        
        .result-value {
          color: #f847b4;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.2;
          display: block;
        }
        
        /* Recommendations section */
        .recommendations-section {
          background-color: #ffffff;
          border: 1px solid #ffd9f0;
          border-radius: 12px;
          padding: 24px 16px;
        }
        
        .product-item {
          background-color: #fafafa;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          text-align: center;
          border: 1px solid #f0f0f0;
        }
        
        .product-step {
          background: linear-gradient(135deg, #f847b4, #ff85d1);
          color: white;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 6px 12px;
          border-radius: 15px;
          margin-bottom: 15px;
          display: inline-block;
        }
        
        .product-image {
          width: 80px;
          height: 80px;
          object-fit: contain;
          margin: 0 auto 15px auto;
          display: block;
          border-radius: 8px;
          background-color: white;
          padding: 8px;
        }
        
        .product-name {
          color: #1a1a1a;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
          line-height: 1.3;
        }
        
        .product-brand {
          color: #666;
          font-size: 12px;
          margin-bottom: 12px;
          font-weight: 400;
        }
        
        .product-price {
          color: #f847b4;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 15px;
        }
        
        .product-shop-btn {
          background: linear-gradient(135deg, #f847b4 0%, #ff6bc7 100%);
          color: white !important;
          border: none;
          padding: 10px 24px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
          min-width: 120px;
        }
        
        /* CTA Section */
        .cta-section {
          text-align: center;
          padding: 30px 20px;
          background-color: #ffd9f0;
          border-radius: 12px;
          margin-top: 30px;
        }
        
        .cta-title {
          color: #1a1a1a;
          margin-bottom: 10px;
          font-size: 18px;
          font-weight: 700;
        }
        
        .cta-text {
          color: #666;
          margin-bottom: 20px;
          font-size: 14px;
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #f847b4 0%, #ff6bc7 100%);
          color: white !important;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
        }
        
        /* Footer */
        .footer {
          background-color: #1a1a1a;
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        
        .footer-logo {
          width: 80px;
          height: auto;
          margin-bottom: 16px;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        
        .footer-content p {
          color: #ccc;
          font-size: 12px;
          margin-bottom: 6px;
          line-height: 1.4;
        }
        
        .powered-by {
          font-size: 11px;
          font-weight: 600;
          color: #f847b4;
          margin-top: 8px;
        }
        
        .social-links {
          margin: 20px 0;
        }
        
        .social-links a {
          color: #f847b4 !important;
          text-decoration: none;
          margin: 0 12px;
          font-weight: 500;
          font-size: 12px;
        }
        
        .footer-text {
          color: #999;
          font-size: 11px;
          margin-top: 15px;
          line-height: 1.4;
        }
        
        .footer-text p {
          margin-bottom: 3px;
        }
        
        /* Mobile-specific styles */
        @media only screen and (max-width: 600px) {
          .email-wrapper {
            padding: 10px 0;
          }
          
          .email-container {
            margin: 0 10px;
            border-radius: 12px;
          }
          
          .header {
            padding: 30px 15px;
          }
          
          .content {
            padding: 20px 15px;
          }
          
          .header h1 {
            font-size: 20px;
          }
          
          .section-title {
            font-size: 18px;
          }
          
          .greeting {
            font-size: 16px;
          }
          
          .results-section,
          .recommendations-section {
            padding: 20px 12px;
          }
          
          .result-item {
            padding: 16px;
            margin-bottom: 10px;
          }
          
          .result-value {
            font-size: 16px;
          }
          
          .product-item {
            padding: 16px;
            margin-bottom: 16px;
          }
          
          .product-image {
            width: 70px;
            height: 70px;
          }
          
          .cta-section {
            padding: 25px 15px;
          }
          
          .cta-title {
            font-size: 16px;
          }
          
          .footer {
            padding: 25px 15px;
          }
          
          .footer-logo {
            width: 70px;
          }
        }
        
        /* Outlook-specific fixes */
        @media screen and (-webkit-min-device-pixel-ratio:0) {
          .product-shop-btn, .cta-button {
            background: #f847b4 !important;
          }
        }
      </style>
      <!--[if mso]>
      <style type="text/css">
        .email-container {
          width: 600px !important;
        }
        .header, .content, .footer {
          width: 100% !important;
        }
      </style>
      <![endif]-->
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <img src="https://res.cloudinary.com/debcfaccq/image/upload/v1753339613/Asset_12BH_n3ygpt.png" alt="Beauty Hub Logo" class="logo" />
            <h1>Perfect Skin By Beauty Hub</h1>
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
                          prod.brand || "Beauty Hub"
                        }</div>
                        <div class="product-price">${prod.price_html || "₦0"}</div>
                        <a href="${
                          prod.link || "https://beautyhub.ng"
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
              <a href="https://beautyhub.ng" class="cta-button">Shop Now</a>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-content">
              <img src="https://res.cloudinary.com/debcfaccq/image/upload/v1753339613/Asset_12BH_n3ygpt.png" alt="Beauty Hub Logo" class="footer-logo" />
              <p>Your ultimate destination for authentic skincare, fragrances, makeup, and more, all under one virtual roof.</p>
              <p class="powered-by">Powered by CRE8LAB</p>
            </div>
            
            <div class="social-links">
              <a href="https://www.instagram.com/beautyhubco.ng/">Instagram</a>
              <a href="https://wa.me/2348162598682">WhatsApp</a>
              <a href="mailto:hello@beautyhub.ng">Email</a>
            </div>
            
            <div class="footer-text">
              <p>© 2025 Beauty Hub. All rights reserved.</p>
              <p>This email was sent to you because you requested a skin analysis report.</p>
              <p>www.beautyhub.ng</p>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendgrid.send({
      to,
      from: "hello@beautyhub.ng",
      subject: "✨ Your Personalized Skin Analysis Results - Beauty Hub",
      html: emailTemplate,
    });

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Email sending failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}