// Matches the live Beauty Bay catalog (WooCommerce Store API) to a skin profile.
// Pure logic: no fetching here, so it can be reused and tested in isolation.

export type Step =
  | "cleanser"
  | "toner"
  | "serum"
  | "moisturizer"
  | "sunscreen"
  | "treatment";

export type Concern = "acne" | "pore" | "texture" | "wrinkle" | "pigmentation";

export type SkinProfile = {
  scores: Partial<Record<Concern, number>>; // 0–100, higher = bigger concern
  skinType: "dry" | "oily" | "combination" | "normal" | "not_sure";
  sensitivity: "low" | "medium" | "high";
  ageRange?: "under_18" | "18_24" | "25_34" | "35_44" | "45_plus";
  pregnant?: boolean;
};

// Subset of the Store API product shape that we rely on.
export type StoreApiProduct = {
  id: number;
  parent: number;
  name: string;
  type: string;
  variation: string;
  permalink: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: {
    price: string;
    regular_price: string;
    currency_minor_unit: number;
  };
  average_rating: string;
  review_count: number;
  images: { src: string; thumbnail?: string }[];
  categories: { slug: string }[];
  tags: { slug: string }[];
  attributes: { taxonomy: string; terms: { name: string }[] }[];
  is_purchasable: boolean;
  is_in_stock: boolean;
};

export type ProductVariant = {
  id: number; // variation id, or product id for simple products
  label: string; // e.g. "150ml"
  price: number; // naira
  regularPrice: number;
};

export type RecommendedProduct = {
  id: number; // product (parent) id
  name: string;
  brand: string;
  image: string;
  link: string;
  step: Step;
  price: number;
  regularPrice: number;
  onSale: boolean;
  price_html: string;
  rating: number;
  reviewCount: number;
  variants: ProductVariant[];
  reasons: string[];
  strongActive: boolean;
  expertRecommendation?: string;
};

export type RoutineResult = {
  routineLevel: "beginner" | "intermediate" | "advanced" | "intensive";
  topConcern: Concern;
  routine: {
    name: string;
    description: string;
    targets: string[];
    products: RecommendedProduct[];
  };
  alternatives: Partial<Record<Step, RecommendedProduct[]>>;
  essentials: number[]; // product ids of the minimum effective routine
  totalCost: string;
  concernsAddressed: Concern[];
  advice: string[];
};

// Only the product fields the engine and UI need, so the catalog is small enough to cache
// at the CDN and send to the browser.
type CatalogProduct = Pick<StoreApiProduct, "id" | "name" | "permalink" | "on_sale" | "average_rating" | "review_count"> & {
  images: { src: string }[];
};

export type CatalogItem = {
  base: CatalogProduct;
  variants: ProductVariant[];
  steps: Step[];
  namedSteps: Step[];
  whitening: boolean;
  categories: Set<string>;
  text: string;
  brand: string;
};

export const STEP_ORDER: Step[] = [
  "cleanser",
  "toner",
  "serum",
  "treatment",
  "moisturizer",
  "sunscreen",
];

const STEP_CATEGORIES: Record<Step, string[]> = {
  cleanser: ["face-wash-cleansers", "cleansing-balm"],
  toner: ["toners-mists-essences"],
  serum: ["face-oils-serums"],
  treatment: ["treatment", "patches", "scrubs-exfoliants", "face-masks"],
  moisturizer: ["moisturisers", "day-night-creams"],
  sunscreen: ["sunscreens"],
};

const NON_FACE_CATEGORIES = [
  "body-care",
  "body-creams-lotions",
  "body-oils",
  "body-wash-shower-gels",
  "body-acne",
  "hand-foot-care",
  "lip-care",
  "stretch-marks",
  "supplements",
  "deodorants",
  "skincare-sets",
  "eye-care",
];

const NON_FACE_NAME = /\b(body|hands?|foot|feet|shower|bath|hair|lips?|deodorant|eyes?|under ?eye)\b/;
const FACE_NAME = /\b(face|facial)\b/;

