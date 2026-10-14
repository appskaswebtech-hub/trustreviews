// app/routes/api.supportly.jsx
// Admin-only endpoint behind the "Customer messaging" card on the dashboard.
// Hands this shop's Admin token to Supportly (connect / re-sync), or stops
// sending it (disconnect).
import { authenticate } from "../shopify.server";
import {
  connectSupportly,
  disconnectSupportly,
  getSupportlyStatus,
} from "../supportly.server";

export async function action({ request }) {
  // Rejects anything that isn't an embedded admin request, so the token can
  // only ever be handed over by the merchant themselves.
  const { session } = await authenticate.admin(request);

  const form = await request.formData();
  const intent = String(form.get("intent") || "connect");

  const result = intent === "disconnect"
    ? await disconnectSupportly(session.shop)
    : await connectSupportly(session);

  return Response.json({
    ...result,
    intent,
    supportly: await getSupportlyStatus(session.shop),
  });
}

// Nothing to render — a GET here is a mistake, not a page.
export const loader = () => new Response("Method Not Allowed", { status: 405 });
