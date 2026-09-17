// app/routes/onboarding.jsx
//
// Standalone onboarding page — deliberately NOT nested under app.jsx, so it
// renders as a plain page on our own domain instead of inside the Shopify
// admin iframe. Reached only via the signed token app.jsx hands out when a
// shop hasn't finished onboarding (see utils/onboarding-token.server.js).
// Because it's outside the iframe, it can't use authenticate.admin() (that
// requires an embedded session token) — it resolves the shop from the token
// and talks to the Admin API via unauthenticated.admin(shop) instead.

import { useState, Fragment } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { redirect } from "react-router";
import db from "../db.server";
import { unauthenticated } from "../shopify.server";
import { createSubscription, isDevStore, getShopPlan } from "../billing.server";
import { verifyOnboardingToken } from "../utils/onboarding-token.server";

function buildAdminUrl(shop, suffix = "/app") {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const storeName = shop.replace(".myshopify.com", "");
  return `https://admin.shopify.com/store/${storeName}/apps/${apiKey}${suffix}`;
}

/* ── Loader ── */
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const shop = verifyOnboardingToken(token);

  if (!shop) {
    return { expired: true };
  }

  const store = await db.store.upsert({
    where: { shop },
    update: {},
    create: { shop },
  });

  if (store.onboardingCompleted) {
    throw redirect(buildAdminUrl(shop));
  }

  const { admin } = await unauthenticated.admin(shop);
  const dev = await isDevStore(admin);

  return {
    token,
    isDevStore: dev,
    initial: {
      fullName: store.fullName || "",
      contactEmail: store.contactEmail || "",
      phone: store.phone || "",
      addressStreet: store.addressStreet || "",
      pinCode: store.pinCode || "",
      state: store.state || "",
      country: store.country || "",
      businessName: store.businessName || "",
      businessType: store.businessType || "",
      website: store.website || "",
      taxId: store.taxId || "",
      businessDetails: store.businessDetails || "",
    },
  };
};

/* ── Action ── */
export const action = async ({ request }) => {
  const formData = await request.formData();
  const shop = verifyOnboardingToken(formData.get("token"));

  if (!shop) {
    return { expired: true };
  }

  const actionType = formData.get("actionType");

  const profile = {
    fullName: String(formData.get("fullName") || "").trim(),
    contactEmail: String(formData.get("contactEmail") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    addressStreet: String(formData.get("addressStreet") || "").trim(),
    pinCode: String(formData.get("pinCode") || "").trim(),
    state: String(formData.get("state") || "").trim(),
    country: String(formData.get("country") || "").trim(),
    businessName: String(formData.get("businessName") || "").trim(),
    businessType: String(formData.get("businessType") || "").trim(),
    website: String(formData.get("website") || "").trim(),
    taxId: String(formData.get("taxId") || "").trim(),
    businessDetails: String(formData.get("businessDetails") || "").trim(),
  };

  await db.store.upsert({
    where: { shop },
    update: profile,
    create: { shop, ...profile },
  });

  const { admin } = await unauthenticated.admin(shop);
  const dev = await isDevStore(admin);

  if (actionType === "advance" && !dev) {
    const returnUrl = buildAdminUrl(shop, "/app?step=complete");
    const { confirmationUrl, subscriptionId } = await createSubscription(admin, shop, returnUrl);

    await db.shopPlan.upsert({
      where: { shop },
      update: { subscriptionId, status: "active" },
      create: { shop, plan: "free", subscriptionId, status: "active" },
    });

    return { confirmationUrl };
  }

  if (dev) {
    await db.shopPlan.upsert({
      where: { shop },
      update: { plan: "advanced", status: "active" },
      create: { shop, plan: "advanced", status: "active" },
    });
  } else {
    await getShopPlan(shop);
  }

  await db.store.update({
    where: { shop },
    data: { onboardingCompleted: true, onboardingCompletedAt: new Date() },
  });

  return { redirectUrl: buildAdminUrl(shop) };
};

/* ── Styles ── */
const C = {
  bg: "#f6f6f8", surface: "#ffffff", border: "#e5e4ec",
  text: "#17171c", muted: "#6b6b78", accent: "#111827",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  background: "#fff",
};

const labelStyle = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 600,
  color: C.muted,
  marginBottom: 6,
};

