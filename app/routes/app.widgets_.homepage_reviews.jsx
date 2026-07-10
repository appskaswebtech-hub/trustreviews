import { useState, useCallback } from "react";
import { useLoaderData, useFetcher, Link } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// ── Loader ────────────────────────────────────────────────────────────────────
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const widget = await db.widget.findUnique({
    where: { shop_widgetKey: { shop: session.shop, widgetKey: "homepage_reviews" } },
  });
  return { settings: widget || {} };
}

// ── Action ────────────────────────────────────────────────────────────────────
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const body = await request.json();

  const data = {
    // layout & display
    defaultStyle:    body.layout         || "summary_carousel",
    maxReviews:      Number(body.maxReviews)     || 9,
    columns:         Number(body.columns)        || 3,
    // colors
    accentColor:     body.accentColor    || "#f59e0b",
    starColor:       body.starColor      || "#f59e0b",
    backgroundColor: body.pageBg         || "transparent",
    cardBackground:  body.cardBg         || "#ffffff",
    textColor:       body.textColor      || "#111111",
    borderColor:     body.cardBorder     || "#e5e5e5",
    // typography
    fontFamily:      body.fontFamily     || "inherit",
    headingSize:     Number(body.headingSize)    || 36,
    reviewSize:      Number(body.reviewSize)     || 14,
    // card
    cardPadding:     Number(body.cardPadding)    || 20,
    borderRadius:    Number(body.cardRadius)     || 8,
    showShadow:      body.showShadow     !== false,
    cardGap:         Number(body.gap)            || 20,
    // panel
    heading:         body.headingText    || "Customer Reviews",
    // toggles
    showVerified:    body.showVerified   !== false,
    showAvatar:      body.showMedia      !== false,
    paddingTop:      Number(body.paddingTop)     || 60,
    paddingBottom:   Number(body.paddingBottom)  || 60,
  };

  await db.widget.upsert({
    where: { shop_widgetKey: { shop: session.shop, widgetKey: "homepage_reviews" } },
    create: { shop: session.shop, widgetKey: "homepage_reviews", ...data },
    update: data,
  });

  return { saved: true };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const LAYOUTS = [
  { key: "summary_carousel", label: "Summary + Carousel", desc: "Rating panel left + review carousel", icon: "⊞◁▷" },
  { key: "grid",             label: "Card Grid",          desc: "Responsive 3-column grid",            icon: "⊞⊞⊞" },
  { key: "masonry",          label: "Masonry",            desc: "Pinterest-style columns",             icon: "⊟⊞⊟" },
  { key: "spotlight",        label: "Spotlight",          desc: "Stats panel + featured reviews",      icon: "★≡" },
  { key: "ticker",           label: "Scrolling Ticker",   desc: "Auto-scrolling review strip",         icon: "▶▶▶" },
];

const FONTS = [
  { value: "inherit",                   label: "Theme Default" },
  { value: "system-ui, sans-serif",     label: "System UI" },
  { value: "Georgia, serif",            label: "Georgia (Serif)" },
  { value: "'Courier New', monospace",  label: "Monospace" },
  { value: "'Arial', sans-serif",       label: "Arial" },
];

const DS = {
  layout: "summary_carousel", maxReviews: 9, columns: 3,
  accentColor: "#f59e0b", starColor: "#f59e0b",
  pageBg: "transparent", cardBg: "#ffffff", textColor: "#111111",
  cardBorder: "#e5e5e5", panelBg: "#111111", panelText: "#ffffff",
  fontFamily: "inherit", headingSize: 36, reviewSize: 14, nameSize: 14,
  cardPadding: 20, cardRadius: 8, showShadow: true, gap: 20,
  headingText: "Customer Reviews", headingAlign: "center",
  showVerified: true, showMedia: true, paddingTop: 60, paddingBottom: 60,
};

const C = {
  bg: "#f0f2f7", surface: "#fff", border: "#e4e7ef",
  text: "#0f1623", muted: "#6b7280", accent: "#5145e5",
  green: "#16a34a", greenLt: "#dcfce7",
};

