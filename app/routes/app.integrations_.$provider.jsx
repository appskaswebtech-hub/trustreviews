// app/routes/app.integrations_.$provider.jsx
import { useEffect, useState } from "react";
import { useLoaderData, useFetcher, redirect, Link } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { PROVIDER_META } from "../utils/providers";
import { TESTERS } from "../utils/integrations.server";

function maskKey(key) {
  if (key.length <= 10) return "••••••••";
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

  return {
    providerKey,
    provider: meta,
    hasKey: Boolean(integration?.apiKey),
    maskedKey: integration?.apiKey ? maskKey(integration.apiKey) : null,
    connected: integration?.connected ?? false,
    lastError: integration?.lastError ?? null,
    lastCheckedAt: integration?.lastCheckedAt ?? null,
  };
};

export const action = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const providerKey = params.provider;
  const meta = PROVIDER_META[providerKey];
  const test = TESTERS[providerKey];
  if (!meta || !test) throw redirect("/app/integrations");

  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const where = { shop_provider: { shop: session.shop, provider: providerKey } };

  if (actionType === "save") {
    const apiKey = String(formData.get("apiKey") || "").trim();
    if (!apiKey) return { ok: false, message: "Enter an API key." };

    await db.integration.upsert({
      where,
      update: { apiKey, connected: false, lastError: null, lastCheckedAt: null },
      create: { shop: session.shop, provider: providerKey, apiKey },
    });
    return { ok: true, message: "API key saved. Click Test Connection to verify it." };
  }

  if (actionType === "test") {
    const integration = await db.integration.findUnique({ where });
    if (!integration?.apiKey) return { ok: false, message: "Save an API key first." };

    const result = await test(integration.apiKey);
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

  return null;
};

const C = {
  bg: "#f0f2f7", surface: "#ffffff", border: "#e4e7ef",
  text: "#0f1623", muted: "#6b7280", accent: "#5145e5",
  green: "#16a34a", greenLt: "#dcfce7",
  red: "#dc2626", redLt: "#fee2e2",
};

export default function IntegrationSettingsPage() {
  const { provider, hasKey, maskedKey, connected, lastError, lastCheckedAt } = useLoaderData();
  const fetcher = useFetcher();
  const [apiKey, setApiKey] = useState("");

  const busy = fetcher.state !== "idle";
  const pendingAction = fetcher.formData?.get("actionType");
  const result = fetcher.data;

  useEffect(() => {
    if (result?.ok && pendingAction === "save") setApiKey("");
  }, [result, pendingAction]);

  const submit = (actionType) => {
    const fd = new FormData();
    fd.set("actionType", actionType);
    if (actionType === "save") fd.set("apiKey", apiKey);
    fetcher.submit(fd, { method: "post" });
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh", padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Link to="/app/integrations" style={{ fontSize: 16, color: C.text, textDecoration: "none" }}>←</Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>{provider.label} Integration</h1>
      </div>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px 26px" }}>{provider.description}</p>

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? C.green : C.muted }} />
          <strong style={{ fontSize: 13 }}>{connected ? "Connected" : "Not connected"}</strong>
          {lastCheckedAt && (
            <span style={{ fontSize: 12, color: C.muted }}>
              · last checked {new Date(lastCheckedAt).toLocaleString()}
            </span>
          )}
        </div>

        <label htmlFor="integration-api-key" style={{ fontSize: 12, fontWeight: 600, color: C.text, display: "block", marginBottom: 6 }}>
          API Key
        </label>
        <input
          id="integration-api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={hasKey ? maskedKey : provider.keyPlaceholder}
          style={{
            width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "8px 10px", fontSize: 13, marginBottom: 6, boxSizing: "border-box",
          }}
        />
        <p style={{ fontSize: 11.5, color: C.muted, margin: "0 0 12px" }}>{provider.keyHelp}</p>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => submit("save")}
            disabled={busy || !apiKey.trim()}
            style={{
              border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700,
              cursor: busy ? "default" : "pointer", background: C.accent, color: "#fff",
            }}
          >
            Save API Key
          </button>
          <button
            onClick={() => submit("test")}
            disabled={busy || !hasKey}
            style={{
              border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700,
              cursor: busy || !hasKey ? "default" : "pointer", background: "#fff", color: C.text,
            }}
          >
            {busy && pendingAction === "test" ? "Testing…" : "Test Connection"}
          </button>
        </div>

        {result?.message && (
          <div style={{
            marginTop: 14, padding: "10px 12px", borderRadius: 8, fontSize: 12.5,
            background: result.ok ? C.greenLt : C.redLt, color: result.ok ? C.green : C.red,
          }}>
            {result.message}
          </div>
        )}

        {!result && lastError && (
          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, fontSize: 12.5, background: C.redLt, color: C.red }}>
            Last check failed: {lastError}
          </div>
        )}
      </div>
    </div>
  );
}