// Polish that plain inline styles can't do (hover/focus states, the step
// enter animation). Injected once from the wizard root.
const WIZARD_CSS = `
@keyframes trwStepIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes trwPopIn { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: scale(1); } }
.trw-step { animation: trwStepIn 280ms cubic-bezier(.2,.7,.3,1); }
.trw-dot { transition: background-color 280ms ease, border-color 280ms ease, color 280ms ease, box-shadow 280ms ease; }
.trw-dot-check { animation: trwPopIn 220ms cubic-bezier(.3,1.5,.5,1); }
.trw-connector-fill { transition: transform 380ms cubic-bezier(.4,0,.2,1); transform-origin: left; }
.trw-input:hover, .trw-select:hover, .trw-textarea:hover { border-color: #c7c7d1; }
.trw-input:focus, .trw-select:focus, .trw-textarea:focus { border-color: #111827 !important; box-shadow: 0 0 0 3px rgba(17,24,39,.08); }
.trw-btn-primary { transition: opacity 150ms ease, transform 120ms ease, box-shadow 150ms ease; }
.trw-btn-primary:hover:not(:disabled) { opacity: .92; box-shadow: 0 6px 16px rgba(17,24,39,.2); transform: translateY(-1px); }
.trw-btn-primary:active:not(:disabled) { transform: scale(.98); }
.trw-btn-ghost { transition: color 150ms ease, gap 150ms ease; }
.trw-btn-ghost:hover:not(:disabled) { color: #111827; }
`;

// Small inline icons — no icon library needed for a handful of glyphs.
const svgProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
const IconUser = () => <svg {...svgProps}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>;
const IconMail = () => <svg {...svgProps}><rect x="2" y="4" width="20" height="16" rx="2.5" /><path d="m3 6 9 7 9-7" /></svg>;
const IconPhone = () => <svg {...svgProps}><path d="M14.5 17.5c-5.5-1-11-6.5-12-12C2.3 4.4 3 3.3 4 3h3.2c.5 0 .9.3 1 .8l1 3.6c.1.4 0 .9-.4 1.2L7.3 10c1.1 2.3 3 4.2 5.3 5.3l1.4-1.5c.3-.3.8-.4 1.2-.4l3.6 1c.5.1.8.5.8 1V19c-.3 1-1.4 1.7-2.5 1.5-.6-.1-1.2-.2-1.7-.3Z" /></svg>;
const IconMapPin = () => <svg {...svgProps}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>;
const IconHash = () => <svg {...svgProps}><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>;
const IconFlag = () => <svg {...svgProps}><path d="M4 3v18" /><path d="M4 4h13l-2.5 4.5L17 13H4" /></svg>;
const IconBriefcase = () => <svg {...svgProps}><rect x="2" y="7" width="20" height="14" rx="2.5" /><path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" /><line x1="2" y1="13" x2="22" y2="13" /></svg>;
const IconGlobe = () => <svg {...svgProps}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" /></svg>;
const IconReceipt = () => <svg {...svgProps}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="15" y2="12" /></svg>;
const IconChevronRight = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>;
const IconChevronLeft = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>;

function Field({ label, id, icon, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        {icon && (
          <span style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "#9ca3af", display: "flex", pointerEvents: "none",
          }}>{icon}</span>
        )}
        <input id={id} className="trw-input" style={{ ...inputStyle, ...(icon ? { paddingLeft: 36 } : {}) }} {...props} />
      </div>
    </div>
  );
}

const BUSINESS_TYPES = [
  "Fashion & Apparel", "Beauty & Cosmetics", "Electronics", "Home & Garden",
  "Food & Beverage", "Health & Wellness", "Sports & Outdoors", "Jewelry & Accessories", "Other",
];

const STEPS = ["Contact", "Address", "Preview", "Business", "Plan"];

/* ── Page ── */
export default function Onboarding() {
  const data = useLoaderData();

  if (data.expired) {
    return (
      <div style={{
        fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 28,
      }}>
        <div style={{
          background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
          padding: "32px 28px", maxWidth: 420, textAlign: "center",
        }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 8 }}>
            This link has expired
          </div>
          <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>
            Please reopen the app from your Shopify admin to continue setup.
          </p>
        </div>
      </div>
    );
  }

  return <OnboardingWizard {...data} />;
}

