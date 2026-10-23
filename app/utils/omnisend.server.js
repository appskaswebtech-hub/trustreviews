// app/utils/omnisend.server.js
const OMNISEND_API = "https://api.omnisend.com/v5";

function headers(apiKey) {
  return { "X-API-KEY": apiKey, "Content-Type": "application/json", Accept: "application/json" };
}

// Makes sure the contact exists, then records the review as a custom event.
// Custom events must be created once in Omnisend (Store settings → Custom events)
// using the same names we send, e.g. "Review Submitted" / "Review Approved".
export async function sendOmnisendEvent(apiKey, { metricName, email, properties }) {
  const contact = await fetch(`${OMNISEND_API}/contacts`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      identifiers: [{ type: "email", id: email, channels: { email: { status: "nonSubscribed" } } }],
      ...(properties?.customer ? { firstName: String(properties.customer) } : {}),
    }),
  });
  if (!contact.ok) {
    const body = await contact.text().catch(() => "");
    throw new Error(`Omnisend contact upsert failed (${contact.status}): ${body.slice(0, 200)}`);
  }

  const response = await fetch(`${OMNISEND_API}/events`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      eventName: metricName,
      origin: "api",
      contact: { email },
      properties: properties || {},
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Omnisend event send failed (${response.status}): ${body.slice(0, 200)}`);
  }
}

export async function testOmnisendConnection(apiKey) {
  try {
    const response = await fetch(`${OMNISEND_API}/contacts?limit=1`, { headers: headers(apiKey) });
    if (response.ok) return { ok: true };
    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: "Invalid API key" };
    }
    return { ok: false, error: `Omnisend returned status ${response.status}` };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
