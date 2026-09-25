import { useState, useEffect } from "react";
import { Link, useLoaderData, useSubmit, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { refreshGoogleReviewsCache, connectFromMapsUrl } from "../utils/google-places.server";
import { listAccountsAndLocations, connectLocation, syncAllReviews } from "../utils/google-business.server";
import WidgetCustomizeShell, {
  InstallSection, ColorField, SelectField, TextFieldInput, RangeField, ToggleField, SHELL_C,
} from "../components/WidgetCustomizeShell";
import GoogleReviewsPreview, { GOOGLE_REVIEWS_STYLE_OPTIONS } from "../components/GoogleReviewsPreview";
import { hasAdvancedAccess } from "../utils/planGuard.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const isPro = await hasAdvancedAccess(shop);

  let widget = await db.googleReviewsWidget.findUnique({ where: { shop } });
  if (!widget) {
    widget = await db.googleReviewsWidget.create({ data: { shop } });
  }

  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const installUrl =
    `https://${shop}/admin/themes/current/editor` +
    `?template=product&addAppBlockId=${encodeURIComponent(apiKey)}/google-reviews&target=newAppsSection`;

  const businessConnection = await db.googleBusinessConnection.findUnique({ where: { shop } });
  const fullReviewCount = await db.googleFullReview.count({ where: { shop } });

  return { isPro, widget, installUrl, businessConnection, fullReviewCount };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const isPro = await hasAdvancedAccess(shop);
  if (!isPro) return { ok: false, message: "Google Reviews requires the Advanced plan." };

  const form = await request.formData();
  const actionType = form.get("actionType");

  if (actionType === "save") {
    const payload = {
      placeId: String(form.get("placeId") || "").trim() || null,
      style: form.get("style") || "minimal_badge",
      accentColor: form.get("accentColor") || "#1a1a1a",
      starColor: form.get("starColor") || "#FBBC05",
      backgroundColor: form.get("backgroundColor") || "#FFFFFF",
      textColor: form.get("textColor") || "#1c1b1a",
      fontFamily: form.get("fontFamily") || "inherit",
      fontSize: parseInt(form.get("fontSize")) || 14,
      headingFontSize: parseInt(form.get("headingFontSize")) || 28,
      starSize: parseInt(form.get("starSize")) || 14,
      padding: parseInt(form.get("padding")) || 0,
      margin: parseInt(form.get("margin")) || 0,
      gap: parseInt(form.get("gap")) || 0,
      borderRadius: parseInt(form.get("borderRadius")) || 0,
      borderColor: form.get("borderColor") || "#E5E5E5",
      borderWidth: parseInt(form.get("borderWidth")) || 0,
      maxWidth: parseInt(form.get("maxWidth")) || 0,
      minHeight: parseInt(form.get("minHeight")) || 0,
      showWriteReviewButton: form.get("showWriteReviewButton") === "true",
      writeReviewButtonText: form.get("writeReviewButtonText") || "Write a review on Google",
      reviewsPerPage: parseInt(form.get("reviewsPerPage")) || 5,
    };
    await db.googleReviewsWidget.upsert({
      where: { shop },
      update: payload,
      create: { shop, ...payload },
    });
    return { ok: true, message: "Settings saved." };
  }

  if (actionType === "refresh") {
    try {
      const details = await refreshGoogleReviewsCache(shop);
      return { ok: true, message: `Fetched ${details.userRatingCount} reviews, ${details.rating?.toFixed(1)}★ average.` };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }

  if (actionType === "list_locations") {
    try {
      const locations = await listAccountsAndLocations(shop);
      return { ok: true, locations };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }

  if (actionType === "pick_location") {
    try {
      await connectLocation(shop, {
        accountId: form.get("accountId"),
        locationId: form.get("locationId"),
        locationName: form.get("locationName"),
      });
      return { ok: true, message: "Location connected." };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }

  if (actionType === "sync_business") {
    try {
      const { total } = await syncAllReviews(shop);
      return { ok: true, message: `Synced ${total} review(s) from Google.` };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }

  if (actionType === "connect_url") {
    const mapsUrl = String(form.get("mapsUrl") || "").trim();
    if (!mapsUrl) return { ok: false, message: "Paste a Google Maps URL first." };
    try {
      const details = await connectFromMapsUrl(shop, mapsUrl);
      return {
        ok: true,
        placeId: details.placeId,
        message: `Connected to "${details.displayName || "your business"}" — ${details.userRatingCount} reviews, ${details.rating?.toFixed(1)}★ average.`,
      };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }

  return null;
}

const FONT_OPTIONS = [
  { label: "Inherit from theme",  value: "inherit"              },
  { label: "Inter",               value: "'Inter', sans-serif"  },
  { label: "Georgia",             value: "Georgia, serif"       },
  { label: "Playfair Display",    value: "'Playfair Display', serif" },
];

function PaywallPage() {
  return (
    // <div style={{ textAlign: "center", padding: "60px 24px", maxWidth: 500, margin: "0 auto" }} className="tr-app-routes-app-widgets-google-reviews-div-1">
    //   <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: SHELL_C.accent, marginBottom: 14 }} className="tr-app-routes-app-widgets-google-reviews-div-2">Locked</div>
    //   <div style={{ fontSize: 22, fontWeight: 600, color: SHELL_C.text, marginBottom: 8 }} className="tr-app-routes-app-widgets-google-reviews-div-3">Google Reviews Widget — Advanced Plan</div>
    //   <div style={{ fontSize: 13.5, color: SHELL_C.muted, lineHeight: 1.75, marginBottom: 28 }} className="tr-app-routes-app-widgets-google-reviews-div-4">
    //     Pull your store's own Google rating and reviews (via your Google Business Profile) straight onto your storefront — 15 designs to choose from.
    //   </div>
    //   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32, textAlign: "left" }} className="tr-app-routes-app-widgets-google-reviews-div-5">
    //     {["15 widget designs", "Live Google rating & reviews", "One-click refresh", "Full color customization", "Badges, banners, carousels & more", "Works alongside your other widgets"].map((f) => (
    //       <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "#374151" }} className="tr-app-routes-app-widgets-google-reviews-div-6">
    //         <span style={{ color: "#059669", fontSize: 13, flexShrink: 0 }} className="tr-app-routes-app-widgets-google-reviews-span-7">✓</span>{f}
    //       </div>
    //     ))}
    //   </div>
    //   <Link to="/app/billing" style={{
    //     display: "inline-flex", padding: "13px 32px", borderRadius: 10, fontSize: 14, fontWeight: 600,
    //     background: SHELL_C.accent, color: "#fff", textDecoration: "none", boxShadow: "0 3px 12px rgba(81,69,229,.3)",
    //   }}>
    //     Upgrade to Advanced — $9.99/mo
    //   </Link>
    //   <div style={{ fontSize: 11.5, color: SHELL_C.muted, marginTop: 12 }} className="tr-app-routes-app-widgets-google-reviews-div-8">5-day free trial · Cancel anytime</div>
    // </div>
    <div
  style={{
    width: "100%",
    maxWidth: 620,
    margin: "0 auto",
    padding: "clamp(24px, 5vw, 42px)",
    textAlign: "center",
    background:
      "linear-gradient(145deg, #FFFFFF 0%, #F8FBFD 100%)",
    border: "1px solid #D6E6F2",
    borderRadius: 22,
    boxShadow:
      "0 16px 42px rgba(79,115,146,.08)",
    position: "relative",
    overflow: "hidden",
    fontSize: 14,
    boxSizing: "border-box",
  }}
  className="tr-app-routes-app-widgets-google-reviews-div-1 tr-google-paywall"
>
  <style>{`
    .tr-google-paywall,
    .tr-google-paywall *{
      box-sizing:border-box;
    }

    .tr-google-feature{
      transition:
        transform .16s ease,
        border-color .16s ease,
        background .16s ease,
        box-shadow .16s ease;
    }

    .tr-google-feature:hover{
      transform:translateY(-1px);
      border-color:#C3D9E8 !important;
      background:#F8FBFD !important;
      box-shadow:0 6px 16px rgba(79,115,146,.06);
    }

    .tr-google-upgrade{
      transition:
        transform .16s ease,
        box-shadow .16s ease,
        filter .16s ease;
    }

    .tr-google-upgrade:hover{
      transform:translateY(-1px);
      box-shadow:0 10px 24px rgba(79,115,146,.23) !important;
      filter:brightness(.99);
    }

    .tr-google-upgrade:active{
      transform:translateY(0);
    }

    @media(max-width:600px){
      .tr-google-paywall{
        padding:26px 18px !important;
        border-radius:18px !important;
      }

      .tr-google-feature-grid{
        grid-template-columns:1fr !important;
        gap:8px !important;
      }

      .tr-google-upgrade{
        width:100% !important;
        min-height:46px !important;
        padding:11px 16px !important;
      }

      .tr-google-paywall-title{
        font-size:22px !important;
      }
    }

    @media(max-width:380px){
      .tr-google-paywall{
        padding:22px 14px !important;
      }

      .tr-google-paywall-title{
        font-size:20px !important;
      }

      .tr-google-feature{
        padding:10px !important;
      }
    }
  `}</style>

  {/* Decorative background */}
  <div
    style={{
      position: "absolute",
      width: 210,
      height: 210,
      borderRadius: "50%",
      background: "rgba(214,230,242,.48)",
      top: -125,
      right: -75,
      pointerEvents: "none",
    }}
  />

  <div
    style={{
      position: "absolute",
      width: 130,
      height: 130,
      borderRadius: "50%",
      background: "rgba(141,180,214,.08)",
      bottom: -80,
      left: -50,
      pointerEvents: "none",
    }}
  />

  {/* Icon */}
  <div
    style={{
      width: 64,
      height: 64,
      margin: "0 auto 16px",
      borderRadius: 18,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background:
        "linear-gradient(145deg,#EDF5FA,#DDEBF4)",
      border: "1px solid #D0E1EC",
      color: "#4F7392",
      boxShadow:
        "0 9px 22px rgba(79,115,146,.09)",
      position: "relative",
      zIndex: 1,
    }}
  >
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M5 5H19V16H9L5 19V5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M12 7.3L13 9.4L15.4 9.7L13.7 11.4L14.1 13.8L12 12.7L9.9 13.8L10.3 11.4L8.6 9.7L11 9.4L12 7.3Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  </div>

  {/* Locked badge */}
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      padding: "5px 10px",
      borderRadius: 999,
      background: "#EDF5FA",
      border: "1px solid #D6E6F2",
      color: "#5F7F9A",
      fontSize: 10.5,
      fontWeight: 800,
      letterSpacing: ".055em",
      textTransform: "uppercase",
      marginBottom: 11,
      position: "relative",
      zIndex: 1,
    }}
    className="tr-app-routes-app-widgets-google-reviews-div-2"
  >
    <svg
      width="12"
      height="12"
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

    Locked
  </div>

  {/* Title */}
  <div
    style={{
      fontSize: "clamp(22px,3vw,28px)",
      fontWeight: 800,
      color: "#456984",
      marginBottom: 9,
      lineHeight: 1.2,
      letterSpacing: "-.03em",
      position: "relative",
      zIndex: 1,
    }}
    className="tr-app-routes-app-widgets-google-reviews-div-3 tr-google-paywall-title"
  >
    Google Reviews Widget — Advanced Plan
  </div>

  {/* Description */}
  <div
    style={{
      fontSize: 14,
      color: "#829CAF",
      lineHeight: 1.75,
      margin: "0 auto 24px",
      maxWidth: 520,
      position: "relative",
      zIndex: 1,
    }}
    className="tr-app-routes-app-widgets-google-reviews-div-4"
  >
    Pull your store's own Google rating and reviews (via your Google Business Profile) straight onto your storefront — 15 designs to choose from.
  </div>

  {/* Features */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0,1fr))",
      gap: 9,
      marginBottom: 26,
      textAlign: "left",
      position: "relative",
      zIndex: 1,
    }}
    className="tr-app-routes-app-widgets-google-reviews-div-5 tr-google-feature-grid"
  >
    {[
      "15 widget designs",
      "Live Google rating & reviews",
      "One-click refresh",
      "Full color customization",
      "Badges, banners, carousels & more",
      "Works alongside your other widgets",
    ].map((f) => (
      <div
        key={f}
        style={{
          display: "flex",
          gap: 9,
          alignItems: "flex-start",
          fontSize: 13,
          color: "#5F7F9A",
          lineHeight: 1.45,
          padding: "11px 12px",
          background: "#F6FAFC",
          border: "1px solid #E0EAF1",
          borderRadius: 11,
        }}
        className="tr-app-routes-app-widgets-google-reviews-div-6 tr-google-feature"
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background: "#E8F4ED",
            border: "1px solid #D1E7D9",
            color: "#4F8063",
          }}
          className="tr-app-routes-app-widgets-google-reviews-span-7"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M7 12.5L10.2 15.5L17 8.5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span
          style={{
            paddingTop: 2,
            fontWeight: 650,
          }}
        >
          {f}
        </span>
      </div>
    ))}
  </div>

  {/* CTA */}
  <Link
    to="/app/billing"
    style={{
      minHeight: 46,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "12px 24px",
      borderRadius: 11,
      fontSize: 14,
      fontWeight: 750,
      background:
        "linear-gradient(135deg,#8DB4D6 0%,#7199B8 100%)",
      color: "#FFFFFF",
      textDecoration: "none",
      boxShadow:
        "0 8px 20px rgba(79,115,146,.2)",
      position: "relative",
      zIndex: 1,
    }}
    className="tr-google-upgrade"
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 3L14.1 8.2L20 9L15.6 12.8L16.8 18.5L12 15.6L7.2 18.5L8.4 12.8L4 9L9.9 8.2L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>

    Upgrade to Advanced — $9.99/mo
  </Link>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      fontSize: 11.5,
      color: "#829CAF",
      marginTop: 11,
      lineHeight: 1.5,
      position: "relative",
      zIndex: 1,
    }}
    className="tr-app-routes-app-widgets-google-reviews-div-8"
  >
    <svg
      width="13"
      height="13"
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
        d="M8 12L10.7 14.7L16 9.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>

    5-day free trial · Cancel anytime
  </div>
