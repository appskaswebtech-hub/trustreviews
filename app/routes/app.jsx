import { useEffect } from "react";
import { Link, Outlet, useLoaderData, useRouteError, redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";

import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { syncSubscriptionStatus, isDevStore, getShopPlan } from "../billing.server";
import { signOnboardingToken } from "../utils/onboarding-token.server";
import { hasAdvancedAccess } from "../utils/planGuard.server";
import EmbeddedOnboardingModal from "../components/EmbeddedOnboardingModal";
import FreePlanUpsellModal from "../components/FreePlanUpsellModal";
import "@shopify/polaris/build/esm/styles.css";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);

  // Coming back from the Shopify subscription-approval screen after the
  // onboarding wizard (on our own domain, outside the iframe) started a
  // charge — finish the job now that we're back in the embedded app.
  if (url.searchParams.get("step") === "complete") {
    await syncSubscriptionStatus(admin, session.shop);
    await prisma.store.upsert({
      where: { shop: session.shop },
      update: { onboardingCompleted: true, onboardingCompletedAt: new Date() },
      create: { shop: session.shop, onboardingCompleted: true, onboardingCompletedAt: new Date() },
    });

    // Drop only the one-time step/charge params — keep shop/host/embedded so
    // this redirect stays a normal in-iframe navigation instead of dropping
    // the context the embedded app needs (same class of bug as before).
    const cleanParams = new URLSearchParams(url.search);
    cleanParams.delete("step");
    cleanParams.delete("charge_id");
    const cleanSearch = cleanParams.toString();
    throw redirect(`/app${cleanSearch ? `?${cleanSearch}` : ""}`);
  }

  const store = await prisma.store.findUnique({
    where: { shop: session.shop },
    select: {
      language: true, onboardingCompleted: true, onboardingStep: true,
      onboardingStandaloneShown: true, businessType: true, isDropshipper: true,
      freeUpsellShown: true, onboardingPopupDismissed: true,
    },
  });

  let onboardingCompleted = store?.onboardingCompleted ?? false;
  let devStore = false;

  if (!onboardingCompleted) {
    devStore = await isDevStore(admin);

    // They reached the Plan step (onboardingStep 3) in an earlier visit but
    // never explicitly chose Advanced or Free, then left. Don't keep showing
    // onboarding forever — silently finalize as Free (Advanced for dev
    // stores, same as an explicit "Continue with Free" would do) and let
    // them straight into the dashboard with no popup at all.
    if ((store?.onboardingStep ?? 0) >= 3) {
      if (devStore) {
        await prisma.shopPlan.upsert({
          where: { shop: session.shop },
          update: { plan: "advanced", status: "active" },
          create: { shop: session.shop, plan: "advanced", status: "active" },
        });
      } else {
        await getShopPlan(session.shop);
      }
      await prisma.store.update({
        where: { shop: session.shop },
        data: { onboardingCompleted: true, onboardingCompletedAt: new Date() },
      });
      onboardingCompleted = true;
    }
  }

  // Not onboarded yet. The very first time (never shown the standalone page
  // before), send the merchant there — on our own domain, outside the
  // Shopify admin iframe. A plain `?shop=` param can't be trusted there
  // (anyone could tamper with it), so we hand over a short-lived signed
  // token instead. Every visit after that, show a dismissible popup INSIDE
  // the embedded app instead — the rest of the app (nav, dashboard, every
  // route) stays fully accessible either way; dismissing the popup just
  // means Free plan applies, same as never opening it.
  let onboardingUrl = null;
  let onboardingModalData = null;
  if (!onboardingCompleted) {
    if (!store?.onboardingStandaloneShown) {
      const appUrl = (process.env.SHOPIFY_APP_URL || "").replace(/\/$/, "");
      const token = signOnboardingToken(session.shop);
      onboardingUrl = `${appUrl}/onboarding?token=${encodeURIComponent(token)}`;
    } else if (!store?.onboardingPopupDismissed) {
      onboardingModalData = {
        isDevStore: devStore,
        initialStep: store.onboardingStep || 0,
        initial: {
          businessType: store.businessType || "",
          isDropshipper: store.isDropshipper || "",
        },
      };
    }
  }

  // Separate, independent condition from the onboarding flow above: once
  // onboarding is actually done and the shop is on the Free plan (never
  // upgraded — not even a grandfathered legacy store), show a one-time
  // "try Advanced" nudge on their next app open. Fires at most once ever,
  // tracked by its own flag so it never re-shows after being dismissed.
  let showFreeUpsell = false;
  if (onboardingCompleted && !store?.freeUpsellShown) {
    const isPro = await hasAdvancedAccess(session.shop);
    if (!isPro) {
      await prisma.store.update({
        where: { shop: session.shop },
        data: { freeUpsellShown: true },
      });
      showFreeUpsell = true;
    }
  }

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    lang: store?.language || "en",
    onboardingUrl,
    onboardingModalData,
    showFreeUpsell,
  };
};

