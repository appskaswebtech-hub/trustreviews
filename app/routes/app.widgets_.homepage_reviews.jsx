import { useState, useCallback } from "react";
import { useLoaderData, useFetcher, Link } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { LAYOUTS, PRO_LAYOUT_VALUES, DEFAULT_FREE_LAYOUT } from "../utils/homepageReviewLayouts";
import { hasAdvancedAccess } from "../utils/planGuard.server";

// ── Loader ────────────────────────────────────────────────────────────────────
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const widget = await db.widget.findUnique({
    where: { shop_widgetKey: { shop: session.shop, widgetKey: "homepage_reviews" } },
  });
  const isPro = await hasAdvancedAccess(session.shop);
  return { settings: widget || {}, isPro };
}

// ── Action ────────────────────────────────────────────────────────────────────
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const body = await request.json();

  const isPro = await hasAdvancedAccess(session.shop);

  let requestedLayout = body.layout || "summary_carousel";
  if (PRO_LAYOUT_VALUES.has(requestedLayout) && !isPro) {
    // Don't trust the client — a non-Pro shop can't persist a Pro-only layout
    // even if they bypass the UI gate and post the request directly.
    const existing = await db.widget.findUnique({ where: { shop_widgetKey: { shop: session.shop, widgetKey: "homepage_reviews" } } });
    requestedLayout = existing?.defaultStyle && !PRO_LAYOUT_VALUES.has(existing.defaultStyle) ? existing.defaultStyle : DEFAULT_FREE_LAYOUT;
  }

  const data = {
    // layout & display
    defaultStyle:    requestedLayout,
    maxReviews:      Number(body.maxReviews)     || 9,
    columns:         Number(body.columns)        || 3,
    // colors
    accentColor:     body.accentColor    || "#f59e0b",
    starColor:       body.starColor      || "#f59e0b",
    backgroundColor: body.pageBg         || "transparent",
    cardBackground:  body.cardBg         || "#ffffff",
    textColor:       body.textColor      || "#111111",
    borderColor:     body.cardBorder     || "#e5e5e5",
    // panel colors stored in existing fields (no migration needed)
    summaryPosition: body.panelBg        || "#111111",
    textAlign:       body.panelText      || "#ffffff",
    // typography
    fontFamily:      body.fontFamily     || "inherit",
    headingSize:     Number(body.headingSize)    || 36,
    reviewSize:      Number(body.reviewSize)     || 14,
    // card
    cardPadding:     Number(body.cardPadding)    || 20,
    borderRadius:    Number(body.cardRadius)     || 8,
    showShadow:      body.showShadow     !== false,
    cardGap:         Number(body.gap)            || 20,
    // heading
    heading:         body.headingText    || "Customer Reviews",
    // toggles
    showVerified:    body.showVerified   !== false,
    showAvatar:      body.showMedia      !== false,
    paddingTop:      Number(body.paddingTop)     || 60,
    paddingBottom:   Number(body.paddingBottom)  || 60,
  };

  await db.widget.upsert({
    where: { shop_widgetKey: { shop: session.shop, widgetKey: "homepage_reviews" } },
    create: { shop: session.shop, widgetKey: "homepage_reviews", ...data },
    update: data,
  });

  return { saved: true };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FONTS = [
  { value: "inherit",                   label: "Theme Default" },
  { value: "system-ui, sans-serif",     label: "System UI" },
  { value: "Georgia, serif",            label: "Georgia (Serif)" },
  { value: "'Courier New', monospace",  label: "Monospace" },
  { value: "'Arial', sans-serif",       label: "Arial" },
];

const DS = {
  layout: "summary_carousel", maxReviews: 9, columns: 3,
  accentColor: "#f59e0b", starColor: "#f59e0b",
  pageBg: "transparent", cardBg: "#ffffff", textColor: "#111111",
  cardBorder: "#e5e5e5", panelBg: "#111111", panelText: "#ffffff",
  fontFamily: "inherit", headingSize: 36, reviewSize: 14, nameSize: 14,
  cardPadding: 20, cardRadius: 8, showShadow: true, gap: 20,
  headingText: "Customer Reviews", headingAlign: "center",
  showVerified: true, showMedia: true, paddingTop: 60, paddingBottom: 60,
};

const C = {
  bg: "#f6f6f8", surface: "#fff", border: "#e5e4ec",
  text: "#17171c", muted: "#6b6b78", accent: "#4C6FFF",
  green: "#1f7a4d", greenLt: "#e7f4ec",
};

// ── Sample reviews for preview ────────────────────────────────────────────────
const SAMPLES = [
  { name: "Cora P.", rating: 5, text: "Used on my BMW 220i no problem!", verified: true, img: true },
  { name: "Russ S.", rating: 5, text: "Much better than the bulky locks I've had before. Quality stuff", verified: true, img: true },
  { name: "Jamie F.", rating: 5, text: "Solid bit of kit. Easy to use, no one's getting through this without a fight.", verified: true, img: true },
];

function StarRow({ rating, color, size }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }} className="tr-app-routes-app-widgets-homepage-reviews-span-1">
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= rating ? (color || "#f59e0b") : "#e0e0e0", fontSize: size || 14 }} className="tr-app-routes-app-widgets-homepage-reviews-span-2">★</span>
      ))}
    </span>
  );
}

function PreviewSummaryCar({ s }) {
  return (
    <div style={{ display: "flex", borderRadius: s.cardRadius, overflow: "hidden", boxShadow: s.showShadow ? "0 4px 20px rgba(0,0,0,.1)" : "none" }} className="tr-app-routes-app-widgets-homepage-reviews-div-3">
      <div style={{
        background: s.panelBg, color: s.panelText, minWidth: 150, padding: "28px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }} className="tr-app-routes-app-widgets-homepage-reviews-div-4">
        <div style={{ color: s.accentColor, fontWeight: 600, fontSize: 14 }} className="tr-app-routes-app-widgets-homepage-reviews-div-5">Excellent</div>
        <div style={{ fontSize: 18, letterSpacing: 2, color: "#fff" }} className="tr-app-routes-app-widgets-homepage-reviews-div-6">★★★★★</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.9)" }} className="tr-app-routes-app-widgets-homepage-reviews-div-7">4.9 average</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }} className="tr-app-routes-app-widgets-homepage-reviews-div-8">222 reviews</div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, padding: "0 4px", overflow: "hidden", background: s.pageBg === "transparent" ? "#fafafa" : s.pageBg }} className="tr-app-routes-app-widgets-homepage-reviews-div-9">
        <span style={{ fontSize: 24, cursor: "pointer", padding: "0 4px", color: s.textColor }} className="tr-app-routes-app-widgets-homepage-reviews-span-10">‹</span>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, padding: "12px 4px" }} className="tr-app-routes-app-widgets-homepage-reviews-div-11">
          {SAMPLES.map((r, i) => (
            <div key={i} style={{
              background: s.cardBg, border: `1px solid ${s.cardBorder}`, borderRadius: s.cardRadius,
              padding: s.cardPadding * 0.6, display: "flex", flexDirection: "column", gap: 6,
              boxShadow: s.showShadow ? "0 2px 8px rgba(0,0,0,.07)" : "none",
            }} className="tr-app-routes-app-widgets-homepage-reviews-div-12">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="tr-app-routes-app-widgets-homepage-reviews-div-13">
                <span style={{ fontWeight: 600, fontSize: 11, color: s.textColor }} className="tr-app-routes-app-widgets-homepage-reviews-span-14">{r.name}</span>
                <StarRow rating={r.rating} color={s.starColor} size={10} />
              </div>
              {s.showVerified && <div style={{ fontSize: 9, color: "#16a34a" }} className="tr-app-routes-app-widgets-homepage-reviews-div-15">✓ Verified purchase</div>}
              <div style={{ fontSize: 10, color: s.textColor === "#111111" ? "#444" : s.textColor, lineHeight: 1.4 }} className="tr-app-routes-app-widgets-homepage-reviews-div-16">{r.text.slice(0, 50)}…</div>
              {s.showMedia && r.img && <div style={{ width: 30, height: 30, background: "#ddd", borderRadius: 4 }}  className="tr-app-routes-app-widgets-homepage-reviews-div-17"/>}
            </div>
          ))}
        </div>
        <span style={{ fontSize: 24, cursor: "pointer", padding: "0 4px", color: s.textColor }} className="tr-app-routes-app-widgets-homepage-reviews-span-18">›</span>
      </div>
    </div>
  );
}

