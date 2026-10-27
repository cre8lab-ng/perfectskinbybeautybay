import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  productId: number;
  variantId: number; // what WooCommerce actually adds to the cart
  name: string;
  brand: string;
  image: string;
  variantLabel: string;
  price: number;
  step?: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  addMany: (items: Omit<CartItem, "qty">[]) => void;
  remove: (variantId: number) => void;
  removeProduct: (productId: number) => void;
  setQty: (variantId: number, qty: number) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
};

const MAX_QTY = 10;

function upsert(items: CartItem[], item: Omit<CartItem, "qty">, qty: number) {
  // One entry per product: picking another size replaces the old one.
  const others = items.filter((i) => i.productId !== item.productId);
  const existing = items.find((i) => i.variantId === item.variantId);
  return [...others, { ...item, qty: Math.min(MAX_QTY, (existing?.qty ?? 0) + qty) }];
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      add: (item, qty = 1) => set((s) => ({ items: upsert(s.items, item, qty) })),
      addMany: (newItems) =>
        set((s) => ({
          items: newItems.reduce(
            (acc, item) => (acc.some((i) => i.variantId === item.variantId) ? acc : upsert(acc, item, 1)),
            s.items
          ),
        })),
      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      removeProduct: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      setQty: (variantId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.variantId !== variantId)
              : s.items.map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(MAX_QTY, qty) } : i)),
        })),
      clear: () => set({ items: [] }),
      setOpen: (open) => set({ isOpen: open }),
    }),
    {
      name: "perfectskin-bag",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
    }
  )
);

export const cartTotal = (items: CartItem[]) => items.reduce((sum, i) => sum + i.price * i.qty, 0);
export const cartCount = (items: CartItem[]) => items.reduce((sum, i) => sum + i.qty, 0);
