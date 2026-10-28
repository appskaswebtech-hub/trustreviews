// app/routes/app.api-access.jsx
// Lets an Advanced-plan merchant generate / regenerate / revoke the key used by
// the public reviews API (routes/api.public-reviews.jsx).
import { useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import { randomBytes } from "node:crypto";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { hasAdvancedAccess } from "../utils/planGuard.server";
import AdvancedPaywall from "../components/AdvancedPaywall";
import { BRAND } from "../utils/brand";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const isPro = await hasAdvancedAccess(session.shop);
  const row = isPro ? await db.storeApiKey.findUnique({ where: { shop: session.shop } }) : null;
  return {
    isPro,
    apiKey: row?.key || "",
    lastUsedAt: row?.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    baseUrl: (process.env.SHOPIFY_APP_URL || new URL(request.url).origin).replace(/\/$/, ""),
  };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  if (!(await hasAdvancedAccess(session.shop))) return { ok: false, message: "The reviews API requires the Advanced plan." };
  const { intent } = await request.json();

  if (intent === "revoke") {
    await db.storeApiKey.deleteMany({ where: { shop: session.shop } });
    return { ok: true };
  }
  // generate / regenerate — the old key stops working immediately
  const key = "trk_" + randomBytes(24).toString("hex");
  await db.storeApiKey.upsert({
    where: { shop: session.shop },
    update: { key, lastUsedAt: null },
    create: { shop: session.shop, key },
  });
  return { ok: true };
}

const C = { border: "#D5E6FB", text: BRAND.navy, muted: "#5B6B85" };
const card = { background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 7px 20px rgba(16,34,74,.05)" };
const codeBox = { background: "#1e1e2e", color: "#a6e3a1", borderRadius: 10, padding: "12px 14px", fontFamily: "monospace", fontSize: 13, wordBreak: "break-all", margin: 0, whiteSpace: "pre-wrap" };
const btn = (bg) => ({ border: "none", borderRadius: 9, padding: "9px 18px", background: bg, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" });

const PARAMS = [
  ["product_id", "Only reviews of this Shopify product id"],
  ["rating", "Only reviews with this star rating (1-5)"],
  ["sort", "newest (default) or highest"],
  ["limit", "Reviews per page, 1-100 (default 20)"],
  ["page", "Page number, starting at 1"],
];

const SAMPLE_RESPONSE = `{
  "shop": "your-store.myshopify.com",
  "average": 4.6, "count": 128,
  "page": 1, "limit": 10, "total": 128,
  "reviews": [
    { "id": 1, "productId": "123456", "customer": "Sam", "rating": 5,
      "title": "Great", "comment": "...", "createdAt": "2026-10-01T10:00:00.000Z",
      "mediaUrl": null, "mediaType": null, "reply": null, "repliedAt": null }
  ]
}`;

export default function ApiAccessPage() {
  const { isPro, apiKey, lastUsedAt, baseUrl } = useLoaderData();
  const fetcher = useFetcher();
  const [copied, setCopied] = useState("");
  const busy = fetcher.state !== "idle";

  const copy = (text, id) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };
  const run = (intent, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    fetcher.submit({ intent }, { method: "POST", encType: "application/json" });
  };

  const endpoint = `${baseUrl}/api/public-reviews`;
  const example = `curl "${endpoint}?key=${apiKey || "YOUR_API_KEY"}&limit=10"`;

  return (
    <div style={{ minHeight: "100vh", background: "#EAF3FE", fontFamily: "var(--app-font-family)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 24px", height: 62, background: "#fff", borderBottom: `1px solid ${C.border}` }}>
        <Link to="/app" style={{ color: C.muted, textDecoration: "none", fontSize: 14 }}>Home</Link>
        <span style={{ color: "#B3C3CF" }}>/</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>API Access</span>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "26px 24px 34px" }}>
        {!isPro ? (
          <AdvancedPaywall
            title="Reviews API — Advanced Plan"
            description="Fetch your store's reviews from your own website or app with a private API key."
            features={["Private API key per store", "Filter by product, rating and sort", "Pagination, up to 100 reviews per call", "Everything else in Advanced"]}
            accentColor={BRAND.blueText}
          />
        ) : (
          <>
            <div style={card}>
              <h2 style={{ margin: "0 0 6px", fontSize: 22, color: C.text }}>Reviews API</h2>
              <p style={{ margin: 0, color: C.muted, fontSize: 14, lineHeight: 1.65 }}>
                Fetch this store's approved reviews from your own website, app or backend. Every store has its own key — keep it private.
              </p>
            </div>

            <div style={card}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 10 }}>API key</div>
              {apiKey ? (
                <>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <pre style={{ ...codeBox, flex: 1, minWidth: 260 }}>{apiKey}</pre>
                    <button style={btn(copied === "key" ? "#1f7a4d" : "#2A74C9")} onClick={() => copy(apiKey, "key")}>{copied === "key" ? "✓ Copied" : "Copy"}</button>
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>
                    {lastUsedAt ? `Last used ${new Date(lastUsedAt).toLocaleString()}` : "Not used yet"}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button disabled={busy} style={btn("#2A74C9")} onClick={() => run("generate", "Generate a new key? The current key stops working immediately.")}>Regenerate</button>
                    <button disabled={busy} style={btn("#c0392b")} onClick={() => run("revoke", "Revoke the key? Anything using it will stop working.")}>Revoke</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ margin: "0 0 12px", color: C.muted, fontSize: 14 }}>No key yet.</p>
                  <button disabled={busy} style={btn("#2A74C9")} onClick={() => run("generate")}>Generate API key</button>
                </>
              )}
              {fetcher.data?.ok === false && <div style={{ color: "#c0392b", marginTop: 10, fontSize: 13 }}>{fetcher.data.message}</div>}
            </div>

            <div style={card}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 10 }}>Request</div>
              <pre style={codeBox}>{`GET ${endpoint}`}</pre>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.65, margin: "12px 0" }}>
                Send the key as <code>?key=</code>, or as an <code>Authorization: Bearer &lt;key&gt;</code> / <code>X-API-Key</code> header.
              </p>
              <table style={{ width: "100%", fontSize: 14, color: C.muted, borderCollapse: "collapse" }}>
                <tbody>
                  {PARAMS.map(([k, v]) => (
                    <tr key={k} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 0", width: 140 }}><code>{k}</code></td>
                      <td style={{ padding: "8px 0" }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "16px 0 8px" }}>Example</div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <pre style={{ ...codeBox, flex: 1 }}>{example}</pre>
                <button style={btn(copied === "ex" ? "#1f7a4d" : "#2A74C9")} onClick={() => copy(example, "ex")}>{copied === "ex" ? "✓ Copied" : "Copy"}</button>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "16px 0 8px" }}>Response</div>
              <pre style={codeBox}>{SAMPLE_RESPONSE}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
