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
    <span key={i} style={{ color: i < rating ? accent : "#ddd" }} className="tr-app-components-reviewlistpreview-span-1">★</span>
  ));
}

function ListCard({ r, s }) {
  return (
    // <div style={{
    //   display: "flex", gap: 16, padding: "18px 0",
    //   borderBottom: `1px solid ${s.cardBorderColor}`, background: s.cardBackground,
    // }} className="tr-app-components-reviewlistpreview-div-2">
    //   <div style={{
    //     width: 44, height: 44, borderRadius: "50%", background: `${s.accentColor}1a`,
    //     color: s.accentColor, display: "flex", alignItems: "center", justifyContent: "center",
    //     fontWeight: 600, fontSize: 13, flexShrink: 0,
    //   }} className="tr-app-components-reviewlistpreview-div-3">
    //     {initials(r.customer)}
    //   </div>
    //   <div style={{ flex: 1, minWidth: 0, paddingLeft: 14, borderLeft: `1px solid ${s.cardBorderColor}` }} className="tr-app-components-reviewlistpreview-div-4">
    //     <div style={{ fontSize: 13, marginBottom: 4 }} className="tr-app-components-reviewlistpreview-div-5">{stars(r.rating, s.accentColor)}</div>
    //     <div style={{ fontSize: 13, fontWeight: 600, color: s.cardTextColor, marginBottom: 4 }} className="tr-app-components-reviewlistpreview-div-6">{r.title}</div>
    //     <div style={{ fontSize: 11.5, color: "#888", marginBottom: 6 }} className="tr-app-components-reviewlistpreview-div-7">{r.customer}</div>
    //     <p style={{ fontSize: 13, color: s.cardTextColor, lineHeight: 1.5, margin: "0 0 8px" }} className="tr-app-components-reviewlistpreview-p-8">{r.comment}</p>
    //     <button style={{
    //       fontSize: 11.5, border: "1.2px solid #ddd", borderRadius: 3, padding: "4px 10px",
    //       background: "none", color: "#555",
    //     }} className="tr-app-components-reviewlistpreview-button-9">✓ Helpful ({r.likes})</button>
    //   </div>
    // </div>
    <div
  style={{
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    padding: "18px 16px",
    borderBottom: `1px solid ${s.cardBorderColor}`,
    background: s.cardBackground,
    fontSize: 14,
    position: "relative",
    transition:
      "background .18s ease, box-shadow .18s ease, transform .18s ease",
    boxSizing: "border-box",
  }}
  className="tr-app-components-reviewlistpreview-div-2 tr-review-list-item"
>
  <style>{`
    .tr-review-list-item,
    .tr-review-list-item *{
      box-sizing:border-box;
    }

    .tr-review-list-item:hover{
      box-shadow:0 7px 22px rgba(79,115,146,.055);
      z-index:1;
    }

    .tr-review-avatar{
      transition:
        transform .16s ease,
        box-shadow .16s ease;
    }

    .tr-review-list-item:hover .tr-review-avatar{
      transform:translateY(-1px);
      box-shadow:0 6px 15px rgba(79,115,146,.10) !important;
    }

    .tr-review-helpful{
      transition:
        transform .15s ease,
        box-shadow .15s ease,
        opacity .15s ease;
    }

    .tr-review-helpful:hover{
      transform:translateY(-1px);
      box-shadow:0 5px 12px rgba(79,115,146,.08);
    }

    .tr-review-helpful:active{
      transform:translateY(0);
    }

    @media(max-width:600px){
      .tr-review-list-item{
        padding:16px 12px !important;
        gap:11px !important;
      }

      .tr-review-avatar{
        width:42px !important;
        height:42px !important;
      }

      .tr-review-content{
        padding-left:0 !important;
        border-left:none !important;
      }

      .tr-review-title{
        font-size:14px !important;
      }

      .tr-review-comment{
        font-size:13.5px !important;
      }
    }

    @media(max-width:380px){
      .tr-review-list-item{
        padding:14px 10px !important;
        gap:9px !important;
      }

      .tr-review-avatar{
        width:38px !important;
        height:38px !important;
        font-size:11.5px !important;
      }

      .tr-review-stars{
        font-size:12.5px !important;
      }

      .tr-review-customer{
        font-size:11.5px !important;
      }
    }
  `}</style>

  <div
    style={{
      width: 46,
      height: 46,
      borderRadius: 13,
      background: `linear-gradient(145deg, ${s.accentColor}18, ${s.accentColor}2b)`,
      color: s.accentColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      fontSize: 13,
      flexShrink: 0,
      border: `1px solid ${s.accentColor}30`,
      boxShadow: `0 4px 12px ${s.accentColor}12`,
      letterSpacing: ".02em",
    }}
    className="tr-app-components-reviewlistpreview-div-3 tr-review-avatar"
  >
    {initials(r.customer)}
  </div>

  <div
    style={{
      flex: 1,
      minWidth: 0,
      paddingLeft: 14,
      borderLeft: `1px solid ${s.cardBorderColor}`,
    }}
    className="tr-app-components-reviewlistpreview-div-4 tr-review-content"
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 6,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
        }}
        className="tr-app-components-reviewlistpreview-div-5 tr-review-stars"
      >
        {stars(r.rating, s.accentColor)}
      </div>
    </div>

    <div
      style={{
        fontSize: 14.5,
        fontWeight: 800,
        color: s.cardTextColor,
        marginBottom: 4,
        lineHeight: 1.35,
        letterSpacing: "-.01em",
      }}
      className="tr-app-components-reviewlistpreview-div-6 tr-review-title"
    >
      {r.title}
    </div>

    <div
      style={{
        fontSize: 12,
        color: "#829CAF",
        marginBottom: 9,
        lineHeight: 1.4,
        fontWeight: 600,
      }}
      className="tr-app-components-reviewlistpreview-div-7 tr-review-customer"
    >
      {r.customer}
    </div>

    <p
      style={{
        fontSize: 14,
        color: s.cardTextColor,
        lineHeight: 1.65,
        margin: "0 0 12px",
        opacity: 0.9,
        wordBreak: "break-word",
      }}
      className="tr-app-components-reviewlistpreview-p-8 tr-review-comment"
    >
      {r.comment}
    </p>

    <button
      style={{
        minHeight: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontSize: 11.5,
        fontWeight: 700,
        border: `1px solid ${s.cardBorderColor}`,
        borderRadius: 8,
        padding: "6px 10px",
        background: `${s.accentColor}09`,
        color: s.accentColor,
        cursor: "pointer",
      }}
      className="tr-app-components-reviewlistpreview-button-9 tr-review-helpful"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M7 11V20H4V11H7Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />

        <path
          d="M7 18.5C9 19.5 11.4 20 14 20H17.1C18.2 20 19.1 19.2 19.3 18.1L20 13.6C20.2 12.2 19.2 11 17.8 11H14L14.7 7.3C14.9 6.2 14.2 5.2 13.1 5L12.5 4.9L7 11V18.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      Helpful ({r.likes})
    </button>
  </div>
