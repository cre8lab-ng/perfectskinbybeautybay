import useAccessToken from "@/stores/useAccessToken";
import { getOrCreateDeviceId } from "@/util/getOrCreateDeviceId";
import React, { useEffect } from "react";

export default function InstructionModal({
  onTakeSelfie,
  onUploadPhoto,
}: {
  onTakeSelfie: () => void;
  onUploadPhoto: () => void;
}) {

  const generateToken = useAccessToken((s) => s.generateToken);

  useEffect(() => {
    generateToken();
  }, [generateToken]);

  useEffect(() => {
    getOrCreateDeviceId();
  }, []);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={iconContainerStyle}>
            <span style={iconStyle}>📸</span>
          </div>
          <h2 style={titleStyle}>Before You Start</h2>
          <p style={subtitleStyle}>Follow these tips for the best skin analysis results</p>
        </div>

        <div style={contentStyle}>
          <div style={instructionsContainerStyle}>
            <h3 style={instructionsHeaderStyle}>✨ Preparation Guidelines</h3>
            
            <div style={instructionListStyle}>
              <div style={instructionItemStyle}>
                <span style={instructionIconStyle}>👓</span>
                <span style={instructionTextStyle}>
                  Take off your glasses and make sure bangs are not covering your forehead.
                </span>
              </div>
              
              <div style={instructionItemStyle}>
                <span style={instructionIconStyle}>💡</span>
                <span style={instructionTextStyle}>
                  Ensure you&apos;re in a well-lit environment.
                </span>
              </div>
              
              <div style={instructionItemStyle}>
                <span style={instructionIconStyle}>🧼</span>
                <span style={instructionTextStyle}>
                  Remove makeup for accurate results.
                </span>
              </div>
              
              <div style={instructionItemStyle}>
                <span style={instructionIconStyle}>🎯</span>
                <span style={instructionTextStyle}>
                  Look straight into the camera with your face centered.
                </span>
              </div>
            </div>
          </div>

          <div style={actionSectionStyle}>            
            <div style={buttonContainerStyle}>
              <button
                onClick={onTakeSelfie}
                style={primaryButtonStyle}
              >
                <span style={buttonContentStyle}>
                  <span style={buttonIconStyle}>📱</span>
                  <span>Take a Selfie</span>
                </span>
              </button>
              
              <button
                onClick={onUploadPhoto}
                style={secondaryButtonStyle}
              >
                <span style={buttonContentStyle}>
                  <span style={buttonIconStyle}>📁</span>
                  <span>Upload a Photo</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile-Friendly Styles
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(248, 71, 180, 0.2)",
  backdropFilter: "blur(12px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  padding: "1rem", // Mobile padding
  animation: "fadeIn 0.3s ease-out",
};

const modalStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #ffffff 0%, #ffd9f0 100%)",
  borderRadius: "20px", // Slightly smaller for mobile
  width: "100%",
  maxWidth: "380px", // Slightly smaller max width
  maxHeight: "90vh", // Prevent overflow on small screens
  overflowY: "auto", // Allow scrolling if needed
  boxShadow: "0 25px 70px rgba(248, 71, 180, 0.3), 0 10px 40px rgba(0, 0, 0, 0.1)",
  border: "1px solid rgba(248, 71, 180, 0.2)",
  position: "relative",
  animation: "slideUp 0.4s ease-out",
};

const headerStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #f847b4 0%, #ff69c4 100%)",
  padding: "1.5rem 1rem 1rem 1rem", // Reduced padding for mobile
  textAlign: "center",
  position: "relative",
  overflow: "hidden",
};

const iconContainerStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.2)",
  borderRadius: "50%",
  width: "45px", // Slightly smaller
  height: "45px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 0.75rem auto", // Reduced margin
  backdropFilter: "blur(10px)",
  border: "2px solid rgba(255, 255, 255, 0.3)",
};

const iconStyle: React.CSSProperties = {
  fontSize: "1.6rem", // Slightly smaller
  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
};

const titleStyle: React.CSSProperties = {
  color: "white",
  fontSize: "1.3rem", // Slightly smaller for mobile
  fontWeight: "700",
  margin: "0 0 0.5rem 0",
  textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
  letterSpacing: "-0.5px",
};

const subtitleStyle: React.CSSProperties = {
  color: "rgba(255, 255, 255, 0.9)",
  fontSize: "0.85rem", // Slightly smaller
  margin: "0",
  fontWeight: "400",
  lineHeight: "1.4",
  padding: "0 0.5rem", // Add padding for better mobile spacing
};

const contentStyle: React.CSSProperties = {
  padding: "1rem", // Reduced padding for mobile
};

const instructionsContainerStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.7)",
  borderRadius: "16px", // Slightly smaller
  padding: "1rem", // Reduced padding
  marginBottom: "1.25rem", // Reduced margin
  border: "1px solid rgba(248, 71, 180, 0.1)",
};

const instructionsHeaderStyle: React.CSSProperties = {
  color: "#f847b4",
  fontSize: "0.9rem", // Smaller for mobile
  fontWeight: "700",
  margin: "0 0 0.75rem 0", // Reduced margin
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const instructionListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.6rem", // Reduced gap
};

const instructionItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.6rem", // Reduced gap
  padding: "0.5rem", // Reduced padding
  background: "rgba(255, 255, 255, 0.8)",
  borderRadius: "10px", // Slightly smaller
  border: "1px solid rgba(248, 71, 180, 0.1)",
  transition: "all 0.3s ease",
};

const instructionIconStyle: React.CSSProperties = {
  fontSize: "1.1rem", // Slightly smaller
  flexShrink: 0,
  marginTop: "1px",
};

const instructionTextStyle: React.CSSProperties = {
  color: "#555",
  fontSize: "0.85rem", // Smaller for mobile
  lineHeight: "1.4", // Better line height for mobile
  fontWeight: "500",
};

const actionSectionStyle: React.CSSProperties = {
  textAlign: "center",
};

const buttonContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem", // Reduced gap
};

const primaryButtonStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #f847b4 0%, #ff1493 100%)",
  color: "white",
  border: "none",
  borderRadius: "14px", // Slightly smaller
  padding: "0.75rem 1rem", // Better mobile padding
  fontSize: "0.9rem", // Smaller for mobile
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.3s ease",
  boxShadow: "0 8px 25px rgba(248, 71, 180, 0.4)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  minHeight: "48px", // Minimum touch target size
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #ffd9f0 0%, #f8bbd9 100%)",
  color: "#f847b4",
  border: "2px solid rgba(248, 71, 180, 0.3)",
  borderRadius: "14px", // Slightly smaller
  padding: "0.75rem 1rem", // Better mobile padding
  fontSize: "0.9rem", // Smaller for mobile
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.3s ease",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  minHeight: "48px", // Minimum touch target size
};

const buttonContentStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.6rem", // Reduced gap
};

const buttonIconStyle: React.CSSProperties = {
  fontSize: "1rem", // Slightly smaller
};