// app/utils/klaviyo.server.js
const KLAVIYO_REVISION = "2024-10-15";

export async function sendKlaviyoEvent(apiKey, { metricName, email, properties }) {
  const response = await fetch("https://a.klaviyo.com/api/events", {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      revision: KLAVIYO_REVISION,
    },
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          metric: { data: { type: "metric", attributes: { name: metricName } } },
          profile: { data: { type: "profile", attributes: { email } } },
          properties: properties || {},
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Klaviyo event send failed (${response.status}): ${body}`);
  }
}

export async function testKlaviyoConnection(apiKey) {
  try {
    const response = await fetch("https://a.klaviyo.com/api/accounts", {
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        Accept: "application/json",
        revision: KLAVIYO_REVISION,
      },
    });

    if (response.ok) return { ok: true };
    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: "Invalid API key" };
    }
    return { ok: false, error: `Klaviyo returned status ${response.status}` };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
