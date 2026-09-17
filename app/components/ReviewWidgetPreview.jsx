// Live admin preview for the review-display widget family.
// Ports the visual logic of extensions/product-review/blocks/reviews-widget.liquid into React
// against hardcoded sample data, so settings changes reflect instantly without a real storefront fetch.

const MOCK_REVIEWS = [
  { id: 1, customer: "Emily R.", rating: 5, title: "Perfect winter sweater", comment: "This sweater exceeded all my expectations. Thick enough to keep me warm but still breathable indoors.", createdAt: "2025-08-18", likes: 12 },
  { id: 2, customer: "James K.", rating: 4, title: "Great quality", comment: "Really nice material and stitching. Slightly large but overall happy with the purchase.", createdAt: "2025-07-02", likes: 4 },
  { id: 3, customer: "Sofia M.", rating: 5, title: "Will buy again", comment: "Exactly as pictured, fast shipping, and the color is even better in person.", createdAt: "2025-06-21", likes: 8 },
  { id: 4, customer: "Daniel P.", rating: 3, title: "Good but runs small", comment: "Nice design but I'd recommend sizing up.", createdAt: "2025-05-30", likes: 1 },
];

function stars(rating, accent, gap) {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ color: i < rating ? accent : "#ddd", marginRight: i < 4 ? (gap ?? 2) : 0 }}>★</span>
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
    }}>{initials(r.customer)}</span>
  );
  return (
    <div style={cardStyle}>
      {editorial && avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: s.reviewSize * 0.7, marginBottom: 4 }}>{stars(r.rating, s.accentColor, s.starGap)}</div>
        <div style={{ fontSize: s.reviewSize * 1.05, fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
        <p style={{ fontSize: s.reviewSize, margin: "0 0 8px", lineHeight: 1.5 }}>{r.comment}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: s.metaSize, color: s.mutedTextColor || "#888", flexWrap: "wrap" }}>
          {!editorial && avatar}
          <strong>{r.customer}</strong>
          {s.showVerified && <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "1px 6px", background: "#e6f4ea", color: "#1a7a3a" }}>Verified</span>}
          {s.showDate && <span>{r.createdAt}</span>}
          <span style={{ marginLeft: "auto", border: `1px solid ${s.accentColor}`, color: s.accentColor, borderRadius: 20, padding: "2px 9px", fontSize: 11 }}>+1 {r.likes}</span>
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
      <div style={wrapStyle}>
        <div style={{ fontSize: s.reviewSize, color: s.textColor, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: s.accentColor }}>✓</span> {items.length * 32} Verified Reviews
        </div>
      </div>
    );
  }

  if (style === "all_reviews_counter") {
    return (
      <div style={wrapStyle}>
        <div style={{ fontSize: s.reviewSize, color: s.textColor, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: s.accentColor }}>★</span> {items.length * 87} Total Reviews across your store
        </div>
      </div>
    );
  }

  if (style === "trust_medals") {
    return (
      <div style={wrapStyle}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 18px",
          border: `2px solid ${s.accentColor}`, borderRadius: 12, color: s.textColor,
        }}>
          <div style={{ fontSize: 20 }}>{stars(Math.round(avg), s.accentColor, s.starGap)}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{avg.toFixed(1)} / 5</div>
            <div style={{ fontSize: 11, color: "#888" }}>{items.length * 41} reviews · Verified</div>
          </div>
        </div>
      </div>
    );
  }

  if (style === "floating_tab") {
    return (
      <div style={{ ...wrapStyle, position: "relative", minHeight: 220 }}>
        <h2 style={headingStyle}>{heading}</h2>
        <p style={{ fontSize: 12.5, color: "#888" }}>(Floating tab preview — appears fixed to the side of the page on your storefront)</p>
        <div style={{
          position: "absolute", top: 40, right: 0, background: s.accentColor, color: "#fff",
          padding: "10px 8px", borderRadius: "8px 0 0 8px", fontSize: 12, fontWeight: 600,
          writingMode: "vertical-rl", textOrientation: "mixed", cursor: "pointer",
        }}>
          ★ Reviews
        </div>
      </div>
    );
  }

  if (style === "snippet_rotator") {
    const r = items[0];
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ maxWidth: 360 }}><Card r={r} s={s} /></div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#888" }}>‹ rotates through your reviews ›</div>
      </div>
    );
  }

  if (style === "compact_rows") {
    const starCol = s.starColor || "#F59E0B";
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((r, i) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
              borderTop: i === 0 ? `1px solid ${s.borderColor}` : "none", borderBottom: `1px solid ${s.borderColor}`,
            }}>
              <span style={{ fontSize: s.reviewSize * 0.75, flexShrink: 0 }}>{stars(r.rating, starCol, s.starGap)}</span>
              <span style={{ flex: 1, fontSize: s.reviewSize * 0.9, color: s.textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.title ? `${r.title} — ${r.comment}` : r.comment}
              </span>
              <span style={{ fontSize: s.metaSize, fontWeight: 600, color: "#555", flexShrink: 0 }}>{r.customer}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (style === "insta_stories") {
    const gradient = "conic-gradient(from 180deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75)";
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 6 }}>
          {items.map((r) => (
            <div key={r.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, width: 66 }}>
              <div style={{ width: 62, height: 62, borderRadius: "50%", padding: 3, background: gradient, boxSizing: "border-box" }}>
                <div style={{
                  width: "100%", height: "100%", borderRadius: "50%", background: s.accentColor, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13,
                  border: "2.5px solid #fff", boxSizing: "border-box",
                }}>{initials(r.customer)}</div>
              </div>
              <span style={{ fontSize: 10.5, color: s.textColor, maxWidth: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.customer.split(" ")[0]}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: "#888", marginTop: 8 }}>Tap a circle on your storefront to open the fullscreen story player.</p>
      </div>
    );
  }

  if (style === "insta_reels") {
    const r = items[0];
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{
          width: 220, height: 390, margin: "0 auto", borderRadius: 18, overflow: "hidden",
          position: "relative", background: `linear-gradient(135deg,${s.accentColor},#1a1a1a)`,
          display: "flex", alignItems: "flex-end",
        }}>
          <div style={{
            width: "100%", padding: "16px 14px 18px", boxSizing: "border-box", color: "#fff",
            background: "linear-gradient(to top,rgba(0,0,0,.75),transparent)",
          }}>
            <div style={{ fontSize: 13, marginBottom: 6 }}>{stars(r.rating, "#fff", s.starGap)}</div>
            <p style={{ fontSize: 12, lineHeight: 1.5, margin: "0 0 6px" }}>{r.comment}</p>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{r.customer}</div>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: "#888", marginTop: 8, textAlign: "center" }}>Continuous vertical scroll feed on your storefront — swipe up for the next review.</p>
      </div>
    );
  }

  if (style === "hero_quote") {
    const r = items[0];
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{
          borderRadius: s.borderRadius, minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center",
          background: `linear-gradient(135deg,${s.accentColor},#1a1a1a)`, padding: "40px 50px", boxSizing: "border-box",
        }}>
          <div style={{ maxWidth: 520, textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 18, marginBottom: 14 }}>{stars(r.rating, "#fff", s.starGap)}</div>
            <p style={{ fontSize: s.reviewSize * 1.3, fontStyle: "italic", fontFamily: "Georgia,serif", lineHeight: 1.5, margin: "0 0 14px" }}>&ldquo;{r.comment}&rdquo;</p>
            <div style={{ fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", fontSize: 12, opacity: .85 }}>{r.customer}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
          {items.map((it, i) => <span key={it.id} style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? s.accentColor : "#ddd" }} />)}
        </div>
      </div>
    );
  }

  if (style === "coverflow") {
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", minHeight: 200, padding: "10px 0" }}>
          {items.slice(0, 3).map((r, i) => {
            const offset = i - 1;
            return (
              <div key={r.id} style={{
                width: 200, flexShrink: 0, marginLeft: offset === 0 ? 0 : -30,
                transform: `scale(${offset === 0 ? 1 : 0.85})`, opacity: offset === 0 ? 1 : 0.55,
                zIndex: offset === 0 ? 2 : 1, transition: "transform .3s,opacity .3s",
              }}>
                <Card r={r} s={s} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
          {items.map((it, i) => <span key={it.id} style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? s.accentColor : "#ddd" }} />)}
        </div>
      </div>
    );
  }

  if (style === "split_media") {
    const r = items[0];
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: s.borderRadius, overflow: "hidden",
          border: `1px solid ${s.borderColor}`, minHeight: 240,
        }}>
          <div style={{ background: `linear-gradient(135deg,${s.accentColor},#1a1a1a)` }} />
          <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", justifyContent: "center", background: s.cardBackground }}>
            <div style={{ fontSize: 16, marginBottom: 10 }}>{stars(r.rating, s.accentColor, s.starGap)}</div>
            {r.title && <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: s.textColor }}>{r.title}</h3>}
            <p style={{ fontSize: s.reviewSize, lineHeight: 1.65, color: s.textColor, margin: "0 0 12px" }}>{r.comment}</p>
            <div style={{ fontWeight: 700, fontSize: 12, color: s.accentColor, textTransform: "uppercase", letterSpacing: ".04em" }}>{r.customer}</div>
          </div>
        </div>
      </div>
    );
  }

  if (style === "popup") {
    return (
      <div style={{ ...wrapStyle, position: "relative", minHeight: 260 }}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(s.columns, 2)}, 1fr)`, gap: s.cardGap }}>
          {items.slice(0, 2).map((r) => <Card key={r.id} r={r} s={s} />)}
        </div>
        <div style={{
          position: "absolute", bottom: 0, right: 0, background: s.accentColor, color: "#fff",
          borderRadius: 24, padding: "10px 18px", fontSize: 12, fontWeight: 600, boxShadow: "0 4px 14px rgba(0,0,0,.2)",
        }}>
          Reviews
        </div>
      </div>
    );
  }

  if (style === "star_summary") {
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{
          display: "flex", alignItems: "center", gap: 24, padding: "18px 22px", marginBottom: 18,
          background: s.cardBackground, border: `1px solid ${s.borderColor}`, borderRadius: s.borderRadius,
        }}>
          <div>
            <div style={{ fontSize: 38, fontWeight: 600, color: s.accentColor, lineHeight: 1 }}>{avg.toFixed(1)}</div>
            <div style={{ fontSize: 16 }}>{stars(Math.round(avg), s.accentColor, s.starGap)}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{items.length} reviews</div>
          </div>
          <div style={{ flex: 1 }}>
            {[5, 4, 3, 2, 1].map((n) => {
              const cnt = items.filter((r) => r.rating === n).length;
              const pct = Math.round((cnt / items.length) * 100);
              return (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 14, fontSize: 11.5, color: "#555" }}>{n}</span>
                  <div style={{ flex: 1, height: 7, background: "#eee", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: s.accentColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${s.columns}, 1fr)`, gap: s.cardGap }}>
          {items.map((r) => <Card key={r.id} r={r} s={s} />)}
        </div>
      </div>
    );
  }

  if (["scroll_strip", "slider"].includes(style)) {
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ display: "flex", gap: s.cardGap, overflowX: "auto", paddingBottom: 6 }}>
          {items.map((r) => <div key={r.id} style={{ minWidth: 240, flexShrink: 0 }}><Card r={r} s={s} /></div>)}
        </div>
      </div>
    );
  }

  if (style === "quote_fade") {
    const r = items[0];
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: s.reviewSize * 0.85, marginBottom: 10 }}>{stars(r.rating, s.accentColor, s.starGap)}</div>
          <p style={{
            fontSize: s.reviewSize * 1.3, fontStyle: "italic", color: s.textColor,
            maxWidth: 520, margin: "0 auto 14px", lineHeight: 1.6,
          }}>“{r.comment}”</p>
          <div style={{ fontWeight: 600, color: s.accentColor, fontSize: s.metaSize }}>{r.customer}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
            {items.map((it, i) => (
              <span key={it.id} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i === 0 ? s.accentColor : "#ddd",
              }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (style === "masonry_wall") {
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ columnCount: s.columns, columnGap: s.cardGap }}>
          {items.map((r) => (
            <div key={r.id} style={{ marginBottom: s.cardGap, breakInside: "avoid" }}>
              <Card r={r} s={s} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (style === "badge_strip") {
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ background: s.accentColor, color: "#fff", borderRadius: 24, padding: "6px 14px", fontSize: 12.5, fontWeight: 600 }}>{avg.toFixed(1)} Overall</div>
          {items.map((r) => (
            <div key={r.id} style={{ background: s.accentColor, color: "#fff", borderRadius: 24, padding: "6px 14px", fontSize: 12.5, fontWeight: 600 }}>
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
      <div style={wrapStyle}>
        {/* Header row: label+heading left, Write a review button right */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: s.metaSize, fontWeight: 600, color: s.accentColor, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              Customer reviews
            </div>
            <h2 style={{ ...headingStyle, fontSize: Math.min(s.headingSize, 22), margin: 0, color: s.headingColor || s.textColor }}>{heading}</h2>
          </div>
          <button style={{ flexShrink: 0, padding: "9px 20px", background: s.writeBtnColor || s.textColor || "#333", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            Write a review
          </button>
        </div>

        {/* Two-panel layout */}
        <div style={{ display: "flex", flexDirection: flexDir, gap: 28, alignItems: "flex-start" }}>
          {/* Summary panel: score + bars */}
          <div style={{ minWidth: isRow ? 190 : "100%", maxWidth: isRow ? 210 : "100%", flexShrink: 0 }}>
            <div style={{ fontSize: 48, fontWeight: 600, color: s.accentColor, lineHeight: 1, marginBottom: 4 }}>{avg.toFixed(1)}</div>
            <div style={{ fontSize: s.reviewSize * 0.85, marginBottom: 4 }}>{stars(Math.round(avg), starCol, s.starGap)}</div>
            <div style={{ fontSize: s.metaSize, color: s.mutedTextColor || "#888", marginBottom: 14 }}>Based on {totalMock} reviews</div>
            {[5,4,3,2,1].map((n) => {
              const cnt = items.filter((r) => r.rating === n).length;
              const pct = Math.round((cnt / items.length) * 100) || (n === 5 ? 85 : n === 4 ? 10 : n === 3 ? 3 : 1);
              return (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: s.mutedTextColor || "#555", width: 12 }}>{n}</span>
                  <span style={{ fontSize: 12, color: starCol }}>★</span>
                  <div style={{ flex: 1, height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: s.accentColor, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, color: s.mutedTextColor || "#888", width: 24, textAlign: "right" }}>{cnt * 20 || pct}</span>
                </div>
              );
            })}
          </div>

          {/* Review list */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {items.map((r, i) => (
              <div key={r.id} style={{ padding: "14px 0", borderTop: `1px solid ${s.borderColor}`, ...(i === items.length - 1 ? { borderBottom: `1px solid ${s.borderColor}` } : {}) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: s.reviewSize * 0.85 }}>{stars(r.rating, starCol, s.starGap)}</div>
                  {s.showDate && <span style={{ fontSize: s.metaSize, color: s.mutedTextColor || "#888" }}>2 weeks ago</span>}
                </div>
                <div style={{ fontSize: s.reviewSize * 1.05, fontWeight: 600, color: s.textColor, marginBottom: 4 }}>{r.title}</div>
                <p style={{ fontSize: s.reviewSize, color: s.textColor, margin: "0 0 8px", lineHeight: 1.5 }}>{r.comment}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {s.showAvatar && (
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: s.accentColor, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600 }}>
                      {initials(r.customer)}
                    </span>
                  )}
                  <span style={{ fontSize: s.metaSize, fontWeight: 600, color: s.textColor }}>{r.customer}</span>
                  {s.showVerified && <span style={{ fontSize: 10, color: "#1a7a3a" }}>✓ Verified purchase</span>}
                </div>
                {s.showHelpfulVoting !== false && (
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                    <span style={{ fontSize: s.metaSize, color: s.mutedTextColor || "#888" }}>Was this review helpful?</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, border: `1.2px solid ${s.borderColor}`, borderRadius: 6, padding: "4px 10px", fontSize: s.metaSize, color: s.textColor }}>👍 0</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, border: `1.2px solid ${s.borderColor}`, borderRadius: 6, padding: "4px 10px", fontSize: s.metaSize, color: s.textColor }}>👎 0</span>
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
      <div style={wrapStyle}>
        <h2 style={{ ...headingStyle, textAlign: tAlign }}>{heading}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, justifyContent: jContent }}>
          <span style={{ fontSize: s.metaSize, color: s.mutedTextColor || "#888" }}>Sort:</span>
          <select style={{ border: `1px solid ${s.borderColor}`, borderRadius: 6, padding: "4px 10px", fontSize: s.metaSize, background: "#fff" }}>
            <option>Newest</option>
          </select>
        </div>
        {items.map((r, i) => (
          <div key={r.id} style={{
            padding: "16px 0",
            borderTop: `1px solid ${s.borderColor}`,
            borderBottom: i === items.length - 1 ? `1px solid ${s.borderColor}` : "none",
            textAlign: tAlign,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, justifyContent: jContent, flexWrap: "wrap" }}>
              {s.showAvatar && (
                <span style={{
                  width: 30, height: 30, borderRadius: "50%", background: s.accentColor, color: "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0,
                }}>{initials(r.customer)}</span>
              )}
              <strong style={{ fontSize: s.metaSize, color: s.textColor }}>{r.customer}</strong>
              <span style={{ fontSize: s.reviewSize * 0.75 }}>{stars(r.rating, starCol, s.starGap)}</span>
              {s.showVerified && <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "1px 6px", background: "#e6f4ea", color: "#1a7a3a" }}>Verified</span>}
              {s.showDate && <span style={{ fontSize: s.metaSize, color: s.mutedTextColor || "#888", marginLeft: tAlign === "left" ? "auto" : 0 }}>{r.createdAt}</span>}
            </div>
            <div style={{ fontSize: s.reviewSize * 1.05, fontWeight: 600, marginBottom: 4, color: s.textColor }}>{r.title}</div>
            <p style={{ fontSize: s.reviewSize, margin: 0, lineHeight: 1.5, color: s.textColor }}>{r.comment}</p>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 20 }}>
          {["‹", "1", "2", "3", "›", "»"].map((label, i) => (
            <button key={i} style={{
              border: `1px solid ${i === 1 ? s.accentColor : s.borderColor}`,
              background: i === 1 ? s.accentColor : "#fff",
              color: i === 1 ? "#fff" : s.textColor,
              borderRadius: 6, padding: "4px 10px", fontSize: s.metaSize, cursor: "pointer", minWidth: 32,
            }}>{label}</button>
          ))}
        </div>
      </div>
    );
  }

  if (["list_view", "editorial"].includes(style)) {
    return (
      <div style={wrapStyle}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: s.cardGap }}>
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
    <div style={wrapStyle}>
      <h2 style={headingStyle}>{heading}</h2>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${s.columns}, 1fr)`, gap: s.cardGap }}>
        {items.map((r) => <Card key={r.id} r={r} s={gridCardSettings} />)}
      </div>
    </div>
  );
}
