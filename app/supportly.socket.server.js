import { API_ORIGIN, asId } from "./supportly.server";

const hubs = new Map();

const CLOSE_GRACE_MS = 15000;

function matches(hub, conversationId) {
  return String(conversationId ?? "") === String(hub.conversationId ?? "");
}

function fanOut(hub, event, data) {
  for (const listener of hub.listeners) {
    try { listener(event, data); } catch { /* a dead stream must not stop the others */ }
  }
}

function joinConversation(hub) {
  if (hub.socket?.connected && hub.conversationId) {
    hub.socket.emit("join_conversation", { conversationId: asId(hub.conversationId) });
  }
}

async function openHub(shop, conversationId) {
  const { io } = await import("socket.io-client");

  const hub = { shop, conversationId, listeners: new Set(), socket: null, closeTimer: null };
  hubs.set(shop, hub);

  const socket = io(API_ORIGIN, { timeout: 10000, tryAllTransports: true });
  hub.socket = socket;

  socket.on("connect", () => joinConversation(hub));

  socket.on("connect_error", (err) => {
    console.error(`[supportly] relay connect_error for ${shop}: ${err?.message || "unknown"}`);
  });

  socket.on("message_received", (payload) => {
    if (matches(hub, payload?.messageId ?? payload?.conversationId)) fanOut(hub, "message", {});
  });

  socket.on("typing", ({ conversationId, sender } = {}) => {
    if (matches(hub, conversationId) && sender !== "SHOP") fanOut(hub, "typing", { typing: true });
  });

  socket.on("stop_typing", ({ conversationId, sender } = {}) => {
    if (matches(hub, conversationId) && sender !== "SHOP") fanOut(hub, "typing", { typing: false });
  });

  socket.on("conversation_closed", ({ conversationId } = {}) => {
    if (matches(hub, conversationId)) fanOut(hub, "closed", {});
  });

  return hub;
}

// One socket per shop, shared by every open panel for that shop. It is dropped
// a few seconds after the last panel closes so a merchant clicking around the
// admin doesn't reconnect on every page.
export async function subscribe(shop, conversationId, listener) {
  let hub = hubs.get(shop);
  if (!hub) hub = await openHub(shop, conversationId);

  if (hub.closeTimer) {
    clearTimeout(hub.closeTimer);
    hub.closeTimer = null;
  }

  // A new conversation was started since this hub opened.
  if (conversationId && !matches(hub, conversationId)) {
    hub.conversationId = conversationId;
    joinConversation(hub);
  }

  hub.listeners.add(listener);

  return () => {
    hub.listeners.delete(listener);
    if (hub.listeners.size > 0) return;

    hub.closeTimer = setTimeout(() => {
      if (hub.listeners.size === 0) {
        hub.socket?.disconnect();
        hubs.delete(shop);
      }
    }, CLOSE_GRACE_MS);
  };
}

export function emitTyping(shop, conversationId, typing) {
  const hub = hubs.get(shop);
  if (!hub?.socket?.connected || !conversationId) return false;

  hub.socket.emit(typing ? "typing" : "stop_typing", {
    conversationId: asId(conversationId),
    sender: "SHOP",
  });
  return true;
}
