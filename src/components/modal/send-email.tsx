import { sendSkinAnalysisEmail } from "@/services/skinanalysis";
import React, { useState } from "react";

export default function SendResultModal({
  isOpen,
  onClose,
  scoreInfo,
  recommendations,
}: {
  isOpen: boolean;
  onClose: () => void;
  scoreInfo: any;
  recommendations: any[];
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!email) return setError("Please enter a valid email.");
    setSending(true);
    setError("");
    setSuccess(false);
    
    try {
      const resultsHtml = `
        <p><strong>Wrinkle:</strong> ${scoreInfo?.wrinkle?.ui_score}</p>
        <p><strong>Pore:</strong> ${scoreInfo?.pore?.ui_score}</p>
        <p><strong>Texture:</strong> ${scoreInfo?.texture?.ui_score}</p>
        <p><strong>Acne:</strong> ${scoreInfo?.acne?.ui_score}</p>
      `;

      await sendSkinAnalysisEmail(email, resultsHtml, recommendations);
      setSuccess(true);
      setError("");
    } catch (err: any) {
      console.error(err);
      setError("Failed to send email. Please try again.");
      setSuccess(false);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Send Your Results</h2>
          <p style={subtitleStyle}>
            Get your personalized beauty insights delivered to your inbox
          </p>
        </div>

        <div style={formStyle}>
          <div style={inputContainerStyle}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={sending || success}
              style={{
                ...inputStyle,
                backgroundColor: sending || success ? "#f5f5f5" : "white",
                cursor: sending || success ? "not-allowed" : "text",
              }}
            />
          </div>

          {!success ? (
            <button
              type="submit"
              disabled={sending}
              style={{
                ...buttonStyle,
                opacity: sending ? 0.2 : 1,
                cursor: sending ? "not-allowed" : "pointer",
              }}
              onClick={handleSend}
            >
              <span style={buttonTextStyle}>
                {sending ? "Sending..." : "📧 Send Results"}
              </span>
            </button>
          ) : (
            <div style={successStyle}>
              <span style={successIconStyle}>✅</span>
              Email sent successfully! Check your inbox.
            </div>
          )}

          {error && (
            <div style={errorStyle}>
              <span style={errorIconStyle}>⚠️</span>
              {error}
            </div>
          )}
        </div>

        <button onClick={onClose} style={closeButtonStyle}>
          <span style={closeButtonTextStyle}> X </span>
        </button>
      </div>
    </div>
  );
}

// Enhanced Styles matching LoginModal
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(248, 71, 180, 0.15)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  animation: "fadeIn 0.3s ease-out",
};

const modalStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #ffffff 0%, #ffd9f0 100%)",
  padding: "0",
  borderRadius: "24px",
  width: "100%",
  maxWidth: "420px",
  boxShadow:
    "0 20px 60px rgba(248, 71, 180, 0.3), 0 8px 32px rgba(0, 0, 0, 0.1)",
  border: "1px solid rgba(248, 71, 180, 0.2)",
  overflow: "hidden",
  animation: "slideUp 0.4s ease-out",
};

const headerStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #f847b4 0%, #ff69c4 100%)",
  padding: "2rem 2rem 1.5rem 2rem",
  textAlign: "center",
  position: "relative",
};

const titleStyle: React.CSSProperties = {
  color: "white",
  fontSize: "1.5rem",
  fontWeight: "700",
  margin: "0 0 0.5rem 0",
  textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
  letterSpacing: "-0.5px",
};

const subtitleStyle: React.CSSProperties = {
  color: "rgba(255, 255, 255, 0.9)",
  fontSize: "0.9rem",
  margin: "0",
  fontWeight: "400",
};

const formStyle: React.CSSProperties = {
  padding: "2rem",
};

const inputContainerStyle: React.CSSProperties = {
  marginBottom: "1.5rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#666",
  fontSize: "0.85rem",
  fontWeight: "600",
  marginBottom: "0.5rem",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "1rem 1.25rem",
  fontSize: "1rem",
  borderRadius: "16px",
  border: "2px solid #ffd9f0",
  backgroundColor: "white",
  transition: "all 0.3s ease",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "1rem 1.5rem",
  background: "linear-gradient(135deg, #f847b4 0%, #ff1493 100%)",
  color: "white",
  border: "none",
  borderRadius: "16px",
  fontSize: "1rem",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.3s ease",
  boxShadow: "0 8px 25px rgba(248, 71, 180, 0.4)",
  marginBottom: "1rem",
  position: "relative",
  overflow: "hidden",
};

const buttonTextStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
};

const successStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)",
  color: "#2e7d32",
  padding: "1rem 1.25rem",
  borderRadius: "12px",
  fontSize: "0.9rem",
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  border: "1px solid #a5d6a7",
  marginBottom: "1rem",
  fontWeight: "600",
};

const successIconStyle: React.CSSProperties = {
  fontSize: "1.1rem",
};

const errorStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)",
  color: "#c62828",
  padding: "1rem 1.25rem",
  borderRadius: "12px",
  fontSize: "0.9rem",
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  border: "1px solid #f8bbd9",
  marginTop: "1rem",
};

const errorIconStyle: React.CSSProperties = {
  fontSize: "1.1rem",
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: "1rem",
  right: "1rem",
  background: "#f847b4",
  border: "none",
  borderRadius: "50%",
  width: "40px",
  height: "40px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.3s ease",
  backdropFilter: "blur(10px)",
};

const closeButtonTextStyle: React.CSSProperties = {
  color: "white",
  fontSize: "1.2rem",
  fontWeight: "bold",
};