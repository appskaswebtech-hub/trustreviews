// Every app we publish on the Shopify App Store, shown on the "More Apps" page
// (app/routes/app.more-apps.jsx) so merchants can find the rest of our tools
// without leaving the admin.
//
// Scraped once from our partner page — keep it in sync by hand when an app is
// published, renamed or re-priced. Icons are the App Store listing images (the
// CDN serves them at any size via ?width/&height); if one ever 404s the card
// falls back to the app's initial, so a stale URL degrades quietly.
export const PARTNER_URL = "https://apps.shopify.com/partners/kaswebtech-app";
export const PARTNER_NAME = "KASWEBTECH SOLUTIONS";

// The listing handle of *this* app, so its own card can be marked as installed
// instead of looking like something to go and get.
export const THIS_APP_HANDLE = "trust-reviews";

export const CATEGORIES = [
  { key: "all",      label: "All apps" },
  { key: "reviews",  label: "Reviews & feedback" },
  { key: "revenue",  label: "Grow revenue" },
  { key: "recover",  label: "Recover sales" },
  { key: "design",   label: "Store design" },
  { key: "checkout", label: "Checkout & orders" },
];

const ICON = "https://cdn.shopify.com/app-store/listing_images";

export const APPS = [
  {
    handle: "trust-reviews",
    name: "Trust Reviews",
    tagline: "Collect reviews, photos & videos to build store trust",
    category: "reviews",
    pricing: "Free plan available",
    rating: 5.0,
    reviews: 5,
    icon: `${ICON}/a9de282fd154860a2049ad3fdaaf6100/icon/COKrmIXygZcDEAE=.png`,
  },
  {
    handle: "bundle-kit-1",
    name: "BUNDLE KIT",
    tagline: "Let customers build their own bundles and shop more",
    category: "revenue",
    pricing: "Free plan available",
    rating: 5.0,
    reviews: 5,
    icon: `${ICON}/8077e7ea8b4019ea709f16552d40d310/icon/CP3wy_Wfk5cDEAE=.png`,
  },
  {
    handle: "feedback-tool",
    name: "Post Purchase Feedback Tool",
    tagline: "Create custom checkout surveys with conditional logic questions",
    category: "reviews",
    pricing: "Free plan available",
    rating: 5.0,
    reviews: 3,
    icon: `${ICON}/86065885fda9107c4d2ce3dc2142c3af/icon/COzM9trhyZQDEAE=.png`,
  },
  {
    handle: "upsellify-4",
    name: "Smart Upsellify Pro",
    tagline: "Turn every order into a bigger sale with upsells and cross-sells",
    category: "revenue",
    pricing: "Free plan available",
    rating: 5.0,
    reviews: 3,
    icon: `${ICON}/aa010260b4fcd0578d275ce4e61d3682/icon/CPeFpbKHkZcDEAE=.png`,
  },
  {
    handle: "kas-subscription",
    name: "Smart Subscriptions",
    tagline: "Turn one-time buyers into loyal subscribers today",
    category: "revenue",
    pricing: "Free to install",
    rating: 5.0,
    reviews: 1,
    icon: `${ICON}/72e2c177c84e8fb0b9f4ee027fa0cafa/icon/COey0-rHs5QDEAE=.png`,
  },
  {
    handle: "wishkeeper",
    name: "Wishkeeper",
    tagline: "Wishlist for customers and guests to save and buy later",
    category: "recover",
    pricing: "Free plan available",
    rating: 5.0,
    reviews: 2,
    icon: `${ICON}/820be92bcc75aaf713759e752ad75226/icon/CJqdvPPEiZcDEAE=.png`,
  },
  {
    handle: "cartpulse-1",
    name: "CartPulse",
    tagline: "Recover abandoned carts with automated email reminders",
    category: "recover",
    pricing: "From $9.99/month",
    icon: `${ICON}/203e48d916d039c8496ab10f7e87c778/icon/CLOcvt7shZQDEAE=.png`,
  },
  {
    handle: "stockping-2",
    name: "StockPing",
    tagline: "Back-in-stock alerts with variant-level emails to recover lost sales",
    category: "recover",
    pricing: "Free trial available",
    icon: `${ICON}/8d10ebcc20875851f621839d2db0a6b4/icon/CMybsLzhqZcDEAE=.png`,
  },
  {
    handle: "orderping-2",
    name: "OrderNotify WhatsApp",
    tagline: "Send automatic WhatsApp order confirmations to customers",
    category: "recover",
    pricing: "Free plan available",
    icon: `${ICON}/31f0727e5e0520bfd9432d3433eea552/icon/COeazuiYpZcDEAE=.png`,
  },
  {
    handle: "smartsavings",
    name: "SmartSavings",
    tagline: "Add discounts to attract new customers and keep them loyal",
    category: "revenue",
    pricing: "Free trial available",
    icon: `${ICON}/d7c0551f73cbfbe0d03eaefd795384fa/icon/CM7itoOyvpcDEAE=.png`,
  },
  {
    handle: "b2bridge",
    name: "B2Bridge",
    tagline: "Wholesale registration and pricing for approved B2B customers",
    category: "revenue",
    pricing: "Free trial available",
    icon: `${ICON}/205862248d561114539c155a0a724055/icon/CIDJgP277ZQDEAE=.png`,
  },
  {
    handle: "vault-wallet",
    name: "VaultWallet",
    tagline: "Issue store credits, manage refunds, and let customers redeem them",
    category: "revenue",
    pricing: "Free trial available",
    icon: `${ICON}/13ca252a64add7f7071c71e04c8a0692/icon/CPbZkKj55ZQDEAE=.png`,
  },
  {
    handle: "nestgallery",
    name: "Nest Gallery",
    tagline: "Custom product image slider with thumbnails and zoom controls",
    category: "design",
    pricing: "Free plan available",
    icon: `${ICON}/ac2a9da4b8b50954539cfedd6d045bd6/icon/CPC69rnX_pQDEAE=.png`,
  },
  {
    handle: "instagallery",
    name: "Insta-Gallery",
    tagline: "A custom photo and video gallery for your storefront",
    category: "design",
    pricing: "Free plan available",
    icon: `${ICON}/cddd2785e3764c63a8064ed10b1926da/icon/CPaG1cm6u5cDEAE=.png`,
  },
  {
    handle: "smart-variants-pro",
    name: "Smart Variants Pro",
    tagline: "Up to 2,048 variants with swatches, buttons & dropdowns",
    category: "design",
    pricing: "Free plan available",
    icon: `${ICON}/859f9b23b6088502bb94a5ffc9890d21/icon/CPiK5YOv65UDEAE=.png`,
  },
  {
    handle: "smartformly",
    name: "Smart Formly — Form Builder",
    tagline: "Form builder with custom fields, design and email notifications",
    category: "design",
    pricing: "Free trial available",
    icon: `${ICON}/519f3f2e9f32742e36c1aa1d83c3e967/icon/CJa1tKP4uJcDEAE=.png`,
  },
  {
    handle: "convobridge",
    name: "Findora — Store Locator",
    tagline: "Make it easy for customers to find your stores and locations",
    category: "design",
    pricing: "Free plan available",
    icon: `${ICON}/d5491ebe90429bfc8b66f867f572f09e/icon/CIuA98ndpJcDEAE=.png`,
  },
  {
    handle: "checkout-consent",
    name: "Smart Termguard",
    tagline: "Block checkout until customers accept your terms and conditions",
    category: "checkout",
    pricing: "Free plan available",
    icon: `${ICON}/07d59adaf9d7cb76e43e73f2ed6b6049/icon/CL650t6GlpcDEAE=.png`,
  },
  {
    handle: "preorder-manager-2",
    name: "Pre Order Manager",
    tagline: "Sell before stock arrives. Pre-orders made simple.",
    category: "checkout",
    pricing: "Free trial available",
    icon: `${ICON}/f2b3cc6b026617328abbe068bf9c245b/icon/CJaa1OKaiZcDEAE=.png`,
  },
];

