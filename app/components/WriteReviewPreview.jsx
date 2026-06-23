// Live admin preview for the Write a Review form, ported from
// extensions/product-review/blocks/review.liquid's form CSS/markup.

export default function WriteReviewPreview({ settings }) {
  const s = settings;
  return (
    <div style={{
      background: s.backgroundColor, border: "1px solid #e5e5e5", borderRadius: 8,
      padding: 24, fontFamily: s.fontFamily === "inherit" ? undefined : s.fontFamily,
    }}>
      <button style={{
        background: s.accentColor, color: s.buttonTextColor, border: "none",
        borderRadius: s.borderRadius, padding: "11px 22px", fontSize: 14, fontWeight: 600,
        cursor: "default", marginBottom: 18,
      }}>
        Write a Review
      </button>

      <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>
        What would you rate this product? <span style={{ color: "#e53935" }}>*</span>
      </div>
      <div style={{ fontSize: 26, color: s.accentColor, marginBottom: 16 }}>★★★★☆</div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>Review title</div>
      <input
        disabled placeholder="Summarize your experience..."
        style={{
          width: "100%", padding: "10px 13px", border: "1.5px solid #ddd", borderRadius: s.borderRadius,
          fontSize: 13, background: "#fafafa", marginBottom: 14, boxSizing: "border-box",
        }}
      />

      <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>
        Tell us your feedback about the product <span style={{ color: "#e53935" }}>*</span>
      </div>
      <textarea
        disabled placeholder="Share your experience with this product..."
        style={{
          width: "100%", minHeight: 70, padding: "10px 13px", border: "1.5px solid #ddd",
          borderRadius: s.borderRadius, fontSize: 13, background: "#fafafa", marginBottom: 16,
          boxSizing: "border-box", resize: "none", fontFamily: "inherit",
        }}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button disabled style={{ padding: "10px 20px", background: "#fff", color: "#555", border: "1.5px solid #ddd", borderRadius: s.borderRadius, fontSize: 14, cursor: "default" }}>
          Cancel
        </button>
        <button disabled style={{
          padding: "10px 26px", background: s.accentColor, color: s.buttonTextColor, border: "none",
          borderRadius: s.borderRadius, fontSize: 14, fontWeight: 600, cursor: "default",
        }}>
          Submit
        </button>
      </div>
    </div>
  );
}
