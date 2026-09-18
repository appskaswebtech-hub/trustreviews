// app/components/FreePlanUpsellModal.jsx
//
// One-time "try Advanced" nudge shown to Free-plan shops after onboarding is
// already complete — a separate condition from the onboarding flow itself
// (see app.jsx's showFreeUpsell / Store.freeUpsellShown). Fires at most once
// ever per shop. Reuses the same PlanStep UI and posts to the same
// app.onboarding-embed.jsx action the onboarding popup uses.

import { useState } from "react";
import { useFetcher } from "react-router";
import { C, PlanStep } from "./onboardingWizardUI";

const ACTION_URL = "/app/onboarding-embed";

export default function FreePlanUpsellModal() {
  const [dismissed, setDismissed] = useState(false);
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";

  const confirmationUrl = fetcher.data?.confirmationUrl;
  if (confirmationUrl) {
    // Same App-Bridge-cooperative break-out as the onboarding popup — a raw
    // window.top.location.href write throws SecurityError from inside a
    // cross-origin iframe.
    window.open(confirmationUrl, "_top");
  }

  if (dismissed) return null;

  const submitAdvance = () => {
    const fd = new FormData();
    fd.append("actionType", "advance");
    fetcher.submit(fd, { method: "post", action: ACTION_URL });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(12,12,16,.6)",
      backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      animation: "trwOverlayIn 220ms ease",
    }}>
      <style>{`
        @keyframes trwOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes trwModalIn { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .trw-modal-close { transition: background 150ms ease, transform 150ms ease; }
        .trw-modal-close:hover { background: rgba(255,255,255,.16) !important; transform: rotate(90deg); }
      `}</style>
      <div style={{
        maxWidth: 480, width: "100%", maxHeight: "92vh", overflowY: "auto",
        animation: "trwModalIn 320ms cubic-bezier(.2,.8,.3,1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #ffffff, #d8dbe3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              boxShadow: "0 4px 14px rgba(0,0,0,.25)",
            }}>🚀</span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>Unlock more with Advanced</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.68)" }}>5-day free trial, no risk</div>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Close"
            className="trw-modal-close"
            style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)",
              color: "#fff", fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          background: C.surface, borderRadius: 18, border: `1px solid ${C.border}`,
          padding: "32px 28px 28px", boxShadow: "0 10px 34px rgba(15,15,20,.08)",
          overflow: "hidden", position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: "linear-gradient(90deg, #111827, #4b5563)",
          }} />
          <PlanStep
            isSubmitting={isSubmitting}
            onAdvance={submitAdvance}
            onFree={() => setDismissed(true)}
          />
        </div>
      </div>
    </div>
  );
}
