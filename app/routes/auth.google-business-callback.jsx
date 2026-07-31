import { exchangeCodeForTokens, resolveShopFromState } from "../utils/google-business.server";

function htmlResponse(message, ok) {
  return new Response(
    `<!doctype html><html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">
      <h2>${ok ? "✅ Connected" : "❌ Connection failed"}</h2>
      <p>${message}</p>
      <p>You can close this tab and return to the app.</p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}

// Public route — Google redirects here with no Shopify admin session.
// Opened in a separate browser tab from app.google-business-connect.jsx.
export async function loader({ request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return htmlResponse(`Google returned an error: ${error}`, false);
  if (!code || !state) return htmlResponse("Missing code or state parameter.", false);

  try {
    const shop = await resolveShopFromState(state);
    await exchangeCodeForTokens(shop, code);
    return htmlResponse(`Your Google Business Profile is now connected to ${shop}.`, true);
  } catch (err) {
    return htmlResponse(err.message, false);
  }
}
