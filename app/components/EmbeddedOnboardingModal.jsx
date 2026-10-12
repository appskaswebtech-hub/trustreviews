// app/components/EmbeddedOnboardingModal.jsx
//
// Dismissible onboarding popup shown INSIDE the embedded app (rendered from
// app.jsx, alongside the normal Outlet — never blocks the rest of the app).
// Shown on every load after the one-time standalone page
// (routes/onboarding.jsx) has already been shown once, for as long as
// onboarding isn't finished. Resumes at whatever step/sub-step the merchant
// last reached. Posts to routes/app.onboarding-embed.jsx's action.

import { useEffect, useRef, useState } from "react";
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
  const [pendingAction, setPendingAction] = useState(null);

  const confirmationUrl = fetcher.data?.confirmationUrl;
  // Still "busy" after the response arrives while we leave for Shopify's
  // approval screen, so the button doesn't flash back to normal first.
  const isSubmitting = fetcher.state !== "idle" || Boolean(confirmationUrl);

  // Breaking out to Shopify's real subscription-approval screen — same
  // App-Bridge-cooperative technique app.jsx's OnboardingBounce uses. A
  // raw window.top.location.href write throws SecurityError from inside a
  // cross-origin iframe; window.open(url, "_top") is allowed once App
  // Bridge (already loaded by AppProvider in app.jsx) has initialized.
  // In an effect, once — not on every render.
  const openedRef = useRef(false);
  useEffect(() => {
    if (confirmationUrl && !openedRef.current) {
      openedRef.current = true;
      window.open(confirmationUrl, "_top");
    }
  }, [confirmationUrl]);

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
    if (isSubmitting) return;
    setPendingAction(actionType);
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
    // <div className="trw-modal-overlay" style={{
    //   position: "fixed", inset: 0, zIndex: 1000,
    //   background: "rgba(12,12,16,.6)",
    //   backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
    //   display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    //   fontFamily: "var(--app-font-family)",
    //   animation: "trwOverlayIn 220ms ease",
    // }}>
    //   <style className="trw-modal-styles">{`
    //     @keyframes trwOverlayIn { from { opacity: 0; } to { opacity: 1; } }
    //     @keyframes trwModalIn { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
    //     .trw-modal-close { transition: background 150ms ease, transform 150ms ease; }
    //     .trw-modal-close:hover { background: rgba(255,255,255,.16) !important; transform: rotate(90deg); }
    //   `}</style>
    //   <div className="trw-modal-container" style={{
    //     maxWidth: 880, width: "100%", maxHeight: "92vh", overflowY: "auto",
    //     animation: "trwModalIn 320ms cubic-bezier(.2,.8,.3,1)",
    //   }}>
    //     {/* Header — floats above the card, on the dark backdrop */}
    //     <div className="trw-modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 2px" }}>
    //       <div className="trw-modal-brand" style={{ display: "flex", alignItems: "center", gap: 11 }}>
    //         <span className="trw-modal-brand-icon" style={{
    //           width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    //           background: "linear-gradient(135deg, #ffffff, #d8dbe3)",
    //           display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
    //           boxShadow: "0 4px 14px rgba(0,0,0,.25)",
    //         }}>✨</span>
    //         <div className="trw-modal-heading">
    //           <div className="trw-modal-title" style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>Quick store setup</div>
    //           <div className="trw-modal-subtitle" style={{ fontSize: 11.5, color: "rgba(255,255,255,.68)" }}>Takes less than a minute</div>
    //         </div>
    //       </div>
    //       <button
    //         onClick={dismiss}
    //         aria-label="Close"
    //         className="trw-modal-close"
    //         style={{
    //           width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
    //           border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)",
    //           color: "#fff", fontSize: 14, cursor: "pointer",
    //           display: "flex", alignItems: "center", justifyContent: "center",
    //         }}
    //       >
    //         ✕
    //       </button>
    //     </div>

    //     <OnboardingCard
    //       step={step}
    //       businessSubStep={businessSubStep}
    //       form={form}
    //       setForm={setForm}
    //       devStore={devStore}
    //       isSubmitting={isSubmitting}
    //       canNext={canNext()}
    //       goNext={goNext}
    //       goBack={goBack}
    //       skipStep={skipStep}
    //       onAdvance={() => submitPlan("advance")}
    //       onFree={() => submitPlan("free")}
    //     />
    //   </div>
    // </div>
    <div
  className="trw-modal-overlay"
  style={{
    position: "fixed",
    inset: 0,
    zIndex: 1000,

    background: "rgba(16,34,74,.34)",

    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    padding: 24,

    fontFamily: "var(--app-font-family)",

    animation: "trwOverlayIn 220ms ease",
  }}
