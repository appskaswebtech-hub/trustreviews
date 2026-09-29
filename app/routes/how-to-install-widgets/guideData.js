import { WIDGETS as CATALOG } from "../../utils/widgetCatalog";

// Theme app blocks, mirrored from extensions/product-review/blocks/*.liquid:
// `name` is the block's schema name (what the Theme Editor shows) and `settings`
// are its first settings, so the videos show the same fields merchants see.
export const BLOCKS = {
  "reviews-widget": { name: "Trust Reviews", settings: [
    { type: "select", label: "Show this widget", value: "Auto (installed from app)" },
    { type: "select", label: "Design override (optional)", value: "Same as the widget (recommended)" },
    { type: "text", label: "Section Heading", value: "What our customers say" },
    { type: "color", label: "Accent Color", value: "#6B1A2C" },
  ] },
  "review-wall": { name: "Review Wall", settings: [
    { type: "text", label: "Heading", value: "What Our Customers Say" },
    { type: "color", label: "Accent Color", value: "#6B1A2C" },
    { type: "select", label: "Columns (desktop)", value: "3" },
    { type: "range", label: "Reviews per page", value: 18 },
  ] },
  "homepage-reviews": { name: "Homepage Reviews", settings: [
    { type: "text", label: "Heading", value: "Customer Reviews" },
    { type: "select", label: "Layout Style", value: "Same as app" },
    { type: "range", label: "Max reviews", value: 9 },
    { type: "checkbox", label: "Enable SEO Rich Snippets (Organization schema for search)", value: true },
  ] },
  "custom-template": { name: "Custom Template", settings: [
    { type: "text", label: "Section Heading", value: "What our customers say" },
    { type: "text", label: "Design to show (Template ID)", value: "" },
    { type: "checkbox", label: "Enable SEO Rich Snippets (Google star ratings in search)", value: true },
  ] },
  "inline-rating": { name: "Inline Star Rating", settings: [
    { type: "color", label: "Star Color", value: "#F59E0B" },
    { type: "range", label: "Star Size", value: 18 },
    { type: "range", label: "Gap Between Stars", value: 2 },
    { type: "checkbox", label: "Show rating text", value: true },
  ] },
  star_rating: { name: "Star Rating", settings: [
    { type: "text", label: "Product", value: "Current product" },
    { type: "color", label: "Star Colour", value: "#ff0000" },
  ] },
  "reviews-summary": { name: "Reviews Summary", settings: [
    { type: "text", label: "Heading", value: "Customer Reviews" },
    { type: "checkbox", label: "Show \"Write a Review\" button and form", value: true },
    { type: "checkbox", label: "Show \"Verified\" badge on every review", value: true },
  ] },
  review: { name: "Product Review", settings: [
    { type: "checkbox", label: "Show \"Write a Review\" button and form", value: true },
    { type: "select", label: "Review helpfulness voting", value: "Simple" },
    { type: "color", label: "Accent Color (buttons & stars)", value: "#1a1a1a" },
    { type: "color", label: "Button Text Color", value: "#ffffff" },
  ] },
  "ai-summary": { name: "AI Reviews Summary", settings: [] },
  qa: { name: "Questions & Answers", settings: [] },
  "trust-medals": { name: "Trust Medals", settings: [] },
  "verified-counter": { name: "Verified Reviews Counter", settings: [] },
  "all-reviews-counter": { name: "All Reviews Counter", settings: [] },
  "google-reviews": { name: "Google Reviews", settings: [] },
};

// Same widgets, names, order, images and badges as the app's Widgets page.
export const WIDGETS = CATALOG.map((w) => {
  const block = w.blockHandle ? BLOCKS[w.blockHandle] : null;
  return {
    ...w,
    block: block ? block.name : null,
    blockSettings: block ? block.settings : [],
    hasVideo: Boolean(block),
  };
});

// Widgets without a theme block (the app shows "Learn more →" instead of Install).
export const NON_THEME_NOTES = {
  instagram_shopping: "Set it up from Trust Reviews → Widgets → UCC Instagram Shopping. It is not added as a theme block.",
  customer_accounts: "Uses a Customer Account UI extension, not a theme block, so there are no Theme Editor steps.",
};

export function widgetImage(w) {
  return w.image || `/images/${encodeURIComponent(w.title)}.png`;
}

// Same helpers the Widgets page uses for the letter badge on each card.
export function swatch(bg) {
  const match = /#[0-9a-fA-F]{3,8}/.exec(bg || "");
  return match ? match[0] : "#4C6FFF";
}
export function darken(hex, amount) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  const num = parseInt(full.slice(0, 6), 16);
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

// App logo (1600x900, mark centered). This background crops it to a square icon.
export const LOGO_URL = "/images/trust-reviews-logo.png";
export const logoIconStyle = {
  backgroundColor: "#78abe2",
  backgroundImage: `url(${LOGO_URL})`,
  backgroundSize: "229% auto",
  backgroundPosition: "50% 22%",
  backgroundRepeat: "no-repeat",
};
