
export interface Product {
    id: number;
    name: string;
    price_html: string;
    brand: string;
    image: string;
    link: string;
  }
  
  export const skinProductMap: {
    [concern: string]: {
      [level in "very_low" | "moderate" | "high" | "very_high"]?: Product[];
    };
  } = {
    acne: {
      very_low: [
        {
          id: 101,
          name: "CeraVe Foaming Facial Cleanser",
          price_html: "₦16,600",
          brand: "CeraVe",
          image: "/images/products/cerave-foaming-facial-cleanser.png",
          link: "https://beautyhub.ng/product/cerave-foaming-facial-cleanser/",
        },
      ],
      moderate: [
        {
          id: 102,
          name: "Paula's Choice BHA Liquid Exfoliant",
          price_html: "₦33,000",
          brand: "Paula's Choice",
          image: "/images/products/paulas-choice-bha-liquid-exfoliant.png",
          link: "https://beautyhub.ng/product/paulas-choice-skin-perfecting-2-bha-liquid-exfoliant/",
        },
      ],
      high: [
        {
          id: 103,
          name: "La Roche-Posay Effaclar Duo+",
          price_html: "₦18,000",
          brand: "La Roche-Posay",
          image: "/images/products/laroche-posay-effaclar-duo.png",
          link: "https://beautyhub.ng/product/la-roche-posay-effaclar-duom-triple-correction-anti-blemish-treatment/",
        },
      ],
      very_high: [
        {
          id: 104,
          name: "Differin Adapalene Gel 0.1%",
          price_html: "₦30,000",
          brand: "Differin",
          image: "/images/products/differin-adapalene-gel.png",
          link: "https://beautyhub.ng/product/differin-0-1-adapalene-gel-treatment/",
        },
      ],
    },
  
    wrinkle: {
      very_low: [
        {
          id: 201,
          name: "Neutrogena Hydro Boost Water Gel",
          price_html: "₦9,200",
          brand: "Neutrogena",
          image: "/images/products/neutrogena.png",
          link: "https://www.neutrogena.com/products/skincare/neutrogena-hydro-boost-water-gel-6811045.html",
        },
      ],
      moderate: [
        {
          id: 202,
          name: "Olay Regenerist Retinol 24 Night Cream",
          price_html: "₦14,000",
          brand: "Olay",
          image: "/images/products/neutrogena.png",
          link: "https://www.olay.com/retinol-24-night-moisturizer",
        },
      ],
      high: [
        {
          id: 203,
          name: "The Ordinary Retinol 1% in Squalane",
          price_html: "₦8,000",
          brand: "The Ordinary",
          image: "/images/products/neutrogena.png",
          link: "https://theordinary.com/en-us/retinol-1pct-in-squalane-100421.html",
        },
      ],
      very_high: [
        {
          id: 204,
          name: "RoC Retinol Correxion Deep Wrinkle Night Cream",
          price_html: "₦16,000",
          brand: "RoC",
          image: "/images/products/neutrogena.png",
          link: "https://www.rocskincare.com/products/deep-wrinkle-night-cream",
        },
      ],
    },
  
    texture: {
      very_low: [
        {
          id: 301,
          name: "The Ordinary Natural Moisturizing Factors + HA",
          price_html: "₦7,500",
          brand: "The Ordinary",
          image: "/images/products/neutrogena.png",
          link: "https://theordinary.com/en-us/natural-moisturizing-factors-ha-100425.html",
        },
      ],
      moderate: [
        {
          id: 302,
          name: "Pixi Glow Tonic",
          price_html: "₦12,000",
          brand: "Pixi",
          image: "/images/products/neutrogena.png",
          link: "https://pixibeauty.com/products/glow-tonic",
        },
      ],
      high: [
        {
          id: 303,
          name: "Dr. Dennis Gross Alpha Beta Universal Peel",
          price_html: "₦28,000",
          brand: "Dr. Dennis Gross",
          image: "/images/products/neutrogena.png",
          link: "https://drdennisgross.com/products/alpha-beta-universal-daily-peel",
        },
      ],
      very_high: [
        {
          id: 304,
          name: "Paula's Choice Advanced Smoothing Treatment 10% AHA",
          price_html: "₦20,000",
          brand: "Paula's Choice",
          image: "/images/products/neutrogena.png",
          link: "https://www.paulaschoice.com/advanced-smoothing-treatment-10-aha/282.html",
        },
      ],
    },
  
    pore: {
      very_low: [
        {
          id: 401,
          name: "The Inkey List Niacinamide Serum",
          price_html: "₦6,000",
          brand: "The Inkey List",
          image: "/images/products/neutrogena.png",
          link: "https://www.theinkeylist.com/products/niacinamide-serum",
        },
      ],
      moderate: [
        {
          id: 402,
          name: "COSRX AHA/BHA Clarifying Treatment Toner",
          price_html: "₦10,000",
          brand: "COSRX",
          image: "/images/products/neutrogena.png",
          link: "https://www.cosrx.com/products/aha-bha-clarifying-treatment-toner",
        },
      ],
      high: [
        {
          id: 403,
          name: "The Ordinary Salicylic Acid 2% Solution",
          price_html: "₦8,000",
          brand: "The Ordinary",
          image: "/images/products/neutrogena.png",
          link: "https://theordinary.com/en-us/salicylic-acid-2pct-solution-100411.html",
        },
      ],
      very_high: [
        {
          id: 404,
          name: "Tatcha The Deep Cleanse",
          price_html: "₦22,000",
          brand: "Tatcha",
          image: "/images/products/neutrogena.png",
          link: "https://www.tatcha.com/product/TDC.html",
        },
      ],
    },
  };
  