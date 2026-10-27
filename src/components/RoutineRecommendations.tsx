import { useEffect, useMemo, useState } from "react";
import NextImage from "next/image";
import { FiCheck, FiPlus, FiRefreshCw, FiShoppingBag, FiSun, FiMoon, FiExternalLink } from "react-icons/fi";
import type { RecommendedProduct, RoutineResult, Step } from "@/lib/recommendationEngine";
import { formatNaira, STEP_ORDER } from "@/lib/recommendationEngine";
import { useCart } from "@/stores/useCart";
import { notifySuccess } from "@/util/utils";

const STEP_LABEL: Record<Step, string> = {
  cleanser: "Cleanse",
  toner: "Tone",
  serum: "Serum",
  treatment: "Treat",
  moisturizer: "Moisturise",
  sunscreen: "Protect",
};

function stepTiming(p: RecommendedProduct): ("am" | "pm")[] {
  if (p.step === "sunscreen") return ["am"];
  if (p.step === "treatment" || (p.strongActive && p.step !== "cleanser")) return ["pm"];
  return ["am", "pm"];
}

type Props = {
  result: RoutineResult | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  howToUse: (step: string, productName: string) => string;
  onSelectionChange?: (products: RecommendedProduct[]) => void;
};

export default function RoutineRecommendations({ result, loading, error, onRetry, howToUse, onSelectionChange }: Props) {
  const { items, add, addMany, removeProduct, setOpen } = useCart();
  const [mounted, setMounted] = useState(false);
  const [picks, setPicks] = useState<Partial<Record<Step, RecommendedProduct>>>({});
  const [variantChoice, setVariantChoice] = useState<Record<number, number>>({});
  const [swapOpen, setSwapOpen] = useState<Step | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!result) return;
    setPicks(Object.fromEntries(result.routine.products.map((p) => [p.step, p])));
    setSwapOpen(null);
  }, [result]);

  const products = useMemo(
    () => STEP_ORDER.map((s) => picks[s]).filter((p): p is RecommendedProduct => !!p),
    [picks]
  );

  useEffect(() => {
    onSelectionChange?.(products);
  }, [products, onSelectionChange]);

  const variantFor = (p: RecommendedProduct) =>
    p.variants.find((v) => v.id === variantChoice[p.id]) ?? p.variants[0];

  const toCartItem = (p: RecommendedProduct) => {
    const v = variantFor(p);
    return {
      productId: p.id,
      variantId: v.id,
      name: p.name,
      brand: p.brand,
      image: p.image,
      variantLabel: v.label,
      price: v.price,
      step: p.step,
    };
  };

  const inBag = (p: RecommendedProduct) => mounted && items.some((i) => i.productId === p.id);
  // Essentials are defined per step, so they survive the shopper swapping products.
  const essentialSteps = new Set(result?.routine.products.filter((p) => result.essentials.includes(p.id)).map((p) => p.step));
  const essentialPicks = products.filter((p) => essentialSteps.has(p.step));
  const sum = (list: RecommendedProduct[]) => list.reduce((t, p) => t + variantFor(p).price, 0);

  const addAll = (list: RecommendedProduct[], label: string) => {
    addMany(list.map(toCartItem));
    notifySuccess(`${label} added to your bag`);
    setOpen(true);
  };

  const swap = (step: Step, next: RecommendedProduct) => {
    const current = picks[step];
    if (current && inBag(current)) {
      removeProduct(current.id);
      add(toCartItem(next));
    }
    setPicks((prev) => ({ ...prev, [step]: next }));
    setSwapOpen(null);
  };

  const changeVariant = (p: RecommendedProduct, variantId: number) => {
    setVariantChoice((prev) => ({ ...prev, [p.id]: variantId }));
    if (inBag(p)) {
      const v = p.variants.find((x) => x.id === variantId)!;
      add({ ...toCartItem(p), variantId: v.id, variantLabel: v.label, price: v.price }, 1);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl rounded-3xl bg-white/80 p-6 md:p-10 shadow-xl">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-pink-200 border-t-darkpink animate-spin" />
          <p className="text-lg font-bold text-darkpink">Building your routine from today&apos;s in-stock products…</p>
          <p className="text-sm text-gray-500 mt-1">Matching ingredients to your skin profile</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-pink-50 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (error || !result) {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl bg-white/90 p-8 text-center shadow-xl">
        <p className="font-bold text-gray-800">We couldn&apos;t load product recommendations right now.</p>
        <p className="text-sm text-gray-500 mt-1">{error ?? "Please try again."}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button onClick={onRetry} className="rounded-xl bg-darkpink px-5 py-3 font-bold text-white shadow-lg hover:opacity-90">
            Try again
          </button>
          <a
            href="https://beautybayafrica.com/product-category/skincare/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border-2 border-darkpink px-5 py-3 font-bold text-darkpink hover:bg-pink-50"
          >
            Browse skincare
          </a>
        </div>
      </section>
    );
  }

  const allInBag = products.length > 0 && products.every(inBag);

  return (
    <section className="mx-auto max-w-6xl rounded-3xl bg-white/85 p-5 md:p-10 shadow-xl backdrop-blur">
      {/* Routine summary */}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-darkpink">Your personalised routine</p>
        <h3 className="mt-1 text-2xl md:text-3xl font-extrabold text-gray-900">{result.routine.name}</h3>
        <p className="mx-auto mt-2 max-w-2xl text-gray-600">{result.routine.description}</p>
        {result.routine.targets.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {result.routine.targets.map((t) => (
              <span key={t} className="rounded-full bg-lightpink px-3 py-1 text-xs font-bold text-darkpink capitalize">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* One-tap add */}
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
        <button
          onClick={() => (allInBag ? setOpen(true) : addAll(products, "Full routine"))}
          className="flex items-center justify-center gap-2 rounded-2xl bg-darkpink px-6 py-4 text-base font-extrabold text-white shadow-lg shadow-pink-300 transition hover:-translate-y-0.5 hover:opacity-95"
        >
          <FiShoppingBag size={20} />
          {allInBag ? "Full routine in bag · View bag" : `Add full routine · ${formatNaira(sum(products))}`}
        </button>
        {essentialPicks.length > 0 && essentialPicks.length < products.length && !allInBag && (
          <button
            onClick={() => addAll(essentialPicks, "Essentials")}
            className="rounded-2xl border-2 border-darkpink bg-white px-6 py-4 text-base font-bold text-darkpink transition hover:bg-pink-50"
          >
            Essentials only ({essentialPicks.length}) · {formatNaira(sum(essentialPicks))}
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">
        All products are in stock now at Beauty Bay. Pay securely at checkout.
      </p>

      {result.advice?.length > 0 && (
        <ul className="mx-auto mt-6 max-w-3xl space-y-2 rounded-2xl bg-lightpink/60 p-4 text-sm text-gray-800">
          {result.advice.map((a) => (
            <li key={a} className="flex gap-2">
              <span aria-hidden>💡</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Product cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p, idx) => {
          const v = variantFor(p);
          const added = inBag(p);
          const alts = (result.alternatives[p.step] ?? [])
            .concat(result.routine.products.filter((r) => r.step === p.step && r.id !== p.id))
            .filter((a) => a.id !== p.id);
          const isEssential = essentialSteps.has(p.step);
          return (
            <article
              key={p.step}
              className={`relative flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition ${
                added ? "border-darkpink ring-2 ring-pink-200" : "border-gray-100 hover:shadow-md"
              }`}
            >
              <header className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-darkpink">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-darkpink text-white">{idx + 1}</span>
                  {STEP_LABEL[p.step]}
                </span>
                <span className="flex items-center gap-1 text-gray-400" title="When to use">
                  {stepTiming(p).includes("am") && <FiSun size={14} aria-label="Morning" />}
                  {stepTiming(p).includes("pm") && <FiMoon size={14} aria-label="Night" />}
                  {isEssential && (
                    <span className="ml-1 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Essential</span>
                  )}
                </span>
              </header>

              <a href={p.link} target="_blank" rel="noopener noreferrer" className="mt-3 flex gap-3 group">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-pink-50">
                  {p.image && (
                    <NextImage src={p.image} alt={p.name} fill unoptimized className="object-contain p-1" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-gray-500">{p.brand}</p>
                  <p className="font-bold leading-snug text-gray-900 group-hover:underline line-clamp-3">{p.name}</p>
                  <p className="mt-1">
                    <span className="font-extrabold text-darkpink">{formatNaira(v.price)}</span>
                    {v.regularPrice > v.price && (
                      <span className="ml-2 text-sm text-gray-400 line-through">{formatNaira(v.regularPrice)}</span>
                    )}
                  </p>
                </div>
              </a>

              <ul className="mt-3 space-y-1">
                {p.reasons.map((r) => (
                  <li key={r} className="flex items-start gap-1.5 text-sm text-gray-700">
                    <FiCheck className="mt-0.5 shrink-0 text-green-600" />
                    {r}
                  </li>
                ))}
              </ul>

              <p className="mt-3 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">{howToUse(p.step, p.name)}</p>

              {p.variants.length > 1 && (
                <label className="mt-3 block text-xs font-bold text-gray-600">
                  Size
                  <select
                    value={v.id}
                    onChange={(e) => changeVariant(p, Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm font-normal"
                  >
                    {p.variants.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label} · {formatNaira(opt.price)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="mt-auto pt-4 flex gap-2">
                <button
                  onClick={() => (added ? removeProduct(p.id) : add(toCartItem(p)))}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition ${
                    added ? "bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600" : "bg-darkpink text-white hover:opacity-90"
                  }`}
                  aria-pressed={added}
                >
                  {added ? <FiCheck /> : <FiPlus />}
                  {added ? "In bag" : "Add to bag"}
                </button>
                {alts.length > 0 && (
                  <button
                    onClick={() => setSwapOpen(swapOpen === p.step ? null : p.step)}
                    className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-3 text-sm font-bold text-gray-700 hover:border-darkpink hover:text-darkpink"
                    aria-expanded={swapOpen === p.step}
                  >
                    <FiRefreshCw size={14} /> Swap
                  </button>
                )}
              </div>

              {swapOpen === p.step && (
                <div className="mt-3 space-y-2 rounded-xl bg-pink-50 p-2">
                  <p className="px-1 text-xs font-bold text-gray-600">Other great matches</p>
                  {alts.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 rounded-lg bg-white p-2">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-pink-50">
                        {a.image && <NextImage src={a.image} alt={a.name} fill unoptimized className="object-contain" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-gray-900">{a.name}</p>
                        <p className="text-xs">
                          <span className="font-bold text-darkpink">{formatNaira(a.price)}</span>
                          {a.price < v.price && <span className="ml-1 text-green-700">· save {formatNaira(v.price - a.price)}</span>}
                        </p>
                        <p className="truncate text-[11px] text-gray-500">{a.reasons[0]}</p>
                      </div>
                      <button
                        onClick={() => swap(p.step, a)}
                        className="shrink-0 rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-darkpink"
                      >
                        Use
                      </button>
                      <a href={a.link} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 text-gray-400 hover:text-darkpink" aria-label={`View ${a.name}`}>
                        <FiExternalLink size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* AM / PM summary */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {(["am", "pm"] as const).map((time) => (
          <div key={time} className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className={`mb-3 flex items-center gap-2 font-extrabold ${time === "am" ? "text-darkpink" : "text-violet-700"}`}>
              {time === "am" ? <FiSun /> : <FiMoon />} {time === "am" ? "Morning" : "Night"}
            </p>
            <ol className="space-y-1.5">
              {products
                .filter((p) => stepTiming(p).includes(time))
                .map((p, i) => (
                  <li key={p.step} className="flex gap-2 text-sm text-gray-700">
                    <span className="font-bold text-gray-400">{i + 1}.</span>
                    <span>
                      <span className="font-bold">{STEP_LABEL[p.step]}:</span> {p.brand} {p.name.replace(p.brand, "").trim()}
                    </span>
                  </li>
                ))}
            </ol>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-gray-500">
        Introduce one new active product at a time, and patch-test first. If irritation persists, stop use and see a dermatologist.
      </p>
    </section>
  );
}
