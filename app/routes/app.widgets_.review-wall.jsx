import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const [total, avg] = await Promise.all([
    db.review.count({
      where: {
        store: { shop: session.shop },
        status: "approved",
      },
    }),
    db.review.aggregate({
      where: { store: { shop: session.shop }, status: "approved" },
      _avg: { rating: true },
    }),
  ]);

  return {
    shop: session.shop,
    total,
    avgRating: avg._avg.rating ? Number(avg._avg.rating).toFixed(1) : "0.0",
  };
}

const C = {
  accent: "#6B1A2C",
  accentL: "#fdf2f4",
  text: "#17171c",
  muted: "#6b6b78",
  border: "#e5e4ec",
  surface: "#ffffff",
  bg: "#f6f6f8",
};

const STEPS = [
  {
    n: "1",
    title: "Create a new page",
    body: 'In Shopify Admin → Online Store → Pages → click "Add page". Give it a title like "Customer Reviews" and save.',
  },
  {
    n: "2",
    title: "Open Theme Customizer",
    body: "Go to Online Store → Themes → Customize. Navigate to the page you just created using the page picker at the top.",
  },
  {
    n: "3",
    title: "Add the Review Wall block",
    body: 'Click "Add section" in the left panel, find "Trust Reviews" → select "Review Wall". The widget loads all your store reviews automatically.',
  },
  {
    n: "4",
    title: "Configure settings",
    body: "Set your heading, accent color, number of columns, reviews per page, and toggle search/filter on or off. Save and publish.",
  },
];

export default function ReviewWallPage() {
  const { shop, total, avgRating } = useLoaderData();

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "32px 24px", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: C.text }}>Review Wall</h1>
            <span style={{ fontSize: 11, fontWeight: 600, background: C.accent, color: "#fff", padding: "3px 10px", borderRadius: 20 }}>NEW</span>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>
            A dedicated page on your store that displays all your reviews in a beautiful, searchable grid.
            Perfect for SEO and social proof — customers can browse, filter by rating, and search reviews.
          </p>
        </div>

        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28,
        }}>
          {[
            { label: "Total reviews", value: total },
            { label: "Average rating", value: avgRating + " / 5" },
            { label: "SEO schema", value: "Auto-injected" },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: C.surface, borderRadius: 14, padding: "18px 20px",
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: C.text, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Setup steps */}
        <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: "24px 24px", marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 20 }}>How to add the Review Wall to your store</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {STEPS.map(({ n, title, body }) => (
              <div key={n} style={{ display: "flex", gap: 14, padding: "14px 16px", background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: C.accent,
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 600, flexShrink: 0,
                }}>{n}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                    {title}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: "24px 24px", marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 16 }}>What the Review Wall includes</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {[
              { label: "Live search", desc: "Customers can search by name, keyword, or review title" },
              { label: "Rating filter", desc: "Filter by 1–5 stars with review count per rating" },
              { label: "Pagination", desc: "Configurable reviews per page (6–48)" },
              { label: "Fully responsive", desc: "2–4 columns on desktop, auto-collapses on mobile" },
              { label: "SEO schema", desc: "Auto-injects AggregateRating JSON-LD for Google" },
              { label: "Media support", desc: "Shows customer photo uploads inside each card" },
              { label: "Store-wide", desc: "Shows approved reviews from all your products" },
              { label: "No slowdown", desc: "Loads asynchronously, page renders instantly" },
            ].map(({ label, desc }) => (
              <div key={label} style={{
                padding: "12px 14px", background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SEO note */}
        <div style={{
          background: "#eef1f7", border: "1.5px solid #ccd7e8",
          borderRadius: 14, padding: "16px 20px",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#2f4d80", marginBottom: 6 }}>
            SEO Benefit
          </div>
          <div style={{ fontSize: 12.5, color: "#2f4d80", lineHeight: 1.6 }}>
            The Review Wall page automatically injects an{" "}
            <strong>AggregateRating JSON-LD schema</strong> so Google can index your store&apos;s overall
            rating. This can show star ratings directly in search results, increasing click-through rates.
            For best results, name the page <strong>&quot;Customer Reviews&quot;</strong> and link to it from
            your site footer.
          </div>
        </div>

      </div>
    </div>
  );
}
