import { useLoaderData, Link, useActionData, useSubmit } from "react-router";
import { useState, useEffect, useContext, useMemo, useRef, createContext } from "react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useAdminT } from "../utils/adminTranslations";
import { hasAdvancedAccess } from "../utils/planGuard.server";

// Feeds this shop's real reviews/rating stats into BlockMockup, wherever it's
// rendered (top-level canvas, column children, the Preview modal) — set via
// context instead of threading two more props through Canvas/ColumnSlot,
// neither of which otherwise needs this data.
const PreviewDataContext = createContext({ reviews: [], avg: 4.8, total: 124, breakdown: { 5: 68, 4: 20, 3: 8, 2: 3, 1: 1 } });
const FALLBACK_REVIEWS = [
  { customer: "Sarah M.", rating: 5, comment: "This is the best product I've ever bought! Great quality and fast shipping." },
  { customer: "John K.",  rating: 5, comment: "Great product, highly recommend! Exactly as described." },
  { customer: "Emily R.", rating: 4, comment: "Really happy with this purchase, will buy again." },
];

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  let templates = [], dbError = null, customCardHTML = "", customCardCSS = "", isPro = false;
  let realReviews = [], realStats = { avg: 0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
  try {
    const [tpls, ls, pro, store] = await Promise.all([
      db.widgetTemplate.findMany({ where: { shop: session.shop }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] }),
      db.reviewListSettings.findUnique({ where: { shop: session.shop } }),
      hasAdvancedAccess(session.shop),
      db.store.findUnique({ where: { shop: session.shop }, select: { id: true } }),
    ]);
    templates = tpls;
    customCardHTML = ls?.customCardHTML || "";
    customCardCSS  = ls?.customCardCSS  || "";
    isPro = pro;

    // Real data for the builder's preview — so the canvas reflects this
    // shop's own reviews instead of the same hardcoded sample for everyone.
    if (store) {
      const [reviews, agg, ratingGroups] = await Promise.all([
        db.review.findMany({
          where: { storeId: store.id, status: "approved" },
          select: { rating: true, comment: true, customer: true, title: true, mediaUrl: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
        db.review.aggregate({
          where: { storeId: store.id, status: "approved" },
          _avg: { rating: true }, _count: { rating: true },
        }),
        db.review.groupBy({
          by: ["rating"], where: { storeId: store.id, status: "approved" }, _count: { rating: true },
        }),
      ]);
      realReviews = reviews;
      const total = agg._count.rating || 0;
      const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      ratingGroups.forEach((g) => { breakdown[g.rating] = g._count.rating; });
      realStats = { avg: agg._avg.rating || 0, total, breakdown };
    }
  } catch { dbError = "Database not ready. Run: npx prisma db push"; }
  return { templates, dbError, customCardHTML, customCardCSS, isPro, realReviews, realStats };
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
    const isPro = await hasAdvancedAccess(shop);
    if (!isPro) return { saveError: "The Page Builder requires the Advanced plan." };

    const name = fd.get("name") || "My Design";
    const blocks = JSON.parse(fd.get("blocks") || "[]");
    const id = fd.get("id") || null;
    try {
      if (id) {
        // updateMany (not update) so a mismatched/stale id from the client fails
        // quietly with count:0 instead of throwing "Record not found" and losing
        // the save entirely — also scopes by shop so an id can never write into
        // another store's template.
        const result = await db.widgetTemplate.updateMany({ where: { id, shop }, data: { name, blocks } });
        if (!result.count) return { saveError: "Could not find that design to update — it may have been deleted." };
      } else {
        await db.widgetTemplate.create({ data: { shop, name, blocks } });
      }
    } catch (err) {
      return { saveError: "Could not save: " + (err?.message || "unknown error") };
    }
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
const C = { accent: "#6B1A2C", accentL: "#f5e6e9", bg: "#f6f6f8", surface: "#fff", border: "#e5e4ec", text: "#17171c", muted: "#6b6b78" };
let _uid = 0;
function uid() { return "b" + (++_uid) + Math.random().toString(36).slice(2, 5); }

const SPACING_DEF = { paddingT: 0, paddingR: 0, paddingB: 0, paddingL: 0, marginT: 0, marginR: 0, marginB: 24, marginL: 0 };
const STYLE_DEF   = { bgColor: "", borderW: 0, borderColor: "#e4e4e4", borderStyle: "solid", radius: 0, shadow: "none", widthVal: 100, widthUnit: "%", minH: 0, alignSelf: "stretch" };
const TYPO_DEF    = { fontFamily: "inherit", fontSize: 16, fontWeight: "400", lineHeight: 1.5, textAlign: "left", color: "#1a1a1a", letterSpacing: 0, textTransform: "none" };

// ── Block definitions ─────────────────────────────────────────────────────────
const BLOCK_DEFS = {
  heading: {
    label: "Heading", icon: "Aa", group: "Layout", desc: "Section title text", hasTypo: true,
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
    label: "Divider", icon: "—", group: "Layout", desc: "Horizontal line or space",
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
  popup: {
    label: "Popup", icon: "▣", group: "Layout", desc: "Button that opens content in a dismissible overlay", isContainer: true, colCount: 1,
    defaults: {
      triggerText: "View Details", triggerBg: "#6B1A2C", triggerColor: "#ffffff", triggerRadius: 8, triggerSize: "medium",
      popupTitle: "", overlayWidth: 480, closeOnOutsideClick: true, showCloseButton: true,
    },
    props: [
      { key: "triggerText",  label: "Button Text",  type: "text" },
      { key: "triggerBg",    label: "Button Color",     type: "color" },
      { key: "triggerColor", label: "Button Text Color", type: "color" },
      { key: "triggerRadius", label: "Button Radius", type: "range", min: 0, max: 40, unit: "px" },
      { key: "triggerSize",  label: "Button Size",  type: "select", options: ["small","medium","large"] },
      { key: "popupTitle",   label: "Popup Title (optional)", type: "text" },
      { key: "overlayWidth", label: "Popup Width",  type: "range", min: 320, max: 900, unit: "px" },
      { key: "closeOnOutsideClick", label: "Close on Outside Click", type: "toggle" },
      { key: "showCloseButton",     label: "Show Close Button",     type: "toggle" },
    ],
  },
  summary: {
    label: "Rating Summary", icon: "★", group: "Reviews", desc: "Average rating + stars",
    defaults: { accentColor: "#6B1A2C", style: "compact", showTotal: true, showBreakdown: false, align: "left" },
    props: [
      { key: "accentColor",   label: "Star Color",     type: "color" },
      { key: "style",         label: "Style",          type: "select", options: [{ value: "compact", label: "Compact" }, { value: "large", label: "Large" }, { value: "minimal", label: "Minimal" }] },
      { key: "align",         label: "Alignment",      type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
      { key: "showTotal",     label: "Show Count",     type: "toggle" },
      { key: "showBreakdown", label: "Show Breakdown", type: "toggle" },
    ],
  },
  progress_bars: {
    label: "Progress Bars", icon: "▤", group: "Reviews", desc: "5-star rating breakdown bars",
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
    label: "Stats Counter", icon: "#", group: "Reviews", desc: "Large stat numbers display",
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
    label: "Review Cards", icon: "☰", group: "Reviews", desc: "Grid / list of review cards",
    defaults: { layout: "grid", columns: 3, gap: 16, cardBg: "#ffffff", cardBorder: "#e4e4e4", cardRadius: 12, cardPadding: 18, cardMinHeight: 160, accentColor: "#6B1A2C", cardShadow: "soft", showAvatar: true, showDate: true, showHelpful: true, showMedia: true, showVerified: true, perPage: 9, elementOrder: ["meta","date","stars","title","comment","media","reply","helpful"], elementPositions: {} },
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
      { key: "elementPositions", label: "Card Layout (drag to position)", type: "freeform", items: [
        { value: "meta",    label: "Avatar + Name" },
        { value: "date",    label: "Review Date" },
        { value: "stars",   label: "Star Rating" },
        { value: "title",   label: "Review Title" },
        { value: "comment", label: "Review Text" },
        { value: "media",   label: "Photo/Video" },
        { value: "reply",   label: "Store Reply" },
        { value: "helpful", label: "Helpful Voting" },
      ] },
      { key: "cardMinHeight", label: "Card Min Height (free layout)", type: "range", min: 100, max: 400, unit: "px" },
    ],
  },
  slider: {
    label: "Review Slider", icon: "◀▶", group: "Reviews", desc: "Horizontal scrolling carousel",
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
    label: "Testimonial Spotlight", icon: "❝", group: "Reviews", desc: "Large featured single review",
    defaults: { accentColor: "#6B1A2C", cardBg: "#f9fafb", textColor: "#1a1a1a", style: "card", showQuote: true, quoteSize: 48, align: "left" },
    props: [
      { key: "accentColor", label: "Accent Color", type: "color" },
      { key: "cardBg",      label: "Background",   type: "color" },
      { key: "textColor",   label: "Text Color",   type: "color" },
      { key: "style",       label: "Style",        type: "select", options: [{ value: "card", label: "Card" }, { value: "quote", label: "Blockquote" }, { value: "minimal", label: "Minimal" }] },
      { key: "align",       label: "Text Alignment", type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
      { key: "showQuote",   label: "Quote Icon",   type: "toggle" },
      { key: "quoteSize",   label: "Quote Size",   type: "range", min: 24, max: 80, unit: "px" },
    ],
  },
  image: {
    label: "Image", icon: "▧", group: "Layout", desc: "A single image, uploaded or linked",
    defaults: { src: "", alt: "", objectFit: "cover", linkUrl: "" },
    props: [
      { key: "src",        label: "Image",              type: "image" },
      { key: "alt",        label: "Alt Text",           type: "text" },
      { key: "objectFit",  label: "Fit",                type: "select", options: ["cover","contain","fill"] },
      { key: "linkUrl",    label: "Link URL (optional)", type: "text" },
    ],
  },
  video: {
    label: "Video", icon: "▶", group: "Layout", desc: "A direct video file (mp4)",
    defaults: { src: "", aspectRatio: "16/9", autoplay: false, muted: true, loop: false },
    props: [
      { key: "src",         label: "Video URL (mp4)", type: "text" },
      { key: "aspectRatio", label: "Aspect Ratio",     type: "select", options: [
        { value: "16/9", label: "16:9" }, { value: "4/3", label: "4:3" },
        { value: "1/1",  label: "Square" }, { value: "9/16", label: "9:16 Vertical" },
      ]},
      { key: "autoplay", label: "Autoplay", type: "toggle" },
      { key: "muted",    label: "Muted",    type: "toggle" },
      { key: "loop",     label: "Loop",     type: "toggle" },
    ],
  },
  photo_grid: {
    label: "Photo Grid", icon: "⊞", group: "Reviews", desc: "Customer photo wall",
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
    label: "Rating Filter", icon: "▾", group: "Reviews", desc: "Filter by star rating",
    defaults: { accentColor: "#6B1A2C", style: "pill", showCounts: true, align: "left" },
    props: [
      { key: "accentColor", label: "Active Color", type: "color" },
      { key: "style",       label: "Style",        type: "select", options: [{ value: "pill", label: "Pill" }, { value: "square", label: "Square" }, { value: "underline", label: "Underline" }] },
      { key: "align",       label: "Alignment",    type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
      { key: "showCounts",  label: "Show Counts",  type: "toggle" },
    ],
  },
  sort: {
    label: "Sort Bar", icon: "↕", group: "Reviews", desc: "Sort dropdown",
    defaults: { defaultSort: "newest", style: "dropdown", align: "left" },
    props: [
      { key: "defaultSort", label: "Default Sort", type: "select", options: [{ value: "newest", label: "Newest" }, { value: "highest", label: "Highest Rated" }, { value: "helpful", label: "Most Helpful" }] },
      { key: "style",       label: "Style",        type: "select", options: [{ value: "dropdown", label: "Dropdown" }, { value: "tabs", label: "Tabs" }] },
      { key: "align",       label: "Alignment",    type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
    ],
  },
  search: {
    label: "Search Box", icon: "⌕", group: "Reviews", desc: "Full-text search input",
    defaults: { placeholder: "Search reviews...", shape: "pill", align: "left" },
    props: [
      { key: "placeholder", label: "Placeholder", type: "text" },
      { key: "shape",       label: "Shape",       type: "select", options: [{ value: "pill", label: "Pill" }, { value: "rounded", label: "Rounded" }, { value: "square", label: "Square" }] },
      { key: "align",       label: "Alignment",   type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
    ],
  },
  write_review: {
    label: "Write Review Button", icon: "✎", group: "Actions", desc: "Opens the review form",
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
    label: "Trust Badge", icon: "✓", group: "Actions", desc: "Verified reviews badge",
    defaults: { text: "Verified Reviews", accentColor: "#6B1A2C", style: "pill", iconType: "check", align: "left" },
    props: [
      { key: "text",        label: "Badge Text", type: "text" },
      { key: "accentColor", label: "Color",      type: "color" },
      { key: "style",       label: "Style",      type: "select", options: [{ value: "pill", label: "Pill" }, { value: "inline", label: "Inline" }, { value: "card", label: "Card" }] },
      { key: "iconType",    label: "Icon",       type: "select", options: [{ value: "check", label: "✓ Check" }, { value: "shield", label: "◆ Shield" }, { value: "star", label: "★ Star" }] },
      { key: "align",       label: "Alignment",  type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
    ],
  },
};

const PALETTE_GROUPS = [
  { label: "Layout",  types: ["heading","paragraph","two_col","three_col","popup","image","video","divider","spacer"] },
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
  return <div style={{ fontSize: 10.5, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }} className="tr-app-routes-app-customize-div-1">{children}</div>;
}

function ColorInput({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="tr-app-routes-app-customize-div-2">
      <input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)}
        style={{ width: 34, height: 34, border: "1.5px solid #e4e4e4", borderRadius: 7, cursor: "pointer", padding: 2, background: "#fff", flexShrink: 0 }}  className="tr-app-routes-app-customize-input-3"/>
      <input type="text" value={value || ""} onChange={e => onChange(e.target.value)}
        style={{ flex: 1, padding: "6px 9px", border: "1.5px solid #e4e4e4", borderRadius: 7, fontSize: 12, fontFamily: "monospace", outline: "none", minWidth: 0 }}  className="tr-app-routes-app-customize-input-4"/>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="tr-app-routes-app-customize-div-5">
      <div onClick={() => onChange(!value)} style={{ width: 42, height: 22, borderRadius: 11, background: value ? C.accent : "#d1d5db", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }} className="tr-app-routes-app-customize-div-6">
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: value ? 23 : 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }}  className="tr-app-routes-app-customize-div-7"/>
      </div>
      <span style={{ fontSize: 12, color: value ? C.accent : C.muted, fontWeight: 600 }} className="tr-app-routes-app-customize-span-8">{value ? "On" : "Off"}</span>
    </div>
  );
}

function RangeNum({ value, onChange, min = 0, max = 100, unit = "" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="tr-app-routes-app-customize-div-9">
      <input type="range" min={min} max={max} value={value ?? min} onChange={e => onChange(Number(e.target.value))} style={{ flex: 1, accentColor: C.accent }}  className="tr-app-routes-app-customize-input-10"/>
      <input type="number" min={min} max={max} value={value ?? min} onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
        style={{ width: 48, padding: "4px 6px", border: "1.5px solid #e4e4e4", borderRadius: 6, fontSize: 12, fontWeight: 600, textAlign: "right", outline: "none" }}  className="tr-app-routes-app-customize-input-11"/>
      {unit && <span style={{ fontSize: 11, color: C.muted }} className="tr-app-routes-app-customize-span-12">{unit}</span>}
    </div>
  );
}

function Sel({ value, onChange, options = [] }) {
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "7px 9px", border: "1.5px solid #e4e4e4", borderRadius: 7, fontSize: 12.5, outline: "none", background: "#fff", color: "#1a1a1a" }} className="tr-app-routes-app-customize-select-13">
      {options.map(o => typeof o === "string" ? <option key={o} value={o} className="tr-app-routes-app-customize-option-14">{o}</option> : <option key={o.value} value={o.value} className="tr-app-routes-app-customize-option-15">{o.label}</option>)}
    </select>
  );
}

function TxtInput({ value, onChange, placeholder = "" }) {
  return <input type="text" value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "7px 9px", border: "1.5px solid #e4e4e4", borderRadius: 7, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}  className="tr-app-routes-app-customize-input-16"/>;
}
function TxtArea({ value, onChange }) {
  return <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={4} style={{ width: "100%", padding: "7px 9px", border: "1.5px solid #e4e4e4", borderRadius: 7, fontSize: 12.5, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}  className="tr-app-routes-app-customize-textarea-17"/>;
}

function ImageUploadField({ value, onChange }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/files", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.url) onChange(data.url);
    } catch {
      // Upload failed — the URL field below still works as a fallback.
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="tr-app-routes-app-customize-div-18">
      {value && (
        <img src={value} alt="" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 7, marginBottom: 8, border: "1.5px solid #e4e4e4" }}  className="tr-app-routes-app-customize-img-19"/>
      )}
      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 10px", border: `1.5px dashed #e4e4e4`, borderRadius: 7, fontSize: 12, color: C.muted, cursor: uploading ? "default" : "pointer", marginBottom: 6 }} className="tr-app-routes-app-customize-label-20">
        {uploading ? "Uploading…" : "Upload Image"}
        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} style={{ display: "none" }}  className="tr-app-routes-app-customize-input-21"/>
      </label>
      <TxtInput value={value} onChange={onChange} placeholder="or paste an image URL" />
    </div>
  );
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
    <div className="tr-app-routes-app-customize-div-22">
      {label && <Lbl>{label}</Lbl>}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }} className="tr-app-routes-app-customize-div-23">
        {[["t","Top"],["r","Right"],["b","Bot"],["l","Left"]].map(([s, lbl]) => (
          <div key={s} style={{ flex: 1, textAlign: "center" }} className="tr-app-routes-app-customize-div-24">
            <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }} className="tr-app-routes-app-customize-div-25">{lbl}</div>
            <input type="number" value={{ t, r, b, l }[s]} min={0} onChange={e => set(s, e.target.value)}
              style={{ width: "100%", padding: "5px 2px", border: `1.5px solid ${linked ? C.accent : "#e4e4e4"}`, borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none", boxSizing: "border-box" }}  className="tr-app-routes-app-customize-input-26"/>
          </div>
        ))}
        <button onClick={() => setLinked(!linked)} title={linked ? "Unlink" : "Link all"}
          style={{ padding: "5px 8px", borderRadius: 6, border: `1.5px solid ${linked ? C.accent : "#e4e4e4"}`, background: linked ? C.accentL : "#fff", cursor: "pointer", fontSize: 12, color: linked ? C.accent : C.muted, flexShrink: 0 }} className="tr-app-routes-app-customize-button-27">
          {linked ? "Linked" : "Link"}
        </button>
      </div>
    </div>
  );
}

function ShadowPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }} className="tr-app-routes-app-customize-div-28">
      {["none","soft","medium","strong","glow"].map(s => (
        <button key={s} onClick={() => onChange(s)} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: `1.5px solid ${value === s ? C.accent : "#e4e4e4"}`, background: value === s ? C.accentL : "#fff", cursor: "pointer", color: value === s ? C.accent : C.muted, textTransform: "capitalize" }} className="tr-app-routes-app-customize-button-29">{s}</button>
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
  if (prop.type === "image")    return <ImageUploadField value={val} onChange={u} />;
  if (prop.type === "freeform") return <FreeformHint value={val} onChange={u} />;
  return <TxtInput value={val} onChange={u} />;
}

// Dragging itself happens directly on the first card in the main canvas (see
// BlockMockup) — a real card at real size beats a small side-panel stand-in,
// and it's what's actually about to render on the storefront. This is just
// the panel-side status + escape hatch for that.
function FreeformHint({ value, onChange }) {
  const isFreeform = value && typeof value === "object" && Object.keys(value).length > 0;
  return (
    <div style={{ padding: "8px 10px", background: "#f9fafb", border: "1.5px solid #e4e4e4", borderRadius: 8 }} className="tr-app-routes-app-customize-div-30">
      <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.5 }} className="tr-app-routes-app-customize-div-31">
        {isFreeform
          ? "Free positioning is on. Drag elements directly on the first card in the canvas to reposition them."
          : "Select this block, then drag any element directly on the first card in the canvas to switch it to free positioning."}
      </div>
      {isFreeform && (
        <button onClick={() => onChange({})} style={{ marginTop: 6, fontSize: 10.5, color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline", padding: 0 }} className="tr-app-routes-app-customize-button-32">Reset to automatic layout</button>
      )}
    </div>
  );
}

