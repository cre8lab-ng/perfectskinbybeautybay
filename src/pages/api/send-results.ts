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
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f3e8ff 100%);
          padding: 20px;
          line-height: 1.6;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: linear-gradient(135deg, #ffffff 0%, #fdf2f8 100%);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(248, 71, 180, 0.2), 0 8px 32px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(248, 71, 180, 0.1);
        }
        
        .header {
          background: linear-gradient(135deg, #f847b4 0%, #ff69c4 100%);
          padding: 40px 30px;
          text-align: center;
          position: relative;
        }
        
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 20px;
          filter: brightness(0) invert(1);
        }
        
        .header h1 {
          color: white;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          letter-spacing: -0.5px;
        }
        
        .header p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          font-weight: 400;
        }
        
        .content {
          padding: 40px 30px;
        }
        
        .greeting {
          font-size: 18px;
          color: #374151;
          margin-bottom: 30px;
          font-weight: 500;
        }
        
        .results-section {
          background: linear-gradient(135deg, #fdf2f8 0%, #f3e8ff 100%);
          border-radius: 16px;
          padding: 30px;
          margin-bottom: 30px;
          border: 1px solid rgba(248, 71, 180, 0.1);
        }
        
        .section-title {
          color: #f847b4;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 20px;
          text-align: center;
          position: relative;
        }
        
        .section-title::after {
          content: '';
          display: block;
          width: 60px;
          height: 3px;
          background: linear-gradient(135deg, #f847b4, #ff69c4);
          margin: 10px auto;
          border-radius: 2px;
        }
        
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 25px;
        }
        
        .result-item {
          background: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(248, 71, 180, 0.1);
          border: 1px solid rgba(248, 71, 180, 0.05);
          transition: transform 0.2s ease;
        }
        
        .result-item:hover {
          transform: translateY(-2px);
        }
        
        .result-label {
          color: #6b7280;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        
        .result-value {
          color: #f847b4;
          font-size: 24px;
          font-weight: 700;
        }
        
        .recommendations-section {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border-radius: 16px;
          padding: 30px;
          margin-bottom: 30px;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
        
        .recommendations-section .section-title {
          color: #059669;
        }
        
        .recommendations-section .section-title::after {
          background: linear-gradient(135deg, #059669, #10b981);
        }
        
        .product-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        
        .product-item {
          background: linear-gradient(135deg, #f8d7da 0%, #f5c2c7 100%);
          padding: 25px 20px;
          border-radius: 16px;
          text-align: center;
          border: 1px solid rgba(248, 71, 180, 0.2);
          transition: transform 0.2s ease;
          position: relative;
        }
        
        .product-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(248, 71, 180, 0.2);
        }
        
        .product-step {
          background: rgba(108, 117, 125, 0.8);
          color: white;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 8px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: inline-block;
        }
        
        .product-image {
          width: 140px;
          height: 140px;
          object-fit: contain;
          margin: 0 auto 20px auto;
          display: block;
          border-radius: 8px;
          background: white;
          padding: 10px;
        }
        
        .product-name {
          color: #374151;
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 8px;
          line-height: 1.3;
        }
        
        .product-brand {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 15px;
          font-style: italic;
        }
        
        .product-price {
          color: #f847b4;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        
        .product-shop-btn {
          background: linear-gradient(135deg, #f847b4 0%, #ff69c4 100%);
          color: white;
          border: none;
          padding: 14px 40px;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(248, 71, 180, 0.3);
          width: 100%;
          max-width: 200px;
        }
        
        .product-shop-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(248, 71, 180, 0.4);
        }
        
        .cta-section {
          text-align: center;
          padding: 30px;
          background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
          border-radius: 16px;
          margin-bottom: 30px;
          border: 1px solid rgba(251, 146, 60, 0.2);
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #f847b4 0%, #ff1493 100%);
          color: white;
          text-decoration: none;
          padding: 15px 30px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 8px 25px rgba(248, 71, 180, 0.3);
          transition: all 0.3s ease;
        }
        
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(248, 71, 180, 0.4);
        }
        
        .footer {
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .footer-content {
          margin-bottom: 20px;
        }
        
        .social-links {
          margin: 20px 0;
        }
        
        .social-links a {
          color: #f847b4;
          text-decoration: none;
          margin: 0 15px;
          font-weight: 500;
        }
        
        .footer-text {
          color: #9ca3af;
          font-size: 14px;
          margin-top: 20px;
        }
        
        @media (max-width: 600px) {
          .email-container {
            margin: 10px;
            border-radius: 16px;
          }
          
          .header, .content, .footer {
            padding: 20px;
          }
          
          .results-grid {
            grid-template-columns: 1fr;
          }
          
          .header h1 {
            font-size: 24px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header with Logo -->
        <div class="header">
          <img src="https://res.cloudinary.com/debcfaccq/image/upload/v1753339613/Asset_12BH_n3ygpt.png" alt="Beauty Hub Logo" class="logo" />
          <h1>Your Skin Analysis Results</h1>
          <p>Personalized beauty insights just for you</p>
        </div>
        
        <!-- Main Content -->
        <div class="content">
          <div class="greeting">
            Hello Beautiful! 💕
          </div>
          
          <!-- Results Section -->
          <div class="results-section">
            <h2 class="section-title">✨ Your Skin Analysis</h2>
            <div class="results-grid">
              ${resultsHtml.replace(
                /<p><strong>(\w+):<\/strong>\s*([^<]+)<\/p>/g,
                `
                <div class="result-item">
                  <div class="result-label">$1</div>
                  <div class="result-value">$2</div>
                </div>
              `
              )}
            </div>
          </div>
          
          <!-- Recommendations Section -->
          <div class="recommendations-section">
            <h2 class="section-title">🌟 Recommended Products</h2>
            <ul class="product-list">
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
                  <li class="product-item">
                    <div class="product-step">${prod.step || "Product"}</div>
                    <img src="${
                      prod.image
                        ? `https://beautyhub.ng${prod.image}`
                        : "https://via.placeholder.com/140x140/f3f4f6/6b7280?text=Product"
                    }" alt="${prod.name}" class="product-image" />
                    <div class="product-name">${prod.name}</div>
                    <div class="product-brand">${
                      prod.brand || "Beauty Hub"
                    }</div>
                    <div class="product-price">${prod.price_html || "₦0"}</div>
                    <a href="${
                      prod.link || "https://beautyhub.ng"
                    }" class="product-shop-btn">Shop Now</a>
                  </li>
                `
                )
                .join("")}
            </ul>
          </div>
          
          <!-- Call to Action -->
          <div class="cta-section">
            <h3 style="color: #f59e0b; margin-bottom: 15px; font-size: 20px;">Ready to Transform Your Skin? 🚀</h3>
            <p style="color: #78716c; margin-bottom: 20px;">Visit our website to explore more products</p>
            <a href="https://beautyhub.ng" class="cta-button">Shop Now</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-content">
            <h3 style="color: #f847b4; margin-bottom: 10px;">Beauty Hub</h3>
            <p>Your trusted partner in skincare excellence</p>
          </div>
          
          <div class="social-links">
            <a href="https://www.instagram.com/beautyhubco.ng/">Instagram</a>
            <a href="https://wa.me/2348162598682">WhatsApp</a>
            <a href="mailto:hello@beautyhub.ng">Email</a>
          </div>
          
          <div class="footer-text">
            <p>© 2025 Beauty Hub. All rights reserved.</p>
            <p>This email was sent to you because you requested a skin analysis report.</p>
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
