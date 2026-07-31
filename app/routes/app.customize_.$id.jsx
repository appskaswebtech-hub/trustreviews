import { redirect, useLoaderData, useSubmit, useActionData, Link } from "react-router";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// ─── Constants ────────────────────────────────────────────────────────────────
const LAYOUTS = [
  { key: "grid",     label: "Grid",     icon: "⊞", desc: "Responsive card grid" },
  { key: "list",     label: "List",     icon: "☰", desc: "Full-width stacked" },
  { key: "masonry",  label: "Masonry",  icon: "⧉", desc: "Pinterest columns" },
  { key: "slider",   label: "Slider",   icon: "◀▶", desc: "Horizontal carousel" },
  { key: "compact",  label: "Compact",  icon: "≡", desc: "Dense minimal rows" },
  { key: "featured", label: "Featured", icon: "✦", desc: "Hero + side grid" },
];

const SUMMARY_STYLES = [
  { key: "full",    label: "Full (bars + score)" },
  { key: "compact", label: "Compact (score + btn)" },
  { key: "minimal", label: "Minimal (inline)" },
  { key: "none",    label: "Hidden" },
];

const PAGINATION_TYPES = [
  { key: "loadmore", label: "Load More Button" },
  { key: "numbered", label: "Numbered Pages" },
  { key: "none",     label: "No Pagination" },
];

const CARD_SHADOWS = [
  { key: "none",   label: "None",   style: "none" },
  { key: "soft",   label: "Soft",   style: "0 2px 8px rgba(0,0,0,.07)" },
  { key: "medium", label: "Medium", style: "0 4px 18px rgba(0,0,0,.11)" },
  { key: "strong", label: "Strong", style: "0 8px 28px rgba(0,0,0,.16)" },
];

const CARD_HOVERS = [
  { key: "none",   label: "None" },
  { key: "lift",   label: "Lift" },
  { key: "glow",   label: "Glow" },
  { key: "border", label: "Border" },
];

const VERIFIED_STYLES = [
  { key: "badge", label: "Badge" },
  { key: "text",  label: "Text" },
  { key: "icon",  label: "Icon only" },
];

const AVATAR_SHAPES = [
  { key: "circle",  label: "Circle" },
  { key: "square",  label: "Square" },
  { key: "rounded", label: "Rounded" },
];

const STAR_STYLES = [
  { key: "filled",  label: "Filled ★" },
  { key: "outline", label: "Outline ☆" },
];

const FONTS = [
  { key: "inherit",                    label: "Theme Default" },
  { key: "system-ui, sans-serif",      label: "System UI" },
  { key: "Georgia, serif",             label: "Georgia (Serif)" },
  { key: "'Courier New', monospace",   label: "Monospace" },
];

const DATE_FORMATS = [
  { key: "relative", label: "Relative (2 days ago)" },
  { key: "absolute", label: "Absolute (Dec 12, 2024)" },
];

const ANIMATIONS = [
  { key: "none",    label: "None" },
  { key: "fade",    label: "Fade in" },
  { key: "slideUp", label: "Slide up" },
];

// ─── Default settings ──────────────────────────────────────────────────────────
const DS = {
  layout: "grid", columnsDesktop: 3, columnsTablet: 2, columnsMobile: 1,
  gap: 20, maxReviews: 9, paginationType: "loadmore", loadMoreText: "Load More Reviews",

  showSummary: true, summaryStyle: "full",
  showRatingBars: true, showWriteBtn: true, writeBtnText: "Write a Review",

  cardBg: "#ffffff", cardBorderColor: "#e4e4e4", cardBorderWidth: 1,
  cardBorderStyle: "solid", cardRadius: 12,
  cardShadow: "soft", cardPadding: 18, cardHover: "lift",

  fontFamily: "inherit",
  nameSize: 14, nameWeight: "700", nameColor: "#1a1a1a",
  bodySize: 14, bodyColor: "#333333", bodyLineHeight: 1.65, bodyMaxLines: 5,
  dateSize: 11, dateColor: "#6b7280", dateFormat: "relative",

  starColor: "#f59e0b", starEmptyColor: "#e0e0e0", starSize: 15, starStyle: "filled",

  showAvatar: true, avatarShape: "circle", avatarSize: 38,
  avatarBg: "#6B1A2C", avatarColor: "#ffffff",

  showVerified: true, verifiedStyle: "badge",
  showDate: true, showHelpful: true, showReply: true,
  showTitle: true, showMedia: true, showTags: false, showReadMore: true,

  showFilter: true, showSort: true, defaultSort: "newest",

  pageBg: "#f9fafb", accentColor: "#6B1A2C",
  textColor: "#1a1a1a", mutedColor: "#6b7280",
  headingText: "Customer Reviews", headingSize: 28,
  headingColor: "#1a1a1a", headingAlign: "left",

  animation: "fade", customCSS: "",
};

