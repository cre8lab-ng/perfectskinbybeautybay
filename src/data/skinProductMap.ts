import { getGranularLevel } from "@/util/utils";

interface ScoreEntry {
  ui_score?: number;
  raw_score?: number;
}

interface ScoreInfo {
  wrinkle?: ScoreEntry;
  pore?: ScoreEntry;
  texture?: ScoreEntry;
  acne?: ScoreEntry;
  all?: { score?: number };
}

export interface Product {
  id: number;
  name: string;
  price_html: string;
  brand: string;
  image: string;
  link: string;
  step: "cleanser" | "toner" | "moisturizer" | "sunscreen" | "serum";
}

export interface RoutineLevel {
  name: string;
  description: string;
  targets: string[];
  products: Product[];
}

export const skinCareRoutines: {
  [level in
    | "beginner"
    | "intermediate"
    | "advanced"
    | "intensive"]?: RoutineLevel;
} = {
  beginner: {
    name: "Gentle Multi-Concern Routine",
    description:
      "A gentle routine designed for beginners or those with generally healthy skin. Targets mild acne, early signs of aging, and basic texture concerns.",
    targets: ["mild acne", "prevention", "hydration", "basic texture"],
    products: [
      {
        id: 101,
        name: "Foaming Facial Cleanser",
        price_html: "₦16,600",
        brand: "CeraVe",
        image: "/images/products/cerave-foaming-cleanser.png",
        link: "https://beautyhub.ng/product/cerave-foaming-facial-cleanser/",
        step: "cleanser",
      },
      {
        id: 141,
        name: "Aha/Bha Clarifying Treatment Toner",
        price_html: "₦13,500",
        brand: "Cosrx",
        image: "/images/products/cosrx-ahabha-toner.png",
        link: "https://beautyhub.ng/product/cosrx-aha-bha-clarifying-treatment-toner/",
        step: "toner",
      },
      {
        id: 1356200941,
        name: "Glow Serum : Propolis + Niacinamide",
        price_html: "₦18,500",
        brand: "Beauty Of Joseon",
        image: "/images/products/beautyofjoseonniacinamide.png",
        link: "https://beautyhub.ng/product/beauty-of-joseon-glow-serum-propolis-niacinamide/",
        step: "serum",
      },
      {
        id: 968896,
        name: "Advanced Snail 92 All in one Cream",
        price_html: "₦16,500",
        brand: "Cosrx",
        image: "/images/products/cosrx-allinonecream.png",
        link: "https://beautyhub.ng/product/cosrx-advanced-snail-92-all-in-one-cream/",
        step: "moisturizer",
      },
      {
        id: 103,
        name: "Super Moisture Gel SPF50+ PA++++",
        price_html: "₦11,500",
        brand: "Rohto Skin Aqua",
        image: "/images/products/skinaqua.png",
        link: "https://beautyhub.ng/product/rohto-skin-aqua-super-moisture-gel-spf50-pa/",
        step: "sunscreen",
      },
    ],
  },

  intermediate: {
    name: "Balanced Treatment Routine",
    description:
      "A balanced routine for users with moderate concerns. Combines acne-fighting ingredients, anti-aging support, and pore-minimizing treatments.",
    targets: [
      "moderate acne",
      "fine lines",
      "texture improvement",
      "pore appearance",
    ],
    products: [
      {
        id: 104,
        name: "Salicylic Acid Daily Gentle Cleanser",
        price_html: "₦11,600",
        brand: "Cosrx",
        image: "/images/products/cosrxsalicyliccleanser.png",
        link: "https://beautyhub.ng/product/cosrx-salicylic-acid-daily-gentle-cleanser/",
        step: "cleanser",
      },
      {
        id: 567868,
        name: "Licorice pH Balancing Cleansing Toner",
        price_html: "₦12,500",
        brand: "Acwell",
        image: "/images/products/acwelltoner.png",
        link: "https://beautyhub.ng/product/acwell-licorice-ph-balancing-cleansing-toner/",
        step: "toner",
      },
      {
        id: 98598945665,
        name: "Galactomyces Pure Vitamin C Glow Serum",
        price_html: "₦15,000",
        brand: "Some By Mi",
        image: "/images/products/somebymisogalactomyes.png",
        link: "https://beautyhub.ng/product/some-by-mi-galactomyces-pure-vitamin-c-glow-serum-30ml/",
        step: "serum",
      },
      {
        id: 1890234,
        name: "Moisturising Lotion",
        price_html: "₦19,500",
        brand: "CaraVe",
        image: "/images/products/ceravemoisturisinglotion.png",
        link: "https://beautyhub.ng/product/cerave-daily-moisturizing-lotion/",
        step: "moisturizer",
      },
      {
        id: 9058858,
        name: "Relief Sun : Rice + Probiotics",
        price_html: "₦19,200",
        brand: "Beauty Of Joseon",
        image: "/images/products/beautyofjoseonsunscreen.png",
        link: "https://beautyhub.ng/product/beauty-of-josen-relief-sun-rice-probiotics/",
        step: "sunscreen",
      },
    ],
  },

  advanced: {
    name: "Active Treatment Routine",
    description:
      "An active routine for those with multiple significant concerns. Includes stronger actives to treat persistent acne, visible signs of aging, rough texture, and enlarged pores.",
    targets: ["persistent acne", "wrinkles", "rough texture", "enlarged pores"],
    products: [
      {
        id: 5665747,
        name: "Skin Clarifying Cleanser",
        price_html: "₦20,000",
        brand: "Bolden",
        image: "/images/products/boldencleanser.png",
        link: "https://beautyhub.ng/product/bolden-skin-clarifying-cleanser/",
        step: "cleanser",
      },
      {
        id: 3545665,
        name: "AHA BHA PHA 30 days Miracle Toner",
        price_html: "₦16,000",
        brand: "Some By Mi",
        image: "/images/products/somebymisotoner.png",
        link: "https://beautyhub.ng/product/some-by-mi-aha-bha-pha-30-days-miracle-toner/",
        step: "toner",
      },
      {
        id: 5609712453868,
        name: "Vitamin C Serum Anti-Aging",
        price_html: "₦15,000",
        brand: "Advanced Clinicals",
        image: "/images/products/advancedclinicalsvitc.png",
        link: "https://beautyhub.ng/product/advanced-clinicals-vitamin-c-face-serum/",
        step: "serum",
      },
      {
        id: 12377758,
        name: "Cica+ Soothing Cream",
        price_html: "₦16,800",
        brand: "TOPICREM",
        image: "/images/products/topicremcicasoothing.png",
        link: "https://beautyhub.ng/product/topicrem-cica-soothing-cream/",
        step: "moisturizer",
      },
      {
        id: 118,
        name: "Anthelios UVMune 400 Invisible Fluid Spf50+",
        price_html: "₦9,000",
        brand: "La Roche Posay",
        image: "/images/products/larocheinvisble.png",
        link: "https://beautyhub.ng/product/la-roche-posay-anthelios-uvmune-400-invisible-fluid-spf50/",
        step: "sunscreen",
      },
    ],
  },

  intensive: {
    name: "Maximum Strength Routine",
    description:
      "A maximum-strength routine for severe, stubborn skin concerns. Formulated with the most potent actives to deliver deep treatment and visible transformation.",
    targets: [
      "severe acne",
      "deep wrinkles",
      "significant texture issues",
      "stubborn pores",
    ],
    products: [
      {
        id: 109,
        name: "Acne Creamy Wash 4% Benzoyl Peroxide",
        price_html: "₦17,800",
        brand: "Panoxyl",
        image: "/images/products/panoxyl4.png",
        link: "https://beautyhub.ng/product/panoxyl-acne-acne-creamy-wash-4-benzoyl-peroxide/",
        step: "cleanser",
      },
      {
        id: 24545665,
        name: "Ceramide Mochi Toner",
        price_html: "₦15,000",
        brand: "TonyMoly",
        image: "/images/products/tonymolytoner.png",
        link: "https://beautyhub.ng/product/tonymoly-ceramide-mochi-toner/",
        step: "toner",
      },
      {
        id: 200000665,
        name: "Alpha Arbutin 2% + HA",
        price_html: "₦27,200",
        brand: "The Ordinary",
        image: "/images/products/theordinaryalphaarbution.png",
        link: "https://beautyhub.ng/product/the-ordinary-alpha-arbutin-2-ha/",
        step: "serum",
      },
      {
        id: 185995,
        name: "Ceramide Ato Concentrate Cream",
        price_html: "₦17,500",
        brand: "Illiyoon",
        image: "/images/products/illiyionnconcemoisturizer.png",
        link: "https://beautyhub.ng/product/illiyoon-ceramide-ato-concentrate-cream/",
        step: "moisturizer",
      },
      {
        id: 1029944,
        name: "Anthelios UVMune 400 Invisible Fluid Spf50+",
        price_html: "₦9,000",
        brand: "La Roche Posay",
        image: "/images/products/larocheinvisble.png",
        link: "https://beautyhub.ng/product/la-roche-posay-anthelios-uvmune-400-invisible-fluid-spf50/",
        step: "sunscreen",
      },
    ],
  },
};

