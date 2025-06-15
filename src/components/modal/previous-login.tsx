import { useState } from "react";
// import { hasUserCompletedOrder, createWooCompletedOrder } from "@/services/woocommerce";
import { triggerPaystackPopup } from "@/util/paystack";
import {  notifySuccess } from "@/util/utils";


type Props = {
  onClose: () => void;
  onLoginSuccess: (email: string, hasAccess: boolean) => void;
};

// Dummy WooCommerce API replacements

async function hasUserCompletedOrder(email: string): Promise<boolean> {
  console.log(`Simulating check for completed order by: ${email}`);
  // Always return false or toggle based on testing
  return false;
}

async function createWooCompletedOrder(email: string): Promise<{ success: boolean }> {
  console.log(`Simulating WooCommerce order creation for: ${email}`);
  // Simulate delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { success: true };
}


export default function LoginModal({ onClose, onLoginSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError("");

    try {
      const hasAccess = await hasUserCompletedOrder(
        email
      );

      if (hasAccess) {
        onLoginSuccess(email, true);
      } else {
        triggerPaystackPopup({
          email,
          amount: 500000,
          onSuccess: () => {
            createWooCompletedOrder(email)
              .then(() => {
                notifySuccess("Payment successful! Access granted.");
                onLoginSuccess(email, true);
              })
              .catch((err) => {
                console.error("Order creation failed after payment", err);
                alert("Payment succeeded but order creation failed.");
                onLoginSuccess(email, false);
              });
          },
          onClose: () => alert("Payment was cancelled."),
        });
      }
    } catch (err) {
      setError("Login failed. Please try again.");
      console.error("Login error:", err);
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
            placeholder="Enter your order email"
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
        <button onClick={onClose} style={closeButtonStyle}>Close</button>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
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