// ─── Sample data ──────────────────────────────────────────────────────────────
const SAMPLES = [
  { id: 1, name: "Sarah M.", initials: "SM", rating: 5, title: "Absolutely love it!", text: "This exceeded every expectation I had. The quality is top-tier and delivery was surprisingly fast. Will definitely order again.", date: "2 days ago", abs: "Dec 12, 2024", verified: true, helpful: 24, hasMedia: true, hasReply: true, tags: ["Fast shipping", "Great quality"] },
  { id: 2, name: "John D.",  initials: "JD", rating: 4, title: "Great value for money",  text: "Really solid product for the price point. Packaging was lovely. Would recommend to anyone looking for a quality gift.", date: "1 week ago", abs: "Dec 6, 2024", verified: true,  helpful: 18, hasMedia: false, hasReply: false, tags: ["Value", "Gift idea"] },
  { id: 3, name: "Emma R.",  initials: "ER", rating: 5, title: "Stunning quality",        text: "One of the best purchases I have made. The craftsmanship is incredible and it looks even better in person.", date: "2 weeks ago", abs: "Nov 29, 2024", verified: false, helpful: 31, hasMedia: true, hasReply: false, tags: [] },
  { id: 4, name: "Mike T.",  initials: "MT", rating: 3, title: "Decent, not perfect",    text: "The product is fine but shipping took longer than I expected. Customer service was responsive when I reached out.", date: "3 weeks ago", abs: "Nov 22, 2024", verified: true,  helpful: 7,  hasMedia: false, hasReply: true, tags: [] },
  { id: 5, name: "Lisa K.",  initials: "LK", rating: 5, title: "Perfect gift!",           text: "Bought this as a birthday gift and my mother was over the moon. Beautiful packaging too. 10/10.", date: "1 month ago", abs: "Nov 15, 2024", verified: true,  helpful: 42, hasMedia: false, hasReply: false, tags: ["Gift idea", "Beautiful packaging"] },
  { id: 6, name: "Tom W.",   initials: "TW", rating: 4, title: "Very happy",              text: "Really happy with my purchase. Everything arrived in perfect condition and exactly as described.", date: "1 month ago", abs: "Nov 10, 2024", verified: false, helpful: 9,  hasMedia: false, hasReply: false, tags: [] },
  { id: 7, name: "Aria S.",  initials: "AS", rating: 5, title: "Highly recommend",        text: "I have ordered from this store twice now and the quality has been consistently amazing each time.", date: "6 weeks ago", abs: "Nov 1, 2024", verified: true,  helpful: 15, hasMedia: true, hasReply: false, tags: ["Repeat buyer"] },
  { id: 8, name: "Ben P.",   initials: "BP", rating: 2, title: "Disappointed",             text: "Expected more based on the photos. Material feels a bit cheap but it does the job.", date: "2 months ago", abs: "Oct 15, 2024", verified: true,  helpful: 4,  hasMedia: false, hasReply: true, tags: [] },
  { id: 9, name: "Chloe F.", initials: "CF", rating: 5, title: "Five stars all the way",  text: "From ordering to delivery this was flawless. The product is beautiful and I could not be happier.", date: "2 months ago", abs: "Oct 5, 2024", verified: true,  helpful: 29, hasMedia: true, hasReply: false, tags: ["Great experience"] },
];

const C = { accent: "#6B1A2C", accentL: "#f5e6e9", surface: "#fff", border: "#e4e4e4", text: "#1a1a1a", muted: "#6b7280" };

// ─── Loader / Action ──────────────────────────────────────────────────────────
export async function loader({ request, params }) {
  const { session } = await authenticate.admin(request);
  if (params.id === "new") return { template: null };
  try {
    const template = await db.widgetTemplate.findFirst({ where: { id: params.id, shop: session.shop } });
    if (!template) return redirect("/app/customize");
    return { template };
  } catch {
    return redirect("/app/customize");
  }
}
export async function action({ request, params }) {
  const { session } = await authenticate.admin(request);
  const fd = await request.formData();
  if (fd.get("actionType") === "save") {
    const name     = (fd.get("name") || "Untitled").trim();
    const settings = JSON.parse(fd.get("settings") || "{}");
    try {
      if (params.id === "new") {
        const tpl = await db.widgetTemplate.create({ data: { shop: session.shop, name, blocks: settings } });
        return redirect(`/app/customize/${tpl.id}`);
      }
      await db.widgetTemplate.updateMany({ where: { id: params.id, shop: session.shop }, data: { name, blocks: settings } });
    } catch {
      return { ok: false, error: "Database not ready. Run: npx prisma db push" };
    }
    return { ok: true };
  }
  return null;
}

// ─── Preview helpers ──────────────────────────────────────────────────────────
function StarsRow({ rating, s, size }) {
  const sz = size || s.starSize;
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: sz, color: i <= rating ? s.starColor : s.starEmptyColor, lineHeight: 1 }}>
          {s.starStyle === "outline" ? (i <= rating ? "★" : "☆") : "★"}
        </span>
      ))}
    </span>
  );
}

