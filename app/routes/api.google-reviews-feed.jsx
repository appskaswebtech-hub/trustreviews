// app/routes/api.google-reviews-feed.jsx
// Public XML feed fetched by Google Merchant Center. Protected by a
// per-shop secret token stored in the google_feed integration row.
import db from "../db.server";
import { buildGoogleReviewsFeed, tokensMatch } from "../utils/google-feed.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";
  const token = url.searchParams.get("token") || "";

  const integration = shop
    ? await db.integration.findUnique({
        where: { shop_provider: { shop, provider: "google_feed" } },
      })
    : null;

  if (!integration?.connected || !tokensMatch(integration.apiKey, token)) {
    return new Response("Not found", { status: 404 });
  }

  const xml = await buildGoogleReviewsFeed(shop);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
};