// The short list shown at the bottom of the dashboard
// (app/components/RecommendedApps.jsx). Curated by hand rather than sorted by
// rating, so the picks stay complementary to a reviews app: bundles and
// upsells lift the orders reviews bring in, wishlists bring shoppers back, and
// post-purchase surveys are the same job as reviews one step later.
export const RECOMMENDED_HANDLES = [
  "bundle-kit-1",
  "upsellify-4",
  "wishkeeper",
  "feedback-tool",
];

export function recommendedApps(limit = 4) {
  return RECOMMENDED_HANDLES
    .slice(0, limit)
    .map((handle) => APPS.find((app) => app.handle === handle))
    .filter(Boolean);
}

// App Store listing URL, tagged so installs coming from inside the app are
// attributable in the partner dashboard. `campaign` separates the two places
// we link from: the More Apps page and the dashboard strip.
export function listingUrl(handle, campaign = "more-apps") {
  return `https://apps.shopify.com/${handle}?utm_source=trust-reviews&utm_medium=app&utm_campaign=${campaign}`;
}

// A 72px icon is plenty for the 56px card tile at 2x DPR — asking the CDN for
// a smaller file keeps a 19-card grid light.
export function iconUrl(app, size = 72) {
  return `${app.icon}?width=${size}&height=${size}`;
}