function VerifiedBadge({ s }) {
  if (!s.showVerified) return null;
  if (s.verifiedStyle === "badge") return (
    <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#f0fdf4", color: "#059669", border: "1px solid #bbf7d0", whiteSpace: "nowrap" }}>✓ Verified</span>
  );
  if (s.verifiedStyle === "text") return <span style={{ fontSize: 10, color: "#059669", fontWeight: 600, whiteSpace: "nowrap" }}>✓ Verified Buyer</span>;
  return <span style={{ fontSize: 12, color: "#059669" }}>✓</span>;
}

function ReviewCard({ r, s, compact = false }) {
  const shadow = (CARD_SHADOWS.find(x => x.key === s.cardShadow) || CARD_SHADOWS[1]).style;
  const avatarRadius = { circle: "50%", square: "6px", rounded: "12px" }[s.avatarShape] || "50%";

  return (
    <div style={{
      background: s.cardBg,
      border: `${s.cardBorderWidth}px ${compact ? "solid" : s.cardBorderStyle} ${s.cardBorderColor}`,
      borderRadius: compact ? 8 : s.cardRadius,
      padding: compact ? "10px 14px" : s.cardPadding,
      boxShadow: compact ? "none" : shadow,
      fontFamily: s.fontFamily,
      breakInside: "avoid",
      marginBottom: s.layout === "masonry" ? s.gap : 0,
      transition: "transform .18s, box-shadow .18s",
    }}>
      {compact ? (
        /* ── Compact row layout ── */
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StarsRow rating={r.rating} s={s} size={12} />
          {s.showVerified && r.verified && <VerifiedBadge s={s} />}
          <span style={{ fontSize: 12, fontWeight: 600, color: s.nameColor, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</span>
          <span style={{ fontSize: 10, color: s.mutedColor, flexShrink: 0 }}>{r.name}</span>
          {s.showDate && <span style={{ fontSize: 10, color: s.dateColor, flexShrink: 0 }}>{s.dateFormat === "absolute" ? r.abs : r.date}</span>}
        </div>
      ) : (
        /* ── Standard card layout ── */
        <>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            {s.showAvatar && (
              <div style={{ width: s.avatarSize, height: s.avatarSize, borderRadius: avatarRadius, flexShrink: 0, background: s.avatarBg, color: s.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: s.avatarSize * 0.32, fontWeight: 800 }}>
                {r.initials}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: s.nameSize, fontWeight: s.nameWeight, color: s.nameColor }}>{r.name}</span>
                {r.verified && <VerifiedBadge s={s} />}
                {s.showDate && <span style={{ fontSize: s.dateSize, color: s.dateColor, marginLeft: "auto", whiteSpace: "nowrap" }}>{s.dateFormat === "absolute" ? r.abs : r.date}</span>}
              </div>
              <StarsRow rating={r.rating} s={s} />
            </div>
          </div>

          {/* Review title */}
          {s.showTitle && r.title && (
            <div style={{ fontSize: s.nameSize, fontWeight: "700", color: s.nameColor, marginBottom: 5 }}>{r.title}</div>
          )}

          {/* Body */}
          <p style={{ fontSize: s.bodySize, color: s.bodyColor, lineHeight: s.bodyLineHeight, margin: "0 0 10px", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: s.bodyMaxLines, overflow: "hidden" }}>
            {r.text}
          </p>
          {s.showReadMore && r.text.length > 120 && (
            <span style={{ fontSize: 12, color: s.accentColor, fontWeight: 600, cursor: "pointer" }}>Read more</span>
          )}

          {/* Media thumbnails */}
          {s.showMedia && r.hasMedia && (
            <div style={{ display: "flex", gap: 6, margin: "10px 0" }}>
              {[1, 2].map(i => (
                <div key={i} style={{ width: 54, height: 54, borderRadius: 7, background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", border: `1px solid ${s.cardBorderColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  🖼️
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {s.showTags && r.tags && r.tags.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "8px 0" }}>
              {r.tags.map(t => <span key={t} style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, background: "#f3f4f6", color: s.mutedColor, border: `1px solid ${s.cardBorderColor}` }}>{t}</span>)}
            </div>
          )}

          {/* Footer */}
          {(s.showHelpful || (s.showReply && r.hasReply)) && (
            <div style={{ borderTop: `1px solid ${s.cardBorderColor}`, marginTop: 10, paddingTop: 10 }}>
              {s.showHelpful && (
                <span style={{ fontSize: 11, color: s.mutedColor, cursor: "pointer" }}>👍 Helpful ({r.helpful})</span>
              )}
            </div>
          )}

          {/* Merchant reply */}
          {s.showReply && r.hasReply && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: s.pageBg, borderRadius: 8, borderLeft: `3px solid ${s.accentColor}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.accentColor, marginBottom: 4 }}>Reply from the store</div>
              <div style={{ fontSize: 12, color: s.bodyColor, lineHeight: 1.5 }}>Thank you so much for your kind words! We truly appreciate your support. 🙏</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────
function SummaryBar({ s }) {
  if (!s.showSummary || s.summaryStyle === "none") return null;
  const avg = 4.6;
  const total = 1247;
  const bars = [
    { star: 5, pct: 78 }, { star: 4, pct: 13 }, { star: 3, pct: 5 },
    { star: 2, pct: 2 },  { star: 1, pct: 2 },
  ];
  const WriteBtn = () => s.showWriteBtn ? (
    <button style={{ padding: "9px 18px", borderRadius: 9, background: s.accentColor, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
      {s.writeBtnText}
    </button>
  ) : null;

  if (s.summaryStyle === "minimal") return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
      <StarsRow rating={5} s={s} size={20} />
      <span style={{ fontSize: 20, fontWeight: 900, color: s.textColor }}>{avg}</span>
      <span style={{ fontSize: 13, color: s.mutedColor }}>based on {total.toLocaleString()} reviews</span>
      <div style={{ marginLeft: "auto" }}><WriteBtn /></div>
    </div>
  );

  if (s.summaryStyle === "compact") return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, marginBottom: 20, padding: "16px 20px", background: s.cardBg, borderRadius: s.cardRadius, border: `${s.cardBorderWidth}px ${s.cardBorderStyle} ${s.cardBorderColor}`, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 38, fontWeight: 900, color: s.textColor, lineHeight: 1 }}>{avg}</div>
          <div style={{ margin: "4px 0 2px" }}><StarsRow rating={5} s={s} size={16} /></div>
          <div style={{ fontSize: 11, color: s.mutedColor }}>{total.toLocaleString()} reviews</div>
        </div>
      </div>
      <WriteBtn />
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 20, marginBottom: 24, padding: "20px 22px", background: s.cardBg, borderRadius: s.cardRadius, border: `${s.cardBorderWidth}px ${s.cardBorderStyle} ${s.cardBorderColor}`, boxShadow: (CARD_SHADOWS.find(x => x.key === s.cardShadow) || CARD_SHADOWS[1]).style, flexWrap: "wrap" }}>
      <div style={{ textAlign: "center", minWidth: 80 }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: s.textColor, lineHeight: 1 }}>{avg}</div>
        <div style={{ margin: "5px 0 3px" }}><StarsRow rating={5} s={s} size={17} /></div>
        <div style={{ fontSize: 11, color: s.mutedColor }}>{total.toLocaleString()} reviews</div>
      </div>
      {s.showRatingBars && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, justifyContent: "center", minWidth: 160 }}>
          {bars.map(({ star, pct }) => (
            <div key={star} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: s.mutedColor, width: 20, textAlign: "right", flexShrink: 0 }}>{star}★</span>
              <div style={{ flex: 1, height: 7, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: s.starColor, borderRadius: 4, transition: "width .4s" }} />
              </div>
              <span style={{ fontSize: 10, color: s.mutedColor, width: 30, flexShrink: 0 }}>{pct}%</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center" }}><WriteBtn /></div>
    </div>
  );
}

// ─── Filter & sort bar ────────────────────────────────────────────────────────
function FilterSortBar({ s }) {
  if (!s.showFilter && !s.showSort) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
      {s.showFilter && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["All", "5★", "4★", "3★", "2★", "1★"].map((f, i) => (
            <button key={f} style={{
              padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: i === 0 ? s.accentColor : s.cardBg,
              color: i === 0 ? "#fff" : s.mutedColor,
              border: `1.5px solid ${i === 0 ? s.accentColor : s.cardBorderColor}`,
              transition: "all .15s",
            }}>{f}</button>
          ))}
        </div>
      )}
      {s.showSort && (
        <select style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, color: s.textColor, border: `1.5px solid ${s.cardBorderColor}`, background: s.cardBg, cursor: "pointer" }}>
          <option>Newest First</option><option>Highest Rated</option><option>Most Helpful</option><option>Lowest Rated</option>
        </select>
      )}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ s }) {
  if (s.paginationType === "none") return null;
  if (s.paginationType === "loadmore") return (
    <div style={{ textAlign: "center", marginTop: 24 }}>
      <button style={{ padding: "11px 32px", borderRadius: 10, background: s.accentColor, color: "#fff", border: "none", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>{s.loadMoreText}</button>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 24 }}>
      {["←", "1", "2", "3", "...", "9", "→"].map((p, i) => (
        <button key={i} style={{
          width: p === "←" || p === "→" ? 34 : p === "..." ? 28 : 34, height: 34,
          borderRadius: 8, border: `1.5px solid ${p === "1" ? s.accentColor : s.cardBorderColor}`,
          background: p === "1" ? s.accentColor : s.cardBg,
          color: p === "1" ? "#fff" : s.textColor, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>{p}</button>
      ))}
    </div>
  );
}

// ─── Live preview ─────────────────────────────────────────────────────────────
function LivePreview({ s }) {
  const reviews = SAMPLES.slice(0, Math.min(s.maxReviews, 9));

  function Grid() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(s.columnsDesktop, 4)}, 1fr)`, gap: s.gap }}>
        {reviews.map(r => <ReviewCard key={r.id} r={r} s={s} />)}
      </div>
    );
  }
  function ListLayout() {
    return <div style={{ display: "flex", flexDirection: "column", gap: s.gap }}>{reviews.map(r => <ReviewCard key={r.id} r={r} s={s} />)}</div>;
  }
  function Masonry() {
    return (
      <div style={{ columnCount: Math.min(s.columnsDesktop, 4), columnGap: s.gap }}>
        {reviews.map(r => <ReviewCard key={r.id} r={r} s={s} />)}
      </div>
    );
  }
  function Slider() {
    return (
      <div>
        <div style={{ display: "flex", gap: s.gap, overflowX: "auto", paddingBottom: 10, scrollSnapType: "x mandatory" }}>
          {reviews.map(r => <div key={r.id} style={{ minWidth: 290, maxWidth: 320, scrollSnapAlign: "start", flexShrink: 0 }}><ReviewCard r={r} s={s} /></div>)}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 12 }}>
          {reviews.slice(0, 5).map((_, i) => (
            <div key={i} style={{ width: i === 0 ? 20 : 7, height: 7, borderRadius: 4, background: i === 0 ? s.accentColor : s.cardBorderColor, transition: "width .2s" }} />
          ))}
        </div>
      </div>
    );
  }
  function Compact() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {reviews.map(r => <ReviewCard key={r.id} r={r} s={s} compact />)}
      </div>
    );
  }
  function Featured() {
    const [hero, ...rest] = reviews;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: s.gap }}>
        <div><ReviewCard r={hero} s={{ ...s, bodyMaxLines: 10 }} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: s.gap }}>
          {rest.slice(0, 3).map(r => <ReviewCard key={r.id} r={r} s={{ ...s, showMedia: false }} />)}
        </div>
      </div>
    );
  }

  const L = { grid: Grid, list: ListLayout, masonry: Masonry, slider: Slider, compact: Compact, featured: Featured }[s.layout] || Grid;

  return (
    <div style={{ background: s.pageBg, borderRadius: 16, padding: "28px 24px", fontFamily: s.fontFamily }}>
      {/* Section heading */}
      <div style={{ textAlign: s.headingAlign, marginBottom: 20 }}>
        <h2 style={{ fontSize: Math.min(s.headingSize, 30), fontWeight: 800, color: s.headingColor, margin: 0 }}>
          {s.headingText}
        </h2>
      </div>

      <SummaryBar s={s} />
      <FilterSortBar s={s} />
      <L />
      <Pagination s={s} />
    </div>
  );
}

