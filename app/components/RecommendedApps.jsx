// A short strip of our other Shopify apps, shown at the bottom of the
// dashboard (app/routes/app._index.jsx) under the review list. Four picks plus
// a "More apps" link through to the full catalogue at /app/more-apps.
import { useState } from "react";
import { Link } from "react-router";
import { BRAND } from "../utils/brand";
import { iconUrl, listingUrl, recommendedApps } from "../utils/kaswebtechApps";

const C = {
  card: "#FFFFFF", border: "#E4E7EC",
  text: BRAND.navy, muted: "#667085",
  accent: BRAND.blue, accentLt: BRAND.blueLight,
  accentText: BRAND.blueText,
  star: "#f0a21b",
};

// Same lettered fallback as the More Apps page: a listing icon that 404s after
// a rename shouldn't leave a hole in the dashboard.
function Icon({ app }) {
  const [failed, setFailed] = useState(false);
  const box = { width: 40, height: 40, flexShrink: 0, borderRadius: 10 };

  if (failed) {
    return (
      <div
        style={{
          ...box, background: C.accentLt, color: C.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700,
        }}
        className="tr-recommended-apps-icon-fallback"
      >
        {app.name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={iconUrl(app, 48)}
      alt=""
      width={40}
      height={40}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ ...box, objectFit: "cover", border: `1px solid ${C.border}`, background: "#fff" }}
      className="tr-recommended-apps-icon"
    />
  );
}

export default function RecommendedApps({ limit = 4 }) {
  const apps = recommendedApps(limit);
  if (apps.length === 0) return null;

  return (
    <section
      style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: "18px 20px 20px", boxShadow: "0 1px 2px rgba(16,24,40,.04)",
      }}
      className="tr-recommended-apps"
      aria-labelledby="tr-recommended-apps-heading"
    >
      <style className="tr-recommended-apps-style">{`
        .tr-recommended-apps-grid {
          display: grid; gap: 12px;
          grid-template-columns: repeat(${apps.length}, minmax(0, 1fr));
        }
        .tr-recommended-apps-item {
          display: flex; gap: 11px; align-items: flex-start;
          padding: 12px; border: 1px solid ${C.border}; border-radius: 12px;
          text-decoration: none; background: #fff;
          transition: border-color .15s, box-shadow .15s, transform .15s;
        }
        .tr-recommended-apps-item:hover {
          border-color: ${C.accent}; transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16,24,40,.08);
        }
        @media (max-width: 1000px) {
          .tr-recommended-apps-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 560px) {
          .tr-recommended-apps-grid { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>

      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap", marginBottom: 14,
      }} className="tr-recommended-apps-head">
        <div>
          <h2
            id="tr-recommended-apps-heading"
            style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}
          >
            Recommended apps
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: C.muted }} className="tr-recommended-apps-sub">
            More tools from our team to pair with your reviews.
          </p>
        </div>

        <Link
          to="/app/more-apps"
          style={{ fontSize: 12.5, fontWeight: 600, color: C.accentText, textDecoration: "none", whiteSpace: "nowrap" }}
          className="tr-recommended-apps-more-link"
        >
          More apps →
        </Link>
      </div>

      <div className="tr-recommended-apps-grid">
        {apps.map((app) => (
          // External link: it can't navigate the Shopify admin iframe, so it
          // has to open in a new tab.
          <a
            key={app.handle}
            href={listingUrl(app.handle, "dashboard-strip")}
            target="_blank"
            rel="noopener noreferrer"
            className="tr-recommended-apps-item"
          >
            <Icon app={app} />
            <span style={{ minWidth: 0 }}>
              <span style={{
                display: "block", fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.3,
              }} className="tr-recommended-apps-item-name">
                {app.name}
              </span>
              <span style={{
                display: "block", marginTop: 3, fontSize: 11.5, color: C.muted, lineHeight: 1.45,
              }} className="tr-recommended-apps-item-tagline">
                {app.tagline}
              </span>
              {app.rating ? (
                <span style={{
                  display: "block", marginTop: 5, fontSize: 11, color: C.muted,
                }} className="tr-recommended-apps-item-rating">
                  <span style={{ color: C.star }} aria-hidden="true">★</span>{" "}
                  {app.rating.toFixed(1)} ({app.reviews})
                </span>
              ) : null}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
