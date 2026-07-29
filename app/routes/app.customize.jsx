import { useLoaderData, Link, useActionData, useSubmit } from "react-router";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useAdminT } from "../utils/adminTranslations";
import { isAdvancedOrHigher } from "../billing.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  let templates = [], dbError = null, customCardHTML = "", customCardCSS = "", isPro = false;
  try {
    const [tpls, ls, plan] = await Promise.all([
      db.widgetTemplate.findMany({ where: { shop: session.shop }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] }),
      db.reviewListSettings.findUnique({ where: { shop: session.shop } }),
      db.shopPlan.findUnique({ where: { shop: session.shop } }),
    ]);
    templates = tpls;
    customCardHTML = ls?.customCardHTML || "";
    customCardCSS  = ls?.customCardCSS  || "";
    isPro = isAdvancedOrHigher(plan);
  } catch { dbError = "Database not ready. Run: npx prisma db push"; }
  return { templates, dbError, customCardHTML, customCardCSS, isPro };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const fd = await request.formData();
  const type = fd.get("actionType");
  const shop = session.shop;
  if (type === "delete") {
    await db.widgetTemplate.deleteMany({ where: { id: fd.get("id"), shop } });
    return { deleted: true };
  }
  if (type === "setDefault") {
    const id = fd.get("id");
    await db.widgetTemplate.updateMany({ where: { shop }, data: { isDefault: false } });
    await db.widgetTemplate.update({ where: { id }, data: { isDefault: true } });
    const tpl = await db.widgetTemplate.findUnique({ where: { id } });
    return { activated: tpl?.name || "Template" };
  }
  if (type === "saveBuilder") {
    const name = fd.get("name") || "My Design";
    const blocks = JSON.parse(fd.get("blocks") || "[]");
    const id = fd.get("id") || null;
    if (id) { await db.widgetTemplate.update({ where: { id }, data: { name, blocks } }); }
    else { await db.widgetTemplate.create({ data: { shop, name, blocks } }); }
    return { savedBuilder: true };
  }
  if (type === "saveCustomHtml") {
    const html = fd.get("customCardHTML") || "";
    const css  = fd.get("customCardCSS")  || "";
    try {
      await db.reviewListSettings.upsert({ where: { shop }, create: { shop, customCardHTML: html, customCardCSS: css }, update: { customCardHTML: html, customCardCSS: css } });
    } catch { return { htmlError: "Database not ready." }; }
    return { savedCustomHtml: true };
  }
  if (type === "clearCustomHtml") {
    try { await db.reviewListSettings.upsert({ where: { shop }, create: { shop, customCardHTML: null, customCardCSS: null }, update: { customCardHTML: null, customCardCSS: null } }); } catch {}
    return { clearedCustomHtml: true };
  }
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const C = { accent: "#6B1A2C", accentL: "#f5e6e9", bg: "#f0f2f5", surface: "#fff", border: "#e4e4e4", text: "#1a1a1a", muted: "#6b7280" };
let _uid = 0;
function uid() { return "b" + (++_uid) + Math.random().toString(36).slice(2, 5); }

const SPACING_DEF = { paddingT: 0, paddingR: 0, paddingB: 0, paddingL: 0, marginT: 0, marginR: 0, marginB: 24, marginL: 0 };
const STYLE_DEF   = { bgColor: "", borderW: 0, borderColor: "#e4e4e4", borderStyle: "solid", radius: 0, shadow: "none", widthVal: 100, widthUnit: "%", minH: 0, alignSelf: "stretch" };
const TYPO_DEF    = { fontFamily: "inherit", fontSize: 16, fontWeight: "400", lineHeight: 1.5, textAlign: "left", color: "#1a1a1a", letterSpacing: 0, textTransform: "none" };

