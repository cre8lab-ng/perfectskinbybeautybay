import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import NodeCache from "node-cache";

type WCProduct = {
  id: number;
  name: string;
  price_html: string;
  brands?: { name: string }[];
  categories?: { name: string }[];
  attributes?: { name: string; options: string[] }[];
  images?: { src: string }[];
  permalink: string;
};

type WCOrder = {
  billing?: {
    email?: string;
  };
};

function extractErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response: unknown }).response === "object"
  ) {
    const response = (error as { response: { data?: unknown } }).response;
    if ("data" in response && response.data) {
      return JSON.stringify(response.data);
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Unknown error";
}




// WooCommerce base
const WC_URL = process.env.WC_URL?.replace(/\/$/, "") || "https://beautybayafrica.com";
const BASE_URL = `${WC_URL}/wp-json/wc/v3`;
const auth = {
  username: process.env.WC_KEY!,
  password: process.env.WC_SECRET!,
};

// Cache: 15 minutes default
const cache = new NodeCache({ stdTTL: 900 });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { action } = req.query;

  try {
    // ----------- TAGS ----------
    if (action === "tags" && req.method === "GET") {
      const search = ((req.query.search as string) || "").toLowerCase();
      if (!search)
        return res.status(400).json({ error: "Missing 'search' parameter" });

      const cacheKey = `tags:${search}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.status(200).json(cached);

      const response = await axios.get(`${BASE_URL}/products/tags`, {
        auth,
        params: { search },
      });

      cache.set(cacheKey, response.data);
      return res.status(200).json(response.data);
    }

    // ----------- PRODUCTS BY TAG ----------
    if (action === "productsByTag" && req.method === "GET") {
      const tagId = req.query.tagId as string;
      if (!tagId)
        return res.status(400).json({ error: "Missing 'tagId' parameter" });

      const cacheKey = `products:${tagId}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.status(200).json(cached);

      const response = await axios.get(`${BASE_URL}/products`, {
        auth,
        params: { tag: tagId, per_page: 20, status: "publish" },
      });

      const mapped = (response.data as WCProduct[]).map((p) => {
        // 1. Try "brands" field (common in some plugins)
        let brand = p.brands?.[0]?.name;

        // 2. Try WooCommerce attributes (common way to store Brand)
        if (!brand) {
          const brandAttr = p.attributes?.find(
            (a) => a.name.toLowerCase() === "brand"
          );
          if (brandAttr && brandAttr.options?.[0]) {
            brand = brandAttr.options[0];
          }
        }

        // 3. Try "pa_brand" (standard WooCommerce attribute slug)
        if (!brand) {
          const paBrandAttr = p.attributes?.find(
            (a) => a.name.toLowerCase() === "pa_brand"
          );
          if (paBrandAttr && paBrandAttr.options?.[0]) {
            brand = paBrandAttr.options[0];
          }
        }

        // 4. Try categories (sometimes brand is a category)
        if (!brand) {
          // You might want to filter categories that aren't actually brands,
          // but usually brand categories are distinct
          brand = p.categories?.[0]?.name;
        }

        return {
          id: p.id,
          name: p.name,
          price_html: p.price_html,
          brand: brand || "Unknown Brand",
          image: p.images?.[0]?.src || null,
          link: p.permalink,
        };
      });

      cache.set(cacheKey, mapped);
      return res.status(200).json(mapped);
    }

    // ----------- PRODUCTS BY SEARCH ----------
    if (action === "productsBySearch" && req.method === "GET") {
      const q = req.query.q as string;
      if (!q)
        return res.status(400).json({ error: "Missing 'q' parameter" });

      const cacheKey = `search:${q}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.status(200).json(cached);

      const response = await axios.get(`${BASE_URL}/products`, {
        auth,
        params: { search: q, per_page: 5, status: "publish" },
      });

      const mapped = (response.data as WCProduct[]).map((p) => {
        // 1. Try "brands" field (common in some plugins)
        let brand = p.brands?.[0]?.name;

        // 2. Try WooCommerce attributes (common way to store Brand)
        if (!brand) {
          const brandAttr = p.attributes?.find(
            (a) => a.name.toLowerCase() === "brand"
          );
          if (brandAttr && brandAttr.options?.[0]) {
            brand = brandAttr.options[0];
          }
        }

        // 3. Try "pa_brand" (standard WooCommerce attribute slug)
        if (!brand) {
          const paBrandAttr = p.attributes?.find(
            (a) => a.name.toLowerCase() === "pa_brand"
          );
          if (paBrandAttr && paBrandAttr.options?.[0]) {
            brand = paBrandAttr.options[0];
          }
        }

        // 4. Try categories (sometimes brand is a category)
        if (!brand) {
          brand = p.categories?.[0]?.name;
        }

        return {
          id: p.id,
          name: p.name,
          price_html: p.price_html,
          brand: brand || "Unknown Brand",
          image: p.images?.[0]?.src || null,
          link: p.permalink,
        };
      });

      cache.set(cacheKey, mapped);
      return res.status(200).json(mapped);
    }

    // ----------- COMPLETED ORDERS ----------
// ----------- COMPLETED ORDERS ----------
if (action === "completedOrders" && req.method === "GET") {
  const email = (req.query.email as string)?.toLowerCase();
  if (!email)
    return res.status(400).json({ error: "Missing 'email' parameter" });

  const cacheKey = `orders:${email}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.status(200).json({ orders: cached });

  const response = await axios.get(`${BASE_URL}/orders`, {
    auth,
    params: { status: "completed", per_page: 100 },
  });

  const orders = (response.data as WCOrder[]).filter(
    (order) => order.billing?.email?.toLowerCase() === email
  );

  cache.set(cacheKey, orders);
  return res.status(200).json({ orders }); // 👈 wrap in object
}

    // ----------- CREATE ORDER ----------
    if (action === "createOrder" && req.method === "POST") {
      const { email } = req.body;
      if (!email)
        return res
          .status(400)
          .json({ error: "Missing 'email' in request body" });
    
      // 🔍 Check if user already has a completed order
      const existingOrders = await axios.get(`${BASE_URL}/orders`, {
        auth,
        params: { status: "completed", per_page: 100 },
      });
    
      const alreadyExists = existingOrders.data.some(
        (order: any) => order.billing?.email?.toLowerCase() === email.toLowerCase()
      );
    
      if (alreadyExists) {
        return res.status(200).json({ message: "Order already exists" });
      }
    
      // 🧾 Create order if not found
      const payload = {
        payment_method: "paystack",
        payment_method_title: "Paystack",
        set_paid: true,
        status: "completed",
        billing: {
          email,
          first_name: "Paystack",
          last_name: "Customer",
        },
        line_items: [
          {
            product_id: 53604, // ✅ your skin analysis product
            quantity: 1,
          },
        ],
      };
    
      const response = await axios.post(`${BASE_URL}/orders`, payload, {
        auth,
      });
      return res.status(200).json(response.data);
    }
    

    // ----------- FALLBACK ----------
    return res.status(400).json({ error: "Invalid action or method" });
  } catch (error: unknown) {
    console.error("🔥 Woo API Error:", extractErrorMessage(error));
    return res.status(500).json({ error: "WooCommerce API error" });
  }
  
  
}
