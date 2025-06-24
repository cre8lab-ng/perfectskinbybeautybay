
export interface WooTag {
  id: number;
  name: string;
  slug: string;
}

export interface WooProduct {
  id: number;
  name: string;
  price_html: string;
  brands: { name: string }[];
  images: { src: string }[];
  permalink: string;
}

export interface MappedProduct {
  id: number;
  name: string;
  price_html: string;
  brand: string;
  image: string | null;
  link: string;
}

export interface WooOrder {
  id: number;
  billing?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface CreateOrderPayload {
  email: string;
}

// ----------- API Functions -----------

export async function getAllTags(searchTerm: string): Promise<WooTag[]> {
  try {
    const res = await fetch(`/api/wc?action=tags&search=${encodeURIComponent(searchTerm)}`);
    const data: WooTag[] = await res.json();
    return data || [];
  } catch (error) {
    console.error("❌ Failed to fetch tags:", error);
    return [];
  }
}

export async function getProductsByTagId(tagId: number): Promise<MappedProduct[]> {
  try {
    const res = await fetch(`/api/wc?action=productsByTag&tagId=${tagId}`);
    const data: MappedProduct[] = await res.json();
    return data || [];
  } catch (error) {
    console.error(`❌ Failed to fetch products for tag ID ${tagId}:`, error);
    return [];
  }
}

export async function getProductsByTagName(tagName: string): Promise<MappedProduct[]> {
  try {
    const tags = await getAllTags(tagName);

    if (!Array.isArray(tags) || tags.length === 0) {
      console.warn(`⚠️ Tag "${tagName}" not found.`);
      return [];
    }

    const tagId = tags[0].id;
    const products = await getProductsByTagId(tagId);
    return products;
  } catch (error) {
    console.error(`❌ Error getting products by tag name "${tagName}":`, error);
    return [];
  }
}

export async function getCompletedOrdersByEmail(email: string): Promise<WooOrder[]> {
  try {
    const res = await fetch(`/api/wc?action=completedOrders&email=${encodeURIComponent(email)}`);
    const data = await res.json();
    console.log(data,"whatimissed")
    return data.orders || []; // ✅ THIS is what you missed
  } catch (error) {
    console.error(`❌ Failed to fetch completed orders for ${email}:`, error);
    return [];
  }
}


export async function hasUserCompletedOrder(email: string): Promise<boolean> {
  const orders = await getCompletedOrdersByEmail(email);
  console.log(orders)
  return orders.length > 0;
}

export async function createWooCompletedOrder(email: string): Promise<WooOrder | null> {
  try {
    const payload: CreateOrderPayload = { email };

    const res = await fetch("/api/wc?action=createOrder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data: WooOrder = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Failed to create WooCommerce order:", error);
    return null;
  }
}
