// app/utils/mailchimp.server.js
function authHeader(apiKey) {
  return `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`;
}

function dc(apiKey) {
  return apiKey.split("-").pop();
}

function subscriberHash(email) {
  // MD5 of lowercase email — required by Mailchimp member endpoint
  const { createHash } = require("crypto");
  return createHash("md5").update(email.toLowerCase()).digest("hex");
}

export async function sendMailchimpEvent(apiKey, listId, { metricName, email, properties }) {
  if (!listId) throw new Error("Mailchimp audience ID (list ID) is not configured.");

  const base = `https://${dc(apiKey)}.api.mailchimp.com/3.0`;
  const headers = { Authorization: authHeader(apiKey), "Content-Type": "application/json" };
  const hash = subscriberHash(email);

  // Upsert subscriber into the audience
  await fetch(`${base}/lists/${listId}/members/${hash}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      email_address: email,
      status_if_new: "subscribed",
      merge_fields: {
        ...(properties.customer ? { FNAME: properties.customer.split(" ")[0] } : {}),
        RATING: String(properties.rating ?? ""),
      },
    }),
  });

  // Add a tag that maps to the event name so merchants can trigger automations
  const tag = metricName || "Review Submitted";
  await fetch(`${base}/lists/${listId}/members/${hash}/tags`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tags: [{ name: tag, status: "active" }] }),
  });
}

export async function testMailchimpConnection(apiKey) {
  const server = dc(apiKey);
  if (!server || server === apiKey) {
    return { ok: false, error: "API key is missing the data-center suffix (e.g. -us6)." };
  }
  try {
    const res = await fetch(`https://${server}.api.mailchimp.com/3.0/ping`, {
      headers: { Authorization: authHeader(apiKey) },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, error: "Invalid API key." };
    return { ok: false, error: `Mailchimp returned status ${res.status}.` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function getMailchimpLists(apiKey) {
  const server = dc(apiKey);
  try {
    const res = await fetch(`https://${server}.api.mailchimp.com/3.0/lists?count=100`, {
      headers: { Authorization: authHeader(apiKey) },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.lists || []).map((l) => ({ id: l.id, name: l.name }));
  } catch {
    return [];
  }
}
