import { authenticate } from "../shopify.server";
import { installWidgetScript } from "../utils/widgetScript.server";

// Manual trigger. The same install also runs automatically after auth
// (see afterAuth in shopify.server.js).
export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);
    const result = await installWidgetScript(admin);
    return Response.json(
      { success: result.success, message: result.message },
      { status: result.status || 200 },
    );
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[install-script error]", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
