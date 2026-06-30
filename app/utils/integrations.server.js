// app/utils/integrations.server.js
// Server-only — must only be imported from a loader/action, never from a
// route component (it makes outbound fetch calls). Client-safe display
// metadata lives in providers.js instead.
import { testKlaviyoConnection } from "./klaviyo.server";

async function testMailchimpConnection(apiKey) {
  const dc = apiKey.split("-").pop();
  if (!dc || dc === apiKey) {
    return { ok: false, error: "API key is missing the data center suffix (e.g. -us6)." };
  }

  try {
    const response = await fetch(`https://${dc}.api.mailchimp.com/3.0/ping`, {
      headers: { Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}` },
    });

    if (response.ok) return { ok: true };
    if (response.status === 401) return { ok: false, error: "Invalid API key" };
    return { ok: false, error: `Mailchimp returned status ${response.status}` };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// Add a new provider's test function here, keyed to match providers.js.
export const TESTERS = {
  klaviyo: testKlaviyoConnection,
  mailchimp: testMailchimpConnection,
};
