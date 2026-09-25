// app/utils/flow.server.js
// Fires a Shopify Flow trigger when a review event happens.
// Uses unauthenticated.admin(shop) to get the admin GraphQL client
// without needing an active admin session in the request context.
import { unauthenticated } from "../shopify.server";

const FLOW_TRIGGER_MUTATION = `#graphql
  mutation FlowTriggerReceive($handle: String!, $payload: JSON) {
    flowTriggerReceive(handle: $handle, payload: $payload) {
      userErrors { field message }
    }
  }
`;

export async function fireFlowTrigger(shop, { handle, payload }) {
  try {
    const { admin } = await unauthenticated.admin(shop);
    const response = await admin.graphql(FLOW_TRIGGER_MUTATION, {
      variables: { handle, payload },
    });
    const json = await response.json();
    const errors = json?.data?.flowTriggerReceive?.userErrors ?? [];
    if (errors.length) {
      console.error("[flow] trigger errors:", errors);
    }
  } catch (err) {
    console.error("[flow] fireFlowTrigger failed:", err.message);
  }
}

// Maps an integration event to the correct Flow trigger handle + payload shape.
export async function sendFlowEvent(shop, { metricName, email, properties }) {
  const handle =
    metricName === "Review Approved" ? "review-approved" : "review-submitted";

  await fireFlowTrigger(shop, {
    handle,
    payload: {
      "customer email": email || "",
      "customer name":  properties.customer || "",
      rating:           String(properties.rating ?? ""),
      comment:          properties.comment || "",
      "product id":     String(properties.productId || ""),
      status:           properties.status || "pending",
    },
  });
}
