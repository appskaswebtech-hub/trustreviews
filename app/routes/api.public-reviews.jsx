// app/routes/api.public-reviews.jsx
// Public reviews API — returns a store's approved reviews, authenticated by the
// store's API key (generated in the app under "API Access", Advanced plan).
//
// GET /api/public-reviews?key=trk_...   (or header  Authorization: Bearer trk_...  /  X-API-Key)
//   &product_id=123456    optional — Shopify product id
//   &rating=5             optional — exact star rating (1-5)
//   &sort=newest|highest  optional — default newest
//   &limit=20             optional — 1-100, default 20
//   &page=1               optional

import db from "../db.server";
import { hasAdvancedAccess } from "../utils/planGuard.server";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, X-API-Key, Content-Type",
  "Cache-Control": "public, max-age=60",
};

const fail = (status, error) =>
  Response.json({ error }, { status, headers: { ...headers, "Cache-Control": "no-store" } });

// CORS preflight (sent when a browser uses the Authorization / X-API-Key header)
export async function action({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  return fail(405, "Method not allowed");
}

export async function loader({ request }) {
  const url = new URL(request.url);
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const key = (url.searchParams.get("key") || bearer || request.headers.get("x-api-key") || "").trim();
  if (!key) return fail(401, "Missing API key.");

  try {
    const keyRow = await db.storeApiKey.findUnique({ where: { key } });
    if (!keyRow) return fail(401, "Invalid API key.");
    if (!(await hasAdvancedAccess(keyRow.shop))) return fail(403, "The reviews API requires the Advanced plan.");

    const store = await db.store.findUnique({ where: { shop: keyRow.shop }, select: { id: true } });
    if (!store) return fail(404, "Store not found.");

    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit"), 10) || 20));
    const page = Math.max(1, parseInt(url.searchParams.get("page"), 10) || 1);
    const rating = parseInt(url.searchParams.get("rating"), 10);
    const productId = url.searchParams.get("product_id");

    const where = { storeId: store.id, status: "approved" };
    if (rating >= 1 && rating <= 5) where.rating = rating;
    if (productId) {
      const product = await db.product.findFirst({
        where: { storeId: store.id, shopifyProductId: String(productId) },
        select: { id: true },
      });
      // Unknown product → no reviews, not the whole store's.
      where.productId = product ? product.id : -1;
    }

    const orderBy = url.searchParams.get("sort") === "highest"
      ? [{ rating: "desc" }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

    const [rows, total, agg] = await Promise.all([
      db.review.findMany({
        where, orderBy, take: limit, skip: (page - 1) * limit,
        select: {
          id: true, customer: true, rating: true, title: true, comment: true, createdAt: true,
          mediaUrl: true, mediaType: true, reply: true, repliedAt: true,
          product: { select: { shopifyProductId: true } },
        },
      }),
      db.review.count({ where }),
      db.review.aggregate({
        where: { storeId: store.id, status: "approved", ...(where.productId ? { productId: where.productId } : {}) },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    // Best-effort; never fail the request over a usage timestamp.
    db.storeApiKey.update({ where: { key }, data: { lastUsedAt: new Date() } }).catch(() => {});

    return Response.json({
      shop: keyRow.shop,
      average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
      count: agg._count.id || 0,
      page,
      limit,
      total,
      reviews: rows.map((r) => ({
        id: r.id,
        productId: r.product?.shopifyProductId || null,
        customer: r.customer,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt,
        mediaUrl: r.mediaUrl,
        mediaType: r.mediaType,
        reply: r.reply,
        repliedAt: r.repliedAt,
      })),
    }, { headers });
  } catch (err) {
    console.error("[api/public-reviews]", err);
    return fail(500, "Something went wrong.");
  }
}
