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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #ffd9f0 0%, #ffffff 50%, #ffd9f0 100%);
          min-height: 100vh;
          padding: 20px;
          line-height: 1.6;
          color: #1a1a1a;
        }
        
        .email-container {
          max-width: 680px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 
            0 20px 60px rgba(248, 71, 180, 0.15),
            0 8px 30px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(248, 71, 180, 0.1);
        }
        
        .header {
          background: linear-gradient(135deg, #f847b4 0%, #ff6bc7 100%);
          padding: 50px 40px;
          text-align: center;
          position: relative;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.2) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 100%
          );
        }
        
        .logo {
          width: 80px;
          height: auto;
          margin-bottom: 20px;
          filter: brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1));
          position: relative;
          z-index: 2;
        }
        
        .header h1 {
          color: white;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          letter-spacing: -0.5px;
          position: relative;
          z-index: 2;
        }
        
        .header p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          font-weight: 400;
          position: relative;
          z-index: 2;
        }
        
        .content {
          padding: 48px 40px;
        }
        
        .greeting {
          font-size: 20px;
          color: #f847b4;
          margin-bottom: 40px;
          font-weight: 600;
          text-align: center;
        }
        
        .section {
          margin-bottom: 48px;
        }
        
        .section-title {
          color: #1a1a1a;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 24px;
          text-align: center;
          position: relative;
        }
        
        .section-title::after {
          content: '';
          display: block;
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #f847b4, #ffd9f0);
          margin: 12px auto 0;
          border-radius: 2px;
        }
        
        .results-section {
          background: linear-gradient(135deg, #ffd9f0 0%, #ffffff 100%);
          border-radius: 20px;
          padding: 40px 32px;
          border: 1px solid rgba(248, 71, 180, 0.1);
        }
        
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 24px;
        }
        
        .result-item {
          background: white;
          padding: 32px 24px;
          border-radius: 16px;
          text-align: center;
          border: 1px solid rgba(248, 71, 180, 0.08);
          box-shadow: 0 4px 16px rgba(248, 71, 180, 0.08);
          transition: all 0.3s ease;
        }
        
        .result-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(248, 71, 180, 0.15);
        }
        
        .result-label {
          color: #666;
          font-size: 14px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 8px;
        }
        
        .result-value {
          color: #f847b4;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
        }
        
        .recommendations-section {
          background: linear-gradient(135deg, #ffffff 0%, #ffd9f0 100%);
          border-radius: 20px;
          padding: 40px 32px;
          border: 1px solid rgba(248, 71, 180, 0.1);
        }
        
        .product-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }
        
        .product-item {
          background: white;
          padding: 32px 24px;
          border-radius: 16px;
          text-align: center;
          border: 1px solid rgba(248, 71, 180, 0.08);
          box-shadow: 0 4px 16px rgba(248, 71, 180, 0.08);
          transition: all 0.3s ease;
        }
        
        .product-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(248, 71, 180, 0.2);
        }
        
        .product-step {
          background: linear-gradient(135deg, #f847b4, #ff85d1);
          color: white;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 8px 16px;
          border-radius: 20px;
          margin-bottom: 20px;
          display: inline-block;
        }
        
        .product-image {
          width: 120px;
          height: 120px;
          object-fit: contain;
          margin: 0 auto 20px auto;
          display: block;
          border-radius: 12px;
          background: #fafafa;
          padding: 12px;
          border: 1px solid rgba(248, 71, 180, 0.08);
        }
        
        .product-name {
          color: #1a1a1a;
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 6px;
          line-height: 1.3;
        }
        
        .product-brand {
          color: #666;
          font-size: 14px;
          margin-bottom: 16px;
          font-weight: 400;
        }
        
        .product-price {
          color: #f847b4;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        
        .product-shop-btn {
          background: linear-gradient(135deg, #f847b4 0%, #ff6bc7 100%);
          color: white;
          border: none;
          padding: 12px 32px;
          border-radius: 25px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(248, 71, 180, 0.3);
          width: 100%;
          max-width: 180px;
        }
        
        .product-shop-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(248, 71, 180, 0.4);
        }
        
        .cta-section {
          text-align: center;
          padding: 40px 32px;
          background: linear-gradient(135deg, #ffd9f0 0%, #ffffff 100%);
          border-radius: 20px;
          border: 1px solid rgba(248, 71, 180, 0.1);
        }
        
        .cta-title {
          color: #1a1a1a;
          margin-bottom: 12px;
          font-size: 22px;
          font-weight: 700;
        }
        
        .cta-text {
          color: #666;
          margin-bottom: 24px;
          font-size: 15px;
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #f847b4 0%, #ff6bc7 100%);
          color: white;
          text-decoration: none;
          padding: 16px 40px;
          border-radius: 25px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 6px 20px rgba(248, 71, 180, 0.3);
          transition: all 0.3s ease;
        }
        
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(248, 71, 180, 0.4);
        }
        
        .footer {
          background: #1a1a1a;
          color: white;
          padding: 40px;
          text-align: center;
        }
        
        .footer-content h3 {
          color: #f847b4;
          margin-bottom: 8px;
          font-size: 20px;
          font-weight: 700;
        }
        
        .footer-content p {
          color: #ccc;
          font-size: 14px;
          margin-bottom: 8px;
        }
        
        .powered-by {
          font-size: 12px;
          font-weight: 600;
          color: #f847b4;
          margin-top: 8px;
        }
        
        .social-links {
          margin: 24px 0;
        }
        
        .social-links a {
          color: #f847b4;
          text-decoration: none;
          margin: 0 16px;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        
        .social-links a:hover {
          color: #ffd9f0;
        }
        
        .footer-text {
          color: #999;
          font-size: 12px;
          margin-top: 20px;
          line-height: 1.5;
        }
        
        .footer-text p {
          margin-bottom: 4px;
        }
        
        @media (max-width: 600px) {
          .email-container {
            margin: 10px;
            border-radius: 16px;
          }
          
          .header, .content, .footer {
            padding: 32px 24px;
          }
          
          .results-section, .recommendations-section, .cta-section {
            padding: 32px 24px;
          }
          
          .results-grid {
            grid-template-columns: 1fr;
          }
          
          .product-list {
            grid-template-columns: 1fr;
          }
          
          .header h1 {
            font-size: 24px;
          }
          
          .section-title {
            font-size: 20px;
          }
          
          .result-value {
            font-size: 20px;
          }
          
          .product-price {
            font-size: 18px;
          }
          
          .cta-title {
            font-size: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header with Logo -->
        <div class="header">
          <img src="https://res.cloudinary.com/debcfaccq/image/upload/v1753339613/Asset_12BH_n3ygpt.png" alt="Beauty Hub Logo" class="logo" />
          <h1>AI-Powered Skin Analysis</h1>
          <p>Personalized beauty insights just for you</p>
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
          </div>
          
          <!-- Recommendations Section -->
          <div class="section">
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
                      <img
                        src="${
                          prod.image
                            ? prod.image
                            : "https://placehold.co/120x120/f8f8f8/cccccc?text=Product"
                        }"
                        alt="${prod.name}"
                        class="product-image"
                      />
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
          </div>
          
          <!-- Call to Action -->
          <div class="section">
            <div class="cta-section">
              <h3 class="cta-title">Ready to Transform Your Skin? 🚀</h3>
              <p class="cta-text">Visit our website to explore more products</p>
              <a href="https://beautyhub.ng" class="cta-button">Shop Now</a>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-content">
            <h3>Beauty Hub</h3>
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