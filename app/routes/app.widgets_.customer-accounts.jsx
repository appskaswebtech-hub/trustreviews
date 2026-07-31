import { authenticate } from "../shopify.server";
import { SHELL_C } from "../components/WidgetCustomizeShell";
import { Link } from "react-router";

export async function loader({ request }) {
  await authenticate.admin(request);
  return null;
}

export default function CustomerAccountsStubPage() {
  return (
    <div style={{ minHeight: "100vh", background: SHELL_C.bg, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 22px",
        background: SHELL_C.surface, borderBottom: `1px solid ${SHELL_C.border}`,
      }}>
        <Link to="/app/widgets" style={{ fontSize: 16, color: SHELL_C.text, textDecoration: "none" }}>←</Link>
        <span style={{ fontWeight: 700, fontSize: 15, color: SHELL_C.text }}>Customer accounts widgets</span>
      </div>

      <div style={{ maxWidth: 640, margin: "40px auto", padding: "0 20px" }}>
        <div style={{ background: SHELL_C.surface, borderRadius: 14, border: `1px solid ${SHELL_C.border}`, padding: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>👤</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: SHELL_C.text, margin: "0 0 10px" }}>
            Let customers write & view reviews from their account
          </h2>
          <p style={{ fontSize: 13.5, color: SHELL_C.muted, lineHeight: 1.6, marginBottom: 16 }}>
            This widget would add a "My Reviews" section to the customer's Order and Account pages, tied to their
            order history. Unlike every other widget here, this can't be built as a Theme App Extension block — it
            needs a separate Shopify extension type called a <strong>Customer Account UI Extension</strong>, which
            uses its own framework, its own scaffolding (<code>shopify app generate extension</code>), and its own
            deployment.
          </p>
          <div style={{
            background: SHELL_C.bg, border: `1px solid ${SHELL_C.border}`, borderRadius: 8,
            padding: "12px 14px", fontSize: 12, color: SHELL_C.muted, lineHeight: 1.6,
          }}>
            That extension hasn't been scaffolded yet. When you're ready to build it, this page is where its
            settings (which sections to show, styling) will live.
          </div>
        </div>
      </div>
    </div>
  );
}
