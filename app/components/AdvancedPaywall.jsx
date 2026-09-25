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
    // <div style={{ textAlign: "center", padding: "60px 24px", maxWidth: 520, margin: "0 auto" }} className="tr-app-components-advancedpaywall-div-1">
    //   <div style={{
    //     fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
    //     color: accentColor, marginBottom: 14,
    //   }} className="tr-app-components-advancedpaywall-div-2">
    //     Locked
    //   </div>
    //   <div style={{ fontSize: 22, fontWeight: 600, color: "#17171c", marginBottom: 8 }} className="tr-app-components-advancedpaywall-div-3">{title}</div>
    //   {description && (
    //     <div style={{ fontSize: 13.5, color: "#6b6b78", lineHeight: 1.75, marginBottom: 28 }} className="tr-app-components-advancedpaywall-div-4">
    //       {description}
    //     </div>
    //   )}
    //   {features.length > 0 && (
    //     <div style={{
    //       display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32, textAlign: "left",
    //     }} className="tr-app-components-advancedpaywall-div-5">
    //       {features.map((f) => (
    //         <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "#374151" }} className="tr-app-components-advancedpaywall-div-6">
    //           <span style={{ color: "#059669", fontSize: 13, flexShrink: 0 }} className="tr-app-components-advancedpaywall-span-7">✓</span>{f}
    //         </div>
    //       ))}
    //     </div>
    //   )}
    //   <Link
    //     to="/app/billing"
    //     style={{
    //       display: "inline-flex", padding: "13px 32px", borderRadius: 10, fontSize: 14, fontWeight: 600,
    //       background: accentColor, color: "#fff", textDecoration: "none",
    //       boxShadow: `0 3px 12px ${accentColor}4d`,
    //     }}
    //   >
    //     Upgrade to Advanced — $9.99/mo
    //   </Link>
    //   <div style={{ fontSize: 11.5, color: "#6b6b78", marginTop: 12 }} className="tr-app-components-advancedpaywall-div-8">5-day free trial · Cancel anytime</div>
    // </div>

    <div
  className="tr-app-components-advancedpaywall-div-1"
  style={{
    textAlign: "center",
    padding: "34px 28px",
    maxWidth: 560,
    margin: "18px auto 0",
    background: "linear-gradient(145deg,#FFFFFF 0%,#F2F7FB 100%)",
    border: "1px solid #D6E6F2",
    borderRadius: 20,
    boxShadow: "0 16px 42px rgba(79,115,146,.08)",
  }}
>
  <div
    className="tr-app-components-advancedpaywall-div-2"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11.5,
      fontWeight: 700,
      letterSpacing: ".07em",
      textTransform: "uppercase",
      color: "#4F7392",
      marginBottom: 12,
      background: "#D6E6F2",
      border: "1px solid rgba(141,180,214,.45)",
      padding: "5px 10px",
      borderRadius: 999,
    }}
  >
    Locked
  </div>

  <div
    className="tr-app-components-advancedpaywall-div-3"
    style={{
      fontSize: 24,
      fontWeight: 750,
      color: "#4F7392",
      marginBottom: 8,
      letterSpacing: "-.025em",
      lineHeight: 1.2,
    }}
  >
    {title}
  </div>

  {description && (
    <div
      className="tr-app-components-advancedpaywall-div-4"
      style={{
        fontSize: 14,
        color: "#829CAF",
        lineHeight: 1.7,
        marginBottom: 22,
        maxWidth: 470,
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      {description}
    </div>
  )}

  {features.length > 0 && (
    <div
      className="tr-app-components-advancedpaywall-div-5"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        marginBottom: 24,
        textAlign: "left",
      }}
    >
      {features.map((f) => (
        <div
          key={f}
          className="tr-app-components-advancedpaywall-div-6"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            fontSize: 14,
            color: "#5F7F9A",
            background: "#FFFFFF",
            border: "1px solid #D6E6F2",
            borderRadius: 10,
            padding: "9px 10px",
          }}
        >
          <span
            className="tr-app-components-advancedpaywall-span-7"
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#D6E6F2",
              color: "#4F7392",
              fontSize: 10,
              fontWeight: 800,
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            ✓
          </span>

          {f}
        </div>
      ))}
    </div>
  )}

  <Link
    to="/app/billing"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "12px 26px",
      borderRadius: 10,
      fontSize: 16,
      fontWeight: 700,
      background: `linear-gradient(135deg, ${accentColor} 0%, #6F96B6 100%)`,
      color: "#FFFFFF",
      textDecoration: "none",
      boxShadow: "0 8px 20px rgba(79,115,146,.18)",
    }}
  >
    Upgrade to Advanced — $9.99/mo
  </Link>

  <div
    className="tr-app-components-advancedpaywall-div-8"
    style={{
      fontSize: 1,
      color: "#8BA2B4",
      marginTop: 10,
    }}
  >
    5-day free trial · Cancel anytime
  </div>
</div>
  );
}
