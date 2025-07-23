import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loadPaystackScript, triggerPaystackPopup } from "@/util/paystack";
import { notifyError, notifySuccess } from "@/util/utils";

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

      checkUserAccess: async (email) => {
        try {
          const res = await fetch("/api/access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, type: "check-access" }),
          });

          const data = await res.json();

          if (res.status === 429 || data.error?.includes("trial limit")) {
            set({ isBlocked: true });
            notifyError(
              "You’ve reached the trial limit. Please try again in the next 12 hours."
            );
            return { granted: false, reason: "trial_blocked" };
          }

          if (data.success && data.access_granted) {
            set({ hasAccess: true });
            return {
              granted: true,
              quota: data.remaining_quota, // optional: if your backend sends this
              source: data.source,
            };
          }

          return { granted: false, reason: data.reason || "unknown" };
        } catch (err) {
          console.error("Access check error:", err);
          notifyError("Server error. Please try again.");
          return { granted: false, reason: "error" };
        }
      },

      grantAnalysisAccess: async () => {
        const email = get().userEmail;
        if (!email) return;

        try {
          const res = await fetch("/api/access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              type: "mark-analysis",
              source: "analysis",
            }),
          });

          const data = await res.json();

          if (res.ok && data.success) {
            set({ hasAccess: true });
            console.log("✅ Access marked for analysis");
            return true;
          } else {
            notifyError(
              "Access marking failed: " + (data.reason || "Unknown error")
            );
            return false;
          }
        } catch (err) {
          console.error("Grant access error:", err);
          notifyError("Could not grant access");
          return false;
        }
      },

      handleLogin: async (email) => {
        const reference = "ref-" + Date.now(); // Generate properly in real use
        set({ userEmail: email, isBlocked: false });

        const result = await get().checkUserAccess(email);

        if (result.granted) {
          return;
        }

        if (result.reason === "trial_blocked") {
          return;
        }

        // 🧾 Trigger Paystack
        loadPaystackScript();

        setTimeout(() => {
          triggerPaystackPopup({
            email,
            amount: 500000,
            reference,
            onSuccess: async (response) => {
              try {
                const payRes = await fetch("/api/access", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email,
                    reference,
                    type: "mark-paid",
                  }),
                });
                console.log(response);
                const payData = await payRes.json();

                if (payRes.ok && payData.access_granted) {
                  // 🔁 Immediately grant access
                  const granted = await get().grantAnalysisAccess();
                  if (granted) {
                    notifySuccess("Payment successful! You now have access.");
                  }
                } else {
                  notifyError("Payment succeeded, but access setup failed.");
                }
              } catch (err) {
                console.error("Post-payment error:", err);
                notifyError("Payment verified but access setup failed.");
              }
            },
            onClose: () => {
              console.log("Payment popup closed");
            },
          });
        }, 1000);
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
