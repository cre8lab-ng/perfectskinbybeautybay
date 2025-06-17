// paystack.ts

/** Dynamically loads the Paystack inline.js script once */
export function loadPaystackScript() {
  if (typeof window === "undefined") return;
  if (document.getElementById("paystack-script")) return;

  const script = document.createElement("script");
  script.id = "paystack-script";
  script.src = "https://js.paystack.co/v1/inline.js";
  script.async = true;
  document.body.appendChild(script);
}

// Define the shape of Paystack handler globally
interface PaystackHandler {
  openIframe: () => void;
}

// Declare Paystack global if needed
declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        callback: () => void;
        onClose: () => void;
      }) => PaystackHandler;
    };
  }
}

/** Triggers Paystack payment popup */
export function triggerPaystackPopup({
  email,
  amount,
  onSuccess,
  onClose,
}: {
  email: string;
  amount: number;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  if (!paystackKey) {
    console.error("❌ Paystack public key not found in environment variables.");
    return;
  }

  const handler = window.PaystackPop?.setup({
    key: paystackKey,
    email,
    amount,
    currency: "NGN",
    ref: `SA-${Date.now()}`,
    callback: onSuccess,
    onClose: onClose,
  });

  if (!handler) {
    alert("❌ Paystack failed to initialize. Script not loaded?");
    return;
  }

  handler.openIframe();
}
