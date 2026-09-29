import { useState } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useAdminT } from "../utils/adminTranslations";
import { WIDGETS } from "../utils/widgetCatalog";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const installs = await db.widgetInstall.findMany({
    where: { shop: session.shop },
    select: { widgetKey: true },
  });

  return {
    shop: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    installedKeys: installs.map((i) => i.widgetKey),
  };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const widgetKey = form.get("widgetKey");

  // installedAt is refreshed on every click: the next new "Trust Reviews" block
  // rendered in the Theme Editor (Saved widget = Auto) picks this widget up.
  await db.widgetInstall.upsert({
    where: { shop_widgetKey: { shop: session.shop, widgetKey } },
    update: { installedAt: new Date() },
    create: { shop: session.shop, widgetKey },
  });

  return { ok: true };
}


const C = {
  bg: "#f6f6f8", surface: "#ffffff", border: "#e5e4ec",
  text: "#17171c", muted: "#6b6b78", accent: "#4C6FFF", accentLt: "#eaf0ff",
  green: "#1f7a4d", greenLt: "#e7f4ec", amber: "#4c6fff", amberLt: "#f7f0e2",
};

// Picks a solid color from the widget's gradient (its first stop) so the
// letter badge reads as "colored by this card" without needing its own
// per-widget color field.
function swatch(bg) {
  const match = /#[0-9a-fA-F]{3,8}/.exec(bg || "");
  return match ? match[0] : C.accent;
}

