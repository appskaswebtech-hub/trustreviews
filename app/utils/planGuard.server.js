// app/utils/planGuard.server.js
import { getShopPlan } from "../billing.server";
import { redirect } from "react-router";

export async function requireAdvancedPlan(shop) {
  const shopPlan = await getShopPlan(shop);
  if (shopPlan.plan !== "advanced") {
    throw redirect("/app/billing");
  }
  return shopPlan;
}
