import { useEffect } from "react";
import InstallVideo from "../routes/how-to-install-widgets/InstallVideo";
import { WIDGETS } from "../routes/how-to-install-widgets/guideData";

// Dashboard "Install Widget" popup: a short animated walkthrough of where the
// widget shows up in Shopify's Theme Editor (Customize), then "Continue"
// opens the Theme Editor's App embeds with "Trust Reviews Engine" switched on
// (it loads the review widgets' engine) — the merchant presses Save.
// No block is added. Shopify doesn't let apps enable an embed by themselves.
const VIDEO_WIDGET = WIDGETS.find((w) => w.key === "review_widget");

export default function InstallWidgetModal({ shop, apiKey, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const editorUrl =
    `https://${shop}/admin/themes/current/editor` +
    `?context=apps&activateAppId=${encodeURIComponent(apiKey)}/app-embed`;

  const handleContinue = () => {
    // _top: leave the app iframe and open the Theme Editor in the same tab.
    window.open(editorUrl, "_top");
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000, background: "rgba(23,32,42,.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-widget-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 760, maxHeight: "92vh", overflowY: "auto",
          background: "#FFFFFF", borderRadius: 16, border: "1px solid #D5E6FB",
          boxShadow: "0 24px 60px rgba(23,32,42,.25)", fontFamily: "var(--app-font-family)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "20px 22px 12px" }}>
          <div>
            <h2 id="install-widget-title" style={{ margin: 0, fontSize: 20, fontWeight: 750, color: "#10224A" }}>
              Add reviews to your store
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "#5B6B85" }}>
              Watch where the widget appears in Shopify&apos;s Theme Editor. Click <b>Continue</b> —
              the Theme Editor opens with <b>Trust Reviews Engine</b> switched on. Press <b>Save</b>,
              then add the review widgets you want from <b>Add block</b>.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "1px solid #D5E6FB", background: "#FFFFFF", color: "#10224A",
              borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: "pointer", flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "0 22px" }}>
          <InstallVideo widget={VIDEO_WIDGET} autoPlay />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px 20px" }}>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #D5E6FB", background: "#FFFFFF", color: "#10224A",
              borderRadius: 9, padding: "9px 18px", fontWeight: 650, fontSize: 13.5, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            style={{
              border: "none", borderRadius: 9, padding: "9px 22px",
              background: "linear-gradient(135deg,#73AFF1,#5E9FE8)", color: "#10224A",
              fontWeight: 700, fontSize: 13.5, cursor: "pointer",
              boxShadow: "0 6px 16px rgba(16,34,74,.17)",
            }}
          >
            Continue to Theme Editor →
          </button>
        </div>
      </div>
    </div>
  );
}
