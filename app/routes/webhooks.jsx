import crypto from "crypto";

export const action = async ({ request }) => {
  const rawBody = await request.text(); // MUST be raw

  const hmac = request.headers.get("x-shopify-hmac-sha256");

  const hash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");

  if (hash !== hmac) {
    return new Response("Unauthorized", { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic");
  const data = JSON.parse(rawBody);

  console.log("Webhook received:", topic);

  switch (topic) {
    case "app/uninstalled":
      console.log("App uninstalled");
      break;

    case "customers/data_request":
      console.log("Customer data request");
      break;

    case "customers/redact":
      console.log("Customer redact");
      break;

    case "shop/redact":
      console.log("Shop redact");
      break;
  }

  return new Response("OK", { status: 200 });
};