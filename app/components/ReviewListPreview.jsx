// Live admin preview for the review list/cards section of
// extensions/product-review/blocks/review.liquid, against hardcoded sample data.

const MOCK_REVIEWS = [
  { id: 1, customer: "Emily R.", rating: 5, title: "Perfect winter sweater", comment: "This sweater exceeded all my expectations. Thick enough to keep me warm but still breathable indoors.", likes: 12 },
  { id: 2, customer: "James K.", rating: 4, title: "Great quality", comment: "Really nice material and stitching. Slightly large but overall happy with the purchase.", likes: 4 },
  { id: 3, customer: "Sofia M.", rating: 5, title: "Will buy again", comment: "Exactly as pictured, fast shipping, and the color is even better in person.", likes: 8 },
];

function initials(name) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function stars(rating, accent) {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ color: i < rating ? accent : "#ddd" }}>★</span>
  ));
}

function ListCard({ r, s }) {
  return (
    <div style={{
      display: "flex", gap: 16, padding: "18px 0",
      borderBottom: `1px solid ${s.cardBorderColor}`, background: s.cardBackground,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%", background: `${s.accentColor}1a`,
        color: s.accentColor, display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 13, flexShrink: 0,
      }}>
        {initials(r.customer)}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 14, borderLeft: `1px solid ${s.cardBorderColor}` }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>{stars(r.rating, s.accentColor)}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: s.cardTextColor, marginBottom: 4 }}>{r.title}</div>
        <div style={{ fontSize: 11.5, color: "#888", marginBottom: 6 }}>{r.customer}</div>
        <p style={{ fontSize: 13, color: s.cardTextColor, lineHeight: 1.5, margin: "0 0 8px" }}>{r.comment}</p>
        <button style={{
          fontSize: 11.5, border: "1.2px solid #ddd", borderRadius: 3, padding: "4px 10px",
          background: "none", color: "#555",
        }}>✓ Helpful ({r.likes})</button>
      </div>
    </div>
  );
}

function GridCard({ r, s }) {
  return (
    <div style={{
      background: s.cardBackground, border: `1px solid ${s.cardBorderColor}`, borderRadius: 10,
      padding: 16, display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ fontSize: 13 }}>{stars(r.rating, s.accentColor)}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: s.cardTextColor }}>{r.title}</div>
      <p style={{ fontSize: 12.5, color: s.cardTextColor, lineHeight: 1.5, margin: 0, flex: 1 }}>{r.comment}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#888" }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%", background: s.accentColor, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 10, flexShrink: 0,
        }}>
          {initials(r.customer)}
        </div>
        <strong style={{ color: s.cardTextColor }}>{r.customer}</strong>
      </div>
    </div>
  );
}

function CompactCard({ r, s }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
      borderBottom: `1px solid ${s.cardBorderColor}`, background: s.cardBackground,
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%", background: s.accentColor, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 10, flexShrink: 0, marginTop: 2,
      }}>
        {initials(r.customer)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, marginBottom: 2 }}>
          <span style={{ fontSize: 12 }}>{stars(r.rating, s.accentColor)}</span>
          <strong style={{ color: s.cardTextColor }}>{r.customer}</strong>
        </div>
        <p style={{ fontSize: 12.5, color: s.cardTextColor, margin: 0, lineHeight: 1.4 }}>{r.title} — {r.comment}</p>
      </div>
    </div>
  );
}

function MinimalCard({ r, s }) {
  return (
    <div style={{ padding: "16px 0", borderBottom: `1px solid ${s.cardBorderColor}`, background: s.cardBackground }}>
      <div style={{ fontSize: 13 }}>{stars(r.rating, s.accentColor)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 8px" }}>
        <span style={{
          width: 22, height: 22, borderRadius: "50%", background: "#f0f0f0",
          display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12,
        }}>👤</span>
        <span style={{ fontSize: 12, color: "#888" }}>{r.customer}</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: s.cardTextColor, marginBottom: 4 }}>{r.title}</div>
      <p style={{ fontSize: 13, color: s.cardTextColor, margin: 0, lineHeight: 1.5 }}>{r.comment}</p>
    </div>
  );
}

function Pagination({ s }) {
  const numStyle = (active) => ({
    minWidth: 26, height: 26, borderRadius: 4, border: `1.5px solid ${active ? s.accentColor : "#ddd"}`,
    background: active ? s.accentColor : "none", color: active ? "#fff" : "#333",
    display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
  });
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 16, fontSize: 12, color: "#888" }}>
      <span style={{ ...numStyle(false), opacity: 0.4 }}>‹</span>
      <span style={numStyle(true)}>1</span>
      <span style={numStyle(false)}>2</span>
      <span style={numStyle(false)}>3</span>
      <span style={numStyle(false)}>›</span>
      <span style={{ marginLeft: 8, fontSize: 11 }}>{s.reviewsPerPage} per page</span>
    </div>
  );
}

function ScopeNote({ s }) {
  if (!s.showAllProducts) return null;
  return (
    <div style={{
      fontSize: 11.5, color: "#9a6700", background: "#fff8e6", border: "1px solid #f0d999",
      borderRadius: 6, padding: "6px 10px", marginBottom: 12,
    }}>
      Showing reviews from all products in your store, not just this one.
    </div>
  );
}

export default function ReviewListPreview({ listStyle, settings }) {
  const s = settings;

  if (listStyle === "grid") {
    return (
      <div>
        <ScopeNote s={s} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {MOCK_REVIEWS.map((r) => <GridCard key={r.id} r={r} s={s} />)}
        </div>
        <Pagination s={s} />
      </div>
    );
  }

  if (listStyle === "compact") {
    return (
      <div>
        <ScopeNote s={s} />
        {MOCK_REVIEWS.map((r) => <CompactCard key={r.id} r={r} s={s} />)}
        <Pagination s={s} />
      </div>
    );
  }

  if (listStyle === "minimal") {
    return (
      <div>
        <ScopeNote s={s} />
        {MOCK_REVIEWS.map((r) => <MinimalCard key={r.id} r={r} s={s} />)}
        <Pagination s={s} />
      </div>
    );
  }

  return (
    <div>
      <ScopeNote s={s} />
      {MOCK_REVIEWS.map((r) => <ListCard key={r.id} r={r} s={s} />)}
      <Pagination s={s} />
    </div>
  );
}
