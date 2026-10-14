import { authenticate } from "../shopify.server";
import { getSupportlyThreadId, supportlyConfigured } from "../supportly.server";
import { subscribe } from "../supportly.socket.server";

// Live half of the chat panel. Supportly's socket.io server only allows its own
// origin, so the browser cannot listen directly — our server holds the socket
// and forwards typing / new-message events down this stream instead.
//
// EventSource can't set headers, so the panel passes App Bridge's session token
// as ?id_token=, which authenticate.admin accepts the same as the header.
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  if (!supportlyConfigured) return new Response("Not configured", { status: 503 });

  const conversationId = await getSupportlyThreadId(session.shop);
  const encoder = new TextEncoder();

  let unsubscribe = null;
  let heartbeat = null;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const write = (chunk) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(chunk)); } catch { closed = true; }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe?.();
        try { controller.close(); } catch { /* already closed */ }
      };

      request.signal.addEventListener("abort", cleanup);

      write(": open\n\n");

      // Proxies and the browser both drop an idle stream, so keep it warm.
      heartbeat = setInterval(() => write(": ping\n\n"), 25000);

      unsubscribe = await subscribe(session.shop, conversationId, (event, data) => {
        write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      });

      if (request.signal.aborted) cleanup();
    },

    cancel() {
      clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Stops nginx/LiteSpeed from buffering the stream into nothing.
      "X-Accel-Buffering": "no",
    },
  });
}
