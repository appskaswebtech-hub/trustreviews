// app/components/EmbeddedOnboardingModal.jsx
//
// Dismissible onboarding popup shown INSIDE the embedded app (rendered from
// app.jsx, alongside the normal Outlet — never blocks the rest of the app).
// Shown on every load after the one-time standalone page
// (routes/onboarding.jsx) has already been shown once, for as long as
// onboarding isn't finished. Resumes at whatever step/sub-step the merchant
// last reached. Posts to routes/app.onboarding-embed.jsx's action.

import { useState } from "react";
import { useFetcher } from "react-router";
import { STEPS, flatStepFor, OnboardingCard } from "./onboardingWizardUI";

const ACTION_URL = "/app/onboarding-embed";

export default function EmbeddedOnboardingModal({ initial, initialStep, isDevStore: devStore }) {
  const [dismissed, setDismissed] = useState(false);
  const fetcher = useFetcher();
  const progressFetcher = useFetcher();
  const [step, setStep] = useState(initialStep >= 2 ? initialStep - 1 : 0);
  // The Business step has a second question ("Are you a dropshipper?") that
  // reveals only after the business-type question is answered — a sub-step
  // within step 0, not a new entry in STEPS/the step indicator.
  const [businessSubStep, setBusinessSubStep] = useState(initialStep === 1 ? 1 : 0);
  const [form, setForm] = useState(initial);
  const isSubmitting = fetcher.state !== "idle";

  const confirmationUrl = fetcher.data?.confirmationUrl;
  if (confirmationUrl) {
    // Breaking out to Shopify's real subscription-approval screen — same
    // App-Bridge-cooperative technique app.jsx's OnboardingBounce uses. A
    // raw window.top.location.href write throws SecurityError from inside a
    // cross-origin iframe; window.open(url, "_top") is allowed once App
    // Bridge (already loaded by AppProvider in app.jsx) has initialized.
    window.open(confirmationUrl, "_top");
  }

  // Finalized (Free or dev-Advance) — hide right away instead of waiting for
  // app.jsx's loader to revalidate and stop passing this component down.
  if (fetcher.data?.done || dismissed) return null;

  const canNext = () => {
    if (step === 0) return businessSubStep === 0 ? form.businessType.trim() : form.isDropshipper.trim();
    if (step === 1) return true; // widgets step — informational only
    return true;
  };

  const saveProgress = (flatStep, extra = {}) => {
    const fd = new FormData();
    fd.append("actionType", "saveProgress");
    fd.append("onboardingStep", String(flatStep));
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    progressFetcher.submit(fd, { method: "post", action: ACTION_URL });
  };

  const advance = () => {
    if (step === 0 && businessSubStep === 0) {
      setBusinessSubStep(1);
      saveProgress(1, { businessType: form.businessType });
      return;
    }
    const next = Math.min(step + 1, STEPS.length - 1);
    const extra = step === 0 ? { isDropshipper: form.isDropshipper } : {};
    setBusinessSubStep(0);
    setStep(next);
    saveProgress(flatStepFor(next, 0), extra);
  };

  const goNext = () => canNext() && advance();
  const goBack = () => {
    if (step === 0 && businessSubStep === 1) { setBusinessSubStep(0); return; }
    setStep((s) => Math.max(s - 1, 0));
  };
  const skipStep = () => advance();

  const submitPlan = (actionType) => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("actionType", actionType);
    fetcher.submit(fd, { method: "post", action: ACTION_URL });
  };

  // Persist the dismiss so app.jsx stops showing this popup on later opens —
  // otherwise a refresh re-mounts the component with dismissed reset to
  // false and the popup comes right back.
  const dismiss = () => {
    setDismissed(true);
    const fd = new FormData();
    fd.append("actionType", "dismissPopup");
    progressFetcher.submit(fd, { method: "post", action: ACTION_URL });
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
        maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto",
        animation: "trwModalIn 320ms cubic-bezier(.2,.8,.3,1)",
      }}>
        {/* Header — floats above the card, on the dark backdrop */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #ffffff, #d8dbe3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              boxShadow: "0 4px 14px rgba(0,0,0,.25)",
            }}>✨</span>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>Quick store setup</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.68)" }}>Takes less than a minute</div>
            </div>
          </div>
          <button
            onClick={dismiss}
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

        <OnboardingCard
          step={step}
          businessSubStep={businessSubStep}
          form={form}
          setForm={setForm}
          devStore={devStore}
          isSubmitting={isSubmitting}
          canNext={canNext()}
          goNext={goNext}
          goBack={goBack}
          skipStep={skipStep}
          onAdvance={() => submitPlan("advance")}
          onFree={() => submitPlan("free")}
        />
      </div>
    </div>
  );
}
