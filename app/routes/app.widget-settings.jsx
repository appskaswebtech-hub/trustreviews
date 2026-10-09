import { authenticate } from "../shopify.server";

// Star Rating Badge settings moved to the "Settings" tab of Custom Code —
// keep this URL working for old links and bookmarks.
export async function loader({ request }) {
  const { redirect } = await authenticate.admin(request);
  return redirect("/app/custom-code?tab=settings");
}
