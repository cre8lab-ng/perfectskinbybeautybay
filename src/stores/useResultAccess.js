import { create } from "zustand";
import {
  hasUserCompletedOrder,
  createWooCompletedOrder,
} from "@/services/woocommerce";
import { loadPaystackScript, triggerPaystackPopup } from "@/util/paystack";
import { notifyError } from "@/util/utils";

export const useResultAccess = create((set, get) => ({

  userEmail: null,
  hasAccess: false,
  showLoginModal: false,

  setUserEmail: (email) => set({ userEmail: email }),
  setHasAccess: (access) => set({ hasAccess: access }),
  setShowLoginModal: (value) => set({ showLoginModal: value }),
  handleLogin: async (email) => {
    set({ userEmail: email });

    try {
      const access = await hasUserCompletedOrder(email);
      if (access) {
        set({ hasAccess: true });
        return;
      }
    } catch (err) {
      console.log(get,"get");
      console.error("Order check failed:", err);
      notifyError("Unsuccessful Login");
    }

    loadPaystackScript();

    setTimeout(() => {
      triggerPaystackPopup({
        email,
        amount: 500000,
        onSuccess: async (response) => {
          console.log("Payment successful:", response);
          try {
            const created = await createWooCompletedOrder(email);
            if (created) {
              set({ hasAccess: true });
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
          console.log("Payment popup closed");
        },
      });
    }, 1000);
  },
}));
