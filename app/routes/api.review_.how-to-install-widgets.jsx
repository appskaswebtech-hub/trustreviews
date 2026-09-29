import { redirect } from "react-router";

// Storefront link: https://<shop>/apps/review/how-to-install-widgets
// The app proxy forwards that to /api/review/how-to-install-widgets. The guide can't
// render through the proxy (its CSS/JS/images would resolve against the shop domain),
// so send the browser to the guide on the app's own domain instead.
export const loader = ({ request }) => {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);
  // Strip the proxy's signing params; keep the guide's own (e.g. ?widget=).
  ["shop", "logged_in_customer_id", "path_prefix", "timestamp", "signature"].forEach((k) => params.delete(k));

  const base = process.env.SHOPIFY_APP_URL || url.origin;
  const qs = params.toString();
  return redirect(`${base}/how-to-install-widgets${qs ? `?${qs}` : ""}`);
};
