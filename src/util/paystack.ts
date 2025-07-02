import { notifyError } from "./utils";

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
        callback: (response: any) => void;
        onClose: () => void;
      }) => PaystackHandler;
    };
  }
}

/** Triggers Paystack payment popup */
export function triggerPaystackPopup({
  email,
  amount,
  reference = `SA-${Date.now()}`,
  onSuccess,
  onClose,
}: {
  email: string;
  amount: number;
  reference?: string;
  onSuccess?: (response?: any) => void;
  onClose?: () => void;
}) {
  const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  if (!paystackKey) {
    console.error("❌ Paystack public key not found in environment variables.");
    return;
  }

  if (typeof window === "undefined" || !window.PaystackPop) {
    notifyError("Paystack is not ready yet. Please try again in a few seconds.");
    return;
  }

  const callbackFn = (response: any) => {
    console.log("✅ Payment successful:", response);
    if (onSuccess) onSuccess(response);
  };

  const onCloseFn = () => {
    console.log("❌ Payment popup closed");
    if (onClose) onClose();
  };

  try {
    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email,
      amount,
      currency: "NGN",
      ref: reference, // ✅ now passed explicitly
      callback: callbackFn,
      onClose: onCloseFn,
    });

    if (!handler || typeof handler.openIframe !== "function") {
      notifyError("❌ Paystack failed to initialize.");
      return;
    }

    handler.openIframe();
  } catch (error) {
    console.error("Paystack setup error:", error);
    notifyError("❌ Failed to initialize payment. Please try again.");
  }
}

