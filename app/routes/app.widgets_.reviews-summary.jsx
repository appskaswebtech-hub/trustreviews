import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  return {
    shop: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
}

export default function ReviewsSummarySettingsPage() {
  const { shop, apiKey } = useLoaderData();
  const installUrl =
    `https://${shop}/admin/themes/current/editor` +
    `?template=product&addAppBlockId=${encodeURIComponent(apiKey)}/reviews-summary&target=newAppsSection`;

  return (
    <div style={{
      fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f6f6f8", minHeight: "100vh",
      padding: 28, display: "flex", justifyContent: "center", alignItems: "flex-start",
    }}>
      <div style={{
        background: "#ffffff", borderRadius: 14, border: "1px solid #e5e4ec",
        padding: 32, maxWidth: 520, textAlign: "center", marginTop: 60,
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px", color: "#17171c" }}>Reviews Summary</h1>
        <p style={{ fontSize: 13, color: "#6b6b78", lineHeight: 1.6, margin: "0 0 20px" }}>
          This widget — heading, rating breakdown, "Write a Review" button, trust badges, and sort —
          is fully customized inside the Theme Editor with a live preview. Add the block to your
          product page, then click it in the editor to edit its settings (heading text, toggles,
          badge images).
        </p>
        <a href={installUrl} target="_blank" rel="noreferrer" style={{
          display: "inline-block", background: "#4C6FFF", color: "#fff", fontWeight: 600,
          fontSize: 13, borderRadius: 8, padding: "10px 22px", textDecoration: "none",
        }}>
          Open Theme Editor ↗
        </a>
        <div style={{ marginTop: 18 }}>
          <Link to="/app/widgets" style={{ fontSize: 12.5, color: "#6b6b78" }}>← Back to Widgets</Link>
        </div>
      </div>
    </div>
  );
}
