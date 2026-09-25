// app/utils/planGuard.server.js
import { getShopPlan, isAdvancedOrHigher } from "../billing.server";
import { redirect } from "react-router";
import db from "../db.server";

export async function requireAdvancedPlan(shop) {
  const shopPlan = await getShopPlan(shop);
  if (shopPlan.plan !== "advanced") {
    throw redirect("/app/billing");
  }
  return shopPlan;
}

// Whether a shop can use Advanced-only features (Product Grouping,
// Integrations, Custom CSS/JS injection): either it's actually on the
// Advanced plan, or it's grandfathered in via Store.legacyAccess — set true
// for every store that was already live before this gating shipped, so
// existing merchants don't lose access to something they were already using.
export async function hasAdvancedAccess(shop) {
  const [store, shopPlan] = await Promise.all([
    db.store.findUnique({ where: { shop }, select: { legacyAccess: true } }),
    getShopPlan(shop),
  ]);
  return Boolean(store?.legacyAccess) || isAdvancedOrHigher(shopPlan);
}
