import { useState } from "react";

export default function PrivacyConsentModal({
  onAgree,
}: {
  onAgree: () => void;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={iconContainerStyle}>
            <span style={iconStyle}>🔒</span>
          </div>
          <h2 style={titleStyle}>Privacy Consent</h2>
          <p style={subtitleStyle}>Your privacy and data security matter to us</p>
        </div>
        
        <div style={contentStyle}>
          <div style={infoSectionStyle}>
            <div style={featureTagStyle}>
              <span style={featureTagTextStyle}>🌸 Skin Analysis Feature</span>
            </div>
            
            <p style={descriptionStyle}>
              The skin analysis feature requires access to your camera and may
              collect, process, or analyze a scan of your face. This may include
              facial geometry and other biometric data for the purpose of assessing
              your skin condition.
            </p>
          </div>

          <div style={consentSectionStyle}>
            <label style={checkboxLabelStyle}>
              <div style={customCheckboxStyle}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={() => setAgreed(!agreed)}
                  style={hiddenCheckboxStyle}
                />
                <div style={{
                  ...checkboxIndicatorStyle,
                  backgroundColor: agreed ? '#f847b4' : 'white',
                  borderColor: agreed ? '#f847b4' : '#ddd',
                  transform: agreed ? 'scale(1.05)' : 'scale(1)',
                }}>
                  {agreed && <span style={checkmarkStyle}>✓</span>}
                </div>
              </div>
              <span style={consentTextStyle}>
                I agree to the use of my facial data for skin analysis.
              </span>
            </label>
          </div>

          <button
            onClick={() => agreed && onAgree()}
            disabled={!agreed}
            style={{
              ...buttonStyle,
              backgroundColor: agreed ? '#f847b4' : '#ffd9f0',
              color: agreed ? 'white' : '#999',
              cursor: agreed ? 'pointer' : 'not-allowed',
              opacity: agreed ? 1 : 0.6,
              boxShadow: agreed ? '0 8px 25px rgba(248, 71, 180, 0.4)' : 'none',
              transform: agreed ? 'translateY(0)' : 'translateY(1px)',
            }}
          >
            <span style={buttonTextStyle}>
              {agreed ? 'Submit & Continue' : 'Please Agree to Continue'}
            </span>
          </button>
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
  minHeight: "100vh",
};

const modalStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #ffffff 0%, #ffd9f0 100%)",
  borderRadius: "20px", // Smaller for mobile
  width: "100%",
  maxWidth: "400px", // Smaller max width
  maxHeight: "90vh", // Prevent overflow
  overflowY: "auto", // Allow scrolling
  boxShadow: "0 25px 70px rgba(248, 71, 180, 0.3), 0 10px 40px rgba(0, 0, 0, 0.1)",
  border: "1px solid rgba(248, 71, 180, 0.2)",
  position: "relative",
  animation: "slideUp 0.4s ease-out",
};

const headerStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #f847b4 0%, #ff69c4 100%)",
  padding: "1.5rem 1rem 1rem 1rem", // Reduced mobile padding
  textAlign: "center",
  position: "relative",
  overflow: "hidden",
};

const iconContainerStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.2)",
  borderRadius: "50%",
  width: "45px", // Smaller for mobile
  height: "45px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 0.75rem auto", // Reduced margin
  backdropFilter: "blur(10px)",
  border: "2px solid rgba(255, 255, 255, 0.3)",
};

const iconStyle: React.CSSProperties = {
  fontSize: "1.6rem", // Smaller for mobile
  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
};

const titleStyle: React.CSSProperties = {
  color: "white",
  fontSize: "1.3rem", // Smaller for mobile
  fontWeight: "700",
  margin: "0 0 0.5rem 0",
  textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
  letterSpacing: "-0.5px",
  textTransform: "uppercase",
};

const subtitleStyle: React.CSSProperties = {
  color: "rgba(255, 255, 255, 0.9)",
  fontSize: "0.8rem", // Smaller for mobile
  margin: "0",
  fontWeight: "400",
  lineHeight: "1.4",
  padding: "0 0.5rem", // Better mobile spacing
};

const contentStyle: React.CSSProperties = {
  padding: "1rem", // Reduced mobile padding
};

const infoSectionStyle: React.CSSProperties = {
  marginBottom: "1.5rem", // Reduced margin
};

const featureTagStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #ffd9f0 0%, #f8bbd9 100%)",
  borderRadius: "16px", // Smaller radius
  padding: "0.4rem 0.75rem", // Better mobile padding
  display: "inline-block",
  marginBottom: "0.75rem", // Reduced margin
  border: "1px solid rgba(248, 71, 180, 0.2)",
};

const featureTagTextStyle: React.CSSProperties = {
  color: "#f847b4",
  fontSize: "0.75rem", // Smaller for mobile
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.3px", // Reduced letter spacing
};

const descriptionStyle: React.CSSProperties = {
  color: "#555",
  fontSize: "0.85rem", // Smaller for mobile
  lineHeight: "1.5", // Better mobile line height
  margin: "0",
  textAlign: "left",
};

const consentSectionStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.7)",
  borderRadius: "14px", // Smaller radius
  padding: "1rem", // Reduced mobile padding
  marginBottom: "1.5rem", // Reduced margin
  border: "1px solid rgba(248, 71, 180, 0.1)",
};

const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.75rem", // Reduced gap
  cursor: "pointer",
  fontSize: "0.85rem", // Smaller for mobile
  color: "#444",
  lineHeight: "1.4", // Better mobile line height
  minHeight: "44px", // Minimum touch target
  padding: "0.25rem 0", // Extra touch area
};

const customCheckboxStyle: React.CSSProperties = {
  position: "relative",
  flexShrink: 0,
};

const hiddenCheckboxStyle: React.CSSProperties = {
  position: "absolute",
  opacity: 0,
  cursor: "pointer",
  height: 0,
  width: 0,
};

const checkboxIndicatorStyle: React.CSSProperties = {
  width: "22px", // Slightly larger for mobile touch
  height: "22px",
  borderRadius: "6px",
  border: "2px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.3s ease",
  marginTop: "1px",
};

const checkmarkStyle: React.CSSProperties = {
  color: "white",
  fontSize: "13px", // Slightly larger
  fontWeight: "bold",
};

const consentTextStyle: React.CSSProperties = {
  fontWeight: "500",
  flex: 1,
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1rem", // Better mobile padding
  border: "none",
  borderRadius: "14px", // Smaller radius
  fontSize: "0.9rem", // Smaller for mobile
  fontWeight: "600",
  transition: "all 0.3s ease",
  textTransform: "uppercase",
  letterSpacing: "0.3px", // Reduced letter spacing
  minHeight: "48px", // Minimum touch target
};

const buttonTextStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.4rem", // Reduced gap
};