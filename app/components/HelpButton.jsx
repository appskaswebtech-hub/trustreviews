// Small floating "?" button shown on every app page. Opens the public install
// guide in a new tab (links can't navigate inside the Shopify admin iframe).
const GUIDE_URL = "https://trustreviews.kaswebtechsolutions.com/how-to-install-widgets";

export default function HelpButton() {
  return (
    <>
      <style>{`
        .tr-help-btn { position: fixed; right: 18px; bottom: 18px; z-index: 400; width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; background: #4C6FFF; color: #fff; text-decoration: none;
          box-shadow: 0 6px 18px rgba(76,111,255,.35); transition: transform .15s ease, box-shadow .15s ease; }
        .tr-help-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(76,111,255,.45); }
        .tr-help-btn:focus-visible { outline: 2px solid #8DB4D6; outline-offset: 3px; }
        .tr-help-btn .tr-help-tip { position: absolute; right: 46px; white-space: nowrap; background: #17171c; color: #fff;
          font-size: 12px; font-weight: 500; padding: 5px 9px; border-radius: 6px; opacity: 0; pointer-events: none; transition: opacity .15s ease; }
        .tr-help-btn:hover .tr-help-tip, .tr-help-btn:focus-visible .tr-help-tip { opacity: 1; }
      `}</style>
      <a className="tr-help-btn" href={GUIDE_URL} target="_blank" rel="noopener noreferrer" aria-label="How to install widgets (opens in a new tab)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="18.2" r="1.3" fill="currentColor" />
        </svg>
        <span className="tr-help-tip">How to install widgets</span>
      </a>
    </>
  );
}
