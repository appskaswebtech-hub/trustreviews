import { redirect } from "react-router";

// "/apps/review/..." is the storefront app-proxy path. If it's opened on the app's
// own domain by mistake, send it to the guide instead of a 404.
export const loader = ({ request }) => {
  const url = new URL(request.url);
  return redirect(`/how-to-install-widgets${url.search}`);
};
