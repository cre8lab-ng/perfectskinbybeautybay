import { useState } from "react";
import {
  hasUserCompletedOrder,
  createWooCompletedOrder,
} from "@/services/woocommerce";
import { triggerPaystackPopup } from "@/util/paystack";
import { useAccessManager } from "@/stores/useAccessManager";
import { useResultAccess } from "@/stores/useResultAccess";

type Props = {
  onClose: () => void;
  onLoginSuccess: (email: string, hasAccess: boolean) => void;
};

export default function LoginModal({ onClose, onLoginSuccess }: Props) {
  console.log(hasUserCompletedOrder)
  const [showPayButton, setShowPayButton] = useState(false);
  const [email, setEmail] = useState("");
  const {
    checkAccess,
    markAsPaid,
    loading,
    error: accessError,
  } = useAccessManager();
  const [error, setError] = useState("");
console.log(markAsPaid)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await checkAccess(email);

    if (result.accessGranted) {
      useResultAccess.getState().setUserEmail(email);
      useResultAccess.getState().setHasAccess(true);
      onLoginSuccess(email, true);
        } else if (result.reason === "requires_payment") {
      triggerPaystackPopup({
        email,
        amount: 500000,
        onSuccess: async (response) => {
          console.log(response)

          const created = await createWooCompletedOrder(email);
          if (created) {
            useResultAccess.getState().setUserEmail(email);
            useResultAccess.getState().setHasAccess(true);
            alert("Payment successful! You now have access to your results.");
            onLoginSuccess(email, true);
          }
        },
        onCancel: () => {
          setError("Payment was cancelled. Please try again.");
        },
      });
      
    } else if (result.reason === "already_used") {
      setError("You've already used your free access. Please pay to continue.");
      setShowPayButton(true);
    } else {
      setError(result.error || "Something went wrong.");
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>Sign In to View Your Results</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Checking..." : "Continue"}
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
          {accessError && <p style={{ color: "red" }}>{accessError}</p>}

          {showPayButton && (
            <button
              type="button"
              onClick={() =>
                triggerPaystackPopup({
                  email,
                  amount: 500000,
                  onSuccess: async (response) => {
                    console.log(response)

                    const created = await createWooCompletedOrder(email);
                    if (created) {
                      useResultAccess.getState().setUserEmail(email);
                      useResultAccess.getState().setHasAccess(true);
                      alert("Payment successful! You now have access to your results.");
                      onLoginSuccess(email, true);
                    }
                  },
                  onCancel: () => {
                    setError("Payment was cancelled. Please try again.");
                  },
                })
              }
              
              style={{
                ...buttonStyle,
                backgroundColor: "green",
                marginTop: "1rem",
              }}
            >
              Pay ₦5000 to Continue
            </button>
          )}
        </form>
        <button onClick={onClose} style={closeButtonStyle}>
          Close
        </button>
      </div>
    </div>
  );
}

// Styles
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  background: "white",
  padding: "2rem",
  borderRadius: "12px",
  width: "100%",
  maxWidth: "400px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.8rem",
  marginTop: "1rem",
  marginBottom: "1rem",
  borderRadius: "8px",
  border: "1px solid #ccc",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const closeButtonStyle: React.CSSProperties = {
  marginTop: "1rem",
  backgroundColor: "transparent",
  border: "none",
  color: "#555",
  textDecoration: "underline",
  cursor: "pointer",
};
