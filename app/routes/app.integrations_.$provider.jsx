// app/routes/app.integrations_.$provider.jsx
import { useEffect, useState } from "react";
import { useLoaderData, useFetcher, redirect, Link } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { PROVIDER_META } from "../utils/providers";
import { TESTERS, getMailchimpLists } from "../utils/integrations.server";
import { syncAllApprovedReviews } from "../utils/google-merchant.server";
import { isGooglePro } from "../billing.server";

function maskKey(key) {
  if (!key || key.length <= 10) return "••••••••";
  return key.slice(0, 6) + "••••••••" + key.slice(-4);
}

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const providerKey = params.provider;
  const meta = PROVIDER_META[providerKey];
  if (!meta) throw redirect("/app/integrations");

  const integration = await db.integration.findUnique({
    where: { shop_provider: { shop: session.shop, provider: providerKey } },
  });

  // For Mailchimp: pre-load available audiences if key is saved
  let mailchimpLists = [];
  if (providerKey === "mailchimp" && integration?.apiKey) {
    mailchimpLists = await getMailchimpLists(integration.apiKey).catch(() => []);
  }

  // Build the new-format Shopify admin base URL: admin.shopify.com/store/{slug}
  const shopSlug = session.shop.replace(".myshopify.com", "");
  const adminBase = `https://admin.shopify.com/store/${shopSlug}`;

  const plan = await db.shopPlan.findUnique({ where: { shop: session.shop } });
  const isPro = isGooglePro(plan);

  return {
    providerKey,
    provider: meta,
    shop:           session.shop,
    adminBase,
    hasKey:         Boolean(integration?.apiKey && integration.apiKey !== "enabled"),
    maskedKey:      integration?.apiKey && integration.apiKey !== "enabled" ? maskKey(integration.apiKey) : null,
    listId:         integration?.listId ?? "",
    connected:      integration?.connected ?? false,
    lastError:      integration?.lastError ?? null,
    lastCheckedAt:  integration?.lastCheckedAt ?? null,
    mailchimpLists,
    googleServiceAccountEmail:
      providerKey === "google_merchant" ? process.env.GOOGLE_MERCHANT_SERVICE_ACCOUNT_EMAIL || null : null,
    isPro,
  };
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const providerKey = params.provider;
  const meta = PROVIDER_META[providerKey];
  const test = TESTERS[providerKey];
  if (!meta || !test) throw redirect("/app/integrations");

  const plan = await db.shopPlan.findUnique({ where: { shop: session.shop } });
  if (providerKey !== "azure_translator" && !isGooglePro(plan)) {
    return { ok: false, message: "Upgrade to Google Reviews Pro to use integrations." };
  }

  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const where = { shop_provider: { shop: session.shop, provider: providerKey } };

  // Shopify Flow: just toggle enabled/disabled (no real API key)
  if (providerKey === "shopify_flow") {
    if (actionType === "enable") {
      await db.integration.upsert({
        where,
        update: { apiKey: "enabled", connected: true, lastError: null, lastCheckedAt: new Date() },
        create: { shop: session.shop, provider: providerKey, apiKey: "enabled", connected: true, lastCheckedAt: new Date() },
      });
      return { ok: true, message: "Shopify Flow triggers enabled. Deploy the extension to activate them." };
    }
    if (actionType === "disable") {
      await db.integration.delete({ where }).catch(() => {});
      return { ok: true, message: "Shopify Flow triggers disabled." };
    }
    if (actionType === "test_trigger") {
      const { sendFlowEvent } = await import("../utils/flow.server");
      const handle = formData.get("handle") || "review-submitted";
      try {
        await sendFlowEvent(session.shop, {
          metricName: handle === "review-approved" ? "Review Approved" : "Review Submitted",
          email: "test@example.com",
          properties: {
            customer: "Test Customer",
            rating: 5,
            comment: "This is a test event fired from the Trust Reviews integration page.",
            productId: "000000000",
            status: handle === "review-approved" ? "approved" : "pending",
          },
        });
        return { ok: true, message: `✓ Test event "${handle}" sent successfully. Check Shopify Admin → Marketing → Automations → Activity log.` };
      } catch (err) {
        return { ok: false, message: `Failed to send test event: ${err.message}` };
      }
    }
    return null;
  }

  if (actionType === "save") {
    const apiKey = String(formData.get("apiKey") || "").trim();
    const listId = String(formData.get("listId") || "").trim();
    if (!apiKey) return { ok: false, message: "Enter an API key." };
    if (meta.requiresListId && !listId) return { ok: false, message: `Enter your ${meta.listIdLabel || "value"}.` };

    await db.integration.upsert({
      where,
      update: { apiKey, listId: listId || null, connected: false, lastError: null, lastCheckedAt: null },
      create: { shop: session.shop, provider: providerKey, apiKey, listId: listId || null },
    });
    return { ok: true, message: "Settings saved. Click Test Connection to verify." };
  }

  if (actionType === "test") {
    const integration = await db.integration.findUnique({ where });
    if (!integration?.apiKey) return { ok: false, message: "Save an API key first." };

    const result = await test(integration.apiKey, integration.listId);
    await db.integration.update({
      where,
      data: { connected: result.ok, lastError: result.ok ? null : result.error, lastCheckedAt: new Date() },
    });
    return {
      ok: result.ok,
      message: result.ok ? `Connected to ${meta.label} successfully.` : `Connection failed: ${result.error}`,
    };
  }

  if (actionType === "disconnect") {
    await db.integration.delete({ where }).catch(() => {});
    return { ok: true, message: `${meta.label} integration removed.` };
  }

  if (providerKey === "google_merchant" && actionType === "sync_all") {
    const integration = await db.integration.findUnique({ where });
    if (!integration?.apiKey) return { ok: false, message: "Save a Merchant Center ID first." };
    try {
      const { sent, failed } = await syncAllApprovedReviews(session.shop, integration.apiKey);
      return { ok: true, message: `Synced ${sent} review(s) to Google Merchant Center${failed ? `, ${failed} failed` : ""}.` };
    } catch (err) {
      return { ok: false, message: `Sync failed: ${err.message}` };
    }
  }

  return null;
};

