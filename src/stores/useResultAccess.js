// store/useResultAccess.ts

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
      hasValidatedAccess: false,
      quota: null,

      // Setters
      setUserEmail: (email) => set({ userEmail: email }),
      setHasAccess: (access) => set({ hasAccess: access }),
      setShowLoginModal: (value) => set({ showLoginModal: value }),
      setIsBlocked: (value) => set({ isBlocked: value }),
      setQuota: (quota) => set({ quota }),

      // Reset everything (used on logout or page leave)
      resetAccess: () =>
        set({
          hasAccess: false,
          showLoginModal: false,
          isBlocked: false,
          hasValidatedAccess: false,
          quota: null,
        }),

      // Check access status (called after login or page mount)
      checkUserAccess: async (email) => {
        try {
          const res = await fetch("/api/access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, type: "check-access" }),
          });

          const data = await res.json();
          set({ hasValidatedAccess: true });

          if (res.status === 429 || data.error?.includes("trial limit")) {
            set({ isBlocked: true });
            notifyError("Trial limit reached. Try again later.");
            return { granted: false, reason: "trial_blocked" };
          }

          if (data.success && data.access_granted) {
            set({ hasAccess: true, quota: data.remaining_quota || null });
            return { granted: true, quota: data.remaining_quota };
          }

          return { granted: false, reason: data.reason || "unknown" };
        } catch (err) {
          console.error("Access check error:", err);
          notifyError("Server error. Please try again.");
          return { granted: false, reason: "error" };
        }
      },

      // Grant access after analysis or payment
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
            notifyError("Access marking failed: " + (data.reason || "Unknown error"));
            return false;
          }
        } catch (err) {
          console.error("Grant access error:", err);
          notifyError("Could not grant access");
          return false;
        }
      },

      // Handle login (trigger access check or payment flow)
      handleLogin: async (email) => {
        const reference = `ref-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

        set({ userEmail: email, isBlocked: false });

        const result = await get().checkUserAccess(email);

        // If access granted or trial blocked, stop here
        if (result.granted || result.reason === "trial_blocked") return;

        // Trigger Paystack flow
        loadPaystackScript();
        await new Promise((resolve) => setTimeout(resolve, 500));

        triggerPaystackPopup({
          email,
          amount: 500000,
          reference,
          onSuccess: async () => {
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

              const payData = await payRes.json();

              if (payRes.ok && payData.access_granted) {
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
      },
    }),
    {
      name: "result-access-store",
      // 🔒 Only persist userEmail — NOT access or quota
      partialize: (state) => ({
        userEmail: state.userEmail,
      }),
    }
  )
);
