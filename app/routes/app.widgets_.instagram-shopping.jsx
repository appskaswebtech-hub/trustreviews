// app/routes/app.widgets_.instagram-shopping.jsx
// "Instagram & Facebook Videos" widget: connect an account, choose which reels /
// videos the storefront block shows. Route path kept so existing links work.
import { useEffect, useRef, useState } from "react";
import { Link, useFetcher, useLoaderData, useRevalidator } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { PROVIDERS, buildAuthUrl, disconnect, isProviderConfigured, syncVideos } from "../utils/social-video.server";
import { BRAND } from "../utils/brand";

const LABEL = { instagram: "Instagram", facebook: "Facebook" };

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const [connections, videos] = await Promise.all([
    db.socialConnection.findMany({ where: { shop } }),
    db.socialVideo.findMany({ where: { shop }, orderBy: { postedAt: "desc" }, take: 100 }),
  ]);
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  return {
    providers: PROVIDERS.map((p) => {
      const c = connections.find((x) => x.provider === p);
      return {
        provider: p,
        configured: isProviderConfigured(p),
        connected: Boolean(c),
        accountName: c?.accountName || "",
        lastSyncedAt: c?.lastSyncedAt ? c.lastSyncedAt.toISOString() : null,
        lastError: c?.lastError || "",
      };
    }),
    videos: videos.map((v) => ({
      id: v.id, provider: v.provider, caption: v.caption || "", thumb: v.thumbnailUrl,
      src: v.videoUrl, permalink: v.permalink, hidden: v.hidden,
    })),
    installUrl:
      `https://${shop}/admin/themes/current/editor` +
      `?template=index&addAppBlockId=${encodeURIComponent(apiKey)}/social-videos&target=newAppsSection`,
  };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const body = await request.json();
  const provider = PROVIDERS.includes(body.provider) ? body.provider : null;

  if (body.intent === "sync" && provider) {
    try { await syncVideos(shop, provider); return { ok: true }; }
    catch (err) { return { ok: false, message: err.message }; }
  }
  // The consent screen opens in a new tab that has no Shopify admin session, so
  // the URL is built here (authenticated) and the page opens it directly.
  if (body.intent === "connect" && provider) {
    try { return { ok: true, authUrl: await buildAuthUrl(shop, provider) }; }
    catch (err) { return { ok: false, message: err.message }; }
  }
  if (body.intent === "disconnect" && provider) {
    await disconnect(shop, provider);
    return { ok: true };
  }
  if (body.intent === "toggle") {
    await db.socialVideo.updateMany({ where: { id: Number(body.id), shop }, data: { hidden: Boolean(body.hidden) } });
    return { ok: true };
  }
  return { ok: false };
}