const C = {
  bg: "#f0f2f7", surface: "#ffffff", border: "#e4e7ef",
  text: "#0f1623", muted: "#6b7280", accent: "#5145e5",
  green: "#16a34a", greenLt: "#dcfce7",
  red: "#dc2626", redLt: "#fee2e2",
  teal: "#0d9488", tealLt: "#ccfbf1",
};

function StatusDot({ connected }) {
  return <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: connected ? C.green : C.muted, display: "inline-block" }} />;
}

/* ── Shopify Flow page ── */
function FlowPage({ provider, connected, lastCheckedAt, fetcher, shop, adminBase }) {
  const busy = fetcher.state !== "idle";
  const pendingAction = fetcher.formData?.get("actionType");
  const pendingHandle = fetcher.formData?.get("handle");
  const result = fetcher.data;

  const submit = (actionType, extra = {}) => {
    const fd = new FormData();
    fd.set("actionType", actionType);
    Object.entries(extra).forEach(([k, v]) => fd.set(k, v));
    fetcher.submit(fd, { method: "post" });
  };

  return (
    <div style={{ maxWidth: 620 }}>
      {/* Status + enable/disable */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <StatusDot connected={connected} />
          <strong style={{ fontSize: 14 }}>{connected ? "Triggers enabled" : "Triggers disabled"}</strong>
          {lastCheckedAt && <span style={{ fontSize: 12, color: C.muted }}>· since {new Date(lastCheckedAt).toLocaleString()}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {connected ? (
            <button onClick={() => submit("disable")} disabled={busy}
              style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, background: "#fff", color: C.red, cursor: "pointer" }}>
              Disable Flow Triggers
            </button>
          ) : (
            <button onClick={() => submit("enable")} disabled={busy}
              style={{ border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, background: C.accent, color: "#fff", cursor: "pointer" }}>
              ⚡ Enable Flow Triggers
            </button>
          )}
        </div>
        {result?.message && (
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, fontSize: 12.5, background: result.ok ? C.greenLt : C.redLt, color: result.ok ? C.green : C.red }}>
            {result.message}
          </div>
        )}
      </div>

      {/* Available triggers + Test buttons */}
      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 10px" }}>Available Triggers</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {provider.triggers.map((t) => {
          const isTesting = pendingAction === "test_trigger" && pendingHandle === t.handle;
          return (
            <div key={t.handle} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: C.tealLt, color: C.teal, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>{t.handle}</span>
                    <strong style={{ fontSize: 13 }}>{t.label}</strong>
                  </div>
                  <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>{t.description}</p>
                </div>
                <button
                  onClick={() => submit("test_trigger", { handle: t.handle })}
                  disabled={busy || !connected}
                  title={connected ? "Fire a test event to verify the trigger works" : "Enable triggers first"}
                  style={{
                    flexShrink: 0, border: `1px solid ${C.teal}`, borderRadius: 8,
                    padding: "6px 13px", fontSize: 12, fontWeight: 700,
                    background: connected ? C.tealLt : "#f3f4f6",
                    color: connected ? C.teal : C.muted,
                    cursor: connected ? "pointer" : "default", whiteSpace: "nowrap",
                  }}
                >
                  {isTesting ? "Sending…" : "▶ Send Test"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Open Flow button */}
      <div style={{ marginBottom: 20 }}>
        <a
          href={`${adminBase}/apps/flow`}
          target="_blank" rel="noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: C.accent, color: "#fff", textDecoration: "none",
            boxShadow: "0 2px 8px rgba(81,69,229,.25)",
          }}
        >
          ⚡ Open Shopify Flow ↗
        </a>
        <p style={{ fontSize: 12, color: C.muted, margin: "8px 0 0" }}>
          Flow is installed — click above to open it, then follow the steps below.
        </p>
      </div>

      {/* Step-by-step inside Flow */}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
        <strong style={{ fontSize: 13, color: "#1e40af" }}>How to create a workflow in Flow</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
          {[
            { step: "1", text: 'Click "Create workflow" button (top-right inside Flow).' },
            { step: "2", text: 'Click "Select a trigger" → search for "Trust Reviews" → choose Review Submitted or Review Approved.' },
            { step: "3", text: 'Click the "+" button → choose an action: Send email (Shopify Email), Add Klaviyo event, Add Mailchimp tag, etc.' },
            { step: "4", text: 'Click "Turn on workflow" — it will now fire automatically on every review.' },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{
                flexShrink: 0, width: 26, height: 26, borderRadius: "50%",
                background: "#1e40af", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800,
              }}>{step}</span>
              <span style={{ fontSize: 12.5, color: "#1e3a8a", lineHeight: 1.6, paddingTop: 3 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Verify via test */}
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "16px 18px" }}>
        <strong style={{ fontSize: 13, color: "#166534" }}>Verify it's working</strong>
        <ol style={{ fontSize: 12.5, color: "#14532d", paddingLeft: 18, margin: "8px 0 0", lineHeight: 1.9 }}>
          <li>Create and turn on a workflow in Flow (steps above).</li>
          <li>Come back here and click <strong>▶ Send Test</strong> on a trigger.</li>
          <li>Go back to Flow → open your workflow → click <strong>"Recent runs"</strong> in the left sidebar.</li>
          <li>You'll see a run with <code style={{ background:"#dcfce7", padding:"1px 4px", borderRadius:3 }}>test@example.com</code> — confirming the trigger fired correctly.</li>
        </ol>
      </div>

      {/* How to build */}
      <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12, padding: "16px 18px" }}>
        <strong style={{ fontSize: 13, color: "#92400e" }}>How to build a Flow automation</strong>
        <ol style={{ fontSize: 12.5, color: "#78350f", paddingLeft: 18, margin: "8px 0 0", lineHeight: 1.9 }}>
          <li>In Shopify admin → <strong>Marketing → Automations → Create automation</strong>.</li>
          <li>Choose <strong>Browse templates</strong> or start from scratch.</li>
          <li>Set the trigger to <strong>Trust Reviews — Review Submitted</strong> (or Review Approved).</li>
          <li>Add an action: <em>Send email via Shopify Email</em>, <em>Add Klaviyo event</em>, <em>Add Mailchimp tag</em>, etc.</li>
          <li>Turn on the automation. It fires automatically on every new review.</li>
        </ol>
      </div>
    </div>
  );
}