// Never recommended: skin bleaching / lightening products.
const LIGHTENING_NAME = /\b(lightening|bleach(ing)?)\b/;
// "Whitening"/"fair" is common K-beauty and local marketing for brightening; only suggest it
// to people who actually asked for help with dark spots.
const WHITENING_NAME = /\b(whitening|white|fair(est|ness)?)\b/;

type Signal = {
  label: string;
  categories: string[];
  ingredients: { slug: string; label: string; keywords: string[] }[];
  keywords: string[];
};

const ING = {
  salicylic: { slug: "salicylic-acid", label: "salicylic acid", keywords: ["salicylic"] },
  bha: { slug: "bha", label: "BHA", keywords: ["bha", "betaine salicylate"] },
  benzoyl: { slug: "benzoyl-peroxide", label: "benzoyl peroxide", keywords: ["benzoyl peroxide"] },
  azelaic: { slug: "azelaic-acid", label: "azelaic acid", keywords: ["azelaic"] },
  niacinamide: { slug: "niacinamide", label: "niacinamide", keywords: ["niacinamide"] },
  aha: { slug: "aha", label: "AHA", keywords: ["aha"] },
  glycolic: { slug: "glycolic-acid", label: "glycolic acid", keywords: ["glycolic"] },
  lactic: { slug: "lactic-acid", label: "lactic acid", keywords: ["lactic acid"] },
  pha: { slug: "pha", label: "PHA", keywords: ["pha", "gluconolactone"] },
  mandelic: { slug: "mandelic-acid", label: "mandelic acid", keywords: ["mandelic"] },
  retinol: { slug: "retinol-retinoid-vitamin-a", label: "retinoid", keywords: ["retinol", "retinal", "retinoid", "adapalene", "bakuchiol"] },
  peptide: { slug: "peptide", label: "peptides", keywords: ["peptide"] },
  collagen: { slug: "collagen", label: "collagen", keywords: ["collagen"] },
  vitaminC: { slug: "vitamin-c", label: "vitamin C", keywords: ["vitamin c", "ascorbic"] },
  hyaluronic: { slug: "hyaluronic-acid", label: "hyaluronic acid", keywords: ["hyaluronic", "sodium hyaluronate"] },
  ceramide: { slug: "ceramide", label: "ceramides", keywords: ["ceramide"] },
  arbutin: { slug: "alpha-arbutin", label: "alpha arbutin", keywords: ["arbutin"] },
  kojic: { slug: "kojic-acid", label: "kojic acid", keywords: ["kojic"] },
  tranexamic: { slug: "tranexamic-acid", label: "tranexamic acid", keywords: ["tranexamic"] },
  glutathione: { slug: "glutathione", label: "glutathione", keywords: ["glutathione"] },
};

const CONCERN_SIGNALS: Record<Concern, Signal> = {
  acne: {
    label: "acne & breakouts",
    categories: ["acne-breakouts", "blemishes"],
    ingredients: [ING.salicylic, ING.bha, ING.benzoyl, ING.azelaic, ING.niacinamide],
    keywords: ["acne", "blemish", "breakout", "tea tree", "pimple", "clarifying"],
  },
  pore: {
    label: "visible pores",
    categories: ["blocked-pores-dead-skin", "oily-skin"],
    ingredients: [ING.bha, ING.salicylic, ING.niacinamide],
    keywords: ["pore", "blackhead", "sebum", "oil control", "mattif"],
  },
  texture: {
    label: "uneven texture",
    categories: ["textured-skin", "scrubs-exfoliants", "blocked-pores-dead-skin"],
    ingredients: [ING.aha, ING.glycolic, ING.lactic, ING.pha, ING.mandelic],
    keywords: ["exfoliat", "resurfac", "smooth", "peel", "texture"],
  },
  wrinkle: {
    label: "fine lines",
    categories: ["anti-aging"],
    ingredients: [ING.retinol, ING.peptide, ING.collagen, ING.vitaminC, ING.hyaluronic],
    keywords: ["wrinkle", "fine line", "firm", "anti-aging", "anti aging", "elasticity"],
  },
  pigmentation: {
    label: "dark spots & uneven tone",
    categories: ["dark-spots-uneven-skin-tone-hyperpigmentation", "brightening", "dull-skin"],
    ingredients: [ING.arbutin, ING.kojic, ING.tranexamic, ING.vitaminC, ING.glutathione, ING.niacinamide, ING.azelaic],
    keywords: ["dark spot", "hyperpigment", "brighten", "even tone", "discolo"],
  },
};

