// app/routes/api.top-reviews.jsx
// Returns top approved 5-star reviews for a shop (or specific product)
// GET /api/top-reviews
// GET /api/top-reviews?product_id=123456

import db from "../db.server";

export async function loader({ request }) {
  const url = new URL(request.url);

  // Extract shop from query param or referrer header
  const shop =
    url.searchParams.get("shop") ||
    (() => {
      try {
        const ref = request.headers.get("referer") || "";
        return new URL(ref).hostname;
      } catch {
        return null;
      }
    })();

  const productId = url.searchParams.get("product_id") || null;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=60",
  };

  try {
    // Find store by shop domain
    const storeWhere = shop ? { shop } : undefined;
    const store = storeWhere
      ? await db.store.findUnique({ where: storeWhere, select: { id: true, language: true } })
      : null;

    if (!store) {
      return Response.json({ reviews: [], average: 0, count: 0, language: "en" }, { headers });
    }

    const language = store.language || "en";

    // Build where clause
    const where = {
      storeId: store.id,
      status: "approved",
      rating: 5,
    };

    if (productId) {
      const product = await db.product.findFirst({
        where: { storeId: store.id, shopifyProductId: String(productId) },
        select: { id: true },
      });
      if (product) where.productId = product.id;
    }

    // Fetch top 5-star reviews (latest 12, shown in slider)
    const reviews = await db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        customer: true,
        rating: true,
        title: true,      // ← ADD
        comment: true,
        createdAt: true,
      },
    });

    // Overall average across ALL approved reviews for this store/product
    const aggWhere = {
      storeId: store.id,
      status: "approved",
      ...(productId && where.productId ? { productId: where.productId } : {}),
    };

    const agg = await db.review.aggregate({
      where: aggWhere,
      _avg: { rating: true },
      _count: { id: true },
    });

    const average = agg._avg.rating
      ? Math.round(agg._avg.rating * 10) / 10
      : 0;
    const count = agg._count.id || 0;

    return Response.json({ reviews, average, count, language }, { headers });
  } catch (err) {
    console.error("[api/top-reviews]", err);
    return Response.json({ reviews: [], average: 0, count: 0, language: "en" }, { headers });
  }
}
