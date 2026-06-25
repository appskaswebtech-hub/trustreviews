import { useState } from "react";
import { data } from "react-router";
import { useLoaderData, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import WidgetCustomizeShell, {
  InstallSection, ColorField, SelectField, RangeField, ToggleField,
} from "../components/WidgetCustomizeShell";
import ReviewListPreview from "../components/ReviewListPreview";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const settings = await db.reviewListSettings.findUnique({ where: { shop: session.shop } });

  return data({
    settings: settings || {
      listStyle: "list", cardBackground: "#FFFFFF", cardBorderColor: "#000000",
      cardTextColor: "#333333", accentColor: "#1a1a1a", reviewsPerPage: 10,
      showAllProducts: false,
    },
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: session.shop,
  });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  const payload = {
    listStyle:       form.get("listStyle")       || "list",
    cardBackground:  form.get("cardBackground")  || "#FFFFFF",
    cardBorderColor: form.get("cardBorderColor")  || "#000000",
    cardTextColor:   form.get("cardTextColor")    || "#333333",
    accentColor:     form.get("accentColor")      || "#1a1a1a",
    reviewsPerPage:  parseInt(form.get("reviewsPerPage")) || 10,
    showAllProducts: form.get("showAllProducts") === "true",
  };

  await db.reviewListSettings.upsert({
    where:  { shop: session.shop },
    create: { shop: session.shop, ...payload },
    update: payload,
  });

  return data({ ok: true, saved: true });
}

const STYLE_OPTIONS = [
  { label: "List (stacked cards with avatar)", value: "list" },
  { label: "Grid (boxed cards, side by side)",  value: "grid" },
  { label: "Compact (condensed, single line)",  value: "compact" },
  { label: "Minimal List (icon avatar, divider rows)", value: "minimal" },
];

export default function ReviewListCustomizePage() {
  const { settings, apiKey, shop } = useLoaderData();
  const submit = useSubmit();

  const [listStyle, setListStyle]             = useState(settings.listStyle);
  const [cardBackground, setCardBackground]   = useState(settings.cardBackground);
  const [cardBorderColor, setCardBorderColor] = useState(settings.cardBorderColor);
  const [cardTextColor, setCardTextColor]     = useState(settings.cardTextColor);
  const [accentColor, setAccentColor]         = useState(settings.accentColor);
  const [reviewsPerPage, setReviewsPerPage]   = useState(settings.reviewsPerPage);
  const [showAllProducts, setShowAllProducts] = useState(settings.showAllProducts || false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const fd = new FormData();
    fd.set("listStyle", listStyle);
    fd.set("cardBackground", cardBackground);
    fd.set("cardBorderColor", cardBorderColor);
    fd.set("cardTextColor", cardTextColor);
    fd.set("accentColor", accentColor);
    fd.set("reviewsPerPage", String(reviewsPerPage));
    fd.set("showAllProducts", String(showAllProducts));
    submit(fd, { method: "post" });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const installUrl =
    `https://${shop}/admin/themes/current/editor` +
    `?template=product&addAppBlockId=${encodeURIComponent(apiKey)}/review&target=newAppsSection`;

  return (
    <WidgetCustomizeShell
      title="Review List Design"
      saved={saved}
      onSave={handleSave}
      installSection={
        <InstallSection
          description="Controls the review list and cards shown below the write-review form on your product pages."
          installUrl={installUrl}
        />
      }
      sections={[
        {
          key: "layout", label: "Layout",
          content: (
            <SelectField label="Card layout" value={listStyle} onChange={setListStyle} options={STYLE_OPTIONS} />
          ),
        },
        {
          key: "style", label: "Color and styling",
          content: (
            <>
              <ColorField label="Card Background" value={cardBackground} onChange={setCardBackground} />
              <ColorField label="Card Border Color" value={cardBorderColor} onChange={setCardBorderColor} />
              <ColorField label="Card Text Color" value={cardTextColor} onChange={setCardTextColor} />
              <ColorField label="Accent Color (stars, avatar, links)" value={accentColor} onChange={setAccentColor} />
            </>
          ),
        },
        {
          key: "pagination", label: "Pagination",
          content: (
            <RangeField label="Reviews per page" value={reviewsPerPage} onChange={setReviewsPerPage} min={5} max={20} unit="" />
          ),
        },
        {
          key: "scope", label: "Display scope",
          content: (
            <ToggleField
              label="Show reviews from all products"
              checked={showAllProducts}
              onChange={setShowAllProducts}
              helpText="When on, this list shows every approved review in your store, not just reviews for the current product. Useful while you're still building up reviews. Only affects this Review List widget — the star rating badge, AI summary, and other widgets keep showing per-product data."
            />
          ),
        },
      ]}
      preview={
        <ReviewListPreview
          listStyle={listStyle}
          settings={{ cardBackground, cardBorderColor, cardTextColor, accentColor, reviewsPerPage, showAllProducts }}
        />
      }
    />
  );
}