// Helper function to get routine based on combined concern levels
export function getRecommendedRoutine(concernLevels: {
  acne?: "very_low" | "low" | "moderate" | "high" | "very_high";
  wrinkle?: "very_low" | "low" | "moderate" | "high" | "very_high";
  texture?: "very_low" | "low" | "moderate" | "high" | "very_high";
  pore?: "very_low" | "low" | "moderate" | "high" | "very_high";
}): keyof typeof skinCareRoutines {
  const levels = Object.values(concernLevels).filter(Boolean);

  if (levels.length === 0) return "beginner";

  const maxConcernLevel = levels.reduce((max, current) => {
    const levelOrder = {
      very_low: 1,
      low: 2,
      moderate: 3,
      high: 4,
      very_high: 5,
    };
    return levelOrder[current] > levelOrder[max] ? current : max;
  });

  const averageConcernLevel =
    levels.reduce((sum, current) => {
      const levelOrder = {
        very_low: 1,
        low: 2,
        moderate: 3,
        high: 4,
        very_high: 5,
      };
      return sum + levelOrder[current];
    }, 0) / levels.length;

  if (maxConcernLevel === "very_high" && averageConcernLevel >= 3) {
    return "intensive";
  } else if (maxConcernLevel === "very_high" || averageConcernLevel >= 2.5) {
    return "advanced";
  } else if (maxConcernLevel === "high" || averageConcernLevel >= 2) {
    return "intermediate";
  } else {
    return "beginner";
  }
}

