// Inline help footer shown at the bottom of every app page. Shopify's design
// guidelines discourage persistent floating overlays, so this is a plain link
// in the page flow. Opens the public install guide in a new tab (links can't
// navigate inside the Shopify admin iframe).
const GUIDE_URL = "https://trustreviews.kaswebtechsolutions.com/how-to-install-widgets";

export default function HelpButton() {
  return (
    <div style={{ textAlign: "center", padding: "8px 16px 88px", fontSize: 13, color: "#6d7175", fontFamily: "var(--app-font-family)" }}>
      Need help setting up?{" "}
      <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#2c6ecb" }}>
        How to install widgets
      </a>
    </div>
  );
}
