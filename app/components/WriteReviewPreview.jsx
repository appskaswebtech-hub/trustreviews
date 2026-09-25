// Live admin preview for the Write a Review form, ported from
// extensions/product-review/blocks/review.liquid's form CSS/markup.

import { useState } from "react";

export default function WriteReviewPreview({ settings }) {
  const s = settings;
  const [open, setOpen] = useState(false);

  if (s.showWriteReview === false) {
    return (
      <div style={{
        border: "1.5px dashed #e5e5e5", borderRadius: 8, padding: 32,
        textAlign: "center", color: "#9CA3AF", fontSize: 13,
      }} className="tr-app-components-writereviewpreview-div-1">
        Hidden on your storefront — the button and form won't show, but your
        settings here are kept. Turn "Show button & form" back on to bring it back.
      </div>
    );
  }

  return (
    <div style={{
      background: s.backgroundColor, border: "1px solid #e5e5e5", borderRadius: 8,
      padding: 24, fontFamily: s.fontFamily === "inherit" ? undefined : s.fontFamily,
    }} className="tr-app-components-writereviewpreview-div-2">
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: s.accentColor, color: s.buttonTextColor, border: "none",
          borderRadius: s.borderRadius, padding: "11px 22px", fontSize: 14, fontWeight: 600,
          cursor: "pointer", marginBottom: open ? 18 : 0,
        }}
       className="tr-app-components-writereviewpreview-button-3">
        Write a Review
      </button>

      {open && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }} className="tr-app-components-writereviewpreview-div-4">
            What would you rate this product? <span style={{ color: "#e53935" }} className="tr-app-components-writereviewpreview-span-5">*</span>
          </div>
          <div style={{ fontSize: 26, color: s.accentColor, marginBottom: 16 }} className="tr-app-components-writereviewpreview-div-6">★★★★☆</div>

          <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }} className="tr-app-components-writereviewpreview-div-7">Review title</div>
          <input
            disabled placeholder="Summarize your experience..."
            style={{
              width: "100%", padding: "10px 13px", border: "1.5px solid #ddd", borderRadius: s.borderRadius,
              fontSize: 13, background: "#fafafa", marginBottom: 14, boxSizing: "border-box",
            }}
           className="tr-app-components-writereviewpreview-input-8"/>

          <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }} className="tr-app-components-writereviewpreview-div-9">
            Tell us your feedback about the product <span style={{ color: "#e53935" }} className="tr-app-components-writereviewpreview-span-10">*</span>
          </div>
          <textarea
            disabled placeholder="Share your experience with this product..."
            style={{
              width: "100%", minHeight: 70, padding: "10px 13px", border: "1.5px solid #ddd",
              borderRadius: s.borderRadius, fontSize: 13, background: "#fafafa", marginBottom: 16,
              boxSizing: "border-box", resize: "none", fontFamily: "inherit",
            }}
           className="tr-app-components-writereviewpreview-textarea-11"/>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }} className="tr-app-components-writereviewpreview-div-12">
            <button onClick={() => setOpen(false)} style={{ padding: "10px 20px", background: "#fff", color: "#555", border: "1.5px solid #ddd", borderRadius: s.borderRadius, fontSize: 14, cursor: "pointer" }} className="tr-app-components-writereviewpreview-button-13">
              Cancel
            </button>
            <button onClick={() => setOpen(false)} style={{
              padding: "10px 26px", background: s.accentColor, color: s.buttonTextColor, border: "none",
              borderRadius: s.borderRadius, fontSize: 14, fontWeight: 600, cursor: "pointer",
            }} className="tr-app-components-writereviewpreview-button-14">
              Submit
            </button>
          </div>
        </>
      )}
    </div>
  );
}
