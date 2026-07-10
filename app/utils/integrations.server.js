// app/utils/integrations.server.js
// Server-only — must only be imported from a loader/action, never from a
// route component (it makes outbound fetch calls). Client-safe display
// metadata lives in providers.js instead.
import { testKlaviyoConnection } from "./klaviyo.server";
import { testMailchimpConnection, getMailchimpLists } from "./mailchimp.server";

// Shopify Flow has no external API key to test — connection is always valid
// once the extension is deployed. Return ok:true immediately.
async function testFlowConnection() {
  return { ok: true };
}

// Add a new provider's test function here, keyed to match providers.js.
export const TESTERS = {
  klaviyo:       testKlaviyoConnection,
  mailchimp:     testMailchimpConnection,
  shopify_flow:  testFlowConnection,
};

export { getMailchimpLists };
