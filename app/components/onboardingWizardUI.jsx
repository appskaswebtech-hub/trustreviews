// app/components/onboardingWizardUI.jsx
//
// Shared visual pieces for the onboarding wizard, used by BOTH:
//  - app/routes/onboarding.jsx — the standalone page (own domain, outside
//    the Shopify admin iframe) shown the very first time a shop opens the app.
//  - app/components/EmbeddedOnboardingModal.jsx — the dismissible popup shown
//    inside the embedded app on every visit after that, until onboarding is
//    actually completed (an explicit plan choice, or the auto-finalize rule
//    after they've already seen the Plan step once).
//
// Each caller keeps its own state/data-fetching wiring (token-based vs
// session-based, different navigation on plan submit) — only the presentation
// lives here.

import { Fragment } from "react";

export const C = {
  bg: "#f6f6f8", surface: "#ffffff", border: "#e5e4ec",
  text: "#17171c", muted: "#6b6b78", accent: "#111827",
};

export const labelStyle = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 600,
  color: C.muted,
  marginBottom: 6,
};

// Polish that plain inline styles can't do (hover/focus states, entrance
// animations). Injected once from each wizard root.
export const WIZARD_CSS = `
@keyframes trwStepIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes trwPopIn { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: scale(1); } }
.trw-step { animation: trwStepIn 320ms cubic-bezier(.2,.7,.3,1); }
.trw-dot { transition: background-color 280ms ease, border-color 280ms ease, color 280ms ease, box-shadow 280ms ease, transform 280ms ease; }
.trw-dot-check { animation: trwPopIn 220ms cubic-bezier(.3,1.5,.5,1); }
.trw-connector-fill { transition: transform 380ms cubic-bezier(.4,0,.2,1); transform-origin: left; }
.trw-input:hover, .trw-select:hover, .trw-textarea:hover { border-color: #c7c7d1; }
.trw-input:focus, .trw-select:focus, .trw-textarea:focus { border-color: #111827 !important; box-shadow: 0 0 0 3px rgba(17,24,39,.08); }
.trw-btn-primary { transition: opacity 150ms ease, transform 120ms ease, box-shadow 150ms ease; }
.trw-btn-primary:hover:not(:disabled) { opacity: .92; box-shadow: 0 6px 16px rgba(17,24,39,.2); transform: translateY(-1px); }
.trw-btn-primary:active:not(:disabled) { transform: scale(.98); }
.trw-btn-ghost { transition: color 150ms ease, gap 150ms ease, border-color 150ms ease; }
.trw-btn-ghost:hover:not(:disabled) { color: #111827; border-color: #111827 !important; }
.trw-radio { transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease; }
.trw-radio:hover { border-color: #c7c7d1; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15,15,20,.06); }
.trw-radio-selected:hover { border-color: #111827; }
`;

