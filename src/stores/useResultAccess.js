import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loadPaystackScript, triggerPaystackPopup } from "@/util/paystack";
import { notifyError } from "@/util/utils";

export const useResultAccess = create(
  persist(
    (set, get) => ({
      userEmail: null,
      hasAccess: false,
      showLoginModal: false,
      isBlocked: false,

      setUserEmail: (email) => set({ userEmail: email }),
      setHasAccess: (access) => set({ hasAccess: access }),
      setShowLoginModal: (value) => set({ showLoginModal: value }),
      setIsBlocked: (value) => set({ isBlocked: value }),

      handleLogin: async (email) => {
        set({ userEmail: email, isBlocked: false });
console.log(get)
        try {
          const res = await fetch("/api/access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, type: "check" }),
          });

          const result = await res.json();

          if (res.status === 429 || result.error?.includes("trial limit")) {
            set({ isBlocked: true });
            notifyError("You’ve reached the trial limit. Please try again later.");
            return;
          }

          if (result.access_granted) {
            set({ hasAccess: true });
            return;
          }

          // No access yet → Show Paystack
          loadPaystackScript();

          setTimeout(() => {
            triggerPaystackPopup({
              email,
              amount: 500000,
              onSuccess: async (response) => {
                try {
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

                  if (payRes.ok && payData.access_granted) {
                    set({ hasAccess: true });
                    alert("Payment successful! You now have access to your results.");
                  } else {
                    alert("Payment succeeded, but access setup failed. Please contact support.");
                  }
                } catch (err) {
                  console.error("Post-payment error:", err);
                  alert("Payment verified but failed to set up access. Please contact support.");
                }
              },
              onClose: () => {
                console.log("Payment popup closed");
              },
            });
          }, 1000);
        } catch (err) {
          console.error("Access check failed:", err);
          notifyError("Login failed. Please try again.");
        }
      },
    }),
    {
      name: "result-access-store", // localStorage key
      partialize: (state) => ({
        userEmail: state.userEmail,
        hasAccess: state.hasAccess,
        isBlocked: state.isBlocked,
      }),
    }
  )
);
