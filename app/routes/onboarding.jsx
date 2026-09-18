// app/routes/onboarding.jsx
//
// Standalone onboarding page — deliberately NOT nested under app.jsx, so it
// renders as a plain page on our own domain instead of inside the Shopify
// admin iframe. This is shown exactly ONCE per shop, right after install —
// app.jsx's loader bounces a shop here the first time (see
// Store.onboardingStandaloneShown, set below the moment this page loads).
// Every visit after that, if onboarding still isn't finished, app.jsx shows
// a dismissible popup INSIDE the embedded app instead (see
// app/components/EmbeddedOnboardingModal.jsx) — this page is never revisited
// by app.jsx once shown, though a still-valid link can still be opened
// directly, which is why the resume/auto-finalize logic below stays in place.
//
// Because it's outside the iframe, it can't use authenticate.admin() (that
// requires an embedded session token) — it resolves the shop from the token
// app.jsx hands out (see utils/onboarding-token.server.js) and talks to the
// Admin API via unauthenticated.admin(shop) instead.

import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { redirect } from "react-router";
import db from "../db.server";
import { unauthenticated } from "../shopify.server";
import { createSubscription, isDevStore, getShopPlan } from "../billing.server";
import { verifyOnboardingToken } from "../utils/onboarding-token.server";
import { C, STEPS, flatStepFor, OnboardingCard } from "../components/onboardingWizardUI";

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

  // Reaching this page at all counts as "the one-time standalone redirect" —
  // app.jsx checks this flag to never send this shop here again, showing the
  // embedded popup instead from now on.
  const store = await db.store.upsert({
    where: { shop },
    update: { onboardingStandaloneShown: true },
    create: { shop, onboardingStandaloneShown: true },
  });

  if (store.onboardingCompleted) {
    throw redirect(buildAdminUrl(shop));
  }

  const { admin } = await unauthenticated.admin(shop);
  const dev = await isDevStore(admin);

  // They reached the Plan step in an earlier visit but never explicitly
  // chose Advanced or Free, and are opening a still-valid onboarding link
  // again — same as app.jsx's fallback: silently finalize as Free (Advanced
  // for dev stores) instead of forcing the Plan step on them again.
  if ((store.onboardingStep || 0) >= 3) {
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
    throw redirect(buildAdminUrl(shop));
  }

  return {
    token,
    isDevStore: dev,
    initialStep: store.onboardingStep || 0,
    initial: {
      businessType: store.businessType || "",
      isDropshipper: store.isDropshipper || "",
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

  // Lightweight progress save fired after each step/sub-step — lets a
  // merchant who closes the tab mid-wizard resume exactly where they left
  // off instead of doing a full Admin API round trip on every click.
  if (actionType === "saveProgress") {
    const data = {};
    if (formData.has("businessType")) data.businessType = String(formData.get("businessType") || "").trim();
    if (formData.has("isDropshipper")) data.isDropshipper = String(formData.get("isDropshipper") || "").trim();
    if (formData.has("onboardingStep")) data.onboardingStep = Number(formData.get("onboardingStep")) || 0;

    await db.store.upsert({
      where: { shop },
      update: data,
      create: { shop, ...data },
    });
    return { ok: true };
  }

  const profile = {
    businessType: String(formData.get("businessType") || "").trim(),
    isDropshipper: String(formData.get("isDropshipper") || "").trim(),
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

// The saveProgress fetcher (fired on every Continue/Skip, see
// OnboardingWizard's advance()) persists progress in the background — it
// must NOT trigger this loader to revalidate. Otherwise the loader's
// "already reached the Plan step in an earlier visit — auto-finalize"
// fallback fires immediately mid-wizard, silently completing onboarding the
// instant the merchant reaches the Plan step, before they've had a chance
// to choose a plan.
export function shouldRevalidate({ formData, defaultShouldRevalidate }) {
  if (formData?.get("actionType") === "saveProgress") return false;
  return defaultShouldRevalidate;
}

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

function OnboardingWizard({ token, initial, initialStep, isDevStore: devStore }) {
  const fetcher = useFetcher();
  const progressFetcher = useFetcher();
  const [step, setStep] = useState(initialStep >= 2 ? initialStep - 1 : 0);
  // The Business step has a second question ("Are you a dropshipper?") that
  // reveals only after the business-type question is answered — it's a
  // sub-step within step 0, not a new entry in STEPS/the step indicator.
  const [businessSubStep, setBusinessSubStep] = useState(initialStep === 1 ? 1 : 0);
  const [form, setForm] = useState(initial);
  const isSubmitting = fetcher.state !== "idle";

  const destination = fetcher.data?.confirmationUrl || fetcher.data?.redirectUrl;
  if (destination) {
    window.location.href = destination;
  }

  const canNext = () => {
    if (step === 0) {
      return businessSubStep === 0 ? form.businessType.trim() : form.isDropshipper.trim();
    }
    if (step === 1) return true; // widgets step — informational only
    return true;
  };

  const saveProgress = (flatStep, extra = {}) => {
    const fd = new FormData();
    fd.append("actionType", "saveProgress");
    fd.append("token", token);
    fd.append("onboardingStep", String(flatStep));
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    progressFetcher.submit(fd, { method: "post" });
  };

  // Shared by both Continue (after validation) and Skip (no validation) —
  // moves to the next question/step and persists progress as it goes.
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
    fd.append("token", token);
    fetcher.submit(fd, { method: "post" });
  };

  return (
    <div style={{
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      background: `
        radial-gradient(560px circle at 12% -8%, rgba(76,111,255,.10), transparent 60%),
        radial-gradient(520px circle at 108% 18%, rgba(5,150,105,.08), transparent 60%),
        ${C.bg}
      `,
      minHeight: "100vh",
      padding: "48px 28px",
    }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
          <span style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: "linear-gradient(135deg, #111827, #4b5563)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
          }}>✨</span>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#9ca3af",
            textTransform: "uppercase",
          }}>
            Store setup
          </div>
        </div>
        <h1 style={{ fontSize: 27, fontWeight: 700, color: C.text, margin: "0 0 6px", letterSpacing: "-.01em" }}>
          Let&apos;s get you set up
        </h1>
        <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 30px" }}>
          A few quick details before you reach your dashboard.
        </p>

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
