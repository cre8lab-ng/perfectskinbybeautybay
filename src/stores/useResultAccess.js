import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loadPaystackScript, triggerPaystackPopup } from "@/util/paystack";
import { notifyError,notifySuccess } from "@/util/utils";


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
      clearUserEmail: () => set({ userEmail: null }),
      resetAccess: () =>
        set({
          userEmail: null,
          hasAccess: false,
          showLoginModal: false,
          isBlocked: false,
        }),

      handleLogin: async (email) => {
        console.log(get)
        set({ userEmail: email, isBlocked: false });

        try {
          const res = await fetch("/api/access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, type: "check" }),
          });

          let result;
          try {
            result = await res.json();
          } catch (e) {
            console.log(e)
            notifyError("Server error. Please try again.");
            return;
          }

          if (res.status === 429 || result.error?.includes("trial limit")) {
            set({ isBlocked: true });
            notifyError("You’ve reached the trial limit. Please try again in the next 12 hours.");
            return;
          }

          if (result.access_granted) {
            set({ hasAccess: true });
            return;
          }

          // No access → Paystack
          loadPaystackScript();

          setTimeout(() => {
            triggerPaystackPopup({
              email,
              amount: 500000,
              reference,
              onSuccess: async (response) => {
                console.log(response)
                try {
                  const payRes = await fetch("/api/access", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email,
                      reference, // ✅ must match Paystack reference
                      type: "mark-paid",
                    }),
                  });
            
                  const payData = await payRes.json();
            
                  if (payRes.ok && payData.access_granted) {
                    set({ hasAccess: true });
                    notifySuccess("Payment successful! You now have access to your results.");
                  } else {
                    notifyError("Payment succeeded, but access setup failed. Please contact support.");
                  }
                } catch (err) {
                  console.error("Post-payment error:", err);
                  notifyError("Payment verified but failed to set up access. Please contact support.");
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
      name: "result-access-store",
      partialize: (state) => ({
        userEmail: state.userEmail,
        hasAccess: state.hasAccess,
        isBlocked: state.isBlocked,
      }),
    }
  )
);
