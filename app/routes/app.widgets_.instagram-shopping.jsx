import { authenticate } from "../shopify.server";
import { SHELL_C } from "../components/WidgetCustomizeShell";
import { Link } from "react-router";

export async function loader({ request }) {
  await authenticate.admin(request);
  return null;
}

export default function InstagramShoppingStubPage() {
  return (
    // <div style={{ minHeight: "100vh", background: SHELL_C.bg, fontFamily: "var(--app-font-family)" }} className="tr-app-routes-app-widgets-instagram-shopping-div-1">
    //   <div style={{
    //     display: "flex", alignItems: "center", gap: 12, padding: "14px 22px",
    //     background: SHELL_C.surface, borderBottom: `1px solid ${SHELL_C.border}`,
    //   }} className="tr-app-routes-app-widgets-instagram-shopping-div-2">
    //     <Link to="/app/widgets" style={{ fontSize: 16, color: SHELL_C.text, textDecoration: "none" }}>←</Link>
    //     <span style={{ fontWeight: 600, fontSize: 15, color: SHELL_C.text }} className="tr-app-routes-app-widgets-instagram-shopping-span-3">UCC Instagram Shopping</span>
    //   </div>

    //   <div style={{ maxWidth: 640, margin: "40px auto", padding: "0 20px" }} className="tr-app-routes-app-widgets-instagram-shopping-div-4">
    //     <div style={{ background: SHELL_C.surface, borderRadius: 14, border: `1px solid ${SHELL_C.border}`, padding: 28 }} className="tr-app-routes-app-widgets-instagram-shopping-div-5">
    //       <h2 style={{ fontSize: 18, fontWeight: 600, color: SHELL_C.text, margin: "0 0 10px" }} className="tr-app-routes-app-widgets-instagram-shopping-h2-6">
    //         Connect your Instagram account
    //       </h2>
    //       <p style={{ fontSize: 13.5, color: SHELL_C.muted, lineHeight: 1.6, marginBottom: 16 }} className="tr-app-routes-app-widgets-instagram-shopping-p-7">
    //         This widget pulls real posts from a connected Instagram Business account and turns them into a shoppable
    //         grid on your storefront. To enable it, this app needs a Meta/Instagram Business app with Graph API
    //         credentials — that hasn't been set up yet.
    //       </p>
    //       <button
    //         disabled
    //         style={{
    //           border: "none", borderRadius: 8, padding: "10px 20px", background: "#d1d5db",
    //           color: "#fff", fontWeight: 600, fontSize: 13, cursor: "default",
    //         }}
    //        className="tr-app-routes-app-widgets-instagram-shopping-button-8">
    //         Connect Instagram Account (coming soon)
    //       </button>
    //       <div style={{
    //         marginTop: 20, background: SHELL_C.bg, border: `1px solid ${SHELL_C.border}`, borderRadius: 8,
    //         padding: "12px 14px", fontSize: 12, color: SHELL_C.muted, lineHeight: 1.6,
    //       }} className="tr-app-routes-app-widgets-instagram-shopping-div-9">
    //         Once Instagram credentials are available, this page will let you connect your account, pick which posts
    //         to feature, and customize the grid's style — the same way the other widgets work.
    //       </div>
    //     </div>
    //   </div>
    // </div>
    <div
  style={{
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 0% 0%, rgba(141,180,214,.14), transparent 28%), radial-gradient(circle at 100% 8%, rgba(214,230,242,.48), transparent 30%), #F2F7FB",
    fontFamily: "var(--app-font-family)",
    color: "#4F7392",
    fontSize: 14,
  }}
  className="tr-app-routes-app-widgets-instagram-shopping-div-1 tr-instagram-page"
>
  <style>{`
    .tr-instagram-page,
    .tr-instagram-page *{
      box-sizing:border-box;
    }

    .tr-instagram-back{
      transition:
        background .16s ease,
        border-color .16s ease,
        transform .16s ease;
    }

    .tr-instagram-back:hover{
      background:#EDF5FA !important;
      border-color:#BDD5E5 !important;
      transform:translateX(-1px);
    }

    .tr-instagram-connect-card{
      transition:
        border-color .18s ease,
        box-shadow .18s ease,
        transform .18s ease;
    }

    .tr-instagram-connect-card:hover{
      border-color:#C4D9E7 !important;
      box-shadow:0 18px 42px rgba(79,115,146,.09) !important;
    }

    .tr-instagram-disabled-btn{
      transition:
        background .16s ease,
        border-color .16s ease,
        opacity .16s ease;
    }

    @media(max-width:768px){
      .tr-instagram-topbar{
        padding:12px 14px !important;
      }

      .tr-instagram-content{
        margin:24px auto !important;
        padding:0 14px !important;
      }

      .tr-instagram-connect-card{
        padding:22px 18px !important;
        border-radius:18px !important;
      }

      .tr-instagram-card-header{
        align-items:flex-start !important;
      }

      .tr-instagram-card-icon{
        width:48px !important;
        height:48px !important;
        border-radius:14px !important;
      }

      .tr-instagram-disabled-btn{
        width:100% !important;
        min-height:44px !important;
      }
    }

    @media(max-width:480px){
      .tr-instagram-topbar{
        padding:10px 12px !important;
      }

      .tr-instagram-page-title{
        font-size:14px !important;
      }

      .tr-instagram-content{
        margin:18px auto !important;
        padding:0 12px !important;
      }

      .tr-instagram-connect-card{
        padding:18px 14px !important;
        border-radius:16px !important;
      }

      .tr-instagram-card-title{
        font-size:19px !important;
      }

      .tr-instagram-description{
        font-size:13.5px !important;
      }

      .tr-instagram-info{
        padding:13px !important;
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
    className="tr-app-routes-app-widgets-instagram-shopping-div-2 tr-instagram-topbar"
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
      className="tr-instagram-back"
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
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle
            cx="12"
            cy="12"
            r="3.4"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
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
        className="tr-app-routes-app-widgets-instagram-shopping-span-3 tr-instagram-page-title"
      >
        UCC Instagram Shopping
      </span>
    </div>
  </div>

  {/* Content */}
  <div
    style={{
      width: "100%",
      maxWidth: 760,
      margin: "38px auto",
      padding: "0 20px",
    }}
    className="tr-app-routes-app-widgets-instagram-shopping-div-4 tr-instagram-content"
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
      className="tr-app-routes-app-widgets-instagram-shopping-div-5 tr-instagram-connect-card"
    >
      {/* Decorative background */}
      <div
        style={{
          position: "absolute",
          width: 190,
          height: 190,
          borderRadius: "50%",
          background: "rgba(214,230,242,.42)",
          top: -110,
          right: -65,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 110,
          height: 110,
          borderRadius: "50%",
          background: "rgba(141,180,214,.08)",
          bottom: -65,
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
        className="tr-instagram-card-header"
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
          className="tr-instagram-card-icon"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect
              x="4"
              y="4"
              width="16"
              height="16"
              rx="5"
              stroke="currentColor"
              strokeWidth="1.8"
            />

            <circle
              cx="12"
              cy="12"
              r="3.6"
              stroke="currentColor"
              strokeWidth="1.8"
            />

            <circle
              cx="17.1"
              cy="6.9"
              r="1"
              fill="currentColor"
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
                fontSize: "clamp(20px,2.6vw,24px)",
                fontWeight: 800,
                color: "#456984",
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: "-.025em",
              }}
              className="tr-app-routes-app-widgets-instagram-shopping-h2-6 tr-instagram-card-title"
            >
              Connect your Instagram account
            </h2>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 8px",
                borderRadius: 999,
                background: "#F0F6FA",
                border: "1px solid #D6E6F2",
                color: "#6F8FA9",
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".045em",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#8DB4D6",
                }}
              />
              Coming soon
            </span>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#8AA2B4",
              lineHeight: 1.4,
            }}
          >
            Instagram Business integration
          </div>
        </div>
      </div>

      <p
        style={{
          fontSize: 14,
          color: "#7892A6",
          lineHeight: 1.75,
          margin: "0 0 20px",
          position: "relative",
          zIndex: 1,
        }}
        className="tr-app-routes-app-widgets-instagram-shopping-p-7 tr-instagram-description"
      >
        This widget pulls real posts from a connected Instagram Business account and turns them into a shoppable
        grid on your storefront. To enable it, this app needs a Meta/Instagram Business app with Graph API
        credentials — that hasn't been set up yet.
      </p>

      <button
        disabled
        style={{
          minHeight: 44,
          border: "1px solid #D6E2EA",
          borderRadius: 11,
          padding: "10px 17px",
          background:
            "linear-gradient(135deg,#E8EFF4 0%,#DCE6ED 100%)",
          color: "#8299AA",
          fontWeight: 750,
          fontSize: 13,
          cursor: "not-allowed",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          position: "relative",
          zIndex: 1,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.75)",
        }}
        className="tr-app-routes-app-widgets-instagram-shopping-button-8 tr-instagram-disabled-btn"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M8 11V8C8 5.8 9.8 4 12 4C14.2 4 16 5.8 16 8V11"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          <rect
            x="6"
            y="11"
            width="12"
            height="9"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>

        Connect Instagram Account (coming soon)
      </button>

      {/* Info card */}
      <div
        style={{
          marginTop: 22,
          background:
            "linear-gradient(135deg,#F3F8FB 0%,#FAFCFD 100%)",
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
        className="tr-app-routes-app-widgets-instagram-shopping-div-9 tr-instagram-info"
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
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
            width="16"
            height="16"
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

        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 750,
              color: "#55758D",
              marginBottom: 4,
            }}
          >
            What you'll be able to do
          </div>

          <div>
            Once Instagram credentials are available, this page will let you connect your account, pick which posts
            to feature, and customize the grid's style — the same way the other widgets work.
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}