>
  <style className="trw-modal-styles">{`
    @keyframes trwOverlayIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes trwModalIn {
      from {
        opacity: 0;
        transform: translateY(18px) scale(.975);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .trw-modal-close {
      transition:
        background 160ms ease,
        transform 160ms ease,
        border-color 160ms ease,
        box-shadow 160ms ease;
    }

    .trw-modal-close:hover {
      background: #EAF3FE !important;
      border-color: #73AFF1 !important;
      box-shadow: 0 8px 20px rgba(115,175,241,.18);
      transform: rotate(90deg);
    }

    .trw-modal-container::-webkit-scrollbar {
      width: 6px;
    }

    .trw-modal-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .trw-modal-container::-webkit-scrollbar-thumb {
      background: #D5E6FB;
      border-radius: 50px;
    }

    @media (max-width: 700px) {
      .trw-modal-overlay {
        padding: 14px !important;
      }

      .trw-modal-shell {
        border-radius: 22px !important;
        padding: 22px 18px !important;
      }

      .trw-modal-header {
        align-items: flex-start !important;
      }

      .trw-modal-title {
        font-size: 14px !important;
      }

      .trw-modal-subtitle {
        font-size: 11px !important;
      }

      .trw-modal-trust-badge {
        display: none !important;
      }
    }
  `}</style>

<div
  className="trw-modal-container"
  style={{
    maxWidth: 900,
    width: "100%",
    maxHeight: "92vh",

    overflowY: "auto",
    scrollbarWidth: "none",
    msOverflowStyle: "none",

    animation:
      "trwModalIn 320ms cubic-bezier(.2,.8,.3,1)",

    borderRadius: 30,
  }}
