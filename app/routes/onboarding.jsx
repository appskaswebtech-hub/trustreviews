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

    // Not "active" yet — the merchant hasn't approved the charge on
    // Shopify's confirmation screen. isAdvancedOrHigher() requires
    // status === "active", so recording it as "pending" here keeps them
    // gated on Free until app.jsx's step=complete handler calls
    // syncSubscriptionStatus and confirms the real state from Shopify.
    await db.shopPlan.upsert({
      where: { shop },
      update: { subscriptionId, status: "pending" },
      create: { shop, plan: "free", subscriptionId, status: "pending" },
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

// None of the wizard's own submissions should trigger this loader to
// revalidate:
//  - saveProgress (fired on every Continue/Skip) persists onboardingStep in
//    the background — a revalidation here would hit the loader's "already
//    reached the Plan step in an earlier visit — auto-finalize" fallback the
//    instant the merchant reaches the Plan step, before they've chosen a
//    plan.
//  - advance/free (the Plan step's buttons) hit that exact same fallback for
//    a different reason: saveProgress already set onboardingStep to 3 the
//    moment the Plan step was reached, so by the time advance/free's action
//    resolves, a revalidation sees onboardingStep >= 3 and redirects home as
//    Free — racing the confirmationUrl/redirectUrl navigation the component
//    is about to perform itself and winning, so Advance silently lands back
//    on the Free plan instead of Shopify's billing page.
export function shouldRevalidate({ formData, defaultShouldRevalidate }) {
  const actionType = formData?.get("actionType");
  if (actionType === "saveProgress" || actionType === "advance" || actionType === "free") return false;
  return defaultShouldRevalidate;
}

/* ── Page ── */
export default function Onboarding() {
  const data = useLoaderData();

  if (data.expired) {
    return (
      <div className="onboarding-expired-page" style={{
        fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 28,
      }}>
        <div className="onboarding-expired-card" style={{
          background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
          padding: "32px 28px", maxWidth: 420, textAlign: "center",
        }}>
          <div className="onboarding-expired-title" style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 8 }}>
            This link has expired
          </div>
          <p className="onboarding-expired-description" style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>
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
    // <div className="onboarding-page" style={{
    //   fontFamily: "'DM Sans','Segoe UI',sans-serif",
    //   background: `
    //     radial-gradient(560px circle at 12% -8%, rgba(76,111,255,.10), transparent 60%),
    //     radial-gradient(520px circle at 108% 18%, rgba(5,150,105,.08), transparent 60%),
    //     ${C.bg}
    //   `,
    //   minHeight: "100vh",
    //   padding: "48px 28px",
    // }}>
    //   <div className="onboarding-container" style={{ maxWidth: 560, margin: "0 auto" }}>
    //     <div className="onboarding-brand" style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
    //       <span className="onboarding-brand-icon" style={{
    //         width: 26, height: 26, borderRadius: 7, flexShrink: 0,
    //         background: "linear-gradient(135deg, #111827, #4b5563)",
    //         display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
    //       }}>✨</span>
    //       <div className="onboarding-brand-label" style={{
    //         fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#9ca3af",
    //         textTransform: "uppercase",
    //       }}>
    //         Store setup
    //       </div>
    //     </div>
    //     <h1 className="onboarding-title" style={{ fontSize: 27, fontWeight: 700, color: C.text, margin: "0 0 6px", letterSpacing: "-.01em" }}>
    //       Let&apos;s get you set up
    //     </h1>
    //     <p className="onboarding-description" style={{ fontSize: 13.5, color: C.muted, margin: "0 0 30px" }}>
    //       A few quick details before you reach your dashboard.
    //     </p>

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
  className="onboarding-page"
  style={{
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
    minHeight: "100vh",
    padding: "54px 28px",
    position: "relative",
    overflow: "hidden",

    background: `
      radial-gradient(
        720px circle at 6% 0%,
        rgba(141,180,214,0.26),
        transparent 58%
      ),
      radial-gradient(
        680px circle at 100% 20%,
        rgba(214,230,242,0.60),
        transparent 60%
      ),
      linear-gradient(
        180deg,
        #F2F7FB 0%,
        #FFFFFF 52%,
        #F2F7FB 100%
      )
    `,
  }}
>
  {/* Decorative left glow */}
  <div
    style={{
      position: "absolute",
      width: 360,
      height: 360,
      borderRadius: "50%",
      background: "rgba(141,180,214,.13)",
      filter: "blur(30px)",
      top: -170,
      left: -150,
      pointerEvents: "none",
    }}
   className="tr-app-routes-onboarding-div-1"/>

  {/* Decorative right glow */}
  <div
    style={{
      position: "absolute",
      width: 320,
      height: 320,
      borderRadius: "50%",
      background: "rgba(214,230,242,.42)",
      filter: "blur(35px)",
      right: -130,
      top: 120,
      pointerEvents: "none",
    }}
   className="tr-app-routes-onboarding-div-2"/>

  <div
    className="onboarding-container"
    style={{
      maxWidth: 880,
      margin: "0 auto",
      position: "relative",
      zIndex: 2,
    }}
  >
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 30,

        background: `
          linear-gradient(
            145deg,
            rgba(255,255,255,.98),
            rgba(242,247,251,.94)
          )
        `,

        border: "1px solid rgba(141,180,214,.28)",

        boxShadow: `
          0 34px 90px rgba(97,139,174,.15),
          0 12px 36px rgba(141,180,214,.10),
          inset 0 1px 0 rgba(255,255,255,.95)
        `,

        padding: "44px 46px 48px",
      }}
     className="tr-app-routes-onboarding-div-3">
      {/* top soft blue accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "18%",
          width: "64%",
          height: 3,
          borderRadius: "0 0 10px 10px",
          background:
            "linear-gradient(90deg, transparent, #8DB4D6, transparent)",
          opacity: 0.8,
        }}
       className="tr-app-routes-onboarding-div-4"/>

      {/* small decorative star */}
      <div
        style={{
          position: "absolute",
          top: 26,
          right: 34,
          width: 88,
          height: 88,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(214,230,242,.65), rgba(214,230,242,0))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8DB4D6",
          fontSize: 24,
          pointerEvents: "none",
        }}
       className="tr-app-routes-onboarding-div-5">
        ★
      </div>

      {/* Brand row */}
      <div
        className="onboarding-brand"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
         className="tr-app-routes-onboarding-div-6">
          <span
            className="onboarding-brand-icon"
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              flexShrink: 0,

              background:
                "linear-gradient(135deg, #8DB4D6 0%, #D6E6F2 100%)",

              border: "1px solid rgba(255,255,255,.95)",

              boxShadow: `
                0 10px 24px rgba(141,180,214,.30),
                inset 0 1px 0 rgba(255,255,255,.9)
              `,

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              color: "#FFFFFF",
              fontSize: 21,
            }}
          >
            ★
          </span>

          <div className="tr-app-routes-onboarding-div-7">
            <div
              className="onboarding-brand-label"
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".12em",
                color: "#8DB4D6",
                textTransform: "uppercase",
              }}
            >
              Store setup
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#8FA8BB",
                marginTop: 2,
              }}
             className="tr-app-routes-onboarding-div-8">
              Trust Reviews
            </div>
          </div>
        </div>

        {/* review badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 13px",
            borderRadius: 999,
            background: "#FFFFFF",
            border: "1px solid #D6E6F2",
            boxShadow: "0 6px 18px rgba(141,180,214,.10)",
          }}
         className="tr-app-routes-onboarding-div-9">
          <div
            style={{
              display: "flex",
              gap: 2,
              color: "#8DB4D6",
              fontSize: 12,
            }}
           className="tr-app-routes-onboarding-div-10">
            ★★★★★
          </div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#6F8FA9",
              whiteSpace: "nowrap",
            }}
           className="tr-app-routes-onboarding-span-11">
            Build customer trust
          </span>
        </div>
      </div>

      {/* Heading area */}
      <div
        style={{
          maxWidth: 600,
          marginBottom: 30,
          position: "relative",
          zIndex: 2,
        }}
       className="tr-app-routes-onboarding-div-12">
        <h1
          className="onboarding-title"
          style={{
            fontSize: 36,
            lineHeight: 1.13,
            fontWeight: 750,

            // darker tone of same blue palette
            color: "#4F7392",

            margin: "0 0 11px",
            letterSpacing: "-.03em",
          }}
        >
          Let&apos;s get you set up
        </h1>

        <p
          className="onboarding-description"
          style={{
            fontSize: 14.5,
            lineHeight: 1.7,
            color: "#839CB0",
            margin: 0,
            maxWidth: 540,
          }}
        >
          A few quick details before you reach your dashboard.
        </p>
      </div>

      {/* review-focused mini information bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,

          padding: "14px 18px",
          marginBottom: 28,

          background:
            "linear-gradient(90deg, rgba(242,247,251,.95), rgba(214,230,242,.38))",

          border: "1px solid rgba(214,230,242,.95)",
          borderRadius: 16,
        }}
       className="tr-app-routes-onboarding-div-13">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
          }}
         className="tr-app-routes-onboarding-div-14">
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "#FFFFFF",
              border: "1px solid #D6E6F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8DB4D6",
              fontSize: 16,
              boxShadow: "0 4px 12px rgba(141,180,214,.10)",
            }}
           className="tr-app-routes-onboarding-div-15">
            ★
          </div>

          <div className="tr-app-routes-onboarding-div-16">
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "#5F7F9A",
                marginBottom: 2,
              }}
             className="tr-app-routes-onboarding-div-17">
              Get ready to collect trusted reviews
            </div>

            <div
              style={{
                fontSize: 11.5,
                color: "#91A9BB",
              }}
             className="tr-app-routes-onboarding-div-18">
              Complete setup and start building social proof.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            color: "#8DB4D6",
            whiteSpace: "nowrap",
          }}
         className="tr-app-routes-onboarding-div-19">
          ★ ★ ★ ★ ★
        </div>
      </div>

      {/* separator */}
      <div
        style={{
          width: "100%",
          height: 1,
          marginBottom: 28,
          background:
            "linear-gradient(90deg, transparent, #D6E6F2 18%, #D6E6F2 82%, transparent)",
        }}
       className="tr-app-routes-onboarding-div-20"/>

      {/* Main onboarding form card */}
      <div
        style={{
          background: "#FFFFFF",

          border: "1px solid rgba(214,230,242,.95)",
          borderRadius: 22,

          padding: "30px",

          boxShadow: `
            0 18px 45px rgba(141,180,214,.10),
            inset 0 1px 0 rgba(255,255,255,.9)
          `,

          position: "relative",
        }}
       className="tr-app-routes-onboarding-div-21">
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

      {/* bottom trust message */}
      <div
        style={{
          marginTop: 18,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,

          fontSize: 11.5,
          color: "#9AAFC0",
        }}
       className="tr-app-routes-onboarding-div-22">
        <span
          style={{
            color: "#8DB4D6",
            fontSize: 13,
          }}
         className="tr-app-routes-onboarding-span-23">
          ✓
        </span>

        Designed to help your store build trust through authentic reviews
      </div>
    </div>
  </div>
</div>
  );
}