export default function App() {
  const { apiKey, onboardingUrl, onboardingModalData, showFreeUpsell } = useLoaderData();

  // AppProvider stays mounted regardless — it's what loads the App Bridge
  // script, and App Bridge is *required* to break out of the Shopify admin
  // iframe without a click (see OnboardingBounce below, and
  // EmbeddedOnboardingModal's confirmationUrl handling). Skipping it, like
  // an earlier version of this did, is why the auto-redirect threw
  // SecurityError: there was no App Bridge on the page to hand the
  // navigation off to.
  //
  // Only the very first-ever visit (onboardingUrl set) blocks the rest of
  // the app — every visit after that, the normal app renders regardless of
  // onboarding status, with the popup (if any) layered on top instead of
  // gating anything.
  return (
    <AppProvider embedded apiKey={apiKey}>
      {onboardingUrl ? (
        <OnboardingBounce url={onboardingUrl} />
      ) : (
        <PolarisProvider i18n={enTranslations}>
          <NavMenu>
            <Link to="/app" rel="home">
              Home
            </Link>

            <Link to="/app/widgets">
              Widgets
            </Link>

            <Link to="/app/widget-settings">
              Settings
            </Link>

            <Link to="/app/review-groups">
              Product Groups
            </Link>

            <Link to="/app/review-coupon">
              Review Coupon
            </Link>

            {/* <Link to="/app/customize">
              Customize
            </Link> */}

            <Link to="/app/integrations">
              Integrations
            </Link>

            <Link to="/app/custom-code">
              Custom Code
            </Link>

            <Link to="/app/billing">
              Billing
            </Link>
          </NavMenu>

          <Outlet />

          {onboardingModalData && <EmbeddedOnboardingModal {...onboardingModalData} />}
          {!onboardingModalData && showFreeUpsell && <FreePlanUpsellModal />}
        </PolarisProvider>
      )}
    </AppProvider>
  );
}

// Breaks out of the Shopify admin iframe to the standalone onboarding page,
// with no click needed — the same technique Shopify's own library uses for
// its OAuth exit-iframe redirect (see @shopify/shopify-app-react-router's
// renderAppBridge helper): once App Bridge has loaded, `window.open(url,
// "_top")` is allowed to navigate the top-level tab; a raw
// `window.top.location.href` write is not.
function OnboardingBounce({ url }) {
  useEffect(() => {
    window.open(url, "_top");
  }, [url]);

  return (
    <div style={{
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f6f6f8", padding: 28,
    }}>
      <div style={{
        background: "#fff", border: "1px solid #e5e4ec", borderRadius: 14,
        padding: "32px 28px", maxWidth: 380, textAlign: "center",
      }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: "#17171c", marginBottom: 8 }}>
          Let&apos;s get you set up
        </div>
        <p style={{ fontSize: 13.5, color: "#6b6b78", lineHeight: 1.6, marginBottom: 20 }}>
          Redirecting you to a quick setup step…
        </p>
        <a
          href={url}
          target="_top"
          rel="noopener noreferrer"
          style={{
            display: "inline-block", border: "none", borderRadius: 9, padding: "11px 26px",
            background: "#111827", color: "#fff", fontSize: 13.5, fontWeight: 600,
            textDecoration: "none", cursor: "pointer",
          }}
        >
          Continue →
        </a>
      </div>
    </div>
  );
}

// The embedded onboarding popup's progress-save fetcher posts to
// /app/onboarding-embed in the background after every Continue/Skip (see
// EmbeddedOnboardingModal's advance()) — it must NOT trigger this loader to
// revalidate, or the "already reached the Plan step in an earlier visit —
// auto-finalize" fallback fires immediately mid-wizard, silently completing
// onboarding (with whatever plan a dev store defaults to) the instant the
// merchant reaches the Plan step, before they've had a chance to choose.
export function shouldRevalidate({ formAction, formData, defaultShouldRevalidate }) {
  if (formAction === "/app/onboarding-embed" && formData?.get("actionType") === "saveProgress") {
    return false;
  }
  return defaultShouldRevalidate;
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};