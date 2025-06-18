import { useState } from "react";
import { hasUserCompletedOrder, createWooCompletedOrder } from "@/services/woocommerce";
import { triggerPaystackPopup } from "@/util/paystack";

type Props = {
  onClose: () => void;
  onLoginSuccess: (email: string, hasAccess: boolean) => void;
};

export default function LoginModal({ onClose, onLoginSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError("");

    try {
      const hasAccess = await hasUserCompletedOrder(email);

      if (hasAccess) {
        console.log(email)
        // ✅ Already has a completed order
        onLoginSuccess(email, true);
      } else {
        // 🧾 Trigger Paystack payment
        triggerPaystackPopup({
          email,
          amount: 500000, // ₦5000 in kobo
          onSuccess: async () => {
            await createWooCompletedOrder(email);
            onLoginSuccess(email, true); // ✅ Access granted
          },
// @ts-expect-error: 'onCancel' is a custom prop not included in the base type
onCancel: () => {
            setError("Payment was cancelled. Please try again.");
          },
        });
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setChecking(false);
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
          <button type="submit" disabled={checking} style={buttonStyle}>
            {checking ? "Checking..." : "Continue"}
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
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
