// Live admin preview for the review-display widget family.
// Ports the visual logic of extensions/product-review/blocks/reviews-widget.liquid into React
// against hardcoded sample data, so settings changes reflect instantly without a real storefront fetch.

import { useState } from "react";

const MOCK_REVIEWS = [
  { id: 1, customer: "Emily R.", rating: 5, title: "Perfect winter sweater", comment: "This sweater exceeded all my expectations. Thick enough to keep me warm but still breathable indoors.", createdAt: "2025-08-18", likes: 12 },
  { id: 2, customer: "James K.", rating: 4, title: "Great quality", comment: "Really nice material and stitching. Slightly large but overall happy with the purchase.", createdAt: "2025-07-02", likes: 4 },
  { id: 3, customer: "Sofia M.", rating: 5, title: "Will buy again", comment: "Exactly as pictured, fast shipping, and the color is even better in person.", createdAt: "2025-06-21", likes: 8 },
  { id: 4, customer: "Daniel P.", rating: 3, title: "Good but runs small", comment: "Nice design but I'd recommend sizing up.", createdAt: "2025-05-30", likes: 1 },
  { id: 5, customer: "Nina T.", rating: 5, title: "Great for travel", comment: "Packs small, never wrinkles, and still looks sharp after a long flight.", createdAt: "2025-05-12", likes: 6 },
  { id: 6, customer: "Aisha P.", rating: 5, title: "Buying another colour", comment: "Love love love it. The fit is perfect and the fabric feels premium.", createdAt: "2025-04-28", likes: 3 },
];

// ── Carousel family previews (interactive: arrows/dots really move) ──────────
// Mock "media" is drawn with gradients — the admin has no real review uploads.
const PV_TILES = [
  "linear-gradient(160deg,#f6d365,#fda085)", "linear-gradient(160deg,#a1c4fd,#c2e9fb)",
  "linear-gradient(160deg,#d4fc79,#96e6a1)", "linear-gradient(160deg,#fbc2eb,#a6c1ee)",
  "linear-gradient(160deg,#ffecd2,#fcb69f)", "linear-gradient(160deg,#cfd9df,#e2ebf0)",
];
const PV_QUOTE = (color, size = 26) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill={color} aria-hidden="true"><path d="M9.3 25.5c-3 0-5.3-2.4-5.3-5.9 0-5.3 3.8-10 9.4-12.1l1 1.9c-3.4 1.6-5.4 4.2-5.6 6.9h.9c2.8 0 4.8 2 4.8 4.6 0 2.7-2.2 4.6-5.2 4.6zm14.7 0c-3 0-5.3-2.4-5.3-5.9 0-5.3 3.8-10 9.4-12.1l1 1.9c-3.4 1.6-5.4 4.2-5.6 6.9h.9c2.8 0 4.8 2 4.8 4.6 0 2.7-2.2 4.6-5.2 4.6z"/></svg>
);
const pvWrap = (n, i) => ((i % n) + n) % n;

function PvArrow({ dir, onClick, s, style }) {
  return (
    <button type="button" onClick={onClick} aria-label={dir < 0 ? "Previous" : "Next"} style={{
      width: 34, height: 34, borderRadius: "50%", border: `1px solid ${s.borderColor || "#e5e5e5"}`, background: s.cardBackground || "#fff",
      color: s.textColor || "#222", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      boxShadow: "0 4px 12px rgba(0,0,0,.12)", padding: 0, fontSize: 18, lineHeight: 1, zIndex: 3, ...style,
    }}>{dir < 0 ? "‹" : "›"}</button>
  );
}

function PvDots({ count, active, onPick, s }) {
  if (count < 2 || s.showDots === false) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" onClick={() => onPick(i)} aria-label={`${i + 1} / ${count}`} style={{
          width: i === active ? 22 : 7, height: 7, borderRadius: 99, border: "none", padding: 0, cursor: "pointer",
          background: i === active ? s.accentColor : "#d9d9d9", transition: "width .3s",
        }} />
      ))}
    </div>
  );
}

function PvCard({ r, s, i, media = true, quote = false, row = false }) {
  const star = s.starColor || "#F59E0B";
  return (
    <div style={{
      display: "flex", flexDirection: row ? "row" : "column", height: "100%", boxSizing: "border-box",
      background: s.cardBackground, border: `1px solid ${s.borderColor}`, borderRadius: s.borderRadius, overflow: "hidden",
      boxShadow: s.showShadow ? "0 4px 14px rgba(0,0,0,.08)" : "none", color: s.textColor,
      fontFamily: s.fontFamily === "inherit" ? undefined : s.fontFamily,
    }}>
      {media && (
        <div style={{ position: "relative", background: PV_TILES[i % PV_TILES.length], ...(row ? { flex: "0 0 40%", minHeight: 170 } : { aspectRatio: "4/3" }) }}>
          {i % 2 === 0 && <span style={{ position: "absolute", top: "50%", left: "50%", width: 32, height: 32, margin: "-16px 0 0 -16px", borderRadius: "50%", background: "rgba(255,255,255,.4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>▶</span>}
        </div>
      )}
      <div style={{ padding: Math.min(s.cardPadding, 18), display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0, justifyContent: row ? "center" : "flex-start" }}>
        {quote && <span style={{ opacity: 0.25, lineHeight: 0 }}>{PV_QUOTE(s.accentColor, 22)}</span>}
        <div style={{ fontSize: 12 }}>{stars(r.rating, star, s.starGap)}</div>
        <div style={{ fontSize: s.reviewSize * 0.95, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: row ? 5 : 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.comment}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 8, borderTop: `1px solid ${s.borderColor}` }}>
          {s.showAvatar && <span style={{ width: 26, height: 26, borderRadius: "50%", background: s.accentColor, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, flexShrink: 0 }}>{initials(r.customer)}</span>}
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, minWidth: 0 }}>
            <strong style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.customer}</strong>
            {s.showVerified && <span style={{ fontSize: 10, color: "#1a8a4a", fontWeight: 600 }}>✓ Verified</span>}
          </span>
          {s.showDate && <span style={{ marginLeft: "auto", fontSize: 10, color: s.mutedTextColor || "#888", whiteSpace: "nowrap" }}>{r.createdAt}</span>}
        </div>
      </div>
    </div>
  );
}