const C = { border: "#D5E6FB", text: BRAND.navy, muted: "#5B6B85" };
const card = { background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 7px 20px rgba(16,34,74,.05)" };
const btn = (bg, extra = {}) => ({ border: "none", borderRadius: 9, padding: "8px 16px", background: bg, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "none", display: "inline-block", ...extra });

function ProviderRow({ p }) {
  const fetcher = useFetcher();
  const busy = fetcher.state !== "idle";
  const submit = (intent) => fetcher.submit({ intent, provider: p.provider }, { method: "POST", encType: "application/json" });
  const popup = useRef(null);
  // Open the tab inside the click (so popup blockers allow it), point it at the
  // consent screen once the server has built the URL.
  const connect = () => {
    popup.current = window.open("about:blank", "_blank");
    submit("connect");
  };
  useEffect(() => {
    const d = fetcher.data;
    if (d?.authUrl && popup.current) { popup.current.location.href = d.authUrl; popup.current = null; }
    else if (d?.ok === false && popup.current) { popup.current.close(); popup.current = null; }
  }, [fetcher.data]);
  const err = (fetcher.data?.ok === false && fetcher.data.message) || p.lastError;
  return (
    <div style={{ padding: "14px 0", borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, color: C.text }}>{LABEL[p.provider]}</div>
          <div style={{ fontSize: 13, color: C.muted }}>
            {p.connected
              ? `Connected: ${p.accountName}${p.lastSyncedAt ? ` · synced ${new Date(p.lastSyncedAt).toLocaleString()}` : ""}`
              : p.configured ? "Not connected" : "Not available yet — the Meta app is not set up on this server."}
          </div>
        </div>
        {p.connected ? (
          <>
            <button disabled={busy} style={btn("#2A74C9")} onClick={() => submit("sync")}>{busy ? "Syncing…" : "Sync now"}</button>
            <button disabled={busy} style={btn("#c0392b")} onClick={() => window.confirm(`Disconnect ${LABEL[p.provider]}? Its videos will be removed from the widget.`) && submit("disconnect")}>Disconnect</button>
          </>
        ) : (
          <button
            disabled={!p.configured || busy}
            onClick={connect}
            style={btn(p.configured ? "#2A74C9" : "#9aa8bd", p.configured ? {} : { cursor: "not-allowed" })}
          >Connect {LABEL[p.provider]}</button>
        )}
      </div>
      {err && <div style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>{err}</div>}
    </div>
  );
}

function VideoTile({ v }) {
  const fetcher = useFetcher();
  const [hidden, setHidden] = useState(v.hidden);
  const toggle = () => {
    setHidden(!hidden);
    fetcher.submit({ intent: "toggle", id: v.id, hidden: !hidden }, { method: "POST", encType: "application/json" });
  };
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", opacity: hidden ? 0.5 : 1, background: "#fff" }}>
      <a href={v.permalink} target="_blank" rel="noreferrer" style={{ display: "block", aspectRatio: "9/16", background: "#111" }}>
        {v.thumb
          ? <img src={v.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <video src={v.src} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </a>
      <div style={{ padding: 10 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{LABEL[v.provider]}</div>
        <div style={{ fontSize: 13, color: C.text, height: 34, overflow: "hidden" }}>{v.caption || "—"}</div>
        <button onClick={toggle} style={btn(hidden ? "#1f7a4d" : "#6b7a90", { width: "100%", marginTop: 8, padding: "6px 10px" })}>
          {hidden ? "Show on store" : "Hide from store"}
        </button>
      </div>
    </div>
  );
}

export default function SocialVideosPage() {
  const { providers, videos, installUrl } = useLoaderData();
  const revalidator = useRevalidator();
  // The connect tab finishes in another window; refresh when the merchant comes back.
  useEffect(() => {
    const onFocus = () => revalidator.revalidate();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [revalidator]);

  const anyConnected = providers.some((p) => p.connected);

  return (
    <div style={{ minHeight: "100vh", background: "#EAF3FE", fontFamily: "var(--app-font-family)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 24px", height: 62, background: "#fff", borderBottom: `1px solid ${C.border}` }}>
        <Link to="/app/widgets" style={{ color: C.muted, textDecoration: "none", fontSize: 14 }}>Widgets</Link>
        <span style={{ color: "#B3C3CF" }}>/</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Instagram & Facebook Videos</span>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "26px 24px 34px" }}>
        <div style={card}>
          <h2 style={{ margin: "0 0 6px", fontSize: 22, color: C.text }}>Show your reels and videos on the store</h2>
          <p style={{ margin: "0 0 8px", color: C.muted, fontSize: 14, lineHeight: 1.65 }}>
            Connect your Instagram (Business or Creator account) and/or Facebook Page. Your latest reels and videos sync automatically; hide any you don't want shown.
          </p>
          {providers.map((p) => <ProviderRow key={p.provider} p={p} />)}
        </div>

        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Add to your store</div>
              <div style={{ fontSize: 13, color: C.muted }}>Adds the "Social Videos" block to your home page. Layout, columns and heading are set in the Theme Editor.</div>
            </div>
            <a href={installUrl} target="_top" style={btn("#2A74C9")}>Add to store</a>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Videos ({videos.length})</div>
          {videos.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 14 }}>
              {anyConnected ? "No videos found yet. Only video posts and reels are shown — try Sync now." : "Connect an account above to see your videos here."}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
              {videos.map((v) => <VideoTile key={v.id} v={v} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
