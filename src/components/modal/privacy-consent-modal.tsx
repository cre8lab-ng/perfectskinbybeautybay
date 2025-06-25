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
              {agreed ? '✨ Submit & Continue' : 'Please Agree to Continue'}
            </span>
          </button>
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
  maxWidth: "450px",
  boxShadow: "0 25px 70px rgba(248, 71, 180, 0.3), 0 10px 40px rgba(0, 0, 0, 0.1)",
  border: "1px solid rgba(248, 71, 180, 0.2)",
  overflow: "hidden",
  position: "relative",
  animation: "slideUp 0.4s ease-out",
};

const headerStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #f847b4 0%, #ff69c4 100%)",
  padding: "2.5rem 2rem 2rem 2rem",
  textAlign: "center",
  position: "relative",
  overflow: "hidden",
};

const iconContainerStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.2)",
  borderRadius: "50%",
  width: "60px",
  height: "60px",
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
  fontSize: "1.6rem",
  fontWeight: "700",
  margin: "0 0 0.5rem 0",
  textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
  letterSpacing: "-0.5px",
  textTransform: "uppercase",
};

const subtitleStyle: React.CSSProperties = {
  color: "rgba(255, 255, 255, 0.9)",
  fontSize: "0.9rem",
  margin: "0",
  fontWeight: "400",
};

const contentStyle: React.CSSProperties = {
  padding: "2rem",
};

const infoSectionStyle: React.CSSProperties = {
  marginBottom: "2rem",
};

const featureTagStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #ffd9f0 0%, #f8bbd9 100%)",
  borderRadius: "20px",
  padding: "0.5rem 1rem",
  display: "inline-block",
  marginBottom: "1rem",
  border: "1px solid rgba(248, 71, 180, 0.2)",
};

const featureTagTextStyle: React.CSSProperties = {
  color: "#f847b4",
  fontSize: "0.8rem",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const descriptionStyle: React.CSSProperties = {
  color: "#555",
  fontSize: "0.95rem",
  lineHeight: "1.6",
  margin: "0",
  textAlign: "left",
};

const consentSectionStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.7)",
  borderRadius: "16px",
  padding: "1.5rem",
  marginBottom: "2rem",
  border: "1px solid rgba(248, 71, 180, 0.1)",
};

const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "1rem",
  cursor: "pointer",
  fontSize: "0.9rem",
  color: "#444",
  lineHeight: "1.5",
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
  width: "20px",
  height: "20px",
  borderRadius: "6px",
  border: "2px solid",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.3s ease",
  marginTop: "2px",
};

const checkmarkStyle: React.CSSProperties = {
  color: "white",
  fontSize: "12px",
  fontWeight: "bold",
};

const consentTextStyle: React.CSSProperties = {
  fontWeight: "500",
  flex: 1,
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "1rem 1.5rem",
  border: "none",
  borderRadius: "16px",
  fontSize: "1rem",
  fontWeight: "600",
  transition: "all 0.3s ease",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const buttonTextStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
};