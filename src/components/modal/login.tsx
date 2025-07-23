import { useState } from "react";
import { triggerPaystackPopup } from "@/util/paystack";
import { useAccessManager } from "@/stores/useAccessManager";
import { useResultAccess } from "@/stores/useResultAccess";
import { notifyError, notifySuccess } from "@/util/utils";

type Props = {
  onClose: () => void;
  onLoginSuccess: (email: string, hasAccess: boolean) => void;
};

export default function LoginModal({ onClose, onLoginSuccess }: Props) {
  const [showPayButton, setShowPayButton] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const reference = `PSK_${Date.now()}`;
  const [email, setEmail] = useState("");
  const { checkAccess, loading, error: accessError } = useAccessManager();
  const [error, setError] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await checkAccess(email);

    if (result.error?.toLowerCase().includes("trial limit")) {
      setError(
        "You’ve reached the trial limit. Please try again in the next 12 hours."
      );
      setShowPayButton(false);
      return;
    }

    if (result.accessGranted) {
      useResultAccess.getState().setUserEmail(email);
      useResultAccess.getState().setHasAccess(true);
      onLoginSuccess(email, true);
    } else if (result.reason === "requires_payment") {
      setError("₦5,000 access fee required to continue.");
      setShowPayButton(true);
    } else if (result.reason === "already_used") {
      setError("You've used your free access. Payment is required.");
      setShowPayButton(true);
    } else if (result.error) {
      setError(result.error);
    } else {
      console.warn("Unexpected result from checkAccess:", result);
      setError("Something went wrong. Please try again.");
    }
    
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Sign In to View Your Results</h2>
          <p style={subtitleStyle}>
            Enter your email to access your personalized beauty insights
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
              disabled={error.includes("trial limit")}
              style={{
                ...inputStyle,
                backgroundColor: error.includes("trial limit")
                  ? "#f5f5f5"
                  : "white",
                cursor: error.includes("trial limit") ? "not-allowed" : "text",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || error.includes("trial limit")}
            style={{
              ...buttonStyle,
              opacity: loading || error.includes("trial limit") ? 0.2 : 1,
              cursor:
                loading || error.includes("trial limit")
                  ? "not-allowed"
                  : "pointer",
            }}
            onClick={handleSubmit}
          >
            <span style={buttonTextStyle}>
              {loading ? "Checking..." : "Continue"}
            </span>
          </button>

          {(error || accessError) && (
  <div style={errorStyle}>
    <span style={errorIconStyle}>⚠️</span>

    {error === "Internal Server Error" || accessError === "Internal Server Error" ? (
      <>
        Something went wrong. Please contact support on{" "}
        <a
              href="https://www.instagram.com/beautyhubco.ng/"
              target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#f847b4", textDecoration: "underline" }}
        >
          Instagram
        </a>
        ,{" "}
        <a
              href="https://wa.me/2348162598682"
              target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#f847b4", textDecoration: "underline" }}
        >
          WhatsApp
        </a>
        , or{" "}
        <a
          href="mailto:support@beautyhub.ng"
          style={{ color: "#f847b4", textDecoration: "underline" }}
        >
          email
        </a>
        .
      </>
    ) : (
      error || accessError
    )}
  </div>
)}


          {showPayButton && !error.includes("trial limit") && (
            <div style={paymentSectionStyle}>
              <div style={dividerStyle}>
                <span style={dividerTextStyle}>Payment Required</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPaying(true);
                  triggerPaystackPopup({
                    email,
                    amount: 500000,
                    reference,
                    onSuccess: async (response) => {
                      console.log("✅ Paystack payment success:", response);

                      const payRes = await fetch("/api/access", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email,
                          reference: response.reference,
                          type: "mark-paid",
                        }),
                      });

                      const payData = await payRes.json();

                      if (!payRes.ok || !payData.access_granted) {
                        console.error(
                          "❌ Payment verified but access setup failed:",
                          payData
                        );
                        notifyError(
                          "Payment was verified but access setup failed. Please contact support."
                        );
                        setIsPaying(false);
                        return;
                      }

                      useResultAccess.getState().setUserEmail(email);
                      useResultAccess.getState().setHasAccess(true);
                      onLoginSuccess(email, true);
                      notifySuccess(
                        "Payment successful! You now have access to your results."
                      );

                      // const created = await createWooCompletedOrder(email);

                      // if (created) {
                      //   useResultAccess.getState().setUserEmail(email);
                      //   useResultAccess.getState().setHasAccess(true);
                      //   onLoginSuccess(email, true);
                      //   notifySuccess(
                      //     "Payment successful! You now have access to your results."
                      //   );
                      // }

                      setIsPaying(false);
                    },
                    onClose: () => {
                      setError("Payment was cancelled. Please try again.");
                      setIsPaying(false);
                    },
                  });
                }}
                disabled={isPaying}
                style={{
                  ...payButtonStyle,
                  opacity: isPaying ? 0.5 : 1,
                  cursor: isPaying ? "not-allowed" : "pointer",
                }}
              >
                <span style={payButtonTextStyle}>
                  {isPaying ? "Processing..." : "Pay ₦5,000 to Continue"}
                </span>
              </button>
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

// Enhanced Styles with Beauty Hub Theme
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

const paymentSectionStyle: React.CSSProperties = {
  marginTop: "1.5rem",
  paddingTop: "1.5rem",
};

const dividerStyle: React.CSSProperties = {
  position: "relative",
  textAlign: "center",
  marginBottom: "1.5rem",
};

const dividerTextStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #ffffff 0%, #ffd9f0 100%)",
  color: "#f847b4",
  padding: "0.5rem 1rem",
  fontSize: "0.8rem",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "1px",
  borderRadius: "20px",
  border: "2px solid #ffd9f0",
};

const payButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "1rem 1.5rem",
  background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
  color: "white",
  border: "none",
  borderRadius: "16px",
  fontSize: "1rem",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.3s ease",
  boxShadow: "0 8px 25px rgba(76, 175, 80, 0.4)",
};

const payButtonTextStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
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
