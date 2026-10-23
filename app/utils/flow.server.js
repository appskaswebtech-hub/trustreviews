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

// Throws on failure so callers (the Test button, notifyIntegrations) can
// report the real reason instead of silently succeeding.
export async function fireFlowTrigger(shop, { handle, payload }) {
  const { admin } = await unauthenticated.admin(shop);
  const response = await admin.graphql(FLOW_TRIGGER_MUTATION, {
    variables: { handle, payload },
  });
  const json = await response.json();
  if (json?.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  const errors = json?.data?.flowTriggerReceive?.userErrors ?? [];
  if (errors.length) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
}

// Maps an integration event to the correct Flow trigger handle + payload shape.
export async function sendFlowEvent(shop, { metricName, email, properties }) {
  const approved = metricName === "Review Approved";
  const payload = {
    "customer email": email || "",
    "customer name":  properties.customer || "",
    rating:           String(properties.rating ?? ""),
    comment:          properties.comment || "",
    "product id":     String(properties.productId || ""),
  };
  // Only the Review Submitted trigger declares a "status" field; Shopify
  // rejects payload keys the trigger doesn't define.
  if (!approved) payload.status = properties.status || "pending";

  await fireFlowTrigger(shop, {
    handle: approved ? "review-approved" : "review-submitted",
    payload,
  });
}
