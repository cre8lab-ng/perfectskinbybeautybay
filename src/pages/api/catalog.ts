import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import {
  buildCatalog,
  serializeCatalog,
  type SerializedCatalogItem,
  type StoreApiProduct,
} from "@/lib/recommendationEngine";

// Public WooCommerce Store API: returns live prices and stock, no keys required.
const WC_URL = process.env.WC_URL?.replace(/\/$/, "") || "https://beautybayafrica.com";
const STORE_API = `${WC_URL}/wp-json/wc/store/v1/products`;
const SKINCARE_CATEGORY = "skincare";

// The store API is slow (5–10s per page) and sometimes drops responses, so:
//  - this process keeps the last good catalog and refreshes it in the background, and
//  - the response is cacheable by the CDN, so most visitors never reach this function at all.
const CATALOG_TTL_MS = 10 * 60 * 1000;
let catalogCache: { catalog: SerializedCatalogItem[]; fetchedAt: number } | null = null;
let inflight: Promise<SerializedCatalogItem[]> | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(params: Record<string, unknown>, page: number, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await axios.get<StoreApiProduct[]>(STORE_API, {
        params: { ...params, per_page: 100, page },
        paramsSerializer: { indexes: true },
        timeout: 60000,
      });
    } catch (err) {
      if (attempt >= attempts) throw err;
      await sleep(1000 * attempt);
    }
  }
}

async function fetchAllPages(params: Record<string, unknown>) {
  const first = await fetchPage(params, 1);
  const totalPages = Math.min(Number(first.headers["x-wp-totalpages"] || 1), 20);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(params, i + 2))
  );
  return [first, ...rest].flatMap((r) => r.data);
}

function refreshCatalog() {
  if (inflight) return inflight;
  inflight = (async () => {
    const products = await fetchAllPages({
      category: SKINCARE_CATEGORY,
      stock_status: "instock",
    });
    const variableIds = products.filter((p) => p.type === "variable").map((p) => p.id);
    const variations = variableIds.length
      ? await fetchAllPages({ type: "variation", stock_status: "instock", parent: variableIds })
      : [];
    const catalog = serializeCatalog(buildCatalog(products, variations));
    if (catalog.length === 0) throw new Error("Store returned no usable products");
    catalogCache = { catalog, fetchedAt: Date.now() };
    return catalog;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function loadCatalog() {
  if (!catalogCache) return refreshCatalog();
  if (Date.now() - catalogCache.fetchedAt > CATALOG_TTL_MS) {
    refreshCatalog().catch((err) => console.error("Catalog refresh failed:", err?.message ?? err));
  }
  return catalogCache.catalog;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const catalog = await loadCatalog();
    // Fresh for 10 minutes at the CDN, then served stale for up to a day while it revalidates.
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");
    return res.status(200).json({ products: catalog, fetchedAt: catalogCache?.fetchedAt ?? Date.now() });
  } catch (error) {
    console.error("🔥 Catalog error:", axios.isAxiosError(error) ? error.message : error);
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Could not load products from the store" });
  }
}
