import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { BLACK_FRIDAY } from "../utils/blackFriday";

// Promotional banner shown across the app during the Black Friday sale. Points
// to the Billing page, and is dismissible: once closed it stays closed (kept per
// browser, per year) as Shopify's design guidelines require for promotions.
const storageKey = () => `tr-bf-banner-dismissed:${new Date().getFullYear()}`;

export default function BlackFridayBanner({ active }) {
  const [dismissed, setDismissed] = useState(true); // hidden until storage is read (avoids hydration mismatch)
  const { pathname } = useLocation();

  useEffect(() => {
    try { setDismissed(localStorage.getItem(storageKey()) === "1"); }
    catch { setDismissed(false); }
  }, []);

  // Billing already carries the full sale banner.
  if (!active || dismissed || pathname.startsWith("/app/billing")) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(storageKey(), "1"); } catch { /* storage unavailable */ }
  };

  const message = (
    <>
      <strong style={{ color: "#FFD700", letterSpacing: ".04em" }}>BLACK FRIDAY — 50% OFF</strong>
      {" "}Advanced plan for <strong style={{ color: "#FFD700" }}>${BLACK_FRIDAY.salePrice}/month</strong>
      {" "}(normally ${BLACK_FRIDAY.originalPrice}). Offer ends November 30.
    </>
  );
  const frame = {
    display: "flex", alignItems: "center", gap: 12,
    background: "linear-gradient(135deg, #1a0a00 0%, #3d1400 45%, #7c2900 100%)",
    color: "#FFE4B5", padding: "10px 16px", fontFamily: "var(--app-font-family)", fontSize: 14,
  };
  const cta = (
    <Link
      to="/app/billing"
      style={{ background: "#FFD700", color: "#1a0a00", fontWeight: 700, padding: "7px 14px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap" }}
    >
      Get the deal
    </Link>
  );
  const closeBtn = (
    <button
      type="button"
      onClick={dismiss}
      aria-label="Dismiss"
      style={{ border: 0, background: "transparent", color: "#FFE4B5", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: "0 4px" }}
    >
      ×
    </button>
  );

  // Dashboard: scrolling ticker. Pauses on hover/focus and stays still for
  // visitors who prefer reduced motion.
  if (pathname === "/app" || pathname === "/app/") {
    return (
      <div role="region" aria-label="Black Friday offer" style={frame}>
        <style>{`
          @keyframes tr-bf-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          .tr-bf-track { display: inline-flex; width: max-content; animation: tr-bf-marquee 28s linear infinite; }
          .tr-bf-marquee:hover .tr-bf-track, .tr-bf-marquee:focus-within .tr-bf-track { animation-play-state: paused; }
          .tr-bf-item { padding-right: 64px; white-space: nowrap; }
          @media (prefers-reduced-motion: reduce) { .tr-bf-track { animation: none; } .tr-bf-item + .tr-bf-item { display: none; } }
        `}</style>
        <div className="tr-bf-marquee" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div className="tr-bf-track">
            <span className="tr-bf-item">{message}</span>
            <span className="tr-bf-item" aria-hidden="true">{message}</span>
          </div>
        </div>
        {cta}
        {closeBtn}
      </div>
    );
  }

  return (
    <div role="region" aria-label="Black Friday offer" style={{ ...frame, flexWrap: "wrap" }}>
      <span style={{ flex: 1, minWidth: 220 }}>{message}</span>
      {cta}
      {closeBtn}
    </div>
  );
}
