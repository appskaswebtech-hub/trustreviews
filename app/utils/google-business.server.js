// app/utils/google-business.server.js
// OAuth connect flow + full-review sync against Google's Business Profile
// APIs (mybusinessaccountmanagement, mybusinessbusinessinformation, and the
// legacy mybusiness v4 reviews endpoint). Unlike the Places API path
// (google-places.server.js), this needs per-merchant OAuth consent because
// it reads a merchant's own private Business Profile data, not public info.
import crypto from "crypto";
import db from "../db.server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/business.manage";

function getRedirectUri() {
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.APP_URL || "";
  return `${appUrl}/auth/google-business-callback`;
}

function getClientCredentials() {
  const clientId = process.env.GOOGLE_BUSINESS_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Business OAuth client is not configured (missing env vars).");
  }
  return { clientId, clientSecret };
}

function starRatingToNumber(starRating) {
  return { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[starRating] || 0;
}

export async function buildAuthUrl(shop) {
  const { clientId } = getClientCredentials();
  const state = crypto.randomBytes(24).toString("hex");
  await db.googleOAuthState.create({ data: { state, shop } });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

// Consumes the state row (one-time use) and returns the shop it belongs to.
export async function resolveShopFromState(state) {
  const row = await db.googleOAuthState.findUnique({ where: { state } });
  if (!row) throw new Error("Invalid or expired OAuth state.");
  await db.googleOAuthState.delete({ where: { state } }).catch(() => {});
  await db.googleOAuthState
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } } })
    .catch(() => {});
  return row.shop;
}

export async function exchangeCodeForTokens(shop, code) {
  const { clientId, clientSecret } = getClientCredentials();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Google token exchange failed (${response.status}): ${body}`);
  }
  const json = await response.json();
  const expiresAt = new Date(Date.now() + (json.expires_in || 3600) * 1000);

  await db.googleBusinessConnection.upsert({
    where: { shop },
    update: { accessToken: json.access_token, refreshToken: json.refresh_token, tokenExpiresAt: expiresAt },
    create: { shop, accessToken: json.access_token, refreshToken: json.refresh_token, tokenExpiresAt: expiresAt },
  });
}

async function refreshAccessToken(shop) {
  const conn = await db.googleBusinessConnection.findUnique({ where: { shop } });
  if (!conn?.refreshToken) throw new Error("Not connected to Google Business Profile.");
  const { clientId, clientSecret } = getClientCredentials();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: conn.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Google token refresh failed (${response.status}): ${body}`);
  }
  const json = await response.json();
  const expiresAt = new Date(Date.now() + (json.expires_in || 3600) * 1000);
  await db.googleBusinessConnection.update({
    where: { shop },
    data: { accessToken: json.access_token, tokenExpiresAt: expiresAt },
  });
  return json.access_token;
}

export async function getValidAccessToken(shop) {
  const conn = await db.googleBusinessConnection.findUnique({ where: { shop } });
  if (!conn?.connected && !conn?.refreshToken) throw new Error("Not connected to Google Business Profile.");
  if (conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() > Date.now() + 60_000) {
    return conn.accessToken;
  }
  return refreshAccessToken(shop);
}

// A Google account can manage more than one business — enumerate all
// locations so the admin UI can offer a picker.
export async function listAccountsAndLocations(shop) {
  const accessToken = await getValidAccessToken(shop);

  const accountsRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!accountsRes.ok) {
    const body = await accountsRes.text().catch(() => "");
    throw new Error(`Failed to list Google Business accounts (${accountsRes.status}): ${body}`);
  }
  const accounts = (await accountsRes.json()).accounts || [];

  const locations = [];
  for (const account of accounts) {
    const locRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!locRes.ok) continue;
    const locJson = await locRes.json();
    for (const loc of locJson.locations || []) {
      locations.push({ accountId: account.name, locationId: loc.name, title: loc.title || loc.name });
    }
  }
  return locations;
}

export async function connectLocation(shop, { accountId, locationId, locationName }) {
  await db.googleBusinessConnection.update({
    where: { shop },
    data: { accountId, locationId, locationName, connected: true },
  });
}

// Follows nextPageToken until every review is fetched — upserts are
// idempotent (shop+reviewId unique constraint), so this is safe to re-run.
export async function syncAllReviews(shop) {
  const conn = await db.googleBusinessConnection.findUnique({ where: { shop } });
  if (!conn?.locationId) throw new Error("Pick a Google Business location first.");

  const accessToken = await getValidAccessToken(shop);
  let pageToken;
  let total = 0;

  try {
    do {
      const url = new URL(`https://mybusiness.googleapis.com/v4/${conn.locationId}/reviews`);
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Google reviews.list failed (${response.status}): ${body}`);
      }
      const json = await response.json();

      for (const r of json.reviews || []) {
        const reviewId = r.reviewId || r.name;
        await db.googleFullReview.upsert({
          where: { shop_reviewId: { shop, reviewId } },
          update: {
            authorName: r.reviewer?.displayName || "Google user",
            rating: starRatingToNumber(r.starRating),
            text: r.comment || "",
            updateTime: r.updateTime ? new Date(r.updateTime) : null,
          },
          create: {
            shop, reviewId,
            authorName: r.reviewer?.displayName || "Google user",
            rating: starRatingToNumber(r.starRating),
            text: r.comment || "",
            createTime: r.createTime ? new Date(r.createTime) : null,
            updateTime: r.updateTime ? new Date(r.updateTime) : null,
          },
        });
        total += 1;
      }
      pageToken = json.nextPageToken;
    } while (pageToken);

    await db.googleBusinessConnection.update({ where: { shop }, data: { lastSyncedAt: new Date(), lastSyncError: null } });
    return { total };
  } catch (error) {
    await db.googleBusinessConnection.update({ where: { shop }, data: { lastSyncedAt: new Date(), lastSyncError: error.message } });
    throw error;
  }
}
