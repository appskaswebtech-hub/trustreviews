// app/routes/app.onboarding-embed.jsx
//
// Action-only resource route for the embedded onboarding popup (see
// app/components/EmbeddedOnboardingModal.jsx). Mirrors routes/onboarding.jsx's
// action logic, but authenticates via the normal embedded session
// (authenticate.admin) instead of a signed token, since this is posted to
// from inside the Shopify admin iframe where a real session is available.

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { createSubscription, isDevStore, getShopPlan } from "../billing.server";

function buildAdminUrl(shop, suffix = "/app") {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const storeName = shop.replace(".myshopify.com", "");
  return `https://admin.shopify.com/store/${storeName}/apps/${apiKey}${suffix}`;
}

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  // The popup's ✕ button — remember it so app.jsx stops showing the popup on
  // later opens (Free plan applies either way; this just stops the nag).
  if (actionType === "dismissPopup") {
    await db.store.upsert({
      where: { shop },
      update: { onboardingPopupDismissed: true },
      create: { shop, onboardingPopupDismissed: true },
    });
    return { ok: true };
  }

  // Lightweight progress save fired after each step/sub-step — see
  // EmbeddedOnboardingModal's advance().
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

  return { done: true };
};