// ─── Settings sidebar ─────────────────────────────────────────────────────────
function SettingsSidebar({ s, onChange }) {
  const [open, setOpen] = useState("layout");
  const set = (k, v) => onChange({ ...s, [k]: v });

  const inp  = { width: "100%", padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12.5, color: C.text, background: "#fff", outline: "none", boxSizing: "border-box" };
  const inp2 = { ...inp, flex: 1 };

  function Sec({ id, label, emoji, children }) {
    const isOpen = open === id;
    return (
      <div style={{ borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => setOpen(isOpen ? null : id)} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "11px 14px",
          background: isOpen ? "#fdf2f4" : "none", border: "none",
          fontSize: 11.5, fontWeight: 800, color: isOpen ? C.accent : C.muted,
          textTransform: "uppercase", letterSpacing: 0.5, cursor: "pointer",
        }}>
          <span style={{ fontSize: 14 }}>{emoji}</span>
          <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
          <span style={{ fontSize: 9 }}>{isOpen ? "▲" : "▼"}</span>
        </button>
        {isOpen && <div style={{ padding: "6px 14px 18px" }}>{children}</div>}
      </div>
    );
  }

  function F({ label: lbl, children }) {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>{lbl}</label>
        {children}
      </div>
    );
  }

  function Rng({ label: lbl, value, min, max, unit = "", step = 1, onCh }) {
    return (
      <F label={`${lbl}: ${value}${unit}`}>
        <input type="range" min={min} max={max} step={step} value={value} style={{ width: "100%" }} onChange={e => onCh(Number(e.target.value))} />
      </F>
    );
  }

  function Clr({ label: lbl, value, onCh }) {
    return (
      <F label={lbl}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <input type="color" value={value} onChange={e => onCh(e.target.value)} style={{ width: 30, height: 26, border: "none", background: "none", cursor: "pointer", padding: 0, flexShrink: 0 }} />
          <input type="text" value={value} onChange={e => onCh(e.target.value)} style={inp2} />
        </div>
      </F>
    );
  }

  function Toggle({ label: lbl, value, onCh }) {
    return (
      <div onClick={() => onCh(!value)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 12.5, color: C.text }}>{lbl}</span>
        <div style={{ width: 32, height: 18, borderRadius: 9, background: value ? C.accent : "#d1d5db", position: "relative", transition: "background .2s", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: 2, left: value ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
        </div>
      </div>
    );
  }

  function Sel({ label: lbl, value, options, onCh }) {
    return (
      <F label={lbl}>
        <select value={value} onChange={e => onCh(e.target.value)} style={inp}>
          {options.map(o => <option key={o.key || o} value={o.key || o}>{o.label || o}</option>)}
        </select>
      </F>
    );
  }

  function BtnGroup({ label: lbl, value, options, onCh }) {
    return (
      <F label={lbl}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {options.map(o => (
            <button key={o.key || o} onClick={() => onCh(o.key || o)} style={{
              flex: 1, padding: "5px 4px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700,
              border: `1.5px solid ${value === (o.key || o) ? C.accent : C.border}`,
              background: value === (o.key || o) ? C.accentL : "#fff",
              color: value === (o.key || o) ? C.accent : C.muted,
            }}>{o.label || o}</button>
          ))}
        </div>
      </F>
    );
  }

  return (
    <div>

      {/* 1. Layout */}
      <Sec id="layout" emoji="⊞" label="Layout">
        <F label="Style">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
            {LAYOUTS.map(l => (
              <button key={l.key} onClick={() => set("layout", l.key)} style={{
                padding: "8px 4px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                border: `2px solid ${s.layout === l.key ? C.accent : C.border}`,
                background: s.layout === l.key ? C.accentL : "#fff",
                fontSize: 10, fontWeight: 700, color: s.layout === l.key ? C.accent : C.text,
              }}>
                <div style={{ fontSize: 17, marginBottom: 2 }}>{l.icon}</div>
                {l.label}
              </button>
            ))}
          </div>
        </F>
        {(s.layout === "grid" || s.layout === "masonry") && (
          <Rng label="Desktop columns" value={s.columnsDesktop} min={1} max={4} onCh={v => set("columnsDesktop", v)} />
        )}
        {(s.layout === "grid" || s.layout === "masonry") && (
          <Rng label="Tablet columns" value={s.columnsTablet} min={1} max={3} onCh={v => set("columnsTablet", v)} />
        )}
        <Rng label="Card spacing" value={s.gap} min={8} max={48} unit="px" onCh={v => set("gap", v)} />
        <Rng label="Reviews to show" value={s.maxReviews} min={3} max={24} onCh={v => set("maxReviews", v)} />
        <Sel label="Pagination" value={s.paginationType} options={PAGINATION_TYPES} onCh={v => set("paginationType", v)} />
        {s.paginationType === "loadmore" && (
          <F label="Button text">
            <input type="text" value={s.loadMoreText} onChange={e => set("loadMoreText", e.target.value)} style={inp} />
          </F>
        )}
      </Sec>

      {/* 2. Summary bar */}
      <Sec id="summary" emoji="📊" label="Rating Summary">
        <Sel label="Style" value={s.summaryStyle} options={SUMMARY_STYLES} onCh={v => set("summaryStyle", v)} />
        {s.summaryStyle !== "none" && <>
          <Toggle label="Show rating breakdown bars" value={s.showRatingBars} onCh={v => set("showRatingBars", v)} />
          <Toggle label="Show 'Write a Review' button" value={s.showWriteBtn} onCh={v => set("showWriteBtn", v)} />
          {s.showWriteBtn && (
            <F label="Button text">
              <input type="text" value={s.writeBtnText} onChange={e => set("writeBtnText", e.target.value)} style={inp} />
            </F>
          )}
        </>}
      </Sec>

      {/* 3. Card design */}
      <Sec id="card" emoji="🃏" label="Card Design">
        <Clr label="Card background" value={s.cardBg} onCh={v => set("cardBg", v)} />
        <Clr label="Border color" value={s.cardBorderColor} onCh={v => set("cardBorderColor", v)} />
        <F label="Border style">
          <div style={{ display: "flex", gap: 5 }}>
            {["solid","dashed","none"].map(bs => (
              <button key={bs} onClick={() => set("cardBorderStyle", bs)} style={{
                flex: 1, padding: "5px 4px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700,
                border: `1.5px solid ${s.cardBorderStyle === bs ? C.accent : C.border}`,
                background: s.cardBorderStyle === bs ? C.accentL : "#fff",
                color: s.cardBorderStyle === bs ? C.accent : C.muted,
              }}>{bs}</button>
            ))}
          </div>
        </F>
        <Rng label="Border radius" value={s.cardRadius} min={0} max={32} unit="px" onCh={v => set("cardRadius", v)} />
        <Rng label="Card padding" value={s.cardPadding} min={8} max={40} unit="px" onCh={v => set("cardPadding", v)} />
        <BtnGroup label="Shadow" value={s.cardShadow} options={CARD_SHADOWS} onCh={v => set("cardShadow", v)} />
        <BtnGroup label="Hover effect" value={s.cardHover} options={CARD_HOVERS} onCh={v => set("cardHover", v)} />
      </Sec>

      {/* 4. Stars */}
      <Sec id="stars" emoji="★" label="Stars">
        <Clr label="Filled star color" value={s.starColor} onCh={v => set("starColor", v)} />
        <Clr label="Empty star color" value={s.starEmptyColor} onCh={v => set("starEmptyColor", v)} />
        <Rng label="Star size" value={s.starSize} min={10} max={28} unit="px" onCh={v => set("starSize", v)} />
        <BtnGroup label="Star style" value={s.starStyle} options={STAR_STYLES} onCh={v => set("starStyle", v)} />
      </Sec>

      {/* 5. Avatar */}
      <Sec id="avatar" emoji="👤" label="Reviewer Avatar">
        <Toggle label="Show avatar" value={s.showAvatar} onCh={v => set("showAvatar", v)} />
        {s.showAvatar && <>
          <BtnGroup label="Shape" value={s.avatarShape} options={AVATAR_SHAPES} onCh={v => set("avatarShape", v)} />
          <Rng label="Avatar size" value={s.avatarSize} min={24} max={64} unit="px" onCh={v => set("avatarSize", v)} />
          <Clr label="Background color" value={s.avatarBg} onCh={v => set("avatarBg", v)} />
          <Clr label="Initials color" value={s.avatarColor} onCh={v => set("avatarColor", v)} />
        </>}
      </Sec>

      {/* 6. Typography */}
      <Sec id="type" emoji="🔤" label="Typography">
        <Sel label="Font family" value={s.fontFamily} options={FONTS} onCh={v => set("fontFamily", v)} />
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, margin: "12px 0 8px", borderBottom: `1px solid ${C.border}`, paddingBottom: 5 }}>Reviewer Name</div>
        <Rng label="Size" value={s.nameSize} min={11} max={20} unit="px" onCh={v => set("nameSize", v)} />
        <Sel label="Weight" value={s.nameWeight} options={[{key:"400",label:"Normal"},{key:"600",label:"Semi-bold"},{key:"700",label:"Bold"},{key:"800",label:"Extra bold"}]} onCh={v => set("nameWeight", v)} />
        <Clr label="Color" value={s.nameColor} onCh={v => set("nameColor", v)} />
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, margin: "12px 0 8px", borderBottom: `1px solid ${C.border}`, paddingBottom: 5 }}>Review Body</div>
        <Rng label="Size" value={s.bodySize} min={11} max={20} unit="px" onCh={v => set("bodySize", v)} />
        <Clr label="Color" value={s.bodyColor} onCh={v => set("bodyColor", v)} />
        <Rng label="Line height" value={s.bodyLineHeight} min={1.2} max={2.2} step={0.05} unit="×" onCh={v => set("bodyLineHeight", v)} />
        <Rng label="Max lines before truncate" value={s.bodyMaxLines} min={2} max={10} onCh={v => set("bodyMaxLines", v)} />
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, margin: "12px 0 8px", borderBottom: `1px solid ${C.border}`, paddingBottom: 5 }}>Date</div>
        <Rng label="Size" value={s.dateSize} min={9} max={14} unit="px" onCh={v => set("dateSize", v)} />
        <Clr label="Color" value={s.dateColor} onCh={v => set("dateColor", v)} />
        <BtnGroup label="Format" value={s.dateFormat} options={DATE_FORMATS} onCh={v => set("dateFormat", v)} />
      </Sec>

      {/* 7. Elements */}
      <Sec id="elements" emoji="✅" label="Show / Hide">
        <Toggle label="Review title"       value={s.showTitle}    onCh={v => set("showTitle", v)} />
        <Toggle label="Verified badge"     value={s.showVerified} onCh={v => set("showVerified", v)} />
        {s.showVerified && <BtnGroup label="Badge style" value={s.verifiedStyle} options={VERIFIED_STYLES} onCh={v => set("verifiedStyle", v)} />}
        <Toggle label="Review date"        value={s.showDate}     onCh={v => set("showDate", v)} />
        <Toggle label="Photo / video media" value={s.showMedia}  onCh={v => set("showMedia", v)} />
        <Toggle label="Tags"               value={s.showTags}     onCh={v => set("showTags", v)} />
        <Toggle label="Helpful votes"      value={s.showHelpful}  onCh={v => set("showHelpful", v)} />
        <Toggle label="Merchant reply"     value={s.showReply}    onCh={v => set("showReply", v)} />
        <Toggle label="'Read more' link"   value={s.showReadMore} onCh={v => set("showReadMore", v)} />
      </Sec>

      {/* 8. Filter & Sort */}
      <Sec id="filter" emoji="🔍" label="Filter & Sort">
        <Toggle label="Show star filter tabs" value={s.showFilter} onCh={v => set("showFilter", v)} />
        <Toggle label="Show sort dropdown"    value={s.showSort}   onCh={v => set("showSort", v)} />
      </Sec>

      {/* 9. Heading */}
      <Sec id="heading" emoji="📝" label="Section Heading">
        <F label="Heading text">
          <input type="text" value={s.headingText} onChange={e => set("headingText", e.target.value)} style={inp} />
        </F>
        <Rng label="Size" value={s.headingSize} min={16} max={52} unit="px" onCh={v => set("headingSize", v)} />
        <Clr label="Color" value={s.headingColor} onCh={v => set("headingColor", v)} />
        <BtnGroup label="Align" value={s.headingAlign} options={[{key:"left",label:"Left"},{key:"center",label:"Center"},{key:"right",label:"Right"}]} onCh={v => set("headingAlign", v)} />
      </Sec>

      {/* 10. Colors */}
      <Sec id="colors" emoji="🎨" label="Global Colors">
        <Clr label="Page background" value={s.pageBg}       onCh={v => set("pageBg", v)} />
        <Clr label="Accent color"    value={s.accentColor}  onCh={v => set("accentColor", v)} />
        <Clr label="Text color"      value={s.textColor}    onCh={v => set("textColor", v)} />
        <Clr label="Muted color"     value={s.mutedColor}   onCh={v => set("mutedColor", v)} />
      </Sec>

      {/* 11. Advanced */}
      <Sec id="advanced" emoji="⚙️" label="Advanced">
        <BtnGroup label="Entrance animation" value={s.animation} options={ANIMATIONS} onCh={v => set("animation", v)} />
        <F label="Custom CSS (injected into widget)">
          <textarea
            value={s.customCSS}
            onChange={e => set("customCSS", e.target.value)}
            placeholder=".trust-reviews__card { /* your CSS */ }"
            style={{ ...inp, resize: "vertical", minHeight: 80, fontFamily: "monospace", fontSize: 11 }}
          />
        </F>
      </Sec>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TemplateBuilder() {
  const { template } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [tplName, setTplName] = useState(template?.name || "Untitled Template");
  const [settings, setSettings] = useState(() => {
    const raw = template?.blocks;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return { ...DS, ...raw };
    return { ...DS };
  });
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");

  function handleSave() {
    const fd = new FormData();
    fd.append("actionType", "save");
    fd.append("name", tplName);
    fd.append("settings", JSON.stringify(settings));
    submit(fd, { method: "post" });
    setSaved(true);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f3f4f6", overflow: "hidden" }}>

      {/* DB error banner */}
      {actionData?.error && (
        <div style={{ background: "#fff7ed", borderBottom: "1px solid #fed7aa", padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "#9a3412", flexShrink: 0 }}>
          <span>⚠️</span>
          <strong>Save failed:</strong> {actionData.error}
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 54, background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0, boxShadow: "0 1px 5px rgba(0,0,0,.07)", zIndex: 20 }}>
        <Link to="/app/customize" style={{ color: C.muted, textDecoration: "none", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>← Templates</Link>
        <div style={{ width: 1, height: 22, background: C.border }} />
        <input type="text" value={tplName} onChange={e => { setTplName(e.target.value); setSaved(false); }}
          style={{ flex: 1, maxWidth: 320, padding: "6px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontWeight: 700, color: C.text, background: "#fff", outline: "none" }}
          placeholder="Template name" />
        <div style={{ flex: 1 }} />
        {saved && <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>Saved ✓</span>}
        <button onClick={handleSave} style={{ padding: "8px 28px", borderRadius: 9, fontSize: 13.5, fontWeight: 800, background: C.accent, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(107,26,44,.28)" }}>Save</button>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left settings panel */}
        <div style={{ width: 272, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, overflowY: "auto" }}>
          <SettingsSidebar s={settings} onChange={v => { setSettings(v); setSaved(false); }} />
        </div>

        {/* Right preview */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: C.muted, letterSpacing: 0.6, textTransform: "uppercase" }}>
                Live Preview · {LAYOUTS.find(l => l.key === settings.layout)?.label} layout
              </span>
              <div style={{ display: "flex", gap: 5 }}>
                {["preview","mobile"].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    border: `1.5px solid ${activeTab === t ? C.accent : C.border}`,
                    background: activeTab === t ? C.accentL : "#fff",
                    color: activeTab === t ? C.accent : C.muted,
                  }}>{t === "preview" ? "🖥 Desktop" : "📱 Mobile"}</button>
                ))}
              </div>
            </div>

            <div style={activeTab === "mobile" ? { maxWidth: 390, margin: "0 auto" } : {}}>
              <LivePreview s={activeTab === "mobile"
                ? { ...settings, columnsDesktop: 1, columnsTablet: 1, layout: settings.layout === "featured" ? "list" : settings.layout }
                : settings}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
