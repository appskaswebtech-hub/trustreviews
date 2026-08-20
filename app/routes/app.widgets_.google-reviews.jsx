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

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const plan = await db.shopPlan.findUnique({ where: { shop } });
  const isPro = (plan?.plan === "advanced" && plan?.status === "active") || false;

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
    <div style={{ textAlign: "center", padding: "60px 24px", maxWidth: 500, margin: "0 auto" }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: SHELL_C.accent, marginBottom: 14 }}>Locked</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: SHELL_C.text, marginBottom: 8 }}>Google Reviews Widget — Advanced Plan</div>
      <div style={{ fontSize: 13.5, color: SHELL_C.muted, lineHeight: 1.75, marginBottom: 28 }}>
        Pull your store's own Google rating and reviews (via your Google Business Profile) straight onto your storefront — 15 designs to choose from.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32, textAlign: "left" }}>
        {["15 widget designs", "Live Google rating & reviews", "One-click refresh", "Full color customization", "Badges, banners, carousels & more", "Works alongside your other widgets"].map((f) => (
          <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "#374151" }}>
            <span style={{ color: "#059669", fontSize: 13, flexShrink: 0 }}>✓</span>{f}
          </div>
        ))}
      </div>
      <Link to="/app/billing" style={{
        display: "inline-flex", padding: "13px 32px", borderRadius: 10, fontSize: 14, fontWeight: 600,
        background: SHELL_C.accent, color: "#fff", textDecoration: "none", boxShadow: "0 3px 12px rgba(81,69,229,.3)",
      }}>
        Upgrade to Advanced — $9.99/mo
      </Link>
      <div style={{ fontSize: 11.5, color: SHELL_C.muted, marginTop: 12 }}>5-day free trial · Cancel anytime</div>
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
      <div style={{ minHeight: "100vh", background: SHELL_C.bg, fontFamily: "'Inter','DM Sans','Segoe UI',sans-serif" }}>
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
                  <p style={{ fontSize: 12, color: SHELL_C.muted, lineHeight: 1.6 }}>
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
                  >
                    Connect Google Business Profile ↗
                  </a>
                  {businessConnection?.refreshToken && (
                    <div style={{ marginTop: 10 }}>
                      <button
                        onClick={handleListLocations}
                        disabled={businessBusy}
                        style={{ border: `1px solid ${SHELL_C.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, background: "#fff", color: SHELL_C.text, cursor: businessBusy ? "default" : "pointer" }}
                      >
                        {businessBusy ? "Loading…" : "Load your business locations"}
                      </button>
                      {businessLocations && (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                          {businessLocations.map((loc) => (
                            <button
                              key={loc.locationId}
                              onClick={() => handlePickLocation(loc)}
                              disabled={businessBusy}
                              style={{ textAlign: "left", border: `1px solid ${SHELL_C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, background: "#fff", cursor: "pointer" }}
                            >
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
                  <div style={{ fontSize: 12.5, color: SHELL_C.text, marginBottom: 4 }}>
                    ✓ Connected — <strong>{businessConnection.locationName}</strong>
                  </div>
                  <div style={{ fontSize: 11.5, color: SHELL_C.muted, marginBottom: 10 }}>
                    {fullReviewCount} review(s) synced
                    {businessConnection.lastSyncedAt && ` · last synced ${new Date(businessConnection.lastSyncedAt).toLocaleString()}`}
                  </div>
                  <button
                    onClick={handleSyncBusiness}
                    disabled={businessBusy}
                    style={{ border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, background: SHELL_C.accent, color: "#fff", cursor: businessBusy ? "default" : "pointer" }}
                  >
                    {businessBusy ? "Syncing…" : "Sync all reviews now"}
                  </button>
                </>
              )}
              {businessMsg?.message && (
                <div style={{
                  marginTop: 8, fontSize: 11.5, padding: "8px 10px", borderRadius: 8,
                  background: businessMsg.ok ? "#d1fae5" : "#fee2e2",
                  color: businessMsg.ok ? "#059669" : "#dc2626",
                }}>
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
              <div>
                <button
                  onClick={handleConnectUrl}
                  disabled={connecting || !mapsUrl}
                  style={{
                    border: "none", borderRadius: 8, padding: "8px 16px",
                    fontSize: 12.5, fontWeight: 600, cursor: connecting || !mapsUrl ? "default" : "pointer",
                    background: SHELL_C.accent, color: "#fff", opacity: !mapsUrl ? 0.5 : 1,
                  }}
                >
                  {connecting ? "Detecting…" : "Detect & connect"}
                </button>
                {connectMsg && (
                  <div style={{
                    marginTop: 8, fontSize: 11.5, padding: "8px 10px", borderRadius: 8,
                    background: connectMsg.ok ? "#d1fae5" : "#fee2e2",
                    color: connectMsg.ok ? "#059669" : "#dc2626",
                  }}>
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
              <div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || !placeId}
                  style={{
                    border: `1px solid ${SHELL_C.border}`, borderRadius: 8, padding: "8px 16px",
                    fontSize: 12.5, fontWeight: 600, cursor: refreshing || !placeId ? "default" : "pointer",
                    background: "#fff", color: SHELL_C.text, opacity: !placeId ? 0.5 : 1,
                  }}
                >
                  {refreshing ? "Refreshing…" : "Refresh reviews now"}
                </button>
                {refreshMsg && (
                  <div style={{
                    marginTop: 8, fontSize: 11.5, padding: "8px 10px", borderRadius: 8,
                    background: refreshMsg.ok ? "#d1fae5" : "#fee2e2",
                    color: refreshMsg.ok ? "#059669" : "#dc2626",
                  }}>
                    {refreshMsg.message}
                  </div>
                )}
                {widget.lastFetchedAt && (
                  <div style={{ marginTop: 6, fontSize: 11, color: SHELL_C.muted }}>
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
