import { useLoaderData, Link, Form, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  let templates = [];
  let dbError = null;
  try {
    templates = await db.widgetTemplate.findMany({
      where: { shop: session.shop },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  } catch (e) {
    dbError = "WidgetTemplate table not found. Run: npx prisma db push";
  }
  return { templates, dbError };
}

// Map template layout name → widget's defaultStyle value
const LAYOUT_TO_STYLE = {
  grid:     "star_summary",
  list:     "list_view",
  masonry:  "masonry_wall",
  slider:   "slider",
  compact:  "compact_rows",
  featured: "summary_side",
};

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const fd = await request.formData();
  const type = fd.get("actionType");
  const id   = fd.get("id");

  if (type === "delete") {
    await db.widgetTemplate.deleteMany({ where: { id, shop: session.shop } });
  }

  if (type === "setDefault") {
    // Fetch template to read its settings
    const tpl = await db.widgetTemplate.findUnique({ where: { id } });
    const s = (tpl?.blocks && typeof tpl.blocks === "object" && !Array.isArray(tpl.blocks))
      ? tpl.blocks : {};

    // 1. Mark as active template
    await db.widgetTemplate.updateMany({ where: { shop: session.shop }, data: { isDefault: false } });
    await db.widgetTemplate.update({ where: { id }, data: { isDefault: true } });

    // 2. Push template → Widget table so the storefront widget picks it up immediately
    const widgetData = {
      defaultStyle:       LAYOUT_TO_STYLE[s.layout]  || "dark_grid",
      accentColor:        s.accentColor               || "#6B1A2C",
      starColor:          s.starColor                 || "#F59E0B",
      cardBackground:     s.cardBg                    || "#FFFFFF",
      textColor:          s.textColor                 || "#333333",
      borderColor:        s.cardBorderColor            || "#E5E5E5",
      showVerified:       s.showVerified               ?? true,
      showAvatar:         s.showAvatar                 ?? true,
      showDate:           s.showDate                   ?? true,
      maxReviews:         s.maxReviews                 || 6,
      columns:            s.columnsDesktop             || 3,
      tabletColumns:      s.columnsTablet              || 2,
      mobileColumns:      s.columnsMobile              || 1,
      cardGap:            s.gap                        || 16,
      borderRadius:       s.cardRadius                 || 12,
      showShadow:         (s.cardShadow || "soft") !== "none",
      heading:            s.headingText                || "What our customers say",
      headingSize:        s.headingSize                || 28,
      cardPadding:        s.cardPadding                || 18,
      showWriteReviewBtn: s.showWriteBtn               ?? false,
      fontFamily:         s.fontFamily                 || "inherit",
    };

    await db.widget.upsert({
      where:  { shop_widgetKey: { shop: session.shop, widgetKey: "review_widget" } },
      create: { shop: session.shop, widgetKey: "review_widget", ...widgetData },
      update: widgetData,
    });

    return { activated: tpl?.name || "Template" };
  }

  return null;
}

const C = {
  accent: "#6B1A2C", accentL: "#f5e6e9",
  bg: "#f7f8fa", surface: "#fff", border: "#e4e4e4",
  text: "#1a1a1a", muted: "#6b7280",
};

export default function CustomizePage() {
  const { templates, dbError } = useLoaderData();
  const actionData = useActionData();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", background: C.bg, minHeight: "100vh" }}>
      {/* DB error banner */}
      {dbError && (
        <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "#9a3412", marginBottom: 4 }}>Database table missing</div>
            <div style={{ fontSize: 12.5, color: "#7c2d12" }}>
              The <strong>WidgetTemplate</strong> table does not exist yet. Run the following command in your terminal, then restart the dev server:
            </div>
            <code style={{ display: "inline-block", marginTop: 8, padding: "6px 12px", background: "#1e293b", color: "#e2e8f0", borderRadius: 7, fontSize: 12, fontFamily: "monospace" }}>
              npx prisma db push
            </code>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Widget Templates</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
            Design custom review form layouts — choose blocks, set colors, and activate.
          </p>
        </div>
        <Link
          to="/app/customize/new"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 22px", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
            background: C.accent, color: "#fff", textDecoration: "none",
            boxShadow: "0 2px 8px rgba(107,26,44,.25)",
          }}
        >
          + New Template
        </Link>
      </div>

      {/* ── Activation success banner ── */}
      {actionData?.activated && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          background: "#f0fdf4", border: "1.5px solid #bbf7d0",
          borderRadius: 12, padding: "14px 18px", marginBottom: 20,
        }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "#166534" }}>
              "{actionData.activated}" is now active on your storefront
            </div>
            <div style={{ fontSize: 12, color: "#166534", opacity: 0.8, marginTop: 2 }}>
              Open any product page — the widget will use this template's colors, layout and settings automatically.
            </div>
          </div>
        </div>
      )}

      {/* ── How it works ── */}
      <div style={{
        background: "#eff6ff", border: "1.5px solid #bfdbfe",
        borderRadius: 14, padding: "18px 20px", marginBottom: 24,
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1e40af", marginBottom: 12 }}>
          How templates work
        </div>
        <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
          {[
            { n: "1", icon: "🎨", title: "Design a template", body: "Create a template here — pick layout, colors, card style, typography, and more." },
            { n: "2", icon: "⚡", title: "Click Activate",    body: "Activating a template instantly pushes its settings to your storefront review widget." },
            { n: "3", icon: "🛍️", title: "Live on your store", body: "Open any product page — the reviews widget shows your template design automatically." },
          ].map(({ n, icon, title, body }) => (
            <div key={n} style={{ flex: "1 1 180px", display: "flex", gap: 12, padding: "0 16px 0 0" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{n}</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#1e40af", marginBottom: 3 }}>{icon} {title}</div>
                <div style={{ fontSize: 11.5, color: "#1e3a8a", lineHeight: 1.55 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: "10px 14px", background: "#dbeafe", borderRadius: 9, fontSize: 11.5, color: "#1e3a8a" }}>
          <strong>Which widget?</strong> Templates apply to the <strong>Review Widget</strong> block in your Shopify theme. Make sure it's added via{" "}
          <strong>Admin → Online Store → Themes → Customize → Add block → Trust Reviews</strong>.
          Only one template is active at a time — activating a new one replaces the previous one.
        </div>
      </div>

      {templates.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 20px",
          background: C.surface, borderRadius: 18,
          border: `2px dashed ${C.border}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🎨</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6 }}>No templates yet</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
            Build a custom review form — drag in blocks, edit settings, and activate it on your store.
          </div>
          <Link
            to="/app/customize/new"
            style={{
              display: "inline-flex", padding: "11px 26px", borderRadius: 10,
              fontSize: 13.5, fontWeight: 700, background: C.accent, color: "#fff", textDecoration: "none",
            }}
          >
            + Create first template
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 20 }}>
          {templates.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} />)}
          {/* "New" card */}
          <Link to="/app/customize/new" style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            minHeight: 240, borderRadius: 16, border: `2px dashed ${C.border}`,
            background: C.surface, textDecoration: "none", color: C.muted,
            fontSize: 13, fontWeight: 600, gap: 10, transition: "border-color .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <span style={{ fontSize: 32 }}>＋</span>
            New Template
          </Link>
        </div>
      )}
    </div>
  );
}

const LAYOUT_ICONS = { grid: "⊞", list: "☰", compact: "≡", masonry: "⧉", slider: "◀▶" };

function TemplateCard({ tpl }) {
  const s = (tpl.blocks && typeof tpl.blocks === "object" && !Array.isArray(tpl.blocks))
    ? tpl.blocks : {};
  const layout      = s.layout || "grid";
  const starColor   = s.starColor || "#f59e0b";
  const accentColor = s.accentColor || C.accent;
  const cardBg      = s.cardBg || "#fff";
  const borderColor = s.borderColor || "#e4e4e4";
  const borderRadius = s.borderRadius ?? 10;
  const pageBg      = s.pageBg || "#f9fafb";

  // Mini review cards
  function MiniCard({ wide }) {
    return (
      <div style={{
        background: cardBg, border: `1px solid ${borderColor}`,
        borderRadius: Math.min(borderRadius, 8), padding: "7px 9px",
        boxShadow: s.showShadow ? "0 1px 4px rgba(0,0,0,.06)" : "none",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: accentColor, flexShrink: 0 }} />
          <div>
            <div style={{ width: wide ? 48 : 36, height: 5, background: "#ddd", borderRadius: 3, marginBottom: 2 }} />
            <div style={{ display: "flex", gap: 1 }}>
              {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 7, color: i <= 4 ? starColor : "#e0e0e0" }}>★</span>)}
            </div>
          </div>
        </div>
        <div style={{ width: "90%", height: 4, background: "#eee", borderRadius: 3, marginBottom: 2 }} />
        <div style={{ width: "70%", height: 4, background: "#eee", borderRadius: 3 }} />
      </div>
    );
  }

  function LayoutPreview() {
    if (layout === "grid") return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        <MiniCard /><MiniCard wide /><MiniCard wide /><MiniCard />
      </div>
    );
    if (layout === "list") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <MiniCard wide /><MiniCard wide /><MiniCard wide />
      </div>
    );
    if (layout === "compact") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 4, padding: "4px 7px" }}>
            <div style={{ display: "flex", gap: 1 }}>{[1,2,3,4,5].map(j => <span key={j} style={{ fontSize: 6, color: starColor }}>★</span>)}</div>
            <div style={{ flex: 1, height: 4, background: "#eee", borderRadius: 3 }} />
          </div>
        ))}
      </div>
    );
    if (layout === "masonry") return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <MiniCard /><div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: Math.min(borderRadius, 6), padding: "7px 9px", height: 52 }}><div style={{ width: "90%", height: 4, background: "#eee", borderRadius: 3, marginBottom: 2 }} /><div style={{ width: "65%", height: 4, background: "#eee", borderRadius: 3 }} /></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: Math.min(borderRadius, 6), padding: "7px 9px", height: 40 }}><div style={{ width: "80%", height: 4, background: "#eee", borderRadius: 3 }} /></div>
          <MiniCard wide />
        </div>
      </div>
    );
    // slider
    return (
      <div style={{ display: "flex", gap: 5, overflow: "hidden" }}>
        <MiniCard /><MiniCard wide />
      </div>
    );
  }

  return (
    <div style={{
      background: C.surface, borderRadius: 16,
      border: `2px solid ${tpl.isDefault ? C.accent : C.border}`,
      overflow: "hidden", position: "relative",
    }}>
      {tpl.isDefault && (
        <div style={{
          position: "absolute", top: 10, right: 10, zIndex: 2,
          background: C.accent, color: "#fff",
          fontSize: 9, fontWeight: 800, padding: "3px 9px",
          borderRadius: 20, letterSpacing: 0.5, textTransform: "uppercase",
        }}>Active</div>
      )}

      {/* Visual preview */}
      <div style={{ height: 148, background: pageBg, padding: "14px 16px", overflow: "hidden" }}>
        {/* Layout type badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
          <span style={{ fontSize: 12 }}>{LAYOUT_ICONS[layout] || "⊞"}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.4 }}>
            {layout} layout
          </span>
        </div>
        <LayoutPreview />
      </div>

      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tpl.name}
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12 }}>
          Updated {new Date(tpl.updatedAt).toLocaleDateString()}
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <Link to={`/app/customize/${tpl.id}`} style={{
            flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 8,
            fontSize: 12.5, fontWeight: 700, background: C.accentL, color: C.accent, textDecoration: "none",
          }}>Edit</Link>
          {!tpl.isDefault && (
            <Form method="post" style={{ flex: 1 }}>
              <input type="hidden" name="actionType" value="setDefault" />
              <input type="hidden" name="id" value={tpl.id} />
              <button type="submit" style={{
                width: "100%", padding: "7px 0", borderRadius: 8,
                fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0",
              }}>⚡ Activate</button>
            </Form>
          )}
          <Form method="post" onSubmit={e => { if (!confirm("Delete this template?")) e.preventDefault(); }}>
            <input type="hidden" name="actionType" value="delete" />
            <input type="hidden" name="id" value={tpl.id} />
            <button type="submit" style={{
              padding: "7px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
              cursor: "pointer", background: "#fff0f0", color: "#dc2626", border: "1px solid #fecaca",
            }}>Del</button>
          </Form>
        </div>
      </div>
    </div>
  );
}
