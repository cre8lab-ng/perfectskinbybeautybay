import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loadPaystackScript, triggerPaystackPopup } from "@/util/paystack";
import { notifyError, notifySuccess } from "@/util/utils";

export const useResultAccess = create(
  persist(
    (set) => ({
      userEmail: null,
      hasAccess: false,
      showLoginModal: false,
      isBlocked: false,
      accessConsumed: false,

      // Setters
      setUserEmail: (email) => set({ userEmail: email }),
      setHasAccess: (access) => set({ hasAccess: access }),
      setShowLoginModal: (value) => set({ showLoginModal: value }),
      setIsBlocked: (value) => set({ isBlocked: value }),
      setAccessConsumed: (value) => set({ accessConsumed: value }),

      // Clear user email
      clearUserEmail: () => set({ userEmail: null }),

      // Reset entire state
      resetAccess: () =>
        set({
          userEmail: null,
          hasAccess: false,
          showLoginModal: false,
          isBlocked: false,
          accessConsumed: false,
        }),

      // Login & Access Handling
      handleLogin: async (email) => {
        set({ isBlocked: false, showLoginModal: false });

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
            console.error("Invalid JSON from /api/access:", e);
            notifyError("Unexpected server error. Please try again.");
            set({ showLoginModal: true });
            return;
          }

          if (res.status === 429 || result.error?.toLowerCase().includes("trial limit")) {
            set({ isBlocked: true, showLoginModal: true });
            notifyError("You’ve reached the trial limit. Please try again in the next 12 hours.");
            return;
          }

          if (result.access_granted) {
            set({
              userEmail: email,
              hasAccess: true,
              accessConsumed: false,
              showLoginModal: false,
            });
            return;
          }

          // No access → launch Paystack
          loadPaystackScript();

          const reference = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

          setTimeout(() => {
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
                    set({
                      userEmail: email,
                      hasAccess: true,
                      accessConsumed: false,
                      showLoginModal: false,
                    });
                    notifySuccess("Payment successful! You now have access to your results.");
                  } else {
                    console.error("Pay succeeded but backend failed:", payData);
                    notifyError("Payment succeeded, but access setup failed. Please contact support.");
                    set({ showLoginModal: true });
                  }
                } catch (err) {
                  console.error("Error after Paystack:", err);
                  notifyError("Something went wrong setting up access. Please contact support.");
                  set({ showLoginModal: true });
                }
              },
              onClose: () => {
                console.log("Paystack popup closed");
                set({ showLoginModal: true });
              },
            });
          }, 1000);
        } catch (err) {
          console.error("Login request failed:", err);
          notifyError("Could not verify access. Please check your connection and try again.");
          set({ showLoginModal: true });
        }
      },
    }),
    {
      name: "result-access-store",
      storage: {
        getItem: (name) => sessionStorage.getItem(name),
        setItem: (name, value) => sessionStorage.setItem(name, value),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      partialize: (state) => ({
        userEmail: state.userEmail,
        hasAccess: state.hasAccess,
        isBlocked: state.isBlocked,
        accessConsumed: state.accessConsumed,
      }),
    }
  )
);
