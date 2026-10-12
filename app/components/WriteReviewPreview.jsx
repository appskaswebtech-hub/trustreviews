// Live admin preview for the "Reviews + Write a Review" block, laid out like
// extensions/product-review/blocks/review.liquid on the storefront: rating
// summary + Write a Review button, the Sort / Search / Product Reviews bar,
// then the review list (sample data). The button opens the form underneath.

import { useState } from "react";

const SAMPLE_REVIEWS = [
  { name: "Priya S.", rating: 5, date: "2 days ago", title: "Exactly what I wanted", comment: "Great quality and it arrived quickly. Would definitely buy again." },
  { name: "Daniel K.", rating: 4, date: "1 week ago", title: "Very good", comment: "Works well and looks nice. Packaging could be a little better." },
  { name: "Aisha R.", rating: 5, date: "3 weeks ago", title: "Love it", comment: "Better than I expected — my whole family uses it now." },
];

const AVERAGE = SAMPLE_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / SAMPLE_REVIEWS.length;

function Stars({ rating, color, size = 16 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 1, lineHeight: 1 }} aria-label={`${rating} out of 5`}>
      <span style={{ color }}>{"★".repeat(Math.round(rating))}</span>
      <span style={{ color: "#d9d9d9" }}>{"★".repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

export default function WriteReviewPreview({ settings }) {
  const s = settings;
  const [open, setOpen] = useState(false);
  const showButton = s.showWriteReview !== false;

  const field = {
    width: "100%", padding: "10px 13px", border: "1.5px solid #ddd", borderRadius: s.borderRadius,
    fontSize: 13, background: "#fafafa", marginBottom: 14, boxSizing: "border-box", fontFamily: "inherit",
  };
  const label = { fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 };
  const required = <span style={{ color: "#e53935" }}>*</span>;

  return (
    <div style={{
      background: s.backgroundColor, border: "1px solid #e5e5e5", borderRadius: 8,
      padding: 24, color: "#1a1a1a", fontFamily: s.fontFamily === "inherit" ? undefined : s.fontFamily,
    }}>
      {/* Rating summary + Write a Review button */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 38, fontWeight: 800, lineHeight: 1 }}>
              {AVERAGE.toFixed(1)}<span style={{ fontSize: 18, fontWeight: 400, color: "#666" }}>/5</span>
            </span>
            <Stars rating={AVERAGE} color={s.accentColor} size={18} />
          </div>
          <div style={{ fontSize: 13, color: "#777", marginTop: 8 }}>Based on {SAMPLE_REVIEWS.length} reviews</div>
        </div>
        {showButton && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{
              background: s.accentColor, color: s.buttonTextColor, border: "none",
              borderRadius: s.borderRadius, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Write a Review form */}
      {showButton && open && (
        <div style={{ marginTop: 20, padding: 18, border: "1px solid #eee", borderRadius: Math.max(6, s.borderRadius), background: "#fff" }}>
          <div style={label}>What would you rate this product? {required}</div>
          <div style={{ fontSize: 26, color: s.accentColor, marginBottom: 16 }}>★★★★☆</div>

          <div style={label}>Review title</div>
          <input disabled placeholder="Summarize your experience..." style={field} />

          <div style={label}>Tell us your feedback about the product {required}</div>
          <textarea disabled placeholder="Share your experience with this product..." style={{ ...field, minHeight: 70, resize: "none", marginBottom: 16 }} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={() => setOpen(false)} style={{ padding: "10px 20px", background: "#fff", color: "#555", border: "1.5px solid #ddd", borderRadius: s.borderRadius, fontSize: 14, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="button" onClick={() => setOpen(false)} style={{
              padding: "10px 26px", background: s.accentColor, color: s.buttonTextColor, border: "none",
              borderRadius: s.borderRadius, fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Sort / Search / Product Reviews bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        marginTop: 22, padding: "12px 0", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a",
      }}>
        <div style={{ display: "flex", gap: 18, fontSize: 14, fontWeight: 600 }}>
          <span>Sort ▾</span>
          <span>⌕ Search</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, paddingBottom: 4, borderBottom: "2px solid #1a1a1a" }}>Product Reviews</span>
      </div>

      {/* Review list */}
      {SAMPLE_REVIEWS.map((r) => (
        <div key={r.name} style={{ padding: "16px 0", borderBottom: "1px solid #eee" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <Stars rating={r.rating} color={s.accentColor} size={14} />
            <span style={{ fontSize: 12, color: "#999" }}>{r.date}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>{r.title}</div>
          <div style={{ fontSize: 13, color: "#444", marginTop: 4, lineHeight: 1.5 }}>{r.comment}</div>
          <div style={{ fontSize: 12, color: "#777", marginTop: 8 }}>{r.name} · <span style={{ color: "#1f7a4d" }}>✓ Verified</span></div>
        </div>
      ))}

      {!showButton && (
        <div style={{ marginTop: 14, fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
          The Write a Review button is hidden — the rating summary and reviews still show on your store.
        </div>
      )}
    </div>
  );
}
