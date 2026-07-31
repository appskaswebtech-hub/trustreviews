// app/routes/app.integrations.jsx
import { Link, useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { PROVIDER_META } from "../utils/providers";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const rows = await db.integration.findMany({
    where: { shop: session.shop },
    select: { provider: true, connected: true },
  });

  const connectedByProvider = Object.fromEntries(rows.map((r) => [r.provider, r.connected]));
  return { connectedByProvider };
}

const C = {
  bg: "#f0f2f7", surface: "#ffffff", border: "#e4e7ef",
  text: "#0f1623", muted: "#6b7280",
  green: "#16a34a", greenLt: "#dcfce7",
};

function ProviderCard({ providerKey, provider, connected }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/app/integrations/${providerKey}`)}
      style={{
        background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
        overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column",
        boxShadow: "0 1px 3px rgba(0,0,0,.05)", transition: "transform .15s, box-shadow .15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,.05)"; }}
    >
      <div style={{
        height: 100, background: provider.bg, display: "flex",
        alignItems: "center", justifyContent: "center", fontSize: 32, position: "relative",
      }}>
        {provider.icon}
        {connected && (
          <span style={{
            position: "absolute", top: 10, right: 10, fontSize: 11, fontWeight: 700,
            background: C.greenLt, color: C.green, borderRadius: 20, padding: "3px 10px",
          }}>✓ Connected</span>
        )}
      </div>
      <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{provider.label}</div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, flex: 1 }}>{provider.description}</div>
        <Link
          to={`/app/integrations/${providerKey}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: 12, fontWeight: 700, color: connected ? "#fff" : "#5145e5",
            background: connected ? "#5145e5" : "transparent",
            border: connected ? "none" : `1px solid ${C.border}`,
            borderRadius: 8, padding: "7px 14px", textDecoration: "none", alignSelf: "flex-start",
          }}
        >
          {connected ? "Manage" : "Connect"}
        </Link>
      </div>
    </div>
  );
}

export default function IntegrationsGalleryPage() {
  const { connectedByProvider } = useLoaderData();

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh", padding: 28 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>Integrations</h1>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px" }}>
        Connect an email platform to sync review and Q&amp;A events for automations.
      </p>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
      }}>
        {Object.entries(PROVIDER_META).map(([key, provider]) => (
          <ProviderCard
            key={key}
            providerKey={key}
            provider={provider}
            connected={Boolean(connectedByProvider[key])}
          />
        ))}
      </div>
    </div>
  );
}