function OnboardingWizard({ token, initial, isDevStore: devStore }) {
  const fetcher = useFetcher();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const isSubmitting = fetcher.state !== "idle";

  const destination = fetcher.data?.confirmationUrl || fetcher.data?.redirectUrl;
  if (destination) {
    window.location.href = destination;
  }

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const canNext = () => {
    if (step === 0) return form.fullName.trim() && form.contactEmail.trim() && form.phone.trim();
    if (step === 1) return form.addressStreet.trim() && form.pinCode.trim() && form.state.trim() && form.country.trim();
    if (step === 2) return true; // preview step — informational only
    if (step === 3) return form.businessName.trim() && form.businessType.trim();
    return true;
  };

  const goNext = () => canNext() && setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const submitPlan = (actionType) => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("actionType", actionType);
    fd.append("token", token);
    fetcher.submit(fd, { method: "post" });
  };

  const lastStep = STEPS.length - 1;

  return (
    <div style={{
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      background: C.bg,
      minHeight: "100vh",
      padding: "48px 28px",
    }}>
      <style>{WIZARD_CSS}</style>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#9ca3af",
          marginBottom: 8, textTransform: "uppercase",
        }}>
          Store setup
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 650, color: C.text, margin: "0 0 6px", letterSpacing: "-.01em" }}>
          Let&apos;s get you set up
        </h1>
        <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 30px" }}>
          A few quick details before you reach your dashboard.
        </p>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 32, padding: "0 2px" }}>
          {STEPS.map((label, i) => (
            <Fragment key={label}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div className="trw-dot" style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11.5, fontWeight: 700,
                  background: i < step ? C.accent : "#fff",
                  color: i < step ? "#fff" : i === step ? C.accent : "#a8a8b3",
                  border: i === step ? `2px solid ${C.accent}` : i < step ? `2px solid ${C.accent}` : `1.5px solid ${C.border}`,
                  boxShadow: i === step ? "0 0 0 4px rgba(17,24,39,.09)" : "none",
                }}>
                  {i < step ? <span className="trw-dot-check">✓</span> : i + 1}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 600, marginTop: 6, whiteSpace: "nowrap",
                  color: i <= step ? C.text : "#a8a8b3",
                }}>{label}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, marginTop: 12, background: C.border, overflow: "hidden" }}>
                  <div className="trw-connector-fill" style={{
                    height: "100%", background: C.accent,
                    transform: i < step ? "scaleX(1)" : "scaleX(0)",
                  }} />
                </div>
              )}
            </Fragment>
          ))}
        </div>

        <div style={{
          background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: "30px 26px 28px", boxShadow: "0 2px 10px rgba(15,15,20,.05)",
          overflow: "hidden", position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: "linear-gradient(90deg, #111827, #4b5563)",
          }} />
          <div key={step} className="trw-step">
            {step === 0 && (
              <>
                <Field icon={<IconUser />} id="fullName" label="Full name" value={form.fullName} onChange={update("fullName")} placeholder="Jane Smith" />
                <Field icon={<IconMail />} id="contactEmail" label="Email" type="email" value={form.contactEmail} onChange={update("contactEmail")} placeholder="jane@example.com" />
                <Field icon={<IconPhone />} id="phone" label="Phone number" type="tel" value={form.phone} onChange={update("phone")} placeholder="+1 555 000 0000" />
              </>
            )}

            {step === 1 && (
              <>
                <Field icon={<IconMapPin />} id="addressStreet" label="Street address" value={form.addressStreet} onChange={update("addressStreet")} placeholder="123 Main St" />
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Field icon={<IconHash />} id="pinCode" label="Pin / ZIP code" value={form.pinCode} onChange={update("pinCode")} placeholder="110001" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field id="state" label="State" value={form.state} onChange={update("state")} placeholder="Delhi" />
                  </div>
                </div>
                <Field icon={<IconFlag />} id="country" label="Country" value={form.country} onChange={update("country")} placeholder="India" />
              </>
            )}

            {step === 2 && <WidgetPreviewStep />}

            {step === 3 && (
              <>
                <Field icon={<IconBriefcase />} id="businessName" label="Business name" value={form.businessName} onChange={update("businessName")} placeholder="Acme Co." />

                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="businessType" style={labelStyle}>Business type</label>
                  <select
                    id="businessType"
                    className="trw-select"
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={form.businessType}
                    onChange={update("businessType")}
                  >
                    <option value="" disabled>Select a category</option>
                    {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Field icon={<IconGlobe />} id="website" label="Website (optional)" value={form.website} onChange={update("website")} placeholder="acme.com" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field icon={<IconReceipt />} id="taxId" label="Tax / GST ID (optional)" value={form.taxId} onChange={update("taxId")} placeholder="22AAAAA0000A1Z5" />
                  </div>
                </div>

                <div style={{ marginBottom: 4 }}>
                  <label htmlFor="businessDetails" style={labelStyle}>Business details</label>
                  <textarea
                    id="businessDetails"
                    className="trw-textarea"
                    style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                    value={form.businessDetails}
                    onChange={update("businessDetails")}
                    placeholder="What do you sell? Anything else we should know?"
                  />
                </div>
              </>
            )}

            {step === 4 && (
              <PlanStep
                devStore={devStore}
                isSubmitting={isSubmitting}
                onAdvance={() => submitPlan("advance")}
                onFree={() => submitPlan("free")}
              />
            )}
          </div>

          {step < lastStep && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
              <button
                onClick={goBack}
                disabled={step === 0}
                className="trw-btn-ghost"
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  border: "none", background: "none", cursor: step === 0 ? "default" : "pointer",
                  color: step === 0 ? "#d1d1db" : C.muted, fontSize: 13, fontWeight: 600, padding: "10px 4px",
                }}
              >
                <IconChevronLeft /> Back
              </button>
              <button
                onClick={goNext}
                disabled={!canNext()}
                className="trw-btn-primary"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  border: "none", borderRadius: 9, padding: "11px 26px",
                  background: canNext() ? C.accent : "#d1d5db",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: canNext() ? "pointer" : "default",
                }}
              >
                {step === 2 ? "Got it, continue" : "Continue"} <IconChevronRight />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Preview step: shows that the widget needs no code, right in Customize ── */
