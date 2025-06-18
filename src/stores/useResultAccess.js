// stores/useResultAccess.ts
import { useState } from "react";
import {
  hasUserCompletedOrder,
  createWooCompletedOrder,
} from "@/services/woocommerce";
import { loadPaystackScript, triggerPaystackPopup } from "@/util/paystack";
import { notifyError } from "@/util/utils"; // Make sure this import exists

export function useResultAccess() {
  const [userEmail, setUserEmail] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  async function handleLogin(email) {
    setUserEmail(email);

    let access = false;
    try {
      access = await hasUserCompletedOrder(email);
    } catch (err) {
      console.error("Order check failed:", err);
      notifyError("Unsuccessful Login");
    }

    if (access) {
      setHasAccess(true);
      return;
    }

    // Load Paystack script before using it
    loadPaystackScript();

    // Add a small delay to ensure Paystack script is loaded
    setTimeout(() => {
      triggerPaystackPopup({
        email,
        amount: 500000, // ₦5,000.00 in kobo
        onSuccess: async (response) => {
          console.log("Payment successful:", response);
          try {
            const created = await createWooCompletedOrder(email);
            if (created) {
              setHasAccess(true);
              alert("Payment successful! You now have access to your results.");
            } else {
              alert("Payment succeeded, but access setup failed. Please contact support.");
            }
          } catch (err) {
            console.error("Post-payment callback error:", err);
            alert("Payment was successful, but there was an issue setting up your access. Please contact support.");
          }
        },
        onClose: () => {
          console.log("Payment popup was closed");
          // Don't show alert for every close - user might just be reviewing
          // alert("Payment was cancelled.");
        },
      });
    }, 1000); // 1 second delay to ensure Paystack is loaded
  }

  return {
    userEmail,
    hasAccess,
    showLoginModal,
    setShowLoginModal,
    handleLogin,
  };
}