const SKIN_TYPE_SIGNALS: Record<SkinProfile["skinType"], { label: string; categories: string[]; ingredients: typeof ING[keyof typeof ING][] }> = {
  dry: { label: "dry skin", categories: ["dry-skin", "hydration"], ingredients: [ING.ceramide, ING.hyaluronic] },
  oily: { label: "oily skin", categories: ["oily-skin"], ingredients: [ING.niacinamide] },
  combination: { label: "combination skin", categories: ["normal-combination-skin"], ingredients: [] },
  normal: { label: "normal skin", categories: ["normal-combination-skin"], ingredients: [] },
  not_sure: { label: "all skin types", categories: [], ingredients: [] },
};

const SENSITIVE_CATEGORIES = ["sensitive-skin", "skin-barrier-repair"];

// What the product name says it is. Stores cross-list freely (a gel moisturiser under
// "Treatment"), but a cleanser should never fill the serum slot.
const NAME_STEP_PATTERNS: [Step, RegExp][] = [
  ["sunscreen", /\b(spf|sfp|sunscreen|suncreen|sun ?stick|sun ?cream|sunshield|uv)\b/],
  ["cleanser", /\b(cleanser|face ?wash|wash|cleansing|foam|soap)\b/],
  ["toner", /\b(toner|mist|essence|pads?)\b/],
  ["serum", /\b(serum|ampoule|drops?)\b/],
  ["moisturizer", /\b(moisturi[sz]er|moisturi[sz]ing cream|cream|lotion|gel cream)\b/],
  ["treatment", /\b(patch(es)?|mask|spot|scrub|peel|exfoliant|treatment)\b/],
];

// Bar soaps outside the face-wash category are almost always body or "lightening" soaps.
const SOAP_NAME = /\bsoap\b/;

function nameSteps(lowerName: string): Step[] {
  return NAME_STEP_PATTERNS.filter(([, re]) => re.test(lowerName)).map(([step]) => step);
}

// Exfoliating acids and retinoids: stacking more than one leave-on product with these
// is the most common way people irritate their skin barrier.
const STRONG_ACTIVES = [ING.salicylic, ING.bha, ING.benzoyl, ING.aha, ING.glycolic, ING.lactic, ING.pha, ING.mandelic, ING.retinol];

const LEAVE_ON_STEPS: Step[] = ["toner", "serum", "treatment", "moisturizer"];

const decodeEntities = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

// Descriptions often say things like "avoid using with retinols" or "fragrance-free".
// Only sentences that describe what the product contains should count as a claim.
const NEGATED_SENTENCE = /\b(avoid|do not|don't|never|not (be )?(use|used|combine|mix)|instead of|free (of|from)|without|-free)\b/;

function claimsText(descriptionHtml: string) {
  const text = decodeEntities(
    descriptionHtml.replace(/<\/(p|li|h\d)>|<br\s*\/?>/gi, " | ").replace(/<[^>]*>/g, " ")
  ).toLowerCase();
  return text
    .split(/\s\|\s|[.;!?]\s|\s-(?=\S)/)
    .filter((sentence) => !NEGATED_SENTENCE.test(sentence))
    .join(" ")
    .replace(/\s+/g, " ");
}

// "Hydrocolloid Patches – Peaches" and "– Feeling Lucky" are the same product for our purposes.
const familyKey = (p: { brand: string; name: string }) =>
  `${p.brand}|${p.name.split(/\s[–-]\s/)[0].trim().toLowerCase()}`;

const toNaira = (minor: string, unit: number) => Math.round(Number(minor || 0) / 10 ** unit);

export const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

const keywordPatterns = new Map<string, RegExp>();

// Word-start match, and whole-word for short acronyms ("pha" must not match "alpha").
function textHas(text: string, keyword: string) {
  let re = keywordPatterns.get(keyword);
  if (!re) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`\\b${escaped}${keyword.length <= 4 ? "\\b" : ""}`);
    keywordPatterns.set(keyword, re);
  }
  return re.test(text);
}

