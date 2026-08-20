import { authenticate } from "../shopify.server";
import { SHELL_C } from "../components/WidgetCustomizeShell";
import { Link } from "react-router";

export async function loader({ request }) {
  await authenticate.admin(request);
  return null;
}

export default function InstagramShoppingStubPage() {
  return (
    <div style={{ minHeight: "100vh", background: SHELL_C.bg, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 22px",
        background: SHELL_C.surface, borderBottom: `1px solid ${SHELL_C.border}`,
      }}>
        <Link to="/app/widgets" style={{ fontSize: 16, color: SHELL_C.text, textDecoration: "none" }}>←</Link>
        <span style={{ fontWeight: 600, fontSize: 15, color: SHELL_C.text }}>UCC Instagram Shopping</span>
      </div>

      <div style={{ maxWidth: 640, margin: "40px auto", padding: "0 20px" }}>
        <div style={{ background: SHELL_C.surface, borderRadius: 14, border: `1px solid ${SHELL_C.border}`, padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: SHELL_C.text, margin: "0 0 10px" }}>
            Connect your Instagram account
          </h2>
          <p style={{ fontSize: 13.5, color: SHELL_C.muted, lineHeight: 1.6, marginBottom: 16 }}>
            This widget pulls real posts from a connected Instagram Business account and turns them into a shoppable
            grid on your storefront. To enable it, this app needs a Meta/Instagram Business app with Graph API
            credentials — that hasn't been set up yet.
          </p>
          <button
            disabled
            style={{
              border: "none", borderRadius: 8, padding: "10px 20px", background: "#d1d5db",
              color: "#fff", fontWeight: 600, fontSize: 13, cursor: "default",
            }}
          >
            Connect Instagram Account (coming soon)
          </button>
          <div style={{
            marginTop: 20, background: SHELL_C.bg, border: `1px solid ${SHELL_C.border}`, borderRadius: 8,
            padding: "12px 14px", fontSize: 12, color: SHELL_C.muted, lineHeight: 1.6,
          }}>
            Once Instagram credentials are available, this page will let you connect your account, pick which posts
            to feature, and customize the grid's style — the same way the other widgets work.
          </div>
        </div>
      </div>
    </div>
  );
}
