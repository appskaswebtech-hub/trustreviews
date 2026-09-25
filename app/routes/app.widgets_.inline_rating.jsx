import { Link } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return {};
};

const C = {
  bg: "#f6f6f8", surface: "#ffffff", border: "#e5e4ec",
  text: "#17171c", muted: "#6b6b78", accent: "#4C6FFF",
  yellow: "#F59E0B", yellowLt: "#fffbe6",
  green: "#1f7a4d", greenLt: "#e7f4ec",
};

const CODE_BLOCK = `<div data-trust-product-id="{{ product.id }}"></div>`;

export default function InlineRatingInfoPage() {
  const copy = () => navigator.clipboard?.writeText(CODE_BLOCK).catch(() => {});

  return (
    // <div style={{ fontFamily: "var(--app-font-family)", background: C.bg, minHeight: "100vh", padding: 28 }} className="tr-app-routes-app-widgets-inline-rating-div-1">
    //   <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }} className="tr-app-routes-app-widgets-inline-rating-div-2">
    //     <Link to="/app/widgets" style={{ fontSize: 16, color: C.text, textDecoration: "none" }}>←</Link>
    //     <div className="tr-app-routes-app-widgets-inline-rating-div-3">
    //       <h1 style={{ fontSize: 24, fontWeight: 600, color: C.text, margin: 0 }} className="tr-app-routes-app-widgets-inline-rating-h1-4">Inline Star Rating</h1>
    //       <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }} className="tr-app-routes-app-widgets-inline-rating-p-5">
    //         A compact star rating badge you can embed anywhere on your product page.
    //       </p>
    //     </div>
    //   </div>

    //   {/* Preview */}
    //   <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }} className="tr-app-routes-app-widgets-inline-rating-div-6">
    //     <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }} className="tr-app-routes-app-widgets-inline-rating-p-7">Preview</p>
    //     <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", background: C.yellowLt, borderRadius: 8 }} className="tr-app-routes-app-widgets-inline-rating-div-8">
    //       {[1,2,3,4,5].map((i) => (
    //         <span key={i} style={{ fontSize: 22, color: i <= 4 ? C.yellow : "#ddd", lineHeight: 1 }} className="tr-app-routes-app-widgets-inline-rating-span-9">★</span>
    //       ))}
    //       <span style={{ fontSize: 14, color: "#555", marginLeft: 4 }} className="tr-app-routes-app-widgets-inline-rating-span-10">4.6 out of 5 based on 1,634 reviews</span>
    //     </div>
    //   </div>

    //   {/* Step 1 — Add the block */}
    //   <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }} className="tr-app-routes-app-widgets-inline-rating-div-11">
    //     <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }} className="tr-app-routes-app-widgets-inline-rating-div-12">
    //       <span style={{ width: 28, height: 28, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }} className="tr-app-routes-app-widgets-inline-rating-span-13">1</span>
    //       <strong style={{ fontSize: 15 }} className="tr-app-routes-app-widgets-inline-rating-strong-14">Add the "Inline Star Rating" block to your theme</strong>
    //     </div>
    //     <p style={{ fontSize: 13, color: C.muted, margin: "0 0 14px 38px" }} className="tr-app-routes-app-widgets-inline-rating-p-15">
    //       Open your Theme Editor, go to your Product page template, and add the <strong className="tr-app-routes-app-widgets-inline-rating-strong-16">Inline Star Rating</strong> block anywhere on the page.
    //       This loads the rating script — you only need to add it once per page template.
    //     </p>
    //     <div style={{ marginLeft: 38 }} className="tr-app-routes-app-widgets-inline-rating-div-17">
    //       <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, margin: "0 0 6px" }} className="tr-app-routes-app-widgets-inline-rating-p-18">In the block settings you can configure:</p>
    //       <ul style={{ fontSize: 13, color: C.muted, margin: 0, paddingLeft: 18, lineHeight: 2 }} className="tr-app-routes-app-widgets-inline-rating-ul-19">
    //         <li className="tr-app-routes-app-widgets-inline-rating-li-20">Star color and size</li>
    //         <li className="tr-app-routes-app-widgets-inline-rating-li-21">Gap between stars</li>
    //         <li className="tr-app-routes-app-widgets-inline-rating-li-22">Rating text format (full / short / count only)</li>
    //       </ul>
    //     </div>
    //   </div>

    //   {/* Step 2 — Snippet */}
    //   <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24, marginBottom: 16 }} className="tr-app-routes-app-widgets-inline-rating-div-23">
    //     <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }} className="tr-app-routes-app-widgets-inline-rating-div-24">
    //       <span style={{ width: 28, height: 28, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }} className="tr-app-routes-app-widgets-inline-rating-span-25">2</span>
    //       <strong style={{ fontSize: 15 }} className="tr-app-routes-app-widgets-inline-rating-strong-26">Paste the snippet wherever you want the rating to appear</strong>
    //     </div>
    //     <p style={{ fontSize: 13, color: C.muted, margin: "0 0 14px 38px" }} className="tr-app-routes-app-widgets-inline-rating-p-27">
    //       Copy the snippet below and paste it into any Liquid file in your theme — e.g. inside your product title section, under the price, or in a custom snippet.
    //     </p>
    //     <div style={{ marginLeft: 38 }} className="tr-app-routes-app-widgets-inline-rating-div-28">
    //       <div style={{
    //         background: "#1e1e2e", borderRadius: 10, padding: "16px 18px",
    //         display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    //       }} className="tr-app-routes-app-widgets-inline-rating-div-29">
    //         <code style={{ fontSize: 13, color: "#a6e3a1", fontFamily: "monospace", wordBreak: "break-all" }} className="tr-app-routes-app-widgets-inline-rating-code-30">
    //           {CODE_BLOCK}
    //         </code>
    //         <button
    //           onClick={copy}
    //           style={{
    //             flexShrink: 0, border: "none", borderRadius: 7, padding: "7px 14px",
    //             background: C.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
    //           }}
    //          className="tr-app-routes-app-widgets-inline-rating-button-31">
    //           Copy
    //         </button>
    //       </div>
    //       <p style={{ fontSize: 12, color: C.muted, margin: "10px 0 0" }} className="tr-app-routes-app-widgets-inline-rating-p-32">
    //         The script from Step 1 automatically detects this div and fills it in with the live rating.
    //       </p>
    //     </div>
    //   </div>

    //   {/* Note */}
    //   <div style={{ background: C.greenLt, borderRadius: 14, border: `1px solid #cfe3d6`, padding: 18, display: "flex", gap: 12 }} className="tr-app-routes-app-widgets-inline-rating-div-33">
    //     <p style={{ fontSize: 13, color: C.green, margin: 0, lineHeight: 1.6 }} className="tr-app-routes-app-widgets-inline-rating-p-34">
    //       You can place multiple <code style={{ fontFamily: "monospace", background: "rgba(0,0,0,.06)", padding: "1px 5px", borderRadius: 4 }} className="tr-app-routes-app-widgets-inline-rating-code-35">data-trust-product-id</code> divs
    //       on the same page (e.g. in both the product header and a sticky bar) — the block script initialises all of them automatically.
    //     </p>
    //   </div>
    // </div>
    <div
  style={{
    fontFamily: "var(--app-font-family)",
    background:
      "radial-gradient(circle at 0% 0%, rgba(141,180,214,.14), transparent 26%), radial-gradient(circle at 100% 5%, rgba(214,230,242,.45), transparent 28%), #F2F7FB",
    minHeight: "100vh",
    padding: "clamp(18px, 3vw, 32px)",
    boxSizing: "border-box",
    fontSize: 14,
    color: "#4F7392",
  }}
  className="tr-app-routes-app-widgets-inline-rating-div-1 tr-inline-rating-page"
>
  <style>{`
    .tr-inline-rating-page,
    .tr-inline-rating-page *{
      box-sizing:border-box;
    }

    .tr-inline-rating-main-card{
      transition:
        border-color .18s ease,
        box-shadow .18s ease,
        transform .18s ease;
    }

    .tr-inline-rating-main-card:hover{
      border-color:#C1D8E7 !important;
      box-shadow:0 14px 34px rgba(79,115,146,.075) !important;
    }

    .tr-inline-rating-back:hover{
      background:#EAF3F9 !important;
      border-color:#BFD6E7 !important;
    }

    .tr-inline-rating-copy:hover{
      transform:translateY(-1px);
      box-shadow:0 7px 16px rgba(79,115,146,.22) !important;
    }

    .tr-inline-rating-copy:active{
      transform:translateY(0);
    }

    @media(max-width:768px){
      .tr-inline-rating-page{
        padding:16px 14px !important;
      }

      .tr-inline-rating-header{
        align-items:flex-start !important;
      }

      .tr-inline-rating-card{
        padding:18px !important;
        border-radius:16px !important;
      }

      .tr-inline-rating-step-content{
        margin-left:0 !important;
      }

      .tr-inline-rating-preview-box{
        width:100% !important;
        display:flex !important;
        flex-wrap:wrap !important;
        justify-content:flex-start !important;
        align-items:center !important;
      }

      .tr-inline-rating-code-wrap{
        flex-direction:column !important;
        align-items:stretch !important;
      }

      .tr-inline-rating-copy{
        width:100% !important;
        min-height:42px !important;
      }
    }

    @media(max-width:520px){
      .tr-inline-rating-page{
        padding:12px !important;
      }

      .tr-inline-rating-header{
        gap:9px !important;
      }

      .tr-inline-rating-title{
        font-size:22px !important;
      }

      .tr-inline-rating-card{
        padding:16px 14px !important;
      }

      .tr-inline-rating-preview-stars{
        gap:2px !important;
      }

      .tr-inline-rating-preview-stars span{
        font-size:19px !important;
      }

      .tr-inline-rating-preview-text{
        width:100% !important;
        margin-left:0 !important;
        margin-top:4px !important;
      }

      .tr-inline-rating-step-title{
        font-size:14px !important;
      }

      .tr-inline-rating-note{
        flex-direction:column !important;
      }
    }
  `}</style>

  <div
    style={{
      width: "100%",
      maxWidth: 1040,
      margin: "0 auto",
    }}
  >
    {/* Header */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 22,
      }}
      className="tr-app-routes-app-widgets-inline-rating-div-2 tr-inline-rating-header"
    >
      <Link
        to="/app/widgets"
        aria-label="Back to widgets"
        style={{
          width: 40,
          height: 40,
          borderRadius: 11,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#4F7392",
          textDecoration: "none",
          flexShrink: 0,
          background: "#FFFFFF",
          border: "1px solid #D6E6F2",
          boxShadow: "0 4px 12px rgba(79,115,146,.05)",
          transition: "all .16s ease",
        }}
        className="tr-inline-rating-back"
      >
        <svg
          width="18"
          height="18"
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
      </Link>

      <div
        style={{
          minWidth: 0,
        }}
        className="tr-app-routes-app-widgets-inline-rating-div-3"
      >
        <h1
          style={{
            fontSize: "clamp(24px, 3vw, 30px)",
            fontWeight: 700,
            color: "#456984",
            margin: 0,
            letterSpacing: "-.035em",
            lineHeight: 1.15,
          }}
          className="tr-app-routes-app-widgets-inline-rating-h1-4 tr-inline-rating-title"
        >
          Inline Star Rating
        </h1>

        <p
          style={{
            fontSize: 13.5,
            color: "#829CAF",
            margin: "6px 0 0",
            lineHeight: 1.6,
          }}
          className="tr-app-routes-app-widgets-inline-rating-p-5"
        >
          A compact star rating badge you can embed anywhere on your product page.
        </p>
      </div>
    </div>

    {/* Preview */}
    <div
      style={{
        background:
          "linear-gradient(145deg,#FFFFFF 0%,#F8FBFD 100%)",
        borderRadius: 18,
        border: "1px solid #D6E6F2",
        padding: "clamp(18px, 3vw, 24px)",
        marginBottom: 18,
        boxShadow: "0 10px 28px rgba(79,115,146,.06)",
      }}
      className="tr-app-routes-app-widgets-inline-rating-div-6 tr-inline-rating-card tr-inline-rating-main-card"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            color: "#4F7392",
            background: "#EDF5FA",
            border: "1px solid #D6E6F2",
            flexShrink: 0,
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 3.8L14.5 8.9L20.1 9.7L16.1 13.6L17 19.2L12 16.6L7 19.2L7.9 13.6L3.9 9.7L9.5 8.9L12 3.8Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <p
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "#6F8FA9",
            textTransform: "uppercase",
            letterSpacing: ".07em",
            margin: 0,
          }}
          className="tr-app-routes-app-widgets-inline-rating-p-7"
        >
          Preview
        </p>
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "13px 16px",
          background:
            "linear-gradient(135deg,#FFF9E8 0%,#FFFDF5 100%)",
          borderRadius: 12,
          border: "1px solid #F3E5B3",
          boxShadow: "0 5px 14px rgba(126,104,36,.05)",
          maxWidth: "100%",
        }}
        className="tr-app-routes-app-widgets-inline-rating-div-8 tr-inline-rating-preview-box"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexShrink: 0,
          }}
          className="tr-inline-rating-preview-stars"
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              style={{
                fontSize: 22,
                color: i <= 4 ? "#F5B301" : "#D9D9D9",
                lineHeight: 1,
                textShadow:
                  i <= 4
                    ? "0 1px 2px rgba(245,179,1,.12)"
                    : "none",
              }}
              className="tr-app-routes-app-widgets-inline-rating-span-9"
            >
              ★
            </span>
          ))}
        </div>

        <span
          style={{
            fontSize: 14,
            color: "#5D6F7D",
            marginLeft: 4,
            lineHeight: 1.45,
            fontWeight: 600,
          }}
          className="tr-app-routes-app-widgets-inline-rating-span-10 tr-inline-rating-preview-text"
        >
          4.6 out of 5 based on 1,634 reviews
        </span>
      </div>
    </div>

    {/* Step 1 */}
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        border: "1px solid #D6E6F2",
        padding: "clamp(18px, 3vw, 24px)",
        marginBottom: 18,
        boxShadow: "0 9px 26px rgba(79,115,146,.055)",
      }}
      className="tr-app-routes-app-widgets-inline-rating-div-11 tr-inline-rating-card tr-inline-rating-main-card"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
        className="tr-app-routes-app-widgets-inline-rating-div-12"
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background:
              "linear-gradient(135deg,#8DB4D6,#7199B8)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 13,
            flexShrink: 0,
            boxShadow: "0 5px 13px rgba(79,115,146,.15)",
          }}
          className="tr-app-routes-app-widgets-inline-rating-span-13"
        >
          1
        </span>

        <strong
          style={{
            fontSize: 15.5,
            color: "#496B87",
            fontWeight: 800,
            lineHeight: 1.4,
          }}
          className="tr-app-routes-app-widgets-inline-rating-strong-14 tr-inline-rating-step-title"
        >
          Add the "Inline Star Rating" block to your theme
        </strong>
      </div>

      <p
        style={{
          fontSize: 14,
          color: "#829CAF",
          margin: "0 0 14px 44px",
          lineHeight: 1.7,
        }}
        className="tr-app-routes-app-widgets-inline-rating-p-15 tr-inline-rating-step-content"
      >
        Open your Theme Editor, go to your Product page template, and add the{" "}
        <strong
          className="tr-app-routes-app-widgets-inline-rating-strong-16"
          style={{
            color: "#4F7392",
            fontWeight: 750,
          }}
        >
          Inline Star Rating
        </strong>{" "}
        block anywhere on the page.
        This loads the rating script — you only need to add it once per page template.
      </p>

      <div
        style={{
          marginLeft: 44,
          padding: "14px 15px",
          background: "#F7FAFC",
          border: "1px solid #E0EAF1",
          borderRadius: 11,
        }}
        className="tr-app-routes-app-widgets-inline-rating-div-17 tr-inline-rating-step-content"
      >
        <p
          style={{
            fontSize: 12.5,
            fontWeight: 750,
            color: "#6F8FA9",
            margin: "0 0 8px",
          }}
          className="tr-app-routes-app-widgets-inline-rating-p-18"
        >
          In the block settings you can configure:
        </p>

        <ul
          style={{
            fontSize: 14,
            color: "#7892A6",
            margin: 0,
            paddingLeft: 18,
            lineHeight: 1.9,
          }}
          className="tr-app-routes-app-widgets-inline-rating-ul-19"
        >
          <li className="tr-app-routes-app-widgets-inline-rating-li-20">
            Star color and size
          </li>
          <li className="tr-app-routes-app-widgets-inline-rating-li-21">
            Gap between stars
          </li>
          <li className="tr-app-routes-app-widgets-inline-rating-li-22">
            Rating text format (full / short / count only)
          </li>
        </ul>
      </div>
    </div>

    {/* Step 2 */}
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        border: "1px solid #D6E6F2",
        padding: "clamp(18px, 3vw, 24px)",
        marginBottom: 18,
        boxShadow: "0 9px 26px rgba(79,115,146,.055)",
      }}
      className="tr-app-routes-app-widgets-inline-rating-div-23 tr-inline-rating-card tr-inline-rating-main-card"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
        className="tr-app-routes-app-widgets-inline-rating-div-24"
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background:
              "linear-gradient(135deg,#8DB4D6,#7199B8)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 13,
            flexShrink: 0,
            boxShadow: "0 5px 13px rgba(79,115,146,.15)",
          }}
          className="tr-app-routes-app-widgets-inline-rating-span-25"
        >
          2
        </span>

        <strong
          style={{
            fontSize: 15.5,
            color: "#496B87",
            fontWeight: 800,
            lineHeight: 1.4,
          }}
          className="tr-app-routes-app-widgets-inline-rating-strong-26 tr-inline-rating-step-title"
        >
          Paste the snippet wherever you want the rating to appear
        </strong>
      </div>

      <p
        style={{
          fontSize: 14,
          color: "#829CAF",
          margin: "0 0 14px 44px",
          lineHeight: 1.7,
        }}
        className="tr-app-routes-app-widgets-inline-rating-p-27 tr-inline-rating-step-content"
      >
        Copy the snippet below and paste it into any Liquid file in your theme — e.g. inside your product title section, under the price, or in a custom snippet.
      </p>

      <div
        style={{
          marginLeft: 44,
        }}
        className="tr-app-routes-app-widgets-inline-rating-div-28 tr-inline-rating-step-content"
      >
        <div
          style={{
            background:
              "linear-gradient(135deg,#1F2E3B,#263B4C)",
            borderRadius: 12,
            padding: "15px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            border: "1px solid rgba(255,255,255,.06)",
            boxShadow: "0 8px 20px rgba(24,39,52,.12)",
          }}
          className="tr-app-routes-app-widgets-inline-rating-div-29 tr-inline-rating-code-wrap"
        >
          <code
            style={{
              fontSize: 13,
              color: "#B8E7C1",
              fontFamily: "monospace",
              wordBreak: "break-all",
              lineHeight: 1.6,
              flex: 1,
              minWidth: 0,
            }}
            className="tr-app-routes-app-widgets-inline-rating-code-30"
          >
            {CODE_BLOCK}
          </code>

          <button
            onClick={copy}
            style={{
              flexShrink: 0,
              border: "none",
              borderRadius: 9,
              padding: "8px 14px",
              background:
                "linear-gradient(135deg,#8DB4D6,#7199B8)",
              color: "#FFFFFF",
              fontSize: 12.5,
              fontWeight: 750,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 5px 13px rgba(79,115,146,.18)",
              transition: "all .16s ease",
            }}
            className="tr-app-routes-app-widgets-inline-rating-button-31 tr-inline-rating-copy"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
            >
              <rect
                x="8"
                y="8"
                width="11"
                height="11"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M16 8V6C16 4.9 15.1 4 14 4H6C4.9 4 4 4.9 4 6V14C4 15.1 4.9 16 6 16H8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>

            Copy
          </button>
        </div>

        <p
          style={{
            fontSize: 12.5,
            color: "#829CAF",
            margin: "10px 0 0",
            lineHeight: 1.6,
          }}
          className="tr-app-routes-app-widgets-inline-rating-p-32"
        >
          The script from Step 1 automatically detects this div and fills it in with the live rating.
        </p>
      </div>
    </div>

    {/* Note */}
    <div
      style={{
        background:
          "linear-gradient(135deg,#F1F8F4,#FAFDFC)",
        borderRadius: 16,
        border: "1px solid #CDE4D6",
        padding: "16px 18px",
        display: "flex",
        alignItems: "flex-start",
        gap: 11,
        boxShadow: "0 6px 18px rgba(58,111,78,.04)",
      }}
      className="tr-app-routes-app-widgets-inline-rating-div-33 tr-inline-rating-note"
    >
      <span
        style={{
          width: 34,
          height: 34,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderRadius: 10,
          background: "#E3F2E9",
          border: "1px solid #CEE5D7",
          color: "#4A7C5D",
        }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M12 10V16"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle
            cx="12"
            cy="7"
            r="1"
            fill="currentColor"
          />
        </svg>
      </span>

      <p
        style={{
          fontSize: 13.5,
          color: "#52745F",
          margin: 0,
          lineHeight: 1.7,
        }}
        className="tr-app-routes-app-widgets-inline-rating-p-34"
      >
        You can place multiple{" "}
        <code
          style={{
            fontFamily: "monospace",
            background: "rgba(79,115,146,.08)",
            color: "#496B87",
            padding: "2px 6px",
            borderRadius: 5,
            border: "1px solid rgba(79,115,146,.08)",
          }}
          className="tr-app-routes-app-widgets-inline-rating-code-35"
        >
          data-trust-product-id
        </code>{" "}
        divs on the same page (e.g. in both the product header and a sticky bar) — the block script initialises all of them automatically.
      </p>
    </div>
  </div>
</div>
  );
}
