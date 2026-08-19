// app/utils/homepageReviewLayouts.js
// Shared between the admin customizer (app.widgets_.homepage_reviews.jsx)
// and the storefront-serving API (api.review.jsx) so the "which layouts are
// Advanced-plan-only" list never drifts between the two.
export const LAYOUTS = [
  { key: "summary_carousel", label: "Summary + Carousel", desc: "Rating panel left + review carousel", icon: "⊞◁▷" },
  { key: "grid",             label: "Card Grid",          desc: "Responsive 3-column grid",            icon: "⊞⊞⊞" },
  { key: "masonry",          label: "Masonry",            desc: "Pinterest-style columns",             icon: "⊟⊞⊟" },
  { key: "spotlight",        label: "Spotlight",          desc: "Stats panel + featured reviews",      icon: "★≡" },
  { key: "ticker",           label: "Scrolling Ticker",   desc: "Auto-scrolling review strip",         icon: "▶▶▶" },
  // ── Advanced-plan-only layouts ──
  { key: "hero_banner",      label: "Hero Banner",        desc: "Full-width banner, giant rating + CTA",        icon: "▬★",   pro: true },
  { key: "split_screen",     label: "Split Screen",       desc: "Alternating stacked half-content sections",    icon: "◧◨",   pro: true },
  { key: "marquee_strip",    label: "Marquee Strip",      desc: "Thin full-width continuously scrolling ticker", icon: "→→→", pro: true },
  { key: "video_showcase",   label: "Video Showcase",     desc: "Grid emphasizing photo/video reviews",         icon: "▶⊞",   pro: true },
  { key: "stacked_cards",    label: "Stacked Cards",      desc: "Layered, staggered card-stack depth",          icon: "▤▥",   pro: true },
  { key: "stats_dashboard",  label: "Stats Dashboard",    desc: "KPI tiles above review snippets",              icon: "▦%",   pro: true },
  { key: "accordion_panels", label: "Accordion Panels",   desc: "Expandable grouped review panels",             icon: "▾▸",   pro: true },
  { key: "story_circles",    label: "Story Circles",      desc: "Instagram-story-style circular previews",      icon: "◯◯◯",  pro: true },
];

export const PRO_LAYOUT_VALUES = new Set(LAYOUTS.filter((l) => l.pro).map((l) => l.key));
export const DEFAULT_FREE_LAYOUT = "summary_carousel";
