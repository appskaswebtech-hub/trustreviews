// Floating message button in the admin app. Click opens a chat panel that talks
// to Supportly through /api/supportly-chat (our server adds the shop, so the
// browser never names it). Sits above the "?" HelpButton, which is pinned at
// bottom: 18px.
//
// Replies are picked up by polling while the panel is open. Supportly also
// offers socket.io for push, but that would have to run from the browser
// straight to their origin — polling keeps everything behind our own route.
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { BRAND } from "../utils/brand";

const ENDPOINT = "/api/supportly-chat";
const EVENTS = "/api/supportly-events";
const POLL_MS = 8000;
const TYPING_IDLE_MS = 2000;

const fileSize = (bytes) => (
  bytes < 1024 ? `${bytes} B`
    : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
);

export default function SupportlyChat() {
  const history = useFetcher();
  const send = useFetcher();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);

  const listRef = useRef(null);
  const fileRef = useRef(null);
  const typingOffRef = useRef(null);
  const typingSentAt = useRef(0);
  const typingStopTimer = useRef(null);

  // Listeners below are long-lived, so they call through a ref instead of
  // capturing the first render's fetcher.
  const reloadRef = useRef(null);
  reloadRef.current = () => history.load(ENDPOINT);
  const historyState = useRef(history.state);
  historyState.current = history.state;

  // Signature of what's on screen. Every poll returns a brand new array, so
  // without this the list would be replaced — and scrolled back to the bottom —
  // every few seconds even when nothing changed.
  const shownRef = useRef("");
  const [loadedOnce, setLoadedOnce] = useState(false);

  // Load the conversation the first time the panel opens, then poll for replies
  // while it stays open and the tab is in front.
  useEffect(() => {
    if (!open) return undefined;

    history.load(ENDPOINT);
    const timer = setInterval(() => {
      if (historyState.current === "idle" && !document.hidden) history.load(ENDPOINT);
    }, POLL_MS);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Live events (agent typing, new replies) come from our own server over SSE,
  // because Supportly's socket only accepts connections from its own origin.
  // EventSource can't send headers, so App Bridge's session token goes in the
  // query string — it expires in a minute, hence a fresh one per connect.
  useEffect(() => {
    if (!open) return undefined;

    let source = null;
    let retry = null;
    let stopped = false;

    const showTyping = (on) => {
      setAgentTyping(on);
      clearTimeout(typingOffRef.current);
      // Clear it ourselves if stop_typing never arrives.
      if (on) typingOffRef.current = setTimeout(() => setAgentTyping(false), 8000);
    };

    const connect = async () => {
      if (stopped) return;
      try {
        const token = await window.shopify?.idToken?.();
        if (!token || stopped) return;

        source = new EventSource(`${EVENTS}?id_token=${encodeURIComponent(token)}`);
        source.addEventListener("typing", (e) => showTyping(JSON.parse(e.data).typing));
        source.addEventListener("message", () => { showTyping(false); reloadRef.current(); });
        source.addEventListener("closed", () => reloadRef.current());
        source.onerror = () => {
          source?.close();
          showTyping(false);
          if (!stopped) retry = setTimeout(connect, 5000);
        };
      } catch {
        if (!stopped) retry = setTimeout(connect, 10000);
      }
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(retry);
      clearTimeout(typingOffRef.current);
      source?.close();
      setAgentTyping(false);
    };
  }, [open]);

  // Both the poll and a send come back with the full conversation, and either
  // can be the newer one — they're applied separately because a sent message
  // would otherwise pin the list to that one response forever.
  useEffect(() => {
    if (!history.data) return;
    setLoadedOnce(true);
    apply(history.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.data]);

  useEffect(() => {
    if (send.data) apply(send.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send.data]);

  function apply(data) {
    setError(data.ok ? null : data.error);
    if (!data.ok) return;

    const next = data.messages || [];
    const sig = next.map((m) => `${m.id}:${m.body}:${(m.attachments || []).length}`).join("|");
    if (sig === shownRef.current) return;

    shownRef.current = sig;
    setMessages(next);
  }

  // Only runs when the list actually changed, so an unchanged poll no longer
  // yanks the panel back down while the merchant is reading.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, agentTyping]);

  // Tell the agent we're typing, at most once every couple of seconds, and say
  // we stopped once the keyboard goes quiet.
  const pingTyping = (on) => {
    const fd = new FormData();
    fd.append("intent", "typing");
    fd.append("typing", on ? "1" : "0");
    fetch(ENDPOINT, { method: "post", body: fd }).catch(() => {});
  };

  const onDraftChange = (value) => {
    setDraft(value);

    if (Date.now() - typingSentAt.current > TYPING_IDLE_MS) {
      typingSentAt.current = Date.now();
      pingTyping(true);
    }

    clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      typingSentAt.current = 0;
      pingTyping(false);
    }, TYPING_IDLE_MS);
  };

  const stopTyping = () => {
    clearTimeout(typingStopTimer.current);
    if (typingSentAt.current) {
      typingSentAt.current = 0;
      pingTyping(false);
    }
  };

  const sending = send.state !== "idle";

  // Files go up one at a time through our own route — Supportly's /api/uploads
  // only allows its own origin, so the browser can't post there directly.
  const pickFiles = async (picked) => {
    if (!picked.length) return;
    setUploading(true);

    for (const file of picked) {
      const fd = new FormData();
      fd.append("intent", "upload");
      fd.append("file", file);

      try {
        const res = await fetch(ENDPOINT, { method: "post", body: fd });
        const data = await res.json();
        if (data.ok) setFiles((prev) => [...prev, data.attachment]);
        else setError(data.error);
      } catch {
        setError("Upload failed.");
      }
    }

    setUploading(false);
  };

  const submit = (e) => {
    e.preventDefault();
    const body = draft.trim();
    if ((!body && files.length === 0) || sending || uploading) return;

    // Show it straight away; the server's reply replaces the whole list.
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, body, fromVisitor: true, pending: true, attachments: files },
    ]);
    setDraft("");
    setFiles([]);
    stopTyping();
    send.submit(
      { body, attachments: JSON.stringify(files) },
      { method: "post", action: ENDPOINT },
    );
  };

  return (
    <>
      <style>{`
        .tr-chat-btn { position: fixed; right: 18px; bottom: 80px; z-index: 400; width: 60px; height: 60px;
          border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
          background: ${BRAND.blue}; color: #fff; box-shadow: 0 6px 18px rgba(42,116,201,.38);
          transition: transform .15s ease, box-shadow .15s ease; }
        .tr-chat-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(42,116,201,.48); }
        .tr-chat-btn:focus-visible { outline: 2px solid ${BRAND.navy}; outline-offset: 3px; }
button.tr-chat-btn svg {
    width: 30px !important;
    height: 30px !important;
}
        .tr-chat-panel { position: fixed; right: 18px; bottom: 120px; z-index: 401; width: 340px; max-width: calc(100vw - 36px);
          height: 440px; max-height: calc(100vh - 160px); background: #fff; border: 1px solid #E4E7EC; border-radius: 14px;
          box-shadow: 0 18px 44px rgba(16,24,40,.18); display: flex; flex-direction: column; overflow: hidden;
          font-family: var(--app-font-family); }
        .tr-chat-head { padding: 14px 16px; border-bottom: 1px solid #E4E7EC; display: flex; align-items: center;
          justify-content: space-between; gap: 8px; }
        .tr-chat-list { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
        .tr-chat-msg { max-width: 82%; padding: 9px 12px; border-radius: 12px; font-size: 13.5px; line-height: 1.45;
          white-space: pre-wrap; word-break: break-word; }
        .tr-chat-msg-me { align-self: flex-end; background: ${BRAND.blue}; color: #fff; border-bottom-right-radius: 4px; }
        .tr-chat-msg-them { align-self: flex-start; background: #F2F4F7; color: #101828; border-bottom-left-radius: 4px; }
        .tr-chat-form { border-top: 1px solid #E4E7EC; padding: 10px; display: flex; gap: 8px; align-items: flex-end; }
        .tr-chat-input { flex: 1; resize: none; border: 1px solid #D0D5DD; border-radius: 9px; padding: 9px 10px;
          font: inherit; font-size: 13.5px; line-height: 1.4; max-height: 90px; font-family: inherit; }
        .tr-chat-input:focus { outline: 2px solid ${BRAND.blueLight}; border-color: ${BRAND.blue}; }
        .tr-chat-send { border: none; border-radius: 9px; padding: 0 14px; height: 38px; cursor: pointer;
          background: ${BRAND.blue}; color: #fff; font: inherit; font-size: 13.5px; font-weight: 600; }
        .tr-chat-send:disabled { opacity: .55; cursor: default; }

        .tr-chat-attach { border: 1px solid #D0D5DD; background: #fff; border-radius: 9px; width: 38px; height: 38px;
          cursor: pointer; color: #475467; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .tr-chat-attach:disabled { opacity: .55; cursor: default; }
        .tr-chat-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 10px 0; }
        .tr-chat-chip { display: flex; align-items: center; gap: 6px; max-width: 150px; background: #F2F4F7;
          border-radius: 8px; padding: 4px 6px; font-size: 11.5px; color: #344054; }
        .tr-chat-chip img { width: 22px; height: 22px; object-fit: cover; border-radius: 4px; }
        .tr-chat-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tr-chat-chip button { border: none; background: none; cursor: pointer; color: #667085; font-size: 13px; line-height: 1; padding: 0; }
        .tr-chat-files { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
        .tr-chat-files img { max-width: 100%; border-radius: 8px; display: block; }
        .tr-chat-file { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px;
          color: inherit; text-decoration: underline; word-break: break-all; }

        .tr-chat-typing { align-self: flex-start; background: #F2F4F7; border-radius: 12px;
          border-bottom-left-radius: 4px; padding: 11px 12px; display: flex; gap: 4px; }
        .tr-chat-typing span { width: 6px; height: 6px; border-radius: 50%; background: #98A2B3;
          animation: tr-chat-bounce 1.2s infinite ease-in-out; }
        .tr-chat-typing span:nth-child(2) { animation-delay: .15s; }
        .tr-chat-typing span:nth-child(3) { animation-delay: .3s; }
        @keyframes tr-chat-bounce { 0%, 60%, 100% { opacity: .35; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); } }
        @media (prefers-reduced-motion: reduce) { .tr-chat-typing span { animation: none; } }
      `}</style>

      <button
        className="tr-chat-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close support chat" : "Open support chat"}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {open && (
        <div className="tr-chat-panel" role="dialog" aria-label="Support chat">
          <div className="tr-chat-head">
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: BRAND.navy }}>Support</div>
              <div style={{ fontSize: 12, color: "#667085" }}>We reply here — usually within a few hours.</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close support chat"
              style={{ border: "none", background: "none", cursor: "pointer", color: "#667085", fontSize: 18, lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          <div className="tr-chat-list" ref={listRef}>
            {messages.length === 0 && !error && (
              <div style={{ fontSize: 13, color: "#667085", margin: "auto 0", textAlign: "center" }}>
                {loadedOnce ? "Send us a message to start." : "Loading…"}
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`tr-chat-msg ${m.fromVisitor ? "tr-chat-msg-me" : "tr-chat-msg-them"}`}
                style={m.pending ? { opacity: 0.65 } : undefined}
              >
                {m.body}
                {(m.attachments || []).length > 0 && (
                  <div className="tr-chat-files">
                    {m.attachments.map((a) => (
                      <a key={a.url} href={a.url} target="_blank" rel="noreferrer"
                        className={a.mimetype.startsWith("image/") ? undefined : "tr-chat-file"}>
                        {a.mimetype.startsWith("image/")
                          ? <img src={a.url} alt={a.name} />
                          : `📄 ${a.name} (${fileSize(a.size)})`}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {agentTyping && (
              <div className="tr-chat-typing" aria-live="polite">
                <span /><span /><span />
              </div>
            )}

            {error && (
              <div style={{ fontSize: 12.5, color: "#B42318", lineHeight: 1.45 }}>{error}</div>
            )}
          </div>

          {(files.length > 0 || uploading) && (
            <div className="tr-chat-chips">
              {files.map((a, i) => (
                <div className="tr-chat-chip" key={`${a.url}-${i}`}>
                  {a.mimetype.startsWith("image/") && <img src={a.url} alt="" />}
                  <span title={a.name}>{a.name}</span>
                  <button type="button" aria-label={`Remove ${a.name}`}
                    onClick={() => setFiles((prev) => prev.filter((_, n) => n !== i))}>
                    ×
                  </button>
                </div>
              ))}
              {uploading && <div className="tr-chat-chip">Uploading…</div>}
            </div>
          )}

          <form className="tr-chat-form" onSubmit={submit}>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(e) => { pickFiles(Array.from(e.target.files || [])); e.target.value = ""; }}
            />
            <button
              type="button"
              className="tr-chat-attach"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || sending}
              aria-label="Attach a file"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 11.5l-8.8 8.8a5 5 0 0 1-7.1-7.1l9-9a3.3 3.3 0 0 1 4.7 4.7l-9 9a1.7 1.7 0 0 1-2.4-2.4l8.3-8.3"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <textarea
              className="tr-chat-input"
              rows={1}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onBlur={stopTyping}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter makes a new line.
                if (e.key === "Enter" && !e.shiftKey) submit(e);
              }}
              placeholder="Write a message…"
              aria-label="Message"
            />
            <button
              className="tr-chat-send"
              type="submit"
              disabled={sending || uploading || (!draft.trim() && files.length === 0)}
            >
              {sending ? "…" : "Send"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
