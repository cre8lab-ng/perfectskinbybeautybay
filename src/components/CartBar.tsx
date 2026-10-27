import { useEffect, useState } from "react";
import NextImage from "next/image";
import { FiLock, FiMinus, FiPlus, FiShoppingBag, FiTrash2, FiX } from "react-icons/fi";
import { cartCount, cartTotal, useCart } from "@/stores/useCart";
import { formatNaira } from "@/lib/recommendationEngine";
import { buildCheckoutUrl } from "@/util/checkout";

export default function CartBar() {
  const { items, isOpen, setOpen, setQty, remove, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, setOpen]);

  // Bag is persisted in localStorage, so only render it on the client.
  if (!mounted || items.length === 0) return null;

  const count = cartCount(items);
  const total = cartTotal(items);
  const checkoutUrl = buildCheckoutUrl(items);

  const CheckoutButton = ({ className = "" }: { className?: string }) => (
    <a
      href={checkoutUrl}
      target="_blank"
      rel="noopener"
      onClick={() => setOpen(false)}
      className={`flex items-center justify-center gap-2 rounded-xl bg-darkpink px-5 py-3 font-extrabold text-white shadow-lg shadow-pink-300 transition hover:opacity-90 ${className}`}
    >
      <FiLock size={16} /> Checkout · {formatNaira(total)}
    </a>
  );

  return (
    <>
      {/* Sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-pink-100 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(248,71,180,0.15)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="flex flex-1 items-center gap-3 text-left"
            aria-label="View bag"
          >
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-lightpink text-darkpink">
              <FiShoppingBag size={20} />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-darkpink px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            </span>
            <span>
              <span className="block text-xs text-gray-500">Your bag</span>
              <span className="block font-extrabold text-gray-900">{formatNaira(total)}</span>
            </span>
          </button>
          <CheckoutButton />
        </div>
      </div>

      {/* Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Your bag">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-white sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <h2 className="text-lg font-extrabold text-gray-900">Your bag ({count})</h2>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Close bag">
                <FiX size={20} />
              </button>
            </div>

            <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-3 py-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-pink-50">
                    {item.image && <NextImage src={item.image} alt={item.name} fill unoptimized className="object-contain" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.step && <p className="text-[11px] font-bold uppercase text-darkpink">{item.step}</p>}
                    <p className="text-sm font-bold leading-snug text-gray-900 line-clamp-2">{item.name}</p>
                    {item.variantLabel && <p className="text-xs text-gray-500">{item.variantLabel}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-gray-200">
                        <button onClick={() => setQty(item.variantId, item.qty - 1)} className="p-2 text-gray-600 hover:text-darkpink" aria-label="Decrease quantity">
                          <FiMinus size={12} />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                        <button onClick={() => setQty(item.variantId, item.qty + 1)} className="p-2 text-gray-600 hover:text-darkpink" aria-label="Increase quantity">
                          <FiPlus size={12} />
                        </button>
                      </div>
                      <span className="font-extrabold text-gray-900">{formatNaira(item.price * item.qty)}</span>
                    </div>
                  </div>
                  <button onClick={() => remove(item.variantId)} className="self-start p-1 text-gray-400 hover:text-red-500" aria-label={`Remove ${item.name}`}>
                    <FiTrash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-100 p-5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-extrabold text-gray-900">{formatNaira(total)}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Delivery: Lagos 1–3 days, outside Lagos 2–5 days. Shipping is calculated at checkout.
              </p>
              <CheckoutButton className="mt-4 w-full py-4 text-base" />
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <FiLock size={12} /> Secure checkout on beautybayafrica.com
                </span>
                <button onClick={clear} className="font-bold underline hover:text-red-500">
                  Clear bag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
