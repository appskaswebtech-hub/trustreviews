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
  return <div style={{ fontSize: 10.5, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{children}</div>;
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
        style={{ width: 48, padding: "4px 6px", border: "1.5px solid #e4e4e4", borderRadius: 6, fontSize: 12, fontWeight: 600, textAlign: "right", outline: "none" }} />
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
    <div>
      {value && (
        <img src={value} alt="" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 7, marginBottom: 8, border: "1.5px solid #e4e4e4" }} />
      )}
      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 10px", border: `1.5px dashed #e4e4e4`, borderRadius: 7, fontSize: 12, color: C.muted, cursor: uploading ? "default" : "pointer", marginBottom: 6 }}>
        {uploading ? "Uploading…" : "Upload Image"}
        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} style={{ display: "none" }} />
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
          {linked ? "Linked" : "Link"}
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
    <div style={{ padding: "8px 10px", background: "#f9fafb", border: "1.5px solid #e4e4e4", borderRadius: 8 }}>
      <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.5 }}>
        {isFreeform
          ? "Free positioning is on. Drag elements directly on the first card in the canvas to reposition them."
          : "Select this block, then drag any element directly on the first card in the canvas to switch it to free positioning."}
      </div>
      {isFreeform && (
        <button onClick={() => onChange({})} style={{ marginTop: 6, fontSize: 10.5, color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline", padding: 0 }}>Reset to automatic layout</button>
      )}
    </div>
  );
}

