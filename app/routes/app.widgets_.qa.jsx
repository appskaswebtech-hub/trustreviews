import { useState } from "react";
import { Link, data, useLoaderData, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import WidgetCustomizeShell, {
  InstallSection, ColorField, SelectField, SHELL_C,
} from "../components/WidgetCustomizeShell";

const WIDGET_KEY = "questions_answers";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const settings = await db.widget.findUnique({
    where: { shop_widgetKey: { shop: session.shop, widgetKey: WIDGET_KEY } },
    select: { accentColor: true, textColor: true, fontFamily: true },
  });

  return data({
    settings: settings || { accentColor: "#1a1a1a", textColor: "#333333", fontFamily: "inherit" },
    shop: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
  });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  const payload = {
    accentColor: form.get("accentColor") || "#1a1a1a",
    textColor:   form.get("textColor")   || "#333333",
    fontFamily:  form.get("fontFamily")  || "inherit",
  };

  await db.widget.upsert({
    where:  { shop_widgetKey: { shop: session.shop, widgetKey: WIDGET_KEY } },
    create: { shop: session.shop, widgetKey: WIDGET_KEY, ...payload },
    update: payload,
  });

  return data({ ok: true, saved: true });
}

const FONT_OPTIONS = [
  { label: "Inherit from theme",  value: "inherit"              },
  { label: "Inter",               value: "'Inter', sans-serif"  },
  { label: "Georgia",             value: "Georgia, serif"       },
  { label: "Playfair Display",    value: "'Playfair Display', serif" },
];

function QaPreview({ settings }) {
  const s = settings;
  return (
    <div style={{ fontFamily: s.fontFamily === "inherit" ? undefined : s.fontFamily }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: s.textColor }}>Questions & Answers</h3>
        <button style={{ background: s.accentColor, color: "#fff", border: "none", borderRadius: 6, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "default" }}>
          Ask a question
        </button>
      </div>
      <div style={{ paddingTop: 14, borderTop: "1px solid #eee" }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: s.textColor, margin: "0 0 6px" }}>
          <span style={{ color: "#888" }}>Q: </span>Is this moisturizer suitable for sensitive skin?
        </p>
        <p style={{ fontSize: 13, color: s.textColor, margin: "0 0 6px", lineHeight: 1.5 }}>
          <span style={{ color: s.accentColor, fontWeight: 700 }}>A: </span>Yes, it's dermatologically tested and safe for sensitive skin.
        </p>
        <div style={{ fontSize: 11, color: "#999" }}>Darlene Robertson · Jun 2, 2026</div>
      </div>
    </div>
  );
}

export default function QaStylePage() {
  const { settings, shop, apiKey } = useLoaderData();
  const submit = useSubmit();

  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [textColor, setTextColor]     = useState(settings.textColor);
  const [fontFamily, setFontFamily]   = useState(settings.fontFamily);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const fd = new FormData();
    fd.set("accentColor", accentColor);
    fd.set("textColor", textColor);
    fd.set("fontFamily", fontFamily);
    submit(fd, { method: "post" });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const installUrl =
    `https://${shop}/admin/themes/current/editor` +
    `?template=product&addAppBlockId=${encodeURIComponent(apiKey)}/qa&target=newAppsSection`;

  return (
    <WidgetCustomizeShell
      title="Questions & Answers"
      saved={saved}
      onSave={handleSave}
      installSection={
        <InstallSection
          description="Let shoppers ask questions and get answers right on your product pages."
          installUrl={installUrl}
          note={
            <span>
              Need to answer pending questions?{" "}
              <Link to="/app/widgets/qa-manage" style={{ color: SHELL_C.accent, fontWeight: 700 }}>Manage questions →</Link>
            </span>
          }
        />
      }
      sections={[
        {
          key: "style", label: "Color and styling",
          content: (
            <>
              <ColorField label="Accent Color (buttons, answers)" value={accentColor} onChange={setAccentColor} />
              <ColorField label="Text Color" value={textColor} onChange={setTextColor} />
              <SelectField label="Font Family" value={fontFamily} onChange={setFontFamily} options={FONT_OPTIONS} />
            </>
          ),
        },
      ]}
      preview={<QaPreview settings={{ accentColor, textColor, fontFamily }} />}
    />
  );
}