// Slider (per-view columns), Videos strip (fixed-width tall cards + progress)
// and Center Focus (one centred card, neighbours faded) share this component.
function PvCarousel({ items, s, heading, wrapStyle, headingStyle, variant }) {
  const [idx, setIdx] = useState(0);
  const gap = Math.min(s.cardGap ?? 16, 20);
  const n = items.length;
  const single = variant === "slider" && (s.columns || 3) === 1;
  const per = variant === "slider" ? Math.max(1, Math.min(s.columns || 3, 3)) : 1;
  const maxIdx = variant === "slider" ? Math.max(0, n - per) : n - 1;
  const go = (d) => setIdx((i) => (variant === "center" ? pvWrap(n, i + d) : i + d > maxIdx ? 0 : i + d < 0 ? maxIdx : i + d));
  const showArrows = s.showArrows !== false && maxIdx > 0;

  let cardW, translate;
  if (variant === "slider") {
    cardW = `calc((100% - ${(per - 1) * gap}px) / ${per})`;
    translate = `calc(-${idx} * ((100% - ${(per - 1) * gap}px) / ${per} + ${gap}px))`;
  } else if (variant === "strip") {
    cardW = "180px";
    translate = `-${idx * (180 + gap)}px`;
  } else {
    cardW = "230px";
    translate = `calc(50% - ${115 + idx * (230 + gap)}px)`;
  }

  return (
    <div style={wrapStyle}>
      <h2 style={headingStyle}>{heading}</h2>
      <div style={{ position: "relative", padding: "0 6px" }}>
        <div style={{ overflow: "hidden", padding: "8px 2px 12px" }}>
          <div style={{ display: "flex", gap, transform: `translateX(${translate})`, transition: "transform .45s cubic-bezier(.2,.8,.2,1)" }}>
            {items.map((r, i) => {
              const isCenter = variant === "center" && i === idx;
              return (
                <div key={r.id} onClick={variant === "center" && !isCenter ? () => setIdx(i) : undefined} style={{
                  flex: `0 0 ${cardW}`, minWidth: 0,
                  ...(variant === "center" ? {
                    transform: `scale(${isCenter ? 1 : 0.86})`, opacity: isCenter ? 1 : 0.45, cursor: isCenter ? "default" : "pointer",
                    transition: "transform .45s, opacity .45s", borderRadius: s.borderRadius,
                    boxShadow: isCenter ? `0 14px 30px rgba(0,0,0,.14), 0 0 0 2px ${s.accentColor}` : "none",
                  } : {}),
                }}>
                  <PvCard r={r} s={s} i={i} quote={variant === "center" || single} row={single} media={variant !== "slider" || i % 3 !== 2 || single} />
                </div>
              );
            })}
          </div>
        </div>
        {showArrows && (
          <>
            <PvArrow dir={-1} s={s} onClick={() => go(-1)} style={{ position: "absolute", top: "calc(50% - 17px)", left: variant === "center" ? "calc(50% - 150px)" : -8 }} />
            <PvArrow dir={1} s={s} onClick={() => go(1)} style={{ position: "absolute", top: "calc(50% - 17px)", right: variant === "center" ? "calc(50% - 150px)" : -8 }} />
          </>
        )}
      </div>
      {variant === "strip" ? (
        <div style={{ width: 180, height: 4, margin: "12px auto 0", borderRadius: 99, background: "#e5e5e5", overflow: "hidden" }}>
          <div style={{ width: `${100 / Math.max(1, n - 1)}%`, height: "100%", borderRadius: 99, background: s.accentColor, transform: `translateX(${idx * 100}%)`, transition: "transform .45s" }} />
        </div>
      ) : (
        <PvDots count={maxIdx + 1} active={idx} onPick={setIdx} s={s} />
      )}
    </div>
  );
}

