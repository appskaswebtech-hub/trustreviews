// app/routes/app.widgets_.$key.jsx
// Shared customizer for every "display a styled collection of reviews" gallery card.

import { useState } from "react";
import { data, redirect } from "react-router";
import { useLoaderData, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import WidgetCustomizeShell, {
  InstallSection, ColorField, SelectField, RangeField, TextFieldInput, ToggleField, SHELL_C,
} from "../components/WidgetCustomizeShell";
import ReviewWidgetPreview from "../components/ReviewWidgetPreview";

// ── Per-card defaults ─────────────────────────────────────────────────────────
const KEY_DEFAULTS = {
  review_widget:         { label: "Review Widget",         defaultStyle: "dark_grid",       contentFilter: "all",   blockHandle: "reviews-widget" },
  cards_carousel:        { label: "Cards Carousel",        defaultStyle: "slider",          contentFilter: "all",   blockHandle: "reviews-widget" },
  single_review:         { label: "Single Review",         defaultStyle: "slider",          contentFilter: "all",   blockHandle: "reviews-widget", columns: 1 },
  testimonial_carousel:  { label: "Testimonial Carousel",  defaultStyle: "editorial",       contentFilter: "all",   blockHandle: "reviews-widget" },
  videos_carousel:       { label: "Videos Carousel",       defaultStyle: "scroll_strip",    contentFilter: "video", blockHandle: "reviews-widget" },
  popup_reviews:         { label: "Pop-up Reviews",        defaultStyle: "popup",           contentFilter: "all",   blockHandle: "reviews-widget" },
  reviews_grid:          { label: "Reviews Grid",          defaultStyle: "minimal_grid",    contentFilter: "all",   blockHandle: "reviews-widget" },
  happy_customers:       { label: "Happy Customers widget",defaultStyle: "badge_strip",     contentFilter: "photo", blockHandle: "reviews-widget" },
  review_snippets:       { label: "Review Snippets",       defaultStyle: "snippet_rotator", contentFilter: "all",   blockHandle: "reviews-widget" },
  summary_list:          { label: "Summary + List",         defaultStyle: "summary_side",    contentFilter: "all",   blockHandle: "reviews-widget" },
  classic_list:          { label: "Classic Reviews List",  defaultStyle: "classic_list",    contentFilter: "all",   blockHandle: "reviews-widget" },
  floating_reviews_tab:  { label: "Floating Reviews Tab",  defaultStyle: "floating_tab",    contentFilter: "all",   blockHandle: "reviews-widget" },
  trust_medals:          { label: "Trust Medals",          defaultStyle: "trust_medals",    contentFilter: "all",   blockHandle: "trust-medals" },
  verified_counter:      { label: "Verified Reviews Counter", defaultStyle: "verified_counter", contentFilter: "all", blockHandle: "verified-counter" },
  all_reviews_counter:   { label: "All Reviews Counter",   defaultStyle: "all_reviews_counter", contentFilter: "all", blockHandle: "all-reviews-counter" },
};

function defaultsFor(key) {
  return KEY_DEFAULTS[key] || { label: "Widget", defaultStyle: "dark_grid", contentFilter: "all", blockHandle: "reviews-widget" };
}

// ── Loader ────────────────────────────────────────────────────────────────────
export async function loader({ request, params }) {
  const { session } = await authenticate.admin(request);
  const key = params.key;

  if (!KEY_DEFAULTS[key]) throw redirect("/app/widgets");

  let settings = await db.widget.findUnique({
    where: { shop_widgetKey: { shop: session.shop, widgetKey: key } },
  });

  if (!settings) {
    const d = defaultsFor(key);
    settings = await db.widget.create({
      data: {
        shop: session.shop, widgetKey: key,
        defaultStyle: d.defaultStyle, contentFilter: d.contentFilter,
        ...(d.columns ? { columns: d.columns } : {}),
      },
    });
  }

  return data({ settings, key, shop: session.shop, apiKey: process.env.SHOPIFY_API_KEY || "" });
}

// ── Action ────────────────────────────────────────────────────────────────────
export async function action({ request, params }) {
  const { session } = await authenticate.admin(request);
  const key = params.key;
  if (!KEY_DEFAULTS[key]) throw redirect("/app/widgets");

  const form = await request.formData();

  const payload = {
    defaultStyle:    form.get("defaultStyle"),
    accentColor:     form.get("accentColor"),
    starColor:          form.get("starColor") || "#F59E0B",
    starGap:            parseInt(form.get("starGap")) || 2,
    textAlign:          form.get("textAlign") || "left",
    summaryPosition:    form.get("summaryPosition") || "left",
    showWriteReviewBtn: form.get("showWriteReviewBtn") === "true",
    heading:         form.get("heading"),
    contentFilter:   form.get("contentFilter") || "all",

    fontFamily:      form.get("fontFamily"),
    headingSize:     parseInt(form.get("headingSize"))  || 32,
    reviewSize:      parseInt(form.get("reviewSize"))   || 16,
    metaSize:        parseInt(form.get("metaSize"))     || 13,

    backgroundColor: form.get("backgroundColor"),
    cardBackground:  form.get("cardBackground"),
    textColor:       form.get("textColor"),
    borderColor:     form.get("borderColor"),

    showVerified:    form.get("showVerified")  === "true",
    showAvatar:      form.get("showAvatar")    === "true",
    showDate:        form.get("showDate")      === "true",

    maxReviews:      parseInt(form.get("maxReviews"))   || 6,
    columns:         parseInt(form.get("columns"))      || 3,
    tabletColumns:   parseInt(form.get("tabletColumns"))|| 2,
    mobileColumns:   parseInt(form.get("mobileColumns"))|| 1,

    paddingTop:      parseInt(form.get("paddingTop"))   || 40,
    paddingBottom:   parseInt(form.get("paddingBottom"))|| 40,
    cardPadding:     parseInt(form.get("cardPadding"))  || 16,
    cardGap:         parseInt(form.get("cardGap"))      || 16,

    borderRadius:    parseInt(form.get("borderRadius")) || 10,
    showShadow:      form.get("showShadow")    === "true",

    autoplay:        form.get("autoplay")      === "true",
    autoplaySpeed:   parseInt(form.get("autoplaySpeed"))|| 3000,
    showArrows:      form.get("showArrows")    === "true",
    showDots:        form.get("showDots")      === "true",

    popupEnabled:    form.get("popupEnabled")  === "true",
    popupDelay:      parseInt(form.get("popupDelay"))   || 5000,
  };

  await db.widget.upsert({
    where:  { shop_widgetKey: { shop: session.shop, widgetKey: key } },
    create: { shop: session.shop, widgetKey: key, ...payload },
    update: payload,
  });

  return data({ ok: true, saved: true });
}

const STYLE_OPTIONS = [
  { label: "Dark Grid",             value: "dark_grid"    },
  { label: "Minimal Grid",          value: "minimal_grid" },
  { label: "Slider",                value: "slider"       },
  { label: "Star Summary + Grid",   value: "star_summary" },
  { label: "Accent Wall",           value: "accent_wall"  },
  { label: "Review List",           value: "list_view"    },
  { label: "Editorial / Magazine",  value: "editorial"    },
  { label: "Horizontal Scroll",     value: "scroll_strip" },
  { label: "Popup Widget",          value: "popup"        },
  { label: "Badge Strip",           value: "badge_strip"  },
  { label: "Quote Fade",            value: "quote_fade"   },
  { label: "Masonry Wall",          value: "masonry_wall" },
  { label: "Classic List",          value: "classic_list"  },
  { label: "Summary + List",        value: "summary_side"  },
  { label: "Snippet Rotator",       value: "snippet_rotator" },
  { label: "Floating Tab",          value: "floating_tab" },
  { label: "Trust Medals",          value: "trust_medals" },
  { label: "Verified Counter",      value: "verified_counter" },
  { label: "All Reviews Counter",   value: "all_reviews_counter" },
];

const FONT_OPTIONS = [
  { label: "Inherit from theme",  value: "inherit"              },
  { label: "Inter",               value: "'Inter', sans-serif"  },
  { label: "Playfair Display",    value: "'Playfair Display', serif" },
  { label: "Roboto",              value: "'Roboto', sans-serif" },
  { label: "Lato",                value: "'Lato', sans-serif"   },
  { label: "Montserrat",          value: "'Montserrat', sans-serif" },
  { label: "Georgia",             value: "Georgia, serif"       },
];

const CONTENT_FILTER_OPTIONS = [
  { label: "All reviews",          value: "all"   },
  { label: "Only reviews w/ video", value: "video" },
  { label: "Only reviews w/ photo", value: "photo" },
];

const COL_OPTIONS = [
  { label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }, { label: "4", value: "4" },
];

export default function WidgetCustomizePage() {
  const { settings, key, shop, apiKey } = useLoaderData();
  const submit = useSubmit();
  const meta = defaultsFor(key);

  const [style, setStyle]               = useState(settings.defaultStyle ?? "dark_grid");
  const [accentColor, setAccentColor]   = useState(settings.accentColor ?? "#6B1A2C");
  const [starColor, setStarColor]           = useState(settings.starColor ?? "#F59E0B");
  const [starGap, setStarGap]               = useState(settings.starGap ?? 2);
  const [textAlign, setTextAlign]           = useState(settings.textAlign ?? "left");
  const [summaryPosition, setSummaryPosition] = useState(settings.summaryPosition ?? "left");
  const [showWriteReviewBtn, setShowWriteReviewBtn] = useState(settings.showWriteReviewBtn ?? false);
  const [heading, setHeading]           = useState(settings.heading ?? "");
  const [contentFilter, setContentFilter] = useState(settings.contentFilter ?? "all");

  const [fontFamily, setFontFamily]     = useState(settings.fontFamily ?? "inherit");
  const [headingSize, setHeadingSize]   = useState(settings.headingSize ?? 32);
  const [reviewSize, setReviewSize]     = useState(settings.reviewSize ?? 16);
  const [metaSize, setMetaSize]         = useState(settings.metaSize ?? 13);

  const [bgColor, setBgColor]       = useState(settings.backgroundColor ?? "#FFFFFF");
  const [cardBg, setCardBg]         = useState(settings.cardBackground ?? "#FFFFFF");
  const [textColor, setTextColor]   = useState(settings.textColor ?? "#333333");
  const [borderCol, setBorderCol]   = useState(settings.borderColor ?? "#E5E5E5");

  const [verified, setVerified] = useState(settings.showVerified ?? true);
  const [avatar, setAvatar]     = useState(settings.showAvatar ?? true);
  const [date, setDate]         = useState(settings.showDate ?? true);
  const [shadow, setShadow]     = useState(settings.showShadow ?? true);

  const [maxRev, setMaxRev]   = useState(settings.maxReviews ?? 6);
  const [columns, setColumns] = useState(String(settings.columns ?? 3));

  const [paddingTop, setPaddingTop]       = useState(settings.paddingTop ?? 40);
  const [paddingBottom, setPaddingBottom] = useState(settings.paddingBottom ?? 40);
  const [cardPadding, setCardPadding]     = useState(settings.cardPadding ?? 16);
  const [cardGap, setCardGap]             = useState(settings.cardGap ?? 16);
  const [borderRadius, setBorderRadius]   = useState(settings.borderRadius ?? 10);

  const [autoplay, setAutoplay]           = useState(settings.autoplay ?? true);
  const [showArrows, setShowArrows]       = useState(settings.showArrows ?? true);
  const [showDots, setShowDots]           = useState(settings.showDots ?? true);
  const [popupEnabled, setPopupEnabled]   = useState(settings.popupEnabled ?? false);

  const [saved, setSaved] = useState(false);

  const isSlider       = ["slider", "scroll_strip", "quote_fade"].includes(style);
  const isPopup        = style === "popup";
  const isClassicList  = style === "classic_list";
  const isSummarySide  = style === "summary_side";

  const handleSave = () => {
    const fd = new FormData();
    fd.set("defaultStyle", style);
    fd.set("accentColor", accentColor);
    fd.set("starColor", starColor);
    fd.set("starGap", String(starGap));
    fd.set("textAlign", textAlign);
    fd.set("summaryPosition", summaryPosition);
    fd.set("showWriteReviewBtn", String(showWriteReviewBtn));
    fd.set("heading", heading);
    fd.set("contentFilter", contentFilter);
    fd.set("fontFamily", fontFamily);
    fd.set("headingSize", String(headingSize));
    fd.set("reviewSize", String(reviewSize));
    fd.set("metaSize", String(metaSize));
    fd.set("backgroundColor", bgColor);
    fd.set("cardBackground", cardBg);
    fd.set("textColor", textColor);
    fd.set("borderColor", borderCol);
    fd.set("showVerified", String(verified));
    fd.set("showAvatar", String(avatar));
    fd.set("showDate", String(date));
    fd.set("showShadow", String(shadow));
    fd.set("maxReviews", String(maxRev));
    fd.set("columns", columns);
    fd.set("tabletColumns", "2");
    fd.set("mobileColumns", "1");
    fd.set("paddingTop", String(paddingTop));
    fd.set("paddingBottom", String(paddingBottom));
    fd.set("cardPadding", String(cardPadding));
    fd.set("cardGap", String(cardGap));
    fd.set("borderRadius", String(borderRadius));
    fd.set("autoplay", String(autoplay));
    fd.set("autoplaySpeed", "3000");
    fd.set("showArrows", String(showArrows));
    fd.set("showDots", String(showDots));
    fd.set("popupEnabled", String(popupEnabled));
    fd.set("popupDelay", "5000");
    submit(fd, { method: "post" });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const previewSettings = {
    accentColor, starColor, starGap, textAlign, summaryPosition, showWriteReviewBtn,
    backgroundColor: bgColor, cardBackground: cardBg, textColor, borderColor: borderCol,
    fontFamily, headingSize, reviewSize, metaSize,
    showVerified: verified, showAvatar: avatar, showDate: date, showShadow: shadow,
    maxReviews: maxRev, columns: Number(columns),
    paddingTop, paddingBottom, cardPadding, cardGap, borderRadius,
  };

  const installUrl =
    `https://${shop}/admin/themes/current/editor` +
    `?template=product&addAppBlockId=${encodeURIComponent(apiKey)}/${encodeURIComponent(meta.blockHandle)}` +
    `&target=newAppsSection`;

  return (
    <WidgetCustomizeShell
      title={meta.label}
      saved={saved}
      onSave={handleSave}
      installSection={
        <InstallSection
          description={`Add the ${meta.label} block to your product pages.`}
          installUrl={installUrl}
          note={meta.blockHandle === "reviews-widget"
            ? `After adding the block in Theme Editor, choose "${meta.label}" from its "Saved widget" setting so it uses this style.`
            : null}
        />
      }
      sections={[
        {
          key: "style", label: "Color and styling",
          content: (
            <>
              <SelectField label="Widget Design" value={style} onChange={setStyle} options={STYLE_OPTIONS} />
              <ColorField label="Accent Color" value={accentColor} onChange={setAccentColor} />
              <ColorField label="Star Color" value={starColor} onChange={setStarColor} />
              <RangeField label="Gap Between Stars" value={starGap} onChange={setStarGap} min={0} max={12} step={1} unit="px" />
              <ColorField label="Widget Background" value={bgColor} onChange={setBgColor} />
              <ColorField label="Card Background" value={cardBg} onChange={setCardBg} />
              <ColorField label="Text Color" value={textColor} onChange={setTextColor} />
              <ColorField label="Border Color" value={borderCol} onChange={setBorderCol} />
              <SelectField label="Font Family" value={fontFamily} onChange={setFontFamily} options={FONT_OPTIONS} />
            </>
          ),
        },
        {
          key: "text", label: "Text",
          content: (
            <TextFieldInput label="Section Heading" value={heading} onChange={setHeading} placeholder="What our customers say" />
          ),
        },
        {
          key: "header", label: "Widget header",
          content: (
            <>
              <RangeField label="Heading Size" value={headingSize} onChange={setHeadingSize} min={18} max={56} unit="px" />
              <RangeField label="Review Text Size" value={reviewSize} onChange={setReviewSize} min={12} max={24} unit="px" />
              <RangeField label="Meta / Name Size" value={metaSize} onChange={setMetaSize} min={10} max={20} unit="px" />
            </>
          ),
        },
        {
          key: "reviews", label: "Reviews section",
          content: (
            <>
              <SelectField label="Reviews to include" value={contentFilter} onChange={setContentFilter} options={CONTENT_FILTER_OPTIONS} />
              <RangeField label="Max Reviews to Show" value={maxRev} onChange={setMaxRev} min={2} max={20} />
              <SelectField label="Desktop Columns" value={columns} onChange={setColumns} options={COL_OPTIONS} />
              <ToggleField label="Show verified badge" checked={verified} onChange={setVerified} />
              <ToggleField label="Show reviewer avatar" checked={avatar} onChange={setAvatar} />
              <ToggleField label="Show review date" checked={date} onChange={setDate} />
            </>
          ),
        },
        ...(isSummarySide ? [{
          key: "summarylayout", label: "Summary Layout",
          content: (
            <>
              <SelectField
                label="Summary Panel Position"
                value={summaryPosition}
                onChange={setSummaryPosition}
                options={[
                  { label: "Left  — summary beside reviews",   value: "left"   },
                  { label: "Right — summary beside reviews",   value: "right"  },
                  { label: "Top   — summary above reviews",    value: "top"    },
                  { label: "Bottom — summary below reviews",   value: "bottom" },
                ]}
              />
              <ColorField label="Star Color"   value={starColor} onChange={setStarColor} />
              <RangeField label="Gap Between Stars" value={starGap} onChange={setStarGap} min={0} max={12} step={1} unit="px" />
              <RangeField label="Review Text Size" value={reviewSize} onChange={setReviewSize} min={12} max={24} unit="px" />
              <RangeField label="Max Reviews Shown" value={maxRev} onChange={setMaxRev} min={2} max={20} />
              <ToggleField label="Show 'Write a Review' button" checked={showWriteReviewBtn} onChange={setShowWriteReviewBtn}
                helpText="Adds a button that scrolls to the write-review form on the same page" />
              <ToggleField label="Show verified badge"  checked={verified} onChange={setVerified} />
              <ToggleField label="Show reviewer avatar" checked={avatar}   onChange={setAvatar} />
              <ToggleField label="Show review date"     checked={date}     onChange={setDate} />
              <RangeField label="Section Top Padding"    value={paddingTop}    onChange={setPaddingTop}    min={0} max={120} step={4} unit="px" />
              <RangeField label="Section Bottom Padding" value={paddingBottom} onChange={setPaddingBottom} min={0} max={120} step={4} unit="px" />
            </>
          ),
        }] : []),
        ...(isClassicList ? [{
          key: "classiclist", label: "Classic List Options",
          content: (
            <>
              <SelectField
                label="Text Alignment"
                value={textAlign}
                onChange={setTextAlign}
                options={[
                  { label: "Left",   value: "left"   },
                  { label: "Center", value: "center" },
                  { label: "Right",  value: "right"  },
                ]}
              />
              <RangeField label="Review Font Size"  value={reviewSize}    onChange={setReviewSize}    min={12} max={24} unit="px" />
              <RangeField label="Name / Meta Size"  value={metaSize}      onChange={setMetaSize}      min={10} max={20} unit="px" />
              <RangeField label="Reviews per Page"  value={maxRev}        onChange={setMaxRev}        min={2}  max={20} />
              <RangeField label="Row Spacing"       value={cardGap}       onChange={setCardGap}       min={0}  max={48} step={4} unit="px" />
              <RangeField label="Section Top Padding"    value={paddingTop}    onChange={setPaddingTop}    min={0} max={120} step={4} unit="px" />
              <RangeField label="Section Bottom Padding" value={paddingBottom} onChange={setPaddingBottom} min={0} max={120} step={4} unit="px" />
              <ToggleField label="Show verified badge"  checked={verified} onChange={setVerified} />
              <ToggleField label="Show reviewer avatar" checked={avatar}   onChange={setAvatar} />
              <ToggleField label="Show review date"     checked={date}     onChange={setDate} />
            </>
          ),
        }] : []),
        {
          key: "advanced", label: "Advanced",
          content: (
            <>
              <RangeField label="Section Padding Top" value={paddingTop} onChange={setPaddingTop} min={0} max={120} step={4} unit="px" />
              <RangeField label="Section Padding Bottom" value={paddingBottom} onChange={setPaddingBottom} min={0} max={120} step={4} unit="px" />
              <RangeField label="Card Padding" value={cardPadding} onChange={setCardPadding} min={8} max={48} step={4} unit="px" />
              <RangeField label="Card Gap" value={cardGap} onChange={setCardGap} min={4} max={48} step={4} unit="px" />
              <RangeField label="Card Border Radius" value={borderRadius} onChange={setBorderRadius} min={0} max={32} step={2} unit="px" />
              <ToggleField label="Show card shadow" checked={shadow} onChange={setShadow} />
              {isSlider && (
                <>
                  <ToggleField label="Autoplay slides" checked={autoplay} onChange={setAutoplay} />
                  <ToggleField label="Show prev/next arrows" checked={showArrows} onChange={setShowArrows} />
                  <ToggleField label="Show dot indicators" checked={showDots} onChange={setShowDots} />
                </>
              )}
              {isPopup && (
                <ToggleField label="Enable popup widget" checked={popupEnabled} onChange={setPopupEnabled} helpText="A floating button + modal that shows reviews on click" />
              )}
            </>
          ),
        },
      ]}
      preview={<ReviewWidgetPreview style={style} settings={previewSettings} heading={heading || "What our customers say"} />}
    />
  );
}