// ── Block definitions ─────────────────────────────────────────────────────────
const BLOCK_DEFS = {
  heading: {
    label: "Heading", icon: "🔤", group: "Layout", desc: "Section title text", hasTypo: true,
    defaults: { text: "Customer Reviews", level: "h2", ...TYPO_DEF, fontSize: 28, fontWeight: "800" },
    props: [
      { key: "text",  label: "Text",     type: "text" },
      { key: "level", label: "HTML Tag", type: "select", options: ["h1","h2","h3","h4","p"] },
    ],
  },
  paragraph: {
    label: "Paragraph", icon: "¶", group: "Layout", desc: "Body text block", hasTypo: true,
    defaults: { text: "Add your text here.", ...TYPO_DEF },
    props: [{ key: "text", label: "Text", type: "textarea" }],
  },
  divider: {
    label: "Divider", icon: "➖", group: "Layout", desc: "Horizontal line or space",
    defaults: { type: "line", height: 1, lineColor: "#e4e4e4" },
    props: [
      { key: "type",      label: "Type",      type: "select", options: [{ value: "line", label: "Line" }, { value: "space", label: "Space Only" }] },
      { key: "height",    label: "Thickness", type: "range",  min: 1, max: 12, unit: "px" },
      { key: "lineColor", label: "Color",     type: "color" },
    ],
  },
  spacer: {
    label: "Spacer", icon: "↕", group: "Layout", desc: "Fixed empty vertical space",
    defaults: { size: 32 },
    props: [{ key: "size", label: "Height", type: "range", min: 8, max: 200, unit: "px" }],
  },
  two_col: {
    label: "2 Columns", icon: "⧩", group: "Layout", desc: "Two-column container", isContainer: true, colCount: 2,
    defaults: { colTemplate: "1fr 1fr", gap: 24, alignItems: "start" },
    props: [
      { key: "colTemplate", label: "Column Ratio", type: "select", options: [
        { value: "1fr 1fr", label: "50% / 50%" }, { value: "1fr 2fr", label: "33% / 67%" },
        { value: "2fr 1fr", label: "67% / 33%" }, { value: "1fr 3fr", label: "25% / 75%" }, { value: "3fr 1fr", label: "75% / 25%" },
      ]},
      { key: "gap",        label: "Column Gap",     type: "range",  min: 0, max: 80, unit: "px" },
      { key: "alignItems", label: "Vertical Align", type: "select", options: ["start","center","end","stretch"] },
    ],
  },
  three_col: {
    label: "3 Columns", icon: "⧫", group: "Layout", desc: "Three-column container", isContainer: true, colCount: 3,
    defaults: { colTemplate: "1fr 1fr 1fr", gap: 20, alignItems: "start" },
    props: [
      { key: "gap",        label: "Column Gap",     type: "range",  min: 0, max: 60, unit: "px" },
      { key: "alignItems", label: "Vertical Align", type: "select", options: ["start","center","end","stretch"] },
    ],
  },
  summary: {
    label: "Rating Summary", icon: "⭐", group: "Reviews", desc: "Average rating + stars",
    defaults: { accentColor: "#6B1A2C", style: "compact", showTotal: true, showBreakdown: false },
    props: [
      { key: "accentColor",   label: "Star Color",     type: "color" },
      { key: "style",         label: "Style",          type: "select", options: [{ value: "compact", label: "Compact" }, { value: "large", label: "Large" }, { value: "minimal", label: "Minimal" }] },
      { key: "showTotal",     label: "Show Count",     type: "toggle" },
      { key: "showBreakdown", label: "Show Breakdown", type: "toggle" },
    ],
  },
  progress_bars: {
    label: "Progress Bars", icon: "📊", group: "Reviews", desc: "5-star rating breakdown bars",
    defaults: { accentColor: "#6B1A2C", trackColor: "#e4e4e4", barHeight: 8, barRadius: 4, showCount: true, showPercent: false },
    props: [
      { key: "accentColor", label: "Bar Color",    type: "color" },
      { key: "trackColor",  label: "Track Color",  type: "color" },
      { key: "barHeight",   label: "Bar Height",   type: "range", min: 4, max: 20, unit: "px" },
      { key: "barRadius",   label: "Bar Radius",   type: "range", min: 0, max: 10, unit: "px" },
      { key: "showCount",   label: "Show Count",   type: "toggle" },
      { key: "showPercent", label: "Show Percent", type: "toggle" },
    ],
  },
  stats_row: {
    label: "Stats Counter", icon: "🔢", group: "Reviews", desc: "Large stat numbers display",
    defaults: { accentColor: "#6B1A2C", statBg: "#f9fafb", statRadius: 12, layout: "row", showTotal: true, showAvg: true, showFiveStar: true },
    props: [
      { key: "accentColor",  label: "Accent Color",    type: "color" },
      { key: "statBg",       label: "Card Background", type: "color" },
      { key: "statRadius",   label: "Card Radius",     type: "range",  min: 0, max: 24, unit: "px" },
      { key: "layout",       label: "Layout",          type: "select", options: [{ value: "row", label: "Row" }, { value: "grid", label: "Grid" }] },
      { key: "showTotal",    label: "Total Reviews",   type: "toggle" },
      { key: "showAvg",      label: "Avg Rating",      type: "toggle" },
      { key: "showFiveStar", label: "5-Star %",        type: "toggle" },
    ],
  },
  review_list: {
    label: "Review Cards", icon: "💬", group: "Reviews", desc: "Grid / list of review cards",
    defaults: { layout: "grid", columns: 3, gap: 16, cardBg: "#ffffff", cardBorder: "#e4e4e4", cardRadius: 12, cardPadding: 18, accentColor: "#6B1A2C", cardShadow: "soft", showAvatar: true, showDate: true, showHelpful: true, showMedia: true, showVerified: true, perPage: 9 },
    props: [
      { key: "layout",      label: "Layout",          type: "select", options: [{ value: "grid", label: "Grid" }, { value: "list", label: "List" }, { value: "masonry", label: "Masonry" }, { value: "compact", label: "Compact" }] },
      { key: "columns",     label: "Columns",         type: "range",  min: 1, max: 4 },
      { key: "gap",         label: "Card Gap",        type: "range",  min: 4, max: 48,  unit: "px" },
      { key: "cardRadius",  label: "Card Radius",     type: "range",  min: 0, max: 28,  unit: "px" },
      { key: "cardPadding", label: "Card Padding",    type: "range",  min: 8, max: 48,  unit: "px" },
      { key: "cardBg",      label: "Card Background", type: "color" },
      { key: "cardBorder",  label: "Border Color",    type: "color" },
      { key: "accentColor", label: "Star Color",      type: "color" },
      { key: "cardShadow",  label: "Card Shadow",     type: "select", options: [{ value: "none", label: "None" }, { value: "soft", label: "Soft" }, { value: "medium", label: "Medium" }, { value: "strong", label: "Strong" }] },
      { key: "perPage",     label: "Per Page",        type: "range",  min: 3, max: 48 },
      { key: "showAvatar",  label: "Show Avatar",     type: "toggle" },
      { key: "showDate",    label: "Show Date",       type: "toggle" },
      { key: "showVerified",label: "Verified Badge",  type: "toggle" },
      { key: "showHelpful", label: "Helpful Button",  type: "toggle" },
      { key: "showMedia",   label: "Show Media",      type: "toggle" },
    ],
  },
  slider: {
    label: "Review Slider", icon: "🎠", group: "Reviews", desc: "Horizontal scrolling carousel",
    defaults: { accentColor: "#6B1A2C", cardBg: "#ffffff", cardRadius: 14, cardWidth: 320, gap: 20, showArrows: true, showDots: true, autoplay: false, autoplayDelay: 4 },
    props: [
      { key: "accentColor",   label: "Accent Color", type: "color" },
      { key: "cardBg",        label: "Card BG",      type: "color" },
      { key: "cardWidth",     label: "Card Width",   type: "range", min: 200, max: 500, unit: "px" },
      { key: "cardRadius",    label: "Card Radius",  type: "range", min: 0, max: 28,   unit: "px" },
      { key: "gap",           label: "Card Gap",     type: "range", min: 8, max: 48,   unit: "px" },
      { key: "showArrows",    label: "Show Arrows",  type: "toggle" },
      { key: "showDots",      label: "Show Dots",    type: "toggle" },
      { key: "autoplay",      label: "Autoplay",     type: "toggle" },
      { key: "autoplayDelay", label: "Delay (sec)",  type: "range", min: 2, max: 10 },
    ],
  },
  testimonial: {
    label: "Testimonial Spotlight", icon: "💡", group: "Reviews", desc: "Large featured single review",
    defaults: { accentColor: "#6B1A2C", cardBg: "#f9fafb", textColor: "#1a1a1a", style: "card", showQuote: true, quoteSize: 48 },
    props: [
      { key: "accentColor", label: "Accent Color", type: "color" },
      { key: "cardBg",      label: "Background",   type: "color" },
      { key: "textColor",   label: "Text Color",   type: "color" },
      { key: "style",       label: "Style",        type: "select", options: [{ value: "card", label: "Card" }, { value: "quote", label: "Blockquote" }, { value: "minimal", label: "Minimal" }] },
      { key: "showQuote",   label: "Quote Icon",   type: "toggle" },
      { key: "quoteSize",   label: "Quote Size",   type: "range", min: 24, max: 80, unit: "px" },
    ],
  },
  photo_grid: {
    label: "Photo Grid", icon: "🖼️", group: "Reviews", desc: "Customer photo wall",
    defaults: { columns: 4, gap: 8, radius: 8, aspectRatio: "1/1", overlay: true },
    props: [
      { key: "columns",     label: "Columns",      type: "range",  min: 2, max: 8 },
      { key: "gap",         label: "Gap",          type: "range",  min: 0, max: 24, unit: "px" },
      { key: "radius",      label: "Radius",       type: "range",  min: 0, max: 24, unit: "px" },
      { key: "aspectRatio", label: "Aspect Ratio", type: "select", options: [{ value: "1/1", label: "Square (1:1)" }, { value: "4/3", label: "Landscape (4:3)" }, { value: "3/4", label: "Portrait (3:4)" }] },
      { key: "overlay",     label: "Hover Overlay",type: "toggle" },
    ],
  },
  filter: {
    label: "Rating Filter", icon: "🔢", group: "Reviews", desc: "Filter by star rating",
    defaults: { accentColor: "#6B1A2C", style: "pill", showCounts: true },
    props: [
      { key: "accentColor", label: "Active Color", type: "color" },
      { key: "style",       label: "Style",        type: "select", options: [{ value: "pill", label: "Pill" }, { value: "square", label: "Square" }, { value: "underline", label: "Underline" }] },
      { key: "showCounts",  label: "Show Counts",  type: "toggle" },
    ],
  },
  sort: {
    label: "Sort Bar", icon: "↕", group: "Reviews", desc: "Sort dropdown",
    defaults: { defaultSort: "newest", style: "dropdown" },
    props: [
      { key: "defaultSort", label: "Default Sort", type: "select", options: [{ value: "newest", label: "Newest" }, { value: "highest", label: "Highest Rated" }, { value: "helpful", label: "Most Helpful" }] },
      { key: "style",       label: "Style",        type: "select", options: [{ value: "dropdown", label: "Dropdown" }, { value: "tabs", label: "Tabs" }] },
    ],
  },
  search: {
    label: "Search Box", icon: "🔍", group: "Reviews", desc: "Full-text search input",
    defaults: { placeholder: "Search reviews...", shape: "pill" },
    props: [
      { key: "placeholder", label: "Placeholder", type: "text" },
      { key: "shape",       label: "Shape",       type: "select", options: [{ value: "pill", label: "Pill" }, { value: "rounded", label: "Rounded" }, { value: "square", label: "Square" }] },
    ],
  },
  write_review: {
    label: "Write Review Button", icon: "✏️", group: "Actions", desc: "Opens the review form",
    defaults: { text: "Write a Review", bg: "#6B1A2C", color: "#ffffff", radius: 8, size: "medium", align: "left", fullWidth: false, outline: false },
    props: [
      { key: "text",      label: "Button Text",   type: "text" },
      { key: "bg",        label: "BG Color",      type: "color" },
      { key: "color",     label: "Text Color",    type: "color" },
      { key: "radius",    label: "Radius",        type: "range",  min: 0, max: 40, unit: "px" },
      { key: "size",      label: "Size",          type: "select", options: [{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }] },
      { key: "align",     label: "Alignment",     type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
      { key: "fullWidth", label: "Full Width",    type: "toggle" },
      { key: "outline",   label: "Outline Style", type: "toggle" },
    ],
  },
  button_group: {
    label: "Button Group", icon: "⬚", group: "Actions", desc: "Two CTA buttons side by side",
    defaults: { btn1Text: "Write a Review", btn1Bg: "#6B1A2C", btn1Color: "#fff", btn1Radius: 8, btn2Text: "See All Reviews", btn2Bg: "transparent", btn2Color: "#6B1A2C", btn2Border: "#6B1A2C", btn2Radius: 8, gap: 12, align: "left", direction: "row" },
    props: [
      { key: "btn1Text",   label: "Btn 1 Text",   type: "text" },
      { key: "btn1Bg",     label: "Btn 1 Color",  type: "color" },
      { key: "btn1Color",  label: "Btn 1 Text",   type: "color" },
      { key: "btn1Radius", label: "Btn 1 Radius", type: "range", min: 0, max: 40, unit: "px" },
      { key: "btn2Text",   label: "Btn 2 Text",   type: "text" },
      { key: "btn2Bg",     label: "Btn 2 BG",     type: "color" },
      { key: "btn2Color",  label: "Btn 2 Text",   type: "color" },
      { key: "btn2Border", label: "Btn 2 Border", type: "color" },
      { key: "btn2Radius", label: "Btn 2 Radius", type: "range", min: 0, max: 40, unit: "px" },
      { key: "gap",        label: "Gap",          type: "range",  min: 4, max: 40, unit: "px" },
      { key: "align",      label: "Alignment",    type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
      { key: "direction",  label: "Direction",    type: "select", options: [{ value: "row", label: "Horizontal" }, { value: "column", label: "Vertical" }] },
    ],
  },
  trust_badge: {
    label: "Trust Badge", icon: "🏆", group: "Actions", desc: "Verified reviews badge",
    defaults: { text: "Verified Reviews", accentColor: "#6B1A2C", style: "pill", iconType: "check" },
    props: [
      { key: "text",        label: "Badge Text", type: "text" },
      { key: "accentColor", label: "Color",      type: "color" },
      { key: "style",       label: "Style",      type: "select", options: [{ value: "pill", label: "Pill" }, { value: "inline", label: "Inline" }, { value: "card", label: "Card" }] },
      { key: "iconType",    label: "Icon",       type: "select", options: [{ value: "check", label: "✓ Check" }, { value: "shield", label: "🛡 Shield" }, { value: "star", label: "★ Star" }] },
    ],
  },
};

const PALETTE_GROUPS = [
  { label: "Layout",  types: ["heading","paragraph","two_col","three_col","divider","spacer"] },
  { label: "Reviews", types: ["summary","progress_bars","stats_row","review_list","slider","testimonial","photo_grid","filter","sort","search"] },
  { label: "Actions", types: ["write_review","button_group","trust_badge"] },
];

const SHADOW_MAP = { none:"none", soft:"0 2px 8px rgba(0,0,0,.08)", medium:"0 4px 16px rgba(0,0,0,.12)", strong:"0 8px 32px rgba(0,0,0,.18)", glow:`0 0 20px ${C.accent}44` };

function makeBlock(type) {
  const def = BLOCK_DEFS[type];
  const b = { id: uid(), type, settings: { ...def.defaults, ...SPACING_DEF, ...STYLE_DEF } };
  if (def.isContainer) b.columns = Array.from({ length: def.colCount }, () => []);
  return b;
}
function makeDefaultBlocks() {
  return [makeBlock("heading"), makeBlock("summary"), makeBlock("filter"), makeBlock("sort"), makeBlock("review_list"), makeBlock("write_review")];
}

// ── Inputs ────────────────────────────────────────────────────────────────────
function Lbl({ children }) {
  return <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{children}</div>;
}

function ColorInput({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)}
        style={{ width: 34, height: 34, border: "1.5px solid #e4e4e4", borderRadius: 7, cursor: "pointer", padding: 2, background: "#fff", flexShrink: 0 }} />
      <input type="text" value={value || ""} onChange={e => onChange(e.target.value)}
        style={{ flex: 1, padding: "6px 9px", border: "1.5px solid #e4e4e4", borderRadius: 7, fontSize: 12, fontFamily: "monospace", outline: "none", minWidth: 0 }} />
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div onClick={() => onChange(!value)} style={{ width: 42, height: 22, borderRadius: 11, background: value ? C.accent : "#d1d5db", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: value ? 23 : 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
      </div>
      <span style={{ fontSize: 12, color: value ? C.accent : C.muted, fontWeight: 600 }}>{value ? "On" : "Off"}</span>
    </div>
  );
}

function RangeNum({ value, onChange, min = 0, max = 100, unit = "" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input type="range" min={min} max={max} value={value ?? min} onChange={e => onChange(Number(e.target.value))} style={{ flex: 1, accentColor: C.accent }} />
      <input type="number" min={min} max={max} value={value ?? min} onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
        style={{ width: 48, padding: "4px 6px", border: "1.5px solid #e4e4e4", borderRadius: 6, fontSize: 12, fontWeight: 700, textAlign: "right", outline: "none" }} />
      {unit && <span style={{ fontSize: 11, color: C.muted }}>{unit}</span>}
    </div>
  );
}

function Sel({ value, onChange, options = [] }) {
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "7px 9px", border: "1.5px solid #e4e4e4", borderRadius: 7, fontSize: 12.5, outline: "none", background: "#fff", color: "#1a1a1a" }}>
      {options.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function TxtInput({ value, onChange, placeholder = "" }) {
  return <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "7px 9px", border: "1.5px solid #e4e4e4", borderRadius: 7, fontSize: 12.5, outline: "none", boxSizing: "border-box" }} />;
}
function TxtArea({ value, onChange }) {
  return <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={4} style={{ width: "100%", padding: "7px 9px", border: "1.5px solid #e4e4e4", borderRadius: 7, fontSize: 12.5, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />;
}

function FourSide({ label, values, onChange }) {
  const [linked, setLinked] = useState(false);
  const { t = 0, r = 0, b = 0, l = 0 } = values || {};
  function set(side, val) {
    const v = Number(val);
    if (linked) onChange({ t: v, r: v, b: v, l: v });
    else onChange({ t, r, b, l, [side]: v });
  }
  return (
    <div>
      {label && <Lbl>{label}</Lbl>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>
        {[["t","Top"],["r","Right"],["b","Bot"],["l","Left"]].map(([s, lbl]) => (
          <div key={s} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>{lbl}</div>
            <input type="number" value={{ t, r, b, l }[s]} min={0} onChange={e => set(s, e.target.value)}
              style={{ width: "100%", padding: "5px 2px", border: `1.5px solid ${linked ? C.accent : "#e4e4e4"}`, borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none", boxSizing: "border-box" }} />
          </div>
        ))}
        <button onClick={() => setLinked(!linked)} title={linked ? "Unlink" : "Link all"}
          style={{ padding: "5px 8px", borderRadius: 6, border: `1.5px solid ${linked ? C.accent : "#e4e4e4"}`, background: linked ? C.accentL : "#fff", cursor: "pointer", fontSize: 12, color: linked ? C.accent : C.muted, flexShrink: 0 }}>
          {linked ? "🔗" : "⛓"}
        </button>
      </div>
    </div>
  );
}

function ShadowPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {["none","soft","medium","strong","glow"].map(s => (
        <button key={s} onClick={() => onChange(s)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: `1.5px solid ${value === s ? C.accent : "#e4e4e4"}`, background: value === s ? C.accentL : "#fff", cursor: "pointer", color: value === s ? C.accent : C.muted, textTransform: "capitalize" }}>{s}</button>
      ))}
    </div>
  );
}

// ── Properties Panel (tabbed) ─────────────────────────────────────────────────
function PropField({ prop, settings, onChange }) {
  const val = settings[prop.key];
  const u = v => onChange(prop.key, v);
  if (prop.type === "color")    return <ColorInput value={val} onChange={u} />;
  if (prop.type === "toggle")   return <Toggle value={!!val} onChange={u} />;
  if (prop.type === "range")    return <RangeNum value={val} onChange={u} min={prop.min} max={prop.max} unit={prop.unit} />;
  if (prop.type === "select")   return <Sel value={val} onChange={u} options={prop.options} />;
  if (prop.type === "textarea") return <TxtArea value={val} onChange={u} />;
  return <TxtInput value={val} onChange={u} />;
}

function PropertiesPanel({ block, onChange }) {
  const [tab, setTab] = useState("content");

  if (!block) return (
    <div style={{ padding: "40px 14px", textAlign: "center", color: C.muted }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>☝️</div>
      <div style={{ fontSize: 12, lineHeight: 1.6 }}>Click a block to edit its properties</div>
    </div>
  );

  const def = BLOCK_DEFS[block.type];
  if (!def) return null;
  const st = block.settings;
  function update(key, val) { onChange({ ...block, settings: { ...block.settings, [key]: val } }); }
  function updateSpacing(key, obj) { onChange({ ...block, settings: { ...block.settings, [`${key}T`]: obj.t, [`${key}R`]: obj.r, [`${key}B`]: obj.b, [`${key}L`]: obj.l } }); }

  const tabs = ["content","spacing","style"];
  if (def.hasTypo) tabs.push("typo");
  const TAB_LBL = { content:"Content", spacing:"Spacing", style:"Style", typo:"Typography" };

  return (
    <div>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: "#fafafa", position: "sticky", top: 0, zIndex: 1 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 2px", fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer", background: "none", borderBottom: `2.5px solid ${tab === t ? C.accent : "transparent"}`, color: tab === t ? C.accent : C.muted, textTransform: "uppercase", letterSpacing: 0.3 }}>
            {TAB_LBL[t]}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 18 }}>{def.icon}</span>
          <div><div style={{ fontSize: 12.5, fontWeight: 800, color: C.text }}>{def.label}</div><div style={{ fontSize: 10.5, color: C.muted }}>{def.desc}</div></div>
        </div>

        {/* Content */}
        {tab === "content" && def.props.map(prop => (
          <div key={prop.key} style={{ marginBottom: 14 }}>
            <Lbl>{prop.label}</Lbl>
            <PropField prop={prop} settings={st} onChange={update} />
          </div>
        ))}

        {/* Spacing */}
        {tab === "spacing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <FourSide label="Padding (px)" values={{ t: st.paddingT, r: st.paddingR, b: st.paddingB, l: st.paddingL }} onChange={v => updateSpacing("padding", v)} />
            <FourSide label="Margin (px)"  values={{ t: st.marginT,  r: st.marginR,  b: st.marginB,  l: st.marginL  }} onChange={v => updateSpacing("margin", v)} />
            <div>
              <Lbl>Width</Lbl>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="number" value={st.widthVal ?? 100} min={0} max={9999} onChange={e => update("widthVal", Number(e.target.value))}
                  style={{ width: 70, padding: "6px 8px", border: "1.5px solid #e4e4e4", borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none" }} />
                <Sel value={st.widthUnit || "%"} onChange={v => update("widthUnit", v)} options={[{ value: "%", label: "%" }, { value: "px", label: "px" }]} />
              </div>
            </div>
            <div>
              <Lbl>Horizontal Align</Lbl>
              <Sel value={st.alignSelf || "stretch"} onChange={v => update("alignSelf", v)} options={[{ value: "stretch", label: "Stretch Full" }, { value: "flex-start", label: "Left" }, { value: "center", label: "Center" }, { value: "flex-end", label: "Right" }]} />
            </div>
            <div>
              <Lbl>Min Height (px)</Lbl>
              <RangeNum value={st.minH || 0} onChange={v => update("minH", v)} min={0} max={600} unit="px" />
            </div>
          </div>
        )}

        {/* Style */}
        {tab === "style" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><Lbl>Background Color</Lbl><ColorInput value={st.bgColor || ""} onChange={v => update("bgColor", v)} /></div>
            <div><Lbl>Border Radius (px)</Lbl><RangeNum value={st.radius || 0} onChange={v => update("radius", v)} min={0} max={60} unit="px" /></div>
            <div>
              <Lbl>Border</Lbl>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="number" value={st.borderW || 0} min={0} max={10} onChange={e => update("borderW", Number(e.target.value))}
                  style={{ width: 52, padding: "6px 7px", border: "1.5px solid #e4e4e4", borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none" }} />
                <span style={{ fontSize: 10, color: C.muted }}>px</span>
                <Sel value={st.borderStyle || "solid"} onChange={v => update("borderStyle", v)} options={["solid","dashed","dotted","double"]} />
              </div>
              <div style={{ marginTop: 6 }}><ColorInput value={st.borderColor || "#e4e4e4"} onChange={v => update("borderColor", v)} /></div>
            </div>
            <div><Lbl>Box Shadow</Lbl><ShadowPicker value={st.shadow || "none"} onChange={v => update("shadow", v)} /></div>
          </div>
        )}

        {/* Typography */}
        {tab === "typo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Lbl>Font Family</Lbl>
              <Sel value={st.fontFamily || "inherit"} onChange={v => update("fontFamily", v)} options={[
                { value: "inherit", label: "Theme Default" }, { value: "sans-serif", label: "Sans-serif" }, { value: "serif", label: "Serif" }, { value: "monospace", label: "Monospace" },
                { value: "Georgia, serif", label: "Georgia" }, { value: "Arial, sans-serif", label: "Arial" }, { value: "'Helvetica Neue', sans-serif", label: "Helvetica" },
              ]} />
            </div>
            <div><Lbl>Font Size (px)</Lbl><RangeNum value={st.fontSize || 16} onChange={v => update("fontSize", v)} min={10} max={80} unit="px" /></div>
            <div>
              <Lbl>Font Weight</Lbl>
              <Sel value={st.fontWeight || "400"} onChange={v => update("fontWeight", v)} options={[
                { value: "300", label: "300 Light" }, { value: "400", label: "400 Regular" }, { value: "500", label: "500 Medium" },
                { value: "600", label: "600 Semi Bold" }, { value: "700", label: "700 Bold" }, { value: "800", label: "800 Extra Bold" }, { value: "900", label: "900 Black" },
              ]} />
            </div>
            <div><Lbl>Line Height</Lbl><RangeNum value={st.lineHeight || 1.5} onChange={v => update("lineHeight", v)} min={1} max={3} unit="×" /></div>
            <div><Lbl>Letter Spacing (px)</Lbl><RangeNum value={st.letterSpacing || 0} onChange={v => update("letterSpacing", v)} min={-2} max={10} unit="px" /></div>
            <div>
              <Lbl>Text Align</Lbl>
              <div style={{ display: "flex", gap: 4 }}>
                {[["left","⬅"],["center","↔"],["right","➡"],["justify","≡"]].map(([a, icon]) => (
                  <button key={a} onClick={() => update("textAlign", a)}
                    style={{ flex: 1, padding: "7px 4px", fontSize: 14, border: `1.5px solid ${(st.textAlign||"left") === a ? C.accent : "#e4e4e4"}`, borderRadius: 6, background: (st.textAlign||"left") === a ? C.accentL : "#fff", cursor: "pointer", color: (st.textAlign||"left") === a ? C.accent : C.muted }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Lbl>Text Transform</Lbl>
              <Sel value={st.textTransform || "none"} onChange={v => update("textTransform", v)} options={[{ value: "none", label: "None" }, { value: "uppercase", label: "UPPERCASE" }, { value: "lowercase", label: "lowercase" }, { value: "capitalize", label: "Capitalize" }]} />
            </div>
            <div><Lbl>Text Color</Lbl><ColorInput value={st.color || "#1a1a1a"} onChange={v => update("color", v)} /></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Block Mockup ──────────────────────────────────────────────────────────────
function BlockMockup({ block, compact = false }) {
  const st = block.settings;
  const S = compact ? 0.65 : 1;
  const wrap = {
    padding: `${st.paddingT||0}px ${st.paddingR||0}px ${st.paddingB||0}px ${st.paddingL||0}px`,
    background: st.bgColor || "transparent",
    borderRadius: st.radius || 0,
    border: st.borderW ? `${st.borderW}px ${st.borderStyle||"solid"} ${st.borderColor||"#e4e4e4"}` : "none",
    boxShadow: SHADOW_MAP[st.shadow] || "none",
    minHeight: st.minH || undefined,
  };

  function inner() {
    switch (block.type) {
      case "heading": return <div style={{ fontSize: Math.min((st.fontSize||28)*S, 26), fontWeight: st.fontWeight||"800", color: st.color||"#1a1a1a", textAlign: st.textAlign||"left", fontFamily: st.fontFamily||"inherit", letterSpacing: st.letterSpacing||0, textTransform: st.textTransform||"none", lineHeight: st.lineHeight||1.2 }}>{st.text||"Customer Reviews"}</div>;
      case "paragraph": return <div style={{ fontSize: Math.min((st.fontSize||16)*S,14), color: st.color||"#374151", textAlign: st.textAlign||"left", lineHeight: st.lineHeight||1.5 }}>{(st.text||"").slice(0,100)}{(st.text||"").length>100?"…":""}</div>;
      case "divider": return st.type==="line" ? <hr style={{ border:"none", borderTop:`${st.height||1}px solid ${st.lineColor||"#e4e4e4"}`, margin:0 }} /> : <div style={{ height: Math.min((st.size||24)*0.5,50), background:"repeating-linear-gradient(45deg,#f3f4f6 0,#f3f4f6 5px,transparent 5px,transparent 10px)", borderRadius:4 }} />;
      case "spacer": return <div style={{ height: Math.min((st.size||32)*0.5,60), background:"repeating-linear-gradient(45deg,#f9fafb 0,#f9fafb 5px,transparent 5px,transparent 10px)", borderRadius:4 }} />;
      case "summary": return (
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div><div style={{ fontSize:26*S, fontWeight:800, color:"#1a1a1a", lineHeight:1 }}>4.8</div><div style={{ fontSize:9*S, color:C.muted }}>out of 5</div></div>
          <div>
            <div style={{ display:"flex", gap:1, marginBottom:3 }}>{[1,2,3,4,5].map(i=><span key={i} style={{ color:st.accentColor||"#6B1A2C", fontSize:14*S }}>★</span>)}</div>
            {st.showTotal!==false && <div style={{ fontSize:9*S, color:C.muted }}>Based on 124 reviews</div>}
            {st.showBreakdown && <div style={{ marginTop:4 }}>{[5,4,3].map(n=><div key={n} style={{ display:"flex", alignItems:"center", gap:3, marginBottom:2 }}><span style={{ fontSize:8*S, color:C.muted, width:14 }}>{n}★</span><div style={{ width:60*S, height:4, background:"#e4e4e4", borderRadius:2 }}><div style={{ height:4, background:st.accentColor||"#6B1A2C", borderRadius:2, width:n===5?"70%":n===4?"45%":"15%" }} /></div></div>)}</div>}
          </div>
        </div>
      );
      case "progress_bars": return (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {[5,4,3,2,1].map((n,i)=>{
            const pct=[68,42,18,8,4][i];
            return <div key={n} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:10*S, color:C.muted, width:16, flexShrink:0 }}>{n}★</span>
              <div style={{ flex:1, height:st.barHeight||8, background:st.trackColor||"#e4e4e4", borderRadius:st.barRadius||4, overflow:"hidden" }}><div style={{ width:pct+"%", height:"100%", background:st.accentColor||"#6B1A2C", borderRadius:st.barRadius||4 }} /></div>
              {st.showCount!==false && <span style={{ fontSize:9*S, color:C.muted, width:22, textAlign:"right" }}>{[84,52,22,10,5][i]}</span>}
            </div>;
          })}
        </div>
      );
      case "stats_row": {
        const stats=[st.showTotal!==false&&{label:"Reviews",value:"124"},st.showAvg!==false&&{label:"Avg",value:"4.8"},st.showFiveStar!==false&&{label:"5-Star",value:"68%"}].filter(Boolean);
        return <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>{stats.map(s=><div key={s.label} style={{ flex:1, minWidth:50, background:st.statBg||"#f9fafb", borderRadius:st.statRadius||12, padding:"9px 10px", textAlign:"center" }}><div style={{ fontSize:18*S, fontWeight:800, color:st.accentColor||"#6B1A2C" }}>{s.value}</div><div style={{ fontSize:9*S, color:C.muted }}>{s.label}</div></div>)}</div>;
      }
      case "review_list": {
        const cols=Math.min(st.columns||3,compact?2:3);
        return <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:(st.gap||16)*(compact?0.3:0.5) }}>{["Sarah M.","John K.","Emily R."].slice(0,cols).map((name,i)=><div key={i} style={{ background:st.cardBg||"#fff", border:`1px solid ${st.cardBorder||"#e4e4e4"}`, borderRadius:(st.cardRadius||12)*0.5, padding:compact?5:9 }}>{st.showAvatar!==false&&<div style={{ width:12, height:12, borderRadius:"50%", background:st.accentColor||"#6B1A2C", marginBottom:3 }} />}<div style={{ fontSize:7, fontWeight:700 }}>{name}</div><div style={{ fontSize:8, color:st.accentColor||"#6B1A2C" }}>★★★★★</div><div style={{ fontSize:7, color:"#6b7280" }}>Great product…</div></div>)}</div>;
      }
      case "slider": return (
        <div style={{ display:"flex", gap:(st.gap||20)*0.4, overflowX:"hidden", position:"relative" }}>
          {[1,2,3].map(i=><div key={i} style={{ minWidth:(st.cardWidth||320)*0.26, background:st.cardBg||"#fff", border:"1px solid #e4e4e4", borderRadius:(st.cardRadius||14)*0.5, padding:8, flexShrink:0 }}><div style={{ display:"flex", gap:2, marginBottom:3 }}>{[1,2,3,4,5].map(j=><span key={j} style={{ color:st.accentColor||"#6B1A2C", fontSize:8 }}>★</span>)}</div><div style={{ fontSize:7, color:"#374151", lineHeight:1.4 }}>Great product, highly recommend!</div><div style={{ fontSize:7, fontWeight:700, color:"#1a1a1a", marginTop:4 }}>Sarah M.</div></div>)}
          {st.showArrows!==false&&<div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", fontSize:14, color:st.accentColor||"#6B1A2C", background:"#fff", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(0,0,0,.12)", flexShrink:0 }}>›</div>}
        </div>
      );
      case "testimonial": return (
        <div style={{ background:st.cardBg||"#f9fafb", borderRadius:10, padding:compact?9:14, position:"relative" }}>
          {st.showQuote&&<div style={{ fontSize:(st.quoteSize||48)*0.3, color:st.accentColor||"#6B1A2C", lineHeight:1, opacity:0.4, marginBottom:3 }}>"</div>}
          <div style={{ fontSize:compact?7:10, color:st.textColor||"#1a1a1a", lineHeight:1.5, marginBottom:6 }}>This is the best product I've ever bought!</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:18, height:18, borderRadius:"50%", background:st.accentColor||"#6B1A2C", flexShrink:0 }} /><div><div style={{ fontSize:8, fontWeight:700 }}>Sarah M.</div><div style={{ fontSize:7, color:C.muted }}>Verified buyer</div></div></div>
        </div>
      );
      case "photo_grid": return <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(st.columns||4,4)},1fr)`, gap:st.gap||8 }}>{Array.from({length:Math.min(st.columns||4,8)}).map((_,i)=><div key={i} style={{ background:`hsl(${i*40+200},40%,85%)`, borderRadius:st.radius||8, aspectRatio:st.aspectRatio||"1/1" }} />)}</div>;
      case "filter": return <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>{["All","5★","4★","3★"].map((f,i)=><div key={i} style={{ padding:"3px 9px", borderRadius:st.style==="pill"?20:6, fontSize:9, fontWeight:600, border:`1.5px solid ${i===0?(st.accentColor||"#6B1A2C"):"#e4e4e4"}`, background:i===0?(st.accentColor||"#6B1A2C"):"#fff", color:i===0?"#fff":"#374151" }}>{f}</div>)}</div>;
      case "sort": return <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 12px", border:"1px solid #e4e4e4", borderRadius:8, background:"#fff", fontSize:compact?9:11, color:"#374151" }}>Sort: Newest ▾</div>;
      case "search": {
        const r=st.shape==="pill"?20:st.shape==="square"?0:8;
        return <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", border:"1px solid #e4e4e4", borderRadius:r, background:"#fff", maxWidth:220 }}><span style={{ fontSize:10, color:"#9ca3af" }}>🔍</span><span style={{ fontSize:compact?9:11, color:"#9ca3af" }}>{st.placeholder||"Search reviews..."}</span></div>;
      }
      case "write_review": {
        const pad={small:"5px 12px",medium:"8px 18px",large:"11px 26px"};
        const fs={small:9,medium:11,large:13};
        return <div style={{ textAlign:st.align||"left" }}><div style={{ display:"inline-flex", padding:pad[st.size]||pad.medium, borderRadius:st.radius||8, background:st.outline?"transparent":(st.bg||"#6B1A2C"), color:st.outline?(st.bg||"#6B1A2C"):(st.color||"#fff"), fontSize:(fs[st.size]||11)*S, fontWeight:700, border:st.outline?`2px solid ${st.bg||"#6B1A2C"}`:"none", width:st.fullWidth?"100%":undefined, justifyContent:"center" }}>{st.text||"Write a Review"}</div></div>;
      }
      case "button_group": return <div style={{ display:"flex", flexDirection:st.direction||"row", gap:st.gap||12, alignItems:"center", justifyContent:st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start", flexWrap:"wrap" }}><div style={{ padding:"6px 14px", borderRadius:st.btn1Radius||8, background:st.btn1Bg||"#6B1A2C", color:st.btn1Color||"#fff", fontSize:10*S, fontWeight:700 }}>{st.btn1Text||"Write a Review"}</div><div style={{ padding:"6px 14px", borderRadius:st.btn2Radius||8, background:st.btn2Bg||"transparent", color:st.btn2Color||"#6B1A2C", fontSize:10*S, fontWeight:700, border:`1.5px solid ${st.btn2Border||"#6B1A2C"}` }}>{st.btn2Text||"See All Reviews"}</div></div>;
      case "trust_badge": {
        const icon=st.iconType==="shield"?"🛡":st.iconType==="star"?"★":"✓";
        return <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:st.style==="inline"?"0":"5px 14px", borderRadius:st.style==="pill"?20:8, background:st.style==="inline"?"transparent":`${st.accentColor||"#6B1A2C"}18` }}><span style={{ fontSize:11, color:st.accentColor||"#6B1A2C" }}>{icon}</span><span style={{ fontSize:11, fontWeight:700, color:st.accentColor||"#6B1A2C" }}>124 {st.text||"Verified Reviews"}</span></div>;
      }
      default: return <div style={{ fontSize:11, color:C.muted }}>Block: {block.type}</div>;
    }
  }

  return <div style={wrap}>{inner()}</div>;
}

// ── Column Slot ───────────────────────────────────────────────────────────────
function ColumnSlot({ children = [], colIdx, parentId, selectedPath, onAddChild, onDeleteChild, onSelectChild }) {
  const [dragOver, setDragOver] = useState(false);
  const isChildSel = id => selectedPath?.parentId === parentId && selectedPath?.colIdx === colIdx && selectedPath?.childId === id;

  return (
    <div style={{ flex:1, minHeight:80, border:`2px dashed ${dragOver?"#93c5fd":C.border}`, borderRadius:10, padding:8, display:"flex", flexDirection:"column", gap:6, background:dragOver?"#eff6ff":"#fafafa", transition:"all .15s" }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); const pt=e.dataTransfer.getData("palette-type"); if(pt) onAddChild(colIdx, pt); }}>
      <div style={{ fontSize:9.5, fontWeight:700, color:C.muted, textAlign:"center", textTransform:"uppercase", letterSpacing:0.4 }}>Col {colIdx+1}</div>
      {children.map(child => {
        const def=BLOCK_DEFS[child.type];
        const sel=isChildSel(child.id);
        return (
          <div key={child.id} onClick={e => { e.stopPropagation(); onSelectChild(colIdx, child.id); }}
            style={{ background:"#fff", border:`2px solid ${sel?C.accent:C.border}`, borderRadius:8, overflow:"hidden", cursor:"pointer", boxShadow:sel?`0 0 0 3px ${C.accentL}`:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 8px", background:sel?C.accentL:"#f9fafb", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:11 }}>{def?.icon}</span>
              <span style={{ fontSize:10, fontWeight:700, color:sel?C.accent:C.muted, flex:1 }}>{def?.label}</span>
              <button onClick={e2 => { e2.stopPropagation(); onDeleteChild(colIdx, child.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontSize:12, padding:"0 2px" }}>✕</button>
            </div>
            <div style={{ padding:"7px 10px" }}><BlockMockup block={child} compact /></div>
          </div>
        );
      })}
      <button onClick={() => onAddChild(colIdx, "__palette__")}
        style={{ padding:"5px", fontSize:11, color:C.muted, background:"none", border:`1.5px dashed ${C.border}`, borderRadius:6, cursor:"pointer", textAlign:"center" }}>
        + Add Block
      </button>
    </div>
  );
}

// ── Canvas ────────────────────────────────────────────────────────────────────
function Canvas({ blocks, selectedPath, onSelect, onReorder, onDelete, onDropNew, onAddChild, onDeleteChild, onSelectChild, setColTarget }) {
  const [dragOverIdx, setDragOverIdx] = useState(null);

  function handleDrop(e, toIdx) {
    e.preventDefault(); setDragOverIdx(null);
    const fromIdx = e.dataTransfer.getData("canvas-index");
    const pt = e.dataTransfer.getData("palette-type");
    if (pt) { onDropNew(pt, toIdx); return; }
    if (fromIdx !== "" && parseInt(fromIdx) !== toIdx) onReorder(parseInt(fromIdx), toIdx);
  }

  const isTopSel = id => selectedPath?.blockId === id && !selectedPath?.childId;

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"20px 24px", minWidth:0 }}
      onDragOver={e => { if(blocks.length===0) e.preventDefault(); }}
      onDrop={e => { if(blocks.length===0){ const pt=e.dataTransfer.getData("palette-type"); if(pt) onDropNew(pt,0); } }}>

      {blocks.length === 0 ? (
        <div style={{ border:`2px dashed ${C.border}`, borderRadius:16, padding:"60px 20px", textAlign:"center", color:C.muted }}>
          <div style={{ fontSize:36, marginBottom:10 }}>⬇️</div>
          <div style={{ fontSize:14, fontWeight:600 }}>Drag blocks here to build your layout</div>
          <div style={{ fontSize:12, marginTop:6 }}>or click a block in the left panel</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {blocks.map((block, idx) => {
            const def = BLOCK_DEFS[block.type];
            const selected = isTopSel(block.id);
            const isDragOv = dragOverIdx === idx;
            const st = block.settings;

            return (
              <div key={block.id} draggable
                onDragStart={e => { e.dataTransfer.setData("canvas-index", String(idx)); e.dataTransfer.effectAllowed="move"; }}
                onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={e => handleDrop(e, idx)}
                onClick={() => onSelect({ blockId: block.id })}
                style={{
                  marginTop: st.marginT||0, marginRight: st.marginR||0, marginBottom: st.marginB||6, marginLeft: st.marginL||0,
                  ...(st.widthVal < 100 ? { width:`${st.widthVal}${st.widthUnit||"%"}`, alignSelf:st.alignSelf||"stretch" } : {}),
                  background:"#fff", border:`2px solid ${selected?C.accent:isDragOv?"#93c5fd":C.border}`,
                  borderRadius:12, overflow:"hidden", cursor:"pointer",
                  boxShadow: selected?`0 0 0 3px ${C.accentL}`:isDragOv?"0 0 0 3px #dbeafe":"none",
                  transition:"border-color .12s, box-shadow .12s",
                }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", background:selected?C.accentL:"#f9fafb", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ cursor:"grab", color:C.muted, fontSize:15, userSelect:"none" }}>⠿</span>
                  <span style={{ fontSize:13 }}>{def?.icon}</span>
                  <span style={{ fontSize:11.5, fontWeight:700, color:selected?C.accent:C.text, flex:1 }}>{def?.label||block.type}</span>
                  <button onClick={e => { e.stopPropagation(); onDelete(block.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontSize:14, padding:"0 3px" }}>✕</button>
                </div>
                <div style={{ padding: def?.isContainer ? "10px" : "12px 14px", minHeight:44 }}>
                  {def?.isContainer ? (
                    <div style={{ display:"grid", gridTemplateColumns:st.colTemplate||`repeat(${def.colCount},1fr)`, gap:st.gap||24, alignItems:st.alignItems||"start" }}>
                      {(block.columns || Array.from({length:def.colCount},()=>[])).map((colBlocks, ci) => (
                        <ColumnSlot key={ci} children={colBlocks} colIdx={ci} parentId={block.id} selectedPath={selectedPath}
                          onAddChild={(colIdx, type) => {
                            if (type === "__palette__") { setColTarget({ parentId: block.id, colIdx }); }
                            else { onAddChild(block.id, colIdx, type); }
                          }}
                          onDeleteChild={(colIdx, childId) => onDeleteChild(block.id, colIdx, childId)}
                          onSelectChild={(colIdx, childId) => onSelectChild({ blockId: block.id, colIdx, childId })}
                        />
                      ))}
                    </div>
                  ) : <BlockMockup block={block} />}
                </div>
              </div>
            );
          })}
          <div style={{ border:`2px dashed ${dragOverIdx==="end"?"#93c5fd":C.border}`, borderRadius:10, padding:12, textAlign:"center", color:C.muted, fontSize:12 }}
            onDragOver={e => { e.preventDefault(); setDragOverIdx("end"); }}
            onDragLeave={() => setDragOverIdx(null)}
            onDrop={e => handleDrop(e, blocks.length)}>
            + Drop here to add at the bottom
          </div>
        </div>
      )}
    </div>
  );
}

// ── Block Palette ─────────────────────────────────────────────────────────────
function BlockPalette({ onAdd, colTarget, onClearColTarget, onAddToCol }) {
  return (
    <div style={{ padding:"12px 10px" }}>
      {colTarget && (
        <div style={{ background:C.accentL, border:`1.5px solid ${C.accent}`, borderRadius:8, padding:"7px 10px", marginBottom:10, fontSize:11, fontWeight:700, color:C.accent, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>Adding to Col {colTarget.colIdx+1}</span>
          <button onClick={onClearColTarget} style={{ background:"none", border:"none", cursor:"pointer", color:C.accent, fontSize:12, padding:"0 2px" }}>✕</button>
        </div>
      )}
      {PALETTE_GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom:14 }}>
          <div style={{ fontSize:9.5, fontWeight:800, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:7 }}>{group.label}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
            {group.types.map(type => {
              const def = BLOCK_DEFS[type];
              return (
                <div key={type} draggable
                  onDragStart={e => { e.dataTransfer.setData("palette-type", type); e.dataTransfer.effectAllowed="copy"; }}
                  onClick={() => colTarget ? onAddToCol(type) : onAdd(type)}
                  title={def.desc}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"8px 4px", background:"#fff", border:`1.5px solid ${C.border}`, borderRadius:9, cursor:"pointer", userSelect:"none", textAlign:"center" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.boxShadow=`0 0 0 2px ${C.accentL}`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow="none"; }}>
                  <span style={{ fontSize:16 }}>{def.icon}</span>
                  <span style={{ fontSize:9, lineHeight:1.2, color:C.text, fontWeight:600 }}>{def.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page Builder ──────────────────────────────────────────────────────────────
function PageBuilder({ template, onSave, onBack }) {
  const t = useAdminT();
  const [blocks, setBlocks] = useState(() => {
    const ex = template?.blocks;
    if (Array.isArray(ex) && ex.length) return ex.map(b => ({ ...b, id: b.id || uid() }));
    return makeDefaultBlocks();
  });
  const [selectedPath, setSelectedPath] = useState(null);
  const [name, setName]     = useState(template?.name || "My Design");
  const [flash, setFlash]   = useState(false);
  const [colTarget, setColTarget] = useState(null);

  function findBlock(id) { return blocks.find(b => b.id === id); }

  function addBlock(type, atIdx) {
    const nb = makeBlock(type);
    setBlocks(prev => { const next = [...prev]; atIdx !== undefined ? next.splice(atIdx, 0, nb) : next.push(nb); return next; });
    setSelectedPath({ blockId: nb.id });
  }

  function addChildBlock(parentId, colIdx, type) {
    const child = makeBlock(type);
    setBlocks(prev => prev.map(b => {
      if (b.id !== parentId) return b;
      const cols = (b.columns || Array.from({length:BLOCK_DEFS[b.type].colCount},()=>[])).map((c,i) => i===colIdx ? [...c, child] : c);
      return { ...b, columns: cols };
    }));
    setSelectedPath({ blockId: parentId, colIdx, childId: child.id });
    setColTarget(null);
  }

  function deleteChildBlock(parentId, colIdx, childId) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== parentId) return b;
      return { ...b, columns: b.columns.map((c,i) => i===colIdx ? c.filter(ch => ch.id!==childId) : c) };
    }));
    if (selectedPath?.childId === childId) setSelectedPath({ blockId: parentId });
  }

  function deleteBlock(id) {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedPath?.blockId === id) setSelectedPath(null);
  }

  function reorder(from, to) {
    setBlocks(prev => { const next=[...prev]; const [m]=next.splice(from,1); next.splice(to,0,m); return next; });
  }

  function getSelectedBlock() {
    if (!selectedPath) return null;
    const top = findBlock(selectedPath.blockId);
    if (!top) return null;
    if (selectedPath.childId) {
      return (top.columns?.[selectedPath.colIdx]||[]).find(c => c.id===selectedPath.childId) || null;
    }
    return top;
  }

  function updateSelectedBlock(updated) {
    if (!selectedPath) return;
    if (selectedPath.childId) {
      setBlocks(prev => prev.map(b => {
        if (b.id !== selectedPath.blockId) return b;
        return { ...b, columns: b.columns.map((c,i) => i===selectedPath.colIdx ? c.map(ch => ch.id===selectedPath.childId ? updated : ch) : c) };
      }));
    } else {
      setBlocks(prev => prev.map(b => b.id===updated.id ? updated : b));
    }
  }

  function handleSave() {
    onSave(name, blocks, template?.id || null);
    setFlash(true);
    setTimeout(() => setFlash(false), 2000);
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", flexDirection:"column", background:C.bg, fontFamily:"inherit" }}>
      {/* Top bar */}
      <div style={{ height:54, background:"#fff", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 16px", gap:12, flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:`1px solid ${C.border}`, cursor:"pointer", color:C.text, fontSize:12.5, fontWeight:600, padding:"6px 12px", borderRadius:8 }}>← Back</button>
        <div style={{ width:1, height:22, background:C.border }} />
        <input value={name} onChange={e => setName(e.target.value)} style={{ padding:"6px 10px", border:"1.5px solid #e4e4e4", borderRadius:8, fontSize:13, fontWeight:700, outline:"none", minWidth:200 }} placeholder="Template name…" />
        <div style={{ flex:1 }} />
        <span style={{ fontSize:12, color:"#059669", fontWeight:700, opacity:flash?1:0, transition:"opacity .3s" }}>✓ Saved!</span>
        <button onClick={handleSave} style={{ padding:"8px 22px", borderRadius:8, fontSize:13, fontWeight:800, background:C.accent, color:"#fff", border:"none", cursor:"pointer", boxShadow:"0 2px 8px rgba(107,26,44,.25)" }}>{t.save}</button>
      </div>

      {/* 3 panels */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <div style={{ width:210, background:"#fff", borderRight:`1px solid ${C.border}`, overflowY:"auto", flexShrink:0 }}>
          <BlockPalette
            onAdd={type => addBlock(type)}
            colTarget={colTarget}
            onClearColTarget={() => setColTarget(null)}
            onAddToCol={type => { if(colTarget) addChildBlock(colTarget.parentId, colTarget.colIdx, type); }}
          />
        </div>

        <Canvas
          blocks={blocks} selectedPath={selectedPath}
          onSelect={setSelectedPath} onReorder={reorder} onDelete={deleteBlock}
          onDropNew={(type,idx) => addBlock(type,idx)}
          onAddChild={addChildBlock} onDeleteChild={deleteChildBlock}
          onSelectChild={setSelectedPath} setColTarget={setColTarget}
        />

        <div style={{ width:270, background:"#fff", borderLeft:`1px solid ${C.border}`, overflowY:"auto", flexShrink:0 }}>
          <PropertiesPanel block={getSelectedBlock()} onChange={updateSelectedBlock} />
        </div>
      </div>
    </div>
  );
}

// ── Paywall ───────────────────────────────────────────────────────────────────
function PaywallPage() {
  return (
    <div style={{ textAlign:"center", padding:"60px 24px", maxWidth:500, margin:"0 auto" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>🔒</div>
      <div style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:8 }}>Page Builder — Advanced Plan</div>
      <div style={{ fontSize:13.5, color:C.muted, lineHeight:1.75, marginBottom:28 }}>Visual drag-and-drop builder with full design control — spacing, typography, colors, column layouts, and 20+ block types.</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:32, textAlign:"left" }}>
        {["20+ block types","2 & 3 column layouts","Full padding & margin controls","Typography: font, size, weight","Border, shadow, radius","Progress bars & stat counters","Review slider & photo grid","Testimonial spotlight blocks"].map(f => (
          <div key={f} style={{ display:"flex", gap:8, alignItems:"flex-start", fontSize:12.5, color:"#374151" }}>
            <span style={{ color:"#059669", fontSize:13, flexShrink:0 }}>✓</span>{f}
          </div>
        ))}
      </div>
      <Link to="/app/billing" style={{ display:"inline-flex", padding:"13px 32px", borderRadius:10, fontSize:14, fontWeight:800, background:C.accent, color:"#fff", textDecoration:"none", boxShadow:"0 3px 12px rgba(107,26,44,.3)" }}>Upgrade to Advanced — $9.99/mo</Link>
      <div style={{ fontSize:11.5, color:C.muted, marginTop:12 }}>5-day free trial · Cancel anytime</div>
    </div>
  );
}

// ── Template Card ─────────────────────────────────────────────────────────────
function TemplateCard({ tpl, onEdit, onActivate, onDelete }) {
  const blocks = Array.isArray(tpl.blocks) ? tpl.blocks : [];
  return (
    <div style={{ background:C.surface, borderRadius:16, border:`2px solid ${tpl.isDefault?C.accent:C.border}`, overflow:"hidden", position:"relative" }}>
      {tpl.isDefault && <div style={{ position:"absolute", top:10, right:10, zIndex:2, background:C.accent, color:"#fff", fontSize:9, fontWeight:800, padding:"3px 9px", borderRadius:20, textTransform:"uppercase" }}>Active</div>}
      <div style={{ height:140, background:"#f9fafb", padding:14, display:"flex", flexDirection:"column", gap:5, overflow:"hidden" }}>
        {blocks.slice(0,5).map((b,i) => {
          const def = BLOCK_DEFS[b.type];
          return <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 8px", background:"#fff", borderRadius:5, border:`1px solid ${C.border}` }}><span style={{ fontSize:10 }}>{def?.icon||"◻"}</span><span style={{ fontSize:9.5, fontWeight:600, color:C.muted }}>{def?.label||b.type}</span></div>;
        })}
        {blocks.length>5 && <div style={{ fontSize:9.5, color:C.muted }}>+{blocks.length-5} more</div>}
        {blocks.length===0 && <div style={{ fontSize:11, color:C.muted }}>Legacy template</div>}
      </div>
      <div style={{ padding:"12px 14px", borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:10 }}>{tpl.name||"Untitled"}</div>
        <div style={{ display:"flex", gap:7 }}>
          <button onClick={onEdit} style={{ flex:1, padding:7, borderRadius:8, fontSize:12, fontWeight:700, border:`1.5px solid ${C.border}`, background:"#fff", cursor:"pointer", color:C.text }}>Edit</button>
          {!tpl.isDefault && <button onClick={onActivate} style={{ flex:1, padding:7, borderRadius:8, fontSize:12, fontWeight:700, border:`1.5px solid ${C.accent}`, background:C.accent, cursor:"pointer", color:"#fff" }}>Activate</button>}
          <button onClick={onDelete} style={{ padding:"7px 10px", borderRadius:8, fontSize:12, border:"1.5px solid #fecaca", background:"#fff0f0", cursor:"pointer", color:"#dc2626" }}>✕</button>
        </div>
      </div>
    </div>
  );
}

// ── Custom HTML Editor ────────────────────────────────────────────────────────
const DEFAULT_CARD_HTML = `<div class="tr-card" id="review-{{id}}">
  <div class="tr-card__header">
    <div class="tr-card__avatar">{{initials}}</div>
    <div class="tr-card__meta">
      <span class="tr-card__name">{{customer}}</span>
      {{verified}}
    </div>
    <span class="tr-card__date">{{date}}</span>
  </div>
  <div class="tr-card__stars">{{stars}}</div>
  {{titleBlock}}
  <p class="tr-card__body">{{comment}}</p>
  {{media}}{{reply}}
  <div class="tr-card__footer">
    <button class="helpful-btn" onclick="likeReview({{id}})">✓ Helpful ({{helpful}})</button>
  </div>
</div>`.trim();

const DEFAULT_CARD_CSS = `.tr-card{background:#fff;border:1px solid #e4e4e4;border-radius:12px;padding:18px;font-family:inherit}
.tr-card__header{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.tr-card__avatar{width:38px;height:38px;border-radius:50%;background:#6B1A2C;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0}
.tr-card__meta{flex:1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.tr-card__name{font-size:14px;font-weight:700;color:#1a1a1a}
.tr-card__date{font-size:11px;color:#6b7280;margin-left:auto}
.tr-verified{font-size:10px;background:#f0fdf4;color:#059669;padding:2px 7px;border-radius:20px;border:1px solid #bbf7d0;font-weight:700}
.tr-card__stars{display:flex;gap:2px;margin-bottom:8px}
.tr-star{font-size:15px;color:#6B1A2C}
.tr-star--empty{color:#e0e0e0}
.tr-card__title{font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:6px}
.tr-card__body{font-size:14px;color:#333;line-height:1.65;margin:0 0 10px}
.tr-card__footer{display:flex;gap:10px;margin-top:12px;border-top:1px solid #e4e4e4;padding-top:10px}
.tr-card__footer .helpful-btn{background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280}`;

const SAMPLE = { id:1, customer:"Sarah Mitchell", initials:"SM", rating:5, comment:"Absolutely love this product!", title:"Amazing quality", date:"Dec 12, 2024", helpful:14 };

function renderSampleCard(tmpl, css) {
  const stars = [1,2,3,4,5].map(i => `<span class="tr-star${i<=SAMPLE.rating?"":" tr-star--empty"}">★</span>`).join("");
  const html = tmpl.replace(/\{\{id\}\}/g,SAMPLE.id).replace(/\{\{customer\}\}/g,SAMPLE.customer).replace(/\{\{initials\}\}/g,SAMPLE.initials).replace(/\{\{rating\}\}/g,SAMPLE.rating).replace(/\{\{stars\}\}/g,stars).replace(/\{\{comment\}\}/g,SAMPLE.comment).replace(/\{\{title\}\}/g,SAMPLE.title).replace(/\{\{titleBlock\}\}/g,`<div class="tr-card__title">${SAMPLE.title}</div>`).replace(/\{\{date\}\}/g,SAMPLE.date).replace(/\{\{verified\}\}/g,'<span class="tr-verified">✓ Verified</span>').replace(/\{\{helpful\}\}/g,SAMPLE.helpful).replace(/\{\{reply\}\}/g,"").replace(/\{\{media\}\}/g,"");
  return `<style>body{margin:0;padding:16px;font-family:sans-serif}${css}</style>${html}`;
}

function CustomHtmlEditor({ initialHtml, initialCss, onSave, onClear, justSaved, justCleared, saveError }) {
  const t = useAdminT();
  const [html, setHtml]       = useState(initialHtml || "");
  const [css, setCss]         = useState(initialCss  || "");
  const [showRef, setShowRef] = useState(false);
  useEffect(() => { setHtml(initialHtml || ""); }, [initialHtml]);
  useEffect(() => { setCss(initialCss   || ""); }, [initialCss]);

  const previewSrc = renderSampleCard(html || DEFAULT_CARD_HTML, css || DEFAULT_CARD_CSS);
  const TA   = { width:"100%", fontFamily:"monospace", fontSize:12, lineHeight:1.6, border:"1.5px solid #e4e4e4", borderRadius:8, padding:"10px 12px", resize:"vertical", outline:"none", boxSizing:"border-box", background:"#1e293b", color:"#e2e8f0" };
  const TH   = { background:"#f3f4f6", padding:"7px 10px", textAlign:"left", fontWeight:700, color:"#6b7280", fontSize:11, borderBottom:"1px solid #e4e4e4" };
  const TD   = { padding:"7px 10px", borderBottom:"1px solid #f3f4f6", verticalAlign:"top" };
  const CODE = { fontFamily:"monospace", background:"#f3f4f6", padding:"1px 5px", borderRadius:4, fontSize:11 };

  function handleExport() {
    [["trust-reviews-card.html",DEFAULT_CARD_HTML,"text/html"],["trust-reviews-card.css",DEFAULT_CARD_CSS,"text/css"]].forEach(([fn,content,mime]) => {
      const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([content],{type:mime})); a.download=fn; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
  }

  return (
    <div>
      <div style={{ background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#1e40af", marginBottom:4 }}>Custom HTML Card Template</div>
        <div style={{ fontSize:12.5, color:"#1e3a8a", lineHeight:1.6 }}>Write your own HTML layout using <code style={{ ...CODE, background:"#dbeafe" }}>{"{{placeholder}}"}</code> tags.</div>
      </div>
      {justSaved   && <div style={{ background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:10, padding:"11px 16px", marginBottom:14, fontSize:13, fontWeight:700, color:"#166534" }}>✅ Template saved.</div>}
      {justCleared && <div style={{ background:"#f9fafb", border:"1.5px solid #e4e4e4", borderRadius:10, padding:"11px 16px", marginBottom:14, fontSize:13, color:"#6b7280" }}>Cleared — reverted to default.</div>}
      {saveError   && <div style={{ background:"#fff0f0", border:"1.5px solid #fecaca", borderRadius:10, padding:"11px 16px", marginBottom:14, fontSize:13, color:"#dc2626" }}>{saveError}</div>}
      <div style={{ display:"flex", gap:18, marginBottom:16, alignItems:"flex-start" }}>
        <div style={{ flex:"0 0 52%", minWidth:0, display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:"uppercase", marginBottom:5 }}>HTML Template</div>
            <textarea value={html} onChange={e => setHtml(e.target.value)} placeholder={DEFAULT_CARD_HTML} rows={16} style={{ ...TA, minHeight:250 }} spellCheck={false} />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:"uppercase", marginBottom:5 }}>CSS</div>
            <textarea value={css} onChange={e => setCss(e.target.value)} placeholder={DEFAULT_CARD_CSS} rows={12} style={{ ...TA, minHeight:190 }} spellCheck={false} />
          </div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:"uppercase", marginBottom:5 }}>Live Preview</div>
          <iframe key={previewSrc.length} srcDoc={previewSrc} sandbox="" style={{ width:"100%", minHeight:460, border:"1.5px solid #e4e4e4", borderRadius:10, background:"#f9fafb", display:"block" }} title="preview" />
        </div>
      </div>
      <div style={{ border:"1px solid #e4e4e4", borderRadius:10, marginBottom:16, overflow:"hidden" }}>
        <button onClick={() => setShowRef(!showRef)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"#f9fafb", border:"none", cursor:"pointer", fontSize:12.5, fontWeight:800, color:C.text }}>
          <span>{"{{placeholder}}"} Reference</span><span style={{ fontSize:10 }}>{showRef?"▲":"▼"}</span>
        </button>
        {showRef && (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead><tr><th style={TH}>Placeholder</th><th style={TH}>Value</th></tr></thead>
            <tbody>
              {[["{{id}}","Review ID"],["{{customer}}","Reviewer name"],["{{initials}}","Initials (SM)"],["{{rating}}","Star count 1–5"],["{{stars}}","Star HTML spans"],["{{comment}}","Review body"],["{{title}}","Title text"],["{{titleBlock}}","Title div or empty"],["{{date}}","Formatted date"],["{{verified}}","Verified badge"],["{{helpful}}","Helpful count"],["{{reply}}","Store reply or empty"],["{{media}}","Image/video or empty"]].map(([ph,desc]) => (
                <tr key={ph}><td style={TD}><code style={CODE}>{ph}</code></td><td style={{ ...TD, color:"#374151", fontSize:11.5 }}>{desc}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={handleExport} style={{ padding:"8px 16px", borderRadius:8, fontSize:12.5, fontWeight:700, border:"1.5px solid #e4e4e4", background:"#fff", cursor:"pointer", color:C.text }}>↓ Export Default</button>
        <button onClick={() => { setHtml(DEFAULT_CARD_HTML); setCss(DEFAULT_CARD_CSS); }} style={{ padding:"8px 16px", borderRadius:8, fontSize:12.5, fontWeight:700, border:"1.5px solid #e4e4e4", background:"#fff", cursor:"pointer", color:C.text }}>Load Default</button>
        {(initialHtml||initialCss) && <button onClick={onClear} style={{ padding:"8px 16px", borderRadius:8, fontSize:12.5, fontWeight:700, border:"1.5px solid #fecaca", background:"#fff0f0", cursor:"pointer", color:"#dc2626" }}>✕ Clear</button>}
        <div style={{ flex:1 }} />
        <button onClick={() => onSave(html, css)} disabled={!html.trim()} style={{ padding:"9px 26px", borderRadius:8, fontSize:13, fontWeight:800, border:"none", cursor:html.trim()?"pointer":"not-allowed", background:html.trim()?C.accent:"#d1d5db", color:"#fff" }}>{t.save}</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CustomizePage() {
  const { templates, dbError, customCardHTML, customCardCSS, isPro } = useLoaderData();
  const actionData = useActionData();
  const submit     = useSubmit();
  const t = useAdminT();

  const [activeTab,       setActiveTab]       = useState("builder");
  const [builderOpen,     setBuilderOpen]     = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => { if (actionData?.savedBuilder) setBuilderOpen(false); }, [actionData]);

  function openBuilder(tpl = null) { setEditingTemplate(tpl); setBuilderOpen(true); }

  function handleSaveBuilder(name, blocks, id) {
    const fd = new FormData();
    fd.append("actionType", "saveBuilder"); fd.append("name", name); fd.append("blocks", JSON.stringify(blocks));
    if (id) fd.append("id", id);
    submit(fd, { method: "post" });
  }

  function handleActivate(id) {
    const fd = new FormData(); fd.append("actionType", "setDefault"); fd.append("id", id);
    submit(fd, { method: "post" });
  }

  function handleDelete(id) {
    if (!confirm("Delete this template?")) return;
    const fd = new FormData(); fd.append("actionType", "delete"); fd.append("id", id);
    submit(fd, { method: "post" });
  }

  function handleSaveCustomHtml(html, css) {
    const fd = new FormData(); fd.append("actionType", "saveCustomHtml"); fd.append("customCardHTML", html); fd.append("customCardCSS", css);
    submit(fd, { method: "post" });
  }

  function handleClearCustomHtml() {
    const fd = new FormData(); fd.append("actionType", "clearCustomHtml");
    submit(fd, { method: "post" });
  }

  if (builderOpen) {
    return <PageBuilder template={editingTemplate} onSave={handleSaveBuilder} onBack={() => setBuilderOpen(false)} />;
  }

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 24px", background:C.bg, minHeight:"100vh", fontFamily:"inherit" }}>
      <div style={{ display:"flex", gap:4, marginBottom:28, borderBottom:`2px solid ${C.border}` }}>
        {[{ key:"builder", label:"🏗️ Page Builder" },{ key:"custom-html", label:"⌨️ Custom HTML" }].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{ padding:"9px 22px", border:"none", cursor:"pointer", fontSize:13.5, fontWeight:700, background:"none", borderBottom:`3px solid ${activeTab===key?C.accent:"transparent"}`, color:activeTab===key?C.accent:C.muted, marginBottom:-2, transition:"color .15s" }}>{label}</button>
        ))}
      </div>

      {activeTab === "custom-html" && (
        <CustomHtmlEditor initialHtml={customCardHTML} initialCss={customCardCSS} onSave={handleSaveCustomHtml} onClear={handleClearCustomHtml} justSaved={!!actionData?.savedCustomHtml} justCleared={!!actionData?.clearedCustomHtml} saveError={actionData?.htmlError} />
      )}

      {activeTab === "builder" && (
        isPro ? (
          <div>
            {dbError && (
              <div style={{ background:"#fff7ed", border:"1.5px solid #fed7aa", borderRadius:12, padding:"14px 18px", marginBottom:20, display:"flex", gap:12, alignItems:"flex-start" }}>
                <span style={{ fontSize:20, flexShrink:0 }}>⚠️</span>
                <div><div style={{ fontSize:13.5, fontWeight:800, color:"#9a3412", marginBottom:4 }}>Database table missing</div><code style={{ display:"inline-block", padding:"6px 12px", background:"#1e293b", color:"#e2e8f0", borderRadius:7, fontSize:12, fontFamily:"monospace" }}>npx prisma db push</code></div>
              </div>
            )}
            {actionData?.activated && (
              <div style={{ display:"flex", alignItems:"center", gap:14, background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
                <span style={{ fontSize:22 }}>✅</span>
                <div style={{ fontSize:13.5, fontWeight:800, color:"#166534" }}>"{actionData.activated}" is now active</div>
              </div>
            )}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <div>
                <h1 style={{ fontSize:22, fontWeight:800, color:C.text, margin:0 }}>{t.customizeTitle}</h1>
                <p style={{ fontSize:13, color:C.muted, margin:"4px 0 0" }}>20+ blocks · 2 & 3 column layouts · Full spacing, typography & style controls</p>
              </div>
              <button onClick={() => openBuilder(null)} style={{ padding:"10px 24px", borderRadius:10, fontSize:13.5, fontWeight:700, background:C.accent, color:"#fff", border:"none", cursor:"pointer" }}>+ New Design</button>
            </div>

            {templates.length === 0 ? (
              <div style={{ textAlign:"center", padding:"80px 20px", background:C.surface, borderRadius:18, border:`2px dashed ${C.border}` }}>
                <div style={{ fontSize:48, marginBottom:14 }}>🏗️</div>
                <div style={{ fontSize:17, fontWeight:700, color:C.text, marginBottom:6 }}>No designs yet</div>
                <div style={{ fontSize:13, color:C.muted, marginBottom:24 }}>Create your first review widget layout.</div>
                <button onClick={() => openBuilder(null)} style={{ padding:"11px 28px", borderRadius:10, fontSize:13.5, fontWeight:700, background:C.accent, color:"#fff", border:"none", cursor:"pointer" }}>+ Create First Design</button>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:20 }}>
                {templates.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} onEdit={() => openBuilder(tpl)} onActivate={() => handleActivate(tpl.id)} onDelete={() => handleDelete(tpl.id)} />)}
                <button onClick={() => openBuilder(null)} style={{ minHeight:220, borderRadius:16, border:`2px dashed ${C.border}`, background:C.surface, cursor:"pointer", color:C.muted, fontSize:13, fontWeight:600, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span style={{ fontSize:30 }}>＋</span>New Design
                </button>
              </div>
            )}
          </div>
        ) : <PaywallPage />
      )}
    </div>
  );
}
