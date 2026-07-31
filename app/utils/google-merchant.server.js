// app/utils/google-merchant.server.js
// Pushes approved reviews to Google Merchant Center's Product Ratings program
// (https://developers.google.com/merchant/api/guides/reviews/products) using
// a single app-owned service account — merchants just add that account's
// email as a user on their own Merchant Center account, so no per-merchant
// OAuth consent flow is needed. Auth is done by hand-signing a JWT with
// Node's built-in `crypto` module rather than pulling in googleapis, to stay
// consistent with the rest of this codebase's plain-fetch integrations.
import crypto from "crypto";
import db from "../db.server";
import { unauthenticated } from "../shopify.server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_ROOT = "https://merchantapi.googleapis.com";
const SCOPE = "https://www.googleapis.com/auth/content";

let cachedToken = null; // { accessToken, expiresAt }

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getServiceAccountCredentials() {
  const email = process.env.GOOGLE_MERCHANT_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_MERCHANT_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) {
    throw new Error("Google Merchant service account is not configured (missing env vars).");
  }
  return { email, privateKey };
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const { email, privateKey } = getServiceAccountCredentials();
  const nowSec = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,
  }));

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  signer.end();
  const signature = base64url(signer.sign(privateKey));

  const assertion = `${header}.${claims}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to obtain Google access token (${response.status}): ${body}`);
  }

  const json = await response.json();
  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in || 3600) * 1000,
  };
  return cachedToken.accessToken;
}

async function merchantApiFetch(path, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return response;
}

export async function testGoogleMerchantConnection(merchantId) {
  try {
    const response = await merchantApiFetch(`/accounts/v1/accounts/${merchantId}`);
    if (response.ok) return { ok: true };
    if (response.status === 403 || response.status === 404) {
      const { email } = getServiceAccountCredentials();
      return {
        ok: false,
        error: `${email} hasn't been added as a user on Merchant Center account ${merchantId} yet, or the ID is wrong.`,
      };
    }
    const body = await response.text().catch(() => "");
    return { ok: false, error: `Google returned status ${response.status}: ${body}` };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// Finds this merchant's PRODUCT_REVIEWS data source, creating one the first
// time we connect if it doesn't exist yet.
async function getOrCreateReviewDataSource(merchantId) {
  const listResponse = await merchantApiFetch(`/datasources/v1beta/accounts/${merchantId}/dataSources`);
  if (listResponse.ok) {
    const listJson = await listResponse.json();
    const existing = (listJson.dataSources || []).find((ds) => ds.productReviewDataSource);
    if (existing) return existing.name; // e.g. "accounts/123/dataSources/456"
  }

  const createResponse = await merchantApiFetch(`/datasources/v1beta/accounts/${merchantId}/dataSources`, {
    method: "POST",
    body: JSON.stringify({
      displayName: "Trust Reviews product reviews",
      productReviewDataSource: {},
    }),
  });
  if (!createResponse.ok) {
    const body = await createResponse.text().catch(() => "");
    throw new Error(`Failed to create product review data source (${createResponse.status}): ${body}`);
  }
  const createJson = await createResponse.json();
  return createJson.name;
}

// Product Ratings needs something to match the review to a product. GTINs
// aren't reliably available from Shopify data, so we use the storefront
// product link instead (also an accepted identifier). If the live Merchant
// API rejects this shape for a real account, this is the function to adjust.
async function buildProductLink(shop, shopifyProductId) {
  const { admin } = await unauthenticated.admin(shop);
  const response = await admin.graphql(
    `#graphql
      query ProductLink($id: ID!) {
        product(id: $id) { onlineStoreUrl handle }
      }`,
    { variables: { id: `gid://shopify/Product/${shopifyProductId}` } },
  );
  const json = await response.json();
  return json?.data?.product?.onlineStoreUrl || null;
}

function buildReviewPayload({ reviewId, email, properties, productLink }) {
  const rating = Number(properties.rating) || 0;
  return {
    productReviewId: `trust-reviews-${reviewId}`,
    reviewer: { reviewerId: email ? Buffer.from(email).toString("base64") : undefined },
    content: {
      title: properties.title || undefined,
      body: properties.comment || "",
    },
    rating: { min: 1, max: 5, value: rating },
    reviewTime: new Date().toISOString(),
    productLinks: productLink ? [productLink] : [],
  };
}

// Only "Review Approved" events should reach Google — Product Ratings is
// meant to reflect published, merchant-approved reviews only.
export async function sendGoogleMerchantReview(merchantId, { shop, metricName, email, properties }) {
  if (metricName !== "Review Approved") return;
  if (!properties?.productId) return;

  const dataSourceName = await getOrCreateReviewDataSource(merchantId);
  const productLink = await buildProductLink(shop, properties.productId).catch(() => null);

  const payload = buildReviewPayload({
    reviewId: `${shop}-${properties.productId}-${Date.now()}`,
    email,
    properties,
    productLink,
  });

  const response = await merchantApiFetch(
    `/reviews/v1alpha/accounts/${merchantId}/productReviews:insert?dataSource=${encodeURIComponent(dataSourceName)}`,
    { method: "POST", body: JSON.stringify(payload) },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Google Merchant productReviews.insert failed (${response.status}): ${body}`);
  }
}

// Backfills every already-approved review for a shop — used by the "Sync
// existing approved reviews now" button so merchants don't have to wait for
// new approvals to populate their Merchant Center account.
export async function syncAllApprovedReviews(shop, merchantId) {
  const store = await db.store.findUnique({ where: { shop } });
  if (!store) return { sent: 0, failed: 0 };

  const reviews = await db.review.findMany({
    where: { storeId: store.id, status: "approved" },
    include: { product: { select: { shopifyProductId: true } } },
  });

  const dataSourceName = await getOrCreateReviewDataSource(merchantId);

  let sent = 0;
  let failed = 0;
  for (const review of reviews) {
    if (!review.product?.shopifyProductId) { failed += 1; continue; }
    try {
      const productLink = await buildProductLink(shop, review.product.shopifyProductId).catch(() => null);
      const payload = buildReviewPayload({
        reviewId: review.id,
        email: review.email,
        properties: { rating: review.rating, comment: review.comment, title: review.title },
        productLink,
      });
      const response = await merchantApiFetch(
        `/reviews/v1alpha/accounts/${merchantId}/productReviews:insert?dataSource=${encodeURIComponent(dataSourceName)}`,
        { method: "POST", body: JSON.stringify(payload) },
      );
      if (response.ok) sent += 1; else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, failed };
}