function PreviewGrid({ s }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: s.gap * 0.6 }} className="tr-app-routes-app-widgets-homepage-reviews-div-19">
      {SAMPLES.map((r, i) => (
        <div key={i} style={{
          background: s.cardBg, border: `1px solid ${s.cardBorder}`, borderRadius: s.cardRadius,
          padding: s.cardPadding * 0.6, display: "flex", flexDirection: "column", gap: 6,
          boxShadow: s.showShadow ? "0 2px 8px rgba(0,0,0,.07)" : "none",
        }} className="tr-app-routes-app-widgets-homepage-reviews-div-20">
          <div style={{ display: "flex", justifyContent: "space-between" }} className="tr-app-routes-app-widgets-homepage-reviews-div-21">
            <span style={{ fontWeight: 600, fontSize: 11, color: s.textColor }} className="tr-app-routes-app-widgets-homepage-reviews-span-22">{r.name}</span>
            <StarRow rating={r.rating} color={s.starColor} size={10} />
          </div>
          {s.showVerified && <div style={{ fontSize: 9, color: "#16a34a" }} className="tr-app-routes-app-widgets-homepage-reviews-div-23">✓ Verified purchase</div>}
          <div style={{ fontSize: 10, color: "#444", lineHeight: 1.4 }} className="tr-app-routes-app-widgets-homepage-reviews-div-24">{r.text.slice(0, 55)}…</div>
          {s.showMedia && r.img && <div style={{ width: 30, height: 30, background: "#ddd", borderRadius: 4 }}  className="tr-app-routes-app-widgets-homepage-reviews-div-25"/>}
        </div>
      ))}
    </div>
  );
}