/* ── Klaviyo / Mailchimp page ── */
function ApiKeyPage({ provider, providerKey, hasKey, maskedKey, listId: savedListId, connected, lastError, lastCheckedAt, mailchimpLists, googleServiceAccountEmail, fetcher }) {
  const [apiKey, setApiKey] = useState("");
  const [listId, setListId] = useState(savedListId || "");

  const busy = fetcher.state !== "idle";
  const pendingAction = fetcher.formData?.get("actionType");
  const result = fetcher.data;

  useEffect(() => { if (result?.ok && pendingAction === "save") setApiKey(""); }, [result, pendingAction]);

  const submit = (actionType) => {
    const fd = new FormData();
    fd.set("actionType", actionType);
    if (actionType === "save") { fd.set("apiKey", apiKey); fd.set("listId", listId); }
    fetcher.submit(fd, { method: "post" });
  };

  return (
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, maxWidth: 520 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <StatusDot connected={connected} />
        <strong style={{ fontSize: 13 }}>{connected ? "Connected" : "Not connected"}</strong>
        {lastCheckedAt && <span style={{ fontSize: 12, color: C.muted }}>· last checked {new Date(lastCheckedAt).toLocaleString()}</span>}
      </div>

      {/* Azure Translator: where to get a key/region, and a link to pricing */}
      {providerKey === "azure_translator" && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <strong style={{ fontSize: 12, color: "#1e40af", display: "block", marginBottom: 4 }}>Step 1 — create a Translator resource in Azure</strong>
          <p style={{ fontSize: 11.5, color: "#1e3a8a", margin: "0 0 8px", lineHeight: 1.6 }}>
            Azure Portal → Create a resource → "Translator" → deploy it, then open Keys and Endpoint to copy KEY 1 and the Region below. Azure bills per character translated (a free tier is included).
          </p>
          <a href={provider.pricingUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "#1e40af", fontWeight: 700 }}>
            View Azure Translator pricing ↗
          </a>
        </div>
      )}

      {/* Google Merchant: service account email to add as a Merchant Center user */}
      {providerKey === "google_merchant" && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <strong style={{ fontSize: 12, color: "#1e40af", display: "block", marginBottom: 4 }}>Step 1 — add this account as a Merchant Center user</strong>
          <code style={{ fontSize: 12.5, color: "#1e3a8a", background: "#dbeafe", padding: "3px 8px", borderRadius: 6, display: "inline-block", wordBreak: "break-all" }}>
            {googleServiceAccountEmail || "Not configured yet — set GOOGLE_MERCHANT_SERVICE_ACCOUNT_EMAIL"}
          </code>
          <p style={{ fontSize: 11.5, color: "#1e3a8a", margin: "6px 0 0" }}>
            Merchant Center → Settings → Account access → Add user → paste the email above with Standard access.
          </p>
        </div>
      )}

      {/* API key */}
      <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: "block", marginBottom: 6 }}>
        {provider.keyLabel || "API Key"}
      </label>
      <input
        type={providerKey === "google_merchant" ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)}
        placeholder={hasKey ? maskedKey : provider.keyPlaceholder}
        style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, marginBottom: 4, boxSizing: "border-box" }}
      />
      <p style={{ fontSize: 11.5, color: C.muted, margin: "0 0 14px" }}>{provider.keyHelp}</p>

      {/* Mailchimp: Audience ID */}
      {provider.requiresListId && (
        <>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: "block", marginBottom: 6 }}>
            {provider.listIdLabel}
          </label>
          {mailchimpLists.length > 0 ? (
            <select value={listId} onChange={(e) => setListId(e.target.value)}
              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, marginBottom: 4, boxSizing: "border-box", background: "#fff" }}>
              <option value="">— choose an audience —</option>
              {mailchimpLists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.id})</option>)}
            </select>
          ) : (
            <input
              type="text" value={listId} onChange={(e) => setListId(e.target.value)}
              placeholder={provider.listIdPlaceholder}
              style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, marginBottom: 4, boxSizing: "border-box" }}
            />
          )}
          <p style={{ fontSize: 11.5, color: C.muted, margin: "0 0 14px" }}>{provider.listIdHelp}</p>
        </>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => submit("save")} disabled={busy || !apiKey.trim()}
          style={{ border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: busy || !apiKey.trim() ? "default" : "pointer", background: C.accent, color: "#fff", opacity: !apiKey.trim() ? 0.5 : 1 }}>
          {busy && pendingAction === "save" ? "Saving…" : "Save Settings"}
        </button>
        <button onClick={() => submit("test")} disabled={busy || !hasKey}
          style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: busy || !hasKey ? "default" : "pointer", background: "#fff", color: C.text, opacity: !hasKey ? 0.5 : 1 }}>
          {busy && pendingAction === "test" ? "Testing…" : "Test Connection"}
        </button>
        {providerKey === "google_merchant" && connected && (
          <button onClick={() => submit("sync_all")} disabled={busy}
            style={{ border: `1px solid ${C.accent}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", background: "#fff", color: C.accent }}>
            {busy && pendingAction === "sync_all" ? "Syncing…" : "Sync existing approved reviews now"}
          </button>
        )}
        {connected && (
          <button onClick={() => { if (window.confirm("Remove this integration?")) submit("disconnect"); }} disabled={busy}
            style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "#fff", color: C.red, marginLeft: "auto" }}>
            Disconnect
          </button>
        )}
      </div>

      {result?.message && (
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, fontSize: 12.5, background: result.ok ? C.greenLt : C.redLt, color: result.ok ? C.green : C.red }}>
          {result.message}
        </div>
      )}
      {!result && lastError && (
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, fontSize: 12.5, background: C.redLt, color: C.red }}>
          Last check failed: {lastError}
        </div>
      )}

      {/* Events that fire / what gets translated */}
      <div style={{ marginTop: 20, padding: "14px 16px", background: "#f8f9fc", borderRadius: 10, border: `1px solid ${C.border}` }}>
        {providerKey === "azure_translator" ? (
          <>
            <strong style={{ fontSize: 12, color: C.text, display: "block", marginBottom: 8 }}>What gets translated</strong>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: C.muted, lineHeight: 1.7 }}>
              <li>Review title and comment text, shown to each shopper in their storefront language</li>
              <li>Your store reply to a review</li>
              <li>Questions &amp; Answers content</li>
            </ul>
            <p style={{ fontSize: 11.5, color: C.muted, margin: "10px 0 0" }}>
              Only the customer-facing display changes — the original text saved in your dashboard is never modified. Each piece of text is translated once per language and cached, so editing a review or reply is the only thing that re-triggers a translation.
            </p>
          </>
        ) : (
          <>
            <strong style={{ fontSize: 12, color: C.text, display: "block", marginBottom: 8 }}>Events sent to {provider.label}</strong>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: C.muted, lineHeight: 1.7 }}>
              <li><strong>Review Submitted</strong> — fires when a customer submits a new review</li>
              <li><strong>Review Approved</strong> — fires when you approve a review in the dashboard</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function IntegrationPaywall({ provider }) {
  return (
    <div style={{ textAlign: "center", padding: "50px 24px", maxWidth: 460, margin: "0 auto" }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: C.text, marginBottom: 8 }}>
        {provider.label} — Google Reviews Pro
      </div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>
        Connect {provider.label} to sync review events — available on the Google Reviews Pro plan.
      </div>
      <Link to="/app/billing" style={{
        display: "inline-flex", padding: "11px 26px", borderRadius: 9, fontSize: 13, fontWeight: 800,
        background: C.accent, color: "#fff", textDecoration: "none",
      }}>
        Upgrade to Google Reviews Pro — $19.99/mo
      </Link>
    </div>
  );
}

export default function IntegrationSettingsPage() {
  const { providerKey, provider, shop, adminBase, hasKey, maskedKey, listId, connected, lastError, lastCheckedAt, mailchimpLists, googleServiceAccountEmail, isPro } = useLoaderData();
  const fetcher = useFetcher();

  if (!isPro && providerKey !== "azure_translator") {
    return (
      <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh", padding: 28 }}>
        <IntegrationPaywall provider={provider} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh", padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Link to="/app/integrations" style={{ fontSize: 16, color: C.text, textDecoration: "none" }}>←</Link>
        <div style={{ fontSize: 28 }}>{provider.icon}</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>{provider.label}</h1>
        {connected && (
          <span style={{ fontSize: 11, fontWeight: 700, background: C.greenLt, color: C.green, borderRadius: 20, padding: "3px 10px" }}>✓ Connected</span>
        )}
      </div>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px 44px" }}>{provider.description}</p>

      {providerKey === "shopify_flow" ? (
        <FlowPage provider={provider} connected={connected} lastCheckedAt={lastCheckedAt} fetcher={fetcher} shop={shop} adminBase={adminBase} />
      ) : (
        <ApiKeyPage
          provider={provider} providerKey={providerKey}
          hasKey={hasKey} maskedKey={maskedKey} listId={listId}
          connected={connected} lastError={lastError} lastCheckedAt={lastCheckedAt}
          mailchimpLists={mailchimpLists} googleServiceAccountEmail={googleServiceAccountEmail}
          fetcher={fetcher}
        />
      )}
    </div>
  );
}
