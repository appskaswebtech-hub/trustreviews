// app/components/AdvancedPaywall.jsx
//
// Shared "this feature needs the Advanced plan" block — same visual pattern
// already used ad hoc in app.customize.jsx and app.widgets_.google-reviews.jsx,
// pulled out since it's now reused across Product Grouping, Integrations, and
// Custom CSS/JS.

import { Link } from "react-router";

export default function AdvancedPaywall({
  title = "Advanced Plan",
  description = "",
  features = [],
  accentColor = "#111827",
}) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px", maxWidth: 520, margin: "0 auto" }}>
      <div style={{
        fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
        color: accentColor, marginBottom: 14,
      }}>
        Locked
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: "#17171c", marginBottom: 8 }}>{title}</div>
      {description && (
        <div style={{ fontSize: 13.5, color: "#6b6b78", lineHeight: 1.75, marginBottom: 28 }}>
          {description}
        </div>
      )}
      {features.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32, textAlign: "left",
        }}>
          {features.map((f) => (
            <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "#374151" }}>
              <span style={{ color: "#059669", fontSize: 13, flexShrink: 0 }}>✓</span>{f}
            </div>
          ))}
        </div>
      )}
      <Link
        to="/app/billing"
        style={{
          display: "inline-flex", padding: "13px 32px", borderRadius: 10, fontSize: 14, fontWeight: 600,
          background: accentColor, color: "#fff", textDecoration: "none",
          boxShadow: `0 3px 12px ${accentColor}4d`,
        }}
      >
        Upgrade to Advanced — $9.99/mo
      </Link>
      <div style={{ fontSize: 11.5, color: "#6b6b78", marginTop: 12 }}>5-day free trial · Cancel anytime</div>
    </div>
  );
}