// Small inline icons — no icon library needed for a handful of glyphs.
const svg = (props) => ({ width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", ...props });
export const IconChevronRight = () => <svg className="trw-icon-chevron-right" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path className="trw-icon-chevron-right-path" d="m9 6 6 6-6 6" /></svg>;
export const IconChevronLeft = () => <svg className="trw-icon-chevron-left" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path className="trw-icon-chevron-left-path" d="m15 6-6 6 6 6" /></svg>;
export const IconCheck = ({ size = 12 }) => <svg className="trw-icon-check" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path className="trw-icon-check-path" d="M20 6 9 17l-5-5" /></svg>;
const IconBriefcase = () => <svg className="trw-icon-briefcase" {...svg()}><rect className="trw-icon-briefcase-rect" x="2" y="7" width="20" height="14" rx="2.5" /><path className="trw-icon-briefcase-path" d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" /><line className="trw-icon-briefcase-line" x1="2" y1="13" x2="22" y2="13" /></svg>;
const IconPuzzle = () => <svg className="trw-icon-puzzle" {...svg()}><path className="trw-icon-puzzle-path" d="M9 3h3.5a1.5 1.5 0 0 1 1.5 1.5V6a2 2 0 1 0 4 0V4.5A1.5 1.5 0 0 1 19.5 3H21v5.5A1.5 1.5 0 0 1 19.5 10H18a2 2 0 1 0 0 4h1.5a1.5 1.5 0 0 1 1.5 1.5V21h-5.5a1.5 1.5 0 0 1-1.5-1.5V18a2 2 0 1 0-4 0v1.5a1.5 1.5 0 0 1-1.5 1.5H3v-5.5A1.5 1.5 0 0 1 4.5 14H6a2 2 0 1 0 0-4H4.5A1.5 1.5 0 0 1 3 8.5V3h6Z" /></svg>;
const IconRocket = () => <svg className="trw-icon-rocket" {...svg()}><path className="trw-icon-rocket-path" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" /><path className="trw-icon-rocket-path-2" d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 19 2c0 2.5-.5 6.5-4 9a22.35 22.35 0 0 1-3 2Z" /><path className="trw-icon-rocket-path-3" d="M9 12H4s.55-3.03 2-4a5 5 0 0 1 2.6-1" /><path className="trw-icon-rocket-path-4" d="M12 15v5s3.03-.55 4-2a5 5 0 0 0 1-2.6" /></svg>;
const IconStorefront = () => <svg className="trw-icon-storefront" {...svg()}><path className="trw-icon-storefront-path" d="M3 9h18M4 9l1-5h14l1 5M4 9v10h16V9M9 19v-6h6v6" /></svg>;
const IconUsers = () => <svg className="trw-icon-users" {...svg()}><path className="trw-icon-users-path" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle className="trw-icon-users-circle" cx="9" cy="7" r="4" /><path className="trw-icon-users-path-2" d="M23 21v-2a4 4 0 0 0-3-3.87" /><path className="trw-icon-users-path-3" d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconSprout = () => <svg className="trw-icon-sprout" {...svg()}><path className="trw-icon-sprout-path" d="M7 20h10" /><path className="trw-icon-sprout-path-2" d="M10 20c0-4 .5-8-3-9M7 8c0 3 3 3 3 6" /><path className="trw-icon-sprout-path-3" d="M14 20c0-6-1-11 4-13M18 6c0 4-4 4-4 8" /></svg>;
const IconTruck = () => <svg className="trw-icon-truck" {...svg()}><rect className="trw-icon-truck-rect" x="1" y="6" width="14" height="11" rx="1.5" /><path className="trw-icon-truck-path" d="M15 10h4l3 3.5V17h-7z" /><circle className="trw-icon-truck-circle" cx="6" cy="19" r="1.6" /><circle className="trw-icon-truck-circle-2" cx="17.5" cy="19" r="1.6" /></svg>;
const IconBox = () => <svg className="trw-icon-box" {...svg()}><path className="trw-icon-box-path" d="m21 8-9-5-9 5 9 5 9-5Z" /><path className="trw-icon-box-path-2" d="M3 8v8l9 5 9-5V8" /><path className="trw-icon-box-path-3" d="M12 13v8" /></svg>;

export const BUSINESS_TYPES = [
  { value: "My main focus", hint: "Running this full-time", icon: <IconRocket /> },
  { value: "Scaled brand, $1M+/year", hint: "A mature, established operation", icon: <IconStorefront /> },
  { value: "Part-time venture", hint: "Selling alongside other work", icon: <IconUsers /> },
  { value: "New here", hint: "Just getting started", icon: <IconSprout /> },
];

export function RadioCard({ label, hint, icon, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`trw-radio ${selected ? "trw-radio-selected" : ""}`}
      style={{
        display: "flex", alignItems: "center", gap: 13,
        padding: "12px 14px", borderRadius: 12, cursor: "pointer",
        border: selected ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
        background: selected ? "#f5f5ff" : "#fff",
        boxShadow: selected ? "0 2px 10px rgba(17,24,39,.1)" : "none",
      }}
    >
      {icon && (
        <span className="trw-radio-icon" style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: selected ? C.accent : "#f3f4f6",
          color: selected ? "#fff" : "#6b7280",
          transition: "background 160ms ease, color 160ms ease",
        }}>{icon}</span>
      )}
      <div className="trw-radio-content" style={{ flex: 1 }}>
        <div className="trw-radio-label" style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{label}</div>
        {hint && <div className="trw-radio-hint" style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{hint}</div>}
      </div>
      <span className="trw-radio-indicator" style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: selected ? "none" : `1.5px solid ${C.border}`,
        background: selected ? C.accent : "transparent",
        color: "#fff",
        boxSizing: "border-box",
      }}>
        {selected && <span className="trw-dot-check"><IconCheck /></span>}
      </span>
    </div>
  );
}

export const STEPS = ["Business", "Widgets", "Plan"];
const STEP_ICONS = [<IconBriefcase key="b" />, <IconPuzzle key="p" />, <IconRocket key="r" />];

// Flat position across the whole wizard: 0=business type, 1=dropshipper
// question, 2=widgets, 3=plan. Persisted to Store.onboardingStep so a
// merchant who closes the tab (or dismisses the popup) resumes exactly here
// next time, instead of restarting from step 1.
export const flatStepFor = (step, subStep) => (step === 0 ? subStep : step + 1);

