import type { CartItem } from "@/stores/useCart";

const STORE_URL = (process.env.NEXT_PUBLIC_STORE_URL || "https://beautybayafrica.com").replace(/\/$/, "");

/**
 * WooCommerce shareable checkout link: fills the store cart with every item and lands the
 * shopper directly on checkout, where the store handles shipping, Paystack and coupons.
 * https://woocommerce.com/document/creating-sharable-checkout-urls-in-woocommerce/
 */
export function buildCheckoutUrl(items: CartItem[]) {
  const products = items.map((i) => `${i.variantId}:${i.qty}`).join(",");
  const params = new URLSearchParams({ products });
  const coupon = process.env.NEXT_PUBLIC_ANALYSIS_COUPON;
  if (coupon) params.set("coupon", coupon);
  // URLSearchParams encodes ":" and ","; WooCommerce decodes them fine, but keep the URL readable.
  return `${STORE_URL}/checkout-link/?${params.toString().replace(/%3A/g, ":").replace(/%2C/g, ",")}`;
}