</div>
  );
}

function GridCard({ r, s }) {
  return (
    <div style={{
      background: s.cardBackground, border: `1px solid ${s.cardBorderColor}`, borderRadius: 10,
      padding: 16, display: "flex", flexDirection: "column", gap: 8,
    }} className="tr-app-components-reviewlistpreview-div-10">
      <div style={{ fontSize: 13 }} className="tr-app-components-reviewlistpreview-div-11">{stars(r.rating, s.accentColor)}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: s.cardTextColor }} className="tr-app-components-reviewlistpreview-div-12">{r.title}</div>
      <p style={{ fontSize: 12.5, color: s.cardTextColor, lineHeight: 1.5, margin: 0, flex: 1 }} className="tr-app-components-reviewlistpreview-p-13">{r.comment}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#888" }} className="tr-app-components-reviewlistpreview-div-14">
        <div style={{
          width: 24, height: 24, borderRadius: "50%", background: s.accentColor, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 10, flexShrink: 0,
        }} className="tr-app-components-reviewlistpreview-div-15">
          {initials(r.customer)}
        </div>
        <strong style={{ color: s.cardTextColor }} className="tr-app-components-reviewlistpreview-strong-16">{r.customer}</strong>
      </div>
    </div>
  );
}

function CompactCard({ r, s }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
      borderBottom: `1px solid ${s.cardBorderColor}`, background: s.cardBackground,
    }} className="tr-app-components-reviewlistpreview-div-17">
      <div style={{
        width: 26, height: 26, borderRadius: "50%", background: s.accentColor, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 10, flexShrink: 0, marginTop: 2,
      }} className="tr-app-components-reviewlistpreview-div-18">
        {initials(r.customer)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }} className="tr-app-components-reviewlistpreview-div-19">
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, marginBottom: 2 }} className="tr-app-components-reviewlistpreview-div-20">
          <span style={{ fontSize: 12 }} className="tr-app-components-reviewlistpreview-span-21">{stars(r.rating, s.accentColor)}</span>
          <strong style={{ color: s.cardTextColor }} className="tr-app-components-reviewlistpreview-strong-22">{r.customer}</strong>
        </div>
        <p style={{ fontSize: 12.5, color: s.cardTextColor, margin: 0, lineHeight: 1.4 }} className="tr-app-components-reviewlistpreview-p-23">{r.title} — {r.comment}</p>
      </div>
    </div>
  );
}

