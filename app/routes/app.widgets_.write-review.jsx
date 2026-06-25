import { useState } from "react";
import { data } from "react-router";
import { useLoaderData, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import WidgetCustomizeShell, {
  InstallSection, ColorField, SelectField, RangeField, ToggleField,
} from "../components/WidgetCustomizeShell";
import WriteReviewPreview from "../components/WriteReviewPreview";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const settings = await db.reviewFormSettings.findUnique({ where: { shop: session.shop } });

  return data({
    settings: settings || {
      accentColor: "#1a1a1a", fontFamily: "inherit", backgroundColor: "#FFFFFF",
      borderRadius: 3, buttonTextColor: "#FFFFFF", showWriteReview: true,
    },
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop: session.shop,
  });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  const payload = {
    accentColor:     form.get("accentColor")     || "#1a1a1a",
    fontFamily:      form.get("fontFamily")      || "inherit",
    backgroundColor: form.get("backgroundColor") || "#FFFFFF",
    borderRadius:    parseInt(form.get("borderRadius")) || 3,
    buttonTextColor: form.get("buttonTextColor") || "#FFFFFF",
    showWriteReview: form.get("showWriteReview") === "true",
  };

  await db.reviewFormSettings.upsert({
    where:  { shop: session.shop },
    create: { shop: session.shop, ...payload },
    update: payload,
  });

  return data({ ok: true, saved: true });
}

const FONT_OPTIONS = [
  { label: "Inherit from theme",  value: "inherit"              },
  { label: "Inter",               value: "'Inter', sans-serif"  },
  { label: "Playfair Display",    value: "'Playfair Display', serif" },
  { label: "Roboto",              value: "'Roboto', sans-serif" },
  { label: "Lato",                value: "'Lato', sans-serif"   },
  { label: "Montserrat",          value: "'Montserrat', sans-serif" },
  { label: "Georgia",             value: "Georgia, serif"       },
];

export default function WriteReviewCustomizePage() {
  const { settings, apiKey, shop } = useLoaderData();
  const submit = useSubmit();

  const [accentColor, setAccentColor]         = useState(settings.accentColor);
  const [fontFamily, setFontFamily]           = useState(settings.fontFamily);
  const [backgroundColor, setBackgroundColor] = useState(settings.backgroundColor);
  const [borderRadius, setBorderRadius]       = useState(settings.borderRadius);
  const [buttonTextColor, setButtonTextColor] = useState(settings.buttonTextColor);
  const [showWriteReview, setShowWriteReview] = useState(settings.showWriteReview ?? true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const fd = new FormData();
    fd.set("accentColor", accentColor);
    fd.set("fontFamily", fontFamily);
    fd.set("backgroundColor", backgroundColor);
    fd.set("borderRadius", String(borderRadius));
    fd.set("buttonTextColor", buttonTextColor);
    fd.set("showWriteReview", String(showWriteReview));
    submit(fd, { method: "post" });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const installUrl =
    `https://${shop}/admin/themes/current/editor` +
    `?template=product&addAppBlockId=${encodeURIComponent(apiKey)}/review&target=newAppsSection`;

  return (
    <WidgetCustomizeShell
      title="Write a Review"
      saved={saved}
      onSave={handleSave}
      installSection={
        <InstallSection
          description="Add the review submission form to your product pages."
          installUrl={installUrl}
        />
      }
      sections={[
        {
          key: "visibility", label: "Visibility",
          content: (
            <ToggleField
              label='Show "Write a Review" button & form on storefront'
              checked={showWriteReview}
              onChange={setShowWriteReview}
              helpText="Turning this off hides the button and form on your storefront — it doesn't remove the block, so re-enabling brings it straight back. The star rating summary and review list stay visible either way."
            />
          ),
        },
        {
          key: "style", label: "Color and styling",
          content: (
            <>
              <ColorField label="Accent Color (buttons, active star)" value={accentColor} onChange={setAccentColor} />
              <ColorField label="Button Text Color" value={buttonTextColor} onChange={setButtonTextColor} />
              <ColorField label="Form Background" value={backgroundColor} onChange={setBackgroundColor} />
              <SelectField label="Font Family" value={fontFamily} onChange={setFontFamily} options={FONT_OPTIONS} />
              <RangeField label="Button/Field Border Radius" value={borderRadius} onChange={setBorderRadius} min={0} max={20} unit="px" />
            </>
          ),
        },
      ]}
      preview={<WriteReviewPreview settings={{ accentColor, fontFamily, backgroundColor, borderRadius, buttonTextColor, showWriteReview }} />}
    />
  );
}
