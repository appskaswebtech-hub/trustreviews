import { useState } from "react";
import { useFetcher } from "react-router";
import WidgetCustomizeShell, {
  InstallSection, ColorField, SelectField, RangeField, ToggleField, TextFieldInput, SHELL_C,
} from "./WidgetCustomizeShell";
import { useAdminT } from "../utils/adminTranslations";

// Star Rating Badge settings — shown as the "Settings" tab on the Custom Code
// page (app.custom-code.jsx), which also handles the save action.
export const DEFAULT_BADGE_SETTINGS = {
  starColor: "#F59E0B", starSize: 15, countColor: "#6B7280", countFontSize: 12,
  showEmpty: false, borderRadius: 4, background: "#FFFFFF", widgetStyle: "compact",
  secondaryStat: "",
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }} className="tr-app-routes-app-widget-settings-span-1">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = average >= i + 1;
        const half = !filled && average >= i + 0.5;
        return (
          <span key={i} style={{ color: filled || half ? cfg.starColor : "#D1D5DB", opacity: half ? 0.55 : 1, fontSize: cfg.starSize, lineHeight: 1 }} className="tr-app-routes-app-widget-settings-span-2">★</span>
        );
      })}
    </span>
  );
}

function BadgePreview({ cfg, style, average = 4.7, count = 13 }) {
  const shared = { fontFamily: "var(--app-font-family)", display: "inline-flex", alignItems: "center", gap: 5 };
  if (style === "card") {
    return (
      <div style={{ ...shared, background: cfg.background, border: "1px solid #E5E7EB", borderRadius: cfg.borderRadius, padding: "6px 10px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }} className="tr-app-routes-app-widget-settings-div-3">
        <StarRow average={average} cfg={cfg} />
        <span style={{ fontSize: cfg.starSize - 1, fontWeight: 600, color: "#111827", marginLeft: 2 }} className="tr-app-routes-app-widget-settings-span-4">{average.toFixed(1)}</span>
        <span style={{ fontSize: cfg.countFontSize, color: cfg.countColor }} className="tr-app-routes-app-widget-settings-span-5">({count} reviews)</span>
      </div>
    );
  }
  if (style === "pill") {
    return (
      <div style={{ ...shared, background: cfg.starColor + "18", border: `1px solid ${cfg.starColor}55`, borderRadius: 999, padding: "4px 10px", gap: 4 }} className="tr-app-routes-app-widget-settings-div-6">
        <span style={{ color: cfg.starColor, fontSize: cfg.starSize, lineHeight: 1 }} className="tr-app-routes-app-widget-settings-span-7">★</span>
        <span style={{ fontSize: cfg.starSize - 1, fontWeight: 600, color: "#111827" }} className="tr-app-routes-app-widget-settings-span-8">{average.toFixed(1)}</span>
        <span style={{ fontSize: cfg.countFontSize, color: cfg.countColor }} className="tr-app-routes-app-widget-settings-span-9">· {count} reviews</span>
      </div>
    );
  }
  if (style === "minimal") {
    return (
      <div style={{ ...shared, gap: 3 }} className="tr-app-routes-app-widget-settings-div-10">
        <StarRow average={average} cfg={cfg} />
        <span style={{ fontSize: cfg.countFontSize, color: cfg.countColor, marginLeft: 2 }} className="tr-app-routes-app-widget-settings-span-11">{average.toFixed(1)} ({count})</span>
      </div>
    );
  }
  if (style === "text") {
    return (
      <div style={{ ...shared, gap: 6, flexWrap: "wrap" }} className="tr-app-routes-app-widget-settings-div-12">
        <StarRow average={average} cfg={cfg} />
        <span style={{ fontSize: cfg.countFontSize + 2, fontWeight: 600, color: "#111827" }} className="tr-app-routes-app-widget-settings-span-13">
          {average.toFixed(1)} Stars From {count.toLocaleString()} Reviews
          {cfg.secondaryStat ? <span style={{ color: cfg.countColor, fontWeight: 500 }} className="tr-app-routes-app-widget-settings-span-14"> | {cfg.secondaryStat}</span> : null}
        </span>
      </div>
    );
  }
  return (
    <div style={{ ...shared, background: cfg.background, borderRadius: cfg.borderRadius, padding: "2px 6px" }} className="tr-app-routes-app-widget-settings-div-15">
      <StarRow average={average} cfg={cfg} />
      <span style={{ fontSize: cfg.starSize - 1, fontWeight: 600, color: "#111827", marginLeft: 4 }} className="tr-app-routes-app-widget-settings-span-16">{average.toFixed(1)}</span>
      <span style={{ fontSize: cfg.countFontSize, color: cfg.countColor, marginLeft: 3 }} className="tr-app-routes-app-widget-settings-span-17">- {count} reviews</span>
    </div>
  );
}

function ProductCardMockup({ cfg, widgetStyle }) {
  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", width: 240, background: "#fff", fontFamily: "var(--app-font-family)", fontSize: 12 }} className="tr-app-routes-app-widget-settings-div-18">
      <div style={{ height: 120, background: "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 11 }} className="tr-app-routes-app-widget-settings-div-19">Product photo</div>
      <div style={{ padding: 10 }} className="tr-app-routes-app-widget-settings-div-20">
        <div style={{ color: "#6B7280", fontSize: 10, marginBottom: 2 }} className="tr-app-routes-app-widget-settings-div-21">Brand</div>
        <div style={{ fontWeight: 600, color: "#111827", marginBottom: 2, fontSize: 13 }} className="tr-app-routes-app-widget-settings-div-22">Product Name</div>
        <div style={{ marginTop: 6 }} className="tr-app-routes-app-widget-settings-div-23"><BadgePreview cfg={cfg} style={widgetStyle} /></div>
      </div>
    </div>
  );
}

export default function StarBadgeSettings({ settings }) {
  const fetcher = useFetcher();
  const t = useAdminT();
  const [saved, setSaved] = useState(false);

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

  const handleSave = () => {
    fetcher.submit({
      actionType: "badge-settings",
      widgetStyle, starColor, starSize, countColor, countFontSize, background, borderRadius, showEmpty,
      secondaryStat,
    }, { method: "POST", encType: "application/json" });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 22, fontWeight: 750, color: "#4F7392", margin: 0, letterSpacing: "-.02em" }}>
          {t.settingsTitle}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saved && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700,
              color: "#4F7392", background: "#D6E6F2", padding: "5px 11px", borderRadius: 20,
              border: "1px solid rgba(141,180,214,.45)",
            }}>
              ✓ Saved
            </span>
          )}
          <button
            onClick={handleSave}
            style={{
              border: "none", borderRadius: 9, padding: "9px 18px",
              background: "linear-gradient(135deg,#8DB4D6,#6F96B6)", color: "#fff",
              fontWeight: 700, fontSize: 12.5, cursor: "pointer",
              boxShadow: "0 6px 16px rgba(79,115,146,.17)",
            }}
          >
            Save Changes
          </button>
        </div>
      </div>

      <WidgetCustomizeShell
        embedded
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
        ]}
        preview={
          <div className="tr-app-routes-app-widget-settings-div-29">
            <div style={{ fontSize: 14, fontWeight: 600, color: SHELL_C.muted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 14 }} className="tr-app-routes-app-widget-settings-div-30">
              All 5 styles — yours is highlighted
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }} className="tr-app-routes-app-widget-settings-div-31">
              {["compact", "card", "pill", "minimal", "text"].map((s) => (
                <div
                  key={s} onClick={() => setWidgetStyle(s)}
                  style={{
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    border: widgetStyle === s ? `2px solid ${starColor}` : "1px solid #E5E7EB",
                    background: widgetStyle === s ? starColor + "0A" : "#FAFAFA",
                  }}
                 className="tr-app-routes-app-widget-settings-div-32">
                  <div style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }} className="tr-app-routes-app-widget-settings-div-33">
                    {s} {widgetStyle === s && "✓"}
                  </div>
                  <BadgePreview cfg={cfg} style={s} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: SHELL_C.muted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }} className="tr-app-routes-app-widget-settings-div-34">
              On a product card
            </div>
            <div style={{ display: "flex", justifyContent: "center" }} className="tr-app-routes-app-widget-settings-div-35">
              <ProductCardMockup cfg={cfg} widgetStyle={widgetStyle} />
            </div>
          </div>
        }
      />
    </div>
  );
}
