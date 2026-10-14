import db from "./db.server";

export const SUPPORTLY_PROVIDER = "supportly";

const INSTALL_URL = process.env.SUPPORTLY_INSTALL_URL;
const INSTALL_SECRET = process.env.SUPPORTLY_INSTALL_SECRET;

export const supportlyConfigured = Boolean(INSTALL_URL && INSTALL_SECRET);

const where = (shop) => ({ shop_provider: { shop, provider: SUPPORTLY_PROVIDER } });

async function postToSupportly(session) {
  try {
    const res = await fetch(INSTALL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-install-secret": INSTALL_SECRET,
      },
      body: JSON.stringify({
        shop: session.shop,
        name: session.shop.replace(".myshopify.com", ""),
        accessToken: session.accessToken,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Supportly returned ${res.status}. ${body.slice(0, 200)}`.trim() };
    }
    return { ok: true, error: null };
  } catch (err) {
    const error = err?.name === "TimeoutError"
      ? "Supportly did not answer in time."
      : err?.message || "Could not reach Supportly.";
    return { ok: false, error };
  }
}

export async function getSupportlyStatus(shop) {
  if (!supportlyConfigured) {
    return { configured: false, connected: false, lastSyncedAt: null, lastError: null };
  }

  const row = await db.integration.findUnique({
    where: where(shop),
    select: { connected: true, lastCheckedAt: true, lastError: true },
  });

  return {
    configured: true,
    connected: Boolean(row?.connected),
    lastSyncedAt: row?.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    lastError: row?.lastError || null,
  };
}

export async function connectSupportly(session) {
  if (!supportlyConfigured) {
    return { ok: false, error: "Supportly is not configured on this server." };
  }
  if (!session?.shop || !session.accessToken) {
    return { ok: false, error: "No Admin token available for this shop." };
  }

  const result = await postToSupportly(session);

  const fields = {
    connected: result.ok,
    lastError: result.error,
    lastCheckedAt: new Date(),
  };

  await db.integration.upsert({
    where: where(session.shop),
    update: fields,
    create: { shop: session.shop, provider: SUPPORTLY_PROVIDER, apiKey: "", ...fields },
  });

  if (!result.ok) console.error(`[supportly] connect failed for ${session.shop}: ${result.error}`);
  return result;
}

export async function disconnectSupportly(shop) {
  await db.integration.updateMany({
    where: { shop, provider: SUPPORTLY_PROVIDER },
    data: { connected: false, lastError: null, lastCheckedAt: new Date() },
  });
  return { ok: true, error: null };
}

export const API_ORIGIN = INSTALL_URL ? new URL(INSTALL_URL).origin : "";

const visitorIdFor = (shop) => shop;

async function readThreadId(shop) {
  const row = await db.integration.findUnique({ where: where(shop), select: { listId: true } });
  return row?.listId || null;
}

export async function hasSupportlyThread(shop) {
  return Boolean(await readThreadId(shop));
}

export async function getSupportlyThreadId(shop) {
  return readThreadId(shop);
}

export async function fetchShopProfile(admin) {
  try {
    const res = await admin.graphql(`{ shop { name contactEmail } }`);
    const { data } = await res.json();
    return { name: data?.shop?.name || "", email: data?.shop?.contactEmail || "" };
  } catch (err) {
    console.error("[supportly] shop profile lookup failed:", err?.message);
    return { name: "", email: "" };
  }
}

export const asId = (value) => (Number.isFinite(Number(value)) ? Number(value) : value);

const conversationOf = (payload) => payload?.message ?? null;

async function callSupportly(path, { method = "GET", body } = {}) {
  try {
    const res = await fetch(`${API_ORIGIN}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });

    const text = await res.text().catch(() => "");
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }

    if (!res.ok) {
      return { ok: false, status: res.status, error: payload?.error || `Supportly returned ${res.status}.`, payload: null };
    }
    return { ok: true, status: res.status, error: null, payload };
  } catch (err) {
    const error = err?.name === "TimeoutError"
      ? "Supportly did not answer in time."
      : err?.message || "Could not reach Supportly.";
    return { ok: false, status: 0, error, payload: null };
  }
}

const absoluteUrl = (url) => (!url ? "" : /^https?:\/\//i.test(url) ? url : `${API_ORIGIN}${url}`);

function normaliseAttachments(list) {
  return (Array.isArray(list) ? list : []).map((a) => ({
    url: absoluteUrl(a?.url),
    name: String(a?.name ?? "file"),
    size: Number(a?.size ?? 0),
    mimetype: String(a?.mimetype ?? ""),
  })).filter((a) => a.url);
}

const OUR_SENDERS = new Set(["SHOP", "CUSTOMER", "VISITOR"]);

function normaliseMessages(conversation) {
  if (!conversation) return [];

  const replies = Array.isArray(conversation.replies) ? conversation.replies : [];

  const list = [
    {
      id: `c${conversation.id}`,
      body: conversation.body,
      sender: "SHOP",
      createdAt: conversation.createdAt,
      attachments: conversation.attachments,
    },
    ...replies,
  ];

  return list.map((m, i) => ({
    id: String(m?.id ?? `m${i}`),
    body: String(m?.body ?? ""),
    fromVisitor: OUR_SENDERS.has(String(m?.sender ?? "SHOP").toUpperCase()),
    createdAt: m?.createdAt ?? m?.created_at ?? null,
    attachments: normaliseAttachments(m?.attachments),
  })).filter((m) => m.body || m.attachments.length);
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function uploadSupportlyFile(file) {
  if (!supportlyConfigured) return { ok: false, error: "Supportly is not configured on this server.", attachment: null };
  if (!file || typeof file === "string" || !file.size) {
    return { ok: false, error: "Pick a file first.", attachment: null };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "That file is larger than 10 MB.", attachment: null };
  }

  try {
    const form = new FormData();
    form.append("file", file, file.name);

    const res = await fetch(`${API_ORIGIN}/api/uploads`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30000),
    });

    const text = await res.text().catch(() => "");
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }

    if (!res.ok || !payload?.attachment) {
      return { ok: false, error: payload?.error || `Upload failed (${res.status}).`, attachment: null };
    }

    const [attachment] = normaliseAttachments([payload.attachment]);
    if (!attachment) return { ok: false, error: "Upload returned no file.", attachment: null };

    return { ok: true, error: null, attachment };
  } catch (err) {
    const error = err?.name === "TimeoutError"
      ? "Upload timed out."
      : err?.message || "Could not reach Supportly.";
    return { ok: false, error, attachment: null };
  }
}

