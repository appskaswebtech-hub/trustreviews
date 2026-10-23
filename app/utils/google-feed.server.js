// app/utils/google-feed.server.js
// Builds the Google Product Ratings XML feed (product reviews schema 2.4,
// https://support.google.com/merchants/answer/7045996) for a shop's approved
// reviews. The merchant adds the feed URL in Merchant Center as a scheduled
// fetch, so this needs no service account or Merchant API access.
import crypto from "crypto";
import db from "../db.server";
import { unauthenticated } from "../shopify.server";

export function generateFeedToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function tokensMatch(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

export function buildFeedUrl(baseUrl, shop, token) {
  const base = String(baseUrl || "").replace(/\/$/, "");
  return `${base}/api/google-reviews-feed?shop=${encodeURIComponent(shop)}&token=${token}`;
}

const esc = (value) =>
  String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// shopifyProductId -> { name, url, sku, gtin }
async function fetchProductInfo(shop, shopifyProductIds) {
  const info = new Map();
  if (!shopifyProductIds.length) return info;
  const { admin } = await unauthenticated.admin(shop);

  for (let i = 0; i < shopifyProductIds.length; i += 50) {
    const chunk = shopifyProductIds.slice(i, i + 50);
    const response = await admin.graphql(
      `#graphql
        query FeedProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              onlineStoreUrl
              variants(first: 1) { nodes { sku barcode } }
            }
          }
        }`,
      { variables: { ids: chunk.map((id) => `gid://shopify/Product/${id}`) } },
    );
    const json = await response.json();
    for (const node of json?.data?.nodes || []) {
      if (!node?.id) continue;
      const variant = node.variants?.nodes?.[0] || {};
      const barcode = String(variant.barcode || "").trim();
      info.set(node.id.split("/").pop(), {
        name: node.title,
        url: node.onlineStoreUrl,
        sku: String(variant.sku || "").trim(),
        gtin: /^\d{8,14}$/.test(barcode) ? barcode : "",
      });
    }
  }
  return info;
}

export async function buildGoogleReviewsFeed(shop) {
  const store = await db.store.findUnique({ where: { shop } });
  const reviews = store
    ? await db.review.findMany({
        where: { storeId: store.id, status: "approved" },
        include: { product: { select: { shopifyProductId: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const productIds = [...new Set(reviews.map((r) => r.product?.shopifyProductId).filter(Boolean))];
  const products = await fetchProductInfo(shop, productIds).catch((err) => {
    console.error("[google-feed] product lookup failed:", err.message);
    return new Map();
  });

  let skipped = 0;
  const items = [];
  for (const review of reviews) {
    const product = products.get(review.product?.shopifyProductId);
    const comment = String(review.comment || "").trim();
    // Google requires content, a product URL/name and at least one product id.
    if (!comment || !product?.url || !product.name || (!product.sku && !product.gtin)) {
      skipped += 1;
      continue;
    }

    const ids = [
      product.gtin ? `<gtins><gtin>${esc(product.gtin)}</gtin></gtins>` : "",
      product.sku ? `<skus><sku>${esc(product.sku)}</sku></skus>` : "",
    ].join("");

    items.push(`    <review>
      <review_id>${review.id}</review_id>
      <reviewer><name>${esc(review.customer || "Anonymous")}</name></reviewer>
      <review_timestamp>${review.createdAt.toISOString()}</review_timestamp>${review.title ? `\n      <title>${esc(review.title)}</title>` : ""}
      <content>${esc(comment)}</content>
      <review_url type="singleton">${esc(product.url)}</review_url>
      <ratings><overall min="1" max="5">${review.rating}</overall></ratings>
      <products>
        <product>
          <product_ids>${ids}</product_ids>
          <product_name>${esc(product.name)}</product_name>
          <product_url>${esc(product.url)}</product_url>
        </product>
      </products>
    </review>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${items.length} reviews included, ${skipped} skipped (no text, or product has no SKU/barcode or storefront URL) -->
<feed xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.google.com/shopping/reviews/schema/product/2.4/product_reviews.xsd">
  <version>2.4</version>
  <publisher>
    <name>${esc(shop)}</name>
  </publisher>
  <reviews>
${items.join("\n")}
  </reviews>
</feed>
`;
}