>
    <div
      className="trw-modal-shell"
      style={{
        position: "relative",
        overflow: "hidden",

        padding: "30px 32px 34px",

        borderRadius: 30,

        background: `
          linear-gradient(
            145deg,
            rgba(255,255,255,.98),
            rgba(234,243,254,.96)
          )
        `,

        border: "1px solid rgba(213,230,251,.95)",

        boxShadow: `
          0 35px 90px rgba(16,34,74,.22),
          0 16px 36px rgba(115,175,241,.16),
          inset 0 1px 0 rgba(255,255,255,.95)
        `,
      }}
    >
      {/* Soft top highlight */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "18%",
          width: "64%",
          height: 3,

          borderRadius: "0 0 10px 10px",

          background:
            "linear-gradient(90deg, transparent, #73AFF1, transparent)",

          opacity: 0.85,
        }}
       className="tr-app-components-embeddedonboardingmodal-div-1"/>

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: -90,
          right: -70,

          width: 230,
          height: 230,

          borderRadius: "50%",

          background:
            "rgba(213,230,251,.48)",

          filter: "blur(26px)",

          pointerEvents: "none",
        }}
       className="tr-app-components-embeddedonboardingmodal-div-2"/>

      {/* Header */}
      <div
        className="trw-modal-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",

          gap: 20,

          marginBottom: 24,

          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          className="trw-modal-brand"
          style={{
            display: "flex",
            alignItems: "center",

            gap: 13,
          }}
        >
          {/* Brand icon */}
          <span
            className="trw-modal-brand-icon"
            style={{
              width: 46,
              height: 46,

              borderRadius: 14,

              flexShrink: 0,

              background:
                "linear-gradient(135deg, #73AFF1 0%, #D5E6FB 100%)",

              border:
                "1px solid rgba(255,255,255,.95)",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              color: "#FFFFFF",

              fontSize: 20,

              boxShadow: `
                0 10px 24px rgba(115,175,241,.30),
                inset 0 1px 0 rgba(255,255,255,.95)
              `,
            }}
          >
            ★
          </span>

          <div className="trw-modal-heading">
            <div
              className="trw-modal-title"
              style={{
                fontSize: 18,
                lineHeight: 1.3,

                fontWeight: 750,

                color: "#10224A",

                letterSpacing: "-.015em",

                marginBottom: 3,
              }}
            >
              Quick store setup
            </div>

            <div
              className="trw-modal-subtitle"
              style={{
                fontSize: 14,

                color: "#8DA7BC",

                lineHeight: 1.4,
              }}
            >
              Takes less than a minute
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",

            gap: 12,
          }}
         className="tr-app-components-embeddedonboardingmodal-div-3">
          {/* Trust badge */}
          <div
            className="trw-modal-trust-badge"
            style={{
              display: "flex",
              alignItems: "center",

              gap: 7,

              padding: "8px 12px",

              borderRadius: 999,

              background: "#FFFFFF",

              border: "1px solid #D5E6FB",

              boxShadow:
                "0 6px 18px rgba(115,175,241,.10)",
            }}
          >
            <span
              style={{
                color: "#73AFF1",

                fontSize: 14,

                letterSpacing: "1px",
              }}
             className="tr-app-components-embeddedonboardingmodal-span-4">
              ★★★★★
            </span>

            <span
              style={{
                fontSize: 14,

                fontWeight: 700,

                color: "#5B6B85",

                whiteSpace: "nowrap",
              }}
             className="tr-app-components-embeddedonboardingmodal-span-5">
              Trust Reviews
            </span>
          </div>

          {/* Close */}
          <button
            onClick={dismiss}
            aria-label="Close"
            className="trw-modal-close"
            style={{
              width: 36,
              height: 36,

              borderRadius: "50%",

              flexShrink: 0,

              border:
                "1px solid #D5E6FB",

              background: "#FFFFFF",

              color: "#5B6B85",

              fontSize: 13,

              cursor: "pointer",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              boxShadow:
                "0 6px 16px rgba(115,175,241,.10)",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Review setup info */}
      <div
        style={{
          position: "relative",
          zIndex: 2,

          display: "flex",
          alignItems: "center",

          gap: 12,

          padding: "13px 16px",

          marginBottom: 24,

          borderRadius: 16,

          background:
            "linear-gradient(90deg, #EAF3FE 0%, rgba(213,230,251,.42) 100%)",

          border:
            "1px solid rgba(213,230,251,.95)",
        }}
       className="tr-app-components-embeddedonboardingmodal-div-6">
        <div
          style={{
            width: 34,
            height: 34,

            borderRadius: 10,

            flexShrink: 0,

            background: "#FFFFFF",

            border: "1px solid #D5E6FB",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            color: "#73AFF1",

            fontSize: 15,

            boxShadow:
              "0 4px 12px rgba(115,175,241,.10)",
          }}
         className="tr-app-components-embeddedonboardingmodal-div-7">
          ★
        </div>

        <div style={{ flex: 1 }} className="tr-app-components-embeddedonboardingmodal-div-8">
          <div
            style={{
              fontSize: 12.5,

              fontWeight: 700,

              color: "#10224A",

              marginBottom: 2,
            }}
           className="tr-app-components-embeddedonboardingmodal-div-9">
            Set up your review experience
          </div>

          <div
            style={{
              fontSize: 11.5,

              color: "#91A9BB",

              lineHeight: 1.5,
            }}
           className="tr-app-components-embeddedonboardingmodal-div-10">
            Complete a few details to start collecting trusted customer reviews.
          </div>
        </div>

        <div
          style={{
            color: "#73AFF1",

            fontSize: 12,

            whiteSpace: "nowrap",
          }}
         className="tr-app-components-embeddedonboardingmodal-div-11">
          ★ ★ ★ ★ ★
        </div>
      </div>

      {/* separator */}
      <div
        style={{
          height: 1,

          width: "100%",

          marginBottom: 26,

          background:
            "linear-gradient(90deg, transparent, #D5E6FB 15%, #D5E6FB 85%, transparent)",
        }}
       className="tr-app-components-embeddedonboardingmodal-div-12"/>

      {/* Existing onboarding component */}
      <div
        style={{
          position: "relative",

          background: "#FFFFFF",

          border:
            "1px solid rgba(213,230,251,.95)",

          borderRadius: 22,

          padding: "28px",

          boxShadow: `
            0 18px 44px rgba(115,175,241,.10),
            inset 0 1px 0 rgba(255,255,255,.95)
          `,
        }}
       className="tr-app-components-embeddedonboardingmodal-div-13">
        <OnboardingCard
          step={step}
          businessSubStep={businessSubStep}
          form={form}
          setForm={setForm}
          devStore={devStore}
          isSubmitting={isSubmitting}
          pendingAction={pendingAction}
          canNext={canNext()}
          goNext={goNext}
          goBack={goBack}
          skipStep={skipStep}
          onAdvance={() => submitPlan("advance")}
          onFree={() => submitPlan("free")}
        />
      </div>

      {/* Bottom note */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          gap: 6,

          marginTop: 17,

          fontSize: 11,

          color: "#97ADBE",
        }}
       className="tr-app-components-embeddedonboardingmodal-div-14">
        <span
          style={{
            color: "#73AFF1",
            fontWeight: 700,
          }}
         className="tr-app-components-embeddedonboardingmodal-span-15">
          ✓
        </span>

        Build trust with authentic customer reviews
      </div>
    </div>
  </div>
</div>
  );
}
