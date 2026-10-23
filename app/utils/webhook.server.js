// app/utils/webhook.server.js
// Generic outbound webhook — works with Zapier "Catch Hook", Make, n8n, etc.
function assertWebhookUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Enter a valid webhook URL.");
  }
  if (parsed.protocol !== "https:") throw new Error("Webhook URL must start with https://");
}

async function postJson(url, payload) {
  assertWebhookUrl(url);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Webhook returned ${response.status}: ${body.slice(0, 200)}`);
  }
}

export async function sendWebhookEvent(url, { metricName, email, properties }) {
  await postJson(url, {
    event: metricName,
    email,
    properties: properties || {},
    sentAt: new Date().toISOString(),
  });
}

export async function testWebhookConnection(url) {
  try {
    await postJson(url, {
      event: "Test Event",
      email: "test@example.com",
      properties: { note: "Test event from Trust Reviews" },
      sentAt: new Date().toISOString(),
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