// Updated function to work with your existing ScoreInfo type
export function getRecommendedProducts(scoreInfo: ScoreInfo | null): {
  routineLevel: string;
  routine: RoutineLevel;
  totalCost: string;
  concernsAddressed: string[];
} | null {
  if (!scoreInfo) return null;

  const concerns = ["acne", "wrinkle", "texture", "pore"] as const;

  // Convert UI scores to concern levels
  const concernLevels: {
    acne?: "very_low" | "low" | "moderate" | "high" | "very_high";
    wrinkle?: "very_low" | "low" | "moderate" | "high" | "very_high";
    texture?: "very_low" | "low" | "moderate" | "high" | "very_high";
    pore?: "very_low" | "low" | "moderate" | "high" | "very_high";
  } = {};

  concerns.forEach((concern) => {
    const uiScore = scoreInfo?.[concern]?.ui_score;
    if (uiScore) {
      const level = getGranularLevel(`${uiScore}%`);
      concernLevels[concern] = level;
    }
  });

  // Get the recommended routine
  const routineLevel = getRecommendedRoutine(concernLevels);
  const routine = skinCareRoutines[routineLevel];

  if (!routine) return null;

  // Calculate total cost
  const totalCost = routine.products.reduce((sum, product) => {
    const price = parseInt(product.price_html.replace(/[₦,]/g, ""));
    return sum + price;
  }, 0);

  // Get concerns that are being addressed
  const concernsAddressed = Object.keys(concernLevels).filter(
    (concern) => concernLevels[concern as keyof typeof concernLevels]
  );

  return {
    routineLevel,
    routine,
    totalCost: `₦${totalCost.toLocaleString()}`,
    concernsAddressed,
  };
}

// Alternative function if you want to keep the original format but with routine data
export function getRecommendedProductsLegacy(scoreInfo: ScoreInfo | null): {
  concern: string;
  level: string;
  products: Product[];
}[] {
  const result = getRecommendedProducts(scoreInfo);
  if (!result) return [];

  // Return in the original format for backward compatibility
  return result.concernsAddressed.map((concern) => ({
    concern,
    level: result.routineLevel,
    products: result.routine.products,
  }));
}
