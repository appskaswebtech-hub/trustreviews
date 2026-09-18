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
export const IconChevronRight = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>;
export const IconChevronLeft = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>;
export const IconCheck = ({ size = 12 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
const IconBriefcase = () => <svg {...svg()}><rect x="2" y="7" width="20" height="14" rx="2.5" /><path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" /><line x1="2" y1="13" x2="22" y2="13" /></svg>;
const IconPuzzle = () => <svg {...svg()}><path d="M9 3h3.5a1.5 1.5 0 0 1 1.5 1.5V6a2 2 0 1 0 4 0V4.5A1.5 1.5 0 0 1 19.5 3H21v5.5A1.5 1.5 0 0 1 19.5 10H18a2 2 0 1 0 0 4h1.5a1.5 1.5 0 0 1 1.5 1.5V21h-5.5a1.5 1.5 0 0 1-1.5-1.5V18a2 2 0 1 0-4 0v1.5a1.5 1.5 0 0 1-1.5 1.5H3v-5.5A1.5 1.5 0 0 1 4.5 14H6a2 2 0 1 0 0-4H4.5A1.5 1.5 0 0 1 3 8.5V3h6Z" /></svg>;
const IconRocket = () => <svg {...svg()}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 19 2c0 2.5-.5 6.5-4 9a22.35 22.35 0 0 1-3 2Z" /><path d="M9 12H4s.55-3.03 2-4a5 5 0 0 1 2.6-1" /><path d="M12 15v5s3.03-.55 4-2a5 5 0 0 0 1-2.6" /></svg>;
const IconStorefront = () => <svg {...svg()}><path d="M3 9h18M4 9l1-5h14l1 5M4 9v10h16V9M9 19v-6h6v6" /></svg>;
const IconUsers = () => <svg {...svg()}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconSprout = () => <svg {...svg()}><path d="M7 20h10" /><path d="M10 20c0-4 .5-8-3-9M7 8c0 3 3 3 3 6" /><path d="M14 20c0-6-1-11 4-13M18 6c0 4-4 4-4 8" /></svg>;
const IconTruck = () => <svg {...svg()}><rect x="1" y="6" width="14" height="11" rx="1.5" /><path d="M15 10h4l3 3.5V17h-7z" /><circle cx="6" cy="19" r="1.6" /><circle cx="17.5" cy="19" r="1.6" /></svg>;
const IconBox = () => <svg {...svg()}><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>;

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
        <span style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: selected ? C.accent : "#f3f4f6",
          color: selected ? "#fff" : "#6b7280",
          transition: "background 160ms ease, color 160ms ease",
        }}>{icon}</span>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{label}</div>
        {hint && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{hint}</div>}
      </div>
      <span style={{
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
    <div>
      <div style={{ fontSize: 15.5, fontWeight: 600, color: C.text, marginBottom: 4 }}>
        Your widget is already there
      </div>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 1.6 }}>
        No code to paste anywhere. Once setup is done, open your theme&apos;s <strong>Customize</strong> editor,
        add a block, and Trust Reviews is right there under Apps.
      </p>

      <div style={{
        border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 18,
        boxShadow: "0 6px 20px rgba(15,15,20,.06)",
      }}>
        <div style={{
          background: "#f3f4f6", padding: "9px 14px", display: "flex", gap: 6, alignItems: "center",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f28b82" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbc04" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#81c995" }} />
          <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>Theme customizer — Add block</span>
        </div>
        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {menuItems.map((label) => (
            <div key={label} style={{
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
            <span>⭐ Trust Reviews</span>
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: ".03em", color: "#fff",
              background: C.accent, borderRadius: 20, padding: "2px 7px",
            }}>APPS</span>
          </div>
        </div>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {["No code required", "Works with any theme", "Customize colors & layout anytime"].map((f) => (
          <li key={f} style={{ fontSize: 13, color: "#374151", display: "flex", gap: 7 }}>
            <span style={{ color: C.accent, fontWeight: 600 }}>✓</span>{f}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Plan step ── */
export function PlanStep({ devStore, isSubmitting, onAdvance, onFree }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 21, fontWeight: 700, color: C.text, marginBottom: 8, letterSpacing: "-.01em" }}>
        All set! Let&apos;s get your first review faster.
      </div>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 22, lineHeight: 1.6, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
        Your Free plan already includes unlimited reviews &amp; storefront widgets.{" "}
        {devStore ? "Development stores get Advanced free:" : "Try Advanced free for 5 days:"}
      </p>

      <div style={{
        background: "#f8f9fc", border: `1px solid ${C.border}`, borderRadius: 14,
        padding: "18px 22px", marginBottom: 24, textAlign: "left",
      }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            "Product Grouping & custom CSS/JS",
            "Google Reviews sync + unlimited integrations",
            "Review-reward coupons to boost repeat sales",
          ].map((f) => (
            <li key={f} style={{ fontSize: 13.5, color: "#374151", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{
                width: 19, height: 19, borderRadius: "50%", background: "#059669", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                flexShrink: 0, marginTop: 1, boxShadow: "0 2px 6px rgba(5,150,105,.3)",
              }}>✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <span style={{
        display: "inline-block", fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em",
        color: C.accent, background: "#eef0ff", borderRadius: 20, padding: "4px 12px",
        marginBottom: 12, textTransform: "uppercase",
      }}>
        {devStore ? "Free for development stores" : "5-day free trial"}
      </span>

      <div>
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
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 12 }}>
        {devStore ? "Free for development and testing." : "Free for 5 days. Then $9.99/month. Cancel anytime."}
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          onClick={onFree}
          disabled={isSubmitting}
          className="trw-btn-ghost"
          style={{
            border: "none", background: "none", cursor: isSubmitting ? "wait" : "pointer",
            color: "#9ca3af", fontSize: 12.5, fontWeight: 600, padding: "6px 4px",
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
      <style>{WIZARD_CSS}</style>

      {/* Step indicator */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        marginBottom: 32, flexWrap: "wrap", rowGap: 10,
      }}>
        {STEPS.map((label, i) => (
          <Fragment key={label}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 64 }}>
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
              <div style={{
                fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap",
                color: i <= step ? C.text : "#a8a8b3",
              }}>{label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 32, height: 2, margin: "18px 4px 0", background: C.border, overflow: "hidden" }}>
                <div className="trw-connector-fill" style={{
                  height: "100%", background: "#6ee7b7",
                  transform: i < step ? "scaleX(1)" : "scaleX(0)",
                }} />
              </div>
            )}
          </Fragment>
        ))}
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
        <div key={`${step}-${businessSubStep}`} className="trw-step">
          {step === 0 && businessSubStep === 0 && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                What best describes your business?
              </div>
              <p style={{ fontSize: 12.5, color: C.muted, marginBottom: 18, lineHeight: 1.6 }}>
                This just helps us tailor setup tips and benchmarks to your store — nothing here affects your plan or pricing.
              </p>
              <div style={{
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
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 4 }}>
                Are you a dropshipper?
              </div>
              <p style={{ fontSize: 12.5, color: C.muted, textAlign: "center", marginBottom: 24, lineHeight: 1.6, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
                We&apos;ll fine-tune review-collection timing to match how orders actually reach your customers.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
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
                      <span style={{
                        width: 40, height: 40, borderRadius: 10, margin: "0 auto 10px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: selected ? C.accent : "#f3f4f6",
                        color: selected ? "#fff" : "#6b7280",
                      }}>{icon}</span>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{opt}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{hint}</div>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26 }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
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
      </div>
    </>
  );
}
