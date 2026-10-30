// app/utils/social-video.server.js
// Connects a merchant's Instagram (Instagram API with Instagram Login) or
// Facebook Page (Facebook Login) and syncs its videos / reels into SocialVideo,
// which the "Social Videos" storefront block reads. Needs a Meta developer app
// per provider — env vars INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET and
// FACEBOOK_APP_ID / FACEBOOK_APP_SECRET — and the redirect URI
// `${SHOPIFY_APP_URL}/auth/social-callback` registered in each.
import crypto from "crypto";
import db from "../db.server";

const FB_VERSION = "v21.0";
const SYNC_MAX_AGE_MS = 6 * 60 * 60 * 1000; // CDN video links expire, so re-sync lazily
const IG_REFRESH_WITHIN_MS = 10 * 24 * 60 * 60 * 1000;

export const PROVIDERS = ["instagram", "facebook"];

function getRedirectUri() {
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.APP_URL || "";
  return `${appUrl}/auth/social-callback`;
}

function getCredentials(provider) {
  const prefix = provider === "instagram" ? "INSTAGRAM" : "FACEBOOK";
  const id = process.env[`${prefix}_APP_ID`];
  const secret = process.env[`${prefix}_APP_SECRET`];
  if (!id || !secret) throw new Error(`${provider} connection is not configured yet (missing ${prefix}_APP_ID / ${prefix}_APP_SECRET).`);
  return { id, secret };
}

export function isProviderConfigured(provider) {
  const prefix = provider === "instagram" ? "INSTAGRAM" : "FACEBOOK";
  return Boolean(process.env[`${prefix}_APP_ID`] && process.env[`${prefix}_APP_SECRET`]);
}

async function getJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* non-JSON error body */ }
  if (!res.ok || json.error) {
    const msg = json.error?.message || json.error_message || text.slice(0, 200);
    throw new Error(`${msg || "Request failed"} (${res.status})`);
  }
  return json;
}

// ── Connect (OAuth) ──────────────────────────────────────────────────────────
export async function buildAuthUrl(shop, provider) {
  if (!PROVIDERS.includes(provider)) throw new Error("Unknown provider.");
  const { id } = getCredentials(provider);
  const state = crypto.randomBytes(24).toString("hex");
  await db.socialOAuthState.create({ data: { state, shop, provider } });

  if (provider === "instagram") {
    const params = new URLSearchParams({
      client_id: id, redirect_uri: getRedirectUri(), response_type: "code",
      scope: "instagram_business_basic", state,
    });
    return `https://www.instagram.com/oauth/authorize?${params}`;
  }
  const params = new URLSearchParams({
    client_id: id, redirect_uri: getRedirectUri(), response_type: "code",
    scope: "pages_show_list,pages_read_engagement", state,
  });
  return `https://www.facebook.com/${FB_VERSION}/dialog/oauth?${params}`;
}

// Consumes the one-time state row; returns { shop, provider }.
export async function resolveState(state) {
  const row = await db.socialOAuthState.findUnique({ where: { state } });
  if (!row) throw new Error("Invalid or expired connection request. Please try again.");
  await db.socialOAuthState.delete({ where: { state } }).catch(() => {});
  await db.socialOAuthState
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } } })
    .catch(() => {});
  return { shop: row.shop, provider: row.provider };
}

export async function connectWithCode(shop, provider, rawCode) {
  const code = String(rawCode).replace(/#_$/, "");
  const { id, secret } = getCredentials(provider);
  let conn;

  if (provider === "instagram") {
    const short = await getJson("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: id, client_secret: secret, grant_type: "authorization_code",
        redirect_uri: getRedirectUri(), code,
      }),
    });
    const shortToken = short.access_token || short.data?.[0]?.access_token;
    if (!shortToken) throw new Error("Instagram did not return an access token.");
    const long = await getJson(
      `https://graph.instagram.com/access_token?${new URLSearchParams({
        grant_type: "ig_exchange_token", client_secret: secret, access_token: shortToken,
      })}`,
    );
    const me = await getJson(
      `https://graph.instagram.com/${FB_VERSION}/me?${new URLSearchParams({ fields: "user_id,username", access_token: long.access_token })}`,
    );
    conn = {
      accountId: String(me.user_id || me.id || short.user_id || ""),
      accountName: me.username ? `@${me.username}` : "Instagram",
      accessToken: long.access_token,
      tokenExpiresAt: new Date(Date.now() + (long.expires_in || 60 * 24 * 3600) * 1000),
    };
  } else {
    const short = await getJson(
      `https://graph.facebook.com/${FB_VERSION}/oauth/access_token?${new URLSearchParams({
        client_id: id, client_secret: secret, redirect_uri: getRedirectUri(), code,
      })}`,
    );
    const long = await getJson(
      `https://graph.facebook.com/${FB_VERSION}/oauth/access_token?${new URLSearchParams({
        grant_type: "fb_exchange_token", client_id: id, client_secret: secret, fb_exchange_token: short.access_token,
      })}`,
    );
    // Page tokens obtained from a long-lived user token do not expire.
    const pages = await getJson(
      `https://graph.facebook.com/${FB_VERSION}/me/accounts?${new URLSearchParams({
        fields: "id,name,access_token", access_token: long.access_token,
      })}`,
    );
    const page = pages.data?.[0];
    if (!page) throw new Error("No Facebook Page found on this account. Choose a Page when asked for access.");
    conn = { accountId: page.id, accountName: page.name, accessToken: page.access_token, tokenExpiresAt: null };
  }

  if (!conn.accountId) throw new Error("Could not read the account id.");
  await db.socialConnection.upsert({
    where: { shop_provider: { shop, provider } },
    update: { ...conn, lastError: null },
    create: { shop, provider, ...conn },
  });
  await syncVideos(shop, provider);
}

