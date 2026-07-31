import { useState } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useAdminT } from "../utils/adminTranslations";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const installs = await db.widgetInstall.findMany({
    where: { shop: session.shop },
    select: { widgetKey: true },
  });

  return {
    shop: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    installedKeys: installs.map((i) => i.widgetKey),
  };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const widgetKey = form.get("widgetKey");

  await db.widgetInstall.upsert({
    where: { shop_widgetKey: { shop: session.shop, widgetKey } },
    update: {},
    create: { shop: session.shop, widgetKey },
  });

  return { ok: true };
}

// blockHandle = the theme app extension block's .liquid filename (without extension),
// used to build the "addAppBlockId" deep link into the Theme Editor.
const WIDGETS = [
  {
    key: "review_wall",
    title: "Review Wall",
    description: "A full dedicated page showing all your store reviews in a searchable, filterable grid. Great for SEO — auto-injects AggregateRating schema for Google star snippets.",
    href: "/app/widgets/review-wall",
    blockHandle: "review-wall",
    bg: "linear-gradient(135deg,#fce7f3,#f9a8d4)",
    icon: "🧱",
    badge: "NEW",
  },
  {
    key: "homepage_reviews",
    title: "Homepage Reviews",
    description: "Full-page review showcase for your home page — 5 layouts: Summary Carousel, Grid, Masonry, Spotlight, Ticker. Colors and fonts managed from the app.",
    href: "/app/widgets/homepage_reviews",
    blockHandle: "homepage-reviews",
    bg: "linear-gradient(135deg,#fef3c7,#fde68a)",
    icon: "🏠",
    badge: "NEW",
  },
  {
    key: "custom_template",
    title: "Custom Template",
    description: "Use your own design from the Customize page — layout, colors, cards and fonts all driven by your active template.",
    href: "/app/customize",
    blockHandle: "custom-template",
    bg: "linear-gradient(135deg,#ede9fe,#c4b5fd)",
    icon: "🎨",
    badge: "NEW",
  },
  {
    key: "review_widget",
    title: "Review Widget",
    description: "Collect and display product reviews directly on your product pages.",
    href: "/app/widgets/review_widget",
    blockHandle: "reviews-widget",
    bg: "linear-gradient(135deg,#dff5e1,#bfe9c6)",
    icon: "💬",
  },
  {
    key: "inline_rating",
    title: "Inline Star Rating",
    description: "A compact ★★★★★ 4.6 out of 5 based on 1,634 reviews badge — embed anywhere via a single div snippet.",
    href: "/app/widgets/inline_rating",
    blockHandle: "inline-rating",
    bg: "linear-gradient(135deg,#fffbe6,#fef08a)",
    icon: "⭐",
  },
  {
    key: "star_rating_badge",
    title: "Star Rating Badge",
    description: "Show off your product ratings and review count with a compact badge.",
    href: "/app/widget-settings",
    blockHandle: "star_rating",
    bg: "linear-gradient(135deg,#d9ecff,#bcd9f9)",
    icon: "★",
  },
  {
    key: "reviews_summary",
    title: "Reviews Summary",
    description: "Heading, star rating breakdown, write-a-review button, trust badges, sort and pagination — all in one widget.",
    href: "/app/widgets/reviews-summary",
    blockHandle: "reviews-summary",
    bg: "linear-gradient(135deg,#ede9fe,#ddd6fe)",
    icon: "⭐",
  },
  {
    key: "write_review",
    title: "Write a Review",
    description: "Make it easy for customers to speak up — a clean, on-brand review form.",
    href: "/app/widgets/write-review",
    blockHandle: "review",
    bg: "linear-gradient(135deg,#e8f5d0,#cfe8a8)",
    icon: "✎",
  },
  {
    key: "review_list",
    title: "Review List Design",
    description: "Pick a layout for your review list, style the cards, and set how many reviews show per page.",
    href: "/app/widgets/review-list",
    blockHandle: "review",
    bg: "linear-gradient(135deg,#fde8e8,#f7c2c2)",
    icon: "📋",
  },
  {
    key: "cards_carousel",
    title: "Cards Carousel",
    description: "Bring your best reviews to life in an eye-catching carousel.",
    href: "/app/widgets/cards_carousel",
    blockHandle: "reviews-widget",
    bg: "linear-gradient(135deg,#ffe9d6,#ffd2ac)",
    icon: "🗂",
  },
  {
    key: "testimonial_carousel",
    title: "Testimonial Carousel",
    description: "Showcase your best testimonials beautifully so visitors notice them.",
    href: "/app/widgets/testimonial_carousel",
    blockHandle: "reviews-widget",
    bg: "linear-gradient(135deg,#e3e0ff,#c7c1ff)",
    icon: "❝",
  },
  {
    key: "videos_carousel",
    title: "Videos Carousel",
    description: "Bring reviews to life with a wall of customer photos and videos.",
    href: "/app/widgets/videos_carousel",
    blockHandle: "reviews-widget",
    bg: "linear-gradient(135deg,#ffe0ec,#ffc2d6)",
    icon: "🎬",
  },
  {
    key: "popup_reviews",
    title: "Pop-up Reviews",
    description: "Perfect timing is everything. Showcase your best reviews exactly when shoppers need that little push.",
    href: "/app/widgets/popup_reviews",
    blockHandle: "reviews-widget",
    bg: "linear-gradient(135deg,#d6f5f0,#aee8de)",
    icon: "⧉",
  },
  {
    key: "ai_reviews_summary",
    title: "AI Reviews Summary",
    description: "Showcase an AI generated summary of your store's reviews to build instant trust.",
    href: "/app/widgets/ai-summary",
    blockHandle: "ai-summary",
    bg: "linear-gradient(135deg,#e0f0ff,#bcdcff)",
    icon: "✨",
  },
  {
    key: "single_review",
    title: "Single Review",
    description: "Show one review at a time with simple next/previous paging — clean and focused.",
    href: "/app/widgets/single_review",
    blockHandle: "reviews-widget",
    bg: "linear-gradient(135deg,#fef0e6,#fcd9b8)",
    icon: "🔂",
  },
  {
    key: "summary_list",
    title: "Summary + List",
    description: "Rating breakdown panel beside a full review list — position the summary left, right, top, or bottom.",
    href: "/app/widgets/summary_list",
    blockHandle: "reviews-widget",
    bg: "linear-gradient(135deg,#e8fef0,#b8f5ce)",
    icon: "📊",
  },
  {
    key: "classic_list",
    title: "Classic Reviews List",
    description: "Clean paginated list with sort dropdown — the most readable layout for long, detailed reviews.",
    href: "/app/widgets/classic_list",
    blockHandle: "reviews-widget",
    bg: "linear-gradient(135deg,#e3f4ff,#b8def7)",
    icon: "☰",
  },
  {
    key: "review_snippets",
    title: "Review Snippets",
    description: "Boost conversions by showing your best review snippets, giving shoppers instant social proof.",
    href: "/app/widgets/review_snippets",
    blockHandle: "reviews-widget",
    bg: "linear-gradient(135deg,#fff3d6,#ffe3a3)",
    icon: "✂",
  },
  {
    key: "questions_answers",
    title: "Questions & Answers",
    description: "Let shoppers ask questions and get answers right on your product pages.",
    href: "/app/widgets/qa",
    blockHandle: "qa",
    bg: "linear-gradient(135deg,#d6e9ff,#aecdf5)",
    icon: "❓",
  },
  {
    key: "happy_customers",
    title: "Happy Customers widget",
    description: "Bring reviews to life with a wall of happy, smiling customers.",
    href: "/app/widgets/happy_customers",
    blockHandle: "reviews-widget",
    bg: "linear-gradient(135deg,#dff0e3,#b9dec0)",
    icon: "😊",
  },
  {
    key: "reviews_grid",
    title: "Reviews Grid",
    description: "Display your reviews in a clean, scannable grid layout.",
    href: "/app/widgets/reviews_grid",
    blockHandle: "reviews-widget",
    bg: "linear-gradient(135deg,#102a43,#1c3f5f)",
    iconColor: "#fff",
    icon: "▦",
  },
  {
    key: "floating_reviews_tab",
    title: "Floating Reviews Tab",
    description: "Access all your reviews through a floating tab at the side of the page.",
    href: "/app/widgets/floating_reviews_tab",
    blockHandle: "reviews-widget",
    bg: "linear-gradient(135deg,#dbe9ff,#aac4f0)",
    icon: "📌",
  },
  {
    key: "trust_medals",
    title: "Trust Medals",
    description: "Display a trust badge with your rating, review count, and a verified ribbon.",
    href: "/app/widgets/trust_medals",
    blockHandle: "trust-medals",
    bg: "linear-gradient(135deg,#e6f4ea,#bfe3cb)",
    icon: "🏅",
  },
  {
    key: "verified_counter",
    title: "Verified Reviews Counter",
    description: "Display the number of verified reviews a product has received.",
    href: "/app/widgets/verified_counter",
    blockHandle: "verified-counter",
    bg: "linear-gradient(135deg,#d8f3e0,#a8e0bb)",
    icon: "✅",
  },
  {
    key: "all_reviews_counter",
    title: "All Reviews Counter",
    description: "Show the total number of reviews you've received and their average rating.",
    href: "/app/widgets/all_reviews_counter",
    blockHandle: "all-reviews-counter",
    bg: "linear-gradient(135deg,#fdeacb,#f8d59a)",
    icon: "🔢",
  },
  {
    key: "instagram_shopping",
    title: "UCC Instagram Shopping",
    description: "Take your favorite user-generated content from Instagram and pull it into a grid.",
    href: "/app/widgets/instagram-shopping",
    bg: "linear-gradient(135deg,#fce4ec,#f3b8cf)",
    icon: "📷",
  },
  {
    key: "google_reviews",
    title: "Google Reviews",
    description: "Pull your store's own Google rating and reviews onto the storefront — 15 designs, from a minimal badge to a full testimonial wall.",
    href: "/app/widgets/google-reviews",
    blockHandle: "google-reviews",
    bg: "linear-gradient(135deg,#e8f0fe,#c2d9fc)",
    icon: "⭐",
    badge: "PRO",
  },
  {
    key: "customer_accounts",
    title: "Customer accounts widgets",
    description: "Let customers write and view reviews, and see rewards directly on the order confirmation page.",
    href: "/app/widgets/customer-accounts",
    bg: "linear-gradient(135deg,#e8e8f0,#c5c5da)",
    icon: "👤",
  },
];