/* ── Preview step: shows that the widget needs no code, right in Customize ── */
export function WidgetPreviewStep() {
  const menuItems = ["Image", "Rich text", "Featured product"];
  return (
    <div className="trw-widget-preview">
      <div className="trw-widget-preview-title" style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 4 }}>
        Your widget is already there
      </div>
      <p className="trw-widget-preview-description" style={{ fontSize: 14, color: C.muted, marginBottom: 18, lineHeight: 1.6 }}>
        No code to paste anywhere. Once setup is done, open your theme&apos;s <strong className="trw-widget-preview-customize">Customize</strong> editor,
        add a block, and Trust Reviews is right there under Apps.
      </p>

      <div className="trw-widget-preview-window" style={{
        border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 18,
        boxShadow: "0 6px 20px rgba(15,15,20,.06)",
      }}>
        <div className="trw-widget-preview-toolbar" style={{
          background: "#f3f4f6", padding: "9px 14px", display: "flex", gap: 6, alignItems: "center",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span className="trw-widget-preview-window-close" style={{ width: 8, height: 8, borderRadius: "50%", background: "#f28b82" }} />
          <span className="trw-widget-preview-window-minimize" style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbc04" }} />
          <span className="trw-widget-preview-window-maximize" style={{ width: 8, height: 8, borderRadius: "50%", background: "#81c995" }} />
          <span className="trw-widget-preview-toolbar-title" style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>Theme customizer — Add block</span>
        </div>
        <div className="trw-widget-preview-menu" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {menuItems.map((label) => (
            <div className="trw-widget-preview-menu-item" key={label} style={{
              padding: "8px 10px", borderRadius: 7, fontSize: 12.5, color: "#6b7280",
              background: "#fafafa", border: "1px solid transparent",
            }}>
              {label}
            </div>
          ))}
          <div className="trw-dot-check" style={{
            padding: "8px 10px", borderRadius: 7, fontSize: 12.5, fontWeight: 600, color: C.accent,
            background: "#f4f4ff", border: `1.5px solid ${C.accent}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span className="trw-widget-preview-app-name">⭐ Trust Reviews</span>
            <span className="trw-widget-preview-app-badge" style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: ".03em", color: "#fff",
              background: C.accent, borderRadius: 20, padding: "2px 7px",
            }}>APPS</span>
          </div>
        </div>
      </div>

      <ul className="trw-widget-preview-benefits" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {["No code required", "Works with any theme", "Customize colors & layout anytime"].map((f) => (
          <li className="trw-widget-preview-benefit" key={f} style={{ fontSize: 14, color: "#374151", display: "flex", gap: 7 }}>
            <span className="trw-widget-preview-benefit-check" style={{ color: C.accent, fontWeight: 600 }}>✓</span>{f}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Plan step ── */
export function PlanStep({ devStore, isSubmitting, onAdvance, onFree }) {
  return (
    <div className="trw-plan-step" style={{ textAlign: "center" }}>
      <div className="trw-plan-title" style={{ fontSize: 21, fontWeight: 700, color: C.text, marginBottom: 8, letterSpacing: "-.01em" }}>
        All set! Let&apos;s get your first review faster.
      </div>
      <p className="trw-plan-description" style={{ fontSize: 13, color: C.muted, marginBottom: 22, lineHeight: 1.6, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
        Your Free plan already includes unlimited reviews &amp; storefront widgets.{" "}
        {devStore ? "Development stores get Advanced free:" : "Try Advanced free for 5 days:"}
      </p>

      <div className="trw-plan-features-card" style={{
        background: "#f8f9fc", border: `1px solid ${C.border}`, borderRadius: 14,
        padding: "18px 22px", marginBottom: 24, textAlign: "left",
      }}>
        <ul className="trw-plan-features" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            "Product Grouping & custom CSS/JS",
            "Google Reviews sync + unlimited integrations",
            "Review-reward coupons to boost repeat sales",
          ].map((f) => (
            <li className="trw-plan-feature" key={f} style={{ fontSize: 13.5, color: "#374151", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span className="trw-plan-feature-check" style={{
                width: 19, height: 19, borderRadius: "50%", background: "#059669", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                flexShrink: 0, marginTop: 1, boxShadow: "0 2px 6px rgba(5,150,105,.3)",
              }}>✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <span className="trw-plan-trial-badge" style={{
        display: "inline-block", fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em",
        color: C.accent, background: "#eef0ff", borderRadius: 20, padding: "4px 12px",
        marginBottom: 12, textTransform: "uppercase",
      }}>
        {devStore ? "Free for development stores" : "5-day free trial"}
      </span>

      <div className="trw-plan-advance-action">
        <button
          onClick={onAdvance}
          disabled={isSubmitting}
          className="trw-btn-primary"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            border: "none", borderRadius: 10, padding: "14px 36px",
            background: "linear-gradient(135deg, #111827, #2d3444)",
            color: "#fff", fontSize: 14.5, fontWeight: 650,
            cursor: isSubmitting ? "wait" : "pointer", opacity: isSubmitting ? 0.6 : 1,
            boxShadow: "0 6px 18px rgba(17,24,39,.22)",
          }}
        >
          {isSubmitting ? "Please wait…" : devStore ? "Try Advanced" : "Try Advanced for $0"}
          {!isSubmitting && <IconChevronRight />}
        </button>
      </div>
      <div className="trw-plan-pricing-note" style={{ fontSize: 11.5, color: C.muted, marginTop: 12 }}>
        {devStore ? "Free for development and testing." : "Free for 5 days. Then $9.99/month. Cancel anytime."}
      </div>

      <div className="trw-plan-free-action" style={{ marginTop: 20 }}>
        <button
          onClick={onFree}
          disabled={isSubmitting}
          className="trw-btn-ghost"
          style={{
            border: "none", background: "none", cursor: isSubmitting ? "wait" : "pointer",
            color: "#9ca3af", fontSize: 16, fontWeight: 600, padding: "6px 4px",
            borderBottom: "1px solid transparent",
          }}
        >
          Continue with the Free plan
        </button>
      </div>
    </div>
  );
}

/* ── Step indicator + card + nav buttons — the reusable wizard body ── */
export function OnboardingCard({
  step, businessSubStep, form, setForm,
  devStore, isSubmitting,
  canNext, goNext, goBack, skipStep,
  onAdvance, onFree,
}) {
  const lastStep = STEPS.length - 1;

  return (
    <>
      <style className="trw-wizard-styles">{WIZARD_CSS}</style>

      {/* Step indicator */}
      {/* <div className="trw-step-indicator" style={{
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        marginBottom: 32, flexWrap: "wrap", rowGap: 10,
      }}>
        {STEPS.map((label, i) => (
          <Fragment key={label}>
            <div className="trw-step-indicator-item" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 64 }}>
              <div className="trw-dot" style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: i < step ? "#ecfdf5" : i === step ? C.accent : "#fff",
                color: i < step ? "#059669" : i === step ? "#fff" : "#a8a8b3",
                border: i === step ? `2px solid ${C.accent}` : i < step ? "2px solid #6ee7b7" : `1.5px solid ${C.border}`,
                boxShadow: i === step ? "0 4px 14px rgba(17,24,39,.22)" : "none",
                transform: i === step ? "scale(1.06)" : "scale(1)",
              }}>
                {i < step ? <span className="trw-dot-check"><IconCheck size={16} /></span> : STEP_ICONS[i]}
              </div>
              <div className="trw-step-indicator-label" style={{
                fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap",
                color: i <= step ? C.text : "#a8a8b3",
              }}>{label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="trw-step-connector" style={{ width: 32, height: 2, margin: "18px 4px 0", background: C.border, overflow: "hidden" }}>
                <div className="trw-connector-fill" style={{
                  height: "100%", background: "#6ee7b7",
                  transform: i < step ? "scaleX(1)" : "scaleX(0)",
                }} />
              </div>
            )}
          </Fragment>
        ))}
      </div> */}
      <div
  className="trw-step-indicator"
  style={{
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    marginBottom: 34,
    flexWrap: "wrap",
    rowGap: 14,
    padding: "16px 18px",
    background: "linear-gradient(135deg, #F2F7FB 0%, #FFFFFF 100%)",
    border: "1px solid #D6E6F2",
    borderRadius: 18,
    boxShadow: "0 10px 28px rgba(141,180,214,.08)",
  }}
>
  {STEPS.map((label, i) => {
    const isCompleted = i < step;
    const isActive = i === step;
    const isPending = i > step;

    return (
      <Fragment key={label}>
        <div
          className="trw-step-indicator-item"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 7,
            width: 78,
            position: "relative",
          }}
        >
          <div
            className="trw-dot"
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isCompleted
                ? "#D6E6F2"
                : isActive
                ? "linear-gradient(135deg, #8DB4D6 0%, #AFCBE2 100%)"
                : "#FFFFFF",

              color: isCompleted
                ? "#4F7392"
                : isActive
                ? "#FFFFFF"
                : "#A8BAC8",

              border: isActive
                ? "2px solid #8DB4D6"
                : isCompleted
                ? "1.5px solid #8DB4D6"
                : "1.5px solid #D6E6F2",

              boxShadow: isActive
                ? "0 8px 20px rgba(141,180,214,.28)"
                : isCompleted
                ? "0 5px 14px rgba(141,180,214,.14)"
                : "0 3px 10px rgba(141,180,214,.06)",

              transform: isActive ? "scale(1.08)" : "scale(1)",

              transition:
                "all 220ms cubic-bezier(.2,.8,.3,1)",

              position: "relative",
            }}
          >
            {isCompleted ? (
              <span
                className="trw-dot-check"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconCheck size={17} />
              </span>
            ) : (
              STEP_ICONS[i]
            )}

            {/* active glow dot */}
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  border: "2px solid #8DB4D6",
                  bottom: -4,
                  right: -3,
                  boxShadow: "0 2px 7px rgba(141,180,214,.3)",
                }}
               className="tr-app-components-onboardingwizardui-span-1"/>
            )}
          </div>
          <div
            className="trw-step-indicator-label"
            style={{
              fontSize: 11.5,
              fontWeight: isActive ? 700 : 600,
              whiteSpace: "nowrap",
              color: isActive
                ? "#4F7392"
                : isCompleted
                ? "#6F8FA9"
                : "#A3B4C1",

              letterSpacing: "-.01em",
              transition: "color 180ms ease",
            }}
          >
            {label}
          </div>
          {/* small status text */}
          <div
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              lineHeight: 1,
              color: isCompleted
                ? "#8DB4D6"
                : isActive
                ? "#8DB4D6"
                : "#C0CDD6",
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
           className="tr-app-components-onboardingwizardui-div-2">
            {isCompleted
              ? "Done"
              : isActive
              ? "Current"
              : `Step ${i + 1}`}
          </div>
        </div>
        {i < STEPS.length - 1 && (
          <div
            className="trw-step-connector"
            style={{
              width: 40,
              height: 3,
              margin: "20px 3px 0",
              borderRadius: 999,
              background: "#EAF2F8",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              className="trw-connector-fill"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, #8DB4D6, #D6E6F2)",
                transform: isCompleted
                  ? "scaleX(1)"
                  : "scaleX(0)",

                transformOrigin: "left center",
                transition:
                  "transform 320ms cubic-bezier(.2,.8,.3,1)",
              }}
            />
          </div>
        )}
      </Fragment>
    );
  })}
</div>

      {/* <div className="trw-onboarding-card" style={{
        background: C.surface, borderRadius: 18, border: `1px solid ${C.border}`,
        padding: "32px 28px 28px", boxShadow: "0 10px 34px rgba(15,15,20,.08)",
        overflow: "hidden", position: "relative",
      }}>
        <div className="trw-onboarding-card-accent" style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, #111827, #4b5563)",
        }} />
        <div key={`${step}-${businessSubStep}`} className="trw-step">
          {step === 0 && businessSubStep === 0 && (
            <div className="trw-business-step" style={{ marginBottom: 4 }}>
              <div className="trw-business-title" style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                What best describes your business?
              </div>
              <p className="trw-business-description" style={{ fontSize: 12.5, color: C.muted, marginBottom: 18, lineHeight: 1.6 }}>
                This just helps us tailor setup tips and benchmarks to your store — nothing here affects your plan or pricing.
              </p>
              <div className="trw-business-options" style={{
                display: "flex", flexDirection: "column", gap: 9,
                maxHeight: 320, overflowY: "auto", paddingRight: 2,
              }}>
                {BUSINESS_TYPES.map((t) => (
                  <RadioCard
                    key={t.value}
                    label={t.value}
                    hint={t.hint}
                    icon={t.icon}
                    selected={form.businessType === t.value}
                    onClick={() => setForm((f) => ({ ...f, businessType: t.value }))}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 0 && businessSubStep === 1 && (
            <div className="trw-dropshipper-step" style={{ marginBottom: 4 }}>
              <div className="trw-dropshipper-title" style={{ fontSize: 17, fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 4 }}>
                Are you a dropshipper?
              </div>
              <p className="trw-dropshipper-description" style={{ fontSize: 12.5, color: C.muted, textAlign: "center", marginBottom: 24, lineHeight: 1.6, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
                We&apos;ll fine-tune review-collection timing to match how orders actually reach your customers.
              </p>
              <div className="trw-dropshipper-options" style={{ display: "flex", gap: 12 }}>
                {[
                  { opt: "Yes", icon: <IconTruck />, hint: "Ships from a supplier" },
                  { opt: "No", icon: <IconBox />, hint: "I ship it myself" },
                ].map(({ opt, icon, hint }) => {
                  const selected = form.isDropshipper === opt;
                  return (
                    <div
                      key={opt}
                      onClick={() => setForm((f) => ({ ...f, isDropshipper: opt }))}
                      className={`trw-radio ${selected ? "trw-radio-selected" : ""}`}
                      style={{
                        flex: 1, textAlign: "center", padding: "20px 14px", borderRadius: 12, cursor: "pointer",
                        border: selected ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                        background: selected ? "#f5f5ff" : "#fff",
                        boxShadow: selected ? "0 2px 10px rgba(17,24,39,.1)" : "none",
                      }}
                    >
                      <span className="trw-dropshipper-option-icon" style={{
                        width: 40, height: 40, borderRadius: 10, margin: "0 auto 10px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: selected ? C.accent : "#f3f4f6",
                        color: selected ? "#fff" : "#6b7280",
                      }}>{icon}</span>
                      <div className="trw-dropshipper-option-label" style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{opt}</div>
                      <div className="trw-dropshipper-option-hint" style={{ fontSize: 11, color: C.muted }}>{hint}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && <WidgetPreviewStep />}

          {step === 2 && (
            <PlanStep
              devStore={devStore}
              isSubmitting={isSubmitting}
              onAdvance={onAdvance}
              onFree={onFree}
            />
          )}
        </div>

        {step < lastStep && (
          <div className="trw-wizard-navigation" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26 }}>
            <button
              onClick={goBack}
              disabled={step === 0 && businessSubStep === 0}
              className="trw-btn-ghost"
              style={{
                display: "flex", alignItems: "center", gap: 4,
                border: "none", background: "none", cursor: (step === 0 && businessSubStep === 0) ? "default" : "pointer",
                color: (step === 0 && businessSubStep === 0) ? "#d1d1db" : C.muted, fontSize: 13, fontWeight: 600, padding: "10px 4px",
              }}
            >
              <IconChevronLeft /> Back
            </button>
            <div className="trw-wizard-navigation-actions" style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <button
                onClick={skipStep}
                className="trw-btn-ghost"
                style={{
                  border: "none", background: "none", cursor: "pointer",
                  color: C.muted, fontSize: 13, fontWeight: 600, padding: "10px 4px",
                }}
              >
                Skip
              </button>
              <button
                onClick={goNext}
                disabled={!canNext}
                className="trw-btn-primary"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  border: "none", borderRadius: 9, padding: "11px 26px",
                  background: canNext ? C.accent : "#d1d5db",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: canNext ? "pointer" : "default",
                }}
              >
                {step === 1 ? "Got it, continue" : "Continue"} <IconChevronRight />
              </button>
            </div>
          </div>
        )}
      </div> */}
      <div
  className="trw-onboarding-card"
  style={{
    background:
      "linear-gradient(145deg, rgba(255,255,255,1) 0%, rgba(242,247,251,.88) 100%)",
    borderRadius: 24,
    border: "1px solid rgba(214,230,242,.95)",
    padding: "34px 32px 30px",
    boxShadow: `
      0 20px 50px rgba(141,180,214,.12),
      0 6px 18px rgba(79,115,146,.05),
      inset 0 1px 0 rgba(255,255,255,.95)
    `,
    overflow: "hidden",
    position: "relative",
  }}
>
  <style className="tr-app-components-onboardingwizardui-style-3">{`
    .trw-business-options::-webkit-scrollbar {
      width: 5px;
    }

    .trw-business-options::-webkit-scrollbar-track {
      background: transparent;
    }

    .trw-business-options::-webkit-scrollbar-thumb {
      background: #D6E6F2;
      border-radius: 50px;
    }

    .trw-radio {
      transition:
        transform 180ms ease,
        box-shadow 180ms ease,
        border-color 180ms ease,
        background 180ms ease;
    }

    .trw-radio:hover {
      transform: translateY(-2px);
      border-color: #8DB4D6 !important;
      box-shadow: 0 10px 24px rgba(141,180,214,.14) !important;
    }

    .trw-btn-primary {
      transition:
        transform 160ms ease,
        box-shadow 160ms ease,
        background 160ms ease;
    }

    .trw-btn-primary:not(:disabled):hover {
      transform: translateY(-1px);
      box-shadow: 0 9px 20px rgba(141,180,214,.30);
    }

    .trw-btn-ghost {
      transition:
        color 150ms ease,
        background 150ms ease;
    }

    .trw-btn-ghost:not(:disabled):hover {
      color: #4F7392 !important;
    }

    @media (max-width: 640px) {
      .trw-onboarding-card {
        padding: 26px 20px 22px !important;
        border-radius: 20px !important;
      }

      .trw-dropshipper-options {
        flex-direction: column !important;
      }

      .trw-wizard-navigation {
        gap: 14px !important;
      }

      .trw-wizard-navigation-actions {
        gap: 10px !important;
      }

      .trw-btn-primary {
        padding: 10px 16px !important;
      }
    }
  `}</style>

  {/* Top accent */}
  <div
    className="trw-onboarding-card-accent"
    style={{
      position: "absolute",
      top: 0,
      left: "14%",
      right: "14%",
      height: 3,
      borderRadius: "0 0 10px 10px",
      background:
        "linear-gradient(90deg, transparent, #8DB4D6 30%, #D6E6F2 70%, transparent)",
    }}
  />

  {/* Decorative glow */}
  <div
    style={{
      position: "absolute",
      width: 180,
      height: 180,
      borderRadius: "50%",
      background: "rgba(214,230,242,.30)",
      filter: "blur(25px)",
      top: -90,
      right: -70,
      pointerEvents: "none",
    }}
   className="tr-app-components-onboardingwizardui-div-4"/>

  <div
    key={`${step}-${businessSubStep}`}
    className="trw-step"
    style={{
      position: "relative",
      zIndex: 2,
    }}
  >
    {/* BUSINESS TYPE */}
    {step === 0 && businessSubStep === 0 && (
      <div
        className="trw-business-step"
        style={{
          marginBottom: 4,
        }}
      >
        {/* Heading badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 10px",
            marginBottom: 13,
            borderRadius: 999,
            background: "#F2F7FB",
            border: "1px solid #D6E6F2",
            color: "#8DB4D6",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: ".04em",
            textTransform: "uppercase",
          }}
         className="tr-app-components-onboardingwizardui-div-5">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#8DB4D6",
            }}
           className="tr-app-components-onboardingwizardui-span-6"/>

          Store details
        </div>

        <div
          className="trw-business-title"
          style={{
            fontSize: 20,
            lineHeight: 1.3,
            fontWeight: 750,
            color: "#4F7392",
            marginBottom: 7,
            letterSpacing: "-.02em",
          }}
        >
          What best describes your business?
        </div>

        <p
          className="trw-business-description"
          style={{
            fontSize: 12.5,
            color: "#849CAF",
            margin: "0 0 22px",
            lineHeight: 1.65,
            maxWidth: 560,
          }}
        >
          This just helps us tailor setup tips and benchmarks to your store —
          nothing here affects your plan or pricing.
        </p>

        <div
          className="trw-business-options"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxHeight: 320,
            overflowY: "auto",
            paddingRight: 5,
          }}
        >
          {BUSINESS_TYPES.map((t) => (
            <RadioCard
              key={t.value}
              label={t.value}
              hint={t.hint}
              icon={t.icon}
              selected={form.businessType === t.value}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  businessType: t.value,
                }))
              }
            />
          ))}
        </div>
      </div>
    )}

    {/* DROPSHIPPER */}
    {step === 0 && businessSubStep === 1 && (
      <div
        className="trw-dropshipper-step"
        style={{
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 15,
            margin: "0 auto 15px",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            background:
              "linear-gradient(135deg, #8DB4D6 0%, #D6E6F2 100%)",

            color: "#FFFFFF",

            boxShadow:
              "0 10px 24px rgba(141,180,214,.26)",

            border: "1px solid rgba(255,255,255,.9)",
          }}
         className="tr-app-components-onboardingwizardui-div-7">
          <IconTruck />
        </div>

        <div
          className="trw-dropshipper-title"
          style={{
            fontSize: 20,
            fontWeight: 750,
            color: "#4F7392",
            textAlign: "center",
            marginBottom: 7,
            letterSpacing: "-.02em",
          }}
        >
          Are you a dropshipper?
        </div>

        <p
          className="trw-dropshipper-description"
          style={{
            fontSize: 12.5,
            color: "#849CAF",
            textAlign: "center",
            marginBottom: 26,
            lineHeight: 1.65,
            maxWidth: 390,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          We&apos;ll fine-tune review-collection timing to match how orders
          actually reach your customers.
        </p>

        <div
          className="trw-dropshipper-options"
          style={{
            display: "flex",
            gap: 14,
          }}
        >
          {[
            {
              opt: "Yes",
              icon: <IconTruck />,
              hint: "Ships from a supplier",
            },
            {
              opt: "No",
              icon: <IconBox />,
              hint: "I ship it myself",
            },
          ].map(({ opt, icon, hint }) => {
            const selected = form.isDropshipper === opt;

            return (
              <div
                key={opt}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    isDropshipper: opt,
                  }))
                }
                className={`trw-radio ${
                  selected ? "trw-radio-selected" : ""
                }`}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "22px 16px",
                  borderRadius: 16,
                  cursor: "pointer",

                  border: selected
                    ? "2px solid #8DB4D6"
                    : "1px solid #D6E6F2",

                  background: selected
                    ? "linear-gradient(145deg, #F2F7FB, #FFFFFF)"
                    : "#FFFFFF",

                  boxShadow: selected
                    ? "0 12px 28px rgba(141,180,214,.16)"
                    : "0 5px 16px rgba(141,180,214,.06)",

                  position: "relative",
                }}
              >
                {/* selected indicator */}
                {selected && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,

                      width: 18,
                      height: 18,

                      borderRadius: "50%",

                      background: "#8DB4D6",

                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",

                      color: "#FFFFFF",
                    }}
                   className="tr-app-components-onboardingwizardui-div-8">
                    <IconCheck size={11} />
                  </div>
                )}

                <span
                  className="trw-dropshipper-option-icon"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    margin: "0 auto 11px",

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",

                    background: selected
                      ? "linear-gradient(135deg, #8DB4D6, #AFCBE2)"
                      : "#F2F7FB",

                    border: selected
                      ? "1px solid #8DB4D6"
                      : "1px solid #D6E6F2",

                    color: selected
                      ? "#FFFFFF"
                      : "#8DB4D6",
                  }}
                >
                  {icon}
                </span>

                <div
                  className="trw-dropshipper-option-label"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: selected ? "#4F7392" : "#607C94",
                    marginBottom: 4,
                  }}
                >
                  {opt}
                </div>

                <div
                  className="trw-dropshipper-option-hint"
                  style={{
                    fontSize: 11,
                    color: "#93AABD",
                  }}
                >
                  {hint}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Widget preview */}
    {step === 1 && <WidgetPreviewStep />}

    {/* Plan */}
    {step === 2 && (
      <PlanStep
        devStore={devStore}
        isSubmitting={isSubmitting}
        onAdvance={onAdvance}
        onFree={onFree}
      />
    )}
  </div>

  {/* NAVIGATION */}
  {step < lastStep && (
    <>
      <div
        style={{
          height: 1,
          width: "100%",
          margin: "28px 0 18px",

          background:
            "linear-gradient(90deg, transparent, #D6E6F2 12%, #D6E6F2 88%, transparent)",
        }}
       className="tr-app-components-onboardingwizardui-div-9"/>

      <div
        className="trw-wizard-navigation"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
        }}
      >
        <button
          onClick={goBack}
          disabled={step === 0 && businessSubStep === 0}
          className="trw-btn-ghost"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,

            border: "none",
            background: "transparent",

            cursor:
              step === 0 && businessSubStep === 0
                ? "default"
                : "pointer",

            color:
              step === 0 && businessSubStep === 0
                ? "#CBD8E2"
                : "#829BAF",

            fontSize: 16,
            fontWeight: 650,

            padding: "10px 5px",
          }}
        >
          <IconChevronLeft />

          Back
        </button>

        <div
          className="trw-wizard-navigation-actions"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <button
            onClick={skipStep}
            className="trw-btn-ghost"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",

              color: "#8FA5B7",

              fontSize: 16,
              fontWeight: 650,

              padding: "10px 5px",
            }}
          >
            Skip
          </button>

          <button
            onClick={goNext}
            disabled={!canNext}
            className="trw-btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,

              minWidth: 124,

              border: "none",
              borderRadius: 11,

              padding: "11px 22px",

              background: canNext
                ? "linear-gradient(135deg, #4a8fcb  0%, #82afd4  100%)"
                : "#D8E3EB",

              color: "#FFFFFF",

              fontSize: 16,
              fontWeight: 700,

              cursor: canNext
                ? "pointer"
                : "default",

              boxShadow: canNext
                ? "0 7px 18px rgba(141,180,214,.25)"
                : "none",
            }}
          >
            {step === 1
              ? "Got it, continue"
              : "Continue"}

            <IconChevronRight />
          </button>
        </div>
      </div>
    </>
  )}
</div>
    </>
  );
}