function hasIngredient(item: CatalogItem, ing: { slug: string; keywords: string[] }) {
  return item.categories.has(ing.slug) || ing.keywords.some((k) => textHas(item.text, k));
}

function variantLabel(variation: string) {
  // "Brand: Anua, Size: 150ml" -> "150ml"
  const parts = decodeEntities(variation)
    .split(",")
    .map((p) => p.trim())
    .filter((p) => !/^brand:/i.test(p))
    .map((p) => p.replace(/^[^:]+:\s*/, ""));
  return parts.join(" / ") || "Default";
}

export function buildCatalog(products: StoreApiProduct[], variations: StoreApiProduct[]): CatalogItem[] {
  const variationsByParent = new Map<number, StoreApiProduct[]>();
  for (const v of variations) {
    if (!v.is_in_stock || !v.is_purchasable) continue;
    const list = variationsByParent.get(v.parent) ?? [];
    list.push(v);
    variationsByParent.set(v.parent, list);
  }

  const items: CatalogItem[] = [];
  for (const p of products) {
    if (!p.is_in_stock || !p.is_purchasable) continue;
    if (p.type !== "simple" && p.type !== "variable") continue;

    const categories = new Set(p.categories.map((c) => c.slug));
    const name = decodeEntities(p.name);
    const brand = decodeEntities(
      p.attributes.find((a) => a.taxonomy === "pa_brand")?.terms[0]?.name ?? name.split(" ")[0]
    );
    // Judge the product by its name minus the brand ("Face Facts Body Lotion" is not a face product).
    const lowerName = name.toLowerCase();
    const productName = lowerName.replace(brand.toLowerCase(), " ");
    const isFace = FACE_NAME.test(productName);

    if (NON_FACE_CATEGORIES.some((c) => categories.has(c)) && !isFace) continue;
    if (NON_FACE_NAME.test(productName) && !isFace) continue;
    if (LIGHTENING_NAME.test(productName)) continue;

    const categorySteps = STEP_ORDER.filter((s) => STEP_CATEGORIES[s].some((c) => categories.has(c)));
    const named = nameSteps(productName);
    if (/\bspf\s?\d+/.test(productName) && !named.includes("sunscreen")) named.unshift("sunscreen");

    // When name and category agree, use that. When they disagree, or the store didn't give a
    // product type, trust the name: a "cream" filed under Serum is a moisturiser. Treatments are
    // only taken from categories, since "scrub"/"mask" names are often body products.
    // The store's Sunscreens category is reliable (names have typos like "SFP 50+ Suncreen Lotion").
    if (categorySteps.includes("sunscreen") && !named.includes("sunscreen")) named.unshift("sunscreen");
    let steps = categorySteps.filter((s) => named.includes(s));
    if (steps.length === 0) {
      steps = named.length
        ? named.filter((s) => s !== "treatment" && !(s === "cleanser" && SOAP_NAME.test(productName)))
        : categorySteps;
      if (named.includes("treatment") && categorySteps.includes("treatment")) steps.push("treatment");
    }
    if (steps.length === 0) continue;

    let variants: ProductVariant[];
    if (p.type === "variable") {
      variants = (variationsByParent.get(p.id) ?? [])
        .map((v) => ({
          id: v.id,
          label: variantLabel(v.variation),
          price: toNaira(v.prices.price, v.prices.currency_minor_unit),
          regularPrice: toNaira(v.prices.regular_price, v.prices.currency_minor_unit),
        }))
        .sort((a, b) => a.price - b.price);
      if (variants.length === 0) continue;
    } else {
      variants = [
        {
          id: p.id,
          label: "",
          price: toNaira(p.prices.price, p.prices.currency_minor_unit),
          regularPrice: toNaira(p.prices.regular_price, p.prices.currency_minor_unit),
        },
      ];
    }
    if (variants[0].price <= 0) continue;

    items.push({
      base: {
        id: p.id,
        name,
        permalink: p.permalink,
        on_sale: p.on_sale,
        average_rating: p.average_rating,
        review_count: p.review_count,
        images: p.images.slice(0, 1).map((i) => ({ src: i.src })),
      },
      variants,
      steps,
      namedSteps: named,
      categories,
      text: ` ${lowerName} ${claimsText(p.short_description)} ${claimsText(p.description)} `,
      brand,
      whitening: WHITENING_NAME.test(productName),
    });
  }
  return items;
}

