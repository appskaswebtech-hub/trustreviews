// app/utils/events.server.js
import db from "../db.server";
import { sendKlaviyoEvent } from "./klaviyo.server";
import { sendMailchimpEvent } from "./mailchimp.server";
import { sendFlowEvent } from "./flow.server";

const SENDERS = {
  klaviyo:      (integration, event) => sendKlaviyoEvent(integration.apiKey, event),
  mailchimp:    (integration, event) => sendMailchimpEvent(integration.apiKey, integration.listId, event),
  shopify_flow: (integration, event) => sendFlowEvent(integration.shop, event),
};

export async function notifyIntegrations(shop, { metricName, email, properties }) {
  if (!email) return;

  const integrations = await db.integration.findMany({
    where: { shop, connected: true },
  });

  await Promise.all(
    integrations.map(async (integration) => {
      const send = SENDERS[integration.provider];
      if (!send) return;
      try {
        await send(integration, { metricName, email, properties });
      } catch (error) {
        console.error(`[integrations] ${integration.provider} event send failed:`, error.message);
      }
    }),
  );
}