// ── Sample reviews for preview ────────────────────────────────────────────────
const SAMPLES = [
  { name: "Cora P.", rating: 5, text: "Used on my BMW 220i no problem!", verified: true, img: true },
  { name: "Russ S.", rating: 5, text: "Much better than the bulky locks I've had before 👍 Quality stuff", verified: true, img: true },
  { name: "Jamie F.", rating: 5, text: "Solid bit of kit. Easy to use, no one's getting through this without a fight.", verified: true, img: true },
];

function StarRow({ rating, color, size }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= rating ? (color || "#f59e0b") : "#e0e0e0", fontSize: size || 14 }}>★</span>
      ))}
    </span>
  );
}

function PreviewSummaryCar({ s }) {
  return (
    <div style={{ display: "flex", borderRadius: s.cardRadius, overflow: "hidden", boxShadow: s.showShadow ? "0 4px 20px rgba(0,0,0,.1)" : "none" }}>
      <div style={{
        background: s.panelBg, color: s.panelText, minWidth: 150, padding: "28px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }}>
        <div style={{ color: s.accentColor, fontWeight: 700, fontSize: 14 }}>Excellent</div>
        <div style={{ fontSize: 18, letterSpacing: 2, color: "#fff" }}>★★★★★</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.9)" }}>4.9 average</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>222 reviews</div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, padding: "0 4px", overflow: "hidden", background: s.pageBg === "transparent" ? "#fafafa" : s.pageBg }}>
        <span style={{ fontSize: 24, cursor: "pointer", padding: "0 4px", color: s.textColor }}>‹</span>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, padding: "12px 4px" }}>
          {SAMPLES.map((r, i) => (
            <div key={i} style={{
              background: s.cardBg, border: `1px solid ${s.cardBorder}`, borderRadius: s.cardRadius,
              padding: s.cardPadding * 0.6, display: "flex", flexDirection: "column", gap: 6,
              boxShadow: s.showShadow ? "0 2px 8px rgba(0,0,0,.07)" : "none",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 11, color: s.textColor }}>{r.name}</span>
                <StarRow rating={r.rating} color={s.starColor} size={10} />
              </div>
              {s.showVerified && <div style={{ fontSize: 9, color: "#16a34a" }}>✓ Verified purchase</div>}
              <div style={{ fontSize: 10, color: s.textColor === "#111111" ? "#444" : s.textColor, lineHeight: 1.4 }}>{r.text.slice(0, 50)}…</div>
              {s.showMedia && r.img && <div style={{ width: 30, height: 30, background: "#ddd", borderRadius: 4, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>🖼</div>}
            </div>
          ))}
        </div>
        <span style={{ fontSize: 24, cursor: "pointer", padding: "0 4px", color: s.textColor }}>›</span>
      </div>
    </div>
  );
}

function PreviewGrid({ s }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: s.gap * 0.6 }}>
      {SAMPLES.map((r, i) => (
        <div key={i} style={{
          background: s.cardBg, border: `1px solid ${s.cardBorder}`, borderRadius: s.cardRadius,
          padding: s.cardPadding * 0.6, display: "flex", flexDirection: "column", gap: 6,
          boxShadow: s.showShadow ? "0 2px 8px rgba(0,0,0,.07)" : "none",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 11, color: s.textColor }}>{r.name}</span>
            <StarRow rating={r.rating} color={s.starColor} size={10} />
          </div>
          {s.showVerified && <div style={{ fontSize: 9, color: "#16a34a" }}>✓ Verified purchase</div>}
          <div style={{ fontSize: 10, color: "#444", lineHeight: 1.4 }}>{r.text.slice(0, 55)}…</div>
          {s.showMedia && r.img && <div style={{ width: 30, height: 30, background: "#ddd", borderRadius: 4, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>🖼</div>}
        </div>
      ))}
    </div>
  );
}