export type SerializedCatalogItem = Omit<CatalogItem, "categories"> & { categories: string[] };

export const serializeCatalog = (items: CatalogItem[]): SerializedCatalogItem[] =>
  items.map((i) => ({ ...i, categories: [...i.categories] }));

export const hydrateCatalog = (items: SerializedCatalogItem[]): CatalogItem[] =>
  items.map((i) => ({ ...i, categories: new Set(i.categories) }));

function concernWeights(profile: SkinProfile): { weights: Record<Concern, number>; top: Concern } {
  const concerns = Object.keys(CONCERN_SIGNALS) as Concern[];
  const top = concerns.reduce((a, b) => ((profile.scores[a] ?? 0) >= (profile.scores[b] ?? 0) ? a : b));
  const weights = {} as Record<Concern, number>;
  for (const c of concerns) {
    const s = (profile.scores[c] ?? 0) / 100;
    // Concerns below ~20 are effectively "fine"; don't let them steer product choice.
    weights[c] = s < 0.2 ? 0 : c === top ? s * 1.6 : s;
  }
  return { weights, top };
}

type ScoringContext = {
  medianPrice: number; // for this step, so "value" is judged against like-for-like products
  heroIngredients: Set<string>; // hero ingredients already chosen for other leave-on steps
  top: Concern;
};

// The ingredient a product leads with for a concern, e.g. "niacinamide".
const heroIngredient = (reasons: { text: string; weight: number }[]) =>
  [...reasons].sort((a, b) => b.weight - a.weight)[0]?.text.match(/ with (.+)$/)?.[1];

