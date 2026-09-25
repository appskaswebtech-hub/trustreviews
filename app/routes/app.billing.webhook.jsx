// app/routes/app.billing.webhook.jsx
// Register this in your shopify.app.toml:
// [[webhooks.subscriptions]]
// topics = ["app_subscriptions/update"]
// uri = "/app/billing/webhook"

import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic === "APP_SUBSCRIPTIONS_UPDATE") {
    const sub = payload?.app_subscription;
    if (!sub) return new Response("ok", { status: 200 });

    const status = sub.status?.toLowerCase(); // active | cancelled | expired | declined
    const subscriptionId = sub.admin_graphql_api_id;

    if (status === "active") {
      await db.shopPlan.upsert({
        where: { shop },
        update: { plan: "advanced", subscriptionId, status: "active", billingStartedAt: new Date() },
        create: { shop, plan: "advanced", subscriptionId, status: "active", billingStartedAt: new Date() },
      });
    } else {
      await db.shopPlan.upsert({
        where: { shop },
        update: { plan: "free", subscriptionId: null, status: status === "cancelled" ? "cancelled" : "expired" },
        create: { shop, plan: "free", status: "active" },
      });
    }
  }

  return new Response("ok", { status: 200 });
};
