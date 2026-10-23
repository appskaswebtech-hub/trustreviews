// app/utils/hubspot.server.js
const HUBSPOT_API = "https://api.hubapi.com";

function headers(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

const GROUP = "contactinformation";
const CUSTOM_PROPERTIES = [
  { name: "trustreviews_last_rating", label: "Trust Reviews: Last Rating", type: "number", fieldType: "number" },
  { name: "trustreviews_last_review", label: "Trust Reviews: Last Review", type: "string", fieldType: "textarea" },
  { name: "trustreviews_last_product_id", label: "Trust Reviews: Last Product ID", type: "string", fieldType: "text" },
  { name: "trustreviews_last_event", label: "Trust Reviews: Last Event", type: "string", fieldType: "text" },
];

// Tokens whose custom properties we've already created in this process.
const ensured = new Set();

// Creates the custom contact properties once. Returns false if the token lacks
// the crm.schemas.contacts.write scope, so we fall back to basic contact sync.
async function ensureProperties(token) {
  if (ensured.has(token)) return true;
  for (const prop of CUSTOM_PROPERTIES) {
    const response = await fetch(`${HUBSPOT_API}/crm/v3/properties/contacts`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ ...prop, groupName: GROUP }),
    });
    // 409 = property already exists, which is fine.
    if (!response.ok && response.status !== 409) return false;
  }
  ensured.add(token);
  return true;
}

// Creates the contact if missing, otherwise updates it (matched by email).
export async function sendHubspotEvent(token, { metricName, email, properties }) {
  const fields = { email };
  if (properties?.customer) fields.firstname = String(properties.customer);

  if (await ensureProperties(token)) {
    if (properties?.rating != null) fields.trustreviews_last_rating = Number(properties.rating);
    if (properties?.comment) fields.trustreviews_last_review = String(properties.comment).slice(0, 5000);
    if (properties?.productId) fields.trustreviews_last_product_id = String(properties.productId);
    if (metricName) fields.trustreviews_last_event = metricName;
  }

  const response = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ properties: fields }),
  });
  if (response.ok) return;

  // 409 = contact already exists; the message ends with "Existing ID: <id>"
  if (response.status === 409) {
    const body = await response.json().catch(() => ({}));
    const id = String(body.message || "").match(/Existing ID:\s*(\d+)/)?.[1];
    if (!id) return;
    const update = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/${id}`, {
      method: "PATCH",
      headers: headers(token),
      body: JSON.stringify({ properties: fields }),
    });
    if (!update.ok) throw new Error(`HubSpot contact update failed (${update.status})`);
    return;
  }

  const body = await response.text().catch(() => "");
  throw new Error(`HubSpot contact create failed (${response.status}): ${body.slice(0, 200)}`);
}

export async function testHubspotConnection(token) {
  try {
    const response = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts?limit=1`, {
      headers: headers(token),
    });
    if (response.ok) return { ok: true };
    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: "Invalid access token or missing crm.objects.contacts scopes" };
    }
    return { ok: false, error: `HubSpot returned status ${response.status}` };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