function scoreItem(
  item: CatalogItem,
  step: Step,
  profile: SkinProfile,
  weights: Record<Concern, number>,
  ctx: ScoringContext
): { score: number; reasons: { text: string; weight: number }[]; strongActive: boolean } {
  let score = 0;
  const reasons: { text: string; weight: number }[] = [];
  const isSunscreen = step === "sunscreen";

  // Concern fit. Sunscreen is chosen mainly on skin type and comfort, not actives.
  const concernFactor = isSunscreen ? 0.3 : 1;
  for (const concern of Object.keys(CONCERN_SIGNALS) as Concern[]) {
    const w = weights[concern] * concernFactor;
    if (w === 0) continue;
    const signal = CONCERN_SIGNALS[concern];
    const catHit = signal.categories.some((c) => item.categories.has(c));
    // Lead with the ingredient the product is named after ("Azelaic Acid Serum" → azelaic acid).
    const lowerName = item.base.name.toLowerCase();
    const ingHits = signal.ingredients
      .filter((i) => hasIngredient(item, i))
      .sort((a, b) => Number(b.keywords.some((k) => lowerName.includes(k))) - Number(a.keywords.some((k) => lowerName.includes(k))));
    const kwHit = signal.keywords.some((k) => textHas(item.text, k));

    const pts = (catHit ? 2 : 0) + Math.min(ingHits.length, 2) * 1.5 + (kwHit ? 0.5 : 0);
    score += w * pts;
    if (catHit || ingHits.length) {
      reasons.push({
        text: ingHits.length
          ? `Targets ${signal.label} with ${ingHits[0].label}`
          : `Targets ${signal.label}`,
        weight: w * pts,
      });
    }
  }

  // Skin type fit.
  const typeSignal = SKIN_TYPE_SIGNALS[profile.skinType];
  const typeHit =
    typeSignal.categories.some((c) => item.categories.has(c)) ||
    typeSignal.ingredients.some((i) => hasIngredient(item, i));
  if (typeHit) {
    score += isSunscreen ? 2.5 : 1.5;
    reasons.push({ text: `Suits ${typeSignal.label}`, weight: 1.5 });
  }
  if (profile.skinType === "dry" && item.categories.has("oily-skin") && !item.categories.has("dry-skin")) score -= 1;
  if (profile.skinType === "oily" && item.categories.has("dry-skin") && !item.categories.has("oily-skin")) score -= 1;

  // Sensitivity. Hydrocolloid patches carry a trace of salicylic acid but sit on one spot,
  // so they don't count towards the one-strong-active limit.
  const isPatch = /\bpatch(es)?\b/.test(item.base.name.toLowerCase());
  const strongActive = !isPatch && STRONG_ACTIVES.some((i) => hasIngredient(item, i));
  const sensitiveFriendly = SENSITIVE_CATEGORIES.some((c) => item.categories.has(c));
  if (sensitiveFriendly) {
    const bonus = profile.sensitivity === "high" ? 2.5 : profile.sensitivity === "medium" ? 0.75 : 0.25;
    score += bonus;
    reasons.push({ text: "Gentle on sensitive skin", weight: bonus });
  }
  if (strongActive && LEAVE_ON_STEPS.includes(step)) {
    // Retinoids are the best-evidenced fix for fine lines, so for mature, sensitive skin we
    // still allow a gentle one rather than ruling it out.
    const neededRetinoid =
      ctx.top === "wrinkle" && (profile.scores.wrinkle ?? 0) >= 60 && hasIngredient(item, ING.retinol);
    const penalty = profile.sensitivity === "high" ? 2 : profile.sensitivity === "medium" ? 0.4 : 0;
    score -= neededRetinoid ? penalty / 4 : penalty;
    if (neededRetinoid) {
      score += /\bgentle\b/.test(item.base.name.toLowerCase()) ? 3.5 : 2.5;
      reasons.push({ text: "Gold-standard ingredient for fine lines", weight: 3 });
    }
  }
  // Exfoliating cleansers strip dry or sensitive skin.
  if (strongActive && step === "cleanser") {
    if (profile.sensitivity === "high") score -= 1.5;
    if (profile.skinType === "dry") score -= 0.75;
  }

  // Don't build a routine of two niacinamide serums: favour a different hero ingredient.
  const hero = heroIngredient(reasons);
  if (hero && LEAVE_ON_STEPS.includes(step) && ctx.heroIngredients.has(hero)) score -= 1;
  // The treatment slot is for spot treatments, exfoliants and masks, not a second serum.
  if (step === "treatment" && item.steps.includes("serum")) score -= 1;

  // Value: a cleanser at 4× the typical price has to be much better to win.
  const price = item.variants[0].price;
  if (ctx.medianPrice > 0 && price > ctx.medianPrice) score -= 0.6 * Math.log2(price / ctx.medianPrice);

  // Step fidelity: products whose *primary* category is this step rank above cross-listed ones.
  if (item.steps[0] === step) score += 0.75;
  // Named as something else entirely (e.g. a "cream" filed under Treatment).
  if (item.namedSteps.length && !item.namedSteps.includes(step) && !(step === "treatment" && item.namedSteps.includes("serum"))) score -= 2;

  // Social proof, when the store has it.
  const rating = Number(item.base.average_rating) || 0;
  if (item.base.review_count > 0) {
    score += (rating / 5) * Math.min(item.base.review_count, 20) / 20;
    if (rating >= 4.5 && item.base.review_count >= 3)
      reasons.push({ text: `Rated ${rating.toFixed(1)}★ by shoppers`, weight: 0.5 });
  }
  if (item.base.on_sale) score += 0.2;

  return { score, reasons, strongActive };
}

function toRecommended(
  item: CatalogItem,
  step: Step,
  scored: ReturnType<typeof scoreItem>
): RecommendedProduct {
  const v = item.variants[0];
  // Name each ingredient once: "Targets pores with niacinamide", then just "Targets dark spots".
  const mentioned = new Set<string>();
  const reasons = scored.reasons
    .sort((a, b) => b.weight - a.weight)
    .map((r) => {
      const ingredient = r.text.match(/ with (.+)$/)?.[1];
      if (!ingredient) return r.text;
      if (mentioned.has(ingredient)) return r.text.replace(/ with .+$/, "");
      mentioned.add(ingredient);
      return r.text;
    })
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 3);
  return {
    id: item.base.id,
    name: item.base.name,
    brand: item.brand,
    image: item.base.images[0]?.src ?? "",
    link: item.base.permalink,
    step,
    price: v.price,
    regularPrice: v.regularPrice,
    onSale: v.price < v.regularPrice,
    price_html: formatNaira(v.price),
    rating: Number(item.base.average_rating) || 0,
    reviewCount: item.base.review_count,
    variants: item.variants,
    reasons: reasons.length ? reasons : [`A well-loved ${step} for daily use`],
    strongActive: scored.strongActive,
    expertRecommendation: reasons[0],
  };
}

