// app/utils/reviewWidgetStyles.js
// Shared between the admin customizer (app.widgets_.$key.jsx) and the
// storefront-serving API (api.review.jsx) so the "which styles are
// Advanced-plan-only" list never drifts between the two.
export const STYLE_OPTIONS = [
  { label: "Dark Grid",             value: "dark_grid"    },
  { label: "Minimal Grid",          value: "minimal_grid" },
  { label: "Slider",                value: "slider"       },
  { label: "Star Summary + Grid",   value: "star_summary" },
  { label: "Accent Wall",           value: "accent_wall"  },
  { label: "Review List",           value: "list_view"    },
  { label: "Editorial / Magazine",  value: "editorial"    },
  { label: "Horizontal Scroll",     value: "scroll_strip" },
  { label: "Popup Widget",          value: "popup"        },
  { label: "Badge Strip",           value: "badge_strip"  },
  { label: "Quote Fade",            value: "quote_fade"   },
  { label: "Masonry Wall",          value: "masonry_wall" },
  { label: "Classic List",          value: "classic_list"  },
  { label: "Summary + List",        value: "summary_side"  },
  { label: "Snippet Rotator",       value: "snippet_rotator" },
  { label: "Floating Tab",          value: "floating_tab" },
  { label: "Trust Medals",          value: "trust_medals" },
  { label: "Verified Counter",      value: "verified_counter" },
  { label: "All Reviews Counter",   value: "all_reviews_counter" },
  // ── Advanced-plan-only designs ──
  { label: "Timeline",              value: "timeline",         pro: true },
  { label: "Split Hero",            value: "split_hero",       pro: true },
  { label: "Video Wall",            value: "video_wall",       pro: true },
  { label: "Rating Bars Hero",      value: "rating_bars_hero", pro: true },
  { label: "Chat Bubbles",          value: "chat_bubbles",     pro: true },
  { label: "Magazine Spread",       value: "magazine_spread",  pro: true },
  { label: "Marquee Line",          value: "marquee_line",     pro: true },
  { label: "Accordion List",        value: "accordion_list",   pro: true },
];

export const PRO_STYLE_VALUES = new Set(STYLE_OPTIONS.filter((o) => o.pro).map((o) => o.value));
export const DEFAULT_FREE_STYLE = "dark_grid";
