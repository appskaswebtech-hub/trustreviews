// "More Apps" — the rest of our Shopify App Store catalog, listed inside the
// app so merchants can discover our other tools without going hunting on the
// App Store. Pure static content (see app/utils/kaswebtechApps.js); the loader
// only runs so an unauthenticated request can't reach the page.
import { useMemo, useState } from "react";
import { authenticate } from "../shopify.server";
import { BRAND } from "../utils/brand";
import {
  APPS, CATEGORIES, PARTNER_NAME, PARTNER_URL, THIS_APP_HANDLE,
  iconUrl, listingUrl,
} from "../utils/kaswebtechApps";

export async function loader({ request }) {
  await authenticate.admin(request);
  return null;
}

const C = {
  bg: "#f6f6f8", surface: "#ffffff", border: "#e5e4ec",
  text: BRAND.navy, muted: "#6b6b78",
  accent: BRAND.blue, accentHover: BRAND.blueHover, accentLt: BRAND.blueLight,
  onAccent: BRAND.onBlue,
  green: "#1f7a4d", greenLt: "#e7f4ec",
  star: "#f0a21b",
};

function Stars({ rating }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, color: C.star, fontSize: 11.5 }} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ opacity: n <= Math.round(rating) ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

// The listing icon with a lettered fallback: an icon URL that has gone stale
// since this list was last synced shouldn't leave a broken image in the grid.
function AppIcon({ app }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div style={{
        width: 56, height: 56, flexShrink: 0, borderRadius: 13,
        background: C.accentLt, color: C.accent,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, fontWeight: 700,
      }} className="tr-app-routes-app-more-apps-div-icon-fallback">
        {app.name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={iconUrl(app)}
      alt=""
      width={56}
      height={56}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{
        width: 56, height: 56, flexShrink: 0, borderRadius: 13,
        objectFit: "cover", border: `1px solid ${C.border}`, background: "#fff",
      }}
      className="tr-app-routes-app-more-apps-img-icon"
    />
  );
}

function AppCard({ app }) {
  const installed = app.handle === THIS_APP_HANDLE;

  return (
    <div
      style={{
        background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: 18, display: "flex", flexDirection: "column", gap: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,.05)", transition: "transform .15s, box-shadow .15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,.05)"; }}
      className="tr-app-routes-app-more-apps-div-card"
    >
      <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }} className="tr-app-routes-app-more-apps-div-card-head">
        <AppIcon app={app} />
        <div style={{ minWidth: 0, flex: 1 }} className="tr-app-routes-app-more-apps-div-card-meta">
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }} className="tr-app-routes-app-more-apps-div-card-title-row">
            <span style={{ fontSize: 14.5, fontWeight: 600, color: C.text, lineHeight: 1.3 }} className="tr-app-routes-app-more-apps-span-name">
              {app.name}
            </span>
            {installed && (
              <span style={{
                fontSize: 10.5, fontWeight: 600, background: C.greenLt, color: C.green,
                borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap",
              }} className="tr-app-routes-app-more-apps-span-installed">
                ✓ Installed
              </span>
            )}
          </div>
          <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }} className="tr-app-routes-app-more-apps-div-card-rating">
            {app.rating ? (
              <>
                <Stars rating={app.rating} />
                <span style={{ fontSize: 11.5, color: C.muted }} className="tr-app-routes-app-more-apps-span-rating">
                  {app.rating.toFixed(1)} ({app.reviews})
                </span>
              </>
            ) : (
              <span style={{ fontSize: 11.5, color: C.muted }} className="tr-app-routes-app-more-apps-span-norating">New</span>
            )}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, margin: 0, flex: 1 }} className="tr-app-routes-app-more-apps-p-tagline">
        {app.tagline}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }} className="tr-app-routes-app-more-apps-div-card-foot">
        <span style={{ fontSize: 11.5, fontWeight: 500, color: C.text }} className="tr-app-routes-app-more-apps-span-pricing">
          {app.pricing}
        </span>
        {/* External link: it can't navigate the Shopify admin iframe, so it has
            to open in a new tab. */}
        <a
          href={listingUrl(app.handle)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12, fontWeight: 600, textDecoration: "none", borderRadius: 8,
            padding: "7px 14px", whiteSpace: "nowrap",
            color: installed ? C.accent : C.onAccent,
            background: installed ? "transparent" : C.accent,
            border: installed ? `1px solid ${C.border}` : "none",
          }}
          onMouseEnter={(e) => { if (!installed) e.currentTarget.style.background = C.accentHover; }}
          onMouseLeave={(e) => { if (!installed) e.currentTarget.style.background = C.accent; }}
          className="tr-app-routes-app-more-apps-a-view"
        >
          {installed ? "View listing" : "Get app →"}
        </a>
      </div>
    </div>
  );
}

export default function MoreAppsPage() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return APPS.filter((app) => {
      if (category !== "all" && app.category !== category) return false;
      if (!q) return true;
      return `${app.name} ${app.tagline}`.toLowerCase().includes(q);
    });
  }, [category, query]);

  return (
    <div style={{ fontFamily: "var(--app-font-family)", background: C.bg, minHeight: "100vh", padding: 28 }} className="tr-app-routes-app-more-apps-div-page">
      <h1 style={{ fontSize: 24, fontWeight: 600, color: C.text, margin: "0 0 4px" }} className="tr-app-routes-app-more-apps-h1">
        More apps from us
      </h1>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px", maxWidth: 620, lineHeight: 1.6 }} className="tr-app-routes-app-more-apps-p-intro">
        {APPS.length} Shopify apps built by the {PARTNER_NAME} team — bundles, upsells, wishlists,
        subscriptions and more. Each one opens on the Shopify App Store in a new tab.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }} className="tr-app-routes-app-more-apps-div-filters">
        {CATEGORIES.map((cat) => {
          const active = cat.key === category;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategory(cat.key)}
              style={{
                fontSize: 12.5, fontWeight: 500, cursor: "pointer", borderRadius: 20,
                padding: "7px 14px",
                color: active ? C.accent : C.muted,
                background: active ? C.accentLt : C.surface,
                border: `1px solid ${active ? C.accent : C.border}`,
              }}
              className="tr-app-routes-app-more-apps-button-filter"
            >
              {cat.label}
            </button>
          );
        })}

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search apps…"
          aria-label="Search apps"
          style={{
            marginLeft: "auto", fontSize: 12.5, color: C.text, background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 14px",
            minWidth: 190, outline: "none", fontFamily: "inherit",
          }}
          className="tr-app-routes-app-more-apps-input-search"
        />
      </div>

      {visible.length === 0 ? (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: "40px 20px", textAlign: "center", fontSize: 13, color: C.muted,
        }} className="tr-app-routes-app-more-apps-div-empty">
          No apps match &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16,
        }} className="tr-app-routes-app-more-apps-div-grid">
          {visible.map((app) => (
            <AppCard key={app.handle} app={app} />
          ))}
        </div>
      )}

      <div style={{
        marginTop: 22, fontSize: 12.5, color: C.muted, display: "flex",
        gap: 6, flexWrap: "wrap", alignItems: "center",
      }} className="tr-app-routes-app-more-apps-div-footer">
        <span>Want the full list?</span>
        <a
          href={PARTNER_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: BRAND.blueText, fontWeight: 600, textDecoration: "none" }}
          className="tr-app-routes-app-more-apps-a-partner"
        >
          See all our apps on the Shopify App Store →
        </a>
      </div>
    </div>
  );
}