function routineLevelFor(scores: number[]): RoutineResult["routineLevel"] {
  if (scores.length === 0) return "beginner";
  const max = Math.max(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (max >= 80 && avg >= 50) return "intensive";
  if (max >= 70 || avg >= 45) return "advanced";
  if (max >= 50 || avg >= 30) return "intermediate";
  return "beginner";
}

const ROUTINE_COPY: Record<RoutineResult["routineLevel"], { name: string; description: string }> = {
  beginner: {
    name: "Gentle Glow Routine",
    description: "Your skin is in good shape. This routine protects your barrier, keeps you hydrated and prevents future concerns.",
  },
  intermediate: {
    name: "Balanced Treatment Routine",
    description: "A balanced routine that treats your main concern while keeping your skin calm and hydrated.",
  },
  advanced: {
    name: "Targeted Active Routine",
    description: "A focused routine built around one proven active for your top concern, supported by barrier-friendly basics.",
  },
  intensive: {
    name: "Intensive Clear-Skin Routine",
    description: "Maximum-impact treatment for your most visible concerns, with soothing, hydrating support so your skin can tolerate it.",
  },
};

// Hard safety rules: these products are never shown, whatever they score.
function isSafeFor(item: CatalogItem, step: Step, profile: SkinProfile, weights: Record<Concern, number>): boolean {
  const leaveOn = step !== "cleanser";
  const has = (ing: { slug: string; keywords: string[] }) => hasIngredient(item, ing);

  // Retinoids: not for under-18s, and avoided in pregnancy / breastfeeding.
  if ((profile.ageRange === "under_18" || profile.pregnant) && has(ING.retinol)) return false;
  // Pregnancy: no leave-on salicylic acid / BHA or benzoyl peroxide. Wash-off cleansers are fine.
  if (profile.pregnant && leaveOn && (has(ING.salicylic) || has(ING.bha) || has(ING.benzoyl))) return false;
  // "Whitening" products only when dark spots are a real concern for this person.
  if (item.whitening && (profile.scores.pigmentation ?? 0) < 60 && weights.pigmentation < 0.7) return false;
  // Maximum-strength benzoyl peroxide only for severe acne on non-sensitive skin.
  const maxStrength = has(ING.benzoyl) && /\b10\s?%/.test(item.base.name);
  if (maxStrength && (profile.sensitivity !== "low" || (profile.scores.acne ?? 0) < 70)) return false;
  return true;
}

function adviceFor(profile: SkinProfile): string[] {
  const advice: string[] = [];
  if ((profile.scores.acne ?? 0) >= 80)
    advice.push("Severe or painful acne often needs prescription treatment. Use this routine alongside a visit to a dermatologist.");
  if (profile.pregnant)
    advice.push("Pregnancy-safe picks: we've left out retinoids, benzoyl peroxide and leave-on salicylic acid. Check any new product with your doctor.");
  if (profile.ageRange === "under_18")
    advice.push("Young skin needs less: start with cleanser, moisturiser and sunscreen, then add one treatment if needed.");
  if (profile.sensitivity === "high")
    advice.push("Patch-test each product on your jawline for 2–3 days before using it on your whole face.");
  advice.push("Sunscreen every morning is the single biggest step for dark spots, fine lines and post-acne marks.");
  return advice;
}

export function recommendRoutine(catalog: CatalogItem[], profile: SkinProfile): RoutineResult {
  const { weights, top } = concernWeights(profile);
  const measured = (Object.keys(CONCERN_SIGNALS) as Concern[]).filter((c) => profile.scores[c] != null);
  const routineLevel = routineLevelFor(measured.map((c) => profile.scores[c] ?? 0));

  // How many leave-on strong actives we allow in the routine.
  const topScore = profile.scores[top] ?? 0;
  const activeBudget = profile.sensitivity === "high" ? (topScore >= 60 ? 1 : 0) : 1;

  // Choose the steps that carry actives first so they get the pick of the catalog.
  const selectionOrder: Step[] = ["treatment", "serum", "toner", "cleanser", "moisturizer", "sunscreen"];
  const picked = new Map<Step, RecommendedProduct>();
  const alternatives: Partial<Record<Step, RecommendedProduct[]>> = {};
  const usedIds = new Set<number>();
  let activesUsed = 0;
  const heroIngredients = new Set<string>();

  for (const step of selectionOrder) {
    const pool = catalog.filter(
      (item) => item.steps.includes(step) && !usedIds.has(item.base.id) && isSafeFor(item, step, profile, weights)
    );
    const prices = pool.map((item) => item.variants[0].price).sort((a, b) => a - b);
    const ctx: ScoringContext = { medianPrice: prices[Math.floor(prices.length / 2)] ?? 0, heroIngredients, top };
    const candidates = pool
      .map((item) => ({ item, scored: scoreItem(item, step, profile, weights, ctx) }))
      .filter(({ scored }) => {
        if (!scored.strongActive || !LEAVE_ON_STEPS.includes(step)) return true;
        return activesUsed < activeBudget;
      })
      .sort((a, b) => b.scored.score - a.scored.score || a.item.variants[0].price - b.item.variants[0].price);

    if (candidates.length === 0) continue;
    const [best, ...rest] = candidates;
    const rec = toRecommended(best.item, step, best.scored);
    picked.set(step, rec);
    usedIds.add(rec.id);
    if (rec.strongActive && LEAVE_ON_STEPS.includes(step)) activesUsed++;
    const hero = heroIngredient(best.scored.reasons);
    if (hero && LEAVE_ON_STEPS.includes(step)) heroIngredients.add(hero);

    // Alternatives: next best, plus the cheapest decent option so there's always a budget pick.
    const seenFamilies = new Set([familyKey({ brand: best.item.brand, name: best.item.base.name })]);
    const distinct = rest.filter((c) => {
      const key = familyKey({ brand: c.item.brand, name: c.item.base.name });
      if (seenFamilies.has(key)) return false;
      seenFamilies.add(key);
      return true;
    });
    const alts = distinct.slice(0, 2);
    const budget = distinct
      .slice(2, 12)
      .filter((c) => c.item.variants[0].price < rec.price)
      .sort((a, b) => a.item.variants[0].price - b.item.variants[0].price)[0];
    if (budget) alts.push(budget);
    alternatives[step] = alts.map((c) => toRecommended(c.item, step, c.scored));
  }

  const products = STEP_ORDER.map((s) => picked.get(s)).filter((p): p is RecommendedProduct => !!p);
  for (const step of Object.keys(alternatives) as Step[]) {
    alternatives[step] = alternatives[step]!.filter((a) => !usedIds.has(a.id));
  }

  // Minimum effective routine: cleanse, moisturise, protect, plus the strongest-fit treatment for the top concern.
  const essentialSteps: Step[] = ["cleanser", "moisturizer", "sunscreen"];
  const actionStep = (["treatment", "serum"] as Step[]).find((s) => picked.get(s)?.reasons.some((r) => r.includes(CONCERN_SIGNALS[top].label)));
  if (actionStep) essentialSteps.push(actionStep);
  const essentials = products.filter((p) => essentialSteps.includes(p.step)).map((p) => p.id);

  const total = products.reduce((sum, p) => sum + p.price, 0);
  const concernsAddressed = (Object.keys(weights) as Concern[]).filter((c) => weights[c] > 0);
  const copy = ROUTINE_COPY[routineLevel];

  return {
    routineLevel,
    topConcern: top,
    routine: {
      name: copy.name,
      description: copy.description,
      targets: concernsAddressed.map((c) => CONCERN_SIGNALS[c].label),
      products,
    },
    alternatives,
    essentials,
    totalCost: formatNaira(total),
    concernsAddressed,
    advice: adviceFor(profile),
  };
}

export const concernLabel = (c: Concern) => CONCERN_SIGNALS[c].label;
