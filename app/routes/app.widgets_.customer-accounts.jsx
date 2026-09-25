import { authenticate } from "../shopify.server";
import { SHELL_C } from "../components/WidgetCustomizeShell";
import { Link } from "react-router";

export async function loader({ request }) {
  await authenticate.admin(request);
  return null;
}

export default function CustomerAccountsStubPage() {
  return (
    // <div style={{ minHeight: "100vh", background: SHELL_C.bg, fontFamily: "var(--app-font-family)" }} className="tr-app-routes-app-widgets-customer-accounts-div-1">
    //   <div style={{
    //     display: "flex", alignItems: "center", gap: 12, padding: "14px 22px",
    //     background: SHELL_C.surface, borderBottom: `1px solid ${SHELL_C.border}`,
    //   }} className="tr-app-routes-app-widgets-customer-accounts-div-2">
    //     <Link to="/app/widgets" style={{ fontSize: 16, color: SHELL_C.text, textDecoration: "none" }}>←</Link>
    //     <span style={{ fontWeight: 600, fontSize: 15, color: SHELL_C.text }} className="tr-app-routes-app-widgets-customer-accounts-span-3">Customer accounts widgets</span>
    //   </div>

    //   <div style={{ maxWidth: 640, margin: "40px auto", padding: "0 20px" }} className="tr-app-routes-app-widgets-customer-accounts-div-4">
    //     <div style={{ background: SHELL_C.surface, borderRadius: 14, border: `1px solid ${SHELL_C.border}`, padding: 28 }} className="tr-app-routes-app-widgets-customer-accounts-div-5">
    //       <h2 style={{ fontSize: 18, fontWeight: 600, color: SHELL_C.text, margin: "0 0 10px" }} className="tr-app-routes-app-widgets-customer-accounts-h2-6">
    //         Let customers write & view reviews from their account
    //       </h2>
    //       <p style={{ fontSize: 13.5, color: SHELL_C.muted, lineHeight: 1.6, marginBottom: 16 }} className="tr-app-routes-app-widgets-customer-accounts-p-7">
    //         This widget would add a "My Reviews" section to the customer's Order and Account pages, tied to their
    //         order history. Unlike every other widget here, this can't be built as a Theme App Extension block — it
    //         needs a separate Shopify extension type called a <strong className="tr-app-routes-app-widgets-customer-accounts-strong-8">Customer Account UI Extension</strong>, which
    //         uses its own framework, its own scaffolding (<code className="tr-app-routes-app-widgets-customer-accounts-code-9">shopify app generate extension</code>), and its own
    //         deployment.
    //       </p>
    //       <div style={{
    //         background: SHELL_C.bg, border: `1px solid ${SHELL_C.border}`, borderRadius: 8,
    //         padding: "12px 14px", fontSize: 12, color: SHELL_C.muted, lineHeight: 1.6,
    //       }} className="tr-app-routes-app-widgets-customer-accounts-div-10">
    //         That extension hasn't been scaffolded yet. When you're ready to build it, this page is where its
    //         settings (which sections to show, styling) will live.
    //       </div>
    //     </div>
    //   </div>
    // </div>
    <div
  style={{
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 0% 0%, rgba(141,180,214,.14), transparent 28%), radial-gradient(circle at 100% 8%, rgba(214,230,242,.5), transparent 32%), #F2F7FB",
    fontFamily: "var(--app-font-family)",
    color: "#4F7392",
    fontSize: 14,
  }}
  className="tr-app-routes-app-widgets-customer-accounts-div-1 tr-customer-accounts-page"
>
  <style>{`
    .tr-customer-accounts-page,
    .tr-customer-accounts-page *{
      box-sizing:border-box;
    }

    .tr-customer-accounts-back{
      transition:
        background .16s ease,
        border-color .16s ease,
        transform .16s ease;
    }

    .tr-customer-accounts-back:hover{
      background:#EDF5FA !important;
      border-color:#BFD6E7 !important;
      transform:translateX(-1px);
    }

    .tr-customer-accounts-card{
      transition:
        box-shadow .18s ease,
        border-color .18s ease,
        transform .18s ease;
    }

    .tr-customer-accounts-card:hover{
      border-color:#C2D9E8 !important;
      box-shadow:0 18px 42px rgba(79,115,146,.09) !important;
    }

    @media(max-width:768px){
      .tr-customer-accounts-topbar{
        padding:12px 14px !important;
      }

      .tr-customer-accounts-content{
        margin:24px auto !important;
        padding:0 14px !important;
      }

      .tr-customer-accounts-card{
        padding:22px 18px !important;
        border-radius:18px !important;
      }

      .tr-customer-accounts-heading-row{
        align-items:flex-start !important;
      }

      .tr-customer-accounts-icon{
        width:48px !important;
        height:48px !important;
      }

      .tr-customer-accounts-info{
        padding:14px !important;
      }
    }

    @media(max-width:480px){
      .tr-customer-accounts-topbar{
        padding:10px 12px !important;
      }

      .tr-customer-accounts-page-title{
        font-size:14px !important;
      }

      .tr-customer-accounts-content{
        margin:18px auto !important;
        padding:0 12px !important;
      }

      .tr-customer-accounts-card{
        padding:18px 14px !important;
        border-radius:16px !important;
      }

      .tr-customer-accounts-title{
        font-size:20px !important;
      }

      .tr-customer-accounts-description{
        font-size:13.5px !important;
      }

      .tr-customer-accounts-info{
        flex-direction:column !important;
        gap:9px !important;
      }
    }
  `}</style>

  {/* Top bar */}
  <div
    style={{
      minHeight: 62,
      display: "flex",
      alignItems: "center",
      gap: 11,
      padding: "11px 20px",
      background: "rgba(255,255,255,.96)",
      borderBottom: "1px solid #D6E6F2",
      boxShadow: "0 3px 14px rgba(79,115,146,.045)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 20,
    }}
    className="tr-app-routes-app-widgets-customer-accounts-div-2 tr-customer-accounts-topbar"
  >
    <Link
      to="/app/widgets"
      aria-label="Back to widgets"
      style={{
        width: 38,
        height: 38,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        color: "#4F7392",
        textDecoration: "none",
        background: "#F8FBFD",
        border: "1px solid #D6E6F2",
        flexShrink: 0,
      }}
      className="tr-customer-accounts-back"
    >
      <svg
        width="17"
        height="17"
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
        display: "flex",
        alignItems: "center",
        gap: 9,
        minWidth: 0,
      }}
    >
      <span
        style={{
          width: 31,
          height: 31,
          borderRadius: 9,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: "#EDF5FA",
          border: "1px solid #D6E6F2",
          color: "#4F7392",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="8"
            r="3"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M6 19C6 15.7 8.7 13 12 13C15.3 13 18 15.7 18 19"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <span
        style={{
          fontWeight: 800,
          fontSize: 15,
          color: "#496B87",
          letterSpacing: "-.01em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        className="tr-app-routes-app-widgets-customer-accounts-span-3 tr-customer-accounts-page-title"
      >
        Customer accounts widgets
      </span>
    </div>
  </div>

  {/* Main content */}
  <div
    style={{
      width: "100%",
      maxWidth: 760,
      margin: "38px auto",
      padding: "0 20px",
    }}
    className="tr-app-routes-app-widgets-customer-accounts-div-4 tr-customer-accounts-content"
  >
    <div
      style={{
        width: "100%",
        background:
          "linear-gradient(145deg,#FFFFFF 0%,#F8FBFD 100%)",
        borderRadius: 22,
        border: "1px solid #D6E6F2",
        padding: "30px",
        boxShadow: "0 14px 36px rgba(79,115,146,.07)",
        position: "relative",
        overflow: "hidden",
      }}
      className="tr-app-routes-app-widgets-customer-accounts-div-5 tr-customer-accounts-card"
    >
      {/* Decorative background */}
      <div
        style={{
          position: "absolute",
          width: 190,
          height: 190,
          borderRadius: "50%",
          background: "rgba(214,230,242,.44)",
          top: -110,
          right: -70,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 115,
          height: 115,
          borderRadius: "50%",
          background: "rgba(141,180,214,.08)",
          bottom: -70,
          left: -35,
          pointerEvents: "none",
        }}
      />

      {/* Heading */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          marginBottom: 17,
          position: "relative",
          zIndex: 1,
        }}
        className="tr-customer-accounts-heading-row"
      >
        <span
          style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#4F7392",
            background:
              "linear-gradient(145deg,#EDF5FA,#DCEAF4)",
            border: "1px solid #D0E1EC",
            boxShadow: "0 8px 20px rgba(79,115,146,.09)",
          }}
          className="tr-customer-accounts-icon"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="8"
              r="3"
              stroke="currentColor"
              strokeWidth="1.8"
            />

            <path
              d="M6 19C6 15.7 8.7 13 12 13C15.3 13 18 15.7 18 19"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            <path
              d="M17.5 5.5L19 7L21 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <h2
              style={{
                fontSize: "clamp(21px,2.8vw,25px)",
                fontWeight: 800,
                color: "#456984",
                margin: 0,
                lineHeight: 1.25,
                letterSpacing: "-.025em",
              }}
              className="tr-app-routes-app-widgets-customer-accounts-h2-6 tr-customer-accounts-title"
            >
              Let customers write & view reviews from their account
            </h2>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 8px",
                borderRadius: 999,
                background: "#EDF5FA",
                border: "1px solid #D6E6F2",
                color: "#6F8FA9",
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".045em",
                whiteSpace: "nowrap",
              }}
            >
              Planned
            </span>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#8AA2B4",
              lineHeight: 1.4,
            }}
          >
            Customer Account UI Extension
          </div>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 14,
          color: "#7892A6",
          lineHeight: 1.75,
          margin: "0 0 18px",
          position: "relative",
          zIndex: 1,
        }}
        className="tr-app-routes-app-widgets-customer-accounts-p-7 tr-customer-accounts-description"
      >
        This widget would add a "My Reviews" section to the customer's Order and Account pages, tied to their
        order history. Unlike every other widget here, this can't be built as a Theme App Extension block — it
        needs a separate Shopify extension type called a{" "}
        <strong
          style={{
            color: "#4F7392",
            fontWeight: 800,
          }}
          className="tr-app-routes-app-widgets-customer-accounts-strong-8"
        >
          Customer Account UI Extension
        </strong>
        , which uses its own framework, its own scaffolding (
        <code
          style={{
            display: "inline-block",
            fontFamily: "monospace",
            fontSize: 12.5,
            color: "#4F7392",
            background: "#EDF5FA",
            border: "1px solid #D6E6F2",
            padding: "2px 6px",
            borderRadius: 5,
            margin: "0 2px",
          }}
          className="tr-app-routes-app-widgets-customer-accounts-code-9"
        >
          shopify app generate extension
        </code>
        ), and its own deployment.
      </p>

      {/* Info box */}
      <div
        style={{
          background:
            "linear-gradient(135deg,#F2F7FB 0%,#FAFCFD 100%)",
          border: "1px solid #D6E6F2",
          borderRadius: 14,
          padding: "15px 16px",
          fontSize: 13,
          color: "#6F8FA9",
          lineHeight: 1.65,
          display: "flex",
          alignItems: "flex-start",
          gap: 11,
          position: "relative",
          zIndex: 1,
        }}
        className="tr-app-routes-app-widgets-customer-accounts-div-10 tr-customer-accounts-info"
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background: "#FFFFFF",
            border: "1px solid #D6E6F2",
            color: "#5F7F9A",
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M4 7H20V18H4V7Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />

            <path
              d="M8 4V7M16 4V7"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />

            <path
              d="M8 11H16M8 14H13"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 800,
              color: "#55758D",
              marginBottom: 4,
            }}
          >
            Extension not scaffolded yet
          </div>

          <div>
            That extension hasn't been scaffolded yet. When you're ready to build it, this page is where its
            settings (which sections to show, styling) will live.
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}
