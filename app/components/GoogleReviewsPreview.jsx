// app/components/GoogleReviewsPreview.jsx
// Renders a live preview of whichever of the 17 Google Reviews widget
// designs is selected, using either cached live data or sample numbers.
// Every design reads from the same style-token object so every knob in the
// admin builder (padding, margin, gap, border, font, star size, ...) applies
// consistently across all of them.

import { useState } from "react";

const G_COLORS = ["#4285F4", "#EA4335", "#FBBC05", "#4285F4", "#34A853", "#EA4335"];
const AVATAR_COLORS = ["#c98a5e", "#5e8ac9", "#a15ec9", "#5ec98a", "#c95e5e", "#5ec9c0"];

function GoogleMark({ size = 15 }) {
  return (
    <span style={{ display: "inline-flex", fontWeight: 700, fontSize: size, letterSpacing: "-.02em" }}>
      {"Google".split("").map((ch, i) => (
        <span key={i} style={{ color: G_COLORS[i] }}>{ch}</span>
      ))}
    </span>
  );
}

function Stars({ rating, t, size }) {
  const rounded = Math.round(rating || 0);
  return (
    <span style={{ color: t.starColor, fontSize: size || t.starSize, letterSpacing: 1, whiteSpace: "nowrap" }}>
      {"★★★★★".split("").map((s, i) => (
        <span key={i} style={{ opacity: i < rounded ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

function Avatar({ initial, bg, size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, color: "#fff",
    }}>{initial}</div>
  );
}

// Shared card frame — every design's root renders through this so padding,
// border, radius, gap, font and colors come from one place.
function Frame({ t, style, children }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: t.gap,
      padding: t.padding, borderRadius: t.borderRadius,
      border: `${t.borderWidth}px solid ${t.borderColor}`,
      fontFamily: t.fontFamily === "inherit" ? undefined : t.fontFamily,
      fontSize: t.fontSize, color: t.textColor, background: t.backgroundColor,
      maxWidth: t.maxWidth > 0 ? t.maxWidth : undefined,
      minHeight: t.minHeight > 0 ? t.minHeight : undefined,
      boxSizing: "border-box",
      ...style,
    }}>
      {children}
    </div>
  );
}

function WriteReviewButton({ t, placeId }) {
  if (!t.showWriteReviewButton) return null;
  const href = placeId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}` : "#";
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      alignSelf: "flex-start", fontSize: Math.max(11, t.fontSize - 2), fontWeight: 700,
      color: "#fff", background: t.accentColor, borderRadius: Math.min(t.borderRadius, 8),
      padding: "7px 14px", textDecoration: "none",
    }}>
      {t.writeReviewButtonText}
    </a>
  );
}

function Slider({ t, revs }) {
  const [i, setI] = useState(0);
  const rv = revs[i] || revs[0];
  return (
    <Frame t={t} style={{ alignItems: "center", textAlign: "center", maxWidth: t.maxWidth > 0 ? t.maxWidth : 360 }}>
      <Stars rating={rv.rating} t={t} />
      <p style={{ margin: 0, lineHeight: 1.55 }}>"{rv.text}"</p>
      <div style={{ fontSize: Math.max(10, t.fontSize - 3), opacity: .65 }}>— {rv.authorName}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => setI((i - 1 + revs.length) % revs.length)} style={navBtnStyle(t)}>‹</button>
        <div style={{ display: "flex", gap: 5 }}>
          {revs.map((_, di) => (
            <span key={di} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: di === i ? t.accentColor : "#d8d8d8",
            }} />
          ))}
        </div>
        <button onClick={() => setI((i + 1) % revs.length)} style={navBtnStyle(t)}>›</button>
      </div>
    </Frame>
  );
}

function navBtnStyle(t) {
  return {
    border: "none", background: "none", cursor: "pointer", fontSize: 18,
    color: t.accentColor, lineHeight: 1, padding: 4,
  };
}

// Google only returns up to 5 reviews per place — pagination works within
// that cap (reviewsPerPage lets a merchant force multiple pages over them).
function FullWall({ t, d, placeId }) {
  const perPage = Math.max(1, t.reviewsPerPage || 5);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(d.revs.length / perPage));
  const pageRevs = d.revs.slice(page * perPage, page * perPage + perPage);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.gap, fontFamily: t.fontFamily === "inherit" ? undefined : t.fontFamily, fontSize: t.fontSize, color: t.textColor }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        padding: t.padding, background: t.backgroundColor, borderRadius: t.borderRadius,
        border: `${t.borderWidth}px solid ${t.borderColor}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <GoogleMark />
          <span style={{ fontWeight: 700, fontSize: t.headingFontSize * .6 }}>{d.r.toFixed(1)}</span>
          <Stars rating={d.r} t={t} />
          <span style={{ opacity: .6 }}>{d.count} reviews</span>
        </div>
        <WriteReviewButton t={t} placeId={placeId} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: t.gap }}>
        {pageRevs.map((rv, i) => (
          <div key={i} style={{
            display: "flex", gap: 12, padding: t.padding,
            background: i % 2 === 0 ? t.backgroundColor : "rgba(0,0,0,.02)",
            borderRadius: t.borderRadius, border: `${t.borderWidth}px solid ${t.borderColor}`,
          }}>
            <Avatar initial={rv.authorName[0]} bg={AVATAR_COLORS[i % 6]} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: t.fontSize }}>{rv.authorName}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "3px 0" }}>
                <Stars rating={rv.rating} t={t} size={t.starSize - 1} />
                {rv.relativeTime && <span style={{ fontSize: t.fontSize - 3, opacity: .55 }}>{rv.relativeTime}</span>}
              </div>
              <p style={{ margin: 0, fontSize: t.fontSize - 1, lineHeight: 1.55, opacity: .85 }}>{rv.text}</p>
              <div style={{ marginTop: 6 }}><GoogleMark size={t.fontSize - 3} /></div>
            </div>
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={paginationBtnStyle(t, page === 0)}>‹</button>
          {Array.from({ length: pageCount }, (_, p) => (
            <button key={p} onClick={() => setPage(p)} style={{
              ...paginationBtnStyle(t, false),
              background: p === page ? t.accentColor : "transparent",
              color: p === page ? "#fff" : t.textColor,
            }}>{p + 1}</button>
          ))}
          <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page === pageCount - 1} style={paginationBtnStyle(t, page === pageCount - 1)}>›</button>
        </div>
      )}
    </div>
  );
}

