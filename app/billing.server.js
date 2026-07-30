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
  googlePro: {
    name: "Google Reviews Pro",
    price: 19.99,
    currencyCode: "USD",
    trialDays: 5,
  },
};

/** Advanced-tier or higher — everything Google Reviews Pro includes Advanced too. */
export function isAdvancedOrHigher(shopPlan) {
  if (shopPlan?.status !== "active") return false;
  return shopPlan?.plan === "advanced" || shopPlan?.plan === "googlePro";
}

/** Google-specific features (Google Reviews widget, Merchant Center sync) — Google Reviews Pro only. */
export function isGooglePro(shopPlan) {
  return shopPlan?.status === "active" && shopPlan?.plan === "googlePro";
}

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

/** Create a Shopify AppSubscription for the given plan key and return confirmationUrl */
async function createSubscriptionFor(admin, planKey, returnUrl) {
  const planDef = PLANS[planKey];
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
        name: planDef.name,
        returnUrl,
        test: process.env.NODE_ENV !== "production",
        trialDays: planDef.trialDays || 5,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: {
                  amount: planDef.price,
                  currencyCode: planDef.currencyCode,
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

/** Create the Advanced ($9.99) subscription */
export async function createSubscription(admin, shop, returnUrl) {
  return createSubscriptionFor(admin, "advanced", returnUrl);
}

/** Create the Google Reviews Pro ($19.99) subscription */
export async function createGoogleProSubscription(admin, shop, returnUrl) {
  return createSubscriptionFor(admin, "googlePro", returnUrl);
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
  // Dev stores always get the top tier for free (so Google features can be tested too)
  const dev = await isDevStore(admin);
  if (dev) {
    await db.shopPlan.upsert({
      where: { shop },
      update: { plan: "googlePro", status: "active" },
      create: { shop, plan: "googlePro", status: "active" },
    });
    return "googlePro";
  }

  let subs = [];
  try {
    const response = await admin.graphql(
      `{ appInstallation { activeSubscriptions { id name status } } }`,
    );
    const data = await response.json();
    subs = data?.data?.appInstallation?.activeSubscriptions ?? [];
  } catch (e) {
    console.error("[syncSubscriptionStatus] failed to fetch subscriptions:", e.message);
    const existing = await db.shopPlan.findUnique({ where: { shop } });
    return existing?.plan || "free";
  }

  if (subs.length === 0) {
    await db.shopPlan.upsert({
      where: { shop },
      update: { plan: "free", subscriptionId: null, status: "active" },
      create: { shop, plan: "free", status: "active" },
    });
    return "free";
  }

  // A shop could in theory have more than one active subscription line —
  // prefer the higher tier if both are somehow present.
  const googleSub = subs.find((s) => s.name === PLANS.googlePro.name);
  const advancedSub = subs.find((s) => s.name === PLANS.advanced.name);
  const sub = googleSub || advancedSub || subs[0];
  const planKey = sub === googleSub ? "googlePro" : "advanced";

  await db.shopPlan.upsert({
    where: { shop },
    update: {
      plan: planKey,
      subscriptionId: sub.id,
      status: sub.status === "ACTIVE" ? "active" : "cancelled",
      billingStartedAt: new Date(),
    },
    create: {
      shop,
      plan: planKey,
      subscriptionId: sub.id,
      status: "active",
      billingStartedAt: new Date(),
    },
  });

  return planKey;
}