function PropertiesPanel({ block, onChange }) {
  const [tab, setTab] = useState("content");

  if (!block) return (
    <div style={{ padding: "40px 14px", textAlign: "center", color: C.muted }} className="tr-app-routes-app-customize-div-33">
      <div style={{ fontSize: 12, lineHeight: 1.6 }} className="tr-app-routes-app-customize-div-34">Click a block to edit its properties</div>
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
    <div className="tr-app-routes-app-customize-div-35">
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: "#fafafa", position: "sticky", top: 0, zIndex: 1 }} className="tr-app-routes-app-customize-div-36">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 2px", fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer", background: "none", borderBottom: `2.5px solid ${tab === t ? C.accent : "transparent"}`, color: tab === t ? C.accent : C.muted, textTransform: "uppercase", letterSpacing: 0.3 }} className="tr-app-routes-app-customize-button-37">
            {TAB_LBL[t]}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 14px" }} className="tr-app-routes-app-customize-div-38">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }} className="tr-app-routes-app-customize-div-39">
          <span style={{ fontSize: 18 }} className="tr-app-routes-app-customize-span-40">{def.icon}</span>
          <div className="tr-app-routes-app-customize-div-41"><div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }} className="tr-app-routes-app-customize-div-42">{def.label}</div><div style={{ fontSize: 10.5, color: C.muted }} className="tr-app-routes-app-customize-div-43">{def.desc}</div></div>
        </div>

        {/* Content */}
        {tab === "content" && def.props.map(prop => (
          <div key={prop.key} style={{ marginBottom: 14 }} className="tr-app-routes-app-customize-div-44">
            <Lbl>{prop.label}</Lbl>
            <PropField prop={prop} settings={st} onChange={update} />
          </div>
        ))}

        {/* Spacing */}
        {tab === "spacing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }} className="tr-app-routes-app-customize-div-45">
            <FourSide label="Padding (px)" values={{ t: st.paddingT, r: st.paddingR, b: st.paddingB, l: st.paddingL }} onChange={v => updateSpacing("padding", v)} />
            <FourSide label="Margin (px)"  values={{ t: st.marginT,  r: st.marginR,  b: st.marginB,  l: st.marginL  }} onChange={v => updateSpacing("margin", v)} />
            <div className="tr-app-routes-app-customize-div-46">
              <Lbl>Width</Lbl>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }} className="tr-app-routes-app-customize-div-47">
                <input type="number" value={st.widthVal ?? 100} min={0} max={9999} onChange={e => update("widthVal", Number(e.target.value))}
                  style={{ width: 70, padding: "6px 8px", border: "1.5px solid #e4e4e4", borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none" }}  className="tr-app-routes-app-customize-input-48"/>
                <Sel value={st.widthUnit || "%"} onChange={v => update("widthUnit", v)} options={[{ value: "%", label: "%" }, { value: "px", label: "px" }]} />
              </div>
            </div>
            <div className="tr-app-routes-app-customize-div-49">
              <Lbl>Horizontal Align</Lbl>
              <Sel value={st.alignSelf || "stretch"} onChange={v => update("alignSelf", v)} options={[{ value: "stretch", label: "Stretch Full" }, { value: "flex-start", label: "Left" }, { value: "center", label: "Center" }, { value: "flex-end", label: "Right" }]} />
            </div>
            <div className="tr-app-routes-app-customize-div-50">
              <Lbl>Min Height (px)</Lbl>
              <RangeNum value={st.minH || 0} onChange={v => update("minH", v)} min={0} max={600} unit="px" />
            </div>
          </div>
        )}

        {/* Style */}
        {tab === "style" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="tr-app-routes-app-customize-div-51">
            <div className="tr-app-routes-app-customize-div-52"><Lbl>Background Color</Lbl><ColorInput value={st.bgColor || ""} onChange={v => update("bgColor", v)} /></div>
            <div className="tr-app-routes-app-customize-div-53"><Lbl>Border Radius (px)</Lbl><RangeNum value={st.radius || 0} onChange={v => update("radius", v)} min={0} max={60} unit="px" /></div>
            <div className="tr-app-routes-app-customize-div-54">
              <Lbl>Border</Lbl>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }} className="tr-app-routes-app-customize-div-55">
                <input type="number" value={st.borderW || 0} min={0} max={10} onChange={e => update("borderW", Number(e.target.value))}
                  style={{ width: 52, padding: "6px 7px", border: "1.5px solid #e4e4e4", borderRadius: 6, fontSize: 12, textAlign: "center", outline: "none" }}  className="tr-app-routes-app-customize-input-56"/>
                <span style={{ fontSize: 10, color: C.muted }} className="tr-app-routes-app-customize-span-57">px</span>
                <Sel value={st.borderStyle || "solid"} onChange={v => update("borderStyle", v)} options={["solid","dashed","dotted","double"]} />
              </div>
              <div style={{ marginTop: 6 }} className="tr-app-routes-app-customize-div-58"><ColorInput value={st.borderColor || "#e4e4e4"} onChange={v => update("borderColor", v)} /></div>
            </div>
            <div className="tr-app-routes-app-customize-div-59"><Lbl>Box Shadow</Lbl><ShadowPicker value={st.shadow || "none"} onChange={v => update("shadow", v)} /></div>
          </div>
        )}

        {/* Typography */}
        {tab === "typo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="tr-app-routes-app-customize-div-60">
            <div className="tr-app-routes-app-customize-div-61">
              <Lbl>Font Family</Lbl>
              <Sel value={st.fontFamily || "inherit"} onChange={v => update("fontFamily", v)} options={[
                { value: "inherit", label: "Theme Default" }, { value: "sans-serif", label: "Sans-serif" }, { value: "serif", label: "Serif" }, { value: "monospace", label: "Monospace" },
                { value: "Georgia, serif", label: "Georgia" }, { value: "Arial, sans-serif", label: "Arial" }, { value: "'Helvetica Neue', sans-serif", label: "Helvetica" },
              ]} />
            </div>
            <div className="tr-app-routes-app-customize-div-62"><Lbl>Font Size (px)</Lbl><RangeNum value={st.fontSize || 16} onChange={v => update("fontSize", v)} min={10} max={80} unit="px" /></div>
            <div className="tr-app-routes-app-customize-div-63">
              <Lbl>Font Weight</Lbl>
              <Sel value={st.fontWeight || "400"} onChange={v => update("fontWeight", v)} options={[
                { value: "300", label: "300 Light" }, { value: "400", label: "400 Regular" }, { value: "500", label: "500 Medium" },
                { value: "600", label: "600 Semi Bold" }, { value: "700", label: "700 Bold" }, { value: "800", label: "800 Extra Bold" }, { value: "900", label: "900 Black" },
              ]} />
            </div>
            <div className="tr-app-routes-app-customize-div-64"><Lbl>Line Height</Lbl><RangeNum value={st.lineHeight || 1.5} onChange={v => update("lineHeight", v)} min={1} max={3} unit="×" /></div>
            <div className="tr-app-routes-app-customize-div-65"><Lbl>Letter Spacing (px)</Lbl><RangeNum value={st.letterSpacing || 0} onChange={v => update("letterSpacing", v)} min={-2} max={10} unit="px" /></div>
            <div className="tr-app-routes-app-customize-div-66">
              <Lbl>Text Align</Lbl>
              <div style={{ display: "flex", gap: 4 }} className="tr-app-routes-app-customize-div-67">
                {[["left","⬅"],["center","↔"],["right","➡"],["justify","≡"]].map(([a, icon]) => (
                  <button key={a} onClick={() => update("textAlign", a)}
                    style={{ flex: 1, padding: "7px 4px", fontSize: 14, border: `1.5px solid ${(st.textAlign||"left") === a ? C.accent : "#e4e4e4"}`, borderRadius: 6, background: (st.textAlign||"left") === a ? C.accentL : "#fff", cursor: "pointer", color: (st.textAlign||"left") === a ? C.accent : C.muted }} className="tr-app-routes-app-customize-button-68">
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="tr-app-routes-app-customize-div-69">
              <Lbl>Text Transform</Lbl>
              <Sel value={st.textTransform || "none"} onChange={v => update("textTransform", v)} options={[{ value: "none", label: "None" }, { value: "uppercase", label: "UPPERCASE" }, { value: "lowercase", label: "lowercase" }, { value: "capitalize", label: "Capitalize" }]} />
            </div>
            <div className="tr-app-routes-app-customize-div-70"><Lbl>Text Color</Lbl><ColorInput value={st.color || "#1a1a1a"} onChange={v => update("color", v)} /></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Block Mockup ──────────────────────────────────────────────────────────────
function BlockMockup({ block, compact = false, editable = false, onUpdateBlock }) {
  const { reviews, avg, total, breakdown } = useContext(PreviewDataContext);
  const st = block.settings;
  const S = compact ? 0.65 : 1;
  const pct = (n) => total ? Math.round((breakdown[n] || 0) / total * 100) : 0;

  // Live drag state for review_list's "drag elements on the actual card"
  // editing — bound to whichever card DOM node cardRef currently points at
  // (only ever the first card, and only while this block is selected).
  const cardRef = useRef(null);
  const [dragKey, setDragKey] = useState(null);
  useEffect(() => {
    if (!dragKey || !onUpdateBlock) return;
    function onMove(e) {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(88, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(90, ((e.clientY - rect.top) / rect.height) * 100));
      onUpdateBlock(block.id, { elementPositions: { ...(st.elementPositions || {}), [dragKey]: { x, y } } });
    }
    function onUp() { setDragKey(null); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragKey]);
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
      case "heading": return <div style={{ fontSize: Math.min((st.fontSize||28)*S, 26), fontWeight: st.fontWeight||"800", color: st.color||"#1a1a1a", textAlign: st.textAlign||"left", fontFamily: st.fontFamily||"inherit", letterSpacing: st.letterSpacing||0, textTransform: st.textTransform||"none", lineHeight: st.lineHeight||1.2 }} className="tr-app-routes-app-customize-div-71">{st.text||"Customer Reviews"}</div>;
      case "paragraph": return <div style={{ fontSize: Math.min((st.fontSize||16)*S,14), color: st.color||"#374151", textAlign: st.textAlign||"left", lineHeight: st.lineHeight||1.5 }} className="tr-app-routes-app-customize-div-72">{(st.text||"").slice(0,100)}{(st.text||"").length>100?"…":""}</div>;
      case "divider": return st.type==="line" ? <hr style={{ border:"none", borderTop:`${st.height||1}px solid ${st.lineColor||"#e4e4e4"}`, margin:0 }}  className="tr-app-routes-app-customize-hr-73"/> : <div style={{ height: Math.min((st.size||24)*0.5,50), background:"repeating-linear-gradient(45deg,#f3f4f6 0,#f3f4f6 5px,transparent 5px,transparent 10px)", borderRadius:4 }}  className="tr-app-routes-app-customize-div-74"/>;
      case "spacer": return <div style={{ height: Math.min((st.size||32)*0.5,60), background:"repeating-linear-gradient(45deg,#f9fafb 0,#f9fafb 5px,transparent 5px,transparent 10px)", borderRadius:4 }}  className="tr-app-routes-app-customize-div-75"/>;
      case "summary": return (
        <div style={{ display:"flex", alignItems:"center", gap:14, justifyContent: st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start" }} className="tr-app-routes-app-customize-div-76">
          <div className="tr-app-routes-app-customize-div-77"><div style={{ fontSize:26*S, fontWeight:600, color:"#1a1a1a", lineHeight:1 }} className="tr-app-routes-app-customize-div-78">{avg.toFixed(1)}</div><div style={{ fontSize:12*S, color:C.muted }} className="tr-app-routes-app-customize-div-79">out of 5</div></div>
          <div className="tr-app-routes-app-customize-div-80">
            <div style={{ display:"flex", gap:1, marginBottom:3 }} className="tr-app-routes-app-customize-div-81">{[1,2,3,4,5].map(i=><span key={i} style={{ color:st.accentColor||"#6B1A2C", fontSize:14*S }} className="tr-app-routes-app-customize-span-82">★</span>)}</div>
            {st.showTotal!==false && <div style={{ fontSize:12*S, color:C.muted }} className="tr-app-routes-app-customize-div-83">Based on {total} reviews</div>}
            {st.showBreakdown && <div style={{ marginTop:4 }} className="tr-app-routes-app-customize-div-84">{[5,4,3].map(n=><div key={n} style={{ display:"flex", alignItems:"center", gap:3, marginBottom:2 }} className="tr-app-routes-app-customize-div-85"><span style={{ fontSize:8*S, color:C.muted, width:14 }} className="tr-app-routes-app-customize-span-86">{n}★</span><div style={{ width:60*S, height:4, background:"#e4e4e4", borderRadius:2 }} className="tr-app-routes-app-customize-div-87"><div style={{ height:4, background:st.accentColor||"#6B1A2C", borderRadius:2, width:pct(n)+"%" }}  className="tr-app-routes-app-customize-div-88"/></div></div>)}</div>}
          </div>
        </div>
      );
      case "progress_bars": return (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }} className="tr-app-routes-app-customize-div-89">
          {[5,4,3,2,1].map((n)=>{
            return <div key={n} style={{ display:"flex", alignItems:"center", gap:8 }} className="tr-app-routes-app-customize-div-90">
              <span style={{ fontSize:10*S, color:C.muted, width:16, flexShrink:0 }} className="tr-app-routes-app-customize-span-91">{n}★</span>
              <div style={{ flex:1, height:st.barHeight||8, background:st.trackColor||"#e4e4e4", borderRadius:st.barRadius||4, overflow:"hidden" }} className="tr-app-routes-app-customize-div-92"><div style={{ width:pct(n)+"%", height:"100%", background:st.accentColor||"#6B1A2C", borderRadius:st.barRadius||4 }}  className="tr-app-routes-app-customize-div-93"/></div>
              {st.showCount!==false && <span style={{ fontSize:9*S, color:C.muted, width:22, textAlign:"right" }} className="tr-app-routes-app-customize-span-94">{breakdown[n]||0}</span>}
            </div>;
          })}
        </div>
      );
      case "stats_row": {
        const stats=[st.showTotal!==false&&{label:"Reviews",value:String(total)},st.showAvg!==false&&{label:"Avg",value:avg.toFixed(1)},st.showFiveStar!==false&&{label:"5-Star",value:pct(5)+"%"}].filter(Boolean);
        return <div style={{ display:"flex", gap:10, flexWrap:"wrap" }} className="tr-app-routes-app-customize-div-95">{stats.map(s=><div key={s.label} style={{ flex:1, minWidth:50, background:st.statBg||"#f9fafb", borderRadius:st.statRadius||12, padding:"9px 10px", textAlign:"center" }} className="tr-app-routes-app-customize-div-96"><div style={{ fontSize:18*S, fontWeight:600, color:st.accentColor||"#6B1A2C", fontVariantNumeric:"tabular-nums" }} className="tr-app-routes-app-customize-div-97">{s.value}</div><div style={{ fontSize:9*S, color:C.muted }} className="tr-app-routes-app-customize-div-98">{s.label}</div></div>)}</div>;
      }
      case "review_list": {
        const layout = st.layout || "grid";
        const cols = Math.min(st.columns||3, compact?2:3);
        const gap = (st.gap||16)*(compact?0.3:0.5);
        const itemCount = layout === "compact" ? 3 : (layout === "list" ? 2 : cols);
        const sample = ["Sarah M.","Megan B.","Alex J."];
        const items = reviews.length ? reviews.slice(0, itemCount) : Array.from({length:itemCount}).map((_,i)=>({ customer: sample[i]||"Customer", rating:5, comment:"Great product…", createdAt: new Date(Date.now()-(i+1)*86400000*3) }));
        const helpfulCompact = st.showHelpful!==false && <span style={{ display:"inline-flex", gap:4, flexShrink:0, fontSize:6.5, color:"#9ca3af" }} className="tr-app-routes-app-customize-span-99">👍<span className="tr-app-routes-app-customize-span-100">0</span>👎<span className="tr-app-routes-app-customize-span-101">0</span></span>;
        const helpfulRow = st.showHelpful!==false && (
          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4, flexWrap:"wrap" }} className="tr-app-routes-app-customize-div-102">
            <span style={{ fontSize:6, color:"#9ca3af" }} className="tr-app-routes-app-customize-span-103">Helpful?</span>
            <span style={{ fontSize:6.5, color:"#374151", border:`1px solid ${st.cardBorder||"#e4e4e4"}`, borderRadius:4, padding:"1px 4px" }} className="tr-app-routes-app-customize-span-104">👍 0</span>
            <span style={{ fontSize:6.5, color:"#374151", border:`1px solid ${st.cardBorder||"#e4e4e4"}`, borderRadius:4, padding:"1px 4px" }} className="tr-app-routes-app-customize-span-105">👎 0</span>
          </div>
        );
        if (layout === "compact") {
          return <div style={{ display:"flex", flexDirection:"column", gap:3 }} className="tr-app-routes-app-customize-div-106">{items.map((r,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 0", borderBottom:i<items.length-1?`1px solid ${st.cardBorder||"#e4e4e4"}`:"none" }} className="tr-app-routes-app-customize-div-107">
              <span style={{ fontSize:7, color:st.accentColor||"#6B1A2C", flexShrink:0, whiteSpace:"nowrap" }} className="tr-app-routes-app-customize-span-108">{"★".repeat(r.rating||5)}</span>
              <span style={{ fontSize:6.5, color:"#6b7280", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} className="tr-app-routes-app-customize-span-109">{r.comment||"Great product…"}</span>
              <span style={{ fontSize:6.5, fontWeight:600, flexShrink:0 }} className="tr-app-routes-app-customize-span-110">{r.customer||"Customer"}</span>
              {helpfulCompact}
            </div>
          ))}</div>;
        }
        let order = Array.isArray(st.elementOrder) && st.elementOrder.length ? st.elementOrder : ["meta","date","stars","title","comment","media","reply","helpful"];
        // "date" used to be baked into "meta" rather than its own orderable
        // element — a block saved before that split has an elementOrder that
        // simply doesn't mention it, which would silently drop the date
        // entirely now that meta no longer renders it inline. Backfill it
        // right after "meta" so existing designs keep showing their date.
        if (order.indexOf("date") === -1) {
          const metaIdx = order.indexOf("meta");
          order = [...order];
          order.splice(metaIdx === -1 ? 0 : metaIdx + 1, 0, "date");
        }
        const elementEls = (r) => ({
          meta: <div key="meta" style={{ display:"flex", alignItems:"center", gap:4, marginBottom:3, flexWrap:"wrap" }} className="tr-app-routes-app-customize-div-111">
            {st.showAvatar!==false && <div style={{ width:12, height:12, borderRadius:"50%", background:st.accentColor||"#6B1A2C", flexShrink:0 }}  className="tr-app-routes-app-customize-div-112"/>}
            <span style={{ fontSize:7, fontWeight:600 }} className="tr-app-routes-app-customize-span-113">{r.customer||"Customer"}</span>
          </div>,
          date: st.showDate!==false && r.createdAt && <div key="date" style={{ fontSize:6.5, color:"#9ca3af" }} className="tr-app-routes-app-customize-div-114">{new Date(r.createdAt).toLocaleDateString()}</div>,
          stars: <div key="stars" style={{ fontSize:8, color:st.accentColor||"#6B1A2C", marginBottom:2 }} className="tr-app-routes-app-customize-div-115">{"★".repeat(r.rating||5)}</div>,
          title: r.title && <div key="title" style={{ fontSize:7, fontWeight:700, marginBottom:2 }} className="tr-app-routes-app-customize-div-116">{r.title}</div>,
          comment: <div key="comment" style={{ fontSize:7, color:"#6b7280" }} className="tr-app-routes-app-customize-div-117">{(r.comment||"Great product…").slice(0,40)}…</div>,
          media: r.mediaUrl && <div key="media" style={{ width:"100%", height:14, borderRadius:3, background:"#e5e7eb", marginTop:2 }}  className="tr-app-routes-app-customize-div-118"/>,
          reply: r.reply && <div key="reply" style={{ fontSize:6.5, color:"#6b7280", borderLeft:`2px solid ${st.accentColor||"#6B1A2C"}`, paddingLeft:4, marginTop:2 }} className="tr-app-routes-app-customize-div-119">{r.reply.slice(0,30)}</div>,
          helpful: helpfulRow,
        });
        const positions = st.elementPositions;
        const isFreeform = positions && Object.keys(positions).length > 0;
        const card = (r,i) => {
          const els = elementEls(r);
          // The first card becomes the live drag surface while this block is
          // selected — dragging any element there switches the whole block to
          // free positioning (isFreeform) and every card (this one included)
          // re-renders from st.elementPositions from then on, so there's no
          // separate "editing view" vs. "real view" to keep in sync.
          const isDragSurface = editable && i === 0 && !compact;
          if (isFreeform || isDragSurface) {
            return <div key={i} ref={isDragSurface ? cardRef : undefined}
              style={{ position:"relative", background:st.cardBg||"#fff", border:`1px solid ${isDragSurface ? C.accent : (st.cardBorder||"#e4e4e4")}`, borderRadius:(st.cardRadius||12)*0.5, minHeight:(st.cardMinHeight||160)*0.4, breakInside: layout==="masonry" ? "avoid" : undefined, marginBottom: layout==="masonry" ? gap : undefined }} className="tr-app-routes-app-customize-div-120">
              {order.map((key,oi) => {
                if (!els[key]) return null;
                const pos = positions?.[key] ?? { x:4, y:Math.min(88,oi*13) };
                return <div key={key}
                  onMouseDown={isDragSurface ? (e) => { e.preventDefault(); setDragKey(key); } : undefined}
                  style={{ position:"absolute", left:pos.x+"%", top:pos.y+"%", maxWidth:"80%",
                    cursor: isDragSurface ? (dragKey===key ? "grabbing" : "grab") : undefined,
                    outline: isDragSurface && dragKey===key ? `2px solid ${C.accent}` : "none", outlineOffset:2 }} className="tr-app-routes-app-customize-div-121">
                  {els[key]}
                </div>;
              })}
            </div>;
          }
          return <div key={i} style={{ background:st.cardBg||"#fff", border:`1px solid ${st.cardBorder||"#e4e4e4"}`, borderRadius:(st.cardRadius||12)*0.5, padding:compact?5:9, breakInside: layout==="masonry" ? "avoid" : undefined, marginBottom: layout==="masonry" ? gap : undefined }} className="tr-app-routes-app-customize-div-122">
            {order.map(key => els[key] || null)}
          </div>;
        };
        if (layout === "list") return <div style={{ display:"flex", flexDirection:"column", gap }} className="tr-app-routes-app-customize-div-123">{items.map(card)}</div>;
        if (layout === "masonry") return <div style={{ columnCount:cols, columnGap:gap }} className="tr-app-routes-app-customize-div-124">{items.map(card)}</div>;
        return <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap }} className="tr-app-routes-app-customize-div-125">{items.map(card)}</div>;
      }
      case "slider": {
        const items = reviews.length ? reviews.slice(0,3) : [{ customer:"Sarah M.", rating:5, comment:"Great product, highly recommend!" }];
        return (
        <div style={{ display:"flex", gap:(st.gap||20)*0.4, overflowX:"hidden", position:"relative" }} className="tr-app-routes-app-customize-div-126">
          {items.map((r,i)=><div key={i} style={{ minWidth:(st.cardWidth||320)*0.26, background:st.cardBg||"#fff", border:"1px solid #e4e4e4", borderRadius:(st.cardRadius||14)*0.5, padding:8, flexShrink:0 }} className="tr-app-routes-app-customize-div-127"><div style={{ display:"flex", gap:2, marginBottom:3 }} className="tr-app-routes-app-customize-div-128">{[1,2,3,4,5].map(j=><span key={j} style={{ color:j<=(r.rating||5)?(st.accentColor||"#6B1A2C"):"#ddd", fontSize:8 }} className="tr-app-routes-app-customize-span-129">★</span>)}</div><div style={{ fontSize:7, color:"#374151", lineHeight:1.4 }} className="tr-app-routes-app-customize-div-130">{(r.comment||"Great product, highly recommend!").slice(0,60)}</div><div style={{ fontSize:7, fontWeight:600, color:"#1a1a1a", marginTop:4 }} className="tr-app-routes-app-customize-div-131">{r.customer||"Customer"}</div></div>)}
          {st.showArrows!==false&&<div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", fontSize:14, color:st.accentColor||"#6B1A2C", background:"#fff", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(0,0,0,.12)", flexShrink:0 }} className="tr-app-routes-app-customize-div-132">›</div>}
        </div>
        );
      }
      case "testimonial": {
        const r = reviews[0] || { customer:"Sarah M.", comment:"This is the best product I've ever bought!" };
        // Real review comments are free-text and unbounded (unlike the old
        // hardcoded sample) — cap length like the other blocks (review_list,
        // slider) so a long comment can't blow out this card's layout.
        const comment = (r.comment||"").length > 180 ? r.comment.slice(0,180)+"…" : r.comment;
        return (
        <div style={{ background:st.cardBg||"#f9fafb", borderRadius:10, padding:compact?9:14, position:"relative", textAlign: st.align||"left" }} className="tr-app-routes-app-customize-div-133">
          {st.showQuote&&<div style={{ fontSize:(st.quoteSize||48)*0.3, color:st.accentColor||"#6B1A2C", lineHeight:1, opacity:0.4, marginBottom:3 }} className="tr-app-routes-app-customize-div-134">"</div>}
          <div style={{ fontSize:compact?7:10, color:st.textColor||"#1a1a1a", lineHeight:1.5, marginBottom:6 }} className="tr-app-routes-app-customize-div-135">{comment}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent: st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start" }} className="tr-app-routes-app-customize-div-136"><div style={{ width:18, height:18, borderRadius:"50%", background:st.accentColor||"#6B1A2C", flexShrink:0 }}  className="tr-app-routes-app-customize-div-137"/><div className="tr-app-routes-app-customize-div-138"><div style={{ fontSize:8, fontWeight:600 }} className="tr-app-routes-app-customize-div-139">{r.customer}</div><div style={{ fontSize:7, color:C.muted }} className="tr-app-routes-app-customize-div-140">Verified buyer</div></div></div>
        </div>
        );
      }
      case "photo_grid": return <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(st.columns||4,4)},1fr)`, gap:st.gap||8 }} className="tr-app-routes-app-customize-div-141">{Array.from({length:Math.min(st.columns||4,8)}).map((_,i)=><div key={i} style={{ background:`hsl(${i*40+200},40%,85%)`, borderRadius:st.radius||8, aspectRatio:st.aspectRatio||"1/1" }}  className="tr-app-routes-app-customize-div-142"/>)}</div>;
      case "image": return st.src
        ? <img src={st.src} alt={st.alt||""} style={{ width:"100%", maxHeight:compact?70:160, objectFit:st.objectFit||"cover", borderRadius:6, display:"block" }}  className="tr-app-routes-app-customize-img-143"/>
        : <div style={{ width:"100%", height:compact?70:120, borderRadius:6, background:"#f3f4f6", border:"1.5px dashed #e4e4e4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:"#9ca3af" }} className="tr-app-routes-app-customize-div-144">▧</div>;
      case "video": return <div style={{ width:"100%", aspectRatio:st.aspectRatio||"16/9", borderRadius:6, background:"#1a1a1a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, color:"#fff", overflow:"hidden" }} className="tr-app-routes-app-customize-div-145">
        {st.src ? <video src={st.src} muted style={{ width:"100%", height:"100%", objectFit:"cover" }}  className="tr-app-routes-app-customize-video-146"/> : "▶"}
      </div>;
      case "filter": return <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent: st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start" }} className="tr-app-routes-app-customize-div-147">{["All","5★","4★","3★"].map((f,i)=><div key={i} style={{ padding:"3px 9px", borderRadius:st.style==="pill"?20:6, fontSize:12, fontWeight:600, border:`1.5px solid ${i===0?(st.accentColor||"#6B1A2C"):"#e4e4e4"}`, background:i===0?(st.accentColor||"#6B1A2C"):"#fff", color:i===0?"#fff":"#374151" }} className="tr-app-routes-app-customize-div-148">{f}</div>)}</div>;
      case "sort": return <div style={{ display:"flex", justifyContent: st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start" }} className="tr-app-routes-app-customize-div-149"><div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 12px", border:"1px solid #e4e4e4", borderRadius:8, background:"#fff", fontSize:compact?9:11, color:"#374151" }} className="tr-app-routes-app-customize-div-150">Sort: Newest ▾</div></div>;
      case "search": {
        const r=st.shape==="pill"?20:st.shape==="square"?0:8;
        return <div style={{ display:"flex", justifyContent: st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start" }} className="tr-app-routes-app-customize-div-151"><div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", border:"1px solid #e4e4e4", borderRadius:r, background:"#fff", maxWidth:220 }} className="tr-app-routes-app-customize-div-152"><span style={{ fontSize:compact?9:11, color:"#9ca3af" }} className="tr-app-routes-app-customize-span-153">{st.placeholder||"Search reviews..."}</span></div></div>;
      }
      case "write_review": {
        const pad={small:"5px 12px",medium:"8px 18px",large:"11px 26px"};
        const fs={small:9,medium:11,large:13};
        return <div style={{ textAlign:st.align||"left" }} className="tr-app-routes-app-customize-div-154"><div style={{ display:"inline-flex", padding:pad[st.size]||pad.medium, borderRadius:st.radius||8, background:st.outline?"transparent":(st.bg||"#6B1A2C"), color:st.outline?(st.bg||"#6B1A2C"):(st.color||"#fff"), fontSize:(fs[st.size]||11)*S, fontWeight:600, border:st.outline?`2px solid ${st.bg||"#6B1A2C"}`:"none", width:st.fullWidth?"100%":undefined, justifyContent:"center" }} className="tr-app-routes-app-customize-div-155">{st.text||"Write a Review"}</div></div>;
      }
      case "button_group": return <div style={{ display:"flex", flexDirection:st.direction||"row", gap:st.gap||12, alignItems:"center", justifyContent:st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start", flexWrap:"wrap" }} className="tr-app-routes-app-customize-div-156"><div style={{ padding:"6px 14px", borderRadius:st.btn1Radius||8, background:st.btn1Bg||"#6B1A2C", color:st.btn1Color||"#fff", fontSize:10*S, fontWeight:600 }} className="tr-app-routes-app-customize-div-157">{st.btn1Text||"Write a Review"}</div><div style={{ padding:"6px 14px", borderRadius:st.btn2Radius||8, background:st.btn2Bg||"transparent", color:st.btn2Color||"#6B1A2C", fontSize:10*S, fontWeight:600, border:`1.5px solid ${st.btn2Border||"#6B1A2C"}` }} className="tr-app-routes-app-customize-div-158">{st.btn2Text||"See All Reviews"}</div></div>;
      case "trust_badge": {
        const icon=st.iconType==="shield"?"◆":st.iconType==="star"?"★":"✓";
        return <div style={{ display:"flex", justifyContent: st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start" }} className="tr-app-routes-app-customize-div-159"><div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:st.style==="inline"?"0":"5px 14px", borderRadius:st.style==="pill"?20:8, background:st.style==="inline"?"transparent":`${st.accentColor||"#6B1A2C"}18` }} className="tr-app-routes-app-customize-div-160"><span style={{ fontSize:11, color:st.accentColor||"#6B1A2C" }} className="tr-app-routes-app-customize-span-161">{icon}</span><span style={{ fontSize:11, fontWeight:600, color:st.accentColor||"#6B1A2C" }} className="tr-app-routes-app-customize-span-162">{total} {st.text||"Verified Reviews"}</span></div></div>;
      }
      default: return <div style={{ fontSize:11, color:C.muted }} className="tr-app-routes-app-customize-div-163">Block: {block.type}</div>;
    }
  }

  return <div style={wrap} className="tr-app-routes-app-customize-div-164">{inner()}</div>;
}

// ── Column Slot ───────────────────────────────────────────────────────────────
function ColumnSlot({ children = [], colIdx, parentId, selectedPath, onAddChild, onDeleteChild, onSelectChild, onMoveBlock, label }) {
  const [dropIdx, setDropIdx] = useState(null); // insertion index within this column; null = not a drop target right now
  const [dragRejected, setDragRejected] = useState(false);
  const isChildSel = id => selectedPath?.parentId === parentId && selectedPath?.colIdx === colIdx && selectedPath?.childId === id;

  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation();
    const index = dropIdx;
    setDropIdx(null); setDragRejected(false);
    if (index == null) return;
    const pt = e.dataTransfer.getData("palette-type");
    if (pt) { onAddChild(colIdx, pt); return; }
    const srcRaw = e.dataTransfer.getData("app/source");
    if (srcRaw) {
      const source = JSON.parse(srcRaw);
      onMoveBlock(source, { scope: "col", parentId, colIdx, index });
    }
  }

  function overAt(e, idx, useBeforeAfter) {
    e.preventDefault(); e.stopPropagation();
    // A container block (2/3-column, popup) can't be dropped into a column —
    // show a rejected state instead of the normal accept highlight. Only
    // `types` is readable during dragover (values need the actual drop).
    if (e.dataTransfer.types.includes("app/is-container")) { setDragRejected(true); return; }
    setDragRejected(false);
    if (!useBeforeAfter) { setDropIdx(idx); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const after = (e.clientY - rect.top) > rect.height / 2;
    setDropIdx(after ? idx + 1 : idx);
  }

  return (
    <div style={{ flex:1, minHeight:80, border:`2px dashed ${dragRejected?"#dc2626":dropIdx!=null?"#93c5fd":C.border}`, borderRadius:10, padding:8, display:"flex", flexDirection:"column", gap:6, background:dragRejected?"#fef2f2":dropIdx!=null?"#eff6ff":"#fafafa", transition:"background .15s, border-color .15s" }}
      onDragOver={e => overAt(e, children.length, false)}
      onDragLeave={() => { setDropIdx(null); setDragRejected(false); }}
      onDrop={handleDrop} className="tr-app-routes-app-customize-div-165">
      <div style={{ fontSize:9.5, fontWeight:600, color:C.muted, textAlign:"center", textTransform:"uppercase", letterSpacing:0.4 }} className="tr-app-routes-app-customize-div-166">{label || `Col ${colIdx+1}`}</div>
      {children.map((child, index) => {
        const def=BLOCK_DEFS[child.type];
        const sel=isChildSel(child.id);
        return (
          <div key={child.id} className="tr-app-routes-app-customize-div-167">
            <InsertionLine active={dropIdx === index} />
            <div draggable
              onDragStart={e => {
                e.stopPropagation();
                e.dataTransfer.setData("app/source", JSON.stringify({ scope:"col", parentId, colIdx, index }));
                e.dataTransfer.effectAllowed = "move";
                const header = e.currentTarget.querySelector(".block-drag-header");
                if (header) e.dataTransfer.setDragImage(header, 14, 14);
              }}
              onDragOver={e => overAt(e, index, true)}
              onClick={e => { e.stopPropagation(); onSelectChild(colIdx, child.id); }}
              style={{ background:"#fff", border:`2px solid ${sel?C.accent:C.border}`, borderRadius:8, overflow:"hidden", cursor:"grab", boxShadow:sel?`0 0 0 3px ${C.accentL}`:"none" }} className="tr-app-routes-app-customize-div-168">
              <div className="block-drag-header" style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 8px", background:sel?C.accentL:"#f9fafb", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:10, color:C.muted, userSelect:"none" }} className="tr-app-routes-app-customize-span-169">⠿</span>
                <span style={{ fontSize:11 }} className="tr-app-routes-app-customize-span-170">{def?.icon}</span>
                <span style={{ fontSize:10, fontWeight:600, color:sel?C.accent:C.muted, flex:1 }} className="tr-app-routes-app-customize-span-171">{def?.label}</span>
                <button onClick={e2 => { e2.stopPropagation(); onDeleteChild(colIdx, child.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontSize:12, padding:"0 2px" }} className="tr-app-routes-app-customize-button-172">✕</button>
              </div>
              <div style={{ padding:"7px 10px" }} className="tr-app-routes-app-customize-div-173"><BlockMockup block={child} compact /></div>
            </div>
          </div>
        );
      })}
      <InsertionLine active={dropIdx === children.length} />
      <button onClick={() => onAddChild(colIdx, "__palette__")}
        style={{ padding:"5px", fontSize:11, color:C.muted, background:"none", border:`1.5px dashed ${C.border}`, borderRadius:6, cursor:"pointer", textAlign:"center" }} className="tr-app-routes-app-customize-button-174">
        + Add Block
      </button>
    </div>
  );
}

// ── Canvas ────────────────────────────────────────────────────────────────────
// Thin animated bar showing exactly where a dragged block will land —
// height/margin tween from 0 so the layout visibly "makes room," rather than
// the previous approach of just tinting the border of whichever row you're
// hovering (which shows *what* you're near, not *where* it'll actually go).
function InsertionLine({ active }) {
  return (
    <div style={{
      height: active ? 3 : 0, margin: active ? "3px 0" : 0,
      background: C.accent, borderRadius: 2,
      transition: "height .12s ease, margin .12s ease",
    }}  className="tr-app-routes-app-customize-div-175"/>
  );
}

function Canvas({ blocks, selectedPath, onSelect, onReorder, onDelete, onDropNew, onAddChild, onDeleteChild, onSelectChild, setColTarget, onMoveBlock, onUpdateBlock }) {
  const [dropIdx, setDropIdx] = useState(null); // insertion index — a line renders *above* blocks[dropIdx], or at the very end when dropIdx === blocks.length

  function overAt(e, idx) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const after = (e.clientY - rect.top) > rect.height / 2;
    setDropIdx(after ? idx + 1 : idx);
  }

  function handleDrop(e) {
    e.preventDefault();
    const toIdx = dropIdx;
    setDropIdx(null);
    if (toIdx == null) return;
    const fromIdx = e.dataTransfer.getData("canvas-index");
    const pt = e.dataTransfer.getData("palette-type");
    if (pt) { onDropNew(pt, toIdx); return; }
    if (fromIdx !== "" && parseInt(fromIdx) !== toIdx) { onReorder(parseInt(fromIdx), toIdx); return; }
    // Not a top-level-originated drag (those set canvas-index above) — check
    // whether a block is being dragged back out of a column onto the canvas.
    const srcRaw = e.dataTransfer.getData("app/source");
    if (srcRaw) {
      const source = JSON.parse(srcRaw);
      if (source.scope === "col") onMoveBlock(source, { scope: "top", index: toIdx });
    }
  }

  const isTopSel = id => selectedPath?.blockId === id && !selectedPath?.childId;

  return (
    // <div style={{ flex:1, overflowY:"auto", padding:"20px 24px", minWidth:0 }}
    //   onDragOver={e => { if(blocks.length===0) e.preventDefault(); }}
    //   onDragLeave={() => { if (blocks.length===0) setDropIdx(null); }}
    //   onDrop={e => { if(blocks.length===0){ const pt=e.dataTransfer.getData("palette-type"); if(pt) onDropNew(pt,0); } }} className="tr-app-routes-app-customize-div-176">

    //   {blocks.length === 0 ? (
    //     <div style={{ border:`2px dashed ${C.border}`, borderRadius:16, padding:"60px 20px", textAlign:"center", color:C.muted }} className="tr-app-routes-app-customize-div-177">
    //       <div style={{ fontSize:28, marginBottom:10, color:C.muted }} className="tr-app-routes-app-customize-div-178">↓</div>
    //       <div style={{ fontSize:14, fontWeight:600 }} className="tr-app-routes-app-customize-div-179">Drag blocks here to build your layout</div>
    //       <div style={{ fontSize:12, marginTop:6 }} className="tr-app-routes-app-customize-div-180">or click a block in the left panel</div>
    //     </div>
    //   ) : (
    //     <div style={{ display:"flex", flexDirection:"column" }} onDragLeave={() => setDropIdx(null)} onDrop={handleDrop} className="tr-app-routes-app-customize-div-181">
    //       {blocks.map((block, idx) => {
    //         const def = BLOCK_DEFS[block.type];
    //         const selected = isTopSel(block.id);
    //         const st = block.settings;

    //         return (
    //           <div key={block.id} className="tr-app-routes-app-customize-div-182">
    //             <InsertionLine active={dropIdx === idx} />
    //             <div draggable
    //               onDragStart={e => {
    //                 e.dataTransfer.setData("canvas-index", String(idx));
    //                 e.dataTransfer.setData("app/source", JSON.stringify({ scope:"top", index: idx }));
    //                 if (def?.isContainer) e.dataTransfer.setData("app/is-container", "1");
    //                 e.dataTransfer.effectAllowed="move";
    //                 // A compact drag ghost (just the header strip) reads as "you're
    //                 // moving a list item," instead of dragging a full preview card.
    //                 const header = e.currentTarget.querySelector(".block-drag-header");
    //                 if (header) e.dataTransfer.setDragImage(header, 16, 16);
    //               }}
    //               onDragOver={e => overAt(e, idx)}
    //               onClick={() => onSelect({ blockId: block.id })}
    //               style={{
    //                 marginTop: st.marginT||0, marginRight: st.marginR||0, marginBottom: st.marginB||6, marginLeft: st.marginL||0,
    //                 ...(st.widthVal < 100 ? { width:`${st.widthVal}${st.widthUnit||"%"}`, alignSelf:st.alignSelf||"stretch" } : {}),
    //                 background:"#fff", border:`2px solid ${selected?C.accent:C.border}`,
    //                 borderRadius:12, overflow:"hidden", cursor:"pointer",
    //                 boxShadow: selected?`0 0 0 3px ${C.accentL}`:"none",
    //                 transition:"border-color .12s, box-shadow .12s",
    //               }} className="tr-app-routes-app-customize-div-183">
    //               <div className="block-drag-header" style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", background:selected?C.accentL:"#f9fafb", borderBottom:`1px solid ${C.border}` }}>
    //                 <span style={{ cursor:"grab", color:C.muted, fontSize:15, userSelect:"none" }} className="tr-app-routes-app-customize-span-184">⠿</span>
    //                 <span style={{ fontSize:13 }} className="tr-app-routes-app-customize-span-185">{def?.icon}</span>
    //                 <span style={{ fontSize:11.5, fontWeight:600, color:selected?C.accent:C.text, flex:1 }} className="tr-app-routes-app-customize-span-186">{def?.label||block.type}</span>
    //                 <button onClick={e => { e.stopPropagation(); onDelete(block.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontSize:14, padding:"0 3px" }} className="tr-app-routes-app-customize-button-187">✕</button>
    //               </div>
    //               <div style={{ padding: def?.isContainer ? "10px" : "12px 14px", minHeight:44 }} className="tr-app-routes-app-customize-div-188">
    //                 {def?.isContainer ? (
    //                   <div style={{ display:"grid", gridTemplateColumns:st.colTemplate||`repeat(${def.colCount},1fr)`, gap:st.gap||24, alignItems:st.alignItems||"start" }} className="tr-app-routes-app-customize-div-189">
    //                     {(block.columns || Array.from({length:def.colCount},()=>[])).map((colBlocks, ci) => (
    //                       <ColumnSlot key={ci} children={colBlocks} colIdx={ci} parentId={block.id} selectedPath={selectedPath}
    //                         label={block.type === "popup" ? "Popup Content" : undefined}
    //                         onAddChild={(colIdx, type) => {
    //                           if (type === "__palette__") { setColTarget({ parentId: block.id, colIdx }); }
    //                           else { onAddChild(block.id, colIdx, type); }
    //                         }}
    //                         onDeleteChild={(colIdx, childId) => onDeleteChild(block.id, colIdx, childId)}
    //                         onSelectChild={(colIdx, childId) => onSelectChild({ blockId: block.id, colIdx, childId })}
    //                         onMoveBlock={onMoveBlock}
    //                       />
    //                     ))}
    //                   </div>
    //                 ) : <BlockMockup block={block} editable={isTopSel(block.id)} onUpdateBlock={onUpdateBlock} />}
    //               </div>
    //             </div>
    //           </div>
    //         );
    //       })}
    //       <InsertionLine active={dropIdx === blocks.length} />
    //       <div style={{ border:`2px dashed ${C.border}`, borderRadius:10, padding:12, textAlign:"center", color:C.muted, fontSize:12, marginTop:6 }}
    //         onDragOver={e => { e.preventDefault(); setDropIdx(blocks.length); }} className="tr-app-routes-app-customize-div-190">
    //         + Drop here to add at the bottom
    //       </div>
    //     </div>
    //   )}
    // </div>
    <div
  style={{
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "26px clamp(14px, 3vw, 30px) 36px",
    minWidth: 0,
    fontSize: 14,
    lineHeight: 1.5,
    color: "#4F7392",
    background:
      "radial-gradient(circle at 50% 0%, rgba(214,230,242,.58), transparent 28%), linear-gradient(180deg,#EEF5FA 0%,#F4F8FB 100%)",
    boxSizing: "border-box",
  }}
  onDragOver={(e) => {
    if (blocks.length === 0) e.preventDefault();
  }}
  onDragLeave={() => {
    if (blocks.length === 0) setDropIdx(null);
  }}
  onDrop={(e) => {
    if (blocks.length === 0) {
      const pt = e.dataTransfer.getData("palette-type");
      if (pt) onDropNew(pt, 0);
    }
  }}
  className="tr-app-routes-app-customize-div-176 tr-builder-canvas"
>
  <style>{`
    .tr-builder-canvas,
    .tr-builder-canvas *{
      box-sizing:border-box;
    }

    .tr-builder-canvas{
      font-size:14px;
      scrollbar-width:thin;
      scrollbar-color:#C5D8E5 transparent;
    }

    .tr-builder-canvas::-webkit-scrollbar{
      width:8px;
      height:8px;
    }

    .tr-builder-canvas::-webkit-scrollbar-track{
      background:transparent;
    }

    .tr-builder-canvas::-webkit-scrollbar-thumb{
      background:#C5D8E5;
      border-radius:20px;
    }

    .tr-builder-canvas::-webkit-scrollbar-thumb:hover{
      background:#AFC8D9;
    }

    .tr-builder-block-card{
      position:relative;
      transition:
        border-color .16s ease,
        box-shadow .16s ease,
        transform .16s ease !important;
    }

    .tr-builder-block-card:hover{
      border-color:#B8D2E3 !important;
      box-shadow:
        0 10px 28px rgba(79,115,146,.075),
        0 2px 5px rgba(79,115,146,.035) !important;
    }

    .tr-builder-block-card:hover .tr-builder-block-header{
      background:#F7FBFD !important;
    }

    .tr-builder-drag-handle{
      transition:
        background .15s ease,
        color .15s ease,
        border-color .15s ease !important;
    }

    .tr-builder-drag-handle:hover{
      background:#E8F2F8 !important;
      color:#4F7392 !important;
      border-color:#C5DBE9 !important;
    }

    .tr-builder-block-delete{
      transition:
        background .15s ease,
        color .15s ease,
        border-color .15s ease,
        transform .15s ease !important;
    }

    .tr-builder-block-delete:hover{
      background:#FFF1F1 !important;
      color:#B54141 !important;
      border-color:#EFCBCB !important;
      transform:scale(1.03);
    }

    .tr-builder-bottom-drop{
      transition:
        border-color .16s ease,
        background .16s ease,
        color .16s ease,
        box-shadow .16s ease,
        transform .16s ease !important;
    }

    .tr-builder-bottom-drop:hover{
      border-color:#8DB4D6 !important;
      background:#F7FBFD !important;
      color:#4F7392 !important;
      box-shadow:0 8px 20px rgba(79,115,146,.07) !important;
      transform:translateY(-1px);
    }

    .tr-builder-empty-state{
      min-height:390px;
    }

    @media(max-width:1024px){
      .tr-builder-canvas{
        padding:22px 18px 30px !important;
      }

      .tr-builder-block-content{
        padding:12px !important;
      }
    }

    @media(max-width:820px){
      .tr-builder-canvas{
        width:100% !important;
        min-width:100% !important;
        padding:18px 14px 28px !important;
        overflow:visible !important;
      }

      .tr-builder-canvas-stack{
        width:100% !important;
        max-width:100% !important;
      }

      .tr-builder-empty-state{
        min-height:320px !important;
        padding:44px 20px !important;
      }

      .tr-builder-block-card{
        width:100% !important;
        max-width:100% !important;
        margin-left:0 !important;
        margin-right:0 !important;
      }

      .tr-builder-container-grid{
        grid-template-columns:1fr !important;
        gap:12px !important;
      }
    }

    @media(max-width:560px){
      .tr-builder-canvas{
        padding:12px 10px 22px !important;
        font-size:14px !important;
      }

      .tr-builder-empty-state{
        min-height:270px !important;
        padding:34px 14px !important;
        border-radius:15px !important;
      }

      .tr-builder-empty-icon{
        width:54px !important;
        height:54px !important;
        border-radius:15px !important;
      }

      .tr-builder-empty-title{
        font-size:14px !important;
      }

      .tr-builder-empty-subtitle{
        font-size:13px !important;
      }

      .tr-builder-block-header{
        padding:8px !important;
        gap:7px !important;
        min-height:46px !important;
      }

      .tr-builder-block-icon-box,
      .tr-builder-drag-handle{
        width:30px !important;
        height:30px !important;
      }

      .tr-builder-block-title{
        font-size:13px !important;
      }

      .tr-builder-selected-label{
        display:none !important;
      }

      .tr-builder-block-delete{
        width:30px !important;
        height:30px !important;
      }

      .tr-builder-block-content{
        padding:10px !important;
      }

      .tr-builder-bottom-drop{
        padding:13px 10px !important;
        font-size:13px !important;
      }
    }

    @media(max-width:380px){
      .tr-builder-canvas{
        padding-left:8px !important;
        padding-right:8px !important;
      }

      .tr-builder-block-header{
        gap:5px !important;
      }

      .tr-builder-block-title{
        font-size:12.5px !important;
      }

      .tr-builder-empty-state{
        padding:30px 12px !important;
      }
    }
  `}</style>

  {blocks.length === 0 ? (
    <div
      style={{
        width: "100%",
        maxWidth: 900,
        minHeight: 390,
        margin: "0 auto",
        border: "1.5px dashed #B7D1E3",
        borderRadius: 20,
        padding: "60px 24px",
        textAlign: "center",
        color: "#829CAF",
        background:
          "linear-gradient(145deg,rgba(255,255,255,.98) 0%,rgba(247,251,253,.98) 100%)",
        boxShadow:
          "0 12px 32px rgba(79,115,146,.05), inset 0 1px 0 rgba(255,255,255,.8)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
      className="tr-app-routes-app-customize-div-177 tr-builder-empty-state"
    >
      <div
        style={{
          position: "absolute",
          width: 210,
          height: 210,
          borderRadius: "50%",
          background: "rgba(214,230,242,.38)",
          top: -120,
          right: -75,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: "rgba(141,180,214,.08)",
          bottom: -90,
          left: -55,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: 62,
          height: 62,
          borderRadius: 17,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 17,
          color: "#4F7392",
          background:
            "linear-gradient(145deg,#F2F7FB 0%,#DDEBF4 100%)",
          border: "1px solid #CCDDEA",
          boxShadow: "0 10px 24px rgba(79,115,146,.09)",
          position: "relative",
          zIndex: 1,
        }}
        className="tr-app-routes-app-customize-div-178 tr-builder-empty-icon"
      >
        <svg
          width="27"
          height="27"
          viewBox="0 0 24 24"
          fill="none"
        >
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.7"
          />

          <path
            d="M12 8V16M8 12H16"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: "#466985",
          lineHeight: 1.35,
          marginBottom: 6,
          letterSpacing: "-.015em",
          position: "relative",
          zIndex: 1,
        }}
        className="tr-app-routes-app-customize-div-179 tr-builder-empty-title"
      >
        Drag blocks here to build your layout
      </div>

      <div
        style={{
          fontSize: 14,
          color: "#859EAF",
          lineHeight: 1.6,
          maxWidth: 360,
          position: "relative",
          zIndex: 1,
        }}
        className="tr-app-routes-app-customize-div-180 tr-builder-empty-subtitle"
      >
        or click a block in the left panel
      </div>
    </div>
  ) : (
    <div
      style={{
        width: "100%",
        maxWidth: 1000,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
      }}
      onDragLeave={() => setDropIdx(null)}
      onDrop={handleDrop}
      className="tr-app-routes-app-customize-div-181 tr-builder-canvas-stack"
    >
      {blocks.map((block, idx) => {
        const def = BLOCK_DEFS[block.type];
        const selected = isTopSel(block.id);
        const st = block.settings;

        return (
          <div
            key={block.id}
            className="tr-app-routes-app-customize-div-182"
          >
            <InsertionLine active={dropIdx === idx} />

            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "canvas-index",
                  String(idx)
                );

                e.dataTransfer.setData(
                  "app/source",
                  JSON.stringify({
                    scope: "top",
                    index: idx,
                  })
                );

                if (def?.isContainer) {
                  e.dataTransfer.setData(
                    "app/is-container",
                    "1"
                  );
                }

                e.dataTransfer.effectAllowed = "move";

                // A compact drag ghost (just the header strip) reads as "you're
                // moving a list item," instead of dragging a full preview card.
                const header =
                  e.currentTarget.querySelector(
                    ".block-drag-header"
                  );

                if (header) {
                  e.dataTransfer.setDragImage(
                    header,
                    16,
                    16
                  );
                }
              }}
              onDragOver={(e) => overAt(e, idx)}
              onClick={() =>
                onSelect({ blockId: block.id })
              }
              style={{
                marginTop: st.marginT || 0,
                marginRight: st.marginR || 0,
                marginBottom: st.marginB || 10,
                marginLeft: st.marginL || 0,

                ...(st.widthVal < 100
                  ? {
                      width: `${st.widthVal}${
                        st.widthUnit || "%"
                      }`,
                      alignSelf:
                        st.alignSelf || "stretch",
                    }
                  : {}),

                background: "#FFFFFF",

                border: selected
                  ? "1.5px solid #8DB4D6"
                  : "1px solid #D5E4ED",

                borderRadius: 16,

                overflow: "hidden",

                cursor: "pointer",

                boxShadow: selected
                  ? "0 0 0 3px rgba(141,180,214,.13), 0 12px 28px rgba(79,115,146,.085)"
                  : "0 5px 16px rgba(79,115,146,.045)",

                transition:
                  "border-color .16s ease, box-shadow .16s ease",

                maxWidth: "100%",
              }}
              className="tr-app-routes-app-customize-div-183 tr-builder-block-card"
            >
              <div
                className="block-drag-header tr-builder-block-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  background: selected
                    ? "linear-gradient(135deg,#EEF6FA 0%,#F8FBFD 100%)"
                    : "#FAFCFD",
                  borderBottom: "1px solid #DFEBF2",
                  minHeight: 48,
                  transition: "background .15s ease",
                }}
              >
                <span
                  style={{
                    width: 31,
                    height: 31,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    borderRadius: 9,
                    color: "#7893A7",
                    background: "#F3F8FB",
                    border: "1px solid #DBE7EF",
                    cursor: "grab",
                    userSelect: "none",
                  }}
                  className="tr-app-routes-app-customize-span-184 tr-builder-drag-handle"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <circle cx="8" cy="6" r="1.45" />
                    <circle cx="16" cy="6" r="1.45" />
                    <circle cx="8" cy="12" r="1.45" />
                    <circle cx="16" cy="12" r="1.45" />
                    <circle cx="8" cy="18" r="1.45" />
                    <circle cx="16" cy="18" r="1.45" />
                  </svg>
                </span>

                <span
                  style={{
                    width: 31,
                    height: 31,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    borderRadius: 9,
                    background: selected
                      ? "#DCEAF4"
                      : "#F1F6FA",
                    border: "1px solid #D6E6F2",
                    fontSize: 16,
                    color: "#4F7392",
                  }}
                  className="tr-app-routes-app-customize-span-185 tr-builder-block-icon-box"
                >
                  {def?.icon}
                </span>

                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 750,
                    color: selected
                      ? "#456985"
                      : "#587991",
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1.35,
                  }}
                  className="tr-app-routes-app-customize-span-186 tr-builder-block-title"
                >
                  {def?.label || block.type}
                </span>

                {selected && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: "#E2EEF6",
                      border: "1px solid #CEE0EC",
                      color: "#5B7D96",
                      fontSize: 10.5,
                      fontWeight: 750,
                      flexShrink: 0,
                    }}
                    className="tr-builder-selected-label"
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "#8DB4D6",
                      }}
                    />

                    Selected
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(block.id);
                  }}
                  aria-label="Delete block"
                  style={{
                    width: 31,
                    height: 31,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: "#FFFFFF",
                    border: "1px solid #E7DDDD",
                    borderRadius: 9,
                    cursor: "pointer",
                    color: "#BE5B5B",
                    padding: 0,
                  }}
                  className="tr-app-routes-app-customize-button-187 tr-builder-block-delete"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 7H19"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />

                    <path
                      d="M9 7V5H15V7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M8 10V18M12 10V18M16 10V18"
                      stroke="currentColor"
                      strokeWidth="1.55"
                      strokeLinecap="round"
                    />

                    <path
                      d="M7 7L8 20H16L17 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <div
                style={{
                  padding: def?.isContainer
                    ? "14px"
                    : "15px 16px",
                  minHeight: 56,
                  background:
                    "linear-gradient(180deg,#FFFFFF 0%,#FEFFFF 100%)",
                }}
                className="tr-app-routes-app-customize-div-188 tr-builder-block-content"
              >
                {def?.isContainer ? (
                  <div
                    style={{
                      display: "grid",

                      gridTemplateColumns:
                        st.colTemplate ||
                        `repeat(${def.colCount},1fr)`,

                      gap: st.gap || 24,

                      alignItems:
                        st.alignItems || "start",

                      width: "100%",
                    }}
                    className="tr-app-routes-app-customize-div-189 tr-builder-container-grid"
                  >
                    {(
                      block.columns ||
                      Array.from(
                        { length: def.colCount },
                        () => []
                      )
                    ).map((colBlocks, ci) => (
                      <ColumnSlot
                        key={ci}
                        children={colBlocks}
                        colIdx={ci}
                        parentId={block.id}
                        selectedPath={selectedPath}
                        label={
                          block.type === "popup"
                            ? "Popup Content"
                            : undefined
                        }
                        onAddChild={(colIdx, type) => {
                          if (
                            type === "__palette__"
                          ) {
                            setColTarget({
                              parentId: block.id,
                              colIdx,
                            });
                          } else {
                            onAddChild(
                              block.id,
                              colIdx,
                              type
                            );
                          }
                        }}
                        onDeleteChild={(
                          colIdx,
                          childId
                        ) =>
                          onDeleteChild(
                            block.id,
                            colIdx,
                            childId
                          )
                        }
                        onSelectChild={(
                          colIdx,
                          childId
                        ) =>
                          onSelectChild({
                            blockId: block.id,
                            colIdx,
                            childId,
                          })
                        }
                        onMoveBlock={onMoveBlock}
                      />
                    ))}
                  </div>
                ) : (
                  <BlockMockup
                    block={block}
                    editable={isTopSel(block.id)}
                    onUpdateBlock={onUpdateBlock}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}

      <InsertionLine
        active={dropIdx === blocks.length}
      />

      <div
        style={{
          border: "1.5px dashed #BED4E3",
          borderRadius: 13,
          padding: "15px 12px",
          textAlign: "center",
          color: "#7894A8",
          fontSize: 14,
          fontWeight: 650,
          marginTop: 9,
          background:
            "linear-gradient(135deg,rgba(255,255,255,.88),rgba(245,250,253,.95))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "copy",
          minHeight: 52,
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDropIdx(blocks.length);
        }}
        className="tr-app-routes-app-customize-div-190 tr-builder-bottom-drop"
      >
        <span
          style={{
            width: 28,
            height: 28,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            background: "#EDF5FA",
            border: "1px solid #D6E6F2",
            color: "#5E7E96",
            flexShrink: 0,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 5V19M5 12H19"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>

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
    // <div style={{ padding:"12px 10px" }} className="tr-app-routes-app-customize-div-191">
    //   {colTarget && (
    //     <div style={{ background:C.accentL, border:`1.5px solid ${C.accent}`, borderRadius:8, padding:"7px 10px", marginBottom:10, fontSize:11, fontWeight:600, color:C.accent, display:"flex", justifyContent:"space-between", alignItems:"center" }} className="tr-app-routes-app-customize-div-192">
    //       <span className="tr-app-routes-app-customize-span-193">Adding to Col {colTarget.colIdx+1}</span>
    //       <button onClick={onClearColTarget} style={{ background:"none", border:"none", cursor:"pointer", color:C.accent, fontSize:12, padding:"0 2px" }} className="tr-app-routes-app-customize-button-194">✕</button>
    //     </div>
    //   )}
    //   {PALETTE_GROUPS.map(group => (
    //     <div key={group.label} style={{ marginBottom:14 }} className="tr-app-routes-app-customize-div-195">
    //       <div style={{ fontSize:9.5, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:7 }} className="tr-app-routes-app-customize-div-196">{group.label}</div>
    //       <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }} className="tr-app-routes-app-customize-div-197">
    //         {group.types.map(type => {
    //           const def = BLOCK_DEFS[type];
    //           return (
    //             <div key={type} draggable
    //               onDragStart={e => { e.dataTransfer.setData("palette-type", type); e.dataTransfer.effectAllowed="copy"; }}
    //               onClick={() => colTarget ? onAddToCol(type) : onAdd(type)}
    //               title={def.desc}
    //               style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"8px 4px", background:"#fff", border:`1.5px solid ${C.border}`, borderRadius:9, cursor:"pointer", userSelect:"none", textAlign:"center" }}
    //               onMouseEnter={e => { e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.boxShadow=`0 0 0 2px ${C.accentL}`; }}
    //               onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow="none"; }} className="tr-app-routes-app-customize-div-198">
    //               <span style={{ fontSize:16 }} className="tr-app-routes-app-customize-span-199">{def.icon}</span>
    //               <span style={{ fontSize:9, lineHeight:1.2, color:C.text, fontWeight:600 }} className="tr-app-routes-app-customize-span-200">{def.label}</span>
    //             </div>
    //           );
    //         })}
    //       </div>
    //     </div>
    //   ))}
    // </div>
    <div
  style={{
    padding: "14px 12px 18px",
    width: "100%",
    boxSizing: "border-box",
  }}
  className="tr-app-routes-app-customize-div-191 tr-builder-palette"
>
  <style>{`
    .tr-builder-palette *{
      box-sizing:border-box;
    }

    .tr-builder-palette-group{
      position:relative;
    }

    .tr-builder-palette-grid{
      display:grid !important;
      grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      gap:7px !important;
    }

    .tr-builder-palette-item{
      transition:
        border-color .16s ease,
        background .16s ease,
        box-shadow .16s ease,
        transform .16s ease !important;
    }

    .tr-builder-palette-item:hover{
      border-color:#8DB4D6 !important;
      background:#F7FBFD !important;
      box-shadow:0 6px 16px rgba(79,115,146,.09) !important;
      transform:translateY(-1px);
    }

    .tr-builder-palette-item:active{
      transform:translateY(0) scale(.985);
    }

    .tr-builder-palette-item:hover .tr-builder-palette-icon{
      background:#E8F2F8 !important;
      border-color:#C4DAE8 !important;
    }

    .tr-builder-palette-close:hover{
      background:rgba(79,115,146,.08) !important;
    }

    @media(max-width:820px){
      .tr-builder-palette{
        padding:14px !important;
      }

      .tr-builder-palette-grid{
        grid-template-columns:repeat(3,minmax(0,1fr)) !important;
        gap:8px !important;
      }

      .tr-builder-palette-item{
        min-height:82px !important;
        padding:10px 7px !important;
      }
    }

    @media(max-width:560px){
      .tr-builder-palette-grid{
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      }

      .tr-builder-palette{
        padding:12px !important;
      }

      .tr-builder-palette-item{
        min-height:78px !important;
      }
    }

    @media(max-width:350px){
      .tr-builder-palette{
        padding:10px !important;
      }

      .tr-builder-palette-grid{
        gap:6px !important;
      }

      .tr-builder-palette-item{
        padding:9px 5px !important;
      }
    }
  `}</style>

  {colTarget && (
    <div
      style={{
        background:
          "linear-gradient(135deg,#EDF5FA 0%,#F8FBFD 100%)",
        border: "1px solid #BFD6E7",
        borderRadius: 11,
        padding: "9px 9px 9px 10px",
        marginBottom: 14,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 5px 14px rgba(79,115,146,.06)",
      }}
      className="tr-app-routes-app-customize-div-192"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        <span
          style={{
            width: 29,
            height: 29,
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#4F7392",
            background: "#FFFFFF",
            border: "1px solid #D6E6F2",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect
              x="4"
              y="5"
              width="16"
              height="14"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M12 5V19"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M8 12H16"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 750,
              color: "#829CAF",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              lineHeight: 1.2,
              marginBottom: 2,
            }}
          >
            Column target
          </div>

          <span
            style={{
              display: "block",
              fontSize: 11.5,
              fontWeight: 750,
              color: "#4F7392",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            className="tr-app-routes-app-customize-span-193"
          >
            Adding to Col {colTarget.colIdx + 1}
          </span>
        </div>
      </div>

      <button
        onClick={onClearColTarget}
        aria-label="Clear column target"
        style={{
          width: 29,
          height: 29,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: "transparent",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          color: "#6F8FA9",
          padding: 0,
          transition: "background .15s ease",
        }}
        className="tr-app-routes-app-customize-button-194 tr-builder-palette-close"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M7 7L17 17M17 7L7 17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )}

  {PALETTE_GROUPS.map((group, groupIndex) => (
    <div
      key={group.label}
      style={{
        marginBottom:
          groupIndex === PALETTE_GROUPS.length - 1
            ? 0
            : 17,
      }}
      className="tr-app-routes-app-customize-div-195 tr-builder-palette-group"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 9,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#7893A7",
            textTransform: "uppercase",
            letterSpacing: ".075em",
            whiteSpace: "nowrap",
          }}
          className="tr-app-routes-app-customize-div-196"
        >
          {group.label}
        </div>

        <div
          style={{
            height: 1,
            flex: 1,
            background:
              "linear-gradient(90deg,#D6E6F2,transparent)",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: 7,
        }}
        className="tr-app-routes-app-customize-div-197 tr-builder-palette-grid"
      >
        {group.types.map((type) => {
          const def = BLOCK_DEFS[type];

          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("palette-type", type);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() =>
                colTarget ? onAddToCol(type) : onAdd(type)
              }
              title={def.desc}
              style={{
                minWidth: 0,
                minHeight: 76,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "9px 6px",
                background: "#FFFFFF",
                border: "1px solid #DCE8F0",
                borderRadius: 11,
                cursor: "grab",
                userSelect: "none",
                textAlign: "center",
                boxShadow:
                  "0 2px 6px rgba(79,115,146,.025)",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  "#8DB4D6";
                e.currentTarget.style.boxShadow =
                  "0 6px 16px rgba(79,115,146,.09)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  "#DCE8F0";
                e.currentTarget.style.boxShadow =
                  "0 2px 6px rgba(79,115,146,.025)";
              }}
              className="tr-app-routes-app-customize-div-198 tr-builder-palette-item"
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: "#F2F7FB",
                  border: "1px solid #D6E6F2",
                  color: "#4F7392",
                  fontSize: 16,
                  lineHeight: 1,
                  transition:
                    "background .16s ease, border-color .16s ease",
                }}
                className="tr-app-routes-app-customize-span-199 tr-builder-palette-icon"
              >
                {def.icon}
              </span>

              <span
                style={{
                  width: "100%",
                  fontSize: 10.5,
                  lineHeight: 1.25,
                  color: "#55748C",
                  fontWeight: 750,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                className="tr-app-routes-app-customize-span-200"
              >
                {def.label}
              </span>
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
function PageBuilder({ template, onSave, onBack, realReviews, realStats, saveError }) {
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
  const [previewOpen, setPreviewOpen] = useState(false);
  // "← Back" used to discard unsaved edits with zero warning — reopening the
  // same template then loaded the last *saved* blocks, looking exactly like
  // the edits never happened. Track a snapshot from mount (and after each
  // save) so Back can confirm before throwing away anything unsaved. Captured
  // lazily from the already-normalized initial `blocks`/`name` state (not
  // re-derived from `template` directly) so ids the loader lacked and this
  // component backfills via uid() don't register as a false "unsaved" diff.
  const savedSnapshot = useRef(null);
  if (savedSnapshot.current === null) savedSnapshot.current = JSON.stringify({ name, blocks });
  function isDirty() { return JSON.stringify({ name, blocks }) !== savedSnapshot.current; }

  const hasRealData = realStats && realStats.total > 0;
  // Memoized so the context value's identity stays stable across unrelated
  // PageBuilder re-renders (every block edit/drag) — otherwise every
  // BlockMockup instance in the tree re-renders on every keystroke even
  // though the underlying review data hasn't changed.
  const previewData = useMemo(() => ({
    reviews: hasRealData && realReviews?.length ? realReviews : FALLBACK_REVIEWS,
    avg: hasRealData ? realStats.avg : 4.8,
    total: hasRealData ? realStats.total : 124,
    breakdown: hasRealData ? realStats.breakdown : { 5: 68, 4: 20, 3: 8, 2: 3, 1: 1 },
  }), [hasRealData, realReviews, realStats]);

  // Same protection for closing/reloading the tab, not just the in-app Back button.
  useEffect(() => {
    function onBeforeUnload(e) {
      if (!isDirty()) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  });

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
    // `to` is a before/after insertion index computed against the array
    // *before* removal (see Canvas's overAt) — removing `from` shifts every
    // later index down by one, so compensate or the block lands one slot
    // past the insertion line shown during the drag.
    const dest = from < to ? to - 1 : to;
    setBlocks(prev => { const next=[...prev]; const [m]=next.splice(from,1); next.splice(dest,0,m); return next; });
  }

  // Generalized move for the 3 directions `reorder`/`addChildBlock` don't cover:
  // top→col, col→top, and col↔col (including reorder within the same column).
  // `source`/`dest` are `{ scope: "top", index }` or `{ scope: "col", parentId, colIdx, index }`.
  function moveBlock(source, dest) {
    const movedType = source.scope === "top"
      ? blocks[source.index]?.type
      : blocks.find(b => b.id === source.parentId)?.columns?.[source.colIdx]?.[source.index]?.type;
    if (!movedType) return;
    // Containers (2/3-column, popup) can never live inside a column — preserves
    // the one-level-of-nesting rule the rest of the builder relies on.
    if (dest.scope === "col" && BLOCK_DEFS[movedType]?.isContainer) return;

    const next = blocks.map(b => ({ ...b, columns: b.columns ? b.columns.map(c => [...c]) : b.columns }));

    let moved;
    if (source.scope === "top") {
      [moved] = next.splice(source.index, 1);
    } else {
      const parent = next.find(b => b.id === source.parentId);
      [moved] = parent.columns[source.colIdx].splice(source.index, 1);
    }
    if (!moved) return;

    // Removing the block shifts later indices in the *same* array down by one —
    // adjust so dropping "before item N" still means the same visual slot.
    let destIndex = dest.index;
    const sameTopArray = source.scope === "top" && dest.scope === "top";
    const sameColArray = source.scope === "col" && dest.scope === "col" &&
      source.parentId === dest.parentId && source.colIdx === dest.colIdx;
    if ((sameTopArray || sameColArray) && source.index < dest.index) destIndex -= 1;

    if (dest.scope === "top") {
      next.splice(destIndex, 0, moved);
    } else {
      const parent = next.find(b => b.id === dest.parentId);
      if (!parent) return;
      if (!parent.columns) parent.columns = Array.from({ length: BLOCK_DEFS[parent.type].colCount }, () => []);
      parent.columns[dest.colIdx].splice(destIndex, 0, moved);
    }

    setBlocks(next);

    const movedWasSelected = selectedPath && (
      (selectedPath.childId && selectedPath.childId === moved.id) ||
      (!selectedPath.childId && selectedPath.blockId === moved.id)
    );
    if (movedWasSelected) {
      setSelectedPath(dest.scope === "top"
        ? { blockId: moved.id }
        : { blockId: dest.parentId, colIdx: dest.colIdx, childId: moved.id });
    }
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

  // Lets BlockMockup patch a top-level block's own settings directly by id
  // while it's being dragged live on the canvas — simpler than routing every
  // drag frame through selectedPath/updateSelectedBlock, and top-level-only
  // is fine since on-canvas dragging is only wired up for top-level blocks.
  function quickUpdateBlock(id, patch) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, settings: { ...b.settings, ...patch } } : b));
  }

  function handleSave() {
    onSave(name, blocks, template?.id || null);
    savedSnapshot.current = JSON.stringify({ name, blocks });
    setFlash(true);
    setTimeout(() => setFlash(false), 2000);
  }

  function handleBack() {
    if (isDirty() && !window.confirm("You have unsaved changes. Leave without saving?")) return;
    onBack();
  }

  return (
    <PreviewDataContext.Provider value={previewData}>
  <div
  style={{
    position: "fixed",
    inset: 0,
    zIndex: 200,
    display: "flex",
    flexDirection: "column",
    background: "#F2F7FB",
    fontFamily: "inherit",
    overflow: "hidden",
  }}
  className="tr-app-routes-app-customize-div-201 tr-builder-shell"
>
  <style>{`
    .tr-builder-shell *{
      box-sizing:border-box;
    }

    .tr-builder-toolbar-button{
      transition:all .18s ease;
    }

    .tr-builder-toolbar-button:hover{
      transform:translateY(-1px);
      border-color:#B9D2E3 !important;
      box-shadow:0 5px 14px rgba(79,115,146,.09) !important;
    }

    .tr-builder-save-button:hover{
      transform:translateY(-1px);
      box-shadow:0 8px 20px rgba(79,115,146,.22) !important;
    }

    .tr-builder-name-input:focus{
      border-color:#8DB4D6 !important;
      box-shadow:0 0 0 3px rgba(141,180,214,.14) !important;
    }

    .tr-builder-left-panel::-webkit-scrollbar,
    .tr-builder-right-panel::-webkit-scrollbar,
    .tr-builder-workspace::-webkit-scrollbar{
      width:7px;
      height:7px;
    }

    .tr-builder-left-panel::-webkit-scrollbar-thumb,
    .tr-builder-right-panel::-webkit-scrollbar-thumb,
    .tr-builder-workspace::-webkit-scrollbar-thumb{
      background:#C7DBE8;
      border-radius:20px;
    }

    @media(max-width:1024px){
      .tr-builder-left-panel{
        width:190px !important;
      }

      .tr-builder-right-panel{
        width:240px !important;
      }

      .tr-builder-toolbar{
        padding:8px 12px !important;
      }

      .tr-builder-name-wrap{
        min-width:170px !important;
      }
    }

    @media(max-width:820px){
      .tr-builder-toolbar{
        height:auto !important;
        min-height:64px !important;
        flex-wrap:wrap !important;
        gap:8px !important;
        padding:9px 10px !important;
      }

      .tr-builder-toolbar-left{
        flex:1 1 100% !important;
        width:100% !important;
      }

      .tr-builder-toolbar-spacer{
        display:none !important;
      }

      .tr-builder-toolbar-actions{
        width:100% !important;
        justify-content:flex-end !important;
      }

      .tr-builder-name-wrap{
        flex:1 !important;
        min-width:0 !important;
      }

      .tr-builder-panels{
        flex-direction:column !important;
        overflow-y:auto !important;
        overflow-x:hidden !important;
      }

      .tr-builder-left-panel{
        width:100% !important;
        min-width:0 !important;
        max-width:none !important;
        height:auto !important;
        max-height:300px !important;
        border-right:none !important;
        border-bottom:1px solid #D6E6F2 !important;
        flex-shrink:0 !important;
      }

      .tr-builder-right-panel{
        width:100% !important;
        min-width:0 !important;
        max-width:none !important;
        height:auto !important;
        max-height:none !important;
        border-left:none !important;
        border-top:1px solid #D6E6F2 !important;
        flex-shrink:0 !important;
      }

      .tr-builder-panels > :nth-child(2){
        width:100% !important;
        min-width:100% !important;
        min-height:520px !important;
        flex:none !important;
      }
    }

    @media(max-width:540px){
      .tr-builder-toolbar{
        padding:8px !important;
      }

      .tr-builder-toolbar-left{
        gap:7px !important;
      }

      .tr-builder-back-text{
        display:none;
      }

      .tr-builder-back-button{
        width:40px !important;
        height:40px !important;
        padding:0 !important;
        justify-content:center !important;
      }

      .tr-builder-divider{
        display:none !important;
      }

      .tr-builder-name-wrap{
        min-height:40px !important;
      }

      .tr-builder-name-input{
        font-size:12px !important;
      }

      .tr-builder-toolbar-actions{
        gap:6px !important;
      }

      .tr-builder-preview-text{
        display:none;
      }

      .tr-builder-preview-button{
        width:40px !important;
        height:40px !important;
        padding:0 !important;
      }

      .tr-builder-save-button{
        flex:1 !important;
        min-height:40px !important;
      }

      .tr-builder-status-row{
        width:100% !important;
        justify-content:flex-start !important;
        order:3;
      }

      .tr-builder-error{
        max-width:100% !important;
        white-space:normal !important;
      }

      .tr-builder-left-panel{
        max-height:270px !important;
      }

      .tr-builder-panels > :nth-child(2){
        min-height:460px !important;
      }
    }
  `}</style>

  {previewOpen && (
    <PreviewModal
      blocks={blocks}
      onClose={() => setPreviewOpen(false)}
    />
  )}

  {/* Top bar */}
  <div
    style={{
      minHeight: 66,
      height: 66,
      background: "rgba(255,255,255,.98)",
      borderBottom: "1px solid #D6E6F2",
      display: "flex",
      alignItems: "center",
      padding: "9px 14px",
      gap: 10,
      flexShrink: 0,
      boxShadow: "0 4px 18px rgba(79,115,146,.07)",
      backdropFilter: "blur(14px)",
      zIndex: 20,
    }}
    className="tr-app-routes-app-customize-div-202 tr-builder-toolbar"
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
        flex: "0 1 auto",
      }}
      className="tr-builder-toolbar-left"
    >
      <button
        onClick={handleBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          minHeight: 38,
          background: "#F8FBFD",
          border: "1px solid #D6E6F2",
          cursor: "pointer",
          color: "#4F7392",
          fontSize: 12.5,
          fontWeight: 750,
          padding: "7px 12px",
          borderRadius: 10,
          boxShadow: "0 2px 7px rgba(79,115,146,.04)",
        }}
        className="tr-app-routes-app-customize-button-203 tr-builder-toolbar-button tr-builder-back-button"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M15 18L9 12L15 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span className="tr-builder-back-text">Back</span>
      </button>

      <div
        style={{
          width: 1,
          height: 26,
          background: "#D6E6F2",
          flexShrink: 0,
        }}
        className="tr-app-routes-app-customize-div-204 tr-builder-divider"
      />

      <div
        style={{
          minWidth: 220,
          height: 40,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 10px",
          background: "#FFFFFF",
          border: "1px solid #D6E6F2",
          borderRadius: 10,
          flex: "0 1 290px",
          boxShadow: "inset 0 1px 2px rgba(79,115,146,.025)",
        }}
        className="tr-builder-name-wrap"
      >
        <span
          style={{
            width: 25,
            height: 25,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#829CAF",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M5 6H19M5 12H15M5 18H12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            width: "100%",
            minWidth: 0,
            padding: 0,
            border: "none",
            fontSize: 13,
            fontWeight: 700,
            outline: "none",
            color: "#4F7392",
            background: "transparent",
          }}
          placeholder="Template name…"
          className="tr-app-routes-app-customize-input-205 tr-builder-name-input"
        />
      </div>
    </div>

    <div
      style={{ flex: 1 }}
      className="tr-app-routes-app-customize-div-206 tr-builder-toolbar-spacer"
    />

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        minWidth: 0,
        flexWrap: "wrap",
      }}
      className="tr-builder-toolbar-actions"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
        className="tr-builder-status-row"
      >
        {saveError && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              color: "#B54848",
              fontWeight: 700,
              maxWidth: 260,
              background: "#FFF4F4",
              border: "1px solid #F3D3D3",
              borderRadius: 8,
              padding: "6px 9px",
              lineHeight: 1.35,
            }}
            className="tr-app-routes-app-customize-span-207 tr-builder-error"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 7V13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="12" cy="17" r="1" fill="currentColor" />
            </svg>

            {saveError}
          </span>
        )}

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11.5,
            color: "#3E7957",
            fontWeight: 700,
            opacity: flash ? 1 : 0,
            transition: "opacity .3s",
            whiteSpace: "nowrap",
          }}
          className="tr-app-routes-app-customize-span-208"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M7 12.5L10.2 15.5L17 8.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          Saved!
        </span>
      </div>

      <button
        onClick={() => setPreviewOpen(true)}
        style={{
          minHeight: 40,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          padding: "8px 14px",
          borderRadius: 10,
          fontSize: 12.5,
          fontWeight: 750,
          background: "#FFFFFF",
          color: "#4F7392",
          border: "1px solid #D6E6F2",
          cursor: "pointer",
          boxShadow: "0 2px 7px rgba(79,115,146,.04)",
        }}
        className="tr-app-routes-app-customize-button-209 tr-builder-toolbar-button tr-builder-preview-button"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M3 12C5.1 8.5 8.2 6.8 12 6.8C15.8 6.8 18.9 8.5 21 12C18.9 15.5 15.8 17.2 12 17.2C8.2 17.2 5.1 15.5 3 12Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle
            cx="12"
            cy="12"
            r="2.5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>

        <span className="tr-builder-preview-text">
          Preview
        </span>
      </button>

      <button
        onClick={handleSave}
        style={{
          minHeight: 40,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          padding: "8px 18px",
          borderRadius: 10,
          fontSize: 12.5,
          fontWeight: 750,
          background:
            "linear-gradient(135deg,#8DB4D6 0%,#7099B9 100%)",
          color: "#FFFFFF",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 6px 16px rgba(79,115,146,.18)",
          transition: "all .18s ease",
          whiteSpace: "nowrap",
        }}
        className="tr-app-routes-app-customize-button-210 tr-builder-save-button"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M5 4H16L19 7V20H5V4Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8 4V9H16V4"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 20V14H16V20"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>

        {t.save}
      </button>
    </div>
  </div>

  {/* 3 panels */}
  <div
    style={{
      flex: 1,
      display: "flex",
      overflow: "hidden",
      minHeight: 0,
      background: "#EEF5FA",
    }}
    className="tr-app-routes-app-customize-div-211 tr-builder-panels tr-builder-workspace"
  >
    {/* Left panel */}
    <div
      style={{
        width: 230,
        background:
          "linear-gradient(180deg,#FFFFFF 0%,#FAFCFD 100%)",
        borderRight: "1px solid #D6E6F2",
        overflowY: "auto",
        flexShrink: 0,
        boxShadow: "5px 0 18px rgba(79,115,146,.035)",
      }}
      className="tr-app-routes-app-customize-div-212 tr-builder-left-panel"
    >
      <div
        style={{
          padding: "14px 14px 10px",
          borderBottom: "1px solid #E5EFF5",
          background: "#FFFFFF",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 31,
              height: 31,
              borderRadius: 9,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#EDF5FA",
              border: "1px solid #D6E6F2",
              color: "#4F7392",
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
            >
              <rect
                x="4"
                y="4"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <rect
                x="14"
                y="4"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <rect
                x="4"
                y="14"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M14 17H20M17 14V20"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: "#4F7392",
                lineHeight: 1.3,
              }}
            >
              Blocks
            </div>

            <div
              style={{
                fontSize: 10.5,
                color: "#8AA2B4",
                marginTop: 2,
              }}
            >
              Add content to your design
            </div>
          </div>
        </div>
      </div>

      <BlockPalette
        onAdd={type => addBlock(type)}
        colTarget={colTarget}
        onClearColTarget={() => setColTarget(null)}
        onAddToCol={type => {
          if (colTarget)
            addChildBlock(
              colTarget.parentId,
              colTarget.colIdx,
              type
            );
        }}
      />
    </div>

    <Canvas
      blocks={blocks}
      selectedPath={selectedPath}
      onSelect={setSelectedPath}
      onReorder={reorder}
      onDelete={deleteBlock}
      onDropNew={(type, idx) => addBlock(type, idx)}
      onAddChild={addChildBlock}
      onDeleteChild={deleteChildBlock}
      onSelectChild={setSelectedPath}
      setColTarget={setColTarget}
      onMoveBlock={moveBlock}
      onUpdateBlock={quickUpdateBlock}
    />

    {/* Right panel */}
    {/* <div
      style={{
        width: 300,
        background:
          "linear-gradient(180deg,#FFFFFF 0%,#FAFCFD 100%)",
        borderLeft: "1px solid #D6E6F2",
        overflowY: "auto",
        flexShrink: 0,
        boxShadow: "-5px 0 18px rgba(79,115,146,.03)",
      }}
      className="tr-app-routes-app-customize-div-213 tr-builder-right-panel"
    >
      <div
        style={{
          padding: "14px 14px 10px",
          borderBottom: "1px solid #E5EFF5",
          background: "#FFFFFF",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 31,
              height: 31,
              borderRadius: 9,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#EDF5FA",
              border: "1px solid #D6E6F2",
              color: "#4F7392",
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M4 7H14M18 7H20M10 17H20M4 17H6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle
                cx="16"
                cy="7"
                r="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle
                cx="8"
                cy="17"
                r="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </span>

          <div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: "#4F7392",
                lineHeight: 1.3,
              }}
            >
              Properties
            </div>

            <div
              style={{
                fontSize: 10.5,
                color: "#8AA2B4",
                marginTop: 2,
              }}
            >
              Edit selected block
            </div>
          </div>
        </div>
      </div>

      <PropertiesPanel
        block={getSelectedBlock()}
        onChange={updateSelectedBlock}
      />
    </div> */}
    <div
  style={{
    width: 310,
    minWidth: 310,
    background:
      "linear-gradient(180deg,#FFFFFF 0%,#FAFCFD 100%)",
    borderLeft: "1px solid #D6E6F2",
    overflowY: "auto",
    overflowX: "hidden",
    flexShrink: 0,
    boxShadow: "-8px 0 28px rgba(79,115,146,.045)",
    fontSize: 14,
    color: "#4F7392",
    position: "relative",
    boxSizing: "border-box",
  }}
  className="tr-app-routes-app-customize-div-213 tr-builder-right-panel"
>
  <style>{`
    .tr-builder-right-panel,
    .tr-builder-right-panel *{
      box-sizing:border-box;
    }

    .tr-builder-right-panel{
      scrollbar-width:thin;
      scrollbar-color:#C7D9E5 transparent;
    }

    .tr-builder-right-panel::-webkit-scrollbar{
      width:7px;
    }

    .tr-builder-right-panel::-webkit-scrollbar-track{
      background:transparent;
    }

    .tr-builder-right-panel::-webkit-scrollbar-thumb{
      background:#C7D9E5;
      border-radius:20px;
    }

    .tr-builder-right-panel::-webkit-scrollbar-thumb:hover{
      background:#ADC6D7;
    }

    .tr-builder-properties-header{
      backdrop-filter:blur(12px);
    }

    .tr-builder-properties-icon{
      transition:
        background .16s ease,
        border-color .16s ease,
        transform .16s ease;
    }

    .tr-builder-properties-header:hover .tr-builder-properties-icon{
      background:#E6F1F7 !important;
      border-color:#BED5E5 !important;
      transform:translateY(-1px);
    }

    @media(max-width:1024px){
      .tr-builder-right-panel{
        width:270px !important;
        min-width:270px !important;
      }
    }

    @media(max-width:820px){
      .tr-builder-right-panel{
        width:100% !important;
        min-width:0 !important;
        max-width:none !important;
        height:auto !important;
        max-height:none !important;
        overflow:visible !important;

        border-left:none !important;
        border-top:1px solid #D6E6F2 !important;

        box-shadow:
          0 -6px 22px rgba(79,115,146,.04) !important;
      }

      .tr-builder-properties-header{
        position:relative !important;
        top:auto !important;
      }
    }

    @media(max-width:560px){
      .tr-builder-properties-header{
        padding:13px 12px !important;
      }

      .tr-builder-properties-icon{
        width:34px !important;
        height:34px !important;
      }

      .tr-builder-properties-title{
        font-size:14px !important;
      }

      .tr-builder-properties-subtitle{
        font-size:12px !important;
      }
    }
  `}</style>

  {/* Header */}
  <div
    style={{
      padding: "14px 15px",
      borderBottom: "1px solid #DDE9F1",
      background:
        "linear-gradient(135deg,rgba(255,255,255,.98) 0%,rgba(247,251,253,.96) 100%)",
      position: "sticky",
      top: 0,
      zIndex: 10,
      boxShadow: "0 4px 14px rgba(79,115,146,.035)",
    }}
    className="tr-builder-properties-header"
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(145deg,#EEF6FA 0%,#E2EEF6 100%)",
          border: "1px solid #D1E2ED",
          color: "#4F7392",
          flexShrink: 0,
          boxShadow: "0 5px 12px rgba(79,115,146,.065)",
        }}
        className="tr-builder-properties-icon"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M4 7H14M18 7H20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          <circle
            cx="16"
            cy="7"
            r="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />

          <path
            d="M4 17H6M10 17H20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          <circle
            cx="8"
            cy="17"
            r="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </span>

      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 800,
            color: "#466A85",
            lineHeight: 1.3,
            letterSpacing: "-.015em",
          }}
          className="tr-builder-properties-title"
        >
          Properties
        </div>

        <div
          style={{
            fontSize: 11.5,
            color: "#879FAF",
            marginTop: 3,
            lineHeight: 1.4,
          }}
          className="tr-builder-properties-subtitle"
        >
          Edit selected block
        </div>
      </div>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 8px",
          borderRadius: 999,
          background: "#F1F7FA",
          border: "1px solid #D8E7F0",
          color: "#6A899F",
          fontSize: 10,
          fontWeight: 750,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#8DB4D6",
          }}
        />

        Settings
      </span>
    </div>
  </div>

  {/* Properties content */}
  <div
    style={{
      width: "100%",
      minHeight: 120,
      background:
        "linear-gradient(180deg,#FFFFFF 0%,#FAFCFD 100%)",
    }}
  >
    <PropertiesPanel
      block={getSelectedBlock()}
      onChange={updateSelectedBlock}
    />
  </div>
</div>
  </div>
</div>
    </PreviewDataContext.Provider>
  );
}

// ── Preview (full-size, real data, no drag/selection chrome) ──────────────────
function PreviewBlock({ block }) {
  const def = BLOCK_DEFS[block.type];
  const st = block.settings || {};
  if (def?.isContainer) {
    const cols = block.columns || Array.from({ length: def.colCount }, () => []);
    return (
      <div style={{ marginBottom: st.marginB ?? 24 }} className="tr-app-routes-app-customize-div-214">
        {block.type === "popup" && (
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontStyle: "italic" }} className="tr-app-routes-app-customize-div-215">
            Popup content — opens when the shopper clicks "{st.triggerText || "View Details"}" on the storefront:
          </div>
        )}
        <div style={{
          display: "grid", gridTemplateColumns: st.colTemplate || `repeat(${def.colCount},1fr)`,
          gap: st.gap ?? 24, alignItems: st.alignItems || "start",
          ...(block.type === "popup" ? { border: `1px dashed ${C.border}`, borderRadius: 12, padding: 16 } : {}),
        }} className="tr-app-routes-app-customize-div-216">
          {cols.map((colBlocks, ci) => (
            <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 4 }} className="tr-app-routes-app-customize-div-217">
              {colBlocks.map(child => <PreviewBlock key={child.id} block={child} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return <div style={{ marginBottom: st.marginB ?? 24 }} className="tr-app-routes-app-customize-div-218"><BlockMockup block={block} /></div>;
}

function PreviewModal({ blocks, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,15,20,.55)", display: "flex", justifyContent: "center", overflowY: "auto", padding: "40px 20px" }}
      onClick={onClose}
     className="tr-app-routes-app-customize-div-219">
      <div
        style={{ background: "#fff", borderRadius: 16, maxWidth: 900, width: "100%", height: "fit-content", padding: "32px 36px 40px", position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,.3)" }}
        onClick={e => e.stopPropagation()}
       className="tr-app-routes-app-customize-div-220">
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", fontSize: 15, color: C.muted }} className="tr-app-routes-app-customize-button-221">✕</button>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 22 }} className="tr-app-routes-app-customize-div-222">Preview</div>
        {blocks.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: C.muted, fontSize: 13.5 }} className="tr-app-routes-app-customize-div-223">Add some blocks to see a preview.</div>
        ) : (
          blocks.map(block => <PreviewBlock key={block.id} block={block} />)
        )}
      </div>
    </div>
  );
}

// ── Paywall ───────────────────────────────────────────────────────────────────
function PaywallPage() {
  return (
    <div style={{ textAlign:"center", padding:"60px 24px", maxWidth:500, margin:"0 auto" }} className="tr-app-routes-app-customize-div-224">
      <div style={{ fontSize:12, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:C.accent, marginBottom:14 }} className="tr-app-routes-app-customize-div-225">Locked</div>
      <div style={{ fontSize:22, fontWeight:600, color:C.text, marginBottom:8 }} className="tr-app-routes-app-customize-div-226">Page Builder — Advanced Plan</div>
      <div style={{ fontSize:13.5, color:C.muted, lineHeight:1.75, marginBottom:28 }} className="tr-app-routes-app-customize-div-227">Visual drag-and-drop builder with full design control — spacing, typography, colors, column layouts, and 20+ block types.</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:32, textAlign:"left" }} className="tr-app-routes-app-customize-div-228">
        {["20+ block types","2 & 3 column layouts","Full padding & margin controls","Typography: font, size, weight","Border, shadow, radius","Progress bars & stat counters","Review slider & photo grid","Testimonial spotlight blocks"].map(f => (
          <div key={f} style={{ display:"flex", gap:8, alignItems:"flex-start", fontSize:12.5, color:"#374151" }} className="tr-app-routes-app-customize-div-229">
            <span style={{ color:"#059669", fontSize:13, flexShrink:0 }} className="tr-app-routes-app-customize-span-230">✓</span>{f}
          </div>
        ))}
      </div>
      <Link to="/app/billing" style={{ display:"inline-flex", padding:"13px 32px", borderRadius:10, fontSize:14, fontWeight:600, background:C.accent, color:"#fff", textDecoration:"none", boxShadow:"0 3px 12px rgba(107,26,44,.3)" }}>Upgrade to Advanced — $9.99/mo</Link>
      <div style={{ fontSize:11.5, color:C.muted, marginTop:12 }} className="tr-app-routes-app-customize-div-231">5-day free trial · Cancel anytime</div>
    </div>
  );
}

// ── Template Card ─────────────────────────────────────────────────────────────
function TemplateCard({ tpl, onEdit, onActivate, onDelete }) {
  const blocks = Array.isArray(tpl.blocks) ? tpl.blocks : [];
  const [copied, setCopied] = useState(false);
  function copyId() {
    navigator.clipboard.writeText(tpl.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }
  return (
    <div style={{ background:C.surface, borderRadius:16, border:`2px solid ${tpl.isDefault?C.accent:C.border}`, overflow:"hidden", position:"relative" }} className="tr-app-routes-app-customize-div-232">
      {tpl.isDefault && <div style={{ position:"absolute", top:10, right:10, zIndex:2, background:C.accent, color:"#fff", fontSize:9, fontWeight:600, padding:"3px 9px", borderRadius:20, textTransform:"uppercase" }} className="tr-app-routes-app-customize-div-233">Active</div>}
      <div style={{ height:140, background:"#f9fafb", padding:14, display:"flex", flexDirection:"column", gap:5, overflow:"hidden" }} className="tr-app-routes-app-customize-div-234">
        {blocks.slice(0,5).map((b,i) => {
          const def = BLOCK_DEFS[b.type];
          return <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 8px", background:"#fff", borderRadius:5, border:`1px solid ${C.border}` }} className="tr-app-routes-app-customize-div-235"><span style={{ fontSize:10 }} className="tr-app-routes-app-customize-span-236">{def?.icon||"◻"}</span><span style={{ fontSize:9.5, fontWeight:600, color:C.muted }} className="tr-app-routes-app-customize-span-237">{def?.label||b.type}</span></div>;
        })}
        {blocks.length>5 && <div style={{ fontSize:9.5, color:C.muted }} className="tr-app-routes-app-customize-div-238">+{blocks.length-5} more</div>}
        {blocks.length===0 && <div style={{ fontSize:11, color:C.muted }} className="tr-app-routes-app-customize-div-239">Legacy template</div>}
      </div>
      <div style={{ padding:"12px 14px", borderTop:`1px solid ${C.border}` }} className="tr-app-routes-app-customize-div-240">
        <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:4 }} className="tr-app-routes-app-customize-div-241">{tpl.name||"Untitled"}</div>
        <button
          onClick={copyId}
          title="Copy this template's ID to pin a specific 'Custom Template' block to it in Theme Editor"
          style={{ display:"flex", alignItems:"center", gap:5, marginBottom:10, padding:0, border:"none", background:"none", cursor:"pointer", fontSize:10.5, color:C.muted, fontFamily:"monospace" }}
         className="tr-app-routes-app-customize-button-242">
          {copied ? "Copied!" : `ID: ${tpl.id.slice(0, 10)}…`}
        </button>
        <div style={{ display:"flex", gap:7 }} className="tr-app-routes-app-customize-div-243">
          <button onClick={onEdit} style={{ flex:1, padding:7, borderRadius:8, fontSize:12, fontWeight:600, border:`1.5px solid ${C.border}`, background:"#fff", cursor:"pointer", color:C.text }} className="tr-app-routes-app-customize-button-244">Edit</button>
          {!tpl.isDefault && <button onClick={onActivate} style={{ flex:1, padding:7, borderRadius:8, fontSize:12, fontWeight:600, border:`1.5px solid ${C.accent}`, background:C.accent, cursor:"pointer", color:"#fff" }} className="tr-app-routes-app-customize-button-245">Activate</button>}
          <button onClick={onDelete} style={{ padding:"7px 10px", borderRadius:8, fontSize:12, border:"1.5px solid #fecaca", background:"#fff0f0", cursor:"pointer", color:"#dc2626" }} className="tr-app-routes-app-customize-button-246">✕</button>
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
  const TH   = { background:"#f3f4f6", padding:"7px 10px", textAlign:"left", fontWeight:600, color:"#6b7280", fontSize:11, borderBottom:"1px solid #e4e4e4" };
  const TD   = { padding:"7px 10px", borderBottom:"1px solid #f3f4f6", verticalAlign:"top" };
  const CODE = { fontFamily:"monospace", background:"#f3f4f6", padding:"1px 5px", borderRadius:4, fontSize:11 };

  function handleExport() {
    [["trust-reviews-card.html",DEFAULT_CARD_HTML,"text/html"],["trust-reviews-card.css",DEFAULT_CARD_CSS,"text/css"]].forEach(([fn,content,mime]) => {
      const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([content],{type:mime})); a.download=fn; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
  }

  return (
    <div className="tr-app-routes-app-customize-div-247">
      <div style={{ background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:12, padding:"14px 18px", marginBottom:20 }} className="tr-app-routes-app-customize-div-248">
        <div style={{ fontSize:13, fontWeight:600, color:"#1e40af", marginBottom:4 }} className="tr-app-routes-app-customize-div-249">Custom HTML Card Template</div>
        <div style={{ fontSize:12.5, color:"#1e3a8a", lineHeight:1.6 }} className="tr-app-routes-app-customize-div-250">Write your own HTML layout using <code style={{ ...CODE, background:"#dbeafe" }} className="tr-app-routes-app-customize-code-251">{"{{placeholder}}"}</code> tags.</div>
      </div>
      {justSaved   && <div style={{ background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:10, padding:"11px 16px", marginBottom:14, fontSize:13, fontWeight:600, color:"#166534" }} className="tr-app-routes-app-customize-div-252">✓ Template saved.</div>}
      {justCleared && <div style={{ background:"#f9fafb", border:"1.5px solid #e4e4e4", borderRadius:10, padding:"11px 16px", marginBottom:14, fontSize:13, color:"#6b7280" }} className="tr-app-routes-app-customize-div-253">Cleared — reverted to default.</div>}
      {saveError   && <div style={{ background:"#fff0f0", border:"1.5px solid #fecaca", borderRadius:10, padding:"11px 16px", marginBottom:14, fontSize:13, color:"#dc2626" }} className="tr-app-routes-app-customize-div-254">{saveError}</div>}
      <div style={{ display:"flex", gap:18, marginBottom:16, alignItems:"flex-start" }} className="tr-app-routes-app-customize-div-255">
        <div style={{ flex:"0 0 52%", minWidth:0, display:"flex", flexDirection:"column", gap:12 }} className="tr-app-routes-app-customize-div-256">
          <div className="tr-app-routes-app-customize-div-257">
            <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", marginBottom:5 }} className="tr-app-routes-app-customize-div-258">HTML Template</div>
            <textarea value={html} onChange={e => setHtml(e.target.value)} placeholder={DEFAULT_CARD_HTML} rows={16} style={{ ...TA, minHeight:250 }} spellCheck={false}  className="tr-app-routes-app-customize-textarea-259"/>
          </div>
          <div className="tr-app-routes-app-customize-div-260">
            <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", marginBottom:5 }} className="tr-app-routes-app-customize-div-261">CSS</div>
            <textarea value={css} onChange={e => setCss(e.target.value)} placeholder={DEFAULT_CARD_CSS} rows={12} style={{ ...TA, minHeight:190 }} spellCheck={false}  className="tr-app-routes-app-customize-textarea-262"/>
          </div>
        </div>
        <div style={{ flex:1, minWidth:0 }} className="tr-app-routes-app-customize-div-263">
          <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", marginBottom:5 }} className="tr-app-routes-app-customize-div-264">Live Preview</div>
          <iframe key={previewSrc.length} srcDoc={previewSrc} sandbox="" style={{ width:"100%", minHeight:460, border:"1.5px solid #e4e4e4", borderRadius:10, background:"#f9fafb", display:"block" }} title="preview"  className="tr-app-routes-app-customize-iframe-265"/>
        </div>
      </div>
      <div style={{ border:"1px solid #e4e4e4", borderRadius:10, marginBottom:16, overflow:"hidden" }} className="tr-app-routes-app-customize-div-266">
        <button onClick={() => setShowRef(!showRef)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"#f9fafb", border:"none", cursor:"pointer", fontSize:12.5, fontWeight:600, color:C.text }} className="tr-app-routes-app-customize-button-267">
          <span className="tr-app-routes-app-customize-span-268">{"{{placeholder}}"} Reference</span><span style={{ fontSize:10 }} className="tr-app-routes-app-customize-span-269">{showRef?"▲":"▼"}</span>
        </button>
        {showRef && (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }} className="tr-app-routes-app-customize-table-270">
            <thead className="tr-app-routes-app-customize-thead-271"><tr className="tr-app-routes-app-customize-tr-272"><th style={TH} className="tr-app-routes-app-customize-th-273">Placeholder</th><th style={TH} className="tr-app-routes-app-customize-th-274">Value</th></tr></thead>
            <tbody className="tr-app-routes-app-customize-tbody-275">
              {[["{{id}}","Review ID"],["{{customer}}","Reviewer name"],["{{initials}}","Initials (SM)"],["{{rating}}","Star count 1–5"],["{{stars}}","Star HTML spans"],["{{comment}}","Review body"],["{{title}}","Title text"],["{{titleBlock}}","Title div or empty"],["{{date}}","Formatted date"],["{{verified}}","Verified badge"],["{{helpful}}","Helpful count"],["{{reply}}","Store reply or empty"],["{{media}}","Image/video or empty"]].map(([ph,desc]) => (
                <tr key={ph} className="tr-app-routes-app-customize-tr-276"><td style={TD} className="tr-app-routes-app-customize-td-277"><code style={CODE} className="tr-app-routes-app-customize-code-278">{ph}</code></td><td style={{ ...TD, color:"#374151", fontSize:11.5 }} className="tr-app-routes-app-customize-td-279">{desc}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }} className="tr-app-routes-app-customize-div-280">
        <button onClick={handleExport} style={{ padding:"8px 16px", borderRadius:8, fontSize:12.5, fontWeight:600, border:"1.5px solid #e4e4e4", background:"#fff", cursor:"pointer", color:C.text }} className="tr-app-routes-app-customize-button-281">↓ Export Default</button>
        <button onClick={() => { setHtml(DEFAULT_CARD_HTML); setCss(DEFAULT_CARD_CSS); }} style={{ padding:"8px 16px", borderRadius:8, fontSize:12.5, fontWeight:600, border:"1.5px solid #e4e4e4", background:"#fff", cursor:"pointer", color:C.text }} className="tr-app-routes-app-customize-button-282">Load Default</button>
        {(initialHtml||initialCss) && <button onClick={onClear} style={{ padding:"8px 16px", borderRadius:8, fontSize:12.5, fontWeight:600, border:"1.5px solid #fecaca", background:"#fff0f0", cursor:"pointer", color:"#dc2626" }} className="tr-app-routes-app-customize-button-283">✕ Clear</button>}
        <div style={{ flex:1 }}  className="tr-app-routes-app-customize-div-284"/>
        <button onClick={() => onSave(html, css)} disabled={!html.trim()} style={{ padding:"9px 26px", borderRadius:8, fontSize:13, fontWeight:600, border:"none", cursor:html.trim()?"pointer":"not-allowed", background:html.trim()?C.accent:"#d1d5db", color:"#fff" }} className="tr-app-routes-app-customize-button-285">{t.save}</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CustomizePage() {
  const { templates, dbError, customCardHTML, customCardCSS, isPro, realReviews, realStats } = useLoaderData();
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
    return <PageBuilder template={editingTemplate} onSave={handleSaveBuilder} onBack={() => setBuilderOpen(false)} realReviews={realReviews} realStats={realStats} saveError={actionData?.saveError} />;
  }

  return (
    // <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 24px", background:C.bg, minHeight:"100vh", fontFamily:"inherit" }} className="tr-app-routes-app-customize-div-286">
    //   <div style={{ display:"flex", gap:4, marginBottom:28, borderBottom:`2px solid ${C.border}` }} className="tr-app-routes-app-customize-div-287">
    //     {[{ key:"builder", label:"Page Builder" },{ key:"custom-html", label:"Custom HTML" }].map(({ key, label }) => (
    //       <button key={key} onClick={() => setActiveTab(key)} style={{ padding:"9px 22px", border:"none", cursor:"pointer", fontSize:13.5, fontWeight:600, background:"none", borderBottom:`3px solid ${activeTab===key?C.accent:"transparent"}`, color:activeTab===key?C.accent:C.muted, marginBottom:-2, transition:"color .15s" }} className="tr-app-routes-app-customize-button-288">{label}</button>
    //     ))}
    //   </div>

    //   {activeTab === "custom-html" && (
    //     <CustomHtmlEditor initialHtml={customCardHTML} initialCss={customCardCSS} onSave={handleSaveCustomHtml} onClear={handleClearCustomHtml} justSaved={!!actionData?.savedCustomHtml} justCleared={!!actionData?.clearedCustomHtml} saveError={actionData?.htmlError} />
    //   )}

    //   {activeTab === "builder" && (
    //     isPro ? (
    //       <div className="tr-app-routes-app-customize-div-289">
    //         {dbError && (
    //           <div style={{ background:"#fff7ed", border:"1.5px solid #fed7aa", borderRadius:12, padding:"14px 18px", marginBottom:20, display:"flex", gap:12, alignItems:"flex-start" }} className="tr-app-routes-app-customize-div-290">
    //             <div className="tr-app-routes-app-customize-div-291"><div style={{ fontSize:13.5, fontWeight:600, color:"#9a3412", marginBottom:4 }} className="tr-app-routes-app-customize-div-292">Database table missing</div><code style={{ display:"inline-block", padding:"6px 12px", background:"#1e293b", color:"#e2e8f0", borderRadius:7, fontSize:12, fontFamily:"monospace" }} className="tr-app-routes-app-customize-code-293">npx prisma db push</code></div>
    //           </div>
    //         )}
    //         {actionData?.activated && (
    //           <div style={{ display:"flex", alignItems:"center", gap:14, background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:12, padding:"14px 18px", marginBottom:20 }} className="tr-app-routes-app-customize-div-294">
    //             <span style={{ fontSize:18, color:"#166534" }} className="tr-app-routes-app-customize-span-295">✓</span>
    //             <div style={{ fontSize:13.5, fontWeight:600, color:"#166534" }} className="tr-app-routes-app-customize-div-296">"{actionData.activated}" is now active</div>
    //           </div>
    //         )}
    //         <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }} className="tr-app-routes-app-customize-div-297">
    //           <div className="tr-app-routes-app-customize-div-298">
    //             <h1 style={{ fontSize:22, fontWeight:600, color:C.text, margin:0 }} className="tr-app-routes-app-customize-h1-299">{t.customizeTitle}</h1>
    //             <p style={{ fontSize:13, color:C.muted, margin:"4px 0 0" }} className="tr-app-routes-app-customize-p-300">20+ blocks · 2 & 3 column layouts · Full spacing, typography & style controls</p>
    //           </div>
    //           <button onClick={() => openBuilder(null)} style={{ padding:"10px 24px", borderRadius:10, fontSize:13.5, fontWeight:600, background:C.accent, color:"#fff", border:"none", cursor:"pointer" }} className="tr-app-routes-app-customize-button-301">+ New Design</button>
    //         </div>

    //         {templates.length === 0 ? (
    //           <div style={{ textAlign:"center", padding:"80px 20px", background:C.surface, borderRadius:18, border:`2px dashed ${C.border}` }} className="tr-app-routes-app-customize-div-302">
    //             <div style={{ fontSize:17, fontWeight:600, color:C.text, marginBottom:6 }} className="tr-app-routes-app-customize-div-303">No designs yet</div>
    //             <div style={{ fontSize:13, color:C.muted, marginBottom:24 }} className="tr-app-routes-app-customize-div-304">Create your first review widget layout.</div>
    //             <button onClick={() => openBuilder(null)} style={{ padding:"11px 28px", borderRadius:10, fontSize:13.5, fontWeight:600, background:C.accent, color:"#fff", border:"none", cursor:"pointer" }} className="tr-app-routes-app-customize-button-305">+ Create First Design</button>
    //           </div>
    //         ) : (
    //           <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:20 }} className="tr-app-routes-app-customize-div-306">
    //             {templates.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} onEdit={() => openBuilder(tpl)} onActivate={() => handleActivate(tpl.id)} onDelete={() => handleDelete(tpl.id)} />)}
    //             <button onClick={() => openBuilder(null)} style={{ minHeight:220, borderRadius:16, border:`2px dashed ${C.border}`, background:C.surface, cursor:"pointer", color:C.muted, fontSize:13, fontWeight:600, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }} className="tr-app-routes-app-customize-button-307">
    //               <span style={{ fontSize:30 }} className="tr-app-routes-app-customize-span-308">＋</span>New Design
    //             </button>
    //           </div>
    //         )}
    //       </div>
    //     ) : <PaywallPage />
    //   )}
    // </div>
    <div
  style={{
    width: "100%",
    maxWidth: 1200,
    margin: "0 auto",
    padding: "clamp(18px, 3vw, 34px) clamp(14px, 3vw, 28px)",
    background:
      "radial-gradient(circle at 0% 0%, rgba(141,180,214,.14), transparent 26%), radial-gradient(circle at 100% 5%, rgba(214,230,242,.5), transparent 28%), #F2F7FB",
    minHeight: "100vh",
    fontFamily: "inherit",
    boxSizing: "border-box",
  }}
  className="tr-app-routes-app-customize-div-286"
>
  <style>{`
    .tr-customize-tabs::-webkit-scrollbar{
      display:none;
    }

    .tr-customize-tab-btn:hover{
      background:#F2F7FB !important;
      color:#4F7392 !important;
    }

    .tr-customize-primary-btn:hover{
      transform:translateY(-1px);
      box-shadow:0 9px 22px rgba(79,115,146,.22) !important;
    }

    .tr-customize-new-card:hover{
      border-color:#8DB4D6 !important;
      background:#F5FAFD !important;
      transform:translateY(-2px);
      box-shadow:0 12px 26px rgba(79,115,146,.08) !important;
    }

    @media(max-width:767px){
      .tr-app-routes-app-customize-div-286{
        padding:14px !important;
      }

      .tr-customize-tabs{
        width:100% !important;
        display:grid !important;
        grid-template-columns:1fr 1fr !important;
      }

      .tr-customize-tab-btn{
        width:100% !important;
        justify-content:center !important;
        padding:10px 8px !important;
      }

      .tr-customize-builder-header{
        flex-direction:column !important;
        align-items:stretch !important;
      }

      .tr-customize-builder-header-content{
        width:100% !important;
      }

      .tr-customize-new-design-main{
        width:100% !important;
        min-height:44px !important;
      }

      .tr-customize-template-grid{
        grid-template-columns:1fr !important;
        gap:14px !important;
      }

      .tr-customize-empty-state{
        padding:44px 18px !important;
      }

      .tr-customize-create-first{
        width:100% !important;
        min-height:44px !important;
      }

      .tr-customize-alert{
        align-items:flex-start !important;
      }

      .tr-customize-html-wrap{
        width:100% !important;
        overflow-x:auto !important;
      }
    }

    @media(max-width:420px){
      .tr-app-routes-app-customize-div-286{
        padding:12px !important;
      }

      .tr-customize-tabs{
        gap:4px !important;
        padding:4px !important;
      }

      .tr-customize-tab-btn{
        font-size:12px !important;
      }

      .tr-customize-builder-header{
        padding:17px 15px !important;
        border-radius:15px !important;
      }

      .tr-customize-empty-state{
        padding:38px 14px !important;
      }

      .tr-customize-new-card{
        min-height:180px !important;
      }
    }
  `}</style>

  {/* Tabs */}
  <div
    style={{
      display: "flex",
      gap: 5,
      marginBottom: 24,
      padding: 5,
      width: "fit-content",
      maxWidth: "100%",
      background: "rgba(255,255,255,.92)",
      border: "1px solid #D6E6F2",
      borderRadius: 13,
      boxShadow: "0 7px 20px rgba(79,115,146,.06)",
      overflowX: "auto",
      boxSizing: "border-box",
    }}
    className="tr-app-routes-app-customize-div-287 tr-customize-tabs"
  >
    {[
      {
        key: "builder",
        label: "Page Builder",
        icon: (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect
              x="4"
              y="4"
              width="6"
              height="6"
              rx="1.2"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <rect
              x="14"
              y="4"
              width="6"
              height="6"
              rx="1.2"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <rect
              x="4"
              y="14"
              width="6"
              height="6"
              rx="1.2"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <rect
              x="14"
              y="14"
              width="6"
              height="6"
              rx="1.2"
              stroke="currentColor"
              strokeWidth="1.8"
            />
          </svg>
        ),
      },
      {
        key: "custom-html",
        label: "Custom HTML",
        icon: (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M8 8L4 12L8 16"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 8L20 12L16 16"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 5L10 19"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
    ].map(({ key, label, icon }) => (
      <button
        key={key}
        onClick={() => setActiveTab(key)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          padding: "9px 17px",
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 750,
          background:
            activeTab === key
              ? "linear-gradient(135deg,#EDF5FA,#E4F0F7)"
              : "transparent",
          color:
            activeTab === key
              ? "#4F7392"
              : "#829CAF",
          borderRadius: 9,
          boxShadow:
            activeTab === key
              ? "0 4px 11px rgba(79,115,146,.08)"
              : "none",
          transition: "all .18s ease",
          whiteSpace: "nowrap",
        }}
        className="tr-app-routes-app-customize-button-288 tr-customize-tab-btn"
      >
        {icon}
        {label}
      </button>
    ))}
  </div>

  {activeTab === "custom-html" && (
    <div
      className="tr-customize-html-wrap"
      style={{
        width: "100%",
      }}
    >
      <CustomHtmlEditor
        initialHtml={customCardHTML}
        initialCss={customCardCSS}
        onSave={handleSaveCustomHtml}
        onClear={handleClearCustomHtml}
        justSaved={!!actionData?.savedCustomHtml}
        justCleared={!!actionData?.clearedCustomHtml}
        saveError={actionData?.htmlError}
      />
    </div>
  )}

  {activeTab === "builder" &&
    (isPro ? (
      <div className="tr-app-routes-app-customize-div-289">

        {/* Database error */}
        {dbError && (
          <div
            style={{
              background:
                "linear-gradient(135deg,#FFF8EF,#FFFCF8)",
              border: "1px solid #F0CFAD",
              borderRadius: 13,
              padding: "13px 15px",
              marginBottom: 16,
              display: "flex",
              gap: 11,
              alignItems: "flex-start",
              boxShadow: "0 5px 16px rgba(154,52,18,.045)",
            }}
            className="tr-app-routes-app-customize-div-290 tr-customize-alert"
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#A65126",
                background: "#FFF0E3",
                border: "1px solid #F2D3B8",
                flexShrink: 0,
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 4L21 20H3L12 4Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 9V14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="17" r="1" fill="currentColor" />
              </svg>
            </span>

            <div
              className="tr-app-routes-app-customize-div-291"
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 750,
                  color: "#96421F",
                  marginBottom: 6,
                }}
                className="tr-app-routes-app-customize-div-292"
              >
                Database table missing
              </div>

              <code
                style={{
                  display: "inline-block",
                  maxWidth: "100%",
                  padding: "7px 11px",
                  background: "#203343",
                  color: "#EAF3F9",
                  borderRadius: 7,
                  fontSize: 11.5,
                  fontFamily: "monospace",
                  overflowX: "auto",
                  boxSizing: "border-box",
                }}
                className="tr-app-routes-app-customize-code-293"
              >
                npx prisma db push
              </code>
            </div>
          </div>
        )}

        {/* Activated message */}
        {actionData?.activated && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background:
                "linear-gradient(135deg,#F1F9F4,#FCFEFD)",
              border: "1px solid #CAE5D5",
              borderRadius: 13,
              padding: "12px 15px",
              marginBottom: 16,
              boxShadow: "0 5px 15px rgba(43,112,74,.04)",
            }}
            className="tr-app-routes-app-customize-div-294 tr-customize-alert"
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#E1F2E8",
                color: "#3C7657",
                border: "1px solid #C9E4D4",
                flexShrink: 0,
              }}
              className="tr-app-routes-app-customize-span-295"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M7 12.5L10.2 15.5L17 8.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#3B7053",
                lineHeight: 1.45,
              }}
              className="tr-app-routes-app-customize-div-296"
            >
              "{actionData.activated}" is now active
            </div>
          </div>
        )}

        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            marginBottom: 22,
            padding: "clamp(18px,3vw,25px)",
            background:
              "linear-gradient(135deg,#FFFFFF 0%,#F7FBFD 100%)",
            border: "1px solid #D6E6F2",
            borderRadius: 18,
            boxShadow: "0 10px 28px rgba(79,115,146,.065)",
            position: "relative",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
          className="tr-app-routes-app-customize-div-297 tr-customize-builder-header"
        >
          <div
            style={{
              position: "absolute",
              width: 150,
              height: 150,
              borderRadius: "50%",
              background: "rgba(214,230,242,.38)",
              right: -60,
              top: -85,
              pointerEvents: "none",
            }}
          />

          <div
            className="tr-app-routes-app-customize-div-298 tr-customize-builder-header-content"
            style={{
              flex: "1 1 350px",
              minWidth: 0,
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 7,
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#EDF5FA",
                  border: "1px solid #D6E6F2",
                  color: "#4F7392",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M4 5H20V19H4V5Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 9H20M9 9V19"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>
              </span>

              <h1
                style={{
                  fontSize: "clamp(22px,3vw,29px)",
                  fontWeight: 800,
                  color: "#456984",
                  margin: 0,
                  letterSpacing: "-.035em",
                  lineHeight: 1.15,
                }}
                className="tr-app-routes-app-customize-h1-299"
              >
                {t.customizeTitle}
              </h1>
            </div>

            <p
              style={{
                fontSize: "clamp(12.5px,1.6vw,13.5px)",
                color: "#829CAF",
                margin: 0,
                lineHeight: 1.65,
                maxWidth: 660,
              }}
              className="tr-app-routes-app-customize-p-300"
            >
              20+ blocks · 2 & 3 column layouts · Full spacing, typography & style controls
            </p>
          </div>

          <button
            onClick={() => openBuilder(null)}
            style={{
              minHeight: 42,
              padding: "10px 18px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 750,
              background:
                "linear-gradient(135deg,#8DB4D6,#7199B8)",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              boxShadow: "0 7px 18px rgba(79,115,146,.18)",
              whiteSpace: "nowrap",
              transition: "all .18s ease",
              position: "relative",
              zIndex: 1,
            }}
            className="tr-app-routes-app-customize-button-301 tr-customize-new-design-main tr-customize-primary-btn"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 5V19M5 12H19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            New Design
          </button>
        </div>

        {templates.length === 0 ? (
          /* Empty state */
          <div
            style={{
              textAlign: "center",
              padding: "clamp(55px,8vw,84px) clamp(18px,4vw,30px)",
              background:
                "linear-gradient(145deg,#FFFFFF 0%,#F8FBFD 100%)",
              borderRadius: 20,
              border: "1.5px dashed #BFD6E7",
              boxShadow: "0 10px 28px rgba(79,115,146,.045)",
              position: "relative",
              overflow: "hidden",
            }}
            className="tr-app-routes-app-customize-div-302 tr-customize-empty-state"
          >
            <div
              style={{
                width: 62,
                height: 62,
                margin: "0 auto 17px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 18,
                color: "#4F7392",
                background:
                  "linear-gradient(135deg,#EDF5FA,#DCEAF4)",
                border: "1px solid #D6E6F2",
                boxShadow: "0 8px 20px rgba(79,115,146,.08)",
              }}
            >
              <svg
                width="27"
                height="27"
                viewBox="0 0 24 24"
                fill="none"
              >
                <rect
                  x="4"
                  y="4"
                  width="16"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M12 8V16M8 12H16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div
              style={{
                fontSize: "clamp(18px,2.5vw,21px)",
                fontWeight: 800,
                color: "#456984",
                marginBottom: 7,
                letterSpacing: "-.02em",
              }}
              className="tr-app-routes-app-customize-div-303"
            >
              No designs yet
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#829CAF",
                margin: "0 auto 22px",
                lineHeight: 1.6,
                maxWidth: 380,
              }}
              className="tr-app-routes-app-customize-div-304"
            >
              Create your first review widget layout.
            </div>

            <button
              onClick={() => openBuilder(null)}
              style={{
                minHeight: 42,
                padding: "10px 20px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 750,
                background:
                  "linear-gradient(135deg,#8DB4D6,#7199B8)",
                color: "#FFFFFF",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                boxShadow: "0 7px 18px rgba(79,115,146,.18)",
                transition: "all .18s ease",
              }}
              className="tr-app-routes-app-customize-button-305 tr-customize-create-first tr-customize-primary-btn"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M12 5V19M5 12H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Create First Design
            </button>
          </div>
        ) : (
          /* Designs */
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(min(100%,280px),1fr))",
              gap: "clamp(14px,2vw,20px)",
              alignItems: "stretch",
            }}
            className="tr-app-routes-app-customize-div-306 tr-customize-template-grid"
          >
            {templates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                onEdit={() => openBuilder(tpl)}
                onActivate={() => handleActivate(tpl.id)}
                onDelete={() => handleDelete(tpl.id)}
              />
            ))}

            <button
              onClick={() => openBuilder(null)}
              style={{
                minHeight: 220,
                borderRadius: 17,
                border: "1.5px dashed #B9D2E3",
                background:
                  "linear-gradient(145deg,#FFFFFF,#F5FAFD)",
                cursor: "pointer",
                color: "#648198",
                fontSize: 13,
                fontWeight: 750,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: 20,
                boxSizing: "border-box",
                transition: "all .18s ease",
              }}
              className="tr-app-routes-app-customize-button-307 tr-customize-new-card"
            >
              <span
                style={{
                  width: 48,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  color: "#4F7392",
                  background: "#EDF5FA",
                  border: "1px solid #D6E6F2",
                  boxShadow: "0 6px 15px rgba(79,115,146,.07)",
                }}
                className="tr-app-routes-app-customize-span-308"
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12 5V19M5 12H19"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <span>New Design</span>

              <span
                style={{
                  fontSize: 11,
                  color: "#91A6B6",
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                Create another review layout
              </span>
            </button>
          </div>
        )}
      </div>
    ) : (
      <PaywallPage />
    ))}
</div>
  );
}
