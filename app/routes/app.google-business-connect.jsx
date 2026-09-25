import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { buildAuthUrl } from "../utils/google-business.server";

// Opened in a new tab (Google's consent screen refuses to render inside
// Shopify's embedded admin iframe) — requires an authenticated admin session
// only to know which shop is connecting, then hands off to Google.
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const authUrl = await buildAuthUrl(session.shop);
  throw redirect(authUrl);
}
