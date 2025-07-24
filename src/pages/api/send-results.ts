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
          font-family: 'Inconsolata', 'Monaco', 'Consolas', monospace;
          background: linear-gradient(135deg, #fdfcfa 0%, #fbe4ef 50%, #fce1f0 100%);
          padding: 20px;
          line-height: 1.6;
          position: relative;
        }
        
        /* Add shimmer background effect */
        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(248, 71, 180, 0.05) 1px, transparent 1px),
            radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.15) 1px, transparent 1px);
          background-size: 50px 50px, 30px 30px, 70px 70px;
          pointer-events: none;
          z-index: -1;
        }
        
        .email-container {
          max-width: 700px;
          margin: 0 auto;
          background: linear-gradient(135deg, #ffffff 0%, #fdfcfa 50%, #fbe4ef 100%);
          border-radius: 35px;
          overflow: hidden;
          box-shadow: 
            0 25px 80px rgba(248, 71, 180, 0.25), 
            0 15px 40px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          border: 2px solid rgba(248, 71, 180, 0.15);
          position: relative;
        }
        
        /* Holographic shimmer overlay */
        .email-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(248, 71, 180, 0.05) 25%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 107, 199, 0.08) 75%,
            rgba(255, 255, 255, 0.1) 100%
          );
          pointer-events: none;
          z-index: 1;
        }
        
        .header {
          background: linear-gradient(135deg, #f847b4 0%, #ff6bc7 25%, #ff85d1 50%, #ff4da6 75%, #e239a3 100%);
          padding: 50px 40px;
          text-align: center;
          position: relative;
          z-index: 2;
        }
        
        /* Premium holographic highlight on header */
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 60%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          border-radius: 35px 35px 0 0;
        }
        
        .logo {
          width: 140px;
          height: auto;
          margin-bottom: 25px;
          filter: brightness(0) invert(1) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
          position: relative;
          z-index: 3;
        }
        
        .header h1 {
          color: white;
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 12px;
          text-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          letter-spacing: -0.8px;
          position: relative;
          z-index: 3;
        }
        
        .header p {
          color: rgba(255, 255, 255, 0.95);
          font-size: 18px;
          font-weight: 500;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          position: relative;
          z-index: 3;
        }
        
        .content {
          padding: 50px 40px;
          position: relative;
          z-index: 2;
        }
        
        .greeting {
          font-size: 22px;
          background: linear-gradient(135deg, #f847b4, #ff6bc7, #ff85d1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 40px;
          font-weight: bold;
          text-align: center;
        }
        
        .results-section {
          background: linear-gradient(135deg, #ffffff 0%, #fdfcfa 50%, #fbe4ef 100%);
          border-radius: 25px;
          padding: 40px 35px;
          margin-bottom: 40px;
          border: 2px solid rgba(248, 71, 180, 0.15);
          box-shadow: 
            0 15px 40px rgba(248, 71, 180, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          position: relative;
        }
        
        /* Premium shimmer effect for results section */
        .results-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(248, 71, 180, 0.05) 50%,
            rgba(255, 255, 255, 0.1) 100%
          );
          border-radius: 25px;
          pointer-events: none;
        }
        
        .section-title {
          background: linear-gradient(135deg, #f847b4 0%, #ff6bc7 25%, #ff85d1 50%, #ff4da6 75%, #e239a3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 25px;
          text-align: center;
          position: relative;
          z-index: 2;
        }
        
        .section-title::after {
          content: '';
          display: block;
          width: 80px;
          height: 4px;
          background: linear-gradient(135deg, #f847b4, #ff6bc7, #ff85d1);
          margin: 15px auto;
          border-radius: 2px;
          box-shadow: 0 2px 8px rgba(248, 71, 180, 0.3);
        }
        
        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 25px;
          margin-top: 30px;
          position: relative;
          z-index: 2;
        }
        
        .result-item {
          background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.95) 100%);
          padding: 30px 25px;
          border-radius: 20px;
          text-align: center;
          box-shadow: 
            0 8px 25px rgba(248, 71, 180, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          border: 2px solid rgba(248, 71, 180, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        /* Holographic shine effect */
        .result-item::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          transform: rotate(45deg);
          transition: all 0.6s ease;
          opacity: 0;
        }
        
        .result-item:hover::before {
          opacity: 1;
          transform: rotate(45deg) translate(50%, 50%);
        }
        
        .result-item:hover {
          transform: translateY(-5px);
          box-shadow: 
            0 15px 40px rgba(248, 71, 180, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }
        
        .result-label {
          color: #2c3e50;
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin-bottom: 12px;
          position: relative;
          z-index: 2;
        }
        
        .result-value {
          background: linear-gradient(135deg, #f847b4, #ff6bc7, #ff85d1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 32px;
          font-weight: bold;
          position: relative;
          z-index: 2;
        }
        
        .recommendations-section {
          background: linear-gradient(135deg, #ffffff 0%, #fdfcfa 50%, #f0fdf4 100%);
          border-radius: 25px;
          padding: 40px 35px;
          margin-bottom: 40px;
          border: 2px solid rgba(34, 197, 94, 0.2);
          box-shadow: 
            0 15px 40px rgba(34, 197, 94, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          position: relative;
        }
        
        .recommendations-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(34, 197, 94, 0.05) 50%,
            rgba(255, 255, 255, 0.1) 100%
          );
          border-radius: 25px;
          pointer-events: none;
        }
        
        .recommendations-section .section-title {
          background: linear-gradient(135deg, #059669, #10b981, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .recommendations-section .section-title::after {
          background: linear-gradient(135deg, #059669, #10b981, #34d399);
        }
        
        .product-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 25px;
          position: relative;
          z-index: 2;
        }
        
        .product-item {
          background: linear-gradient(135deg, #ffffff 0%, #fdfcfa 50%, #fbe4ef 100%);
          padding: 35px 25px;
          border-radius: 25px;
          text-align: center;
          border: 2px solid rgba(248, 71, 180, 0.15);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 10px 30px rgba(248, 71, 180, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }
        
        .product-item::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent,
            rgba(248, 71, 180, 0.1),
            transparent
          );
          transform: rotate(45deg);
          transition: all 0.6s ease;
          opacity: 0;
        }
        
        .product-item:hover::before {
          opacity: 1;
          transform: rotate(45deg) translate(50%, 50%);
        }
        
        .product-item:hover {
          transform: translateY(-8px);
          box-shadow: 
            0 20px 50px rgba(248, 71, 180, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }
        
        .product-step {
          background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
          color: white;
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          padding: 12px 20px;
          border-radius: 15px;
          margin-bottom: 25px;
          display: inline-block;
          box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
          position: relative;
          z-index: 2;
        }
        
        .product-image {
          width: 160px;
          height: 160px;
          object-fit: contain;
          margin: 0 auto 25px auto;
          display: block;
          border-radius: 20px;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          padding: 15px;
          box-shadow: 
            0 8px 25px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          border: 2px solid rgba(248, 71, 180, 0.1);
          position: relative;
          z-index: 2;
        }
        
        .product-name {
          color: #2c3e50;
          font-weight: bold;
          font-size: 18px;
          margin-bottom: 10px;
          line-height: 1.4;
          position: relative;
          z-index: 2;
        }
        
        .product-brand {
          color: #6c757d;
          font-size: 15px;
          margin-bottom: 18px;
          font-style: italic;
          position: relative;
          z-index: 2;
        }
        
        .product-price {
          background: linear-gradient(135deg, #f847b4, #ff6bc7, #ff85d1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 25px;
          position: relative;
          z-index: 2;
        }
        
        .product-shop-btn {
          background: linear-gradient(135deg, #f847b4 0%, #ff6bc7 25%, #ff85d1 50%, #ff4da6 75%, #e239a3 100%);
          color: white;
          border: none;
          padding: 18px 45px;
          border-radius: 25px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: all 0.3s ease;
          box-shadow: 
            0 8px 25px rgba(248, 71, 180, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          width: 100%;
          max-width: 220px;
          position: relative;
          z-index: 2;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .product-shop-btn:hover {
          transform: translateY(-3px);
          box-shadow: 
            0 12px 35px rgba(248, 71, 180, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }
        
        .cta-section {
          text-align: center;
          padding: 40px 35px;
          background: linear-gradient(135deg, #ffffff 0%, #fff7ed 50%, #fed7aa 100%);
          border-radius: 25px;
          margin-bottom: 40px;
          border: 2px solid rgba(251, 146, 60, 0.2);
          box-shadow: 
            0 15px 40px rgba(251, 146, 60, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          position: relative;
        }
        
        .cta-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(251, 146, 60, 0.05) 50%,
            rgba(255, 255, 255, 0.1) 100%
          );
          border-radius: 25px;
          pointer-events: none;
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #f847b4 0%, #ff6bc7 25%, #ff85d1 50%, #ff4da6 75%, #e239a3 100%);
          color: white;
          text-decoration: none;
          padding: 20px 40px;
          border-radius: 25px;
          font-weight: bold;
          font-size: 18px;
          box-shadow: 
            0 12px 35px rgba(248, 71, 180, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
          position: relative;
          z-index: 2;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .cta-button:hover {
          transform: translateY(-4px);
          box-shadow: 
            0 18px 50px rgba(248, 71, 180, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }
        
        .footer {
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #1f2937 100%);
          color: white;
          padding: 40px;
          text-align: center;
          position: relative;
        }
        
        .footer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.05) 50%,
            rgba(255, 255, 255, 0) 100%
          );
        }
        
        .footer-content {
          margin-bottom: 25px;
          position: relative;
          z-index: 2;
        }
        
        .footer-content h3 {
          background: linear-gradient(135deg, #f847b4, #ff6bc7, #ff85d1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 12px;
          font-size: 24px;
        }
        
        .social-links {
          margin: 25px 0;
          position: relative;
          z-index: 2;
        }
        
        .social-links a {
          background: linear-gradient(135deg, #f847b4, #ff6bc7, #ff85d1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-decoration: none;
          margin: 0 20px;
          font-weight: bold;
          font-size: 16px;
          transition: all 0.3s ease;
        }
        
        .social-links a:hover {
          text-shadow: 0 0 20px rgba(248, 71, 180, 0.5);
        }
        
        .footer-text {
          color: #9ca3af;
          font-size: 14px;
          margin-top: 25px;
          position: relative;
          z-index: 2;
        }
        
        @media (max-width: 600px) {
          .email-container {
            margin: 10px;
            border-radius: 25px;
          }
          
          .header, .content, .footer {
            padding: 30px 25px;
          }
          
          .results-grid {
            grid-template-columns: 1fr;
          }
          
          .product-list {
            grid-template-columns: 1fr;
          }
          
          .header h1 {
            font-size: 26px;
          }
          
          .section-title {
            font-size: 24px;
          }
          
          .result-value {
            font-size: 28px;
          }
          
          .product-price {
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
          <h1>AI-Powered Skin Analysis</h1>
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
<img
  src="${
    prod.image
      ? prod.image
      : "https://placehold.co/160x160/ffffff/cccccc?text=Product+Image"
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
          
          <!-- Call to Action -->
          <div class="cta-section">
            <h3 style="background: linear-gradient(135deg, #f59e0b, #f97316, #ea580c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 18px; font-size: 24px; font-weight: bold; position: relative; z-index: 2;">Ready to Transform Your Skin? 🚀</h3>
            <p style="color: #78716c; margin-bottom: 25px; font-size: 16px; position: relative; z-index: 2;">Visit our website to explore more products</p>
            <a href="https://beautyhub.ng" class="cta-button">Shop Now</a>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-content">
            <h3>Beauty Hub</h3>
            <p>Your trusted partner in skincare excellence</p>
            <p style="font-size: 14px; margin-top: 10px; font-weight: bold;">Powered by CRE8LAB</p>
          </div>
          
          <div class="social-links">
            <a href="https://www.instagram.com/beautyhubco.ng/">Instagram</a>
            <a href="https://wa.me/2348162598682">WhatsApp</a>
            <a href="mailto:hello@beautyhub.ng">Email</a>
          </div>
          
          <div class="footer-text">
            <p>© 2025 Beauty Hub. All rights reserved.</p>
            <p>This email was sent to you because you requested a skin analysis report.</p>
            <p style="margin-top: 10px; font-size: 13px;">www.beautyhub.ng</p>
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
