import { useEffect, useState } from "react";
import { Link, useLoaderData, useNavigate, useRevalidator } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useAdminT } from "../utils/adminTranslations";
import { WIDGETS, PURPOSES, editorTemplateFor, editorTargetFor } from "../utils/widgetCatalog";
import { guideFor } from "../utils/widgetGuides";
import { getThemeAppBlocks } from "../utils/themeInstalls.server";
import InstallVideo from "./how-to-install-widgets/InstallVideo";
import { WIDGETS as VIDEO_WIDGETS } from "./how-to-install-widgets/guideData";
import { BRAND } from "../utils/brand";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  const [installs, themeBlocks] = await Promise.all([
    db.widgetInstall.findMany({
      where: { shop: session.shop },
      select: { widgetKey: true },
      orderBy: { installedAt: "desc" },
    }),
    getThemeAppBlocks(admin, WIDGETS.flatMap((w) => [w.blockHandle, w.embedHandle]).filter(Boolean)),
  ]);
  const clickedKeys = installs.map((i) => i.widgetKey);

  return {
    shop: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    installedKeys: themeBlocks ? installedFromTheme(themeBlocks, clickedKeys) : clickedKeys,
  };
}

// Turns the live theme's app blocks into widget keys. Several widgets share the
// "reviews-widget" block and are told apart by its "Show this widget" setting;
// "auto" there means the widget most recently sent with "Add to store".
// Widgets with no theme block (e.g. Customer accounts) keep their saved status.
function installedFromTheme(themeBlocks, clickedKeys) {
  const keys = new Set();
  const latestShowcaseKey = clickedKeys.find((k) =>
    WIDGETS.some((w) => w.key === k && w.blockHandle === "reviews-widget"));

  for (const { handle, settings } of themeBlocks) {
    if (handle === "reviews-widget") {
      const key = settings.widget_key && settings.widget_key !== "auto" ? settings.widget_key : latestShowcaseKey;
      if (key) keys.add(key);
      continue;
    }
    WIDGETS
      .filter((w) => w.blockHandle === handle || w.embedHandle === handle)
      .forEach((w) => keys.add(w.key));
  }

  for (const k of clickedKeys) {
    const w = WIDGETS.find((x) => x.key === k);
    if (w && !w.blockHandle && !w.embedHandle) keys.add(k);
  }
  return [...keys];
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

/* ─────────────────────────────────────────
   TOKENS
───────────────────────────────────────── */
const C = {
  bg: "#F6F7F9", surface: "#ffffff", border: "#E4E7EC",
  text: BRAND.navy, body: "#344054", muted: "#667085",
  accent: BRAND.blue, accentDk: BRAND.navy, accentLt: BRAND.blueLight,
  green: "#0B5448", greenLt: "#E6F4F1",
  amber: "#8A5A00", amberLt: "#FEF3DC",
  onAccent: BRAND.onBlue, accentText: BRAND.blueText,
};

const btn = {
  minHeight: 44, padding: "0 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
  fontFamily: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center",
  justifyContent: "center", textDecoration: "none", whiteSpace: "nowrap", boxSizing: "border-box",
};
const btnPrimary   = { ...btn, border: "none", background: C.accent, color: C.onAccent };
const btnSecondary = { ...btn, border: "1px solid #D0D5DD", background: "#fff", color: C.text };

const PAGE_SIZE = 9;

// The three widgets almost every store needs, pinned in a "Start here" row at
// the top so new merchants know what to install first.
const ESSENTIALS = [
  { key: "inline_rating",      where: "Product page — stars under the title" },
  { key: "write_review",       where: "Product page — reviews + Write a review button" },
  { key: "collection_ratings", where: "Collection pages — stars on every product card" },
];
const ESSENTIAL_KEYS = new Set(ESSENTIALS.map((e) => e.key));

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

function installUrlFor(widget, shop, apiKey) {
  // App embed: opens Theme Editor → App embeds with it switched on.
  if (widget.embedHandle) {
    return `https://${shop}/admin/themes/current/editor` +
      `?context=apps&activateAppId=${encodeURIComponent(apiKey)}/${encodeURIComponent(widget.embedHandle)}`;
  }
  if (!widget.blockHandle) return null;
  return `https://${shop}/admin/themes/current/editor` +
    `?template=${editorTemplateFor(widget.blockHandle)}&addAppBlockId=${encodeURIComponent(apiKey)}/${encodeURIComponent(widget.blockHandle)}` +
    `&target=${editorTargetFor(widget.blockHandle)}`;
}

/* ─────────────────────────────────────────
   WIDGET CARD — image, name, one line of text, ONE button.
   (Clicking anywhere on the card still opens the widget's
   settings page, exactly like before.)
───────────────────────────────────────── */
function WidgetCard({ widget, installed, shop, apiKey, onInstallClick, onGuideClick }) {
  const navigate = useNavigate();
  const t = useAdminT();
  const canInstall = Boolean(widget.blockHandle || widget.embedHandle);
  const installUrl = installUrlFor(widget, shop, apiKey);
  // An app embed has no settings page in the app — its settings live in the
  // Theme Editor, so the card opens the guide and "Customize" opens the editor.
  const isEmbed = Boolean(widget.embedHandle);

  const openCard = () => (isEmbed ? onGuideClick(widget) : navigate(widget.href));

  let action;
  if (isEmbed) {
    action = installed ? (
      <a href={installUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={btnSecondary}>
        Customize ↗
      </a>
    ) : (
      <a
        href={installUrl} target="_blank" rel="noreferrer" style={btnPrimary}
        onClick={(e) => { e.stopPropagation(); onInstallClick(widget.key); }}
      >
        {t.install} ↗
      </a>
    );
  } else if (canInstall && !installed) {
    action = (
      <a
        href={installUrl} target="_blank" rel="noreferrer" style={btnPrimary}
        onClick={(e) => { e.stopPropagation(); onInstallClick(widget.key); }}
      >
        {t.install} ↗
      </a>
    );
  } else {
    action = (
      <Link to={widget.href} onClick={(e) => e.stopPropagation()} style={btnSecondary}>
        {canInstall ? `${t.configure} →` : "Learn more →"}
      </Link>
    );
  }

  return (
    <div
      className="tr-widget-card"
      role="group"
      tabIndex={0}
      aria-label={widget.title}
      onClick={openCard}
      onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) openCard(); }}
      style={{
        background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden",
        cursor: "pointer", display: "flex", flexDirection: "column",
        boxShadow: "0 1px 2px rgba(16,24,40,.05), 0 4px 14px rgba(16,24,40,.04)",
      }}
    >
      {/* Image (falls back to the widget colour + its first letter) */}
      <div style={{
        height: 160, background: widget.bg, display: "flex", alignItems: "center",
        justifyContent: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", background: darken(swatch(widget.bg), 0.4),
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17, fontWeight: 600, color: "#fff",
        }}>
          {widget.title.charAt(0).toUpperCase()}
        </div>
        {widget.image && (
          <img
            src={widget.image}
            alt={`${widget.title} preview`}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "top", display: "block",
            }}
          />
        )}
      </div>

      <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{widget.title}</div>
          {installed && (
            <span style={{ fontSize: 12, fontWeight: 600, color: C.accentDk, background: C.accentLt, borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap" }}>
              ✓ {t.installed}
            </span>
          )}
          {!installed && widget.badge && (
            <span style={{ fontSize: 12, fontWeight: 600, color: C.amber, background: C.amberLt, borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap" }}>
              {widget.badge}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onGuideClick(widget); }}
            title="What does this widget do?"
            aria-label={`How ${widget.title} works`}
            style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: "50%", cursor: "pointer",
              border: `1px solid ${C.border}`, background: "#fff", color: C.muted,
              fontSize: 13, fontWeight: 700, fontFamily: "Georgia, serif", lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            i
          </button>
        </div>

        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.55, flex: 1 }}>{widget.description}</div>

        <div style={{ marginTop: 4, display: "flex", justifyContent: "flex-end" }}>{action}</div>
      </div>
    </div>
  );
}

