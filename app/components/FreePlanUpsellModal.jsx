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
      fontFamily: "var(--app-font-family)",
      animation: "trwOverlayIn 220ms ease",
    }} className="tr-app-components-freeplanupsellmodal-div-1">
      <style className="tr-app-components-freeplanupsellmodal-style-2">{`
        @keyframes trwOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes trwModalIn { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .trw-modal-close { transition: background 150ms ease, transform 150ms ease; }
        .trw-modal-close:hover { background: rgba(255,255,255,.16) !important; transform: rotate(90deg); }
      `}</style>
      {/* <div style={{
        maxWidth: 480, width: "100%", maxHeight: "92vh", overflowY: "auto",
        animation: "trwModalIn 320ms cubic-bezier(.2,.8,.3,1)",
      }} className="tr-app-components-freeplanupsellmodal-div-3">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 2px" }} className="tr-app-components-freeplanupsellmodal-div-4">
          <div style={{ display: "flex", alignItems: "center", gap: 11 }} className="tr-app-components-freeplanupsellmodal-div-5">
            <span style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, #ffffff, #d8dbe3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              boxShadow: "0 4px 14px rgba(0,0,0,.25)",
            }} className="tr-app-components-freeplanupsellmodal-span-6">🚀</span>
            <div className="tr-app-components-freeplanupsellmodal-div-7">
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }} className="tr-app-components-freeplanupsellmodal-div-8">Unlock more with Advanced</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.68)" }} className="tr-app-components-freeplanupsellmodal-div-9">5-day free trial, no risk</div>
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
        }} className="tr-app-components-freeplanupsellmodal-div-10">
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: "linear-gradient(90deg, #111827, #4b5563)",
          }}  className="tr-app-components-freeplanupsellmodal-div-11"/>
          <PlanStep
            isSubmitting={isSubmitting}
            onAdvance={submitAdvance}
            onFree={() => setDismissed(true)}
          />
        </div>
      </div> */}
      <div
  style={{
    maxWidth: 500,
    width: "100%",
    maxHeight: "92vh",
    overflowY: "auto",
    animation: "trwModalIn 320ms cubic-bezier(.2,.8,.3,1)",
    background: "#FFFFFF",
    borderRadius: 22,
    border: "1px solid #D6E6F2",
    boxShadow:
      "0 28px 70px rgba(37,61,79,.22), 0 8px 24px rgba(79,115,146,.10)",
    fontSize: 14,
    color: "#4F7392",
    boxSizing: "border-box",
  }}
  className="tr-app-components-freeplanupsellmodal-div-3 trw-upsell-modal"