function PropertiesPanel({ block, onChange }) {
  const [tab, setTab] = useState("content");

  if (!block) return (
    <div style={{ padding: "40px 14px", textAlign: "center", color: C.muted }}>
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
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 2px", fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer", background: "none", borderBottom: `2.5px solid ${tab === t ? C.accent : "transparent"}`, color: tab === t ? C.accent : C.muted, textTransform: "uppercase", letterSpacing: 0.3 }}>
            {TAB_LBL[t]}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 18 }}>{def.icon}</span>
          <div><div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{def.label}</div><div style={{ fontSize: 10.5, color: C.muted }}>{def.desc}</div></div>
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
      case "heading": return <div style={{ fontSize: Math.min((st.fontSize||28)*S, 26), fontWeight: st.fontWeight||"800", color: st.color||"#1a1a1a", textAlign: st.textAlign||"left", fontFamily: st.fontFamily||"inherit", letterSpacing: st.letterSpacing||0, textTransform: st.textTransform||"none", lineHeight: st.lineHeight||1.2 }}>{st.text||"Customer Reviews"}</div>;
      case "paragraph": return <div style={{ fontSize: Math.min((st.fontSize||16)*S,14), color: st.color||"#374151", textAlign: st.textAlign||"left", lineHeight: st.lineHeight||1.5 }}>{(st.text||"").slice(0,100)}{(st.text||"").length>100?"…":""}</div>;
      case "divider": return st.type==="line" ? <hr style={{ border:"none", borderTop:`${st.height||1}px solid ${st.lineColor||"#e4e4e4"}`, margin:0 }} /> : <div style={{ height: Math.min((st.size||24)*0.5,50), background:"repeating-linear-gradient(45deg,#f3f4f6 0,#f3f4f6 5px,transparent 5px,transparent 10px)", borderRadius:4 }} />;
      case "spacer": return <div style={{ height: Math.min((st.size||32)*0.5,60), background:"repeating-linear-gradient(45deg,#f9fafb 0,#f9fafb 5px,transparent 5px,transparent 10px)", borderRadius:4 }} />;
      case "summary": return (
        <div style={{ display:"flex", alignItems:"center", gap:14, justifyContent: st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start" }}>
          <div><div style={{ fontSize:26*S, fontWeight:600, color:"#1a1a1a", lineHeight:1 }}>{avg.toFixed(1)}</div><div style={{ fontSize:9*S, color:C.muted }}>out of 5</div></div>
          <div>
            <div style={{ display:"flex", gap:1, marginBottom:3 }}>{[1,2,3,4,5].map(i=><span key={i} style={{ color:st.accentColor||"#6B1A2C", fontSize:14*S }}>★</span>)}</div>
            {st.showTotal!==false && <div style={{ fontSize:9*S, color:C.muted }}>Based on {total} reviews</div>}
            {st.showBreakdown && <div style={{ marginTop:4 }}>{[5,4,3].map(n=><div key={n} style={{ display:"flex", alignItems:"center", gap:3, marginBottom:2 }}><span style={{ fontSize:8*S, color:C.muted, width:14 }}>{n}★</span><div style={{ width:60*S, height:4, background:"#e4e4e4", borderRadius:2 }}><div style={{ height:4, background:st.accentColor||"#6B1A2C", borderRadius:2, width:pct(n)+"%" }} /></div></div>)}</div>}
          </div>
        </div>
      );
      case "progress_bars": return (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {[5,4,3,2,1].map((n)=>{
            return <div key={n} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:10*S, color:C.muted, width:16, flexShrink:0 }}>{n}★</span>
              <div style={{ flex:1, height:st.barHeight||8, background:st.trackColor||"#e4e4e4", borderRadius:st.barRadius||4, overflow:"hidden" }}><div style={{ width:pct(n)+"%", height:"100%", background:st.accentColor||"#6B1A2C", borderRadius:st.barRadius||4 }} /></div>
              {st.showCount!==false && <span style={{ fontSize:9*S, color:C.muted, width:22, textAlign:"right" }}>{breakdown[n]||0}</span>}
            </div>;
          })}
        </div>
      );
      case "stats_row": {
        const stats=[st.showTotal!==false&&{label:"Reviews",value:String(total)},st.showAvg!==false&&{label:"Avg",value:avg.toFixed(1)},st.showFiveStar!==false&&{label:"5-Star",value:pct(5)+"%"}].filter(Boolean);
        return <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>{stats.map(s=><div key={s.label} style={{ flex:1, minWidth:50, background:st.statBg||"#f9fafb", borderRadius:st.statRadius||12, padding:"9px 10px", textAlign:"center" }}><div style={{ fontSize:18*S, fontWeight:600, color:st.accentColor||"#6B1A2C", fontVariantNumeric:"tabular-nums" }}>{s.value}</div><div style={{ fontSize:9*S, color:C.muted }}>{s.label}</div></div>)}</div>;
      }
      case "review_list": {
        const layout = st.layout || "grid";
        const cols = Math.min(st.columns||3, compact?2:3);
        const gap = (st.gap||16)*(compact?0.3:0.5);
        const itemCount = layout === "compact" ? 3 : (layout === "list" ? 2 : cols);
        const sample = ["Sarah M.","Megan B.","Alex J."];
        const items = reviews.length ? reviews.slice(0, itemCount) : Array.from({length:itemCount}).map((_,i)=>({ customer: sample[i]||"Customer", rating:5, comment:"Great product…", createdAt: new Date(Date.now()-(i+1)*86400000*3) }));
        const helpfulCompact = st.showHelpful!==false && <span style={{ display:"inline-flex", gap:4, flexShrink:0, fontSize:6.5, color:"#9ca3af" }}>👍<span>0</span>👎<span>0</span></span>;
        const helpfulRow = st.showHelpful!==false && (
          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4, flexWrap:"wrap" }}>
            <span style={{ fontSize:6, color:"#9ca3af" }}>Helpful?</span>
            <span style={{ fontSize:6.5, color:"#374151", border:`1px solid ${st.cardBorder||"#e4e4e4"}`, borderRadius:4, padding:"1px 4px" }}>👍 0</span>
            <span style={{ fontSize:6.5, color:"#374151", border:`1px solid ${st.cardBorder||"#e4e4e4"}`, borderRadius:4, padding:"1px 4px" }}>👎 0</span>
          </div>
        );
        if (layout === "compact") {
          return <div style={{ display:"flex", flexDirection:"column", gap:3 }}>{items.map((r,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 0", borderBottom:i<items.length-1?`1px solid ${st.cardBorder||"#e4e4e4"}`:"none" }}>
              <span style={{ fontSize:7, color:st.accentColor||"#6B1A2C", flexShrink:0, whiteSpace:"nowrap" }}>{"★".repeat(r.rating||5)}</span>
              <span style={{ fontSize:6.5, color:"#6b7280", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.comment||"Great product…"}</span>
              <span style={{ fontSize:6.5, fontWeight:600, flexShrink:0 }}>{r.customer||"Customer"}</span>
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
          meta: <div key="meta" style={{ display:"flex", alignItems:"center", gap:4, marginBottom:3, flexWrap:"wrap" }}>
            {st.showAvatar!==false && <div style={{ width:12, height:12, borderRadius:"50%", background:st.accentColor||"#6B1A2C", flexShrink:0 }} />}
            <span style={{ fontSize:7, fontWeight:600 }}>{r.customer||"Customer"}</span>
          </div>,
          date: st.showDate!==false && r.createdAt && <div key="date" style={{ fontSize:6.5, color:"#9ca3af" }}>{new Date(r.createdAt).toLocaleDateString()}</div>,
          stars: <div key="stars" style={{ fontSize:8, color:st.accentColor||"#6B1A2C", marginBottom:2 }}>{"★".repeat(r.rating||5)}</div>,
          title: r.title && <div key="title" style={{ fontSize:7, fontWeight:700, marginBottom:2 }}>{r.title}</div>,
          comment: <div key="comment" style={{ fontSize:7, color:"#6b7280" }}>{(r.comment||"Great product…").slice(0,40)}…</div>,
          media: r.mediaUrl && <div key="media" style={{ width:"100%", height:14, borderRadius:3, background:"#e5e7eb", marginTop:2 }} />,
          reply: r.reply && <div key="reply" style={{ fontSize:6.5, color:"#6b7280", borderLeft:`2px solid ${st.accentColor||"#6B1A2C"}`, paddingLeft:4, marginTop:2 }}>{r.reply.slice(0,30)}</div>,
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
              style={{ position:"relative", background:st.cardBg||"#fff", border:`1px solid ${isDragSurface ? C.accent : (st.cardBorder||"#e4e4e4")}`, borderRadius:(st.cardRadius||12)*0.5, minHeight:(st.cardMinHeight||160)*0.4, breakInside: layout==="masonry" ? "avoid" : undefined, marginBottom: layout==="masonry" ? gap : undefined }}>
              {order.map((key,oi) => {
                if (!els[key]) return null;
                const pos = positions?.[key] ?? { x:4, y:Math.min(88,oi*13) };
                return <div key={key}
                  onMouseDown={isDragSurface ? (e) => { e.preventDefault(); setDragKey(key); } : undefined}
                  style={{ position:"absolute", left:pos.x+"%", top:pos.y+"%", maxWidth:"80%",
                    cursor: isDragSurface ? (dragKey===key ? "grabbing" : "grab") : undefined,
                    outline: isDragSurface && dragKey===key ? `2px solid ${C.accent}` : "none", outlineOffset:2 }}>
                  {els[key]}
                </div>;
              })}
            </div>;
          }
          return <div key={i} style={{ background:st.cardBg||"#fff", border:`1px solid ${st.cardBorder||"#e4e4e4"}`, borderRadius:(st.cardRadius||12)*0.5, padding:compact?5:9, breakInside: layout==="masonry" ? "avoid" : undefined, marginBottom: layout==="masonry" ? gap : undefined }}>
            {order.map(key => els[key] || null)}
          </div>;
        };
        if (layout === "list") return <div style={{ display:"flex", flexDirection:"column", gap }}>{items.map(card)}</div>;
        if (layout === "masonry") return <div style={{ columnCount:cols, columnGap:gap }}>{items.map(card)}</div>;
        return <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap }}>{items.map(card)}</div>;
      }
      case "slider": {
        const items = reviews.length ? reviews.slice(0,3) : [{ customer:"Sarah M.", rating:5, comment:"Great product, highly recommend!" }];
        return (
        <div style={{ display:"flex", gap:(st.gap||20)*0.4, overflowX:"hidden", position:"relative" }}>
          {items.map((r,i)=><div key={i} style={{ minWidth:(st.cardWidth||320)*0.26, background:st.cardBg||"#fff", border:"1px solid #e4e4e4", borderRadius:(st.cardRadius||14)*0.5, padding:8, flexShrink:0 }}><div style={{ display:"flex", gap:2, marginBottom:3 }}>{[1,2,3,4,5].map(j=><span key={j} style={{ color:j<=(r.rating||5)?(st.accentColor||"#6B1A2C"):"#ddd", fontSize:8 }}>★</span>)}</div><div style={{ fontSize:7, color:"#374151", lineHeight:1.4 }}>{(r.comment||"Great product, highly recommend!").slice(0,60)}</div><div style={{ fontSize:7, fontWeight:600, color:"#1a1a1a", marginTop:4 }}>{r.customer||"Customer"}</div></div>)}
          {st.showArrows!==false&&<div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", fontSize:14, color:st.accentColor||"#6B1A2C", background:"#fff", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(0,0,0,.12)", flexShrink:0 }}>›</div>}
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
        <div style={{ background:st.cardBg||"#f9fafb", borderRadius:10, padding:compact?9:14, position:"relative", textAlign: st.align||"left" }}>
          {st.showQuote&&<div style={{ fontSize:(st.quoteSize||48)*0.3, color:st.accentColor||"#6B1A2C", lineHeight:1, opacity:0.4, marginBottom:3 }}>"</div>}
          <div style={{ fontSize:compact?7:10, color:st.textColor||"#1a1a1a", lineHeight:1.5, marginBottom:6 }}>{comment}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent: st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start" }}><div style={{ width:18, height:18, borderRadius:"50%", background:st.accentColor||"#6B1A2C", flexShrink:0 }} /><div><div style={{ fontSize:8, fontWeight:600 }}>{r.customer}</div><div style={{ fontSize:7, color:C.muted }}>Verified buyer</div></div></div>
        </div>
        );
      }
      case "photo_grid": return <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(st.columns||4,4)},1fr)`, gap:st.gap||8 }}>{Array.from({length:Math.min(st.columns||4,8)}).map((_,i)=><div key={i} style={{ background:`hsl(${i*40+200},40%,85%)`, borderRadius:st.radius||8, aspectRatio:st.aspectRatio||"1/1" }} />)}</div>;
      case "image": return st.src
        ? <img src={st.src} alt={st.alt||""} style={{ width:"100%", maxHeight:compact?70:160, objectFit:st.objectFit||"cover", borderRadius:6, display:"block" }} />
        : <div style={{ width:"100%", height:compact?70:120, borderRadius:6, background:"#f3f4f6", border:"1.5px dashed #e4e4e4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:"#9ca3af" }}>▧</div>;
      case "video": return <div style={{ width:"100%", aspectRatio:st.aspectRatio||"16/9", borderRadius:6, background:"#1a1a1a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, color:"#fff", overflow:"hidden" }}>
        {st.src ? <video src={st.src} muted style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "▶"}
      </div>;
      case "filter": return <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent: st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start" }}>{["All","5★","4★","3★"].map((f,i)=><div key={i} style={{ padding:"3px 9px", borderRadius:st.style==="pill"?20:6, fontSize:9, fontWeight:600, border:`1.5px solid ${i===0?(st.accentColor||"#6B1A2C"):"#e4e4e4"}`, background:i===0?(st.accentColor||"#6B1A2C"):"#fff", color:i===0?"#fff":"#374151" }}>{f}</div>)}</div>;
      case "sort": return <div style={{ display:"flex", justifyContent: st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start" }}><div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 12px", border:"1px solid #e4e4e4", borderRadius:8, background:"#fff", fontSize:compact?9:11, color:"#374151" }}>Sort: Newest ▾</div></div>;
      case "search": {
        const r=st.shape==="pill"?20:st.shape==="square"?0:8;
        return <div style={{ display:"flex", justifyContent: st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start" }}><div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", border:"1px solid #e4e4e4", borderRadius:r, background:"#fff", maxWidth:220 }}><span style={{ fontSize:compact?9:11, color:"#9ca3af" }}>{st.placeholder||"Search reviews..."}</span></div></div>;
      }
      case "write_review": {
        const pad={small:"5px 12px",medium:"8px 18px",large:"11px 26px"};
        const fs={small:9,medium:11,large:13};
        return <div style={{ textAlign:st.align||"left" }}><div style={{ display:"inline-flex", padding:pad[st.size]||pad.medium, borderRadius:st.radius||8, background:st.outline?"transparent":(st.bg||"#6B1A2C"), color:st.outline?(st.bg||"#6B1A2C"):(st.color||"#fff"), fontSize:(fs[st.size]||11)*S, fontWeight:600, border:st.outline?`2px solid ${st.bg||"#6B1A2C"}`:"none", width:st.fullWidth?"100%":undefined, justifyContent:"center" }}>{st.text||"Write a Review"}</div></div>;
      }
      case "button_group": return <div style={{ display:"flex", flexDirection:st.direction||"row", gap:st.gap||12, alignItems:"center", justifyContent:st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start", flexWrap:"wrap" }}><div style={{ padding:"6px 14px", borderRadius:st.btn1Radius||8, background:st.btn1Bg||"#6B1A2C", color:st.btn1Color||"#fff", fontSize:10*S, fontWeight:600 }}>{st.btn1Text||"Write a Review"}</div><div style={{ padding:"6px 14px", borderRadius:st.btn2Radius||8, background:st.btn2Bg||"transparent", color:st.btn2Color||"#6B1A2C", fontSize:10*S, fontWeight:600, border:`1.5px solid ${st.btn2Border||"#6B1A2C"}` }}>{st.btn2Text||"See All Reviews"}</div></div>;
      case "trust_badge": {
        const icon=st.iconType==="shield"?"◆":st.iconType==="star"?"★":"✓";
        return <div style={{ display:"flex", justifyContent: st.align==="center"?"center":st.align==="right"?"flex-end":"flex-start" }}><div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:st.style==="inline"?"0":"5px 14px", borderRadius:st.style==="pill"?20:8, background:st.style==="inline"?"transparent":`${st.accentColor||"#6B1A2C"}18` }}><span style={{ fontSize:11, color:st.accentColor||"#6B1A2C" }}>{icon}</span><span style={{ fontSize:11, fontWeight:600, color:st.accentColor||"#6B1A2C" }}>{total} {st.text||"Verified Reviews"}</span></div></div>;
      }
      default: return <div style={{ fontSize:11, color:C.muted }}>Block: {block.type}</div>;
    }
  }

  return <div style={wrap}>{inner()}</div>;
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
      onDrop={handleDrop}>
      <div style={{ fontSize:9.5, fontWeight:600, color:C.muted, textAlign:"center", textTransform:"uppercase", letterSpacing:0.4 }}>{label || `Col ${colIdx+1}`}</div>
      {children.map((child, index) => {
        const def=BLOCK_DEFS[child.type];
        const sel=isChildSel(child.id);
        return (
          <div key={child.id}>
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
              style={{ background:"#fff", border:`2px solid ${sel?C.accent:C.border}`, borderRadius:8, overflow:"hidden", cursor:"grab", boxShadow:sel?`0 0 0 3px ${C.accentL}`:"none" }}>
              <div className="block-drag-header" style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 8px", background:sel?C.accentL:"#f9fafb", borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:10, color:C.muted, userSelect:"none" }}>⠿</span>
                <span style={{ fontSize:11 }}>{def?.icon}</span>
                <span style={{ fontSize:10, fontWeight:600, color:sel?C.accent:C.muted, flex:1 }}>{def?.label}</span>
                <button onClick={e2 => { e2.stopPropagation(); onDeleteChild(colIdx, child.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontSize:12, padding:"0 2px" }}>✕</button>
              </div>
              <div style={{ padding:"7px 10px" }}><BlockMockup block={child} compact /></div>
            </div>
          </div>
        );
      })}
      <InsertionLine active={dropIdx === children.length} />
      <button onClick={() => onAddChild(colIdx, "__palette__")}
        style={{ padding:"5px", fontSize:11, color:C.muted, background:"none", border:`1.5px dashed ${C.border}`, borderRadius:6, cursor:"pointer", textAlign:"center" }}>
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
    }} />
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
    <div style={{ flex:1, overflowY:"auto", padding:"20px 24px", minWidth:0 }}
      onDragOver={e => { if(blocks.length===0) e.preventDefault(); }}
      onDragLeave={() => { if (blocks.length===0) setDropIdx(null); }}
      onDrop={e => { if(blocks.length===0){ const pt=e.dataTransfer.getData("palette-type"); if(pt) onDropNew(pt,0); } }}>

      {blocks.length === 0 ? (
        <div style={{ border:`2px dashed ${C.border}`, borderRadius:16, padding:"60px 20px", textAlign:"center", color:C.muted }}>
          <div style={{ fontSize:28, marginBottom:10, color:C.muted }}>↓</div>
          <div style={{ fontSize:14, fontWeight:600 }}>Drag blocks here to build your layout</div>
          <div style={{ fontSize:12, marginTop:6 }}>or click a block in the left panel</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column" }} onDragLeave={() => setDropIdx(null)} onDrop={handleDrop}>
          {blocks.map((block, idx) => {
            const def = BLOCK_DEFS[block.type];
            const selected = isTopSel(block.id);
            const st = block.settings;

            return (
              <div key={block.id}>
                <InsertionLine active={dropIdx === idx} />
                <div draggable
                  onDragStart={e => {
                    e.dataTransfer.setData("canvas-index", String(idx));
                    e.dataTransfer.setData("app/source", JSON.stringify({ scope:"top", index: idx }));
                    if (def?.isContainer) e.dataTransfer.setData("app/is-container", "1");
                    e.dataTransfer.effectAllowed="move";
                    // A compact drag ghost (just the header strip) reads as "you're
                    // moving a list item," instead of dragging a full preview card.
                    const header = e.currentTarget.querySelector(".block-drag-header");
                    if (header) e.dataTransfer.setDragImage(header, 16, 16);
                  }}
                  onDragOver={e => overAt(e, idx)}
                  onClick={() => onSelect({ blockId: block.id })}
                  style={{
                    marginTop: st.marginT||0, marginRight: st.marginR||0, marginBottom: st.marginB||6, marginLeft: st.marginL||0,
                    ...(st.widthVal < 100 ? { width:`${st.widthVal}${st.widthUnit||"%"}`, alignSelf:st.alignSelf||"stretch" } : {}),
                    background:"#fff", border:`2px solid ${selected?C.accent:C.border}`,
                    borderRadius:12, overflow:"hidden", cursor:"pointer",
                    boxShadow: selected?`0 0 0 3px ${C.accentL}`:"none",
                    transition:"border-color .12s, box-shadow .12s",
                  }}>
                  <div className="block-drag-header" style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", background:selected?C.accentL:"#f9fafb", borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ cursor:"grab", color:C.muted, fontSize:15, userSelect:"none" }}>⠿</span>
                    <span style={{ fontSize:13 }}>{def?.icon}</span>
                    <span style={{ fontSize:11.5, fontWeight:600, color:selected?C.accent:C.text, flex:1 }}>{def?.label||block.type}</span>
                    <button onClick={e => { e.stopPropagation(); onDelete(block.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontSize:14, padding:"0 3px" }}>✕</button>
                  </div>
                  <div style={{ padding: def?.isContainer ? "10px" : "12px 14px", minHeight:44 }}>
                    {def?.isContainer ? (
                      <div style={{ display:"grid", gridTemplateColumns:st.colTemplate||`repeat(${def.colCount},1fr)`, gap:st.gap||24, alignItems:st.alignItems||"start" }}>
                        {(block.columns || Array.from({length:def.colCount},()=>[])).map((colBlocks, ci) => (
                          <ColumnSlot key={ci} children={colBlocks} colIdx={ci} parentId={block.id} selectedPath={selectedPath}
                            label={block.type === "popup" ? "Popup Content" : undefined}
                            onAddChild={(colIdx, type) => {
                              if (type === "__palette__") { setColTarget({ parentId: block.id, colIdx }); }
                              else { onAddChild(block.id, colIdx, type); }
                            }}
                            onDeleteChild={(colIdx, childId) => onDeleteChild(block.id, colIdx, childId)}
                            onSelectChild={(colIdx, childId) => onSelectChild({ blockId: block.id, colIdx, childId })}
                            onMoveBlock={onMoveBlock}
                          />
                        ))}
                      </div>
                    ) : <BlockMockup block={block} editable={isTopSel(block.id)} onUpdateBlock={onUpdateBlock} />}
                  </div>
                </div>
              </div>
            );
          })}
          <InsertionLine active={dropIdx === blocks.length} />
          <div style={{ border:`2px dashed ${C.border}`, borderRadius:10, padding:12, textAlign:"center", color:C.muted, fontSize:12, marginTop:6 }}
            onDragOver={e => { e.preventDefault(); setDropIdx(blocks.length); }}>
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
        <div style={{ background:C.accentL, border:`1.5px solid ${C.accent}`, borderRadius:8, padding:"7px 10px", marginBottom:10, fontSize:11, fontWeight:600, color:C.accent, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>Adding to Col {colTarget.colIdx+1}</span>
          <button onClick={onClearColTarget} style={{ background:"none", border:"none", cursor:"pointer", color:C.accent, fontSize:12, padding:"0 2px" }}>✕</button>
        </div>
      )}
      {PALETTE_GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom:14 }}>
          <div style={{ fontSize:9.5, fontWeight:600, color:C.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:7 }}>{group.label}</div>
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
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", flexDirection:"column", background:C.bg, fontFamily:"inherit" }}>
      {previewOpen && <PreviewModal blocks={blocks} onClose={() => setPreviewOpen(false)} />}
      {/* Top bar */}
      <div style={{ height:54, background:"#fff", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 16px", gap:12, flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
        <button onClick={handleBack} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:`1px solid ${C.border}`, cursor:"pointer", color:C.text, fontSize:12.5, fontWeight:600, padding:"6px 12px", borderRadius:8 }}>← Back</button>
        <div style={{ width:1, height:22, background:C.border }} />
        <input value={name} onChange={e => setName(e.target.value)} style={{ padding:"6px 10px", border:"1.5px solid #e4e4e4", borderRadius:8, fontSize:13, fontWeight:600, outline:"none", minWidth:200 }} placeholder="Template name…" />
        <div style={{ flex:1 }} />
        {saveError && <span style={{ fontSize:12, color:"#dc2626", fontWeight:600, maxWidth:260 }}>⚠ {saveError}</span>}
        <span style={{ fontSize:12, color:"#059669", fontWeight:600, opacity:flash?1:0, transition:"opacity .3s" }}>✓ Saved!</span>
        <button onClick={() => setPreviewOpen(true)} style={{ padding:"8px 18px", borderRadius:8, fontSize:13, fontWeight:600, background:"#fff", color:C.text, border:`1.5px solid ${C.border}`, cursor:"pointer" }}>Preview</button>
        <button onClick={handleSave} style={{ padding:"8px 22px", borderRadius:8, fontSize:13, fontWeight:600, background:C.accent, color:"#fff", border:"none", cursor:"pointer", boxShadow:"0 2px 8px rgba(107,26,44,.25)" }}>{t.save}</button>
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
          onMoveBlock={moveBlock} onUpdateBlock={quickUpdateBlock}
        />

        <div style={{ width:270, background:"#fff", borderLeft:`1px solid ${C.border}`, overflowY:"auto", flexShrink:0 }}>
          <PropertiesPanel block={getSelectedBlock()} onChange={updateSelectedBlock} />
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
      <div style={{ marginBottom: st.marginB ?? 24 }}>
        {block.type === "popup" && (
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontStyle: "italic" }}>
            Popup content — opens when the shopper clicks "{st.triggerText || "View Details"}" on the storefront:
          </div>
        )}
        <div style={{
          display: "grid", gridTemplateColumns: st.colTemplate || `repeat(${def.colCount},1fr)`,
          gap: st.gap ?? 24, alignItems: st.alignItems || "start",
          ...(block.type === "popup" ? { border: `1px dashed ${C.border}`, borderRadius: 12, padding: 16 } : {}),
        }}>
          {cols.map((colBlocks, ci) => (
            <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {colBlocks.map(child => <PreviewBlock key={child.id} block={child} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return <div style={{ marginBottom: st.marginB ?? 24 }}><BlockMockup block={block} /></div>;
}

function PreviewModal({ blocks, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,15,20,.55)", display: "flex", justifyContent: "center", overflowY: "auto", padding: "40px 20px" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, maxWidth: 900, width: "100%", height: "fit-content", padding: "32px 36px 40px", position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,.3)" }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", fontSize: 15, color: C.muted }}>✕</button>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 22 }}>Preview</div>
        {blocks.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: C.muted, fontSize: 13.5 }}>Add some blocks to see a preview.</div>
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
    <div style={{ textAlign:"center", padding:"60px 24px", maxWidth:500, margin:"0 auto" }}>
      <div style={{ fontSize:12, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", color:C.accent, marginBottom:14 }}>Locked</div>
      <div style={{ fontSize:22, fontWeight:600, color:C.text, marginBottom:8 }}>Page Builder — Advanced Plan</div>
      <div style={{ fontSize:13.5, color:C.muted, lineHeight:1.75, marginBottom:28 }}>Visual drag-and-drop builder with full design control — spacing, typography, colors, column layouts, and 20+ block types.</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:32, textAlign:"left" }}>
        {["20+ block types","2 & 3 column layouts","Full padding & margin controls","Typography: font, size, weight","Border, shadow, radius","Progress bars & stat counters","Review slider & photo grid","Testimonial spotlight blocks"].map(f => (
          <div key={f} style={{ display:"flex", gap:8, alignItems:"flex-start", fontSize:12.5, color:"#374151" }}>
            <span style={{ color:"#059669", fontSize:13, flexShrink:0 }}>✓</span>{f}
          </div>
        ))}
      </div>
      <Link to="/app/billing" style={{ display:"inline-flex", padding:"13px 32px", borderRadius:10, fontSize:14, fontWeight:600, background:C.accent, color:"#fff", textDecoration:"none", boxShadow:"0 3px 12px rgba(107,26,44,.3)" }}>Upgrade to Advanced — $9.99/mo</Link>
      <div style={{ fontSize:11.5, color:C.muted, marginTop:12 }}>5-day free trial · Cancel anytime</div>
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
    <div style={{ background:C.surface, borderRadius:16, border:`2px solid ${tpl.isDefault?C.accent:C.border}`, overflow:"hidden", position:"relative" }}>
      {tpl.isDefault && <div style={{ position:"absolute", top:10, right:10, zIndex:2, background:C.accent, color:"#fff", fontSize:9, fontWeight:600, padding:"3px 9px", borderRadius:20, textTransform:"uppercase" }}>Active</div>}
      <div style={{ height:140, background:"#f9fafb", padding:14, display:"flex", flexDirection:"column", gap:5, overflow:"hidden" }}>
        {blocks.slice(0,5).map((b,i) => {
          const def = BLOCK_DEFS[b.type];
          return <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 8px", background:"#fff", borderRadius:5, border:`1px solid ${C.border}` }}><span style={{ fontSize:10 }}>{def?.icon||"◻"}</span><span style={{ fontSize:9.5, fontWeight:600, color:C.muted }}>{def?.label||b.type}</span></div>;
        })}
        {blocks.length>5 && <div style={{ fontSize:9.5, color:C.muted }}>+{blocks.length-5} more</div>}
        {blocks.length===0 && <div style={{ fontSize:11, color:C.muted }}>Legacy template</div>}
      </div>
      <div style={{ padding:"12px 14px", borderTop:`1px solid ${C.border}` }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:4 }}>{tpl.name||"Untitled"}</div>
        <button
          onClick={copyId}
          title="Copy this template's ID to pin a specific 'Custom Template' block to it in Theme Editor"
          style={{ display:"flex", alignItems:"center", gap:5, marginBottom:10, padding:0, border:"none", background:"none", cursor:"pointer", fontSize:10.5, color:C.muted, fontFamily:"monospace" }}
        >
          {copied ? "Copied!" : `ID: ${tpl.id.slice(0, 10)}…`}
        </button>
        <div style={{ display:"flex", gap:7 }}>
          <button onClick={onEdit} style={{ flex:1, padding:7, borderRadius:8, fontSize:12, fontWeight:600, border:`1.5px solid ${C.border}`, background:"#fff", cursor:"pointer", color:C.text }}>Edit</button>
          {!tpl.isDefault && <button onClick={onActivate} style={{ flex:1, padding:7, borderRadius:8, fontSize:12, fontWeight:600, border:`1.5px solid ${C.accent}`, background:C.accent, cursor:"pointer", color:"#fff" }}>Activate</button>}
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
  const TH   = { background:"#f3f4f6", padding:"7px 10px", textAlign:"left", fontWeight:600, color:"#6b7280", fontSize:11, borderBottom:"1px solid #e4e4e4" };
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
        <div style={{ fontSize:13, fontWeight:600, color:"#1e40af", marginBottom:4 }}>Custom HTML Card Template</div>
        <div style={{ fontSize:12.5, color:"#1e3a8a", lineHeight:1.6 }}>Write your own HTML layout using <code style={{ ...CODE, background:"#dbeafe" }}>{"{{placeholder}}"}</code> tags.</div>
      </div>
      {justSaved   && <div style={{ background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:10, padding:"11px 16px", marginBottom:14, fontSize:13, fontWeight:600, color:"#166534" }}>✓ Template saved.</div>}
      {justCleared && <div style={{ background:"#f9fafb", border:"1.5px solid #e4e4e4", borderRadius:10, padding:"11px 16px", marginBottom:14, fontSize:13, color:"#6b7280" }}>Cleared — reverted to default.</div>}
      {saveError   && <div style={{ background:"#fff0f0", border:"1.5px solid #fecaca", borderRadius:10, padding:"11px 16px", marginBottom:14, fontSize:13, color:"#dc2626" }}>{saveError}</div>}
      <div style={{ display:"flex", gap:18, marginBottom:16, alignItems:"flex-start" }}>
        <div style={{ flex:"0 0 52%", minWidth:0, display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", marginBottom:5 }}>HTML Template</div>
            <textarea value={html} onChange={e => setHtml(e.target.value)} placeholder={DEFAULT_CARD_HTML} rows={16} style={{ ...TA, minHeight:250 }} spellCheck={false} />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", marginBottom:5 }}>CSS</div>
            <textarea value={css} onChange={e => setCss(e.target.value)} placeholder={DEFAULT_CARD_CSS} rows={12} style={{ ...TA, minHeight:190 }} spellCheck={false} />
          </div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:"uppercase", marginBottom:5 }}>Live Preview</div>
          <iframe key={previewSrc.length} srcDoc={previewSrc} sandbox="" style={{ width:"100%", minHeight:460, border:"1.5px solid #e4e4e4", borderRadius:10, background:"#f9fafb", display:"block" }} title="preview" />
        </div>
      </div>
      <div style={{ border:"1px solid #e4e4e4", borderRadius:10, marginBottom:16, overflow:"hidden" }}>
        <button onClick={() => setShowRef(!showRef)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"#f9fafb", border:"none", cursor:"pointer", fontSize:12.5, fontWeight:600, color:C.text }}>
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
        <button onClick={handleExport} style={{ padding:"8px 16px", borderRadius:8, fontSize:12.5, fontWeight:600, border:"1.5px solid #e4e4e4", background:"#fff", cursor:"pointer", color:C.text }}>↓ Export Default</button>
        <button onClick={() => { setHtml(DEFAULT_CARD_HTML); setCss(DEFAULT_CARD_CSS); }} style={{ padding:"8px 16px", borderRadius:8, fontSize:12.5, fontWeight:600, border:"1.5px solid #e4e4e4", background:"#fff", cursor:"pointer", color:C.text }}>Load Default</button>
        {(initialHtml||initialCss) && <button onClick={onClear} style={{ padding:"8px 16px", borderRadius:8, fontSize:12.5, fontWeight:600, border:"1.5px solid #fecaca", background:"#fff0f0", cursor:"pointer", color:"#dc2626" }}>✕ Clear</button>}
        <div style={{ flex:1 }} />
        <button onClick={() => onSave(html, css)} disabled={!html.trim()} style={{ padding:"9px 26px", borderRadius:8, fontSize:13, fontWeight:600, border:"none", cursor:html.trim()?"pointer":"not-allowed", background:html.trim()?C.accent:"#d1d5db", color:"#fff" }}>{t.save}</button>
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
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 24px", background:C.bg, minHeight:"100vh", fontFamily:"inherit" }}>
      <div style={{ display:"flex", gap:4, marginBottom:28, borderBottom:`2px solid ${C.border}` }}>
        {[{ key:"builder", label:"Page Builder" },{ key:"custom-html", label:"Custom HTML" }].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{ padding:"9px 22px", border:"none", cursor:"pointer", fontSize:13.5, fontWeight:600, background:"none", borderBottom:`3px solid ${activeTab===key?C.accent:"transparent"}`, color:activeTab===key?C.accent:C.muted, marginBottom:-2, transition:"color .15s" }}>{label}</button>
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
                <div><div style={{ fontSize:13.5, fontWeight:600, color:"#9a3412", marginBottom:4 }}>Database table missing</div><code style={{ display:"inline-block", padding:"6px 12px", background:"#1e293b", color:"#e2e8f0", borderRadius:7, fontSize:12, fontFamily:"monospace" }}>npx prisma db push</code></div>
              </div>
            )}
            {actionData?.activated && (
              <div style={{ display:"flex", alignItems:"center", gap:14, background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
                <span style={{ fontSize:18, color:"#166534" }}>✓</span>
                <div style={{ fontSize:13.5, fontWeight:600, color:"#166534" }}>"{actionData.activated}" is now active</div>
              </div>
            )}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <div>
                <h1 style={{ fontSize:22, fontWeight:600, color:C.text, margin:0 }}>{t.customizeTitle}</h1>
                <p style={{ fontSize:13, color:C.muted, margin:"4px 0 0" }}>20+ blocks · 2 & 3 column layouts · Full spacing, typography & style controls</p>
              </div>
              <button onClick={() => openBuilder(null)} style={{ padding:"10px 24px", borderRadius:10, fontSize:13.5, fontWeight:600, background:C.accent, color:"#fff", border:"none", cursor:"pointer" }}>+ New Design</button>
            </div>

            {templates.length === 0 ? (
              <div style={{ textAlign:"center", padding:"80px 20px", background:C.surface, borderRadius:18, border:`2px dashed ${C.border}` }}>
                <div style={{ fontSize:17, fontWeight:600, color:C.text, marginBottom:6 }}>No designs yet</div>
                <div style={{ fontSize:13, color:C.muted, marginBottom:24 }}>Create your first review widget layout.</div>
                <button onClick={() => openBuilder(null)} style={{ padding:"11px 28px", borderRadius:10, fontSize:13.5, fontWeight:600, background:C.accent, color:"#fff", border:"none", cursor:"pointer" }}>+ Create First Design</button>
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
