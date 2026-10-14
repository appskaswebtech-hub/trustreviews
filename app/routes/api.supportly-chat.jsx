import { authenticate } from "../shopify.server";
import {
  fetchShopProfile,
  getSupportlyHistory,
  getSupportlyThreadId,
  hasSupportlyThread,
  sendSupportlyMessage,
  uploadSupportlyFile,
} from "../supportly.server";
import { emitTyping } from "../supportly.socket.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  return Response.json(await getSupportlyHistory(session.shop));
}

export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);

  const form = await request.formData();

  if (form.get("intent") === "upload") {
    return Response.json(await uploadSupportlyFile(form.get("file")));
  }

  // Rides the relay socket the open stream already holds, so it costs no
  // connection of its own.
  if (form.get("intent") === "typing") {
    const conversationId = await getSupportlyThreadId(session.shop);
    emitTyping(session.shop, conversationId, form.get("typing") === "1");
    return Response.json({ ok: true });
  }

  let attachments = [];
  try {
    attachments = JSON.parse(form.get("attachments") || "[]");
  } catch {
    attachments = [];
  }

  // Name and email are only read when a conversation is created, so the lookup
  // runs then too — otherwise every message would cost an Admin API call. They
  // are what the agent's inbox shows instead of "Anonymous visitor".
  const profile = (await hasSupportlyThread(session.shop))
    ? {}
    : await fetchShopProfile(admin);

  const result = await sendSupportlyMessage(session.shop, {
    body: form.get("body"),
    ...profile,
    attachments,
  });

  return Response.json(result);
}