function MinimalCard({ r, s }) {
  return (
    <div style={{ padding: "16px 0", borderBottom: `1px solid ${s.cardBorderColor}`, background: s.cardBackground }} className="tr-app-components-reviewlistpreview-div-24">
      <div style={{ fontSize: 13 }} className="tr-app-components-reviewlistpreview-div-25">{stars(r.rating, s.accentColor)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 8px" }} className="tr-app-components-reviewlistpreview-div-26">
        <span style={{
          width: 22, height: 22, borderRadius: "50%", background: "#f0f0f0",
          display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#666",
        }} className="tr-app-components-reviewlistpreview-span-27">{(r.customer || "?")[0].toUpperCase()}</span>
        <span style={{ fontSize: 12, color: "#888" }} className="tr-app-components-reviewlistpreview-span-28">{r.customer}</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: s.cardTextColor, marginBottom: 4 }} className="tr-app-components-reviewlistpreview-div-29">{r.title}</div>
      <p style={{ fontSize: 13, color: s.cardTextColor, margin: 0, lineHeight: 1.5 }} className="tr-app-components-reviewlistpreview-p-30">{r.comment}</p>
    </div>
  );
}

function Pagination({ s }) {
  const numStyle = (active) => ({
    minWidth: 26, height: 26, borderRadius: 4, border: `1.5px solid ${active ? s.accentColor : "#ddd"}`,
    background: active ? s.accentColor : "none", color: active ? "#fff" : "#333",
    display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600,
  });
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 16, fontSize: 12, color: "#888" }} className="tr-app-components-reviewlistpreview-div-31">
      <span style={{ ...numStyle(false), opacity: 0.4 }} className="tr-app-components-reviewlistpreview-span-32">‹</span>
      <span style={numStyle(true)} className="tr-app-components-reviewlistpreview-span-33">1</span>
      <span style={numStyle(false)} className="tr-app-components-reviewlistpreview-span-34">2</span>
      <span style={numStyle(false)} className="tr-app-components-reviewlistpreview-span-35">3</span>
      <span style={numStyle(false)} className="tr-app-components-reviewlistpreview-span-36">›</span>
      <span style={{ marginLeft: 8, fontSize: 11 }} className="tr-app-components-reviewlistpreview-span-37">{s.reviewsPerPage} per page</span>
    </div>
  );
}

function ScopeNote({ s }) {
  if (!s.showAllProducts) return null;
  return (
    <div style={{
      fontSize: 11.5, color: "#9a6700", background: "#fff8e6", border: "1px solid #f0d999",
      borderRadius: 6, padding: "6px 10px", marginBottom: 12,
    }} className="tr-app-components-reviewlistpreview-div-38">
      Showing reviews from all products in your store, not just this one.
    </div>
  );
}

export default function ReviewListPreview({ listStyle, settings }) {
  const s = settings;

  if (listStyle === "grid") {
    return (
      <div className="tr-app-components-reviewlistpreview-div-39">
        <ScopeNote s={s} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }} className="tr-app-components-reviewlistpreview-div-40">
          {MOCK_REVIEWS.map((r) => <GridCard key={r.id} r={r} s={s} />)}
        </div>
        <Pagination s={s} />
      </div>
    );
  }

  if (listStyle === "compact") {
    return (
      <div className="tr-app-components-reviewlistpreview-div-41">
        <ScopeNote s={s} />
        {MOCK_REVIEWS.map((r) => <CompactCard key={r.id} r={r} s={s} />)}
        <Pagination s={s} />
      </div>
    );
  }

  if (listStyle === "minimal") {
    return (
      <div className="tr-app-components-reviewlistpreview-div-42">
        <ScopeNote s={s} />
        {MOCK_REVIEWS.map((r) => <MinimalCard key={r.id} r={r} s={s} />)}
        <Pagination s={s} />
      </div>
    );
  }

  return (
    <div className="tr-app-components-reviewlistpreview-div-43">
      <ScopeNote s={s} />
      {MOCK_REVIEWS.map((r) => <ListCard key={r.id} r={r} s={s} />)}
      <Pagination s={s} />
    </div>
  );
}
