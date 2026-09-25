import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  return {
    shop: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
}

export default function ReviewsSummarySettingsPage() {
  const { shop, apiKey } = useLoaderData();
  const installUrl =
    `https://${shop}/admin/themes/current/editor` +
    `?template=product&addAppBlockId=${encodeURIComponent(apiKey)}/reviews-summary&target=newAppsSection`;

  return (
    // <div style={{
    //   fontFamily: "var(--app-font-family)", background: "#f6f6f8", minHeight: "100vh",
    //   padding: 28, display: "flex", justifyContent: "center", alignItems: "flex-start",
    // }} className="tr-app-routes-app-widgets-reviews-summary-div-1">
    //   <div style={{
    //     background: "#ffffff", borderRadius: 14, border: "1px solid #e5e4ec",
    //     padding: 32, maxWidth: 520, textAlign: "center", marginTop: 60,
    //   }} className="tr-app-routes-app-widgets-reviews-summary-div-2">
    //     <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px", color: "#17171c" }} className="tr-app-routes-app-widgets-reviews-summary-h1-3">Reviews Summary</h1>
    //     <p style={{ fontSize: 13, color: "#6b6b78", lineHeight: 1.6, margin: "0 0 20px" }} className="tr-app-routes-app-widgets-reviews-summary-p-4">
    //       This widget — heading, rating breakdown, "Write a Review" button, trust badges, and sort —
    //       is fully customized inside the Theme Editor with a live preview. Add the block to your
    //       product page, then click it in the editor to edit its settings (heading text, toggles,
    //       badge images).
    //     </p>
    //     <a href={installUrl} target="_blank" rel="noreferrer" style={{
    //       display: "inline-block", background: "#4C6FFF", color: "#fff", fontWeight: 600,
    //       fontSize: 13, borderRadius: 8, padding: "10px 22px", textDecoration: "none",
    //     }} className="tr-app-routes-app-widgets-reviews-summary-a-5">
    //       Open Theme Editor ↗
    //     </a>
    //     <div style={{ marginTop: 18 }} className="tr-app-routes-app-widgets-reviews-summary-div-6">
    //       <Link to="/app/widgets" style={{ fontSize: 12.5, color: "#6b6b78" }}>← Back to Widgets</Link>
    //     </div>
    //   </div>
    // </div>
    <div
  style={{
    fontFamily: "var(--app-font-family)",
    background:
      "radial-gradient(circle at 0% 0%, rgba(141,180,214,.15), transparent 28%), radial-gradient(circle at 100% 8%, rgba(214,230,242,.5), transparent 30%), #F2F7FB",
    minHeight: "100vh",
    padding: "clamp(18px, 4vw, 34px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    boxSizing: "border-box",
    fontSize: 14,
  }}
  className="tr-app-routes-app-widgets-reviews-summary-div-1 tr-reviews-summary-page"
>
  <style>{`
    .tr-reviews-summary-page,
    .tr-reviews-summary-page *{
      box-sizing:border-box;
    }

    .tr-reviews-summary-card{
      transition:
        box-shadow .18s ease,
        border-color .18s ease,
        transform .18s ease;
    }

    .tr-reviews-summary-card:hover{
      border-color:#C3D9E8 !important;
      box-shadow:0 18px 42px rgba(79,115,146,.09) !important;
      transform:translateY(-1px);
    }

    .tr-reviews-summary-primary{
      transition:
        transform .16s ease,
        box-shadow .16s ease,
        filter .16s ease;
    }

    .tr-reviews-summary-primary:hover{
      transform:translateY(-1px);
      box-shadow:0 9px 20px rgba(79,115,146,.22) !important;
      filter:brightness(.99);
    }

    .tr-reviews-summary-primary:active{
      transform:translateY(0);
    }

    .tr-reviews-summary-back{
      transition:
        background .16s ease,
        color .16s ease;
    }

    .tr-reviews-summary-back:hover{
      background:#EAF3F9 !important;
      color:#4F7392 !important;
    }

    @media(max-width:640px){
      .tr-reviews-summary-page{
        padding:14px !important;
        align-items:flex-start !important;
      }

      .tr-reviews-summary-card{
        margin-top:24px !important;
        padding:24px 18px !important;
        border-radius:18px !important;
      }

      .tr-reviews-summary-icon{
        width:58px !important;
        height:58px !important;
        border-radius:16px !important;
      }

      .tr-reviews-summary-title{
        font-size:22px !important;
      }

      .tr-reviews-summary-description{
        font-size:13.5px !important;
      }

      .tr-reviews-summary-primary{
        width:100% !important;
        min-height:44px !important;
      }

      .tr-reviews-summary-feature-list{
        grid-template-columns:1fr !important;
      }
    }

    @media(max-width:380px){
      .tr-reviews-summary-card{
        padding:22px 14px !important;
      }

      .tr-reviews-summary-title{
        font-size:20px !important;
      }
    }
  `}</style>

  <div
    style={{
      width: "100%",
      maxWidth: 620,
      marginTop: "clamp(26px, 7vw, 70px)",
      background:
        "linear-gradient(145deg,#FFFFFF 0%,#F9FCFE 100%)",
      borderRadius: 22,
      border: "1px solid #D6E6F2",
      padding: "clamp(26px, 5vw, 38px)",
      textAlign: "center",
      boxShadow:
        "0 14px 36px rgba(79,115,146,.075)",
      position: "relative",
      overflow: "hidden",
    }}
    className="tr-app-routes-app-widgets-reviews-summary-div-2 tr-reviews-summary-card"
  >
    {/* Soft decorative background */}
    <div
      style={{
        position: "absolute",
        width: 180,
        height: 180,
        borderRadius: "50%",
        background: "rgba(214,230,242,.4)",
        top: -100,
        right: -65,
        pointerEvents: "none",
      }}
    />

    <div
      style={{
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: "rgba(141,180,214,.08)",
        bottom: -70,
        left: -45,
        pointerEvents: "none",
      }}
    />

    {/* Icon */}
    <div
      style={{
        width: 66,
        height: 66,
        margin: "0 auto 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 18,
        background:
          "linear-gradient(145deg,#EDF5FA 0%,#DDEBF4 100%)",
        border: "1px solid #D1E2ED",
        color: "#4F7392",
        boxShadow: "0 9px 22px rgba(79,115,146,.09)",
        position: "relative",
        zIndex: 1,
      }}
      className="tr-reviews-summary-icon"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M4 5H20V18H4V5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />

        <path
          d="M7 9H17"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />

        <path
          d="M7 13H12"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />

        <path
          d="M15.5 12.2L16.6 14.2L18.8 14.5L17.2 16L17.6 18.2L15.5 17.1L13.5 18.2L13.9 16L12.3 14.5L14.5 14.2L15.5 12.2Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>

    <h1
      style={{
        fontSize: "clamp(22px, 3vw, 28px)",
        fontWeight: 800,
        margin: "0 0 10px",
        color: "#456984",
        lineHeight: 1.2,
        letterSpacing: "-.03em",
        position: "relative",
        zIndex: 1,
      }}
      className="tr-app-routes-app-widgets-reviews-summary-h1-3 tr-reviews-summary-title"
    >
      Reviews Summary
    </h1>

    <p
      style={{
        fontSize: 14,
        color: "#829CAF",
        lineHeight: 1.75,
        margin: "0 auto 22px",
        maxWidth: 520,
        position: "relative",
        zIndex: 1,
      }}
      className="tr-app-routes-app-widgets-reviews-summary-p-4 tr-reviews-summary-description"
    >
      This widget — heading, rating breakdown, "Write a Review" button, trust badges, and sort —
      is fully customized inside the Theme Editor with a live preview. Add the block to your
      product page, then click it in the editor to edit its settings (heading text, toggles,
      badge images).
    </p>

    {/* Small feature chips */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 8,
        marginBottom: 22,
        position: "relative",
        zIndex: 1,
      }}
      className="tr-reviews-summary-feature-list"
    >
      {[
        "Live preview",
        "Theme controls",
        "Trust badges",
      ].map((item) => (
        <div
          key={item}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            background: "#F5F9FC",
            border: "1px solid #DCE8F0",
            fontSize: 11.5,
            fontWeight: 700,
            color: "#6D899E",
            lineHeight: 1.3,
          }}
        >
          {item}
        </div>
      ))}
    </div>

    <a
      href={installUrl}
      target="_blank"
      rel="noreferrer"
      style={{
        minHeight: 44,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        background:
          "linear-gradient(135deg,#8DB4D6 0%,#7199B8 100%)",
        color: "#FFFFFF",
        fontWeight: 750,
        fontSize: 13.5,
        borderRadius: 11,
        padding: "11px 20px",
        textDecoration: "none",
        boxShadow:
          "0 7px 18px rgba(79,115,146,.18)",
        position: "relative",
        zIndex: 1,
      }}
      className="tr-app-routes-app-widgets-reviews-summary-a-5 tr-reviews-summary-primary"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
      >
        <rect
          x="5"
          y="5"
          width="10"
          height="14"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.7"
        />

        <path
          d="M13 5H19V11"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M19 5L11 13"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>

      Open Theme Editor
    </a>

    <div
      style={{
        marginTop: 18,
        position: "relative",
        zIndex: 1,
      }}
      className="tr-app-routes-app-widgets-reviews-summary-div-6"
    >
      <Link
        to="/app/widgets"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontSize: 12.5,
          fontWeight: 650,
          color: "#829CAF",
          textDecoration: "none",
          padding: "7px 10px",
          borderRadius: 8,
          transition: "all .16s ease",
        }}
        className="tr-reviews-summary-back"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M15 18L9 12L15 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        Back to Widgets
      </Link>
    </div>
  </div>
</div>
  );
}
