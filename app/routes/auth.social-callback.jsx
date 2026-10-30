import { connectWithCode, resolveState } from "../utils/social-video.server";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function htmlResponse(message, ok) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">
      <h2>${ok ? "✅ Connected" : "❌ Connection failed"}</h2>
      <p>${esc(message)}</p>
      <p>You can close this tab and return to the app.</p>
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

// Public route — Instagram / Facebook redirect here with no Shopify admin
// session. Opened in a separate tab by the Connect button on the Instagram & Facebook Videos page.
export async function loader({ request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");

  if (error) return htmlResponse(`The account returned an error: ${error}`, false);
  if (!code || !state) return htmlResponse("Missing code or state parameter.", false);

  try {
    const { shop, provider } = await resolveState(state);
    await connectWithCode(shop, provider, code);
    return htmlResponse(`Your ${provider === "instagram" ? "Instagram" : "Facebook"} account is now connected to ${shop}.`, true);
  } catch (err) {
    return htmlResponse(err.message, false);
  }
}