// The card gradients are all pale pastels, so the extracted swatch color is
// too light to read as text on its own — darken it for a solid, high-contrast
// badge fill instead (letter stays white on top).
function darken(hex, amount) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  const num = parseInt(full.slice(0, 6), 16);
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function WidgetCard({ widget, installed, shop, apiKey, onInstallClick }) {
  const navigate = useNavigate();
  const t = useAdminT();
  const canInstall = Boolean(widget.blockHandle);
  const installUrl = canInstall
    ? `https://${shop}/admin/themes/current/editor` +
      `?template=product&addAppBlockId=${encodeURIComponent(apiKey)}/${encodeURIComponent(widget.blockHandle)}` +
      `&target=newAppsSection`
    : null;

  return (
    <div
      onClick={() => navigate(widget.href)}
      style={{
        background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
        overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column",
        boxShadow: "0 1px 4px rgba(0,0,0,.05)", transition: "transform .18s, box-shadow .18s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 10px 28px rgba(81,69,229,.12)";
        e.currentTarget.style.borderColor = "#c7c3f7";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.05)";
        e.currentTarget.style.borderColor = C.border;
      }}
     className="tr-app-routes-app-widgets-div-1">
      <div style={{
        height: 200, background: widget.bg, display: "flex",
        alignItems: "center", justifyContent: "center", position: "relative",
      }} className="tr-app-routes-app-widgets-div-2">
        <img
          src={widget.image || `/images/${encodeURIComponent(widget.title)}.png`}
          alt={`${widget.title} preview`}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", display: "block",
          }}
        />
        <div style={{
          position: "absolute", inset: 0,
          // background: "linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.22))",
        }} />
        <div className="iconss" style={{
          width: 44, height: 44, borderRadius: "50%",
          background: darken(swatch(widget.bg), 0.4),
          boxShadow: "0 2px 8px rgba(0,0,0,.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17, fontWeight: 600, color: "#fff",
        }}>
          {widget.title.charAt(0).toUpperCase()}
        </div>
        {widget.badge && !installed && (
          <span className=" bagesss" style={{
            position: "absolute", top: 10, left: 10, fontSize: 9.5, fontWeight: 600,
            background: C.amber, color: "#fff", borderRadius: 20, padding: "3px 10px",
            letterSpacing: ".04em", textTransform: "uppercase",
          }}>{widget.badge}</span>
        )}
        {installed && (
          <span style={{
            position: "absolute", top: 10, right: 10, fontSize: 10.5, fontWeight: 600,
            background: C.greenLt, color: C.green, borderRadius: 20, padding: "3px 10px",
          }} className="tr-app-routes-app-widgets-span-3">✓ {t.installed}</span>
        )}
      </div>
      <div className="headingss" style={{ padding: "15px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text, letterSpacing: "-.01em" }} className="tr-app-routes-app-widgets-div-4">
          {widget.title}
        </div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.55, flex: 1 }} className="tr-app-routes-app-widgets-div-5">
          {widget.description}
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 6 }} className="tr-app-routes-app-widgets-div-6">
          {canInstall && !installed && (
            <a
              href={installUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => { e.stopPropagation(); onInstallClick(widget.key); }}
              style={{
                fontSize: 14, fontWeight: 600, color: "#fff", background: C.accent,
                borderRadius: 8, padding: "6px 13px", textDecoration: "none",
              }}
             className="tr-app-routes-app-widgets-a-7">
              {t.install} ↗
            </a>
          )}
          <Link
            to={widget.href}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 14, fontWeight: 600,
              color: installed ? "#fff" : C.accent,
              background: installed ? C.accent : C.accentLt,
              border: "none",
              borderRadius: 8, padding: "6px 13px", textDecoration: "none",
            }}
          >
            {canInstall ? `${t.configure} →` : "Learn more →"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WidgetsGalleryPage() {
  const { shop, apiKey, installedKeys } = useLoaderData();
  const t = useAdminT();
  const [installed, setInstalled] = useState(new Set(installedKeys));
  const [search, setSearch] = useState("");

  const markInstalled = (key) => {
    setInstalled((prev) => new Set(prev).add(key));
    const fd = new FormData();
    fd.set("widgetKey", key);
    fetch("/app/widgets", { method: "POST", body: fd }).catch(() => {});
  };

  const filteredWidgets = search.trim()
    ? WIDGETS.filter((w) =>
        w.title.toLowerCase().includes(search.toLowerCase()) ||
        w.description.toLowerCase().includes(search.toLowerCase())
      )
    : WIDGETS;

  const installedCount = WIDGETS.filter((w) => installed.has(w.key)).length;

  return (
<div
  className="app_widgets"
  style={{
    minHeight: "100vh",
    background: `
      radial-gradient(circle at 0% 0%, rgba(141, 180, 214, 0.18), transparent 28%),
      radial-gradient(circle at 100% 8%, rgba(214, 230, 242, 0.48), transparent 30%),
      rgb(242, 247, 251)
    `,
    fontFamily: "var(--app-font-family)",
  }}
>
      {/* <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "28px 24px",
      }}>

        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          marginBottom: 24, gap: 16, flexWrap: "wrap",
        }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: C.text, margin: 0, letterSpacing: "-.02em" }}>
              {t.widgetsTitle}
            </h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
              {t.widgetsSubtitle}
              {installedCount > 0 && (
                <span style={{
                  marginLeft: 10, fontSize: 11.5, fontWeight: 600,
                  color: C.green, background: C.greenLt,
                  padding: "2px 9px", borderRadius: 20,
                }}>
                  {installedCount} {t.installed}
                </span>
              )}
            </p>
          </div>
          <input
            type="search"
            placeholder={t.searchWidgets}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: `1px solid ${C.border}`, borderRadius: 10,
              padding: "8px 14px", fontSize: 13, background: C.surface,
              color: C.text, outline: "none", width: 220,
              boxShadow: "0 1px 3px rgba(0,0,0,.05)",
            }}
          />
        </div>

        {filteredWidgets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No widgets found for "{search}"</div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
            gap: 14,
          }}>
            {filteredWidgets.map((w) => (
              <WidgetCard
                key={w.key}
                widget={w}
                installed={installed.has(w.key)}
                shop={shop}
                apiKey={apiKey}
                onInstallClick={markInstalled}
              />
            ))}
          </div>
        )}

        <p style={{ fontSize: 11.5, color: C.muted, marginTop: 24, lineHeight: 1.6 }}>
          "Install" opens your Theme Editor with the block ready to add. After adding it, pick this widget's name from the block's "Saved widget" setting. Each widget's appearance is saved independently.
        </p>
      </div> */}
      <div
  className="tr-widgets-container"
  style={{
    maxWidth: 1440,
    margin: "0 auto",
    padding: "34px 30px 42px",
    fontFamily: "var(--app-font-family)",
  }}
>
  <style className="tr-app-routes-app-widgets-style-8">{`
    .tr-widgets-search-input {
      transition:
        border-color .16s ease,
        box-shadow .16s ease,
        background .16s ease;
    }

    .tr-widgets-search-input:focus {
      border-color: #8DB4D6 !important;
      background: #FFFFFF !important;
      box-shadow: 0 0 0 3px rgba(141,180,214,.14) !important;
    }

    .tr-widgets-grid > * {
      transition:
        transform .18s ease,
        border-color .18s ease,
        box-shadow .18s ease;
    }

    .tr-widgets-grid > *:hover {
      transform: translateY(-3px);
      border-color: #8DB4D6 !important;
      box-shadow: 0 16px 36px rgba(79,115,146,.12) !important;
    }

    @media (max-width: 768px) {
      .tr-widgets-container {
        padding: 22px 16px 34px !important;
      }

      .tr-widgets-header {
        padding: 20px !important;
      }

      .tr-widgets-search-wrapper {
        width: 100% !important;
      }

      .tr-widgets-search-input {
        width: 100% !important;
      }

      .tr-widgets-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `}</style>

  {/* Header */}
  <div
    className="tr-widgets-header"
    style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 26,
      gap: 20,
      flexWrap: "wrap",
      padding: "24px 26px",
      background:
        "linear-gradient(135deg, #FFFFFF 0%, #F2F7FB 100%)",
      border: "1px solid #D6E6F2",
      borderRadius: 20,
      boxShadow:
        "0 14px 38px rgba(79,115,146,.08)",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {/* top accent */}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 28,
        right: 28,
        height: 2,
        background:
          "linear-gradient(90deg, transparent, #8DB4D6, transparent)",
        opacity: 0.75,
      }}
     className="tr-app-routes-app-widgets-div-9"/>

    <div className="tr-widgets-heading">
      <h1
        className="tr-widgets-title"
        style={{
          fontSize: 27,
          fontWeight: 750,
          color: "#4F7392",
          margin: 0,
          letterSpacing: "-.025em",
          lineHeight: 1.2,
        }}
      >
        {t.widgetsTitle}
      </h1>

      <p
        className="tr-widgets-subtitle"
        style={{
          fontSize: 13,
          color: "#829CAF",
          margin: "7px 0 0",
          lineHeight: 1.55,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {t.widgetsSubtitle}

        {installedCount > 0 && (
          <span
            className="tr-widgets-installed-count"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#4F7392",
              background: "#D6E6F2",
              padding: "4px 10px",
              borderRadius: 20,
              border:
                "1px solid rgba(141,180,214,.45)",
            }}
          >
            {installedCount} {t.installed}
          </span>
        )}
      </p>
    </div>

    {/* Search */}
    <div
      className="tr-widgets-search-wrapper"
      style={{
        position: "relative",
        minWidth: 250,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          color: "#8DB4D6",
          fontSize: 15,
          pointerEvents: "none",
          zIndex: 2,
        }}
       className="tr-app-routes-app-widgets-span-10">
        ⌕
      </span>

      <input
        className="tr-widgets-search-input"
        type="search"
        placeholder={t.searchWidgets}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: 250,
          height: 41,
          border: "1px solid #D6E6F2",
          borderRadius: 11,
          padding: "0 14px 0 38px",
          fontSize: 12.5,
          background: "#FFFFFF",
          color: "#4F7392",
          outline: "none",
          boxShadow:
            "0 5px 14px rgba(141,180,214,.07)",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />
    </div>
  </div>

  {/* Widgets */}
  {filteredWidgets.length === 0 ? (
    <div
      className="tr-widgets-empty-state"
      style={{
        textAlign: "center",
        padding: "72px 24px",
        color: "#829CAF",
        background:
          "linear-gradient(145deg, #FFFFFF 0%, #F7FAFC 100%)",
        border: "1px dashed #C9DDEA",
        borderRadius: 18,
        boxShadow:
          "0 10px 30px rgba(79,115,146,.05)",
      }}
    >
      <div
        className="tr-widgets-empty-message"
        style={{
          fontSize: 14,
          fontWeight: 650,
          color: "#5F7F9A",
        }}
      >
        No widgets found for "{search}"
      </div>
    </div>
  ) : (
    <div
      className="tr-widgets-grid"
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 18,
      }}
    >
      {filteredWidgets.map((w) => (
        <WidgetCard
          key={w.key}
          widget={w}
          installed={installed.has(w.key)}
          shop={shop}
          apiKey={apiKey}
          onInstallClick={markInstalled}
        />
      ))}
    </div>
  )}

  {/* Help */}
  <p
    className="tr-widgets-install-help"
    style={{
      fontSize: 14,
      color: "#829CAF",
      margin: "26px 0 0",
      lineHeight: 1.7,
      padding: "14px 16px",
      background:
        "rgba(255,255,255,.78)",
      border: "1px solid #D6E6F2",
      borderRadius: 12,
      boxShadow:
        "0 5px 16px rgba(79,115,146,.04)",
    }}
  >
    "Install" opens your Theme Editor with the block ready to add. After
    adding it, pick this widget&apos;s name from the block&apos;s "Saved
    widget" setting. Each widget&apos;s appearance is saved independently.
  </p>
</div>
    </div>
  );
}
