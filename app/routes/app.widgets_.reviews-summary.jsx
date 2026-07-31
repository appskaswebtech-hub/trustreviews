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
      fontFamily: "'DM Sans','Segoe UI',sans-serif", background: "#f0f2f7", minHeight: "100vh",
      padding: 28, display: "flex", justifyContent: "center", alignItems: "flex-start",
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, border: "1px solid #e4e7ef",
        padding: 32, maxWidth: 520, textAlign: "center", marginTop: 60,
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: "#0f1623" }}>Reviews Summary</h1>
        <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: "0 0 20px" }}>
          This widget — heading, rating breakdown, "Write a Review" button, trust badges, and sort —
          is fully customized inside the Theme Editor with a live preview. Add the block to your
          product page, then click it in the editor to edit its settings (heading text, toggles,
          badge images).
        </p>
        <a href={installUrl} target="_blank" rel="noreferrer" style={{
          display: "inline-block", background: "#5145e5", color: "#fff", fontWeight: 700,
          fontSize: 13, borderRadius: 8, padding: "10px 22px", textDecoration: "none",
        }}>
          Open Theme Editor ↗
        </a>
        <div style={{ marginTop: 18 }}>
          <Link to="/app/widgets" style={{ fontSize: 12.5, color: "#6b7280" }}>← Back to Widgets</Link>
        </div>
      </div>
    </div>
  );
}