>
  <style>{`
    .trw-upsell-modal,
    .trw-upsell-modal *{
      box-sizing:border-box;
    }

    .trw-upsell-modal{
      scrollbar-width:thin;
      scrollbar-color:#C4D8E5 transparent;
    }

    .trw-upsell-modal::-webkit-scrollbar{
      width:7px;
    }

    .trw-upsell-modal::-webkit-scrollbar-track{
      background:transparent;
    }

    .trw-upsell-modal::-webkit-scrollbar-thumb{
      background:#C4D8E5;
      border-radius:20px;
    }

    .trw-modal-close{
      transition:
        background .16s ease,
        border-color .16s ease,
        transform .16s ease;
    }

    .trw-modal-close:hover{
      background:rgba(255,255,255,.18) !important;
      border-color:rgba(255,255,255,.4) !important;
      transform:scale(1.04);
    }

    .trw-modal-close:active{
      transform:scale(.97);
    }

    @media(max-width:560px){
      .trw-upsell-modal{
        width:calc(100vw - 24px) !important;
        max-width:none !important;
        max-height:90vh !important;
        border-radius:18px !important;
      }

      .trw-upsell-header{
        padding:17px 16px !important;
      }

      .trw-upsell-icon{
        width:42px !important;
        height:42px !important;
      }

      .trw-upsell-title{
        font-size:15px !important;
      }

      .trw-upsell-subtitle{
        font-size:12px !important;
      }

      .trw-upsell-content{
        padding:18px 14px 16px !important;
      }
    }

    @media(max-width:380px){
      .trw-upsell-modal{
        width:calc(100vw - 16px) !important;
        border-radius:16px !important;
      }

      .trw-upsell-header{
        padding:15px 13px !important;
        gap:9px !important;
      }

      .trw-upsell-icon{
        width:38px !important;
        height:38px !important;
      }

      .trw-upsell-title{
        font-size:14px !important;
      }

      .trw-upsell-content{
        padding:15px 11px 13px !important;
      }
    }
  `}</style>

  {/* Header */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      padding: "19px 20px",
      marginBottom: 0,
      background:
        "linear-gradient(135deg,#587D9B 0%,#739DBD 52%,#8DB4D6 100%)",
      position: "relative",
      overflow: "hidden",
    }}
    className="tr-app-components-freeplanupsellmodal-div-4 trw-upsell-header"
  >
    {/* soft decorative circles */}
    <div
      style={{
        position: "absolute",
        width: 150,
        height: 150,
        borderRadius: "50%",
        background: "rgba(255,255,255,.07)",
        top: -95,
        right: 35,
        pointerEvents: "none",
      }}
    />

    <div
      style={{
        position: "absolute",
        width: 90,
        height: 90,
        borderRadius: "50%",
        background: "rgba(255,255,255,.05)",
        bottom: -55,
        left: 45,
        pointerEvents: "none",
      }}
    />

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minWidth: 0,
        position: "relative",
        zIndex: 1,
      }}
      className="tr-app-components-freeplanupsellmodal-div-5"
    >
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: 13,
          flexShrink: 0,
          background: "rgba(255,255,255,.15)",
          border: "1px solid rgba(255,255,255,.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          boxShadow:
            "0 7px 18px rgba(39,76,104,.18), inset 0 1px 0 rgba(255,255,255,.15)",
        }}
        className="tr-app-components-freeplanupsellmodal-span-6 trw-upsell-icon"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 3L14.2 8.2L20 9L15.6 12.8L16.8 18.5L12 15.6L7.2 18.5L8.4 12.8L4 9L9.8 8.2L12 3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <div
        style={{
          minWidth: 0,
        }}
        className="tr-app-components-freeplanupsellmodal-div-7"
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#FFFFFF",
            lineHeight: 1.25,
            letterSpacing: "-.015em",
          }}
          className="tr-app-components-freeplanupsellmodal-div-8 trw-upsell-title"
        >
          Unlock more with Advanced
        </div>

        <div
          style={{
            fontSize: 12.5,
            color: "rgba(255,255,255,.78)",
            marginTop: 4,
            lineHeight: 1.4,
            fontWeight: 500,
          }}
          className="tr-app-components-freeplanupsellmodal-div-9 trw-upsell-subtitle"
        >
          5-day free trial, no risk
        </div>
      </div>
    </div>

    <button
      onClick={() => setDismissed(true)}
      aria-label="Close"
      className="trw-modal-close"
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        flexShrink: 0,
        border: "1px solid rgba(255,255,255,.24)",
        background: "rgba(255,255,255,.10)",
        color: "#FFFFFF",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        position: "relative",
        zIndex: 1,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M7 7L17 17M17 7L7 17"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  </div>

  {/* Plan content */}
  <div
    style={{
      background:
        "linear-gradient(180deg,#FFFFFF 0%,#FAFCFD 100%)",
      borderRadius: 0,
      border: "none",
      padding: "24px 22px 22px",
      boxShadow: "none",
      overflow: "hidden",
      position: "relative",
    }}
    className="tr-app-components-freeplanupsellmodal-div-10 trw-upsell-content"
  >
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 22,
        right: 22,
        height: 1,
        background:
          "linear-gradient(90deg,transparent,#D6E6F2,transparent)",
      }}
      className="tr-app-components-freeplanupsellmodal-div-11"
    />

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