async function saveThreadId(shop, id) {
  await db.integration.upsert({
    where: where(shop),
    update: { listId: String(id) },
    create: { shop, provider: SUPPORTLY_PROVIDER, apiKey: "", listId: String(id), connected: true },
  });
}

async function forgetThreadId(shop) {
  await db.integration.updateMany({
    where: { shop, provider: SUPPORTLY_PROVIDER },
    data: { listId: null },
  });
}

export async function getSupportlyHistory(shop) {
  if (!supportlyConfigured) return { ok: false, error: "Supportly is not configured on this server.", messages: [] };

  const threadId = await readThreadId(shop);
  if (!threadId) return { ok: true, error: null, messages: [], closed: false };

  const qs = new URLSearchParams({ visitorId: visitorIdFor(shop) });
  const res = await callSupportly(`/api/messages/${encodeURIComponent(threadId)}/history?${qs}`);

  if (!res.ok) {
    if (res.status === 404) {
      await forgetThreadId(shop);
      return { ok: true, error: null, messages: [], closed: false };
    }
    return { ok: false, error: res.error, messages: [] };
  }

  const conversation = conversationOf(res.payload);

  if (conversation?.status === "CLOSED") {
    await forgetThreadId(shop);
    return { ok: true, error: null, messages: [], closed: true };
  }

  return {
    ok: true,
    error: null,
    messages: normaliseMessages(conversation),
    closed: false,
  };
}

async function emitNewMessage(conversationId, text, attachments = []) {
  const { io } = await import("socket.io-client");

  return new Promise((resolve) => {
    const socket = io(API_ORIGIN, { timeout: 10000, tryAllTransports: true });
    const finish = (result) => { socket.disconnect(); resolve(result); };

    socket.on("connect_error", (err) => {
      const detail = [err?.message, err?.description, err?.type].filter(Boolean).join(" — ");
      console.error(`[supportly] socket connect_error: ${detail || "unknown"}`);
      finish({ ok: false, error: detail || "Could not reach Supportly." });
    });

    socket.on("connect", () => {
      socket.timeout(10000).emit(
        "new_message",
        { conversationId: asId(conversationId), body: text, sender: "SHOP", attachments },
        (timeoutErr, ack) => {
          if (timeoutErr) return finish({ ok: false, error: "Supportly did not answer in time." });
          if (ack && ack.ok === false) return finish({ ok: false, error: ack.error || "Message was rejected." });
          return finish({ ok: true, error: null });
        },
      );
    });
  });
}

export async function sendSupportlyMessage(shop, { body, name, email, attachments } = {}) {
  if (!supportlyConfigured) return { ok: false, error: "Supportly is not configured on this server.", messages: [] };

  const text = String(body || "").trim();
  const files = normaliseAttachments(attachments);
  if (!text && files.length === 0) return { ok: false, error: "Type a message first.", messages: [] };

  const threadId = await readThreadId(shop);

  if (threadId) {
    const sent = await emitNewMessage(threadId, text, files);
    if (sent.ok) return getSupportlyHistory(shop);

    await getSupportlyHistory(shop);
    if (await readThreadId(shop)) {
      console.error(`[supportly] send failed for ${shop}: ${sent.error}`);
      return { ok: false, error: sent.error, messages: [] };
    }
  }

  const res = await callSupportly("/api/messages", {
    method: "POST",
    body: {
      shop,
      visitorId: visitorIdFor(shop),
      body: text || files[0]?.name || "Attachment",
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
    },
  });

  if (!res.ok) {
    console.error(`[supportly] start failed for ${shop}: ${res.error}`);
    return { ok: false, error: res.error, messages: [] };
  }

  const conversation = conversationOf(res.payload);
  if (!conversation?.id) {
    return { ok: false, error: "Supportly did not return a conversation.", messages: [] };
  }

  await saveThreadId(shop, conversation.id);

  if (files.length) {
    const sent = await emitNewMessage(conversation.id, "", files);
    if (!sent.ok) console.error(`[supportly] attachment send failed for ${shop}: ${sent.error}`);
    return getSupportlyHistory(shop);
  }

  return {
    ok: true,
    error: null,
    messages: normaliseMessages(conversation),
    closed: conversation?.status === "CLOSED",
  };
}
