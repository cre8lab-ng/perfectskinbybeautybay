import React from "react";

export default function InstructionModal({
  onTakeSelfie,
  onUploadPhoto,
}: {
  onTakeSelfie: () => void;
  onUploadPhoto: () => void;
}) {
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
                  Ensure you`&apos;re in a well-lit environment.
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

// Enhanced Styles with Beauty Hub Theme
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
  animation: "fadeIn 0.3s ease-out",
};

const modalStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #ffffff 0%, #ffd9f0 100%)",
  borderRadius: "24px",
  width: "100%",
  maxWidth: "400px",
  boxShadow: "0 25px 70px rgba(248, 71, 180, 0.3), 0 10px 40px rgba(0, 0, 0, 0.1)",
  border: "1px solid rgba(248, 71, 180, 0.2)",
  overflow: "hidden",
  position: "relative",
  animation: "slideUp 0.4s ease-out",
};

const headerStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #f847b4 0%, #ff69c4 100%)",
  padding: "2rem 2rem 1.5rem 2rem",
  textAlign: "center",
  position: "relative",
  overflow: "hidden",
};

const iconContainerStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.2)",
  borderRadius: "50%",
  width: "50px",
  height: "50px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 1rem auto",
  backdropFilter: "blur(10px)",
  border: "2px solid rgba(255, 255, 255, 0.3)",
};

const iconStyle: React.CSSProperties = {
  fontSize: "1.8rem",
  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
};

const titleStyle: React.CSSProperties = {
  color: "white",
  fontSize: "1.4rem",
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

const contentStyle: React.CSSProperties = {
  padding: "1.5rem",
};

const instructionsContainerStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.7)",
  borderRadius: "20px",
  padding: "1.25rem",
  marginBottom: "1.5rem",
  border: "1px solid rgba(248, 71, 180, 0.1)",
};

const instructionsHeaderStyle: React.CSSProperties = {
  color: "#f847b4",
  fontSize: "1rem",
  fontWeight: "700",
  margin: "0 0 1rem 0",
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const instructionListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const instructionItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.75rem",
  padding: "0.6rem",
  background: "rgba(255, 255, 255, 0.8)",
  borderRadius: "12px",
  border: "1px solid rgba(248, 71, 180, 0.1)",
  transition: "all 0.3s ease",
};

const instructionIconStyle: React.CSSProperties = {
  fontSize: "1.2rem",
  flexShrink: 0,
  marginTop: "2px",
};

const instructionTextStyle: React.CSSProperties = {
  color: "#555",
  fontSize: "0.9rem",
  lineHeight: "1.5",
  fontWeight: "500",
};

const actionSectionStyle: React.CSSProperties = {
  textAlign: "center",
};

const buttonContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #f847b4 0%, #ff1493 100%)",
  color: "white",
  border: "none",
  borderRadius: "16px",
  padding: "0.85rem 1.25rem",
  fontSize: "1rem",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.3s ease",
  boxShadow: "0 8px 25px rgba(248, 71, 180, 0.4)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #ffd9f0 0%, #f8bbd9 100%)",
  color: "#f847b4",
  border: "2px solid rgba(248, 71, 180, 0.3)",
  borderRadius: "16px",
  padding: "0.85rem 1.25rem",
  fontSize: "1rem",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.3s ease",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const buttonContentStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.75rem",
};

const buttonIconStyle: React.CSSProperties = {
  fontSize: "1.1rem",
};