function PreviewSpotlight({ s }) {
  return (
    <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
      <div style={{ background: s.panelBg, padding: "24px 20px", borderRadius: s.cardRadius, textAlign: "center", minWidth: 120 }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", lineHeight: 1 }}>4.9</div>
        <div style={{ fontSize: 16, color: s.accentColor, margin: "6px 0" }}>★★★★★</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.6)" }}>Based on 222 reviews</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        {SAMPLES.slice(0, 2).map((r, i) => (
          <div key={i} style={{ borderLeft: `3px solid ${s.accentColor}`, paddingLeft: 12 }}>
            <div style={{ fontSize: 10, marginBottom: 3 }}><StarRow rating={r.rating} color={s.starColor} size={10} /></div>
            <div style={{ fontSize: 11, fontStyle: "italic", color: "#444", marginBottom: 4 }}>"{r.text.slice(0, 60)}…"</div>
            <div style={{ fontSize: 10, color: "#888" }}><strong>{r.name}</strong> · ✓ Verified</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewTicker({ s }) {
  return (
    <div style={{ overflow: "hidden", padding: "8px 0", background: s.cardBg, border: `1px solid ${s.cardBorder}`, borderRadius: s.cardRadius }}>
      <div style={{ display: "flex", gap: 14, padding: "4px 8px", whiteSpace: "nowrap" }}>
        {[...SAMPLES, ...SAMPLES].map((r, i) => (
          <div key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 8, background: "#fafafa",
            border: `1px solid ${s.cardBorder}`, borderRadius: 40, padding: "6px 14px", fontSize: 10, whiteSpace: "nowrap",
          }}>
            <StarRow rating={r.rating} color={s.starColor} size={10} />
            <strong style={{ color: s.textColor }}>{r.name}</strong>
            <span style={{ color: "#555" }}>{r.text.slice(0, 35)}…</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LivePreview({ s }) {
  const PreviewMap = {
    summary_carousel: PreviewSummaryCar,
    grid: PreviewGrid,
    masonry: PreviewGrid,
    spotlight: PreviewSpotlight,
    ticker: PreviewTicker,
  };
  const Preview = PreviewMap[s.layout] || PreviewSummaryCar;

  return (
    <div style={{ background: s.pageBg === "transparent" ? "#f8f8f8" : s.pageBg, padding: 24, borderRadius: 10, border: `1px solid ${C.border}` }}>
      <div style={{
        textAlign: s.headingAlign, fontWeight: 900, letterSpacing: "0.05em", textTransform: "uppercase",
        fontSize: Math.min(s.headingSize, 28) * 0.7, color: s.textColor, marginBottom: 20, fontFamily: s.fontFamily,
      }}>
        {s.headingText || "Customer Reviews"}
      </div>
      <Preview s={s} />
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 36, height: 36, border: "none", background: "none", cursor: "pointer", padding: 0 }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{ flex: 1, padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontFamily: "monospace" }} />
      </div>
    </Field>
  );
}

function Section({ title, children, open, onToggle }) {
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button onClick={onToggle} style={{
        width: "100%", textAlign: "left", padding: "14px 16px", background: "none", border: "none",
        cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 13, fontWeight: 700, color: C.text,
      }}>
        {title}
        <span style={{ fontSize: 16, color: C.muted, transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomepageReviewsSettings() {
  const { settings } = useLoaderData();
  const fetcher = useFetcher();
  const saved = fetcher.data?.saved;

  const [s, setS] = useState({
    ...DS,
    layout:        settings.defaultStyle    || DS.layout,
    maxReviews:    settings.maxReviews      || DS.maxReviews,
    columns:       settings.columns         || DS.columns,
    accentColor:   settings.accentColor     || DS.accentColor,
    starColor:     settings.starColor       || DS.starColor,
    pageBg:        settings.backgroundColor || DS.pageBg,
    cardBg:        settings.cardBackground  || DS.cardBg,
    textColor:     settings.textColor       || DS.textColor,
    cardBorder:    settings.borderColor     || DS.cardBorder,
    fontFamily:    settings.fontFamily      || DS.fontFamily,
    headingSize:   settings.headingSize     || DS.headingSize,
    reviewSize:    settings.reviewSize      || DS.reviewSize,
    cardPadding:   settings.cardPadding     || DS.cardPadding,
    cardRadius:    settings.borderRadius    || DS.cardRadius,
    showShadow:    settings.showShadow      !== false,
    gap:           settings.cardGap         || DS.gap,
    headingText:   settings.heading         || DS.headingText,
    showVerified:  settings.showVerified    !== false,
    showMedia:     settings.showAvatar      !== false,
    paddingTop:    settings.paddingTop      || DS.paddingTop,
    paddingBottom: settings.paddingBottom   || DS.paddingBottom,
    panelBg:       DS.panelBg,
    panelText:     DS.panelText,
  });

  const upd = useCallback((key, val) => setS(prev => ({ ...prev, [key]: val })), []);

  const [open, setOpen] = useState("layout");
  const toggle = k => setOpen(prev => prev === k ? null : k);

  const save = () => {
    fetcher.submit(JSON.stringify(s), {
      method: "POST",
      encType: "application/json",
      action: "/app/widgets/homepage_reviews",
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "system-ui, sans-serif" }}>
      {/* Top bar */}
      <div style={{
        height: 54, background: C.surface, borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/app/widgets" style={{ color: C.muted, textDecoration: "none", fontSize: 13 }}>← Widgets</Link>
          <span style={{ color: C.border }}>|</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Homepage Reviews</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saved && <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>✓ Saved</span>}
          <button onClick={save} disabled={fetcher.state !== "idle"} style={{
            background: C.accent, color: "#fff", border: "none", borderRadius: 8,
            padding: "8px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            {fetcher.state !== "idle" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 54px)" }}>
        {/* Settings sidebar */}
        <div style={{ width: 280, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, overflowY: "auto" }}>

          <Section title="Layout" open={open === "layout"} onToggle={() => toggle("layout")}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {LAYOUTS.map(l => (
                <button key={l.key} onClick={() => upd("layout", l.key)} style={{
                  padding: "10px 12px", border: `2px solid ${s.layout === l.key ? C.accent : C.border}`,
                  borderRadius: 8, background: s.layout === l.key ? "#f5f3ff" : C.surface,
                  cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: s.layout === l.key ? C.accent : C.text }}>{l.label}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{l.desc}</div>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Heading" open={open === "heading"} onToggle={() => toggle("heading")}>
            <Field label="Heading Text">
              <input value={s.headingText} onChange={e => upd("headingText", e.target.value)}
                style={{ width: "100%", padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
            </Field>
            <Field label={`Heading Size: ${s.headingSize}px`}>
              <input type="range" min={18} max={64} value={s.headingSize} onChange={e => upd("headingSize", +e.target.value)} style={{ width: "100%" }} />
            </Field>
            <Field label="Heading Alignment">
              <div style={{ display: "flex", gap: 6 }}>
                {["left","center","right"].map(a => (
                  <button key={a} onClick={() => upd("headingAlign", a)} style={{
                    flex: 1, padding: "6px 0", fontSize: 11, fontWeight: 600,
                    border: `1px solid ${s.headingAlign === a ? C.accent : C.border}`,
                    background: s.headingAlign === a ? "#f5f3ff" : "transparent",
                    color: s.headingAlign === a ? C.accent : C.muted, borderRadius: 6, cursor: "pointer",
                  }}>{a[0].toUpperCase() + a.slice(1)}</button>
                ))}
              </div>
            </Field>
          </Section>

          <Section title="Colors" open={open === "colors"} onToggle={() => toggle("colors")}>
            <ColorField label="Accent / Star Color" value={s.accentColor} onChange={v => { upd("accentColor", v); upd("starColor", v); }} />
            <ColorField label="Page Background" value={s.pageBg === "transparent" ? "#ffffff" : s.pageBg} onChange={v => upd("pageBg", v)} />
            <ColorField label="Card Background" value={s.cardBg} onChange={v => upd("cardBg", v)} />
            <ColorField label="Text Color" value={s.textColor} onChange={v => upd("textColor", v)} />
            <ColorField label="Card Border Color" value={s.cardBorder} onChange={v => upd("cardBorder", v)} />
            {(s.layout === "summary_carousel" || s.layout === "spotlight") && (
              <ColorField label="Panel Background" value={s.panelBg} onChange={v => upd("panelBg", v)} />
            )}
          </Section>

          <Section title="Cards" open={open === "cards"} onToggle={() => toggle("cards")}>
            <Field label={`Card Padding: ${s.cardPadding}px`}>
              <input type="range" min={8} max={40} value={s.cardPadding} onChange={e => upd("cardPadding", +e.target.value)} style={{ width: "100%" }} />
            </Field>
            <Field label={`Border Radius: ${s.cardRadius}px`}>
              <input type="range" min={0} max={24} value={s.cardRadius} onChange={e => upd("cardRadius", +e.target.value)} style={{ width: "100%" }} />
            </Field>
            <Field label={`Gap Between Cards: ${s.gap}px`}>
              <input type="range" min={8} max={40} value={s.gap} onChange={e => upd("gap", +e.target.value)} style={{ width: "100%" }} />
            </Field>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Card Shadow</span>
              <button onClick={() => upd("showShadow", !s.showShadow)} style={{
                width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                background: s.showShadow ? C.accent : "#ccc", position: "relative", transition: "background .2s",
              }}>
                <span style={{
                  position: "absolute", top: 3, left: s.showShadow ? 22 : 2,
                  width: 18, height: 18, background: "#fff", borderRadius: "50%", transition: "left .2s",
                }} />
              </button>
            </div>
          </Section>

          <Section title="Typography" open={open === "typo"} onToggle={() => toggle("typo")}>
            <Field label="Font Family">
              <select value={s.fontFamily} onChange={e => upd("fontFamily", e.target.value)}
                style={{ width: "100%", padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }}>
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>
            <Field label={`Review Text Size: ${s.reviewSize}px`}>
              <input type="range" min={11} max={20} value={s.reviewSize} onChange={e => upd("reviewSize", +e.target.value)} style={{ width: "100%" }} />
            </Field>
          </Section>

          <Section title="Display" open={open === "display"} onToggle={() => toggle("display")}>
            <Field label={`Max Reviews: ${s.maxReviews}`}>
              <input type="range" min={3} max={24} step={3} value={s.maxReviews} onChange={e => upd("maxReviews", +e.target.value)} style={{ width: "100%" }} />
            </Field>
            <Field label={`Columns: ${s.columns}`}>
              <input type="range" min={1} max={4} value={s.columns} onChange={e => upd("columns", +e.target.value)} style={{ width: "100%" }} />
            </Field>
            {[
              { key: "showVerified", label: "Show Verified Badge" },
              { key: "showMedia",    label: "Show Review Images" },
            ].map(({ key, label }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</span>
                <button onClick={() => upd(key, !s[key])} style={{
                  width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                  background: s[key] ? C.accent : "#ccc", position: "relative", transition: "background .2s",
                }}>
                  <span style={{
                    position: "absolute", top: 3, left: s[key] ? 22 : 2,
                    width: 18, height: 18, background: "#fff", borderRadius: "50%", transition: "left .2s",
                  }} />
                </button>
              </div>
            ))}
          </Section>

          <Section title="Spacing" open={open === "spacing"} onToggle={() => toggle("spacing")}>
            <Field label={`Top Padding: ${s.paddingTop}px`}>
              <input type="range" min={0} max={120} step={4} value={s.paddingTop} onChange={e => upd("paddingTop", +e.target.value)} style={{ width: "100%" }} />
            </Field>
            <Field label={`Bottom Padding: ${s.paddingBottom}px`}>
              <input type="range" min={0} max={120} step={4} value={s.paddingBottom} onChange={e => upd("paddingBottom", +e.target.value)} style={{ width: "100%" }} />
            </Field>
          </Section>

          {/* Install guide */}
          <div style={{ padding: 16, background: "#f5f3ff", margin: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 6 }}>How to add to your home page</div>
            <ol style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: C.text, lineHeight: 1.8 }}>
              <li>Go to Shopify Admin → Online Store → Themes</li>
              <li>Click Customize → Home page</li>
              <li>Click "Add section" → Choose "Homepage Reviews"</li>
              <li>Save — settings from this page apply automatically</li>
            </ol>
          </div>
        </div>

        {/* Preview */}
        <div style={{ flex: 1, overflowY: "auto", padding: 32, background: C.bg }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, textAlign: "right" }}>Live preview · sample data</div>
            <LivePreview s={s} />
            <div style={{ marginTop: 24, padding: 16, background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>5 Layout Designs Available</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                {LAYOUTS.map(l => (
                  <button key={l.key} onClick={() => upd("layout", l.key)} style={{
                    padding: "10px 8px", borderRadius: 8, border: `2px solid ${s.layout === l.key ? C.accent : C.border}`,
                    background: s.layout === l.key ? "#f5f3ff" : C.surface, cursor: "pointer", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{l.key === "summary_carousel" ? "📊" : l.key === "grid" ? "⊞" : l.key === "masonry" ? "⧉" : l.key === "spotlight" ? "✦" : "▶"}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: s.layout === l.key ? C.accent : C.text }}>{l.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