export async function disconnect(shop, provider) {
  await db.socialConnection.deleteMany({ where: { shop, provider } });
  await db.socialVideo.deleteMany({ where: { shop, provider } });
}

// ── Sync ─────────────────────────────────────────────────────────────────────
async function refreshInstagramToken(conn) {
  const json = await getJson(
    `https://graph.instagram.com/refresh_access_token?${new URLSearchParams({
      grant_type: "ig_refresh_token", access_token: conn.accessToken,
    })}`,
  );
  const data = {
    accessToken: json.access_token,
    tokenExpiresAt: new Date(Date.now() + (json.expires_in || 60 * 24 * 3600) * 1000),
  };
  await db.socialConnection.update({ where: { id: conn.id }, data });
  return data.accessToken;
}

async function fetchInstagramVideos(conn) {
  let token = conn.accessToken;
  if (conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() - Date.now() < IG_REFRESH_WITHIN_MS) {
    try { token = await refreshInstagramToken(conn); } catch { /* still valid for now; surfaced if the fetch fails */ }
  }
  const json = await getJson(
    `https://graph.instagram.com/${FB_VERSION}/me/media?${new URLSearchParams({
      fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
      limit: "50", access_token: token,
    })}`,
  );
  const all = json.data || [];
  const isVideo = all.filter((m) => m.media_type === "VIDEO");
  const videos = isVideo.filter((m) => m.media_url)
    .map((m) => ({
      externalId: m.id, caption: m.caption || null, videoUrl: m.media_url,
      thumbnailUrl: m.thumbnail_url || null, permalink: m.permalink,
      postedAt: m.timestamp ? new Date(m.timestamp) : null,
    }));
  return { videos, stats: { posts: all.length, videoPosts: isVideo.length } };
}

async function fetchFacebookVideos(conn) {
  const fields = "id,description,source,picture,permalink_url,created_time";
  const out = new Map();
  // Reels live on a separate edge from regular page videos.
  for (const edge of ["videos", "video_reels"]) {
    try {
      const json = await getJson(
        `https://graph.facebook.com/${FB_VERSION}/${conn.accountId}/${edge}?${new URLSearchParams({
          fields, limit: "50", access_token: conn.accessToken,
        })}`,
      );
      for (const v of json.data || []) {
        if (!v.source) continue;
        out.set(v.id, {
          externalId: v.id, caption: v.description || null, videoUrl: v.source,
          thumbnailUrl: v.picture || null,
          permalink: v.permalink_url ? new URL(v.permalink_url, "https://www.facebook.com").href : `https://www.facebook.com/${v.id}`,
          postedAt: v.created_time ? new Date(v.created_time) : null,
        });
      }
    } catch (err) {
      if (edge === "videos") throw err; // reels edge is optional
    }
  }
  const videos = [...out.values()];
  return { videos, stats: { posts: videos.length, videoPosts: videos.length } };
}

// Pulls the latest videos for one provider; keeps the merchant's hide/show
// choice on videos that are still there and drops ones deleted upstream.
export async function syncVideos(shop, provider) {
  const conn = await db.socialConnection.findUnique({ where: { shop_provider: { shop, provider } } });
  if (!conn) return 0;
  // Stamp the attempt first so concurrent storefront hits don't all re-sync.
  await db.socialConnection.update({ where: { id: conn.id }, data: { lastSyncedAt: new Date() } });
  try {
    const { videos, stats } = provider === "instagram" ? await fetchInstagramVideos(conn) : await fetchFacebookVideos(conn);
    for (const v of videos) {
      await db.socialVideo.upsert({
        where: { shop_provider_externalId: { shop, provider, externalId: v.externalId } },
        update: v,
        create: { shop, provider, ...v },
      });
    }
    await db.socialVideo.deleteMany({
      where: { shop, provider, externalId: { notIn: videos.map((v) => v.externalId) } },
    });
    await db.socialConnection.update({ where: { id: conn.id }, data: { lastError: null } });
    return { count: videos.length, ...stats };
  } catch (err) {
    await db.socialConnection.update({ where: { id: conn.id }, data: { lastError: String(err.message).slice(0, 500) } });
    throw err;
  }
}

// Storefront read: visible videos, newest first. Triggers a background-safe
// re-sync when the stored CDN links are getting old.
export async function getStorefrontVideos(shop, limit = 12) {
  const conns = await db.socialConnection.findMany({ where: { shop } });
  const stale = conns.filter((c) => !c.lastSyncedAt || Date.now() - c.lastSyncedAt.getTime() > SYNC_MAX_AGE_MS);
  await Promise.all(stale.map((c) => syncVideos(shop, c.provider).catch(() => {})));

  const rows = await db.socialVideo.findMany({
    where: { shop, hidden: false },
    orderBy: { postedAt: "desc" },
    take: limit,
  });
  return rows.map((v) => ({
    id: v.id, provider: v.provider, src: v.videoUrl, thumb: v.thumbnailUrl,
    caption: v.caption, permalink: v.permalink,
  }));
}