function WidgetPreviewStep() {
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
        boxShadow: "0 4px 16px rgba(15,15,20,.05)",
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
function PlanStep({ devStore, isSubmitting, onAdvance, onFree }) {
  return (
    <div>
      {devStore && (
        <div style={{
          background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 10,
          padding: "12px 18px", marginBottom: 18, fontSize: 13,
          color: "#1e40af", fontWeight: 600,
        }}>
          Development store detected — Advanced plan is free for development and testing.
        </div>
      )}

      {/* Advanced — the only plan offered here */}
      <div style={{
        borderRadius: 14,
        border: `2px solid ${C.accent}`,
        padding: "22px 22px 20px",
        position: "relative",
        boxShadow: "0 6px 20px rgba(17,24,39,.08)",
      }}>
        <span style={{
          position: "absolute", top: -11, left: 18,
          background: C.accent, color: "#fff",
          fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 12px",
          letterSpacing: ".04em",
        }}>5-DAY FREE TRIAL</span>

        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 2 }}>Advanced</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginBottom: 10 }}>
          <span style={{ fontSize: 30, fontWeight: 600, color: C.text }}>
            {devStore ? "Free" : "$0"}
          </span>
          {!devStore && (
            <span style={{ fontSize: 16, fontWeight: 500, color: "#9ca3af", textDecoration: "line-through" }}>
              $9.99
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>today</span>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            "All core review widgets",
            "Review Wall, Homepage Reviews (5 layouts)",
            "Questions & Answers widget",
            "Product Grouping — combine variants & duplicates",
            "Custom CSS/JS code injection",
            "PageFly & GemPages support",
            "Google Reviews — Business Profile sync",
            "Custom Template Builder — 20+ blocks",
            "All integrations — Klaviyo, Mailchimp, etc.",
            "Review-Reward Coupon thank-you discount",
            "Priority customer support",
            "Automatic updates & priority performance",
            "CSV import/export, bulk moderation actions",
            "15-language storefront",
            "SEO Schema & Tags",
          ].map((f) => (
            <li key={f} style={{ fontSize: 13, color: "#374151", display: "flex", gap: 7 }}>
              <span style={{ color: C.accent, fontWeight: 600 }}>✓</span>{f}
            </li>
          ))}
        </ul>

        <button
          onClick={onAdvance}
          disabled={isSubmitting}
          className="trw-btn-primary"
          style={{
            width: "100%", border: "none", borderRadius: 9, padding: "12px 0",
            background: C.accent, color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: isSubmitting ? "wait" : "pointer", opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? "Please wait…" : devStore ? "Continue with Advanced" : "Continue with $0 today"}
        </button>
        {!devStore && (
          <div style={{ textAlign: "center", fontSize: 11.5, color: C.muted, marginTop: 8 }}>
            5-day free trial, then $9.99/mo. Cancel anytime.
          </div>
        )}
      </div>

      {/* Free — present, but deliberately understated so Advanced stands out */}
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button
          onClick={onFree}
          disabled={isSubmitting}
          className="trw-btn-ghost"
          style={{
            border: "none", background: "none", cursor: isSubmitting ? "wait" : "pointer",
            color: "#b3b3bd", fontSize: 12, fontWeight: 500, padding: "6px 4px",
            textDecoration: "underline", textUnderlineOffset: 3,
          }}
        >
          Continue with Free plan instead
        </button>
      </div>
    </div>
  );
}
