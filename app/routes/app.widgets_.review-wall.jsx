import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const [total, avg] = await Promise.all([
    db.review.count({
      where: {
        store: { shop: session.shop },
        status: "approved",
      },
    }),
    db.review.aggregate({
      where: { store: { shop: session.shop }, status: "approved" },
      _avg: { rating: true },
    }),
  ]);

  return {
    shop: session.shop,
    total,
    avgRating: avg._avg.rating ? Number(avg._avg.rating).toFixed(1) : "0.0",
  };
}

const C = {
  accent: "#6B1A2C",
  accentL: "#fdf2f4",
  text: "#17171c",
  muted: "#6b6b78",
  border: "#e5e4ec",
  surface: "#ffffff",
  bg: "#f6f6f8",
};

const STEPS = [
  {
    n: "1",
    title: "Create a new page",
    body: 'In Shopify Admin → Online Store → Pages → click "Add page". Give it a title like "Customer Reviews" and save.',
  },
  {
    n: "2",
    title: "Open Theme Customizer",
    body: "Go to Online Store → Themes → Customize. Navigate to the page you just created using the page picker at the top.",
  },
  {
    n: "3",
    title: "Add the Review Wall block",
    body: 'Click "Add section" in the left panel, find "Trust Reviews" → select "Review Wall". The widget loads all your store reviews automatically.',
  },
  {
    n: "4",
    title: "Configure settings",
    body: "Set your heading, accent color, number of columns, reviews per page, and toggle search/filter on or off. Save and publish.",
  },
];