function paginationBtnStyle(t, disabled) {
  return {
    border: `1px solid ${t.borderColor}`, borderRadius: 6, minWidth: 28, height: 28,
    background: "transparent", color: t.textColor, cursor: disabled ? "default" : "pointer",
    opacity: disabled ? .4 : 1, fontSize: t.fontSize - 2,
  };
}

const SAMPLE_REVIEWS = [
  { authorName: "Rhea M.", rating: 5, text: "Arrived perfectly packed, exactly as described.", relativeTime: "2 weeks ago" },
  { authorName: "Dev K.", rating: 5, text: "Fast shipping, ordering again.", relativeTime: "a month ago" },
  { authorName: "Priya S.", rating: 5, text: "Quality is genuinely better than the price suggests.", relativeTime: "a month ago" },
];

const RENDERERS = {
  minimal_badge: (t, d) => (
    <Frame t={t} style={{ flexDirection: "row", alignItems: "center", display: "inline-flex" }}>
      <GoogleMark />
      <div style={{ width: 1, height: 16, background: "#e2e2e2" }} />
      <Stars rating={d.r} t={t} />
      <span style={{ fontWeight: 700 }}>{d.r.toFixed(1)}</span>
      <span style={{ opacity: .6 }}>({d.count})</span>
    </Frame>
  ),

  star_row: (t, d) => (
    <Frame t={t} style={{ flexDirection: "row", alignItems: "center", display: "inline-flex", border: "none", padding: 0, background: "transparent" }}>
      <Stars rating={d.r} t={t} />
      <span style={{ fontWeight: 700 }}>{d.r.toFixed(1)}</span>
      <span style={{ opacity: .6, textDecoration: "underline" }}>{d.count} Google reviews</span>
    </Frame>
  ),

  corner_overlay: (t, d) => (
    <div style={{ position: "relative", width: 170, height: 130, borderRadius: t.borderRadius, overflow: "hidden", background: "linear-gradient(135deg,#dcd3c4,#b9ac93)" }}>
      <div style={{ position: "absolute", top: 9, left: 9, background: "rgba(255,255,255,.92)", borderRadius: 8, padding: "5px 9px", display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontWeight: 700, fontSize: t.fontSize - 2 }}>{d.r.toFixed(1)}</span>
        <Stars rating={d.r} t={t} size={t.starSize - 4} />
      </div>
    </div>
  ),

  micro_row: (t, d) => (
    <Frame t={t} style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", border: "none", padding: 0, background: "transparent" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Stars rating={d.r} t={t} /> {d.r.toFixed(1)}/5</span>
      <div style={{ width: 1, height: 14, background: "#e2e2e2" }} />
      <span>{d.count} reviews</span>
      <div style={{ width: 1, height: 14, background: "#e2e2e2" }} />
      <span style={{ fontSize: t.fontSize - 3, color: "#34A853", fontWeight: 700 }}>✓ Verified on Google</span>
    </Frame>
  ),

  carousel: (t, d) => (
    <Frame t={t}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <GoogleMark size={13} />
        <span><Stars rating={d.r} t={t} /> {d.r.toFixed(1)}</span>
      </div>
      <div style={{ display: "flex", gap: t.gap, overflowX: "auto" }}>
        {d.revs.slice(0, 4).map((rv, i) => (
          <div key={i} style={{ flex: "0 0 auto", width: 160, background: "#fafaf8", border: "1px solid #ececec", borderRadius: t.borderRadius, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Avatar initial={rv.authorName[0]} bg={AVATAR_COLORS[i % 6]} />
              <span style={{ fontWeight: 700, fontSize: t.fontSize - 2 }}>{rv.authorName}</span>
            </div>
            <p style={{ fontSize: t.fontSize - 3, lineHeight: 1.5, margin: 0, opacity: .75 }}>"{rv.text}"</p>
          </div>
        ))}
      </div>
    </Frame>
  ),

  wall: (t, d) => (
    <Frame t={t} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "none", padding: 0, background: "transparent" }}>
      {d.revs.slice(0, 4).map((rv, i) => (
        <div key={i} style={{ background: t.backgroundColor, border: `${t.borderWidth}px solid ${t.borderColor}`, borderRadius: t.borderRadius, padding: t.padding }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <Avatar initial={rv.authorName[0]} bg={AVATAR_COLORS[i % 6]} size={24} />
            <span style={{ fontWeight: 700, fontSize: t.fontSize - 3 }}>{rv.authorName}</span>
          </div>
          <Stars rating={rv.rating} t={t} size={t.starSize - 3} />
          <p style={{ fontSize: t.fontSize - 3, lineHeight: 1.5, margin: "6px 0 0", opacity: .75 }}>"{rv.text}"</p>
        </div>
      ))}
    </Frame>
  ),

  ticker: (t, d) => (
    <div style={{ width: "100%", background: t.backgroundColor, borderTop: `${t.borderWidth}px solid ${t.borderColor}`, borderBottom: `${t.borderWidth}px solid ${t.borderColor}`, padding: `${t.padding}px 0`, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: t.gap * 2 }}>
        {d.revs.map((rv, i) => (
          <span key={i} style={{ fontSize: t.fontSize - 2, color: t.textColor, whiteSpace: "nowrap" }}>
            <Stars rating={rv.rating} t={t} size={t.starSize - 2} /> "{rv.text}" — {rv.authorName}
          </span>
        ))}
      </div>
    </div>
  ),

  banner: (t, d) => (
    <Frame t={t} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
      <div>
        <div style={{ fontFamily: "ui-serif,Georgia,serif", fontSize: t.headingFontSize, lineHeight: 1 }}>{d.r.toFixed(1)}<span style={{ fontSize: t.headingFontSize * .45, opacity: .7 }}>/5</span></div>
        <div style={{ fontSize: t.fontSize - 1, opacity: .8 }}>from {d.count} verified Google reviews</div>
      </div>
      <div style={{ fontSize: t.fontSize - 2, fontWeight: 700, border: `1px solid currentColor`, opacity: .9, borderRadius: 8, padding: "8px 14px", whiteSpace: "nowrap" }}>See our reviews →</div>
    </Frame>
  ),

  floating: (t, d) => (
    <div style={{ position: "relative", width: "100%", height: 140, background: "repeating-linear-gradient(0deg,#fbfbf9,#fbfbf9 22px,#f2f1ed 22px,#f2f1ed 23px)", borderRadius: 10 }}>
      <div style={{ position: "absolute", bottom: 14, right: 14, background: t.backgroundColor, borderRadius: 999, boxShadow: "0 6px 18px rgba(0,0,0,.14)", display: "flex", alignItems: "center", gap: 8, padding: "9px 14px 9px 9px" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#4285F4", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>G</div>
        <div>
          <div style={{ fontSize: t.fontSize - 2, fontWeight: 700, lineHeight: 1.2, color: t.textColor }}><Stars rating={d.r} t={t} size={t.starSize - 2} /> {d.r.toFixed(1)}</div>
          <div style={{ fontSize: t.fontSize - 4, opacity: .6 }}>{d.count} reviews</div>
        </div>
      </div>
    </div>
  ),

  popup: (t, d) => (
    <Frame t={t} style={{ maxWidth: t.maxWidth > 0 ? t.maxWidth : 230 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <GoogleMark size={12.5} />
        <span style={{ fontSize: t.fontSize - 3, fontWeight: 700 }}><Stars rating={d.r} t={t} size={t.starSize - 2} /> {d.r.toFixed(1)}</span>
      </div>
      {d.revs.slice(0, 2).map((rv, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Avatar initial={rv.authorName[0]} bg={AVATAR_COLORS[i % 6]} size={22} />
          <div><p style={{ fontWeight: 700, margin: 0, fontSize: t.fontSize - 3 }}>{rv.authorName}</p><p style={{ fontSize: t.fontSize - 3.5, lineHeight: 1.5, margin: "2px 0 0", opacity: .75 }}>"{rv.text}"</p></div>
        </div>
      ))}
    </Frame>
  ),

  checkout_strip: (t, d) => (
    <Frame t={t} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", borderStyle: "dashed" }}>
      <GoogleMark size={12} />
      <span style={{ fontSize: t.fontSize - 2 }}>Rated {d.r.toFixed(1)}★ by {d.count} customers — shop with confidence</span>
    </Frame>
  ),

  big_stat: (t, d) => (
    <Frame t={t} style={{ alignItems: "center", textAlign: "center", border: "none", background: "transparent" }}>
      <div><span style={{ fontFamily: "ui-serif,Georgia,serif", fontSize: t.headingFontSize * 2, lineHeight: 1 }}>{d.r.toFixed(1)}</span><span style={{ fontSize: t.fontSize + 1, opacity: .6, marginLeft: 4 }}>/5</span></div>
      <div style={{ fontSize: t.fontSize - 2.5, opacity: .6 }}>GOOGLE RATING · {d.count} REVIEWS</div>
    </Frame>
  ),

  branded_card: (t, d) => (
    <Frame t={t} style={{ maxWidth: t.maxWidth > 0 ? t.maxWidth : 250 }}>
      <GoogleMark />
      <div style={{ fontSize: t.fontSize - 3.5, opacity: .6 }}>{d.name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "ui-serif,Georgia,serif", fontSize: t.headingFontSize }}>{d.r.toFixed(1)}</span>
        <Stars rating={d.r} t={t} />
      </div>
    </Frame>
  ),

  dark_card: (t, d) => {
    const top = d.revs[0] || { text: "", authorName: "" };
    return (
      <Frame t={t} style={{ maxWidth: t.maxWidth > 0 ? t.maxWidth : 260 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "ui-serif,Georgia,serif", fontSize: t.headingFontSize }}>{d.r.toFixed(1)}</span>
          <Stars rating={d.r} t={t} />
        </div>
        <p style={{ fontSize: t.fontSize - 2.5, lineHeight: 1.6, opacity: .8, margin: 0 }}>"{top.text}"</p>
        <div style={{ fontSize: t.fontSize - 3.5, opacity: .6 }}>{top.authorName} · Google review</div>
      </Frame>
    );
  },

  spotlight: (t, d) => {
    const top = d.revs[0] || { text: "", authorName: "" };
    return (
      <Frame t={t} style={{ alignItems: "center", textAlign: "center", border: "none", background: "transparent" }}>
        <p style={{ fontFamily: "ui-serif,Georgia,serif", fontSize: t.headingFontSize * .65, lineHeight: 1.45, margin: 0 }}>"{top.text}"</p>
        <div style={{ fontSize: t.fontSize - 2.5, opacity: .6 }}>— {top.authorName}, <Stars rating={5} t={t} size={t.starSize - 2} /> on Google</div>
      </Frame>
    );
  },

  slider: (t, d) => <Slider t={t} revs={d.revs} />,

  full_wall: (t, d, placeId) => <FullWall t={t} d={d} placeId={placeId} />,

  list: (t, d) => (
    <Frame t={t} style={{ border: "none", padding: 0, background: "transparent" }}>
      {d.revs.map((rv, i) => (
        <div key={i} style={{ display: "flex", gap: 10, padding: t.padding, border: `${t.borderWidth}px solid ${t.borderColor}`, borderRadius: t.borderRadius, background: t.backgroundColor }}>
          <Avatar initial={rv.authorName[0]} bg={AVATAR_COLORS[i % 6]} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: t.fontSize - 1 }}>{rv.authorName}</span>
              <Stars rating={rv.rating} t={t} size={t.starSize - 2} />
            </div>
            <p style={{ fontSize: t.fontSize - 2, lineHeight: 1.55, margin: "4px 0 0", opacity: .8 }}>{rv.text}</p>
            {rv.relativeTime && <div style={{ fontSize: t.fontSize - 4, opacity: .5, marginTop: 4 }}>{rv.relativeTime}</div>}
          </div>
        </div>
      ))}
    </Frame>
  ),
};

export default function GoogleReviewsPreview({ style, colors, spacing, placeId, rating, reviewCount, reviews, displayName }) {
  const t = {
    accentColor: colors?.accentColor || "#1a1a1a",
    starColor: colors?.starColor || "#FBBC05",
    backgroundColor: colors?.backgroundColor || "#FFFFFF",
    textColor: colors?.textColor || "#1c1b1a",
    fontFamily: spacing?.fontFamily || "inherit",
    fontSize: spacing?.fontSize ?? 14,
    headingFontSize: spacing?.headingFontSize ?? 28,
    starSize: spacing?.starSize ?? 14,
    padding: spacing?.padding ?? 16,
    margin: spacing?.margin ?? 0,
    gap: spacing?.gap ?? 12,
    borderRadius: spacing?.borderRadius ?? 10,
    borderColor: spacing?.borderColor || "#E5E5E5",
    borderWidth: spacing?.borderWidth ?? 1,
    maxWidth: spacing?.maxWidth ?? 0,
    minHeight: spacing?.minHeight ?? 0,
    showWriteReviewButton: spacing?.showWriteReviewButton ?? true,
    writeReviewButtonText: spacing?.writeReviewButtonText || "Write a review on Google",
    reviewsPerPage: spacing?.reviewsPerPage ?? 5,
  };

  const r = typeof rating === "number" ? rating : 4.8;
  const count = typeof reviewCount === "number" ? reviewCount : 236;
  const revs = (reviews && reviews.length ? reviews : SAMPLE_REVIEWS).slice(0, 5);
  const name = displayName || "Your Store";

  const renderer = RENDERERS[style] || RENDERERS.minimal_badge;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: t.margin }}>
      {renderer(t, { r, count, revs, name }, placeId)}
      {style !== "full_wall" && <WriteReviewButton t={t} placeId={placeId} />}
    </div>
  );
}

export const GOOGLE_REVIEWS_STYLE_OPTIONS = [
  { label: "Minimal badge",          value: "minimal_badge" },
  { label: "Compact star row",       value: "star_row" },
  { label: "Image corner overlay",   value: "corner_overlay" },
  { label: "Micro trust row",        value: "micro_row" },
  { label: "Review carousel",        value: "carousel" },
  { label: "Testimonial wall",       value: "wall" },
  { label: "Review ticker",          value: "ticker" },
  { label: "Hero trust banner",      value: "banner" },
  { label: "Floating corner widget", value: "floating" },
  { label: "Popup on click",         value: "popup" },
  { label: "Checkout trust strip",   value: "checkout_strip" },
  { label: "Big number stat",        value: "big_stat" },
  { label: "Google-branded card",    value: "branded_card" },
  { label: "Dark premium card",      value: "dark_card" },
  { label: "Review spotlight",       value: "spotlight" },
  { label: "Slider",                 value: "slider" },
  { label: "List",                   value: "list" },
  { label: "Full reviews wall",      value: "full_wall" },
];
