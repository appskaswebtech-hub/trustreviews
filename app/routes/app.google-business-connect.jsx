import { redirect } from "react-router";
import db from "../db.server";
import { buildAuthUrl } from "../utils/google-business.server";

// Opened in a brand new browser tab (Google's consent screen refuses to
// render inside Shopify's embedded admin iframe). A fresh tab has no
// embedded session, so authenticate.admin() can't resolve a shop here — the
// admin page that renders the "Connect" link already knows its own shop
// (from its own authenticated loader), so it passes it along as ?shop=.
// We just confirm that shop actually has this app installed before handing
// off to Google.
export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) throw new Response("Missing shop parameter", { status: 400 });

  const installed = await db.session.findFirst({ where: { shop } });
  if (!installed) throw new Response("Unknown shop", { status: 404 });

  const authUrl = await buildAuthUrl(shop);
  throw redirect(authUrl);
}
