// Live admin preview for the review-display widget family.
// Ports the visual logic of extensions/product-review/blocks/reviews-widget.liquid into React
// against hardcoded sample data, so settings changes reflect instantly without a real storefront fetch.

const MOCK_REVIEWS = [
  { id: 1, customer: "Emily R.", rating: 5, title: "Perfect winter sweater", comment: "This sweater exceeded all my expectations. Thick enough to keep me warm but still breathable indoors.", createdAt: "2025-08-18", likes: 12 },
  { id: 2, customer: "James K.", rating: 4, title: "Great quality", comment: "Really nice material and stitching. Slightly large but overall happy with the purchase.", createdAt: "2025-07-02", likes: 4 },
  { id: 3, customer: "Sofia M.", rating: 5, title: "Will buy again", comment: "Exactly as pictured, fast shipping, and the color is even better in person.", createdAt: "2025-06-21", likes: 8 },
  { id: 4, customer: "Daniel P.", rating: 3, title: "Good but runs small", comment: "Nice design but I'd recommend sizing up.", createdAt: "2025-05-30", likes: 1 },
];

function stars(rating, accent) {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ color: i < rating ? accent : "#ddd" }}>★</span>
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
      display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
    }}>{initials(r.customer)}</span>
  );
  return (
    <div style={cardStyle}>
      {editorial && avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: s.reviewSize * 0.7, marginBottom: 4 }}>{stars(r.rating, s.accentColor)}</div>
        <div style={{ fontSize: s.reviewSize * 1.05, fontWeight: 700, marginBottom: 4 }}>{r.title}</div>
        <p style={{ fontSize: s.reviewSize, margin: "0 0 8px", lineHeight: 1.5 }}>{r.comment}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: s.metaSize, color: "#888", flexWrap: "wrap" }}>
          {!editorial && avatar}
          <strong>{r.customer}</strong>
          {s.showVerified && <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 6px", background: "#e6f4ea", color: "#1a7a3a" }}>Verified</span>}
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
  const headingStyle = { fontSize: s.headingSize, fontWeight: 700, color: s.accentColor, margin: "0 0 16px" };

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
          <div style={{ fontSize: 20 }}>{stars(Math.round(avg), s.accentColor)}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{avg.toFixed(1)} / 5</div>
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
          padding: "10px 8px", borderRadius: "8px 0 0 8px", fontSize: 12, fontWeight: 700,
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

  if (style === "popup") {
    return (
      <div style={{ ...wrapStyle, position: "relative", minHeight: 260 }}>
        <h2 style={headingStyle}>{heading}</h2>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(s.columns, 2)}, 1fr)`, gap: s.cardGap }}>
          {items.slice(0, 2).map((r) => <Card key={r.id} r={r} s={s} />)}
        </div>
        <div style={{
          position: "absolute", bottom: 0, right: 0, background: s.accentColor, color: "#fff",
          borderRadius: 24, padding: "10px 18px", fontSize: 12, fontWeight: 700, boxShadow: "0 4px 14px rgba(0,0,0,.2)",
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
            <div style={{ fontSize: 38, fontWeight: 800, color: s.accentColor, lineHeight: 1 }}>{avg.toFixed(1)}</div>
            <div style={{ fontSize: 16 }}>{stars(Math.round(avg), s.accentColor)}</div>
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
