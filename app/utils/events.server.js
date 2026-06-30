// app/utils/events.server.js
import db from "../db.server";
import { sendKlaviyoEvent } from "./klaviyo.server";

// Mailchimp event sync needs an Audience/List ID we don't collect yet, so
// it's intentionally not registered here — only providers with a working
// sender fire. Add an entry once a provider's send function exists.
const SENDERS = {
  klaviyo: sendKlaviyoEvent,
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
        await send(integration.apiKey, { metricName, email, properties });
      } catch (error) {
        console.error(`[integrations] ${integration.provider} event send failed:`, error.message);
      }
    }),
  );
}
