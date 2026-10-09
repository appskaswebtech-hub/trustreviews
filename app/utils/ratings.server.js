// Ratings for many products in one query — used by every star badge on a page
// (api.ratings.jsx for the ratings script, api.review.jsx for the "Collection
// Star Ratings" app embed via the app proxy).
import db from "../db.server";

/** { ratings: { "<shopify product id>": { average, count } } } — max 100 ids. */
export async function batchRatings(shop, rawIds) {
  const ids = [...new Set(String(rawIds).split(",").map((s) => s.trim()).filter((s) => /^\d+$/.test(s)))].slice(0, 100);
  const ratings = Object.fromEntries(ids.map((id) => [id, { average: 0, count: 0 }]));
  if (!shop || ids.length === 0) return { ratings };

  const store = await db.store.findUnique({ where: { shop }, select: { id: true } });
  if (!store) return { ratings };

  const products = await db.product.findMany({
    where: { storeId: store.id, shopifyProductId: { in: ids } },
    select: { id: true, shopifyProductId: true },
  });
  if (products.length === 0) return { ratings };

  const groups = await db.review.groupBy({
    by: ["productId"],
    where: { storeId: store.id, status: "approved", productId: { in: products.map((p) => p.id) } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const byDbId = new Map(groups.map((g) => [g.productId, g]));

  for (const p of products) {
    const g = byDbId.get(p.id);
    if (g) {
      ratings[p.shopifyProductId] = {
        average: Math.round((g._avg.rating || 0) * 10) / 10,
        count: g._count.rating || 0,
      };
    }
  }
  return { ratings };
}
