import { useState } from "react";
// import { getProductsByTagName } from "@/services/woocommerce";
// import env from "@/config/env";
import Image from "next/image";

export default function ProductRecommender() {
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [productGroups, setProductGroups] = useState<{ [tag: string]: any[] }>(
    {}
  );
  console.log(setLoading,setProductGroups)
  // const tagsToLoad = ["acne", "aha", "amella"];

  // useEffect(() => {
  //   async function fetchAllProducts() {
  //     try {
  //       const fetches = tagsToLoad.map(async (tag) => {
  //         const products = await getProductsByTagName(
  //           tag,
  //           process.env.WC_KEY!,
  //           process.env.WC_SECRET!
  //         );
  //         return { tag, products };
  //       });

  //       const results = await Promise.all(fetches);

  //       const grouped = results.reduce((acc, { tag, products }) => {
  //         if (products.length > 0) {
  //           acc[tag] = products;
  //         }
  //         return acc;
  //         // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //       }, {} as { [tag: string]: any[] });

  //       setProductGroups(grouped);
  //     } catch (err) {
  //       console.error("❌ Failed to fetch product groups:", err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }

  //   fetchAllProducts();
  // }, []);

  if (loading) return <p>Loading products...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      {Object.entries(productGroups).map(([tag, products]) => (
        <div key={tag} style={{ marginBottom: "2rem" }}>
          <h3>{tag.toUpperCase()} Products</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {products.map((product) => (
              <li
                key={product.id}
                style={{
                  background: "#f9f9f9",
                  padding: "10px",
                  marginBottom: "1rem",
                  borderRadius: "8px",
                }}
              >
                <strong>{product.name}</strong>
                <br />
                <strong>
                  {product.brand}
                  {product.link}
                </strong>

                {product.image && (
                  <div>
                    <Image
                      src={product.image}
                      alt={product.name}
                      style={{ width: "100px", borderRadius: "5px" }}
                    />
                  </div>
                )}
                <p dangerouslySetInnerHTML={{ __html: product.price_html }} />
                <button
                  onClick={() => {
                    if (product.link) {
                      window.open(product.link, "productDetailsTab")?.focus();
                    }
                  }}
                  style={{
                    display: "inline-block",
                    marginTop: "10px",
                    padding: "10px 20px",
                    backgroundColor: "#f847b4",
                    color: "white",
                    textDecoration: "none",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Shop Now
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {Object.keys(productGroups).length === 0 && (
        <p>No products found for any tags.</p>
      )}
    </div>
  );
}