const C = {
  bg: "#f4f6fb", surface: "#ffffff", border: "#e4e7ef",
  text: "#0f1623", muted: "#6b7280", accent: "#5145e5", accentLt: "#eef0fd",
  green: "#059669", greenLt: "#d1fae5", amber: "#d97706", amberLt: "#fef3c7",
};

function WidgetCard({ widget, installed, shop, apiKey, onInstallClick }) {
  const navigate = useNavigate();
  const t = useAdminT();
  const canInstall = Boolean(widget.blockHandle);
  const installUrl = canInstall
    ? `https://${shop}/admin/themes/current/editor` +
      `?template=product&addAppBlockId=${encodeURIComponent(apiKey)}/${encodeURIComponent(widget.blockHandle)}` +
      `&target=newAppsSection`
    : null;

  return (
    <div
      onClick={() => navigate(widget.href)}
      style={{
        background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
        overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column",
        boxShadow: "0 1px 4px rgba(0,0,0,.05)", transition: "transform .18s, box-shadow .18s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 10px 28px rgba(81,69,229,.12)";
        e.currentTarget.style.borderColor = "#c7c3f7";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.05)";
        e.currentTarget.style.borderColor = C.border;
      }}
    >
      <div style={{
        height: 106, background: widget.bg, display: "flex",
        alignItems: "center", justifyContent: "center", fontSize: 32,
        color: widget.iconColor || C.text, position: "relative",
      }}>
        {widget.icon}
        {widget.badge && !installed && (
          <span style={{
            position: "absolute", top: 10, left: 10, fontSize: 9.5, fontWeight: 800,
            background: C.amber, color: "#fff", borderRadius: 20, padding: "3px 10px",
            letterSpacing: ".04em", textTransform: "uppercase",
          }}>{widget.badge}</span>
        )}
        {installed && (
          <span style={{
            position: "absolute", top: 10, right: 10, fontSize: 10.5, fontWeight: 700,
            background: C.greenLt, color: C.green, borderRadius: 20, padding: "3px 10px",
          }}>✓ {t.installed}</span>
        )}
      </div>
      <div style={{ padding: "15px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>
          {widget.title}
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, flex: 1 }}>
          {widget.description}
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 6 }}>
          {canInstall && !installed && (
            <a
              href={installUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => { e.stopPropagation(); onInstallClick(widget.key); }}
              style={{
                fontSize: 11.5, fontWeight: 700, color: "#fff", background: C.accent,
                borderRadius: 8, padding: "6px 13px", textDecoration: "none",
              }}
            >
              {t.install} ↗
            </a>
          )}
          <Link
            to={widget.href}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 11.5, fontWeight: 700,
              color: installed ? "#fff" : C.accent,
              background: installed ? C.accent : C.accentLt,
              border: "none",
              borderRadius: 8, padding: "6px 13px", textDecoration: "none",
            }}
          >
            {canInstall ? `${t.configure} →` : "Learn more →"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WidgetsGalleryPage() {
  const { shop, apiKey, installedKeys } = useLoaderData();
  const t = useAdminT();
  const [installed, setInstalled] = useState(new Set(installedKeys));
  const [search, setSearch] = useState("");

  const markInstalled = (key) => {
    setInstalled((prev) => new Set(prev).add(key));
    const fd = new FormData();
    fd.set("widgetKey", key);
    fetch("/app/widgets", { method: "POST", body: fd }).catch(() => {});
  };

  const filteredWidgets = search.trim()
    ? WIDGETS.filter((w) =>
        w.title.toLowerCase().includes(search.toLowerCase()) ||
        w.description.toLowerCase().includes(search.toLowerCase())
      )
    : WIDGETS;

  const installedCount = WIDGETS.filter((w) => installed.has(w.key)).length;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'Inter','DM Sans','Segoe UI',sans-serif",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "28px 24px",
      }}>

        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          marginBottom: 24, gap: 16, flexWrap: "wrap",
        }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-.02em" }}>
              {t.widgetsTitle}
            </h1>
            <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
              {t.widgetsSubtitle}
              {installedCount > 0 && (
                <span style={{
                  marginLeft: 10, fontSize: 11.5, fontWeight: 700,
                  color: C.green, background: C.greenLt,
                  padding: "2px 9px", borderRadius: 20,
                }}>
                  {installedCount} {t.installed}
                </span>
              )}
            </p>
          </div>
          <input
            type="search"
            placeholder={t.searchWidgets}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: `1px solid ${C.border}`, borderRadius: 10,
              padding: "8px 14px", fontSize: 13, background: C.surface,
              color: C.text, outline: "none", width: 220,
              boxShadow: "0 1px 3px rgba(0,0,0,.05)",
            }}
          />
        </div>

        {filteredWidgets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No widgets found for "{search}"</div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
            gap: 14,
          }}>
            {filteredWidgets.map((w) => (
              <WidgetCard
                key={w.key}
                widget={w}
                installed={installed.has(w.key)}
                shop={shop}
                apiKey={apiKey}
                onInstallClick={markInstalled}
              />
            ))}
          </div>
        )}

        <p style={{ fontSize: 11.5, color: C.muted, marginTop: 24, lineHeight: 1.6 }}>
          "Install" opens your Theme Editor with the block ready to add. After adding it, pick this widget's name from the block's "Saved widget" setting. Each widget's appearance is saved independently.
        </p>
      </div>
    </div>
  );
}