function PvBubble({ items, s, heading, wrapStyle, headingStyle }) {
  const [idx, setIdx] = useState(0);
  const per = Math.max(1, Math.min(s.columns || 3, 3)), gap = Math.min(s.cardGap ?? 16, 20);
  const maxIdx = Math.max(0, items.length - per);
  const go = (d) => setIdx((i) => (i + d > maxIdx ? 0 : i + d < 0 ? maxIdx : i + d));
  return (
    <div style={wrapStyle}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <h2 style={headingStyle}>{heading}</h2>
        {s.showArrows !== false && maxIdx > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <PvArrow dir={-1} s={s} onClick={() => go(-1)} style={{ boxShadow: "none" }} />
            <PvArrow dir={1} s={s} onClick={() => go(1)} style={{ boxShadow: "none" }} />
          </div>
        )}
      </div>
      <div style={{ overflow: "hidden", padding: "4px 2px" }}>
        <div style={{ display: "flex", gap, transform: `translateX(calc(-${idx} * ((100% - ${(per - 1) * gap}px) / ${per} + ${gap}px)))`, transition: "transform .45s cubic-bezier(.2,.8,.2,1)" }}>
          {items.map((r, i) => (
            <div key={r.id} style={{ flex: `0 0 calc((100% - ${(per - 1) * gap}px) / ${per})`, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ position: "relative", padding: 16, borderRadius: s.borderRadius + 4, background: s.cardBackground, border: `1px solid ${s.borderColor}`, color: s.textColor, flex: 1, boxShadow: s.showShadow ? "0 4px 14px rgba(0,0,0,.06)" : "none" }}>
                <span style={{ lineHeight: 0 }}>{PV_QUOTE(s.accentColor, 24)}</span>
                <div style={{ fontSize: 12, margin: "6px 0" }}>{stars(r.rating, s.starColor || "#F59E0B", s.starGap)}</div>
                <div style={{ fontSize: s.reviewSize * 0.92, lineHeight: 1.5 }}>{r.comment}</div>
                <span style={{ position: "absolute", left: 26, bottom: -7, width: 12, height: 12, background: s.cardBackground, borderRight: `1px solid ${s.borderColor}`, borderBottom: `1px solid ${s.borderColor}`, transform: "rotate(45deg)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 14 }}>
                <span style={{ width: 34, height: 34, borderRadius: "50%", background: i % 2 ? PV_TILES[i % PV_TILES.length] : s.accentColor, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${s.accentColor}` }}>{i % 2 ? "" : initials(r.customer)}</span>
                <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                  <strong style={{ fontSize: 12, color: s.textColor }}>{r.customer}</strong>
                  <span style={{ fontSize: 10.5, color: s.mutedTextColor || "#888" }}>{r.createdAt}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <PvDots count={maxIdx + 1} active={idx} onPick={setIdx} s={s} />
    </div>
  );
}

function PvMarquee({ items, s, heading, wrapStyle, headingStyle }) {
  const rows = items.length >= 6 ? [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)] : [items];
  return (
    <div style={wrapStyle}>
      <style>{`@keyframes trPvMq{from{transform:translateX(0)}to{transform:translateX(calc(-50% - 6px))}} .tr-pv-mq:hover .tr-pv-mq-lane{animation-play-state:paused}`}</style>
      <h2 style={headingStyle}>{heading}</h2>
      <div className="tr-pv-mq" style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)", maskImage: "linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)" }}>
        {rows.map((row, ri) => (
          <div key={ri} className="tr-pv-mq-lane" style={{ display: "flex", gap: 12, width: "max-content", animation: `trPvMq ${Math.max(14, row.length * 6)}s linear infinite`, animationDirection: ri % 2 ? "reverse" : "normal" }}>
            {[...row, ...row].map((r, i) => (
              <div key={i} style={{ width: 220, flexShrink: 0, padding: 14, borderRadius: s.borderRadius, background: s.cardBackground, border: `1px solid ${s.borderColor}`, color: s.textColor, boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: PV_TILES[(r.id + ri) % PV_TILES.length], flexShrink: 0 }} />
                  <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                    <strong style={{ fontSize: 11.5 }}>{r.customer}</strong>
                    <span style={{ fontSize: 10 }}>{stars(r.rating, s.starColor || "#F59E0B", 1)}</span>
                  </span>
                </div>
                <div style={{ fontSize: 11.5, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.comment}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11.5, color: "#888", marginTop: 10, textAlign: "center" }}>Rows glide continuously — hovering pauses them.</p>
    </div>
  );
}

function PvSpotlight({ items, s, heading, wrapStyle, headingStyle }) {
  const [idx, setIdx] = useState(0);
  const n = items.length, r = items[idx];
  const avg = items.reduce((a, x) => a + x.rating, 0) / n;
  const pad = (x) => String(x).padStart(2, "0");
  const navBtn = { background: "rgba(255,255,255,.12)", color: "#fff", border: "1px solid rgba(255,255,255,.25)", boxShadow: "none" };
  return (
    <div style={wrapStyle}>
      <h2 style={headingStyle}>{heading}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "170px minmax(0,1fr)", gap: 16 }}>
        <div style={{ padding: 18, borderRadius: s.borderRadius + 4, background: `linear-gradient(150deg,${s.accentColor},#141414)`, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>{avg.toFixed(1)}</div>
          <div style={{ fontSize: 12, margin: "6px 0 2px" }}>{stars(Math.round(avg), s.starColor || "#F59E0B", 1)}</div>
          <div style={{ fontSize: 10.5, opacity: 0.75 }}>Based on {n * 23} reviews</div>
          <div style={{ marginTop: 16, fontSize: 11, opacity: 0.85 }}><b style={{ fontSize: 18 }}>{pad(idx + 1)}</b> / {pad(n)}</div>
          <div style={{ display: "flex", gap: 3, margin: "8px 0 12px" }}>
            {items.map((_, i) => <span key={i} onClick={() => setIdx(i)} style={{ flex: 1, height: 3, borderRadius: 3, cursor: "pointer", background: i === idx ? "#fff" : i < idx ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.25)" }} />)}
          </div>
          {s.showArrows !== false && (
            <div style={{ display: "flex", gap: 8 }}>
              <PvArrow dir={-1} s={s} onClick={() => setIdx((i) => pvWrap(n, i - 1))} style={navBtn} />
              <PvArrow dir={1} s={s} onClick={() => setIdx((i) => pvWrap(n, i + 1))} style={navBtn} />
            </div>
          )}
        </div>
        <div key={idx} style={{ display: "grid", gridTemplateColumns: "minmax(0,.9fr) minmax(0,1.2fr)", gap: 16, alignItems: "center", padding: 18, borderRadius: s.borderRadius + 4, background: s.cardBackground, border: `1px solid ${s.borderColor}`, color: s.textColor, animation: "trPvFade .45s ease" }}>
          <style>{`@keyframes trPvFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
          <div style={{ position: "relative", alignSelf: "stretch", minHeight: 150, borderRadius: s.borderRadius, background: PV_TILES[idx % PV_TILES.length] }}>
            {idx % 2 === 0 && <span style={{ position: "absolute", top: "50%", left: "50%", width: 32, height: 32, margin: "-16px 0 0 -16px", borderRadius: "50%", background: "rgba(255,255,255,.4)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>▶</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ lineHeight: 0 }}>{PV_QUOTE(s.accentColor, 28)}</span>
            <div style={{ fontSize: s.reviewSize * 1.05, lineHeight: 1.55 }}>{r.comment}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: s.accentColor, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{initials(r.customer)}</span>
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                <strong style={{ fontSize: 12 }}>{r.customer}</strong>
                <span style={{ fontSize: 10 }}>{stars(r.rating, s.starColor || "#F59E0B", 1)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function stars(rating, accent, gap) {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ color: i < rating ? accent : "#ddd", marginRight: i < 4 ? (gap ?? 2) : 0 }} className="tr-app-components-reviewwidgetpreview-span-1">★</span>
  ));
}

function initials(name) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function Card({ r, s, editorial }) {
  const cardStyle = {
    background: s.cardBackground, border: `1px solid ${s.borderColor}`, borderRadius: s.borderRadius,
    padding: s.cardPadding, boxShadow: s.showShadow ? "0 2px 10px rgba(0,0,0,.06)" : "none",
    color: s.textColor, fontFamily: s.fontFamily === "inherit" ? undefined : s.fontFamily,
    display: "flex", gap: editorial ? 16 : 0, flexDirection: editorial ? "row" : "column",
    minWidth: 0,
  };
  const avatar = s.showAvatar && (
    <span style={{
      width: 32, height: 32, borderRadius: "50%", background: s.accentColor, color: "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0,
    }} className="tr-app-components-reviewwidgetpreview-span-2">{initials(r.customer)}</span>
  );
  return (
    <div style={cardStyle} className="tr-app-components-reviewwidgetpreview-div-3">
      {editorial && avatar}
      <div style={{ flex: 1, minWidth: 0 }} className="tr-app-components-reviewwidgetpreview-div-4">
        <div style={{ fontSize: s.reviewSize * 0.7, marginBottom: 4 }} className="tr-app-components-reviewwidgetpreview-div-5">{stars(r.rating, s.accentColor, s.starGap)}</div>
        <div style={{ fontSize: s.reviewSize * 1.05, fontWeight: 600, marginBottom: 4 }} className="tr-app-components-reviewwidgetpreview-div-6">{r.title}</div>
        <p style={{ fontSize: s.reviewSize, margin: "0 0 8px", lineHeight: 1.5 }} className="tr-app-components-reviewwidgetpreview-p-7">{r.comment}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: s.metaSize, color: s.mutedTextColor || "#888", flexWrap: "wrap" }} className="tr-app-components-reviewwidgetpreview-div-8">
          {!editorial && avatar}
          <strong className="tr-app-components-reviewwidgetpreview-strong-9">{r.customer}</strong>
          {s.showVerified && <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "1px 6px", background: "#e6f4ea", color: "#1a7a3a" }} className="tr-app-components-reviewwidgetpreview-span-10">Verified</span>}
          {s.showDate && <span className="tr-app-components-reviewwidgetpreview-span-11">{r.createdAt}</span>}
          <span style={{ marginLeft: "auto", border: `1px solid ${s.accentColor}`, color: s.accentColor, borderRadius: 20, padding: "2px 9px", fontSize: 11 }} className="tr-app-components-reviewwidgetpreview-span-12">+1 {r.likes}</span>
        </div>
      </div>
    </div>
  );
}

export default function ReviewWidgetPreview({ style, settings, heading }) {
  const s = settings;
  const items = MOCK_REVIEWS.slice(0, s.maxReviews || 4);
  const avg = items.reduce((sum, r) => sum + r.rating, 0) / items.length;

  const wrapStyle = {
    background: s.backgroundColor === "transparent" ? "transparent" : s.backgroundColor,
    padding: `${s.paddingTop}px 0 ${s.paddingBottom}px`,
    fontFamily: s.fontFamily === "inherit" ? undefined : s.fontFamily,
  };
  const headingStyle = { fontSize: s.headingSize, fontWeight: 600, color: s.headingColor || s.accentColor, margin: "0 0 16px" };

  if (style === "verified_counter") {
    return (
      <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-13">
        <div style={{ fontSize: s.reviewSize, color: s.textColor, display: "flex", alignItems: "center", gap: 6 }} className="tr-app-components-reviewwidgetpreview-div-14">
          <span style={{ color: s.accentColor }} className="tr-app-components-reviewwidgetpreview-span-15">✓</span> {items.length * 32} Verified Reviews
        </div>
      </div>
    );
  }

  if (style === "all_reviews_counter") {
    return (
      <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-16">
        <div style={{ fontSize: s.reviewSize, color: s.textColor, display: "flex", alignItems: "center", gap: 6 }} className="tr-app-components-reviewwidgetpreview-div-17">
          <span style={{ color: s.accentColor }} className="tr-app-components-reviewwidgetpreview-span-18">★</span> {items.length * 87} Total Reviews across your store
        </div>
      </div>
    );
  }

  if (style === "trust_medals") {
    return (
      <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-19">
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 18px",
          border: `2px solid ${s.accentColor}`, borderRadius: 12, color: s.textColor,
        }} className="tr-app-components-reviewwidgetpreview-div-20">
          <div style={{ fontSize: 20 }} className="tr-app-components-reviewwidgetpreview-div-21">{stars(Math.round(avg), s.accentColor, s.starGap)}</div>
          <div className="tr-app-components-reviewwidgetpreview-div-22">
            <div style={{ fontWeight: 600, fontSize: 13 }} className="tr-app-components-reviewwidgetpreview-div-23">{avg.toFixed(1)} / 5</div>
            <div style={{ fontSize: 11, color: "#888" }} className="tr-app-components-reviewwidgetpreview-div-24">{items.length * 41} reviews · Verified</div>
          </div>
        </div>
      </div>
    );
  }

  if (style === "floating_tab") {
    return (
      <div style={{ padding: "40px 20px", position: "relative", minHeight: 220 }} className="tr-app-components-reviewwidgetpreview-div-25">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-26">{heading}</h2>
        <p style={{ fontSize: 12.5, color: "#888" }} className="tr-app-components-reviewwidgetpreview-p-27">(Floating tab preview — appears fixed to the side of the page on your storefront)</p>
        <div style={{
          position: "absolute", top: 40, right: 0, background: s.accentColor, color: "#fff",
          padding: "10px 8px", borderRadius: "8px 0 0 8px", fontSize: 12, fontWeight: 600,
          writingMode: "vertical-rl", textOrientation: "mixed", cursor: "pointer",
        }} className="tr-app-components-reviewwidgetpreview-div-28">
          ★ Reviews
        </div>
      </div>
    );
  }

  if (style === "snippet_rotator") {
    const r = items[0];
    return (
      <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-29">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-30">{heading}</h2>
        <div style={{ maxWidth: 360 }} className="tr-app-components-reviewwidgetpreview-div-31"><Card r={r} s={s} /></div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#888" }} className="tr-app-components-reviewwidgetpreview-div-32">‹ rotates through your reviews ›</div>
      </div>
    );
  }

  if (style === "compact_rows") {
    const starCol = s.starColor || "#F59E0B";
    return (
      <div style={wrapStyle} className="tr-app-components-reviewwidgetpreview-div-33">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-34">{heading}</h2>
        <div style={{ display: "flex", flexDirection: "column" }} className="tr-app-components-reviewwidgetpreview-div-35">
          {items.map((r, i) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
              borderTop: i === 0 ? `1px solid ${s.borderColor}` : "none", borderBottom: `1px solid ${s.borderColor}`,
            }} className="tr-app-components-reviewwidgetpreview-div-36">
              <span style={{ fontSize: s.reviewSize * 0.75, flexShrink: 0 }} className="tr-app-components-reviewwidgetpreview-span-37">{stars(r.rating, starCol, s.starGap)}</span>
              <span style={{ flex: 1, fontSize: s.reviewSize * 0.9, color: s.textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="tr-app-components-reviewwidgetpreview-span-38">
                {r.title ? `${r.title} — ${r.comment}` : r.comment}
              </span>
              <span style={{ fontSize: s.metaSize, fontWeight: 600, color: "#555", flexShrink: 0 }} className="tr-app-components-reviewwidgetpreview-span-39">{r.customer}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (style === "insta_stories") {
    const gradient = "conic-gradient(from 180deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75)";
    return (
      <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-40">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-41">{heading}</h2>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 6 }} className="tr-app-components-reviewwidgetpreview-div-42">
          {items.map((r) => (
            <div key={r.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, width: 66 }} className="tr-app-components-reviewwidgetpreview-div-43">
              <div style={{ width: 62, height: 62, borderRadius: "50%", padding: 3, background: gradient, boxSizing: "border-box" }} className="tr-app-components-reviewwidgetpreview-div-44">
                <div style={{
                  width: "100%", height: "100%", borderRadius: "50%", background: s.accentColor, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13,
                  border: "2.5px solid #fff", boxSizing: "border-box",
                }} className="tr-app-components-reviewwidgetpreview-div-45">{initials(r.customer)}</div>
              </div>
              <span style={{ fontSize: 10.5, color: s.textColor, maxWidth: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="tr-app-components-reviewwidgetpreview-span-46">{r.customer.split(" ")[0]}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: "#888", marginTop: 8 }} className="tr-app-components-reviewwidgetpreview-p-47">Tap a circle on your storefront to open the fullscreen story player.</p>
      </div>
    );
  }

  if (style === "insta_reels") {
    const r = items[0];
    return (
      <div style={wrapStyle} className="tr-app-components-reviewwidgetpreview-div-48">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-49">{heading}</h2>
        <div style={{
          width: 220, height: 390, margin: "0 auto", borderRadius: 18, overflow: "hidden",
          position: "relative", background: `linear-gradient(135deg,${s.accentColor},#1a1a1a)`,
          display: "flex", alignItems: "flex-end",
        }} className="tr-app-components-reviewwidgetpreview-div-50">
          <div style={{
            width: "100%", padding: "16px 14px 18px", boxSizing: "border-box", color: "#fff",
            background: "linear-gradient(to top,rgba(0,0,0,.75),transparent)",
          }} className="tr-app-components-reviewwidgetpreview-div-51">
            <div style={{ fontSize: 13, marginBottom: 6 }} className="tr-app-components-reviewwidgetpreview-div-52">{stars(r.rating, "#fff", s.starGap)}</div>
            <p style={{ fontSize: 12, lineHeight: 1.5, margin: "0 0 6px" }} className="tr-app-components-reviewwidgetpreview-p-53">{r.comment}</p>
            <div style={{ fontWeight: 700, fontSize: 12 }} className="tr-app-components-reviewwidgetpreview-div-54">{r.customer}</div>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: "#888", marginTop: 8, textAlign: "center" }} className="tr-app-components-reviewwidgetpreview-p-55">Continuous vertical scroll feed on your storefront — swipe up for the next review.</p>
      </div>
    );
  }

  // Insta design family — mock media is drawn with gradients since the preview has no real uploads.
  const igStar = s.starColor || "#F59E0B";
  const igTiles = [
    `linear-gradient(160deg,#f6d365,#fda085)`, `linear-gradient(160deg,#a1c4fd,#c2e9fb)`,
    `linear-gradient(160deg,#d4fc79,#96e6a1)`, `linear-gradient(160deg,#fbc2eb,#a6c1ee)`,
  ];
  const igAvatar = (r, size = 26) => (
    <span style={{ width: size, height: size, borderRadius: "50%", background: s.accentColor, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, border: "1.5px solid #fff", flexShrink: 0, boxSizing: "border-box" }}>{initials(r.customer)}</span>
  );
  const igPlay = (
    <span style={{ position: "absolute", top: "50%", left: "50%", width: 34, height: 34, margin: "-17px 0 0 -17px", borderRadius: "50%", background: "rgba(255,255,255,.35)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>▶</span>
  );
  const igLogo = <span style={{ width: 14, height: 14, border: "1.8px solid currentColor", borderRadius: 4, display: "inline-block", boxSizing: "border-box" }} />;

  if (style === "insta_carousel") {
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {items.slice(0, 4).map((r, i) => (
            <div key={r.id} style={{ position: "relative", aspectRatio: "9/16", borderRadius: s.borderRadius, overflow: "hidden", background: igTiles[i % 4], color: "#fff" }}>
              <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, fontWeight: 700, background: "rgba(0,0,0,.45)", borderRadius: 99, padding: "2px 7px" }}>★ {r.rating.toFixed(1)}</span>
              {i % 2 === 0 && igPlay}
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 8px 8px", display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(to top,rgba(0,0,0,.6),transparent)" }}>
                {igAvatar(r, 22)}
                <span style={{ fontSize: 10, fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.customer}</span>
                {igLogo}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: "#888", marginTop: 8, textAlign: "center" }}>Horizontal row of reel cards — hover previews the video, tap opens the fullscreen player.</p>
      </div>
    );
  }

  if (style === "insta_mosaic") {
    const kinds = ["story", "post", "reel", "post"];
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ columnCount: 3, columnGap: 10 }}>
          {items.map((r, i) => {
            const kind = kinds[i % kinds.length];
            if (kind === "post") return (
              <div key={r.id} style={{ breakInside: "avoid", marginBottom: 10, borderRadius: s.borderRadius, overflow: "hidden", background: s.cardBackground, border: `1px solid ${s.borderColor}` }}>
                <div style={{ aspectRatio: "4/3", background: igTiles[i % 4] }} />
                <div style={{ padding: 9 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{igAvatar(r, 20)}<strong style={{ fontSize: 10.5, color: s.textColor }}>{r.customer}</strong>
                    <span style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: 5, background: "radial-gradient(circle at 30% 107%,#fdf497 0%,#fd5949 45%,#d6249f 60%,#285AEB 90%)" }} /></div>
                  <div style={{ fontSize: 10, margin: "5px 0 3px" }}>{stars(r.rating, igStar, s.starGap)}</div>
                  <p style={{ fontSize: 10, margin: 0, color: s.textColor, lineHeight: 1.4 }}>{r.comment.slice(0, 60)}…</p>
                </div>
              </div>
            );
            return (
              <div key={r.id} style={{ breakInside: "avoid", marginBottom: 10, position: "relative", aspectRatio: kind === "story" ? "9/15" : "9/14", borderRadius: s.borderRadius, overflow: "hidden", background: igTiles[i % 4], color: "#fff" }}>
                {kind === "story" ? (
                  <>
                    <div style={{ position: "absolute", top: 6, left: 6, right: 6, display: "flex", gap: 3 }}>{[1, 0.5, 0].map((w, k) => <i key={k} style={{ flex: 1, height: 2, background: `linear-gradient(90deg,#fff ${w * 100}%,rgba(255,255,255,.4) 0)` }} />)}</div>
                    <div style={{ position: "absolute", top: 14, left: 7, display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, fontWeight: 700 }}>{igAvatar(r, 18)}{r.customer}</div>
                    <div style={{ position: "absolute", left: 7, right: 7, bottom: 7, border: "1.3px solid #fff", borderRadius: 99, padding: "3px 8px", fontSize: 9 }}>★★★★★</div>
                  </>
                ) : (
                  <>
                    <strong style={{ position: "absolute", top: 8, left: 8, fontSize: 11 }}>Reels</strong>
                    <div style={{ position: "absolute", right: 7, bottom: 36, display: "flex", flexDirection: "column", gap: 8, fontSize: 12, alignItems: "center" }}><span>♥</span><span>💬</span><span>➤</span></div>
                    <div style={{ position: "absolute", left: 8, bottom: 8, display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, fontWeight: 700 }}>{igAvatar(r, 18)}{r.customer}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (style === "insta_phone") {
    const r = items[0];
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ display: "flex", gap: 22, alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 170, aspectRatio: "9/19", borderRadius: 28, background: "#0d0d0d", padding: 7, boxSizing: "border-box", flexShrink: 0, boxShadow: "0 14px 30px rgba(0,0,0,.25)" }}>
            <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 22, overflow: "hidden", background: igTiles[0], color: "#fff" }}>
              <div style={{ position: "absolute", top: 7, left: "50%", width: 50, height: 13, marginLeft: -25, borderRadius: 8, background: "#0d0d0d" }} />
              <div style={{ position: "absolute", top: 28, left: 9, right: 9, display: "flex", gap: 3 }}>{items.map((it, k) => <i key={it.id} style={{ flex: 1, height: 2, background: k === 0 ? "#fff" : "rgba(255,255,255,.4)" }} />)}</div>
              <div style={{ position: "absolute", top: 36, left: 9, display: "flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 700 }}>{igAvatar(r, 18)}{r.customer}</div>
              <div style={{ position: "absolute", left: 10, right: 30, bottom: 14, fontSize: 9, lineHeight: 1.4 }}><div>★★★★★</div>{r.comment.slice(0, 56)}…</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0, maxWidth: 300 }}>
            {items.slice(0, 4).map((it, k) => (
              <div key={it.id} style={{ display: "flex", gap: 9, alignItems: "center", padding: 8, borderRadius: s.borderRadius, background: s.cardBackground, border: `1.5px solid ${k === 0 ? s.accentColor : s.borderColor}` }}>
                <div style={{ width: 32, height: 42, borderRadius: 6, background: igTiles[k % 4], flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 11, color: s.textColor }}>{it.customer}</strong>
                  <div style={{ fontSize: 9.5 }}>{stars(it.rating, igStar, s.starGap)}</div>
                  <div style={{ fontSize: 10, color: s.textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.comment}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (style === "insta_stack") {
    const r = items[0];
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ position: "relative", width: 190, aspectRatio: "9/15", margin: "0 auto" }}>
          {[2, 1, 0].map((pos) => (
            <div key={pos} style={{
              position: "absolute", inset: 0, borderRadius: s.borderRadius + 6, overflow: "hidden", background: igTiles[pos],
              transform: `translateY(${pos * 12}px) scale(${1 - pos * 0.05}) rotate(${pos === 0 ? 0 : pos % 2 ? 2.5 : -2.5}deg)`,
              transformOrigin: "50% 90%", boxShadow: "0 10px 24px rgba(0,0,0,.2)", color: "#fff",
            }}>
              {pos === 0 && (
                <>
                  <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, fontWeight: 700, background: "rgba(0,0,0,.45)", borderRadius: 99, padding: "2px 7px" }}>★ {r.rating.toFixed(1)}</span>
                  {igPlay}
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "20px 10px 10px", background: "linear-gradient(to top,rgba(0,0,0,.65),transparent)", fontSize: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>{igAvatar(r, 20)}{r.customer}</div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 30 }}>
          <span style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${s.borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", color: s.textColor }}>‹</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>1 / {items.length}</span>
          <span style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>›</span>
        </div>
        <p style={{ fontSize: 11.5, color: "#888", marginTop: 8, textAlign: "center" }}>Swipe or drag the top card to see the next review.</p>
      </div>
    );
  }

  if (style === "hero_quote") {
    const r = items[0];
    return (
      <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-56">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-57">{heading}</h2>
        <div style={{
          borderRadius: s.borderRadius, minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center",
          background: `linear-gradient(135deg,${s.accentColor},#1a1a1a)`, padding: "40px 50px", boxSizing: "border-box",
        }} className="tr-app-components-reviewwidgetpreview-div-58">
          <div style={{ maxWidth: 520, textAlign: "center", color: "#fff" }} className="tr-app-components-reviewwidgetpreview-div-59">
            <div style={{ fontSize: 18, marginBottom: 14 }} className="tr-app-components-reviewwidgetpreview-div-60">{stars(r.rating, "#fff", s.starGap)}</div>
            <p style={{ fontSize: s.reviewSize * 1.3, fontStyle: "italic", fontFamily: "Georgia,serif", lineHeight: 1.5, margin: "0 0 14px" }} className="tr-app-components-reviewwidgetpreview-p-61">&ldquo;{r.comment}&rdquo;</p>
            <div style={{ fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", fontSize: 12, opacity: .85 }} className="tr-app-components-reviewwidgetpreview-div-62">{r.customer}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }} className="tr-app-components-reviewwidgetpreview-div-63">
          {items.map((it, i) => <span key={it.id} style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? s.accentColor : "#ddd" }}  className="tr-app-components-reviewwidgetpreview-span-64"/>)}
        </div>
      </div>
    );
  }

  if (style === "coverflow") {
    return (
      <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-65">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-66">{heading}</h2>
        {/* <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", minHeight: 200, padding: "10px 0" }} className="tr-app-components-reviewwidgetpreview-div-67">
          {items.slice(0, 3).map((r, i) => {
            const offset = i - 1;
            return (
              <div key={r.id} style={{
                width: 200, flexShrink: 0, marginLeft: offset === 0 ? 0 : -30,
                transform: `scale(${offset === 0 ? 1 : 0.85})`, opacity: offset === 0 ? 1 : 0.55,
                zIndex: offset === 0 ? 2 : 1, transition: "transform .3s,opacity .3s",
              }} className="tr-app-components-reviewwidgetpreview-div-68">
                <Card r={r} s={s} />
              </div>
            );
          })}
        </div> */}
        <div
  style={{
    width: "100%",
    minHeight: 320,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "30px 20px",
    overflow: "hidden",
    borderRadius: 20,
    border: "1px solid #E0EBF2",
    background:
      "radial-gradient(circle at 50% 40%, rgba(214,230,242,.72) 0%, rgba(242,247,251,.7) 38%, transparent 68%), linear-gradient(180deg,#F9FCFE 0%,#F1F7FA 100%)",
    boxSizing: "border-box",
  }}
  className="tr-app-components-reviewwidgetpreview-div-67 tr-review-showcase"
>
  <style>{`
    .tr-review-showcase,
    .tr-review-showcase *{
      box-sizing:border-box;
    }

    .tr-review-showcase-card{
      position:absolute;
      left:50%;
      top:50%;
      transition:
        transform .32s cubic-bezier(.2,.8,.3,1),
        opacity .3s ease,
        filter .3s ease,
        box-shadow .3s ease;
    }

    .tr-review-showcase-card[data-offset="-1"]{
      transform:translate(-112%,-50%) scale(.88);
    }

    .tr-review-showcase-card[data-offset="0"]{
      transform:translate(-50%,-50%) scale(1);
    }

    .tr-review-showcase-card[data-offset="1"]{
      transform:translate(12%,-50%) scale(.88);
    }

    .tr-review-showcase-card[data-active="true"]{
      z-index:3;
      opacity:1;
      filter:none;
    }

    .tr-review-showcase-card[data-active="false"]{
      z-index:1;
      opacity:.58;
      filter:saturate(.82);
    }

    .tr-review-showcase-card[data-active="true"]:hover{
      transform:translate(-50%,-53%) scale(1.015);
    }

    @media(max-width:720px){
      .tr-review-showcase{
        min-height:290px !important;
        padding:22px 12px !important;
      }

      .tr-review-showcase-card{
        width:min(240px,72vw) !important;
      }

      .tr-review-showcase-card[data-offset="-1"]{
        transform:translate(-102%,-50%) scale(.84);
      }

      .tr-review-showcase-card[data-offset="1"]{
        transform:translate(2%,-50%) scale(.84);
      }
    }

    @media(max-width:520px){
      .tr-review-showcase{
        min-height:270px !important;
        padding:18px 8px !important;
        border-radius:16px !important;
      }

      .tr-review-showcase-card{
        width:min(230px,76vw) !important;
      }

      .tr-review-showcase-card[data-offset="-1"]{
        transform:translate(-94%,-50%) scale(.80);
        opacity:.32 !important;
      }

      .tr-review-showcase-card[data-offset="1"]{
        transform:translate(-6%,-50%) scale(.80);
        opacity:.32 !important;
      }
    }

    @media(max-width:380px){
      .tr-review-showcase{
        min-height:250px !important;
      }

      .tr-review-showcase-card{
        width:min(218px,78vw) !important;
      }
    }
  `}</style>

  {/* soft spotlight */}
  <div
    style={{
      position: "absolute",
      width: 290,
      height: 290,
      borderRadius: "50%",
      background:
        "radial-gradient(circle, rgba(141,180,214,.18) 0%, rgba(141,180,214,.06) 46%, transparent 72%)",
      pointerEvents: "none",
    }}
  />

  {/* subtle floor */}
  <div
    style={{
      position: "absolute",
      bottom: 24,
      left: "18%",
      right: "18%",
      height: 28,
      borderRadius: "50%",
      background:
        "radial-gradient(ellipse, rgba(79,115,146,.11) 0%, transparent 70%)",
      filter: "blur(8px)",
      pointerEvents: "none",
    }}
  />

  {items.slice(0, 3).map((r, i) => {
    const offset = i - 1;
    const active = offset === 0;

    return (
      <div
        key={r.id}
        data-offset={offset}
        data-active={active ? "true" : "false"}
        style={{
          width: 250,
          flexShrink: 0,
          borderRadius: 18,

          padding: active ? 5 : 3,

          background: active
            ? "linear-gradient(145deg,#FFFFFF,#EDF5FA)"
            : "rgba(255,255,255,.72)",

          border: active
            ? "1px solid #D3E4EF"
            : "1px solid rgba(214,230,242,.85)",

          boxShadow: active
            ? "0 22px 48px rgba(79,115,146,.15), 0 5px 14px rgba(79,115,146,.06)"
            : "0 10px 26px rgba(79,115,146,.07)",

          overflow: "hidden",
        }}
        className="tr-app-components-reviewwidgetpreview-div-68 tr-review-showcase-card"
      >
        <Card r={r} s={s} />
      </div>
    );
  })}
</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }} className="tr-app-components-reviewwidgetpreview-div-69">
          {items.map((it, i) => <span key={it.id} style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? s.accentColor : "#ddd" }}  className="tr-app-components-reviewwidgetpreview-span-70"/>)}
        </div>
      </div>
    );
  }

  if (style === "split_media") {
    const r = items[0];
    return (
      <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-71">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-72">{heading}</h2>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: s.borderRadius, overflow: "hidden",
          border: `1px solid ${s.borderColor}`, minHeight: 240,
        }} className="tr-app-components-reviewwidgetpreview-div-73">
          <div style={{ background: `linear-gradient(135deg,${s.accentColor},#1a1a1a)` }}  className="tr-app-components-reviewwidgetpreview-div-74"/>
          <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", justifyContent: "center", background: s.cardBackground }} className="tr-app-components-reviewwidgetpreview-div-75">
            <div style={{ fontSize: 16, marginBottom: 10 }} className="tr-app-components-reviewwidgetpreview-div-76">{stars(r.rating, s.accentColor, s.starGap)}</div>
            {r.title && <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: s.textColor }} className="tr-app-components-reviewwidgetpreview-h3-77">{r.title}</h3>}
            <p style={{ fontSize: s.reviewSize, lineHeight: 1.65, color: s.textColor, margin: "0 0 12px" }} className="tr-app-components-reviewwidgetpreview-p-78">{r.comment}</p>
            <div style={{ fontWeight: 700, fontSize: 12, color: s.accentColor, textTransform: "uppercase", letterSpacing: ".04em" }} className="tr-app-components-reviewwidgetpreview-div-79">{r.customer}</div>
          </div>
        </div>
      </div>
    );
  }

  if (style === "popup") {
    return (
      <div style={{ padding: "20px 40px", position: "relative", minHeight: 260 }} className="tr-app-components-reviewwidgetpreview-div-80">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-81">{heading}</h2>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(s.columns, 2)}, 1fr)`, gap: s.cardGap }} className="tr-app-components-reviewwidgetpreview-div-82">
          {items.slice(0, 2).map((r) => <Card key={r.id} r={r} s={s} />)}
        </div>
        <div style={{
          position: "absolute", bottom: 0, right: 0, background: s.accentColor, color: "#fff",
          borderRadius: 24, padding: "10px 18px", fontSize: 12, fontWeight: 600, boxShadow: "0 4px 14px rgba(0,0,0,.2)",
        }} className="tr-app-components-reviewwidgetpreview-div-83">
          Reviews
        </div>
      </div>
    );
  }

  if (style === "star_summary") {
    return (
      <div style={wrapStyle} className="tr-app-components-reviewwidgetpreview-div-84">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-85">{heading}</h2>
        <div style={{
          display: "flex", alignItems: "center", gap: 24, padding: "18px 22px", marginBottom: 18,
          background: s.cardBackground, border: `1px solid ${s.borderColor}`, borderRadius: s.borderRadius,
        }} className="tr-app-components-reviewwidgetpreview-div-86">
          <div className="tr-app-components-reviewwidgetpreview-div-87">
            <div style={{ fontSize: 38, fontWeight: 600, color: s.accentColor, lineHeight: 1 }} className="tr-app-components-reviewwidgetpreview-div-88">{avg.toFixed(1)}</div>
            <div style={{ fontSize: 16 }} className="tr-app-components-reviewwidgetpreview-div-89">{stars(Math.round(avg), s.accentColor, s.starGap)}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }} className="tr-app-components-reviewwidgetpreview-div-90">{items.length} reviews</div>
          </div>
          <div style={{ flex: 1 }} className="tr-app-components-reviewwidgetpreview-div-91">
            {[5, 4, 3, 2, 1].map((n) => {
              const cnt = items.filter((r) => r.rating === n).length;
              const pct = Math.round((cnt / items.length) * 100);
              return (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }} className="tr-app-components-reviewwidgetpreview-div-92">
                  <span style={{ width: 14, fontSize: 11.5, color: "#555" }} className="tr-app-components-reviewwidgetpreview-span-93">{n}</span>
                  <div style={{ flex: 1, height: 7, background: "#eee", borderRadius: 4, overflow: "hidden" }} className="tr-app-components-reviewwidgetpreview-div-94">
                    <div style={{ width: `${pct}%`, height: "100%", background: s.accentColor }}  className="tr-app-components-reviewwidgetpreview-div-95"/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${s.columns}, 1fr)`, gap: s.cardGap }} className="tr-app-components-reviewwidgetpreview-div-96">
          {items.map((r) => <Card key={r.id} r={r} s={s} />)}
        </div>
      </div>
    );
  }

  const carouselProps = { items, s, heading, wrapStyle: { ...wrapStyle, padding: `${s.paddingTop}px 20px ${s.paddingBottom}px` }, headingStyle };
  // key={style} resets the slide index when the merchant switches designs.
  if (style === "slider")           return <PvCarousel key={style} {...carouselProps} variant="slider" />;
  if (style === "scroll_strip")     return <PvCarousel key={style} {...carouselProps} variant="strip" />;
  if (style === "center_carousel")  return <PvCarousel key={style} {...carouselProps} variant="center" />;
  if (style === "bubble_carousel")  return <PvBubble key={style} {...carouselProps} />;
  if (style === "marquee")          return <PvMarquee key={style} {...carouselProps} />;
  if (style === "spotlight_slider") return <PvSpotlight key={style} {...carouselProps} />;

  if (style === "quote_fade") {
    const r = items[0];
    return (
      <div style={wrapStyle} className="tr-app-components-reviewwidgetpreview-div-101">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-102">{heading}</h2>
        <div style={{ textAlign: "center", padding: "12px 0" }} className="tr-app-components-reviewwidgetpreview-div-103">
          <div style={{ fontSize: s.reviewSize * 0.85, marginBottom: 10 }} className="tr-app-components-reviewwidgetpreview-div-104">{stars(r.rating, s.accentColor, s.starGap)}</div>
          <p style={{
            fontSize: s.reviewSize * 1.3, fontStyle: "italic", color: s.textColor,
            maxWidth: 520, margin: "0 auto 14px", lineHeight: 1.6,
          }} className="tr-app-components-reviewwidgetpreview-p-105">“{r.comment}”</p>
          <div style={{ fontWeight: 600, color: s.accentColor, fontSize: s.metaSize }} className="tr-app-components-reviewwidgetpreview-div-106">{r.customer}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }} className="tr-app-components-reviewwidgetpreview-div-107">
            {items.map((it, i) => (
              <span key={it.id} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i === 0 ? s.accentColor : "#ddd",
              }}  className="tr-app-components-reviewwidgetpreview-span-108"/>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (style === "masonry_wall") {
    return (
      <div style={wrapStyle} className="tr-app-components-reviewwidgetpreview-div-109">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-110">{heading}</h2>
        <div style={{ columnCount: s.columns, columnGap: s.cardGap }} className="tr-app-components-reviewwidgetpreview-div-111">
          {items.map((r) => (
            <div key={r.id} style={{ marginBottom: s.cardGap, breakInside: "avoid" }} className="tr-app-components-reviewwidgetpreview-div-112">
              <Card r={r} s={s} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (style === "badge_strip") {
    return (
      <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-113">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-114">{heading}</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }} className="tr-app-components-reviewwidgetpreview-div-115">
          <div style={{ background: s.accentColor, color: "#fff", borderRadius: 24, padding: "6px 14px", fontSize: 12.5, fontWeight: 600 }} className="tr-app-components-reviewwidgetpreview-div-116">{avg.toFixed(1)} Overall</div>
          {items.map((r) => (
            <div key={r.id} style={{ background: s.accentColor, color: "#fff", borderRadius: 24, padding: "6px 14px", fontSize: 12.5, fontWeight: 600 }} className="tr-app-components-reviewwidgetpreview-div-117">
              {r.rating}/5 {r.customer}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (style === "summary_side") {
    const starCol = s.starColor || "#F59E0B";
    const pos     = s.summaryPosition || "left";
    const isRow   = pos === "left" || pos === "right";
    const flexDir = pos === "right" ? "row-reverse" : pos === "bottom" ? "column-reverse" : pos === "top" ? "column" : "row";
    const totalMock = items.length * 41;

    return (
      <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-118">
        {/* Header row: label+heading left, Write a review button right */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20 }} className="tr-app-components-reviewwidgetpreview-div-119">
          <div className="tr-app-components-reviewwidgetpreview-div-120">
            <div style={{ fontSize: s.metaSize, fontWeight: 600, color: s.accentColor, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }} className="tr-app-components-reviewwidgetpreview-div-121">
              Customer reviews
            </div>
            <h2 style={{ ...headingStyle, fontSize: Math.min(s.headingSize, 22), margin: 0, color: s.headingColor || s.textColor }} className="tr-app-components-reviewwidgetpreview-h2-122">{heading}</h2>
          </div>
          <button style={{ flexShrink: 0, padding: "9px 20px", background: s.writeBtnColor || s.textColor || "#333", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }} className="tr-app-components-reviewwidgetpreview-button-123">
            Write a review
          </button>
        </div>

        {/* Two-panel layout */}
        <div style={{ display: "flex", flexDirection: flexDir, gap: 28, alignItems: "flex-start" }} className="tr-app-components-reviewwidgetpreview-div-124">
          {/* Summary panel: score + bars */}
          <div style={{ minWidth: isRow ? 190 : "100%", maxWidth: isRow ? 210 : "100%", flexShrink: 0 }} className="tr-app-components-reviewwidgetpreview-div-125">
            <div style={{ fontSize: 48, fontWeight: 600, color: s.accentColor, lineHeight: 1, marginBottom: 4 }} className="tr-app-components-reviewwidgetpreview-div-126">{avg.toFixed(1)}</div>
            <div style={{ fontSize: s.reviewSize * 0.85, marginBottom: 4 }} className="tr-app-components-reviewwidgetpreview-div-127">{stars(Math.round(avg), starCol, s.starGap)}</div>
            <div style={{ fontSize: s.metaSize, color: s.mutedTextColor || "#888", marginBottom: 14 }} className="tr-app-components-reviewwidgetpreview-div-128">Based on {totalMock} reviews</div>
            {[5,4,3,2,1].map((n) => {
              const cnt = items.filter((r) => r.rating === n).length;
              const pct = Math.round((cnt / items.length) * 100) || (n === 5 ? 85 : n === 4 ? 10 : n === 3 ? 3 : 1);
              return (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }} className="tr-app-components-reviewwidgetpreview-div-129">
                  <span style={{ fontSize: 11, color: s.mutedTextColor || "#555", width: 12 }} className="tr-app-components-reviewwidgetpreview-span-130">{n}</span>
                  <span style={{ fontSize: 12, color: starCol }} className="tr-app-components-reviewwidgetpreview-span-131">★</span>
                  <div style={{ flex: 1, height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }} className="tr-app-components-reviewwidgetpreview-div-132">
                    <div style={{ width: `${pct}%`, height: "100%", background: s.accentColor, borderRadius: 3 }}  className="tr-app-components-reviewwidgetpreview-div-133"/>
                  </div>
                  <span style={{ fontSize: 11, color: s.mutedTextColor || "#888", width: 24, textAlign: "right" }} className="tr-app-components-reviewwidgetpreview-span-134">{cnt * 20 || pct}</span>
                </div>
              );
            })}
          </div>

          {/* Review list */}
          <div style={{ flex: 1, minWidth: 0 }} className="tr-app-components-reviewwidgetpreview-div-135">
            {items.map((r, i) => (
              <div key={r.id} style={{ padding: "14px 0", borderTop: `1px solid ${s.borderColor}`, ...(i === items.length - 1 ? { borderBottom: `1px solid ${s.borderColor}` } : {}) }} className="tr-app-components-reviewwidgetpreview-div-136">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }} className="tr-app-components-reviewwidgetpreview-div-137">
                  <div style={{ fontSize: s.reviewSize * 0.85 }} className="tr-app-components-reviewwidgetpreview-div-138">{stars(r.rating, starCol, s.starGap)}</div>
                  {s.showDate && <span style={{ fontSize: s.metaSize, color: s.mutedTextColor || "#888" }} className="tr-app-components-reviewwidgetpreview-span-139">2 weeks ago</span>}
                </div>
                <div style={{ fontSize: s.reviewSize * 1.05, fontWeight: 600, color: s.textColor, marginBottom: 4 }} className="tr-app-components-reviewwidgetpreview-div-140">{r.title}</div>
                <p style={{ fontSize: s.reviewSize, color: s.textColor, margin: "0 0 8px", lineHeight: 1.5 }} className="tr-app-components-reviewwidgetpreview-p-141">{r.comment}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="tr-app-components-reviewwidgetpreview-div-142">
                  {s.showAvatar && (
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: s.accentColor, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600 }} className="tr-app-components-reviewwidgetpreview-span-143">
                      {initials(r.customer)}
                    </span>
                  )}
                  <span style={{ fontSize: s.metaSize, fontWeight: 600, color: s.textColor }} className="tr-app-components-reviewwidgetpreview-span-144">{r.customer}</span>
                  {s.showVerified && <span style={{ fontSize: 10, color: "#1a7a3a" }} className="tr-app-components-reviewwidgetpreview-span-145">✓ Verified purchase</span>}
                </div>
                {s.showHelpfulVoting !== false && (
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 10 }} className="tr-app-components-reviewwidgetpreview-div-146">
                    <span style={{ fontSize: s.metaSize, color: s.mutedTextColor || "#888" }} className="tr-app-components-reviewwidgetpreview-span-147">Was this review helpful?</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, border: `1.2px solid ${s.borderColor}`, borderRadius: 6, padding: "4px 10px", fontSize: s.metaSize, color: s.textColor }} className="tr-app-components-reviewwidgetpreview-span-148">👍 0</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, border: `1.2px solid ${s.borderColor}`, borderRadius: 6, padding: "4px 10px", fontSize: s.metaSize, color: s.textColor }} className="tr-app-components-reviewwidgetpreview-span-149">👎 0</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (style === "classic_list") {
    const starCol  = s.starColor || "#F59E0B";
    const tAlign   = s.textAlign || "left";
    const jContent = tAlign === "center" ? "center" : tAlign === "right" ? "flex-end" : "flex-start";
    return (
      <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-150">
        <h2 style={{ ...headingStyle, textAlign: tAlign }} className="tr-app-components-reviewwidgetpreview-h2-151">{heading}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, justifyContent: jContent }} className="tr-app-components-reviewwidgetpreview-div-152">
          <span style={{ fontSize: s.metaSize, color: s.mutedTextColor || "#888" }} className="tr-app-components-reviewwidgetpreview-span-153">Sort:</span>
          <select style={{ border: `1px solid ${s.borderColor}`, borderRadius: 6, padding: "4px 10px", fontSize: s.metaSize, background: "#fff" }} className="tr-app-components-reviewwidgetpreview-select-154">
            <option className="tr-app-components-reviewwidgetpreview-option-155">Newest</option>
          </select>
        </div>
        {items.map((r, i) => (
          <div key={r.id} style={{
            padding: "16px 0",
            borderTop: `1px solid ${s.borderColor}`,
            borderBottom: i === items.length - 1 ? `1px solid ${s.borderColor}` : "none",
            textAlign: tAlign,
          }} className="tr-app-components-reviewwidgetpreview-div-156">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, justifyContent: jContent, flexWrap: "wrap" }} className="tr-app-components-reviewwidgetpreview-div-157">
              {s.showAvatar && (
                <span style={{
                  width: 30, height: 30, borderRadius: "50%", background: s.accentColor, color: "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0,
                }} className="tr-app-components-reviewwidgetpreview-span-158">{initials(r.customer)}</span>
              )}
              <strong style={{ fontSize: s.metaSize, color: s.textColor }} className="tr-app-components-reviewwidgetpreview-strong-159">{r.customer}</strong>
              <span style={{ fontSize: s.reviewSize * 0.75 }} className="tr-app-components-reviewwidgetpreview-span-160">{stars(r.rating, starCol, s.starGap)}</span>
              {s.showVerified && <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "1px 6px", background: "#e6f4ea", color: "#1a7a3a" }} className="tr-app-components-reviewwidgetpreview-span-161">Verified</span>}
              {s.showDate && <span style={{ fontSize: s.metaSize, color: s.mutedTextColor || "#888", marginLeft: tAlign === "left" ? "auto" : 0 }} className="tr-app-components-reviewwidgetpreview-span-162">{r.createdAt}</span>}
            </div>
            <div style={{ fontSize: s.reviewSize * 1.05, fontWeight: 600, marginBottom: 4, color: s.textColor }} className="tr-app-components-reviewwidgetpreview-div-163">{r.title}</div>
            <p style={{ fontSize: s.reviewSize, margin: 0, lineHeight: 1.5, color: s.textColor }} className="tr-app-components-reviewwidgetpreview-p-164">{r.comment}</p>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 20 }} className="tr-app-components-reviewwidgetpreview-div-165">
          {["‹", "1", "2", "3", "›", "»"].map((label, i) => (
            <button key={i} style={{
              border: `1px solid ${i === 1 ? s.accentColor : s.borderColor}`,
              background: i === 1 ? s.accentColor : "#fff",
              color: i === 1 ? "#fff" : s.textColor,
              borderRadius: 6, padding: "4px 10px", fontSize: s.metaSize, cursor: "pointer", minWidth: 32,
            }} className="tr-app-components-reviewwidgetpreview-button-166">{label}</button>
          ))}
        </div>
      </div>
    );
  }

  if (["list_view", "editorial"].includes(style)) {
    return (
      <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-167">
        <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-168">{heading}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: s.cardGap }} className="tr-app-components-reviewwidgetpreview-div-169">
          {items.map((r) => <Card key={r.id} r={r} s={s} editorial={style === "editorial"} />)}
        </div>
      </div>
    );
  }

  // Default grid family: dark_grid, minimal_grid, accent_wall, reviews_grid, happy_customers, etc.
  const isDark = style === "dark_grid";
  const isAccentWall = style === "accent_wall";
  const gridCardSettings = isAccentWall
    ? { ...s, cardBackground: s.accentColor, textColor: "#fff" }
    : isDark
    ? { ...s, cardBackground: "#1a1a1a", textColor: "#f0f0f0" }
    : s;

  return (
    <div style={{ padding: "40px 20px" }} className="tr-app-components-reviewwidgetpreview-div-170">
      <h2 style={headingStyle} className="tr-app-components-reviewwidgetpreview-h2-171">{heading}</h2>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${s.columns}, 1fr)`, gap: s.cardGap }} className="tr-app-components-reviewwidgetpreview-div-172">
        {items.map((r) => <Card key={r.id} r={r} s={gridCardSettings} />)}
      </div>
    </div>
  );
}
