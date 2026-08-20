import { Link } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return {};
};

const C = {
  bg: "#f6f6f8", surface: "#ffffff", border: "#e5e4ec",
  text: "#17171c", muted: "#6b6b78", accent: "#4C6FFF",
  yellow: "#F59E0B", yellowLt: "#fffbe6",
  green: "#1f7a4d", greenLt: "#e7f4ec",
};

const CODE_BLOCK = `<div data-trust-product-id="{{ product.id }}"></div>`;

export default function InlineRatingInfoPage() {
  const copy = () => navigator.clipboard?.writeText(CODE_BLOCK).catch(() => {});

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh", padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Link to="/app/widgets" style={{ fontSize: 16, color: C.text, textDecoration: "none" }}>←</Link>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: C.text, margin: 0 }}>Inline Star Rating</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
            A compact star rating badge you can embed anywhere on your product page.
          </p>
        </div>
      </div>

      {/* Preview */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>Preview</p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", background: C.yellowLt, borderRadius: 8 }}>
          {[1,2,3,4,5].map((i) => (
            <span key={i} style={{ fontSize: 22, color: i <= 4 ? C.yellow : "#ddd", lineHeight: 1 }}>★</span>
          ))}
          <span style={{ fontSize: 14, color: "#555", marginLeft: 4 }}>4.6 out of 5 based on 1,634 reviews</span>
        </div>
      </div>

      {/* Step 1 — Add the block */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ width: 28, height: 28, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>1</span>
          <strong style={{ fontSize: 15 }}>Add the "Inline Star Rating" block to your theme</strong>
        </div>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 14px 38px" }}>
          Open your Theme Editor, go to your Product page template, and add the <strong>Inline Star Rating</strong> block anywhere on the page.
          This loads the rating script — you only need to add it once per page template.
        </p>
        <div style={{ marginLeft: 38 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, margin: "0 0 6px" }}>In the block settings you can configure:</p>
          <ul style={{ fontSize: 13, color: C.muted, margin: 0, paddingLeft: 18, lineHeight: 2 }}>
            <li>Star color and size</li>
            <li>Gap between stars</li>
            <li>Rating text format (full / short / count only)</li>
          </ul>
        </div>
      </div>

      {/* Step 2 — Snippet */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ width: 28, height: 28, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>2</span>
          <strong style={{ fontSize: 15 }}>Paste the snippet wherever you want the rating to appear</strong>
        </div>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 14px 38px" }}>
          Copy the snippet below and paste it into any Liquid file in your theme — e.g. inside your product title section, under the price, or in a custom snippet.
        </p>
        <div style={{ marginLeft: 38 }}>
          <div style={{
            background: "#1e1e2e", borderRadius: 10, padding: "16px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}>
            <code style={{ fontSize: 13, color: "#a6e3a1", fontFamily: "monospace", wordBreak: "break-all" }}>
              {CODE_BLOCK}
            </code>
            <button
              onClick={copy}
              style={{
                flexShrink: 0, border: "none", borderRadius: 7, padding: "7px 14px",
                background: C.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              Copy
            </button>
          </div>
          <p style={{ fontSize: 12, color: C.muted, margin: "10px 0 0" }}>
            The script from Step 1 automatically detects this div and fills it in with the live rating.
          </p>
        </div>
      </div>

      {/* Note */}
      <div style={{ background: C.greenLt, borderRadius: 14, border: `1px solid #cfe3d6`, padding: 18, display: "flex", gap: 12 }}>
        <p style={{ fontSize: 13, color: C.green, margin: 0, lineHeight: 1.6 }}>
          You can place multiple <code style={{ fontFamily: "monospace", background: "rgba(0,0,0,.06)", padding: "1px 5px", borderRadius: 4 }}>data-trust-product-id</code> divs
          on the same page (e.g. in both the product header and a sticky bar) — the block script initialises all of them automatically.
        </p>
      </div>
    </div>
  );
}