function PreviewSpotlight({ s }) {
  return (
    <div style={{ display: "flex", gap: 28, alignItems: "center" }} className="tr-app-routes-app-widgets-homepage-reviews-div-26">
      <div style={{ background: s.panelBg, padding: "24px 20px", borderRadius: s.cardRadius, textAlign: "center", minWidth: 120 }} className="tr-app-routes-app-widgets-homepage-reviews-div-27">
        <div style={{ fontSize: 36, fontWeight: 600, color: "#fff", lineHeight: 1 }} className="tr-app-routes-app-widgets-homepage-reviews-div-28">4.9</div>
        <div style={{ fontSize: 16, color: s.accentColor, margin: "6px 0" }} className="tr-app-routes-app-widgets-homepage-reviews-div-29">★★★★★</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,.6)" }} className="tr-app-routes-app-widgets-homepage-reviews-div-30">Based on 222 reviews</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }} className="tr-app-routes-app-widgets-homepage-reviews-div-31">
        {SAMPLES.slice(0, 2).map((r, i) => (
          <div key={i} style={{ borderLeft: `3px solid ${s.accentColor}`, paddingLeft: 12 }} className="tr-app-routes-app-widgets-homepage-reviews-div-32">
            <div style={{ fontSize: 10, marginBottom: 3 }} className="tr-app-routes-app-widgets-homepage-reviews-div-33"><StarRow rating={r.rating} color={s.starColor} size={10} /></div>
            <div style={{ fontSize: 11, fontStyle: "italic", color: "#444", marginBottom: 4 }} className="tr-app-routes-app-widgets-homepage-reviews-div-34">"{r.text.slice(0, 60)}…"</div>
            <div style={{ fontSize: 10, color: "#888" }} className="tr-app-routes-app-widgets-homepage-reviews-div-35"><strong className="tr-app-routes-app-widgets-homepage-reviews-strong-36">{r.name}</strong> · ✓ Verified</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewTicker({ s }) {
  return (
    <div style={{ overflow: "hidden", padding: "8px 0", background: s.cardBg, border: `1px solid ${s.cardBorder}`, borderRadius: s.cardRadius }} className="tr-app-routes-app-widgets-homepage-reviews-div-37">
      <div style={{ display: "flex", gap: 14, padding: "4px 8px", whiteSpace: "nowrap" }} className="tr-app-routes-app-widgets-homepage-reviews-div-38">
        {[...SAMPLES, ...SAMPLES].map((r, i) => (
          <div key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 8, background: "#fafafa",
            border: `1px solid ${s.cardBorder}`, borderRadius: 40, padding: "6px 14px", fontSize: 10, whiteSpace: "nowrap",
          }} className="tr-app-routes-app-widgets-homepage-reviews-div-39">
            <StarRow rating={r.rating} color={s.starColor} size={10} />
            <strong style={{ color: s.textColor }} className="tr-app-routes-app-widgets-homepage-reviews-strong-40">{r.name}</strong>
            <span style={{ color: "#555" }} className="tr-app-routes-app-widgets-homepage-reviews-span-41">{r.text.slice(0, 35)}…</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Advanced-plan-only previews ────────────────────────────────────────────────
function PreviewHeroBanner({ s }) {
  return (
    <div style={{ background: s.panelBg, borderRadius: s.cardRadius, padding: "32px 24px", textAlign: "center", color: "#fff" }} className="tr-app-routes-app-widgets-homepage-reviews-div-42">
      <div style={{ fontSize: 44, fontWeight: 600, lineHeight: 1 }} className="tr-app-routes-app-widgets-homepage-reviews-div-43">4.9<span style={{ fontSize: 18, opacity: .6 }} className="tr-app-routes-app-widgets-homepage-reviews-span-44">/5</span></div>
      <div style={{ fontSize: 18, color: s.accentColor, margin: "8px 0" }} className="tr-app-routes-app-widgets-homepage-reviews-div-45">★★★★★</div>
      <div style={{ fontSize: 12, opacity: .75, marginBottom: 16 }} className="tr-app-routes-app-widgets-homepage-reviews-div-46">from 222 happy customers</div>
      <button style={{ background: s.accentColor, color: "#111", border: "none", borderRadius: 20, padding: "8px 20px", fontSize: 12, fontWeight: 600 }} className="tr-app-routes-app-widgets-homepage-reviews-button-47">See all reviews</button>
    </div>
  );
}

function PreviewSplitScreen({ s }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="tr-app-routes-app-widgets-homepage-reviews-div-48">
      {SAMPLES.slice(0, 2).map((r, i) => (
        <div key={i} style={{ display: "flex", flexDirection: i % 2 ? "row-reverse" : "row", gap: 16, alignItems: "center", background: s.cardBg, border: `1px solid ${s.cardBorder}`, borderRadius: s.cardRadius, overflow: "hidden" }} className="tr-app-routes-app-widgets-homepage-reviews-div-49">
          <div style={{ width: 90, height: 90, background: "#ddd", flexShrink: 0 }}  className="tr-app-routes-app-widgets-homepage-reviews-div-50"/>
          <div style={{ padding: "8px 14px" }} className="tr-app-routes-app-widgets-homepage-reviews-div-51">
            <StarRow rating={r.rating} color={s.starColor} size={11} />
            <div style={{ fontSize: 11, color: "#444", margin: "4px 0" }} className="tr-app-routes-app-widgets-homepage-reviews-div-52">{r.text.slice(0, 60)}…</div>
            <strong style={{ fontSize: 11, color: s.textColor }} className="tr-app-routes-app-widgets-homepage-reviews-strong-53">{r.name}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewMarqueeStrip({ s }) {
  return (
    <div style={{ overflow: "hidden", padding: "10px 0", borderTop: `1px solid ${s.cardBorder}`, borderBottom: `1px solid ${s.cardBorder}` }} className="tr-app-routes-app-widgets-homepage-reviews-div-54">
      <div style={{ display: "flex", gap: 28, whiteSpace: "nowrap" }} className="tr-app-routes-app-widgets-homepage-reviews-div-55">
        {[...SAMPLES, ...SAMPLES].map((r, i) => (
          <span key={i} style={{ fontSize: 11, color: s.textColor }} className="tr-app-routes-app-widgets-homepage-reviews-span-56">
            <StarRow rating={r.rating} color={s.starColor} size={10} /> "{r.text.slice(0, 40)}" — {r.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function PreviewVideoShowcase({ s }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: s.gap * 0.6 }} className="tr-app-routes-app-widgets-homepage-reviews-div-57">
      {SAMPLES.map((r, i) => (
        <div key={i} style={{ position: "relative", borderRadius: s.cardRadius, overflow: "hidden", aspectRatio: "4/3", background: "linear-gradient(135deg,#444,#181818)", display: "flex", alignItems: "center", justifyContent: "center" }} className="tr-app-routes-app-widgets-homepage-reviews-div-58">
          <span style={{ fontSize: 22, color: "rgba(255,255,255,.5)" }} className="tr-app-routes-app-widgets-homepage-reviews-span-59">▶</span>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "6px 8px", background: "linear-gradient(transparent,rgba(0,0,0,.75))", color: "#fff" }} className="tr-app-routes-app-widgets-homepage-reviews-div-60">
            <StarRow rating={r.rating} color={s.starColor} size={9} />
            <div style={{ fontSize: 9, fontWeight: 600 }} className="tr-app-routes-app-widgets-homepage-reviews-div-61">{r.name}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewStackedCards({ s }) {
  return (
    <div style={{ position: "relative", height: 150, maxWidth: 320, margin: "0 auto" }} className="tr-app-routes-app-widgets-homepage-reviews-div-62">
      {SAMPLES.map((r, i) => (
        <div key={i} style={{
          position: "absolute", top: i * 10, left: i * 14, right: -(i * 14), width: `calc(100% - ${i * 14}px)`,
          background: s.cardBg, border: `1px solid ${s.cardBorder}`, borderRadius: s.cardRadius,
          padding: s.cardPadding * 0.6, boxShadow: "0 6px 16px rgba(0,0,0,.1)", zIndex: SAMPLES.length - i,
        }} className="tr-app-routes-app-widgets-homepage-reviews-div-63">
          <StarRow rating={r.rating} color={s.starColor} size={11} />
          <div style={{ fontSize: 11, color: "#444", margin: "4px 0" }} className="tr-app-routes-app-widgets-homepage-reviews-div-64">{r.text.slice(0, 55)}…</div>
          <strong style={{ fontSize: 11, color: s.textColor }} className="tr-app-routes-app-widgets-homepage-reviews-strong-65">{r.name}</strong>
        </div>
      ))}
    </div>
  );
}

function PreviewStatsDashboard({ s }) {
  const stats = [
    { label: "Average rating", value: "4.9" },
    { label: "Total reviews", value: "222" },
    { label: "5-star", value: "94%" },
  ];
  return (
    <div className="tr-app-routes-app-widgets-homepage-reviews-div-66">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }} className="tr-app-routes-app-widgets-homepage-reviews-div-67">
        {stats.map((st) => (
          <div key={st.label} style={{ background: s.cardBg, border: `1px solid ${s.cardBorder}`, borderRadius: s.cardRadius, padding: "12px 10px", textAlign: "center" }} className="tr-app-routes-app-widgets-homepage-reviews-div-68">
            <div style={{ fontSize: 20, fontWeight: 600, color: s.accentColor }} className="tr-app-routes-app-widgets-homepage-reviews-div-69">{st.value}</div>
            <div style={{ fontSize: 10, color: "#888" }} className="tr-app-routes-app-widgets-homepage-reviews-div-70">{st.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: s.gap * 0.6 }} className="tr-app-routes-app-widgets-homepage-reviews-div-71">
        {SAMPLES.map((r, i) => (
          <div key={i} style={{ background: s.cardBg, border: `1px solid ${s.cardBorder}`, borderRadius: s.cardRadius, padding: s.cardPadding * 0.6 }} className="tr-app-routes-app-widgets-homepage-reviews-div-72">
            <StarRow rating={r.rating} color={s.starColor} size={10} />
            <div style={{ fontSize: 10, color: "#444", marginTop: 4 }} className="tr-app-routes-app-widgets-homepage-reviews-div-73">{r.text.slice(0, 45)}…</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewAccordionPanels({ s }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }} className="tr-app-routes-app-widgets-homepage-reviews-div-74">
      {SAMPLES.map((r, i) => (
        <div key={i} style={{ border: `1px solid ${s.cardBorder}`, borderRadius: s.cardRadius, overflow: "hidden" }} className="tr-app-routes-app-widgets-homepage-reviews-div-75">
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: s.cardBg }} className="tr-app-routes-app-widgets-homepage-reviews-div-76">
            <StarRow rating={r.rating} color={s.starColor} size={11} />
            <strong style={{ fontSize: 11, color: s.textColor }} className="tr-app-routes-app-widgets-homepage-reviews-strong-77">{r.name}</strong>
            <span style={{ marginLeft: "auto", color: s.textColor }} className="tr-app-routes-app-widgets-homepage-reviews-span-78">{i === 0 ? "▴" : "▾"}</span>
          </div>
          {i === 0 && <div style={{ padding: "0 14px 12px", fontSize: 11, color: "#444" }} className="tr-app-routes-app-widgets-homepage-reviews-div-79">{r.text}</div>}
        </div>
      ))}
    </div>
  );
}

function PreviewStoryCircles({ s }) {
  return (
    <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }} className="tr-app-routes-app-widgets-homepage-reviews-div-80">
      {SAMPLES.map((r, i) => (
        <div key={i} style={{ textAlign: "center" }} className="tr-app-routes-app-widgets-homepage-reviews-div-81">
          <div style={{
            width: 64, height: 64, borderRadius: "50%", border: `3px solid ${s.accentColor}`, padding: 3,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px",
          }} className="tr-app-routes-app-widgets-homepage-reviews-div-82">
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#ddd" }}  className="tr-app-routes-app-widgets-homepage-reviews-div-83"/>
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: s.textColor }} className="tr-app-routes-app-widgets-homepage-reviews-div-84">{r.name}</div>
          <StarRow rating={r.rating} color={s.starColor} size={9} />
        </div>
      ))}
    </div>
  );
}

function LivePreview({ s }) {
  const PreviewMap = {
    summary_carousel: PreviewSummaryCar,
    grid: PreviewGrid,
    masonry: PreviewGrid,
    spotlight: PreviewSpotlight,
    ticker: PreviewTicker,
    hero_banner: PreviewHeroBanner,
    split_screen: PreviewSplitScreen,
    marquee_strip: PreviewMarqueeStrip,
    video_showcase: PreviewVideoShowcase,
    stacked_cards: PreviewStackedCards,
    stats_dashboard: PreviewStatsDashboard,
    accordion_panels: PreviewAccordionPanels,
    story_circles: PreviewStoryCircles,
  };
  const Preview = PreviewMap[s.layout] || PreviewSummaryCar;

  return (
    <div style={{ background: s.pageBg === "transparent" ? "#f8f8f8" : s.pageBg, padding: 24, borderRadius: 10, border: `1px solid ${C.border}` }} className="tr-app-routes-app-widgets-homepage-reviews-div-85">
      <div style={{
        textAlign: s.headingAlign, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase",
        fontSize: Math.min(s.headingSize, 28) * 0.7, color: s.textColor, marginBottom: 20, fontFamily: s.fontFamily,
      }} className="tr-app-routes-app-widgets-homepage-reviews-div-86">
        {s.headingText || "Customer Reviews"}
      </div>
      <Preview s={s} />
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }} className="tr-app-routes-app-widgets-homepage-reviews-div-87">
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }} className="tr-app-routes-app-widgets-homepage-reviews-label-88">{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }} className="tr-app-routes-app-widgets-homepage-reviews-div-89">{hint}</div>}
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="tr-app-routes-app-widgets-homepage-reviews-div-90">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 36, height: 36, border: "none", background: "none", cursor: "pointer", padding: 0 }}  className="tr-app-routes-app-widgets-homepage-reviews-input-91"/>
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{ flex: 1, padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontFamily: "monospace" }}  className="tr-app-routes-app-widgets-homepage-reviews-input-92"/>
      </div>
    </Field>
  );
}

function Section({ title, children, open, onToggle }) {
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }} className="tr-app-routes-app-widgets-homepage-reviews-div-93">
      <button onClick={onToggle} style={{
        width: "100%", textAlign: "left", padding: "14px 16px", background: "none", border: "none",
        cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 13, fontWeight: 600, color: C.text,
      }} className="tr-app-routes-app-widgets-homepage-reviews-button-94">
        {title}
        <span style={{ fontSize: 16, color: C.muted, transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0)" }} className="tr-app-routes-app-widgets-homepage-reviews-span-95">▾</span>
      </button>
      {open && <div style={{ padding: "0 16px 16px" }} className="tr-app-routes-app-widgets-homepage-reviews-div-96">{children}</div>}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomepageReviewsSettings() {
  const { settings, isPro } = useLoaderData();
  const fetcher = useFetcher();
  const saved = fetcher.data?.saved;
  const [showProUpsell, setShowProUpsell] = useState(false);

  const [s, setS] = useState({
    ...DS,
    layout:        settings.defaultStyle    || DS.layout,
    maxReviews:    settings.maxReviews      || DS.maxReviews,
    columns:       settings.columns         || DS.columns,
    accentColor:   settings.accentColor     || DS.accentColor,
    starColor:     settings.starColor       || DS.starColor,
    pageBg:        settings.backgroundColor || DS.pageBg,
    cardBg:        settings.cardBackground  || DS.cardBg,
    textColor:     settings.textColor       || DS.textColor,
    cardBorder:    settings.borderColor     || DS.cardBorder,
    fontFamily:    settings.fontFamily      || DS.fontFamily,
    headingSize:   settings.headingSize     || DS.headingSize,
    reviewSize:    settings.reviewSize      || DS.reviewSize,
    cardPadding:   settings.cardPadding     || DS.cardPadding,
    cardRadius:    settings.borderRadius    || DS.cardRadius,
    showShadow:    settings.showShadow      !== false,
    gap:           settings.cardGap         || DS.gap,
    headingText:   settings.heading         || DS.headingText,
    showVerified:  settings.showVerified    !== false,
    showMedia:     settings.showAvatar      !== false,
    paddingTop:    settings.paddingTop      || DS.paddingTop,
    paddingBottom: settings.paddingBottom   || DS.paddingBottom,
    panelBg:       settings.summaryPosition || DS.panelBg,
    panelText:     settings.textAlign      || DS.panelText,
  });

  const upd = useCallback((key, val) => setS(prev => ({ ...prev, [key]: val })), []);

  const selectLayout = (key) => {
    if (PRO_LAYOUT_VALUES.has(key) && !isPro) {
      setShowProUpsell(true);
      return;
    }
    setShowProUpsell(false);
    upd("layout", key);
  };

  const [open, setOpen] = useState("layout");
  const toggle = k => setOpen(prev => prev === k ? null : k);

  const save = () => {
    if (PRO_LAYOUT_VALUES.has(s.layout) && !isPro) {
      setShowProUpsell(true);
      return;
    }
    fetcher.submit(JSON.stringify(s), {
      method: "POST",
      encType: "application/json",
      action: "/app/widgets/homepage_reviews",
    });
  };

  return (
    // <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "var(--app-font-family)" }} className="tr-app-routes-app-widgets-homepage-reviews-div-97">
    //   {/* Top bar */}
    //   <div style={{
    //     height: 54, background: C.surface, borderBottom: `1px solid ${C.border}`,
    //     display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px",
    //     position: "sticky", top: 0, zIndex: 10,
    //   }} className="tr-app-routes-app-widgets-homepage-reviews-div-98">
    //     <div style={{ display: "flex", alignItems: "center", gap: 12 }} className="tr-app-routes-app-widgets-homepage-reviews-div-99">
    //       <Link to="/app/widgets" style={{ color: C.muted, textDecoration: "none", fontSize: 13 }}>← Widgets</Link>
    //       <span style={{ color: C.border }} className="tr-app-routes-app-widgets-homepage-reviews-span-100">|</span>
    //       <span style={{ fontWeight: 600, fontSize: 15, color: C.text }} className="tr-app-routes-app-widgets-homepage-reviews-span-101">Homepage Reviews</span>
    //     </div>
    //     <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="tr-app-routes-app-widgets-homepage-reviews-div-102">
    //       {saved && <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }} className="tr-app-routes-app-widgets-homepage-reviews-span-103">✓ Saved</span>}
    //       <button onClick={save} disabled={fetcher.state !== "idle"} style={{
    //         background: C.accent, color: "#fff", border: "none", borderRadius: 8,
    //         padding: "8px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer",
    //       }} className="tr-app-routes-app-widgets-homepage-reviews-button-104">
    //         {fetcher.state !== "idle" ? "Saving…" : "Save"}
    //       </button>
    //     </div>
    //   </div>

    //   <div style={{ display: "flex", height: "calc(100vh - 54px)" }} className="tr-app-routes-app-widgets-homepage-reviews-div-105">
    //     {/* Settings sidebar */}
    //     <div style={{ width: 280, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, overflowY: "auto" }} className="tr-app-routes-app-widgets-homepage-reviews-div-106">

    //       <Section title="Layout" open={open === "layout"} onToggle={() => toggle("layout")}>
    //         <div style={{ display: "flex", flexDirection: "column", gap: 8 }} className="tr-app-routes-app-widgets-homepage-reviews-div-107">
    //           {LAYOUTS.map(l => (
    //             <button key={l.key} onClick={() => selectLayout(l.key)} style={{
    //               padding: "10px 12px", border: `2px solid ${s.layout === l.key ? C.accent : C.border}`,
    //               borderRadius: 8, background: s.layout === l.key ? "#f5f3ff" : C.surface,
    //               cursor: "pointer", textAlign: "left",
    //             }} className="tr-app-routes-app-widgets-homepage-reviews-button-108">
    //               <div style={{ fontWeight: 600, fontSize: 12, color: s.layout === l.key ? C.accent : C.text }} className="tr-app-routes-app-widgets-homepage-reviews-div-109">
    //                 {l.label}{l.pro ? " (Advanced)" : ""}
    //               </div>
    //               <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }} className="tr-app-routes-app-widgets-homepage-reviews-div-110">{l.desc}</div>
    //             </button>
    //           ))}
    //         </div>
    //         {showProUpsell && (
    //           <div style={{
    //             marginTop: 10, background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8,
    //             padding: "10px 12px", fontSize: 12, color: "#92400e",
    //           }} className="tr-app-routes-app-widgets-homepage-reviews-div-111">
    //             This layout needs the Advanced plan. <Link to="/app/billing" style={{ fontWeight: 600, color: "#92400e" }}>Upgrade →</Link>
    //           </div>
    //         )}
    //       </Section>

    //       <Section title="Heading" open={open === "heading"} onToggle={() => toggle("heading")}>
    //         <Field label="Heading Text">
    //           <input value={s.headingText} onChange={e => upd("headingText", e.target.value)}
    //             style={{ width: "100%", padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}  className="tr-app-routes-app-widgets-homepage-reviews-input-112"/>
    //         </Field>
    //         <Field label={`Heading Size: ${s.headingSize}px`}>
    //           <input type="range" min={18} max={64} value={s.headingSize} onChange={e => upd("headingSize", +e.target.value)} style={{ width: "100%" }}  className="tr-app-routes-app-widgets-homepage-reviews-input-113"/>
    //         </Field>
    //         <Field label="Heading Alignment">
    //           <div style={{ display: "flex", gap: 6 }} className="tr-app-routes-app-widgets-homepage-reviews-div-114">
    //             {["left","center","right"].map(a => (
    //               <button key={a} onClick={() => upd("headingAlign", a)} style={{
    //                 flex: 1, padding: "6px 0", fontSize: 11, fontWeight: 600,
    //                 border: `1px solid ${s.headingAlign === a ? C.accent : C.border}`,
    //                 background: s.headingAlign === a ? "#f5f3ff" : "transparent",
    //                 color: s.headingAlign === a ? C.accent : C.muted, borderRadius: 6, cursor: "pointer",
    //               }} className="tr-app-routes-app-widgets-homepage-reviews-button-115">{a[0].toUpperCase() + a.slice(1)}</button>
    //             ))}
    //           </div>
    //         </Field>
    //       </Section>

    //       <Section title="Colors" open={open === "colors"} onToggle={() => toggle("colors")}>
    //         <ColorField label="Accent / Star Color" value={s.accentColor} onChange={v => { upd("accentColor", v); upd("starColor", v); }} />
    //         <ColorField label="Page Background" value={s.pageBg === "transparent" ? "#ffffff" : s.pageBg} onChange={v => upd("pageBg", v)} />
    //         <ColorField label="Card Background" value={s.cardBg} onChange={v => upd("cardBg", v)} />
    //         <ColorField label="Text Color" value={s.textColor} onChange={v => upd("textColor", v)} />
    //         <ColorField label="Card Border Color" value={s.cardBorder} onChange={v => upd("cardBorder", v)} />
    //         {(s.layout === "summary_carousel" || s.layout === "spotlight") && (
    //           <ColorField label="Panel Background" value={s.panelBg} onChange={v => upd("panelBg", v)} />
    //         )}
    //       </Section>

    //       <Section title="Cards" open={open === "cards"} onToggle={() => toggle("cards")}>
    //         <Field label={`Card Padding: ${s.cardPadding}px`}>
    //           <input type="range" min={8} max={40} value={s.cardPadding} onChange={e => upd("cardPadding", +e.target.value)} style={{ width: "100%" }}  className="tr-app-routes-app-widgets-homepage-reviews-input-116"/>
    //         </Field>
    //         <Field label={`Border Radius: ${s.cardRadius}px`}>
    //           <input type="range" min={0} max={24} value={s.cardRadius} onChange={e => upd("cardRadius", +e.target.value)} style={{ width: "100%" }}  className="tr-app-routes-app-widgets-homepage-reviews-input-117"/>
    //         </Field>
    //         <Field label={`Gap Between Cards: ${s.gap}px`}>
    //           <input type="range" min={8} max={40} value={s.gap} onChange={e => upd("gap", +e.target.value)} style={{ width: "100%" }}  className="tr-app-routes-app-widgets-homepage-reviews-input-118"/>
    //         </Field>
    //         <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }} className="tr-app-routes-app-widgets-homepage-reviews-div-119">
    //           <span style={{ fontSize: 12, fontWeight: 600, color: C.text }} className="tr-app-routes-app-widgets-homepage-reviews-span-120">Card Shadow</span>
    //           <button onClick={() => upd("showShadow", !s.showShadow)} style={{
    //             width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
    //             background: s.showShadow ? C.accent : "#ccc", position: "relative", transition: "background .2s",
    //           }} className="tr-app-routes-app-widgets-homepage-reviews-button-121">
    //             <span style={{
    //               position: "absolute", top: 3, left: s.showShadow ? 22 : 2,
    //               width: 18, height: 18, background: "#fff", borderRadius: "50%", transition: "left .2s",
    //             }}  className="tr-app-routes-app-widgets-homepage-reviews-span-122"/>
    //           </button>
    //         </div>
    //       </Section>

    //       <Section title="Typography" open={open === "typo"} onToggle={() => toggle("typo")}>
    //         <Field label="Font Family">
    //           <select value={s.fontFamily} onChange={e => upd("fontFamily", e.target.value)}
    //             style={{ width: "100%", padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13 }} className="tr-app-routes-app-widgets-homepage-reviews-select-123">
    //             {FONTS.map(f => <option key={f.value} value={f.value} className="tr-app-routes-app-widgets-homepage-reviews-option-124">{f.label}</option>)}
    //           </select>
    //         </Field>
    //         <Field label={`Review Text Size: ${s.reviewSize}px`}>
    //           <input type="range" min={11} max={20} value={s.reviewSize} onChange={e => upd("reviewSize", +e.target.value)} style={{ width: "100%" }}  className="tr-app-routes-app-widgets-homepage-reviews-input-125"/>
    //         </Field>
    //       </Section>

    //       <Section title="Display" open={open === "display"} onToggle={() => toggle("display")}>
    //         <Field label={`Max Reviews: ${s.maxReviews}`}>
    //           <input type="range" min={3} max={24} step={3} value={s.maxReviews} onChange={e => upd("maxReviews", +e.target.value)} style={{ width: "100%" }}  className="tr-app-routes-app-widgets-homepage-reviews-input-126"/>
    //         </Field>
    //         <Field label={`Columns: ${s.columns}`}>
    //           <input type="range" min={1} max={4} value={s.columns} onChange={e => upd("columns", +e.target.value)} style={{ width: "100%" }}  className="tr-app-routes-app-widgets-homepage-reviews-input-127"/>
    //         </Field>
    //         {[
    //           { key: "showVerified", label: "Show Verified Badge" },
    //           { key: "showMedia",    label: "Show Review Images" },
    //         ].map(({ key, label }) => (
    //           <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }} className="tr-app-routes-app-widgets-homepage-reviews-div-128">
    //             <span style={{ fontSize: 12, fontWeight: 600, color: C.text }} className="tr-app-routes-app-widgets-homepage-reviews-span-129">{label}</span>
    //             <button onClick={() => upd(key, !s[key])} style={{
    //               width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
    //               background: s[key] ? C.accent : "#ccc", position: "relative", transition: "background .2s",
    //             }} className="tr-app-routes-app-widgets-homepage-reviews-button-130">
    //               <span style={{
    //                 position: "absolute", top: 3, left: s[key] ? 22 : 2,
    //                 width: 18, height: 18, background: "#fff", borderRadius: "50%", transition: "left .2s",
    //               }}  className="tr-app-routes-app-widgets-homepage-reviews-span-131"/>
    //             </button>
    //           </div>
    //         ))}
    //       </Section>

    //       <Section title="Spacing" open={open === "spacing"} onToggle={() => toggle("spacing")}>
    //         <Field label={`Top Padding: ${s.paddingTop}px`}>
    //           <input type="range" min={0} max={120} step={4} value={s.paddingTop} onChange={e => upd("paddingTop", +e.target.value)} style={{ width: "100%" }}  className="tr-app-routes-app-widgets-homepage-reviews-input-132"/>
    //         </Field>
    //         <Field label={`Bottom Padding: ${s.paddingBottom}px`}>
    //           <input type="range" min={0} max={120} step={4} value={s.paddingBottom} onChange={e => upd("paddingBottom", +e.target.value)} style={{ width: "100%" }}  className="tr-app-routes-app-widgets-homepage-reviews-input-133"/>
    //         </Field>
    //       </Section>

    //       {/* Install guide */}
    //       <div style={{ padding: 16, background: "#f5f3ff", margin: 12, borderRadius: 8 }} className="tr-app-routes-app-widgets-homepage-reviews-div-134">
    //         <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 6 }} className="tr-app-routes-app-widgets-homepage-reviews-div-135">How to add to your home page</div>
    //         <ol style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: C.text, lineHeight: 1.8 }} className="tr-app-routes-app-widgets-homepage-reviews-ol-136">
    //           <li className="tr-app-routes-app-widgets-homepage-reviews-li-137">Go to Shopify Admin → Online Store → Themes</li>
    //           <li className="tr-app-routes-app-widgets-homepage-reviews-li-138">Click Customize → Home page</li>
    //           <li className="tr-app-routes-app-widgets-homepage-reviews-li-139">Click "Add section" → Choose "Homepage Reviews"</li>
    //           <li className="tr-app-routes-app-widgets-homepage-reviews-li-140">Save — settings from this page apply automatically</li>
    //         </ol>
    //       </div>
    //     </div>

    //     {/* Preview */}
    //     <div style={{ flex: 1, overflowY: "auto", padding: 32, background: C.bg }} className="tr-app-routes-app-widgets-homepage-reviews-div-141">
    //       <div style={{ maxWidth: 900, margin: "0 auto" }} className="tr-app-routes-app-widgets-homepage-reviews-div-142">
    //         <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, textAlign: "right" }} className="tr-app-routes-app-widgets-homepage-reviews-div-143">Live preview · sample data</div>
    //         <LivePreview s={s} />
    //         <div style={{ marginTop: 24, padding: 16, background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }} className="tr-app-routes-app-widgets-homepage-reviews-div-144">
    //           <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }} className="tr-app-routes-app-widgets-homepage-reviews-div-145">{LAYOUTS.length} Layout Designs Available</div>
    //           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10 }} className="tr-app-routes-app-widgets-homepage-reviews-div-146">
    //             {LAYOUTS.map(l => (
    //               <button key={l.key} onClick={() => selectLayout(l.key)} style={{
    //                 position: "relative", padding: "10px 8px", borderRadius: 8, border: `2px solid ${s.layout === l.key ? C.accent : C.border}`,
    //                 background: s.layout === l.key ? "#f5f3ff" : C.surface, cursor: "pointer", textAlign: "center",
    //               }} className="tr-app-routes-app-widgets-homepage-reviews-button-147">
    //                 {l.pro && !isPro && <span style={{ position: "absolute", top: 4, right: 4, fontSize: 9, fontWeight: 600, color: "#92400e", background: "#f7f0e2", borderRadius: 4, padding: "1px 4px" }} className="tr-app-routes-app-widgets-homepage-reviews-span-148">Pro</span>}
    //                 <div style={{ fontSize: 20, marginBottom: 4 }} className="tr-app-routes-app-widgets-homepage-reviews-div-149">{l.icon}</div>
    //                 <div style={{ fontSize: 10, fontWeight: 600, color: s.layout === l.key ? C.accent : C.text }} className="tr-app-routes-app-widgets-homepage-reviews-div-150">{l.label}</div>
    //               </button>
    //             ))}
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // </div>
    <div
  style={{
    minHeight: "100vh",
    background: "#F2F7FB",
    fontFamily: "var(--app-font-family)",
    color: "#4F7392",
  }}
  className="tr-app-routes-app-widgets-homepage-reviews-div-97"
>
  <style>{`
    .tr-homepage-reviews-workspace{
      display:grid !important;
      grid-template-columns:330px minmax(0,1fr) !important;
      min-height:calc(100dvh - 68px) !important;
      align-items:stretch !important;
    }

    .tr-app-routes-app-widgets-homepage-reviews-div-106{
      width:330px !important;
      min-width:330px !important;
      max-width:330px !important;
      height:calc(100dvh - 68px) !important;
      overflow-y:auto !important;
      position:sticky !important;
      top:68px !important;
    }

    .tr-app-routes-app-widgets-homepage-reviews-div-141{
      min-width:0 !important;
      width:100% !important;
      height:calc(100dvh - 68px) !important;
      overflow:auto !important;
    }

    .tr-homepage-review-control:focus,
    .tr-app-routes-app-widgets-homepage-reviews-select-123:focus{
      border-color:#8DB4D6 !important;
      box-shadow:0 0 0 3px rgba(141,180,214,.16) !important;
    }

    .tr-homepage-layout-button:hover,
    .tr-homepage-layout-preview-button:hover{
      transform:translateY(-1px);
      border-color:#B7D1E4 !important;
      box-shadow:0 7px 18px rgba(79,115,146,.09) !important;
    }

    .tr-homepage-reviews-save:hover:not(:disabled){
      transform:translateY(-1px);
      box-shadow:0 9px 22px rgba(79,115,146,.24) !important;
    }

    .tr-app-routes-app-widgets-homepage-reviews-div-106::-webkit-scrollbar,
    .tr-app-routes-app-widgets-homepage-reviews-div-141::-webkit-scrollbar{
      width:7px;
      height:7px;
    }

    .tr-app-routes-app-widgets-homepage-reviews-div-106::-webkit-scrollbar-thumb,
    .tr-app-routes-app-widgets-homepage-reviews-div-141::-webkit-scrollbar-thumb{
      background:#C8DBE8;
      border-radius:20px;
    }

    @media(max-width:900px){
      .tr-homepage-reviews-workspace{
        grid-template-columns:290px minmax(0,1fr) !important;
      }

      .tr-app-routes-app-widgets-homepage-reviews-div-106{
        width:290px !important;
        min-width:290px !important;
        max-width:290px !important;
      }

      .tr-app-routes-app-widgets-homepage-reviews-div-141{
        padding:22px 16px !important;
      }
    }

    @media(max-width:767px){
      .tr-app-routes-app-widgets-homepage-reviews-div-98{
        position:relative !important;
        top:auto !important;
        padding:12px 14px !important;
      }

      .tr-homepage-reviews-workspace{
        display:block !important;
        min-height:auto !important;
      }

      .tr-app-routes-app-widgets-homepage-reviews-div-106{
        width:100% !important;
        min-width:0 !important;
        max-width:none !important;
        height:auto !important;
        max-height:none !important;
        position:relative !important;
        top:auto !important;
        overflow:visible !important;
        border-right:none !important;
        border-bottom:1px solid #D6E6F2 !important;
        box-shadow:none !important;
      }

      .tr-app-routes-app-widgets-homepage-reviews-div-141{
        width:100% !important;
        height:auto !important;
        min-height:0 !important;
        overflow:visible !important;
        padding:18px 14px 28px !important;
      }

      .tr-app-routes-app-widgets-homepage-reviews-div-142{
        max-width:100% !important;
      }

      .tr-app-routes-app-widgets-homepage-reviews-div-146{
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      }
    }

    @media(max-width:520px){
      .tr-app-routes-app-widgets-homepage-reviews-div-98{
        gap:10px !important;
      }

      .tr-app-routes-app-widgets-homepage-reviews-div-99{
        flex:1 1 100% !important;
      }

      .tr-app-routes-app-widgets-homepage-reviews-div-102{
        width:100% !important;
        justify-content:space-between !important;
      }

      .tr-app-routes-app-widgets-homepage-reviews-button-104{
        flex:1 !important;
        min-height:42px !important;
      }

      .tr-app-routes-app-widgets-homepage-reviews-div-146{
        grid-template-columns:repeat(2,minmax(0,1fr)) !important;
        gap:8px !important;
      }

      .tr-app-routes-app-widgets-homepage-reviews-button-147{
        min-height:88px !important;
      }
    }

    @media(max-width:360px){
      .tr-app-routes-app-widgets-homepage-reviews-div-146{
        grid-template-columns:1fr !important;
      }
    }
  `}</style>

  {/* Top bar */}
  <div
    style={{
      minHeight: 68,
      background: "rgba(255,255,255,.97)",
      borderBottom: "1px solid #D6E6F2",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 22px",
      position: "sticky",
      top: 0,
      zIndex: 100,
      gap: 14,
      flexWrap: "wrap",
      boxShadow: "0 4px 18px rgba(79,115,146,.055)",
      backdropFilter: "blur(14px)",
      boxSizing: "border-box",
    }}
    className="tr-app-routes-app-widgets-homepage-reviews-div-98"
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        minWidth: 0,
        flex: "1 1 260px",
      }}
      className="tr-app-routes-app-widgets-homepage-reviews-div-99"
    >
      <Link
        to="/app/widgets"
        aria-label="Back to Widgets"
        style={{
          width: 38,
          height: 38,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderRadius: 11,
          color: "#4F7392",
          textDecoration: "none",
          background: "#F5F9FC",
          border: "1px solid #D6E6F2",
          boxShadow: "0 2px 7px rgba(79,115,146,.05)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M15 18L9 12L15 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      <span
        style={{ display: "none" }}
        className="tr-app-routes-app-widgets-homepage-reviews-span-100"
      >
        |
      </span>

      <div
        style={{
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 750,
            letterSpacing: ".07em",
            textTransform: "uppercase",
            color: "#91A9BA",
            lineHeight: 1.2,
            marginBottom: 3,
          }}
        >
          Widget customizer
        </div>

        <span
          style={{
            display: "block",
            fontWeight: 800,
            fontSize: "clamp(15px,2vw,17px)",
            color: "#405F79",
            letterSpacing: "-.02em",
            lineHeight: 1.25,
          }}
          className="tr-app-routes-app-widgets-homepage-reviews-span-101"
        >
          Homepage Reviews
        </span>
      </div>
    </div>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 9,
        flexWrap: "wrap",
      }}
      className="tr-app-routes-app-widgets-homepage-reviews-div-102"
    >
      {saved && (
        <span
          style={{
            minHeight: 34,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 11.5,
            color: "#397054",
            fontWeight: 750,
            background: "#F0F8F3",
            border: "1px solid #CEE6D7",
            borderRadius: 999,
            padding: "6px 11px",
            boxSizing: "border-box",
            whiteSpace: "nowrap",
          }}
          className="tr-app-routes-app-widgets-homepage-reviews-span-103"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M7 12.5L10.3 16L17 8.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          Saved
        </span>
      )}

      <button
        onClick={save}
        disabled={fetcher.state !== "idle"}
        style={{
          minHeight: 40,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          background:
            fetcher.state !== "idle"
              ? "#B8CBD9"
              : "linear-gradient(135deg,#8DB4D6 0%,#729AB9 100%)",
          color: "#FFFFFF",
          border: "none",
          borderRadius: 10,
          padding: "9px 18px",
          fontWeight: 750,
          fontSize: 12.5,
          cursor:
            fetcher.state !== "idle"
              ? "default"
              : "pointer",
          boxShadow:
            fetcher.state !== "idle"
              ? "none"
              : "0 6px 16px rgba(79,115,146,.18)",
          transition: "all .18s ease",
          whiteSpace: "nowrap",
        }}
        className="tr-app-routes-app-widgets-homepage-reviews-button-104 tr-homepage-reviews-save"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M5 4H16L19 7V20H5V4Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8 4V9H16V4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8 20V14H16V20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>

        {fetcher.state !== "idle" ? "Saving…" : "Save changes"}
      </button>
    </div>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "330px minmax(0,1fr)",
      minHeight: "calc(100vh - 68px)",
      alignItems: "stretch",
    }}
    className="tr-app-routes-app-widgets-homepage-reviews-div-105 tr-homepage-reviews-workspace"
  >
    {/* Settings sidebar */}
    <div
      style={{
        width: 330,
        minWidth: 330,
        background: "#FFFFFF",
        borderRight: "1px solid #D6E6F2",
        overflowY: "auto",
        boxShadow: "5px 0 20px rgba(79,115,146,.035)",
        boxSizing: "border-box",
      }}
      className="tr-app-routes-app-widgets-homepage-reviews-div-106"
    >
      <div
        style={{
          padding: "15px 16px 11px",
          borderBottom: "1px solid #E5EFF5",
          background:
            "linear-gradient(180deg,#FFFFFF 0%,#FAFCFD 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#EDF5FA",
              border: "1px solid #D6E6F2",
              color: "#4F7392",
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M4 7H14M18 7H20M10 17H20M4 17H6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle
                cx="16"
                cy="7"
                r="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle
                cx="8"
                cy="17"
                r="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </span>

          <div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 800,
                color: "#496B87",
                lineHeight: 1.3,
              }}
            >
              Widget settings
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#8DA4B5",
                marginTop: 2,
              }}
            >
              Customize how reviews appear
            </div>
          </div>
        </div>
      </div>

      <Section
        title="Layout"
        open={open === "layout"}
        onToggle={() => toggle("layout")}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
          className="tr-app-routes-app-widgets-homepage-reviews-div-107"
        >
          {LAYOUTS.map((l) => (
            <button
              key={l.key}
              onClick={() => selectLayout(l.key)}
              style={{
                width: "100%",
                padding: "10px",
                border:
                  s.layout === l.key
                    ? "1.5px solid #8DB4D6"
                    : "1px solid #DCE8F0",
                borderRadius: 11,
                background:
                  s.layout === l.key
                    ? "#EFF6FA"
                    : "#FFFFFF",
                cursor: "pointer",
                textAlign: "left",
                boxShadow:
                  s.layout === l.key
                    ? "0 5px 15px rgba(79,115,146,.08)"
                    : "none",
                transition: "all .16s ease",
                boxSizing: "border-box",
              }}
              className="tr-app-routes-app-widgets-homepage-reviews-button-108 tr-homepage-layout-button"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    // background:
                    //   s.layout === l.key
                    //     ? "#DCEAF4"
                    //     : "#F5F9FC",
                    // border: "1px solid #D6E6F2",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {l.icon}
                </span>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 750,
                      fontSize: 12.8,
                      color:
                        s.layout === l.key
                          ? "#456985"
                          : "#587991",
                      lineHeight: 1.3,
                    }}
                    className="tr-app-routes-app-widgets-homepage-reviews-div-109"
                  >
                    {l.label}
                    {l.pro ? " (Advanced)" : ""}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#8CA3B4",
                      marginTop: 3,
                      lineHeight: 1.45,
                    }}
                    className="tr-app-routes-app-widgets-homepage-reviews-div-110"
                  >
                    {l.desc}
                  </div>
                </div>

                {s.layout === l.key && (
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#8DB4D6",
                      color: "#FFFFFF",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M7 12.5L10.2 15.5L17 8.5"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {showProUpsell && (
          <div
            style={{
              marginTop: 10,
              background: "#FFF9ED",
              border: "1px solid #ECD8A4",
              borderRadius: 10,
              padding: "10px 11px",
              fontSize: 11.5,
              color: "#806021",
              lineHeight: 1.55,
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-div-111"
          >
            This layout needs the Advanced plan.{" "}
            <Link
              to="/app/billing"
              style={{
                fontWeight: 750,
                color: "#806021",
              }}
            >
              Upgrade →
            </Link>
          </div>
        )}
      </Section>

      <Section
        title="Heading"
        open={open === "heading"}
        onToggle={() => toggle("heading")}
      >
        <Field label="Heading Text">
          <input
            value={s.headingText}
            onChange={(e) =>
              upd("headingText", e.target.value)
            }
            style={{
              width: "100%",
              minHeight: 40,
              padding: "9px 11px",
              border: "1px solid #D6E6F2",
              borderRadius: 9,
              fontSize: 13,
              color: "#4F7392",
              background: "#FFFFFF",
              boxSizing: "border-box",
              outline: "none",
              transition: "all .15s ease",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-input-112 tr-homepage-review-control"
          />
        </Field>

        <Field label={`Heading Size: ${s.headingSize}px`}>
          <input
            type="range"
            min={18}
            max={64}
            value={s.headingSize}
            onChange={(e) =>
              upd("headingSize", +e.target.value)
            }
            style={{
              width: "100%",
              accentColor: "#8DB4D6",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-input-113"
          />
        </Field>

        <Field label="Heading Alignment">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 6,
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-div-114"
          >
            {["left", "center", "right"].map((a) => (
              <button
                key={a}
                onClick={() => upd("headingAlign", a)}
                style={{
                  minHeight: 36,
                  padding: "7px 4px",
                  fontSize: 11,
                  fontWeight: 700,
                  border:
                    s.headingAlign === a
                      ? "1.5px solid #8DB4D6"
                      : "1px solid #D6E6F2",
                  background:
                    s.headingAlign === a
                      ? "#EFF6FA"
                      : "#FFFFFF",
                  color:
                    s.headingAlign === a
                      ? "#4F7392"
                      : "#849CAC",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
                className="tr-app-routes-app-widgets-homepage-reviews-button-115"
              >
                {a[0].toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <Section
        title="Colors"
        open={open === "colors"}
        onToggle={() => toggle("colors")}
      >
        <ColorField
          label="Accent / Star Color"
          value={s.accentColor}
          onChange={(v) => {
            upd("accentColor", v);
            upd("starColor", v);
          }}
        />

        <ColorField
          label="Page Background"
          value={
            s.pageBg === "transparent"
              ? "#ffffff"
              : s.pageBg
          }
          onChange={(v) => upd("pageBg", v)}
        />

        <ColorField
          label="Card Background"
          value={s.cardBg}
          onChange={(v) => upd("cardBg", v)}
        />

        <ColorField
          label="Text Color"
          value={s.textColor}
          onChange={(v) => upd("textColor", v)}
        />

        <ColorField
          label="Card Border Color"
          value={s.cardBorder}
          onChange={(v) => upd("cardBorder", v)}
        />

        {(s.layout === "summary_carousel" ||
          s.layout === "spotlight") && (
          <ColorField
            label="Panel Background"
            value={s.panelBg}
            onChange={(v) => upd("panelBg", v)}
          />
        )}
      </Section>

      <Section
        title="Cards"
        open={open === "cards"}
        onToggle={() => toggle("cards")}
      >
        <Field label={`Card Padding: ${s.cardPadding}px`}>
          <input
            type="range"
            min={8}
            max={40}
            value={s.cardPadding}
            onChange={(e) =>
              upd("cardPadding", +e.target.value)
            }
            style={{
              width: "100%",
              accentColor: "#8DB4D6",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-input-116"
          />
        </Field>

        <Field label={`Border Radius: ${s.cardRadius}px`}>
          <input
            type="range"
            min={0}
            max={24}
            value={s.cardRadius}
            onChange={(e) =>
              upd("cardRadius", +e.target.value)
            }
            style={{
              width: "100%",
              accentColor: "#8DB4D6",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-input-117"
          />
        </Field>

        <Field label={`Gap Between Cards: ${s.gap}px`}>
          <input
            type="range"
            min={8}
            max={40}
            value={s.gap}
            onChange={(e) =>
              upd("gap", +e.target.value)
            }
            style={{
              width: "100%",
              accentColor: "#8DB4D6",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-input-118"
          />
        </Field>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
            gap: 12,
            padding: "7px 0",
          }}
          className="tr-app-routes-app-widgets-homepage-reviews-div-119"
        >
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "#587991",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-span-120"
          >
            Card Shadow
          </span>

          <button
            onClick={() =>
              upd("showShadow", !s.showShadow)
            }
            style={{
              width: 46,
              height: 26,
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              background: s.showShadow
                ? "#8DB4D6"
                : "#DCE6ED",
              position: "relative",
              transition: "background .2s",
              flexShrink: 0,
              boxShadow: s.showShadow
                ? "0 3px 8px rgba(79,115,146,.14)"
                : "none",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-button-121"
          >
            <span
              style={{
                position: "absolute",
                top: 4,
                left: s.showShadow ? 24 : 4,
                width: 18,
                height: 18,
                background: "#FFFFFF",
                borderRadius: "50%",
                transition: "left .2s",
                boxShadow:
                  "0 2px 5px rgba(79,115,146,.18)",
              }}
              className="tr-app-routes-app-widgets-homepage-reviews-span-122"
            />
          </button>
        </div>
      </Section>

      <Section
        title="Typography"
        open={open === "typo"}
        onToggle={() => toggle("typo")}
      >
        <Field label="Font Family">
          <select
            value={s.fontFamily}
            onChange={(e) =>
              upd("fontFamily", e.target.value)
            }
            style={{
              width: "100%",
              minHeight: 40,
              padding: "9px 10px",
              border: "1px solid #D6E6F2",
              borderRadius: 9,
              fontSize: 13,
              color: "#4F7392",
              background: "#FFFFFF",
              outline: "none",
              boxSizing: "border-box",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-select-123"
          >
            {FONTS.map((f) => (
              <option
                key={f.value}
                value={f.value}
                className="tr-app-routes-app-widgets-homepage-reviews-option-124"
              >
                {f.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`Review Text Size: ${s.reviewSize}px`}>
          <input
            type="range"
            min={11}
            max={20}
            value={s.reviewSize}
            onChange={(e) =>
              upd("reviewSize", +e.target.value)
            }
            style={{
              width: "100%",
              accentColor: "#8DB4D6",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-input-125"
          />
        </Field>
      </Section>

      <Section
        title="Display"
        open={open === "display"}
        onToggle={() => toggle("display")}
      >
        <Field label={`Max Reviews: ${s.maxReviews}`}>
          <input
            type="range"
            min={3}
            max={24}
            step={3}
            value={s.maxReviews}
            onChange={(e) =>
              upd("maxReviews", +e.target.value)
            }
            style={{
              width: "100%",
              accentColor: "#8DB4D6",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-input-126"
          />
        </Field>

        <Field label={`Columns: ${s.columns}`}>
          <input
            type="range"
            min={1}
            max={4}
            value={s.columns}
            onChange={(e) =>
              upd("columns", +e.target.value)
            }
            style={{
              width: "100%",
              accentColor: "#8DB4D6",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-input-127"
          />
        </Field>

        {[
          {
            key: "showVerified",
            label: "Show Verified Badge",
          },
          {
            key: "showMedia",
            label: "Show Review Images",
          },
        ].map(({ key, label }) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              gap: 12,
              padding: "7px 0",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-div-128"
          >
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "#587991",
              }}
              className="tr-app-routes-app-widgets-homepage-reviews-span-129"
            >
              {label}
            </span>

            <button
              onClick={() => upd(key, !s[key])}
              style={{
                width: 46,
                height: 26,
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                background: s[key]
                  ? "#8DB4D6"
                  : "#DCE6ED",
                position: "relative",
                transition: "background .2s",
                flexShrink: 0,
              }}
              className="tr-app-routes-app-widgets-homepage-reviews-button-130"
            >
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  left: s[key] ? 24 : 4,
                  width: 18,
                  height: 18,
                  background: "#FFFFFF",
                  borderRadius: "50%",
                  transition: "left .2s",
                  boxShadow:
                    "0 2px 5px rgba(79,115,146,.18)",
                }}
                className="tr-app-routes-app-widgets-homepage-reviews-span-131"
              />
            </button>
          </div>
        ))}
      </Section>

      <Section
        title="Spacing"
        open={open === "spacing"}
        onToggle={() => toggle("spacing")}
      >
        <Field label={`Top Padding: ${s.paddingTop}px`}>
          <input
            type="range"
            min={0}
            max={120}
            step={4}
            value={s.paddingTop}
            onChange={(e) =>
              upd("paddingTop", +e.target.value)
            }
            style={{
              width: "100%",
              accentColor: "#8DB4D6",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-input-132"
          />
        </Field>

        <Field
          label={`Bottom Padding: ${s.paddingBottom}px`}
        >
          <input
            type="range"
            min={0}
            max={120}
            step={4}
            value={s.paddingBottom}
            onChange={(e) =>
              upd("paddingBottom", +e.target.value)
            }
            style={{
              width: "100%",
              accentColor: "#8DB4D6",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-input-133"
          />
        </Field>
      </Section>

      {/* Install guide */}
      <div
        style={{
          padding: 14,
          background:
            "linear-gradient(135deg,#F3F8FB,#EAF3F9)",
          margin: 12,
          borderRadius: 12,
          border: "1px solid #D6E6F2",
        }}
        className="tr-app-routes-app-widgets-homepage-reviews-div-134"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            fontWeight: 800,
            color: "#4F7392",
            marginBottom: 9,
          }}
          className="tr-app-routes-app-widgets-homepage-reviews-div-135"
        >
          <span
            style={{
              width: 29,
              height: 29,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              background: "#FFFFFF",
              border: "1px solid #D6E6F2",
              flexShrink: 0,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
            >
              <rect
                x="4"
                y="4"
                width="16"
                height="13"
                rx="2"
                stroke="#4F7392"
                strokeWidth="1.7"
              />
              <path
                d="M9 21H15M12 17V21"
                stroke="#4F7392"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>

          How to add to your home page
        </div>

        <ol
          style={{
            margin: 0,
            paddingLeft: 19,
            fontSize: 11.5,
            color: "#6F8FA9",
            lineHeight: 1.85,
          }}
          className="tr-app-routes-app-widgets-homepage-reviews-ol-136"
        >
          <li className="tr-app-routes-app-widgets-homepage-reviews-li-137">
            Go to Shopify Admin → Online Store → Themes
          </li>

          <li className="tr-app-routes-app-widgets-homepage-reviews-li-138">
            Click Customize → Home page
          </li>

          <li className="tr-app-routes-app-widgets-homepage-reviews-li-139">
            Click "Add section" → Choose "Homepage Reviews"
          </li>

          <li className="tr-app-routes-app-widgets-homepage-reviews-li-140">
            Save — settings from this page apply automatically
          </li>
        </ol>
      </div>
    </div>

    {/* Preview */}
    <div
      style={{
        minWidth: 0,
        overflowY: "auto",
        padding: "30px clamp(18px,3vw,34px)",
        background:
          "radial-gradient(circle at 50% 0%, rgba(214,230,242,.58), transparent 34%), #EEF5FA",
        boxSizing: "border-box",
      }}
      className="tr-app-routes-app-widgets-homepage-reviews-div-141"
    >
      <div
        style={{
          maxWidth: 1000,
          width: "100%",
          margin: "0 auto",
        }}
        className="tr-app-routes-app-widgets-homepage-reviews-div-142"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 11,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#55758D",
            }}
          >
            Preview
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "#7792A6",
              fontWeight: 650,
              background: "rgba(255,255,255,.72)",
              border: "1px solid #D6E6F2",
              borderRadius: 999,
              padding: "5px 9px",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-div-143"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M3 12C5.1 8.6 8.1 7 12 7C15.9 7 18.9 8.6 21 12C18.9 15.4 15.9 17 12 17C8.1 17 5.1 15.4 3 12Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <circle
                cx="12"
                cy="12"
                r="2.3"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>

            Live preview · sample data
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #D6E6F2",
            borderRadius: 18,
            padding: "clamp(10px,2vw,18px)",
            boxShadow:
              "0 18px 42px rgba(79,115,146,.09)",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <LivePreview s={s} />
        </div>

        <div
          style={{
            marginTop: 18,
            padding: "clamp(14px,2.4vw,19px)",
            background: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid #D6E6F2",
            boxShadow:
              "0 9px 24px rgba(79,115,146,.055)",
          }}
          className="tr-app-routes-app-widgets-homepage-reviews-div-144"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              fontSize: 13.5,
              fontWeight: 800,
              color: "#4F7392",
              marginBottom: 13,
              letterSpacing: "-.01em",
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-div-145"
          >
            <span
              style={{
                width: 31,
                height: 31,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 9,
                background: "#F2F7FB",
                border: "1px solid #D6E6F2",
                flexShrink: 0,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
              >
                <rect
                  x="4"
                  y="4"
                  width="6"
                  height="6"
                  rx="1.2"
                  stroke="#4F7392"
                  strokeWidth="1.6"
                />
                <rect
                  x="14"
                  y="4"
                  width="6"
                  height="6"
                  rx="1.2"
                  stroke="#4F7392"
                  strokeWidth="1.6"
                />
                <rect
                  x="4"
                  y="14"
                  width="6"
                  height="6"
                  rx="1.2"
                  stroke="#4F7392"
                  strokeWidth="1.6"
                />
                <rect
                  x="14"
                  y="14"
                  width="6"
                  height="6"
                  rx="1.2"
                  stroke="#4F7392"
                  strokeWidth="1.6"
                />
              </svg>
            </span>

            {LAYOUTS.length} Layout Designs Available
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(115px,1fr))",
              gap: 10,
            }}
            className="tr-app-routes-app-widgets-homepage-reviews-div-146"
          >
            {LAYOUTS.map((l) => (
              <button
                key={l.key}
                onClick={() => selectLayout(l.key)}
                style={{
                  position: "relative",
                  minHeight: 96,
                  padding: "11px 8px",
                  borderRadius: 11,
                  border:
                    s.layout === l.key
                      ? "1.5px solid #8DB4D6"
                      : "1px solid #D6E6F2",
                  background:
                    s.layout === l.key
                      ? "#EFF6FA"
                      : "#FFFFFF",
                  cursor: "pointer",
                  textAlign: "center",
                  boxShadow:
                    s.layout === l.key
                      ? "0 7px 17px rgba(79,115,146,.09)"
                      : "none",
                  transition: "all .16s ease",
                }}
                className="tr-app-routes-app-widgets-homepage-reviews-button-147 tr-homepage-layout-preview-button"
              >
                {l.pro && !isPro && (
                  <span
                    style={{
                      position: "absolute",
                      top: 5,
                      right: 5,
                      fontSize: 8.5,
                      fontWeight: 800,
                      color: "#806021",
                      background: "#FFF5DA",
                      border: "1px solid #EEDCA9",
                      borderRadius: 5,
                      padding: "2px 5px",
                    }}
                    className="tr-app-routes-app-widgets-homepage-reviews-span-148"
                  >
                    Pro
                  </span>
                )}

                <div
                  style={{
                    width: 36,
                    height: 36,
                    margin: "0 auto 7px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    fontSize: 18,
                    background:
                      s.layout === l.key
                        ? "#DCEAF4"
                        : "#F3F8FB",
                    border: "1px solid #D6E6F2",
                  }}
                  className="tr-app-routes-app-widgets-homepage-reviews-div-149"
                >
                  {l.icon}
                </div>

                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 750,
                    color:
                      s.layout === l.key
                        ? "#496C87"
                        : "#607E95",
                    lineHeight: 1.35,
                  }}
                  className="tr-app-routes-app-widgets-homepage-reviews-div-150"
                >
                  {l.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}
