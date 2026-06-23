// app/billing.server.js

import db from "./db.server";

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    currencyCode: "USD",
  },
  advanced: {
    name: "Advanced",
    price: 9.99,
    currencyCode: "USD",
    trialDays: 5,
  },
};

/** Check if the shop is a development store — dev stores skip billing */
export async function isDevStore(admin) {
  try {
    const response = await admin.graphql(
      `{ shop { plan { partnerDevelopment } } }`,
    );
    const data = await response.json();
    return data?.data?.shop?.plan?.partnerDevelopment === true;
  } catch {
    return false;
  }
}

/** Get or create ShopPlan row */
export async function getShopPlan(shop) {
  return db.shopPlan.upsert({
    where: { shop },
    update: {},
    create: { shop, plan: "free", status: "active" },
  });
}

/** Create Shopify AppSubscription and return confirmationUrl */
export async function createSubscription(admin, shop, returnUrl) {
  const response = await admin.graphql(
    `#graphql
    mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean,$trialDays: Int) {
      appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, test: $test,trialDays: $trialDays) {
        appSubscription {
          id
          status
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        name: PLANS.advanced.name,
        returnUrl,
        test: process.env.NODE_ENV !== "production",
        trialDays: 5,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: {
                  amount: PLANS.advanced.price,
                  currencyCode: PLANS.advanced.currencyCode,
                },
                interval: "EVERY_30_DAYS",
              },
            },
          },
        ],
      },
    },
  );

  const data = await response.json();
  const result = data?.data?.appSubscriptionCreate;

  if (result?.userErrors?.length) {
    throw new Error(result.userErrors[0].message);
  }

  return {
    confirmationUrl: result.confirmationUrl,
    subscriptionId: result.appSubscription.id,
  };
}

/** Cancel active Shopify subscription */
export async function cancelSubscription(admin, subscriptionId) {
  const response = await admin.graphql(
    `#graphql
    mutation AppSubscriptionCancel($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription { id status }
        userErrors { field message }
      }
    }`,
    { variables: { id: subscriptionId } },
  );
  const data = await response.json();
  return data?.data?.appSubscriptionCancel?.appSubscription;
}

/** Sync subscription status from Shopify into DB */
export async function syncSubscriptionStatus(admin, shop) {
  // Dev stores always get advanced for free
  const dev = await isDevStore(admin);
  if (dev) {
    await db.shopPlan.upsert({
      where: { shop },
      update: { plan: "advanced", status: "active" },
      create: { shop, plan: "advanced", status: "active" },
    });
    return "advanced";
  }

  const response = await admin.graphql(
    `{ appInstallation { activeSubscriptions { id status } } }`,
  );
  const data = await response.json();
  const subs = data?.data?.appInstallation?.activeSubscriptions ?? [];

  if (subs.length === 0) {
    await db.shopPlan.upsert({
      where: { shop },
      update: { plan: "free", subscriptionId: null, status: "active" },
      create: { shop, plan: "free", status: "active" },
    });
    return "free";
  }

  const sub = subs[0];
  await db.shopPlan.upsert({
    where: { shop },
    update: {
      plan: "advanced",
      subscriptionId: sub.id,
      status: sub.status === "ACTIVE" ? "active" : "cancelled",
      billingStartedAt: new Date(),
    },
    create: {
      shop,
      plan: "advanced",
      subscriptionId: sub.id,
      status: "active",
      billingStartedAt: new Date(),
    },
  });

  return "advanced";
}
