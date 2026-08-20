import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import WidgetCustomizeShell, {
  InstallSection, ColorField, SelectField, RangeField, ToggleField, TextFieldInput, Field, SHELL_C,
} from "../components/WidgetCustomizeShell";
import { resolveLanguage } from "../utils/widgetTranslations.server";
import { useAdminT } from "../utils/adminTranslations";

// ─── Loader ────────────────────────────────────────────────────────────────────
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  let shopLocale = "en";
  try {
    const res2 = await admin.graphql(`{ shop { primaryLocale } }`);
    const data = await res2.json();
    shopLocale = data?.data?.shop?.primaryLocale || "en";
  } catch (e) {
    console.error("[locale fetch] failed, defaulting to en:", e.message);
  }

  const [settings, store] = await Promise.all([
    prisma.widgetSettings.findUnique({ where: { shop: session.shop } }),
    prisma.store.findUnique({ where: { shop: session.shop }, select: { language: true } }),
  ]);

  return {
    shopLocale: store?.language || resolveLanguage(shopLocale),
    settings: settings || {
      starColor: "#F59E0B", starSize: 15, countColor: "#6B7280", countFontSize: 12,
      showEmpty: false, borderRadius: 4, background: "#FFFFFF", widgetStyle: "compact",
      secondaryStat: "",
    },
  };
}

// ─── Action ────────────────────────────────────────────────────────────────────
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const body = await request.json();

  if (body.actionType === "language") {
    await prisma.store.upsert({
      where: { shop: session.shop },
      update: { language: body.language },
      create: { shop: session.shop, language: body.language },
    });
    return { success: true };
  }

  const settings = await prisma.widgetSettings.upsert({
    where: { shop: session.shop },
    update: {
      starColor: body.starColor, starSize: Number(body.starSize),
      countColor: body.countColor, countFontSize: Number(body.countFontSize),
      showEmpty: Boolean(body.showEmpty), borderRadius: Number(body.borderRadius),
      background: body.background, widgetStyle: body.widgetStyle,
      secondaryStat: body.secondaryStat || "",
    },
    create: {
      shop: session.shop,
      starColor: body.starColor || "#F59E0B", starSize: Number(body.starSize) || 15,
      countColor: body.countColor || "#6B7280", countFontSize: Number(body.countFontSize) || 12,
      showEmpty: Boolean(body.showEmpty) || false, borderRadius: Number(body.borderRadius) || 4,
      background: body.background || "#FFFFFF", widgetStyle: body.widgetStyle || "compact",
      secondaryStat: body.secondaryStat || "",
    },
  });
  return { success: true, settings };
}

const LANG_LABELS = {
  en: "English", hi: "हिंदी", es: "Español", fr: "Français",
  de: "Deutsch", it: "Italiano", pt: "Português", nl: "Nederlands",
  ar: "العربية", zh: "中文", ja: "日本語", ru: "Русский",
  tr: "Türkçe", pl: "Polski", ko: "한국어",
};
const STYLE_OPTIONS = [
  { label: "Compact  (★★★★☆ 4.7 - 13 reviews)",              value: "compact" },
  { label: "Card  (★★★★☆ 4.7  (13 reviews))",                value: "card"    },
  { label: "Pill  (★ 4.7 · 13 reviews)",                      value: "pill"    },
  { label: "Minimal  (★★★★☆ 4.7 (13))",                       value: "minimal" },
  { label: "Text  (★★★★★ 4.8 Stars From 4,225 Reviews | ...)", value: "text"    },
];

// ─── Star renderer ─────────────────────────────────────────────────────────────
function StarRow({ average, cfg }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = average >= i + 1;
        const half = !filled && average >= i + 0.5;
        return (
          <span key={i} style={{ color: filled || half ? cfg.starColor : "#D1D5DB", opacity: half ? 0.55 : 1, fontSize: cfg.starSize, lineHeight: 1 }}>★</span>
        );
      })}
    </span>
  );
}