// "Shows reviews + Write a review" / "Shows reviews only" / … — tells the
// merchant at a glance which widget lets customers leave a review.
// (Used inside the ⓘ guide; the cards stay clean and the filter chips do this job.)
function PurposeTag({ purpose }) {
  const p = PURPOSES[purpose];
  return (
    <span style={{
      alignSelf: "flex-start", display: "inline-flex", alignItems: "center",
      fontSize: 12, fontWeight: 650, color: p.color, background: p.bg,
      borderRadius: 20, padding: "3px 10px",
    }}>
      {p.label}
    </span>
  );
}

// ⓘ guide: what the widget does, where it shows, how to install it — with the
// same 20-second Theme Editor walkthrough as the public install guide.
function WidgetGuideModal({ widget, shop, apiKey, installed, onInstallClick, onClose }) {
  const navigate = useNavigate();
  const t = useAdminT();
  const guide = guideFor(widget);
  const video = VIDEO_WIDGETS.find((w) => w.key === widget.key && w.hasVideo);
  const installUrl = installUrlFor(widget, shop, apiKey);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const label = { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", margin: "18px 0 6px" };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(23,32,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="widget-guide-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto", background: C.surface,
          borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 24px 60px rgba(23,32,42,.25)",
          padding: "20px 22px", fontFamily: "var(--app-font-family)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="widget-guide-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>{widget.title}</h2>
            {PURPOSES[widget.purpose] && <div style={{ marginTop: 8, display: "flex" }}><PurposeTag purpose={widget.purpose} /></div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ border: `1px solid ${C.border}`, background: C.bg, color: C.text, borderRadius: 8, width: 32, height: 32, fontSize: 15, cursor: "pointer", flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        <div style={label}>What it does</div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: C.text }}>{widget.description}</p>

        <div style={label}>Where it shows on your store</div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: C.text }}>{guide.where}</p>

        <div style={label}>How to use it</div>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: C.text }}>
          {guide.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>

        {guide.tip && (
          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: "#FFF9E8", border: "1px solid #F2D58A", fontSize: 13, lineHeight: 1.55, color: "#7A5212" }}>
            💡 {guide.tip}
          </div>
        )}

        {video && (
          <>
            <div style={label}>Watch: installing it in the Theme Editor</div>
            <InstallVideo widget={video} />
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
          {widget.embedHandle ? (
            <a href={installUrl} target="_blank" rel="noreferrer" style={btnSecondary}>
              Customize ↗
            </a>
          ) : (
            <button type="button" onClick={() => navigate(widget.href)} style={btnSecondary}>
              {installUrl ? "Configure →" : "Learn more →"}
            </button>
          )}
          {installUrl && !installed && (
            <a
              href={installUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => onInstallClick(widget.key)}
              style={btnPrimary}
            >
              {t.install} ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
export default function WidgetsGalleryPage() {
  const { shop, apiKey, installedKeys } = useLoaderData();
  const t = useAdminT();
  const [installed, setInstalled] = useState(new Set(installedKeys));
  const revalidator = useRevalidator();

  // The loader reads the live theme, so take its answer whenever it reloads…
  useEffect(() => { setInstalled(new Set(installedKeys)); }, [installedKeys]);

  // …and reload when the merchant comes back from the Theme Editor tab, so a
  // block they added or removed there shows up here without a manual refresh.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && revalidator.state === "idle") revalidator.revalidate();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [revalidator]);
  const [search, setSearch] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("all");
  const [installedOnly, setInstalledOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [guideWidget, setGuideWidget] = useState(null);

  const markInstalled = (key) => {
    setInstalled((prev) => new Set(prev).add(key));
    const fd = new FormData();
    fd.set("widgetKey", key);
    fetch("/app/widgets", { method: "POST", body: fd }).catch(() => {});
  };

  const filteredWidgets = WIDGETS
    .filter((w) => purposeFilter === "all" || w.purpose === purposeFilter)
    .filter((w) => !installedOnly || installed.has(w.key))
    .filter((w) => !search.trim() ||
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase())
    );

  const installedCount = WIDGETS.filter((w) => installed.has(w.key)).length;

  // Show the first 9 until the merchant searches, filters or taps "Show all".
  const isFiltering = Boolean(search.trim()) || installedOnly || purposeFilter !== "all";
  // Unfiltered, the essentials sit in "Start here", so leave them out of the grid below.
  const gridWidgets = isFiltering ? filteredWidgets : filteredWidgets.filter((w) => !ESSENTIAL_KEYS.has(w.key));
  const visibleWidgets = showAll || isFiltering ? gridWidgets : gridWidgets.slice(0, PAGE_SIZE);
  const hasMore = !showAll && !isFiltering && gridWidgets.length > PAGE_SIZE;
  const essentials = ESSENTIALS
    .map((e) => ({ ...e, widget: WIDGETS.find((w) => w.key === e.key) }))
    .filter((e) => e.widget);

  const FILTERS = [["all", { label: "All widgets" }], ...Object.entries(PURPOSES)];

  return (
    <div className="app_widgets" style={{ minHeight: "100vh", background: C.bg, fontFamily: "var(--app-font-family)" }}>
      <style className="tr-widgets-style">{`
        .tr-widget-card { transition: border-color .15s ease, box-shadow .15s ease; }
        .tr-widget-card:hover { border-color: #B9D7F8 !important; box-shadow: 0 8px 24px rgba(16,24,40,.10) !important; }
        .tr-widgets-container button:not(:disabled):hover,
        .tr-widgets-container a:hover { filter: brightness(.96); }
        .tr-widgets-container button:focus-visible,
        .tr-widgets-container a:focus-visible,
        .tr-widgets-container input:focus-visible,
        .tr-widget-card:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; }
        .tr-widgets-filters { overflow-x: auto; }
        .tr-essential > .tr-widget-card { flex: 1; }
        @media (max-width: 700px) {
          .tr-widgets-container { padding: 20px 14px 40px !important; }
          .tr-widgets-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        className="tr-widgets-container"
        style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 56px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* Header */}
        <div className="tr-widgets-header" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div className="tr-widgets-heading">
            <h1 className="tr-widgets-title" style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>
              {t.widgetsTitle}
            </h1>
            <p className="tr-widgets-subtitle" style={{ margin: "4px 0 0", fontSize: 15, color: C.muted }}>
              {t.widgetsSubtitle}
            </p>
          </div>
          <div className="tr-widgets-search-wrapper" style={{ position: "relative", flex: "1 1 260px", maxWidth: 340 }}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: 14, top: 13 }}>
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              className="tr-widgets-search-input"
              type="search"
              aria-label={t.searchWidgets}
              placeholder={t.searchWidgets}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                boxSizing: "border-box", width: "100%", height: 44, padding: "0 14px 0 42px",
                border: "1px solid #D0D5DD", borderRadius: 10, fontSize: 14, background: "#fff",
                color: C.text, fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Start here — the must-have widgets */}
        {!isFiltering && essentials.length > 0 && (
          <section aria-labelledby="tr-start-here" style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20,
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div>
              <h2 id="tr-start-here" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>
                Start here — install these 3 first
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: C.muted }}>
                Stars on your products, a place for customers to write reviews, and stars on collection pages.
              </p>
            </div>
            <div className="tr-widgets-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {essentials.map(({ widget, where }, i) => (
                <div key={widget.key} className="tr-essential" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: C.accentDk }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%", background: C.accent, color: C.onAccent,
                      display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    {where}
                  </div>
                  <WidgetCard
                    widget={widget}
                    installed={installed.has(widget.key)}
                    shop={shop}
                    apiKey={apiKey}
                    onInstallClick={markInstalled}
                    onGuideClick={setGuideWidget}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {!isFiltering && (
          <h2 style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 700, color: C.text }}>More widgets</h2>
        )}

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div className="tr-widgets-filters" role="tablist" style={{ display: "flex", gap: 6 }}>
            {FILTERS.map(([key, p]) => {
              const active = purposeFilter === key;
              const count = key === "all" ? WIDGETS.length : WIDGETS.filter((w) => w.purpose === key).length;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setPurposeFilter(key); setShowAll(false); }}
                  style={{
                    minHeight: 44, padding: "0 16px", border: "none", borderRadius: 10, whiteSpace: "nowrap",
                    fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    background: active ? C.accentLt : "transparent", color: active ? C.accentDk : "#475467",
                  }}
                >
                  {p.label} <span style={{ fontWeight: 500, marginLeft: 2 }}>{count}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => { setInstalledOnly((v) => !v); setShowAll(false); }}
            aria-pressed={installedOnly}
            style={{
              ...btnSecondary,
              background: installedOnly ? C.accentLt : "#fff",
              color: installedOnly ? C.accentDk : C.body,
              borderColor: installedOnly ? C.accent : "#D0D5DD",
            }}
          >
            {t.installed} only · {installedCount}
          </button>
        </div>

        {/* Widgets */}
        {visibleWidgets.length === 0 ? (
          <div className="tr-widgets-empty-state" style={{
            textAlign: "center", padding: "56px 24px", color: C.muted, fontSize: 15,
            background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16,
          }}>
            {search.trim() ? `No widgets found for "${search}"` : "No widgets match these filters."}
          </div>
        ) : (
          <div className="tr-widgets-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {visibleWidgets.map((w) => (
              <WidgetCard
                key={w.key}
                widget={w}
                installed={installed.has(w.key)}
                shop={shop}
                apiKey={apiKey}
                onInstallClick={markInstalled}
                onGuideClick={setGuideWidget}
              />
            ))}
          </div>
        )}

        {hasMore && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 8 }}>
            <span style={{ fontSize: 14, color: C.muted }}>Showing {PAGE_SIZE} of {gridWidgets.length} widgets</span>
            <button onClick={() => setShowAll(true)} style={btnSecondary}>Show all widgets</button>
          </div>
        )}

        <p className="tr-widgets-install-help" style={{ margin: "8px 0 0", fontSize: 13, color: C.muted, lineHeight: 1.6, maxWidth: 760 }}>
          "Add to store" opens your Theme Editor with the block ready to add. After adding it, pick this widget&apos;s name
          from the block&apos;s "Saved widget" setting. Each widget&apos;s appearance is saved independently.
        </p>
      </div>

      {guideWidget && (
        <WidgetGuideModal
          widget={guideWidget}
          shop={shop}
          apiKey={apiKey}
          installed={installed.has(guideWidget.key)}
          onInstallClick={markInstalled}
          onClose={() => setGuideWidget(null)}
        />
      )}
    </div>
  );
}