export default function ReviewWallPage() {
  const { shop, total, avgRating } = useLoaderData();

  return (
    // <div style={{ minHeight: "100vh", background: C.bg, padding: "32px 24px", fontFamily: "inherit" }} className="tr-app-routes-app-widgets-review-wall-div-1">
    //   <div style={{ maxWidth: 820, margin: "0 auto" }} className="tr-app-routes-app-widgets-review-wall-div-2">

    //     {/* Header */}
    //     <div style={{ marginBottom: 28 }} className="tr-app-routes-app-widgets-review-wall-div-3">
    //       <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }} className="tr-app-routes-app-widgets-review-wall-div-4">
    //         <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: C.text }} className="tr-app-routes-app-widgets-review-wall-h1-5">Review Wall</h1>
    //         <span style={{ fontSize: 11, fontWeight: 600, background: C.accent, color: "#fff", padding: "3px 10px", borderRadius: 20 }} className="tr-app-routes-app-widgets-review-wall-span-6">NEW</span>
    //       </div>
    //       <p style={{ margin: 0, fontSize: 13.5, color: C.muted, lineHeight: 1.6 }} className="tr-app-routes-app-widgets-review-wall-p-7">
    //         A dedicated page on your store that displays all your reviews in a beautiful, searchable grid.
    //         Perfect for SEO and social proof — customers can browse, filter by rating, and search reviews.
    //       </p>
    //     </div>

    //     {/* Stats */}
    //     <div style={{
    //       display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28,
    //     }} className="tr-app-routes-app-widgets-review-wall-div-8">
    //       {[
    //         { label: "Total reviews", value: total },
    //         { label: "Average rating", value: avgRating + " / 5" },
    //         { label: "SEO schema", value: "Auto-injected" },
    //       ].map(({ label, value }) => (
    //         <div key={label} style={{
    //           background: C.surface, borderRadius: 14, padding: "18px 20px",
    //           border: `1px solid ${C.border}`,
    //         }} className="tr-app-routes-app-widgets-review-wall-div-9">
    //           <div style={{ fontSize: 22, fontWeight: 600, color: C.text, lineHeight: 1 }} className="tr-app-routes-app-widgets-review-wall-div-10">{value}</div>
    //           <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }} className="tr-app-routes-app-widgets-review-wall-div-11">{label}</div>
    //         </div>
    //       ))}
    //     </div>

    //     {/* Setup steps */}
    //     <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: "24px 24px", marginBottom: 24 }} className="tr-app-routes-app-widgets-review-wall-div-12">
    //       <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 20 }} className="tr-app-routes-app-widgets-review-wall-div-13">How to add the Review Wall to your store</div>
    //       <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="tr-app-routes-app-widgets-review-wall-div-14">
    //         {STEPS.map(({ n, title, body }) => (
    //           <div key={n} style={{ display: "flex", gap: 14, padding: "14px 16px", background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }} className="tr-app-routes-app-widgets-review-wall-div-15">
    //             <div style={{
    //               width: 32, height: 32, borderRadius: "50%", background: C.accent,
    //               color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    //               fontSize: 13, fontWeight: 600, flexShrink: 0,
    //             }} className="tr-app-routes-app-widgets-review-wall-div-16">{n}</div>
    //             <div className="tr-app-routes-app-widgets-review-wall-div-17">
    //               <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, marginBottom: 4 }} className="tr-app-routes-app-widgets-review-wall-div-18">
    //                 {title}
    //               </div>
    //               <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }} className="tr-app-routes-app-widgets-review-wall-div-19">{body}</div>
    //             </div>
    //           </div>
    //         ))}
    //       </div>
    //     </div>

    //     {/* Features */}
    //     <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: "24px 24px", marginBottom: 24 }} className="tr-app-routes-app-widgets-review-wall-div-20">
    //       <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 16 }} className="tr-app-routes-app-widgets-review-wall-div-21">What the Review Wall includes</div>
    //       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }} className="tr-app-routes-app-widgets-review-wall-div-22">
    //         {[
    //           { label: "Live search", desc: "Customers can search by name, keyword, or review title" },
    //           { label: "Rating filter", desc: "Filter by 1–5 stars with review count per rating" },
    //           { label: "Pagination", desc: "Configurable reviews per page (6–48)" },
    //           { label: "Fully responsive", desc: "2–4 columns on desktop, auto-collapses on mobile" },
    //           { label: "SEO schema", desc: "Auto-injects AggregateRating JSON-LD for Google" },
    //           { label: "Media support", desc: "Shows customer photo uploads inside each card" },
    //           { label: "Store-wide", desc: "Shows approved reviews from all your products" },
    //           { label: "No slowdown", desc: "Loads asynchronously, page renders instantly" },
    //         ].map(({ label, desc }) => (
    //           <div key={label} style={{
    //             padding: "12px 14px", background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`,
    //           }} className="tr-app-routes-app-widgets-review-wall-div-23">
    //             <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 3 }} className="tr-app-routes-app-widgets-review-wall-div-24">{label}</div>
    //             <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }} className="tr-app-routes-app-widgets-review-wall-div-25">{desc}</div>
    //           </div>
    //         ))}
    //       </div>
    //     </div>

    //     {/* SEO note */}
    //     <div style={{
    //       background: "#eef1f7", border: "1.5px solid #ccd7e8",
    //       borderRadius: 14, padding: "16px 20px",
    //     }} className="tr-app-routes-app-widgets-review-wall-div-26">
    //       <div style={{ fontSize: 13, fontWeight: 600, color: "#2f4d80", marginBottom: 6 }} className="tr-app-routes-app-widgets-review-wall-div-27">
    //         SEO Benefit
    //       </div>
    //       <div style={{ fontSize: 12.5, color: "#2f4d80", lineHeight: 1.6 }} className="tr-app-routes-app-widgets-review-wall-div-28">
    //         The Review Wall page automatically injects an{" "}
    //         <strong className="tr-app-routes-app-widgets-review-wall-strong-29">AggregateRating JSON-LD schema</strong> so Google can index your store&apos;s overall
    //         rating. This can show star ratings directly in search results, increasing click-through rates.
    //         For best results, name the page <strong className="tr-app-routes-app-widgets-review-wall-strong-30">&quot;Customer Reviews&quot;</strong> and link to it from
    //         your site footer.
    //       </div>
    //     </div>

    //   </div>
    // </div>
    <div
  style={{
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 0% 0%, rgba(141,180,214,.16), transparent 28%), radial-gradient(circle at 100% 8%, rgba(214,230,242,.42), transparent 28%), #F2F7FB",
    padding: "clamp(20px, 4vw, 42px) clamp(14px, 3vw, 28px)",
    fontFamily: "inherit",
    boxSizing: "border-box",
  }}
  className="tr-app-routes-app-widgets-review-wall-div-1"
>
  <div
    style={{
      maxWidth: 980,
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box",
    }}
    className="tr-app-routes-app-widgets-review-wall-div-2"
  >
    {/* Header */}
    <div
      style={{
        marginBottom: 22,
        padding: "clamp(20px, 3vw, 28px)",
        background:
          "linear-gradient(135deg, rgba(255,255,255,.98) 0%, rgba(242,247,251,.95) 100%)",
        border: "1px solid #D6E6F2",
        borderRadius: 20,
        boxShadow: "0 12px 34px rgba(79,115,146,.07)",
        position: "relative",
        overflow: "hidden",
      }}
      className="tr-app-routes-app-widgets-review-wall-div-3"
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "18%",
          right: "18%",
          height: 3,
          background:
            "linear-gradient(90deg, transparent, #8DB4D6, transparent)",
          borderRadius: "0 0 10px 10px",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
        className="tr-app-routes-app-widgets-review-wall-div-4"
      >
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(24px, 4vw, 30px)",
            fontWeight: 800,
            color: "#4F7392",
            letterSpacing: "-.035em",
            lineHeight: 1.15,
          }}
          className="tr-app-routes-app-widgets-review-wall-h1-5"
        >
          Review Wall
        </h1>

        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            background: "linear-gradient(135deg,#8DB4D6,#6F96B6)",
            color: "#fff",
            padding: "5px 10px",
            borderRadius: 20,
            letterSpacing: ".04em",
            boxShadow: "0 4px 10px rgba(79,115,146,.14)",
          }}
          className="tr-app-routes-app-widgets-review-wall-span-6"
        >
          NEW
        </span>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: "clamp(13px, 1.8vw, 14px)",
          color: "#829CAF",
          lineHeight: 1.7,
          maxWidth: 760,
        }}
        className="tr-app-routes-app-widgets-review-wall-p-7"
      >
        A dedicated page on your store that displays all your reviews in a beautiful, searchable grid.
        Perfect for SEO and social proof — customers can browse, filter by rating, and search reviews.
      </p>
    </div>

    {/* Stats */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "clamp(10px, 2vw, 14px)",
        marginBottom: 22,
      }}
      className="tr-app-routes-app-widgets-review-wall-div-8"
    >
      {[
        { label: "Total reviews", value: total },
        { label: "Average rating", value: avgRating + " / 5" },
        { label: "SEO schema", value: "Auto-injected" },
      ].map(({ label, value }) => (
        <div
          key={label}
          style={{
            background:
              "linear-gradient(145deg,#FFFFFF 0%,#F8FBFD 100%)",
            borderRadius: 16,
            padding: "clamp(16px, 2.5vw, 20px)",
            border: "1px solid #D6E6F2",
            boxShadow: "0 8px 22px rgba(79,115,146,.055)",
            minWidth: 0,
            boxSizing: "border-box",
          }}
          className="tr-app-routes-app-widgets-review-wall-div-9"
        >
          <div
            style={{
              fontSize: "clamp(21px, 3vw, 26px)",
              fontWeight: 800,
              color: "#4F7392",
              lineHeight: 1.1,
              letterSpacing: "-.025em",
              wordBreak: "break-word",
            }}
            className="tr-app-routes-app-widgets-review-wall-div-10"
          >
            {value}
          </div>

          <div
            style={{
              fontSize: 12.5,
              color: "#829CAF",
              marginTop: 6,
              fontWeight: 550,
              lineHeight: 1.4,
            }}
            className="tr-app-routes-app-widgets-review-wall-div-11"
          >
            {label}
          </div>
        </div>
      ))}
    </div>

    {/* Setup steps */}
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        border: "1px solid #D6E6F2",
        padding: "clamp(18px, 3vw, 26px)",
        marginBottom: 22,
        boxShadow: "0 10px 28px rgba(79,115,146,.06)",
      }}
      className="tr-app-routes-app-widgets-review-wall-div-12"
    >
      <div
        style={{
          fontSize: "clamp(15px, 2vw, 17px)",
          fontWeight: 750,
          color: "#4F7392",
          marginBottom: 18,
          letterSpacing: "-.015em",
        }}
        className="tr-app-routes-app-widgets-review-wall-div-13"
      >
        How to add the Review Wall to your store
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
        className="tr-app-routes-app-widgets-review-wall-div-14"
      >
        {STEPS.map(({ n, title, body }) => (
          <div
            key={n}
            style={{
              display: "flex",
              gap: "clamp(10px, 2vw, 14px)",
              padding: "clamp(13px, 2vw, 16px)",
              background:
                "linear-gradient(135deg,#F8FBFD 0%,#F2F7FB 100%)",
              borderRadius: 13,
              border: "1px solid #D6E6F2",
              alignItems: "flex-start",
              boxSizing: "border-box",
            }}
            className="tr-app-routes-app-widgets-review-wall-div-15"
          >
            <div
              style={{
                width: "clamp(32px, 5vw, 36px)",
                height: "clamp(32px, 5vw, 36px)",
                borderRadius: 10,
                background:
                  "linear-gradient(135deg,#8DB4D6 0%,#6F96B6 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 800,
                flexShrink: 0,
                boxShadow: "0 5px 12px rgba(79,115,146,.16)",
              }}
              className="tr-app-routes-app-widgets-review-wall-div-16"
            >
              {n}
            </div>

            <div
              style={{
                minWidth: 0,
                flex: 1,
              }}
              className="tr-app-routes-app-widgets-review-wall-div-17"
            >
              <div
                style={{
                  fontSize: "clamp(13.5px, 1.8vw, 14.5px)",
                  fontWeight: 750,
                  color: "#4F7392",
                  marginBottom: 4,
                  lineHeight: 1.4,
                }}
                className="tr-app-routes-app-widgets-review-wall-div-18"
              >
                {title}
              </div>

              <div
                style={{
                  fontSize: "clamp(12px, 1.6vw, 13px)",
                  color: "#829CAF",
                  lineHeight: 1.65,
                }}
                className="tr-app-routes-app-widgets-review-wall-div-19"
              >
                {body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Features */}
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        border: "1px solid #D6E6F2",
        padding: "clamp(18px, 3vw, 26px)",
        marginBottom: 22,
        boxShadow: "0 10px 28px rgba(79,115,146,.06)",
      }}
      className="tr-app-routes-app-widgets-review-wall-div-20"
    >
      <div
        style={{
          fontSize: "clamp(15px, 2vw, 17px)",
          fontWeight: 750,
          color: "#4F7392",
          marginBottom: 16,
          letterSpacing: "-.015em",
        }}
        className="tr-app-routes-app-widgets-review-wall-div-21"
      >
        What the Review Wall includes
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
          gap: 12,
        }}
        className="tr-app-routes-app-widgets-review-wall-div-22"
      >
        {[
          { label: "Live search", desc: "Customers can search by name, keyword, or review title" },
          { label: "Rating filter", desc: "Filter by 1–5 stars with review count per rating" },
          { label: "Pagination", desc: "Configurable reviews per page (6–48)" },
          { label: "Fully responsive", desc: "2–4 columns on desktop, auto-collapses on mobile" },
          { label: "SEO schema", desc: "Auto-injects AggregateRating JSON-LD for Google" },
          { label: "Media support", desc: "Shows customer photo uploads inside each card" },
          { label: "Store-wide", desc: "Shows approved reviews from all your products" },
          { label: "No slowdown", desc: "Loads asynchronously, page renders instantly" },
        ].map(({ label, desc }) => (
          <div
            key={label}
            style={{
              padding: "14px 15px",
              background:
                "linear-gradient(145deg,#F9FCFE 0%,#F2F7FB 100%)",
              borderRadius: 12,
              border: "1px solid #D6E6F2",
              minWidth: 0,
              boxSizing: "border-box",
            }}
            className="tr-app-routes-app-widgets-review-wall-div-23"
          >
            <div
              style={{
                fontSize: "clamp(12.8px, 1.7vw, 13.5px)",
                fontWeight: 750,
                color: "#4F7392",
                marginBottom: 5,
                lineHeight: 1.35,
              }}
              className="tr-app-routes-app-widgets-review-wall-div-24"
            >
              {label}
            </div>

            <div
              style={{
                fontSize: "clamp(11.5px, 1.5vw, 12.2px)",
                color: "#829CAF",
                lineHeight: 1.55,
              }}
              className="tr-app-routes-app-widgets-review-wall-div-25"
            >
              {desc}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* SEO note */}
    <div
      style={{
        background:
          "linear-gradient(135deg,#F2F7FB 0%,#EAF3F9 100%)",
        border: "1px solid #BFD6E7",
        borderRadius: 16,
        padding: "clamp(16px, 2.5vw, 20px)",
        boxShadow: "0 8px 20px rgba(79,115,146,.055)",
      }}
      className="tr-app-routes-app-widgets-review-wall-div-26"
    >
      <div
        style={{
          fontSize: "clamp(13px, 1.8vw, 14px)",
          fontWeight: 800,
          color: "#4F7392",
          marginBottom: 7,
          letterSpacing: "-.01em",
        }}
        className="tr-app-routes-app-widgets-review-wall-div-27"
      >
        SEO Benefit
      </div>

      <div
        style={{
          fontSize: "clamp(12px, 1.6vw, 13px)",
          color: "#5F7F9A",
          lineHeight: 1.7,
        }}
        className="tr-app-routes-app-widgets-review-wall-div-28"
      >
        The Review Wall page automatically injects an{" "}
        <strong
          className="tr-app-routes-app-widgets-review-wall-strong-29"
          style={{
            color: "#4F7392",
            fontWeight: 800,
          }}
        >
          AggregateRating JSON-LD schema
        </strong>{" "}
        so Google can index your store&apos;s overall rating. This can show star ratings directly in search results,
        increasing click-through rates. For best results, name the page{" "}
        <strong
          className="tr-app-routes-app-widgets-review-wall-strong-30"
          style={{
            color: "#4F7392",
            fontWeight: 800,
          }}
        >
          &quot;Customer Reviews&quot;
        </strong>{" "}
        and link to it from your site footer.
      </div>
    </div>
  </div>
</div>
  );
}