</div>
  );
}

export default function GoogleReviewsWidgetPage() {
  const { isPro, widget, installUrl, businessConnection, fullReviewCount } = useLoaderData();
  const submit = useSubmit();
  const refreshFetcher = useFetcher();
  const connectFetcher = useFetcher();
  const businessFetcher = useFetcher();

  const [placeId, setPlaceId] = useState(widget.placeId || "");
  const [mapsUrl, setMapsUrl] = useState("");
  const [style, setStyle] = useState(widget.style || "minimal_badge");
  const [accentColor, setAccentColor] = useState(widget.accentColor || "#1a1a1a");
  const [starColor, setStarColor] = useState(widget.starColor || "#FBBC05");
  const [backgroundColor, setBackgroundColor] = useState(widget.backgroundColor || "#FFFFFF");
  const [textColor, setTextColor] = useState(widget.textColor || "#1c1b1a");

  const [fontFamily, setFontFamily] = useState(widget.fontFamily || "inherit");
  const [fontSize, setFontSize] = useState(widget.fontSize ?? 14);
  const [headingFontSize, setHeadingFontSize] = useState(widget.headingFontSize ?? 28);
  const [starSize, setStarSize] = useState(widget.starSize ?? 14);
  const [padding, setPadding] = useState(widget.padding ?? 16);
  const [margin, setMargin] = useState(widget.margin ?? 0);
  const [gap, setGap] = useState(widget.gap ?? 12);
  const [borderRadius, setBorderRadius] = useState(widget.borderRadius ?? 10);
  const [borderColor, setBorderColor] = useState(widget.borderColor || "#E5E5E5");
  const [borderWidth, setBorderWidth] = useState(widget.borderWidth ?? 1);
  const [maxWidth, setMaxWidth] = useState(widget.maxWidth ?? 0);
  const [minHeight, setMinHeight] = useState(widget.minHeight ?? 0);
  const [showWriteReviewButton, setShowWriteReviewButton] = useState(widget.showWriteReviewButton ?? true);
  const [writeReviewButtonText, setWriteReviewButtonText] = useState(widget.writeReviewButtonText || "Write a review on Google");
  const [reviewsPerPage, setReviewsPerPage] = useState(widget.reviewsPerPage ?? 5);

  const [saved, setSaved] = useState(false);

  const refreshing = refreshFetcher.state !== "idle";
  const refreshMsg = refreshFetcher.data;
  const connecting = connectFetcher.state !== "idle";
  const connectMsg = connectFetcher.data;

  useEffect(() => {
    if (connectFetcher.data?.ok && connectFetcher.data.placeId) {
      setPlaceId(connectFetcher.data.placeId);
    }
  }, [connectFetcher.data]);

  if (!isPro) {
    return (
      <div style={{ minHeight: "100vh", background: SHELL_C.bg, fontFamily: "var(--app-font-family)" }} className="tr-app-routes-app-widgets-google-reviews-div-9">
        <PaywallPage />
      </div>
    );
  }

  const handleSave = () => {
    const fd = new FormData();
    fd.set("actionType", "save");
    fd.set("placeId", placeId);
    fd.set("style", style);
    fd.set("accentColor", accentColor);
    fd.set("starColor", starColor);
    fd.set("backgroundColor", backgroundColor);
    fd.set("textColor", textColor);
    fd.set("fontFamily", fontFamily);
    fd.set("fontSize", String(fontSize));
    fd.set("headingFontSize", String(headingFontSize));
    fd.set("starSize", String(starSize));
    fd.set("padding", String(padding));
    fd.set("margin", String(margin));
    fd.set("gap", String(gap));
    fd.set("borderRadius", String(borderRadius));
    fd.set("borderColor", borderColor);
    fd.set("borderWidth", String(borderWidth));
    fd.set("maxWidth", String(maxWidth));
    fd.set("minHeight", String(minHeight));
    fd.set("showWriteReviewButton", String(showWriteReviewButton));
    fd.set("writeReviewButtonText", writeReviewButtonText);
    fd.set("reviewsPerPage", String(reviewsPerPage));
    submit(fd, { method: "post" });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleRefresh = () => {
    const fd = new FormData();
    fd.set("actionType", "refresh");
    refreshFetcher.submit(fd, { method: "post" });
  };

  const handleConnectUrl = () => {
    const fd = new FormData();
    fd.set("actionType", "connect_url");
    fd.set("mapsUrl", mapsUrl);
    connectFetcher.submit(fd, { method: "post" });
  };

  const handleListLocations = () => {
    const fd = new FormData();
    fd.set("actionType", "list_locations");
    businessFetcher.submit(fd, { method: "post" });
  };

  const handlePickLocation = (loc) => {
    const fd = new FormData();
    fd.set("actionType", "pick_location");
    fd.set("accountId", loc.accountId);
    fd.set("locationId", loc.locationId);
    fd.set("locationName", loc.title);
    businessFetcher.submit(fd, { method: "post" });
  };

  const handleSyncBusiness = () => {
    const fd = new FormData();
    fd.set("actionType", "sync_business");
    businessFetcher.submit(fd, { method: "post" });
  };

  const businessBusy = businessFetcher.state !== "idle";
  const businessMsg = businessFetcher.data;
  const businessLocations = businessMsg?.ok && businessMsg?.locations ? businessMsg.locations : null;

  return (
    <WidgetCustomizeShell
      title="Google Reviews"
      saved={saved}
      onSave={handleSave}
      installSection={
        <InstallSection
          description="Show your store's Google rating and reviews on the storefront."
          installUrl={installUrl}
          note="Save a Place ID below, then click Refresh to pull in your rating before installing."
        />
      }
      sections={[
        {
          key: "fullsync", label: "Full review sync (all reviews)",
          content: (
            <>
              {!businessConnection?.connected ? (
                <>
                  <p style={{ fontSize: 12, color: SHELL_C.muted, lineHeight: 1.6 }} className="tr-app-routes-app-widgets-google-reviews-p-10">
                    The Place ID method above is capped at 5 reviews by Google. To pull in every review, connect your
                    Google Business Profile account — requires Google's own approval for this API, so it may not work
                    immediately.
                  </p>
                  <a
                    href="/app/google-business-connect"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block", border: "none", borderRadius: 8, padding: "8px 16px",
                      fontSize: 12.5, fontWeight: 600, background: SHELL_C.accent, color: "#fff", textDecoration: "none",
                    }}
                   className="tr-app-routes-app-widgets-google-reviews-a-11">
                    Connect Google Business Profile ↗
                  </a>
                  {businessConnection?.refreshToken && (
                    <div style={{ marginTop: 10 }} className="tr-app-routes-app-widgets-google-reviews-div-12">
                      <button
                        onClick={handleListLocations}
                        disabled={businessBusy}
                        style={{ border: `1px solid ${SHELL_C.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, background: "#fff", color: SHELL_C.text, cursor: businessBusy ? "default" : "pointer" }}
                       className="tr-app-routes-app-widgets-google-reviews-button-13">
                        {businessBusy ? "Loading…" : "Load your business locations"}
                      </button>
                      {businessLocations && (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }} className="tr-app-routes-app-widgets-google-reviews-div-14">
                          {businessLocations.map((loc) => (
                            <button
                              key={loc.locationId}
                              onClick={() => handlePickLocation(loc)}
                              disabled={businessBusy}
                              style={{ textAlign: "left", border: `1px solid ${SHELL_C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, background: "#fff", cursor: "pointer" }}
                             className="tr-app-routes-app-widgets-google-reviews-button-15">
                              {loc.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12.5, color: SHELL_C.text, marginBottom: 4 }} className="tr-app-routes-app-widgets-google-reviews-div-16">
                    ✓ Connected — <strong className="tr-app-routes-app-widgets-google-reviews-strong-17">{businessConnection.locationName}</strong>
                  </div>
                  <div style={{ fontSize: 11.5, color: SHELL_C.muted, marginBottom: 10 }} className="tr-app-routes-app-widgets-google-reviews-div-18">
                    {fullReviewCount} review(s) synced
                    {businessConnection.lastSyncedAt && ` · last synced ${new Date(businessConnection.lastSyncedAt).toLocaleString()}`}
                  </div>
                  <button
                    onClick={handleSyncBusiness}
                    disabled={businessBusy}
                    style={{ border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, background: SHELL_C.accent, color: "#fff", cursor: businessBusy ? "default" : "pointer" }}
                   className="tr-app-routes-app-widgets-google-reviews-button-19">
                    {businessBusy ? "Syncing…" : "Sync all reviews now"}
                  </button>
                </>
              )}
              {businessMsg?.message && (
                <div style={{
                  marginTop: 8, fontSize: 11.5, padding: "8px 10px", borderRadius: 8,
                  background: businessMsg.ok ? "#d1fae5" : "#fee2e2",
                  color: businessMsg.ok ? "#059669" : "#dc2626",
                }} className="tr-app-routes-app-widgets-google-reviews-div-20">
                  {businessMsg.message}
                </div>
              )}
            </>
          ),
        },
        {
          key: "place", label: "Google Place ID",
          content: (
            <>
              <TextFieldInput
                label="Google Maps URL"
                value={mapsUrl}
                onChange={setMapsUrl}
                placeholder="https://www.google.com/maps/place/..."
                helpText="Paste your business's Google Maps link — we'll detect the Place ID and fetch reviews in one step."
              />
              <div className="tr-app-routes-app-widgets-google-reviews-div-21">
                <button
                  onClick={handleConnectUrl}
                  disabled={connecting || !mapsUrl}
                  style={{
                    border: "none", borderRadius: 8, padding: "8px 16px",
                    fontSize: 12.5, fontWeight: 600, cursor: connecting || !mapsUrl ? "default" : "pointer",
                    background: SHELL_C.accent, color: "#fff", opacity: !mapsUrl ? 0.5 : 1,
                  }}
                 className="tr-app-routes-app-widgets-google-reviews-button-22">
                  {connecting ? "Detecting…" : "Detect & connect"}
                </button>
                {connectMsg && (
                  <div style={{
                    marginTop: 8, fontSize: 11.5, padding: "8px 10px", borderRadius: 8,
                    background: connectMsg.ok ? "#d1fae5" : "#fee2e2",
                    color: connectMsg.ok ? "#059669" : "#dc2626",
                  }} className="tr-app-routes-app-widgets-google-reviews-div-23">
                    {connectMsg.message}
                  </div>
                )}
              </div>
              <TextFieldInput
                label="Place ID"
                value={placeId}
                onChange={setPlaceId}
                placeholder="ChIJ..."
                helpText="Auto-filled once you detect from a Maps URL, or paste one directly from Google's Place ID Finder."
              />
              <div className="tr-app-routes-app-widgets-google-reviews-div-24">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || !placeId}
                  style={{
                    border: `1px solid ${SHELL_C.border}`, borderRadius: 8, padding: "8px 16px",
                    fontSize: 12.5, fontWeight: 600, cursor: refreshing || !placeId ? "default" : "pointer",
                    background: "#fff", color: SHELL_C.text, opacity: !placeId ? 0.5 : 1,
                  }}
                 className="tr-app-routes-app-widgets-google-reviews-button-25">
                  {refreshing ? "Refreshing…" : "Refresh reviews now"}
                </button>
                {refreshMsg && (
                  <div style={{
                    marginTop: 8, fontSize: 11.5, padding: "8px 10px", borderRadius: 8,
                    background: refreshMsg.ok ? "#d1fae5" : "#fee2e2",
                    color: refreshMsg.ok ? "#059669" : "#dc2626",
                  }} className="tr-app-routes-app-widgets-google-reviews-div-26">
                    {refreshMsg.message}
                  </div>
                )}
                {widget.lastFetchedAt && (
                  <div style={{ marginTop: 6, fontSize: 11, color: SHELL_C.muted }} className="tr-app-routes-app-widgets-google-reviews-div-27">
                    Last synced {new Date(widget.lastFetchedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </>
          ),
        },
        {
          key: "style", label: "Widget design",
          content: (
            <SelectField label="Design" value={style} onChange={setStyle} options={GOOGLE_REVIEWS_STYLE_OPTIONS} />
          ),
        },
        {
          key: "colors", label: "Colors",
          content: (
            <>
              <ColorField label="Accent Color" value={accentColor} onChange={setAccentColor} />
              <ColorField label="Star Color" value={starColor} onChange={setStarColor} />
              <ColorField label="Background" value={backgroundColor} onChange={setBackgroundColor} />
              <ColorField label="Text Color" value={textColor} onChange={setTextColor} />
              <ColorField label="Border Color" value={borderColor} onChange={setBorderColor} />
            </>
          ),
        },
        {
          key: "spacing", label: "Spacing & typography",
          content: (
            <>
              <SelectField label="Font Family" value={fontFamily} onChange={setFontFamily} options={FONT_OPTIONS} />
              <RangeField label="Font Size" value={fontSize} onChange={setFontSize} min={10} max={24} unit="px" />
              <RangeField label="Heading Font Size" value={headingFontSize} onChange={setHeadingFontSize} min={16} max={64} unit="px" />
              <RangeField label="Star Size" value={starSize} onChange={setStarSize} min={8} max={32} unit="px" />
              <RangeField label="Padding" value={padding} onChange={setPadding} min={0} max={48} unit="px" />
              <RangeField label="Outer Margin" value={margin} onChange={setMargin} min={0} max={48} unit="px" />
              <RangeField label="Gap Between Elements" value={gap} onChange={setGap} min={0} max={40} unit="px" />
              <RangeField label="Border Radius" value={borderRadius} onChange={setBorderRadius} min={0} max={40} unit="px" />
              <RangeField label="Border Width" value={borderWidth} onChange={setBorderWidth} min={0} max={6} unit="px" />
              <RangeField label="Max Width (0 = auto)" value={maxWidth} onChange={setMaxWidth} min={0} max={800} step={10} unit="px" />
              <RangeField label="Min Height (0 = auto)" value={minHeight} onChange={setMinHeight} min={0} max={400} step={10} unit="px" />
            </>
          ),
        },
        {
          key: "writereview", label: "Write a review button",
          content: (
            <>
              <ToggleField label="Show 'Write a review' button" checked={showWriteReviewButton} onChange={setShowWriteReviewButton}
                helpText="Links to Google's own review page for your business — customers write it directly on Google." />
              <TextFieldInput label="Button Text" value={writeReviewButtonText} onChange={setWriteReviewButtonText} placeholder="Write a review on Google" />
              <RangeField label="Reviews Per Page (Full Wall design)" value={reviewsPerPage} onChange={setReviewsPerPage} min={1} max={5} unit="" />
            </>
          ),
        },
      ]}
      preview={
        <GoogleReviewsPreview
          style={style}
          placeId={placeId}
          colors={{ accentColor, starColor, backgroundColor, textColor }}
          spacing={{
            fontFamily, fontSize, headingFontSize, starSize, padding, margin, gap,
            borderRadius, borderColor, borderWidth, maxWidth, minHeight,
            showWriteReviewButton, writeReviewButtonText, reviewsPerPage,
          }}
          rating={widget.cachedRating}
          reviewCount={widget.cachedReviewCount}
          reviews={widget.cachedReviews}
          displayName={widget.cachedDisplayName}
        />
      }
    />
  );
}