function BadgePreview({ cfg, style, average = 4.7, count = 13 }) {
  const shared = { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "inline-flex", alignItems: "center", gap: 5 };
  if (style === "card") {
    return (
      <div style={{ ...shared, background: cfg.background, border: "1px solid #E5E7EB", borderRadius: cfg.borderRadius, padding: "6px 10px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <StarRow average={average} cfg={cfg} />
        <span style={{ fontSize: cfg.starSize - 1, fontWeight: 600, color: "#111827", marginLeft: 2 }}>{average.toFixed(1)}</span>
        <span style={{ fontSize: cfg.countFontSize, color: cfg.countColor }}>({count} reviews)</span>
      </div>
    );
  }
  if (style === "pill") {
    return (
      <div style={{ ...shared, background: cfg.starColor + "18", border: `1px solid ${cfg.starColor}55`, borderRadius: 999, padding: "4px 10px", gap: 4 }}>
        <span style={{ color: cfg.starColor, fontSize: cfg.starSize, lineHeight: 1 }}>★</span>
        <span style={{ fontSize: cfg.starSize - 1, fontWeight: 600, color: "#111827" }}>{average.toFixed(1)}</span>
        <span style={{ fontSize: cfg.countFontSize, color: cfg.countColor }}>· {count} reviews</span>
      </div>
    );
  }
  if (style === "minimal") {
    return (
      <div style={{ ...shared, gap: 3 }}>
        <StarRow average={average} cfg={cfg} />
        <span style={{ fontSize: cfg.countFontSize, color: cfg.countColor, marginLeft: 2 }}>{average.toFixed(1)} ({count})</span>
      </div>
    );
  }
  if (style === "text") {
    return (
      <div style={{ ...shared, gap: 6, flexWrap: "wrap" }}>
        <StarRow average={average} cfg={cfg} />
        <span style={{ fontSize: cfg.countFontSize + 2, fontWeight: 600, color: "#111827" }}>
          {average.toFixed(1)} Stars From {count.toLocaleString()} Reviews
          {cfg.secondaryStat ? <span style={{ color: cfg.countColor, fontWeight: 500 }}> | {cfg.secondaryStat}</span> : null}
        </span>
      </div>
    );
  }
  return (
    <div style={{ ...shared, background: cfg.background, borderRadius: cfg.borderRadius, padding: "2px 6px" }}>
      <StarRow average={average} cfg={cfg} />
      <span style={{ fontSize: cfg.starSize - 1, fontWeight: 600, color: "#111827", marginLeft: 4 }}>{average.toFixed(1)}</span>
      <span style={{ fontSize: cfg.countFontSize, color: cfg.countColor, marginLeft: 3 }}>- {count} reviews</span>
    </div>
  );
}

function ProductCardMockup({ cfg, widgetStyle }) {
  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", width: 180, background: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 12 }}>
      <div style={{ height: 120, background: "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 11 }}>Product photo</div>
      <div style={{ padding: 10 }}>
        <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 2 }}>Brand</div>
        <div style={{ fontWeight: 600, color: "#111827", marginBottom: 2, fontSize: 13 }}>Product Name</div>
        <div style={{ marginTop: 6 }}><BadgePreview cfg={cfg} style={widgetStyle} /></div>
      </div>
    </div>
  );
}

export default function WidgetSettingsPage() {
  const { settings, shopLocale } = useLoaderData();
  const fetcher = useFetcher();
  const langFetcher = useFetcher();
  const t = useAdminT();
  const [saved, setSaved] = useState(false);
  const [lang, setLang] = useState(shopLocale || "en");

  const [widgetStyle, setWidgetStyle]   = useState(settings.widgetStyle || "compact");
  const [starColor, setStarColor]       = useState(settings.starColor);
  const [starSize, setStarSize]         = useState(settings.starSize);
  const [countColor, setCountColor]     = useState(settings.countColor);
  const [countFontSize, setCountFontSize] = useState(settings.countFontSize);
  const [background, setBackground]    = useState(settings.background);
  const [borderRadius, setBorderRadius] = useState(settings.borderRadius);
  const [showEmpty, setShowEmpty]       = useState(settings.showEmpty);
  const [secondaryStat, setSecondaryStat] = useState(settings.secondaryStat || "");

  const cfg = { starColor, starSize, countColor, countFontSize, background, borderRadius, secondaryStat };

  const changeLanguage = (key) => {
    setLang(key);
    langFetcher.submit({ actionType: "language", language: key }, { method: "POST", encType: "application/json" });
  };

  const handleSave = () => {
    fetcher.submit({
      widgetStyle, starColor, starSize, countColor, countFontSize, background, borderRadius, showEmpty,
      secondaryStat,
    }, { method: "POST", encType: "application/json" });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <WidgetCustomizeShell
      title={t.settingsTitle}
      saved={saved}
      onSave={handleSave}
      installSection={
        <InstallSection
          description='This badge appears wherever you add <div data-trust-product-id="{{ product.id }}"></div> to your theme — or use the "Install Widget" button on the Reviews page to inject it automatically.'
          note='Go to the Reviews page (Home) and click "Install Widget" to add it to your theme.'
        />
      }
      sections={[
        {
          key: "style", label: t.badgeStyle, icon: "✦",
          content: (
            <>
              <SelectField
                label={t.displayStyle}
                value={widgetStyle}
                onChange={setWidgetStyle}
                options={STYLE_OPTIONS}
                helpText="Choose how the rating badge looks on product cards"
              />
              <TextFieldInput
                label={t.secondaryStat}
                value={secondaryStat}
                onChange={setSecondaryStat}
                placeholder="e.g. 1.5M+ Servings"
                helpText="Shown after a divider in the Text style. Leave empty to hide."
              />
            </>
          ),
        },
        {
          key: "stars", label: t.stars, icon: "★",
          content: (
            <>
              <ColorField label={t.starColor} value={starColor} onChange={setStarColor} />
              <RangeField label={t.starSize} value={starSize} onChange={setStarSize} min={10} max={30} unit="px" />
            </>
          ),
        },
        {
          key: "text", label: t.countText, icon: "T",
          content: (
            <>
              <ColorField label={t.countColor} value={countColor} onChange={setCountColor} />
              <RangeField label={t.countFontSize} value={countFontSize} onChange={setCountFontSize} min={10} max={20} unit="px" />
            </>
          ),
        },
        {
          key: "background", label: t.bgShape, icon: "◻",
          content: (
            <>
              <ColorField label={t.backgroundColor} value={background} onChange={setBackground} helpText="Used by Card and Compact styles" />
              <RangeField label={t.borderRadius} value={borderRadius} onChange={setBorderRadius} min={0} max={20} unit="px" />
            </>
          ),
        },
        {
          key: "behavior", label: t.options, icon: "⚙",
          content: (
            <ToggleField
              label={t.showEmpty}
              checked={showEmpty}
              onChange={setShowEmpty}
              helpText="Display the badge even when no reviews exist yet"
            />
          ),
        },
        {
          key: "language", label: t.appLanguage, icon: "L",
          content: (
            <Field label={t.adminLangHint} helpText={t.adminLangHint}>
              <div style={{ position: "relative" }}>
                <select
                  value={lang}
                  onChange={(e) => changeLanguage(e.target.value)}
                  style={{
                    width: "100%", border: `1px solid ${SHELL_C.border}`, borderRadius: 8,
                    padding: "8px 32px 8px 10px", fontSize: 12.5, background: "#fafbfc",
                    color: SHELL_C.text, appearance: "none", outline: "none", cursor: "pointer",
                  }}
                >
                  {Object.entries(LANG_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
                }}>
                  <path d="M2 3.5L5 6.5L8 3.5" stroke={SHELL_C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Field>
          ),
        },
      ]}
      preview={
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: SHELL_C.muted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 14 }}>
            All 5 styles — yours is highlighted
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            {["compact", "card", "pill", "minimal", "text"].map((s) => (
              <div
                key={s} onClick={() => setWidgetStyle(s)}
                style={{
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                  border: widgetStyle === s ? `2px solid ${starColor}` : "1px solid #E5E7EB",
                  background: widgetStyle === s ? starColor + "0A" : "#FAFAFA",
                }}
              >
                <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  {s} {widgetStyle === s && "✓"}
                </div>
                <BadgePreview cfg={cfg} style={s} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: SHELL_C.muted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>
            On a product card
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ProductCardMockup cfg={cfg} widgetStyle={widgetStyle} />
          </div>
        </div>
      }
    />
  );
}

