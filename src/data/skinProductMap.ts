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
  step: "cleanser" | "toner" | "moisturizer" | "sunscreen" | "serum" | "treatment";
  proof?: string;
  expertRecommendation?: string;
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
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753342063/foamingcleansercerave_tfyjce.png",
        link: "https://beautybayafrica.com/product/cerave-foaming-facial-cleanser/",
        step: "cleanser",
        proof: "Clinically proven to remove oil without disrupting the skin barrier.",
        expertRecommendation: "Dermatologist Recommended: Contains 3 essential ceramides for barrier support.",
      },
      {
        id: 141,
        name: "Aha/Bha Clarifying Treatment Toner",
        price_html: "₦13,500",
        brand: "Cosrx",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341722/cosrx-ahabha-toner_r9tfjf.png",
        link: "https://beautybayafrica.com/product/cosrx-aha-bha-clarifying-treatment-toner/",
        step: "toner",
        proof: "Natural AHA/BHA complex helps refine texture by dissolving dead skin cells.",
        expertRecommendation: "Aesthetician's Choice: Gentle enough for daily use while effectively clearing pores.",
      },
      {
        id: 1356200941,
        name: "Glow Serum : Propolis + Niacinamide",
        price_html: "₦18,500",
        brand: "Beauty Of Joseon",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341722/beautyofjoseonniacinamide_zn5czx.png",
        link: "https://beautybayafrica.com/product/beauty-of-joseon-glow-serum-propolis-niacinamide/",
        step: "serum",
        proof: "Propolis extract (60%) is naturally anti-inflammatory and antibacterial.",
        expertRecommendation: "Expert Tip: Niacinamide (2%) helps regulate sebum and brighten skin tone.",
      },
      {
        id: 968896,
        name: "Advanced Snail 92 All in one Cream",
        price_html: "₦16,500",
        brand: "Cosrx",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/cosrx-allinonecream_f4fxcn.png",
        link: "https://beautybayafrica.com/product/cosrx-advanced-snail-92-all-in-one-cream/",
        step: "moisturizer",
        proof: "92% Snail Mucin promotes skin repair and long-lasting hydration.",
        expertRecommendation: "Clinical Note: Excellent for calming irritation and maintaining moisture levels.",
      },
      {
        id: 103,
        name: "Super Moisture Gel SPF50+ PA++++",
        price_html: "₦11,500",
        brand: "Rohto Skin Aqua",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/skinaqua_b8fnel.png",
        link: "https://beautybayafrica.com/product/rohto-skin-aqua-super-moisture-gel-spf50-pa/",
        step: "sunscreen",
        proof: "Highest Japanese PA++++ rating ensures maximum UVA protection.",
        expertRecommendation: "Dermatologist Tip: Broad-spectrum protection is essential for preventing premature aging.",
      },
      {
        id: 156,
        name: "Acne Pimple Master Patch",
        price_html: "₦4,500",
        brand: "Cosrx",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/cosrxpimplepatch_p6juec.png",
        link: "https://beautybayafrica.com/product/cosrx-acne-pimple-master-patch/",
        step: "treatment",
        proof: "Hydrocolloid material is clinically proven to extract impurities and speed up wound healing.",
        expertRecommendation: "Aesthetician Tip: Protects blemishes from bacteria and prevents picking, which reduces scarring.",
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
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/cosrxsalicyliccleanser_qiujsc.png",
        link: "https://beautybayafrica.com/product/cosrx-salicylic-acid-daily-gentle-cleanser/",
        step: "cleanser",
        proof: "0.5% BHA (Salicylic Acid) is clinically proven to penetrate deep into pores and dissolve excess sebum.",
        expertRecommendation: "Dermatologist Note: Perfect for adult acne and clearing congested skin without over-drying.",
      },
      {
        id: 567868,
        name: "Licorice pH Balancing Cleansing Toner",
        price_html: "₦12,500",
        brand: "Acwell",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341722/acwelltoner_wdmx4y.png",
        link: "https://beautybayafrica.com/product/acwell-licorice-ph-balancing-cleansing-toner/",
        step: "toner",
        proof: "Licorice water is a natural skin brightener with anti-inflammatory properties.",
        expertRecommendation: "Aesthetician's Choice: Helps balance skin pH and prep for active serums while reducing redness.",
      },
      {
        id: 98598945665,
        name: "Galactomyces Pure Vitamin C Glow Serum",
        price_html: "₦15,000",
        brand: "Some By Mi",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/somebymisogalactomyes_rvhusd.png",
        link: "https://beautybayafrica.com/product/some-by-mi-galactomyces-pure-vitamin-c-glow-serum-30ml/",
        step: "serum",
        proof: "Galactomyces Ferment Filtrate (75%) improves skin elasticity and texture.",
        expertRecommendation: "Expert Tip: Pure Vitamin C (3%) provides antioxidant protection and brightens post-acne marks.",
      },
      {
        id: 1890234,
        name: "Moisturising Lotion",
        price_html: "₦19,500",
        brand: "CaraVe",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341722/ceravemoisturisinglotion_w6bnrr.png",
        link: "https://beautybayafrica.com/product/cerave-daily-moisturizing-lotion/",
        step: "moisturizer",
        proof: "MVE Delivery Technology provides 24-hour hydration through controlled release of ingredients.",
        expertRecommendation: "Dermatologist Recommended: Essential for maintaining a healthy moisture barrier during acne treatment.",
      },
      {
        id: 9058858,
        name: "Relief Sun : Rice + Probiotics",
        price_html: "₦19,200",
        brand: "Beauty Of Joseon",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341722/beautyofjoseonsunscreen_u3d1f5.png",
        link: "https://beautybayafrica.com/product/beauty-of-josen-relief-sun-rice-probiotics/",
        step: "sunscreen",
        proof: "Rice bran water (30%) is rich in Vitamin E and minerals for skin nourishment.",
        expertRecommendation: "Clinical Note: Excellent lightweight protection that doesn't clog pores or leave a white cast.",
      },
      {
        id: 789,
        name: "BHA Blackhead Power Liquid",
        price_html: "₦14,500",
        brand: "Cosrx",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341722/cosrxbha_z6vxhh.png",
        link: "https://beautybayafrica.com/product/cosrx-bha-blackhead-power-liquid/",
        step: "treatment",
        proof: "4% Betaine Salicylate is a gentler BHA that effectively clears pores and reduces blackheads.",
        expertRecommendation: "Expert Tip: Use 2-3 times a week as a targeted treatment for congestion and enlarged pores.",
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
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341722/boldencleanser_xoicgo.png",
        link: "https://beautybayafrica.com/product/bolden-skin-clarifying-cleanser/",
        step: "cleanser",
        proof: "Formulated with Zinc Gluconate to regulate oil production and reduce redness.",
        expertRecommendation: "Aesthetician Tip: A high-performance cleanser that targets blemish-prone skin without stripping moisture.",
      },
      {
        id: 3545665,
        name: "AHA BHA PHA 30 days Miracle Toner",
        price_html: "₦16,000",
        brand: "Some By Mi",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/somebymisotoner_wwuwbn.png",
        link: "https://beautybayafrica.com/product/some-by-mi-aha-bha-pha-30-days-miracle-toner/",
        step: "toner",
        proof: "Triple acid complex (AHA/BHA/PHA) clinically shown to improve skin turnover and clarity in 30 days.",
        expertRecommendation: "Clinical Note: Real tea tree extract (10,000ppm) provides powerful soothing for inflamed skin.",
      },
      {
        id: 5609712453868,
        name: "Vitamin C Serum Anti-Aging",
        price_html: "₦15,000",
        brand: "Advanced Clinicals",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341722/advancedclinicalsvitc_n1tak9.png",
        link: "https://beautybayafrica.com/product/advanced-clinicals-vitamin-c-face-serum/",
        step: "serum",
        proof: "Vitamin C combined with Ferulic Acid stabilizes the formula and boosts antioxidant efficacy.",
        expertRecommendation: "Dermatologist Recommended: Targets dark spots and supports collagen production for firmer skin.",
      },
      {
        id: 12377758,
        name: "Cica+ Soothing Cream",
        price_html: "₦16,800",
        brand: "TOPICREM",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341727/topicremcicasoothing_u8ckqf.png",
        link: "https://beautybayafrica.com/product/topicrem-cica-soothing-cream/",
        step: "moisturizer",
        proof: "Copper-Zinc-Manganese complex promotes epidermal repair and limits bacterial proliferation.",
        expertRecommendation: "Aesthetician's Choice: Ideal for post-procedure skin or severe irritation; rapidly restores comfort.",
      },
      {
        id: 118,
        name: "Anthelios UVMune 400 Invisible Fluid Spf50+",
        price_html: "₦9,000",
        brand: "La Roche Posay",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/larocheinvisble_g0vzhh.png",
        link: "https://beautybayafrica.com/product/la-roche-posay-anthelios-uvmune-400-invisible-fluid-spf50/",
        step: "sunscreen",
        proof: "Mexoryl 400 filter provides the ultimate protection against ultra-long UVA rays.",
        expertRecommendation: "Dermatologist Gold Standard: The most advanced broad-spectrum protection available today.",
      },
      {
        id: 456,
        name: "Retinol 0.2% in Squalane",
        price_html: "₦12,000",
        brand: "The Ordinary",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/theordinaryretinol_v0yfha.png",
        link: "https://beautybayafrica.com/product/the-ordinary-retinol-0-2-in-squalane/",
        step: "treatment",
        proof: "Retinol is the most studied anti-aging ingredient, proven to increase collagen production.",
        expertRecommendation: "Dermatologist Note: Start with this low concentration to build tolerance for visible anti-aging results.",
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
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/panoxyl4_gqjufk.png",
        link: "https://beautybayafrica.com/product/panoxyl-acne-acne-creamy-wash-4-benzoyl-peroxide/",
        step: "cleanser",
        proof: "Benzoyl Peroxide is the #1 dermatologist-recommended OTC ingredient for inflammatory acne.",
        expertRecommendation: "Clinical Choice: Effectively kills acne-causing bacteria and clears pores rapidly.",
      },
      {
        id: 24545665,
        name: "Ceramide Mochi Toner",
        price_html: "₦15,000",
        brand: "TonyMoly",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341724/tonymolytoner_opucrr.png",
        link: "https://beautybayafrica.com/product/tonymoly-ceramide-mochi-toner/",
        step: "toner",
        proof: "Ceramides (5,000ppb) are essential for restoring a compromised skin barrier caused by strong actives.",
        expertRecommendation: "Expert Tip: Hydrating and strengthening; vital when using high-strength acne treatments.",
      },
      {
        id: 200000665,
        name: "Alpha Arbutin 2% + HA",
        price_html: "₦27,200",
        brand: "The Ordinary",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/theordinaryalphaarbution_y0yfha.png",
        link: "https://beautybayafrica.com/product/the-ordinary-alpha-arbutin-2-ha/",
        step: "serum",
        proof: "Alpha Arbutin is a potent tyrosinase inhibitor that reduces melanin production and fades hyperpigmentation.",
        expertRecommendation: "Dermatologist Note: A highly effective, non-irritating alternative to hydroquinone for brightening skin.",
      },
      {
        id: 185995,
        name: "Ceramide Ato Concentrate Cream",
        price_html: "₦17,500",
        brand: "Illiyoon",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/illiyionnconcemoisturizer_izp2oz.png",
        link: "https://beautybayafrica.com/product/illiyoon-ceramide-ato-concentrate-cream/",
        step: "moisturizer",
        proof: "Ceramide Skin Complex™ encapsulates ceramides for deep, long-lasting barrier reinforcement.",
        expertRecommendation: "Clinical Note: Hypoallergenic and fragrance-free; essential for protecting extremely sensitized skin.",
      },
      {
        id: 1029944,
        name: "Anthelios UVMune 400 Invisible Fluid Spf50+",
        price_html: "₦9,000",
        brand: "La Roche Posay",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/larocheinvisble_g0vzhh.png",
        link: "https://beautybayafrica.com/product/la-roche-posay-anthelios-uvmune-400-invisible-fluid-spf50/",
        step: "sunscreen",
        proof: "Provides ultra-long UVA protection, preventing DNA damage and cellular aging.",
        expertRecommendation: "Dermatologist Standard: Highest protection level for those undergoing intensive skin treatments.",
      },
      {
        id: 7890,
        name: "Aza 20 (Azelaic Acid 20%)",
        price_html: "₦8,500",
        brand: "Expert Derma",
        image: "https://res.cloudinary.com/debcfaccq/image/upload/v1753341723/azelaicacid_g0vzhh.png",
        link: "https://beautybayafrica.com/product/aza-20-azelaic-acid-20/",
        step: "treatment",
        proof: "20% Azelaic Acid is clinically equivalent to 5% Benzoyl Peroxide but with less irritation.",
        expertRecommendation: "Clinical Note: Powerful anti-bacterial and anti-inflammatory treatment for severe acne and rosacea.",
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
