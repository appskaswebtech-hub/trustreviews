import { useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { SHELL_C } from "../components/WidgetCustomizeShell";
import { useAdminT } from "../utils/adminTranslations";

// ─── Loader ────────────────────────────────────────────────────────────────────
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const [store, customCode] = await Promise.all([
    prisma.store.findUnique({ where: { shop: session.shop }, select: { language: true } }),
    prisma.storeCustomCode.findUnique({ where: { shop: session.shop } }),
  ]);

  return {
    shop: session.shop,
    lang: store?.language || "en",
    customCss: customCode?.customCss || "",
    customJs:  customCode?.customJs  || "",
  };
}

// ─── Action ────────────────────────────────────────────────────────────────────
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const body = await request.json();

  if (body.actionType === "language") {
    await prisma.store.upsert({
      where:  { shop: session.shop },
      update: { language: body.language },
      create: { shop: session.shop, language: body.language },
    });
    return { success: true };
  }

  if (body.actionType === "custom-code") {
    await prisma.storeCustomCode.upsert({
      where:  { shop: session.shop },
      update: { customCss: body.css, customJs: body.js },
      create: { shop: session.shop, customCss: body.css, customJs: body.js },
    });
    return { success: true };
  }

  return { success: false };
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const LANG_LABELS = {
  en: "English",  hi: "हिंदी",     es: "Español",
  fr: "Français", de: "Deutsch",   it: "Italiano",
  pt: "Português", nl: "Nederlands", ar: "العربية",
  zh: "中文",      ja: "日本語",     ru: "Русский",
  tr: "Türkçe",   pl: "Polski",    ko: "한국어",
};

const TABS = [
  { id: "snippets", icon: "⟨/⟩" },
  { id: "language", icon: "⊙"  },
  { id: "code",     icon: "✦"   },
];

const SNIPPETS = [
  {
    id: "inline-rating",
    title: "Inline Star Rating",
    icon: "★",
    accentColor: "#F59E0B",
    bgColor: "#fffbe6",
    code: `<div data-trust-product-id="{{ product.id }}"></div>`,
    description:
      "Renders a compact star badge wherever you paste it — on collection cards, inside headings, under prices. Can be placed in any Liquid file.",
    prerequisite: "Requires the 'Inline Star Rating' block added to the same page template in Theme Editor. Add it once; paste the snippet as many times as needed.",
    preview: (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "#fffbe6", borderRadius: 10, border: "1px solid #fde68a" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} style={{ fontSize: 22, color: i <= 4 ? "#F59E0B" : "#ddd", lineHeight: 1 }}>★</span>
        ))}
        <span style={{ fontSize: 13, color: "#555", marginLeft: 4 }}>4.6 out of 5 based on 1,634 reviews</span>
      </div>
    ),
  },
  {
    id: "review-count",
    title: "Review Count Badge",
    icon: "#",
    accentColor: "#4C6FFF",
    bgColor: "#eaf0ff",
    code: `<span data-trust-count="{{ product.id }}"></span>`,
    description:
      "Shows only the review count as a number — e.g. '1,634 reviews'. Great for embedding inside product title sections or near the price.",
    prerequisite: "Requires the 'Inline Star Rating' block added to the same page template. The count badge is handled by the same script.",
    preview: (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#eaf0ff", borderRadius: 10, border: "1px solid #c7c3fb" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#4C6FFF" }}>1,634</span>
        <span style={{ fontSize: 13, color: "#6b7280" }}>reviews</span>
      </div>
    ),
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tr = useAdminT();
  const TAB_LABELS = { snippets: tr.snippetsTab, language: tr.languageTab, code: tr.codeTab };
  return (
    <div style={{
      display: "flex", gap: 4, padding: "16px 24px 0",
      borderBottom: `1px solid ${SHELL_C.border}`,
      background: SHELL_C.surface,
    }}>
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              border: "none", cursor: "pointer",
              padding: "9px 16px", borderRadius: "8px 8px 0 0",
              fontSize: 12.5, fontWeight: isActive ? 600 : 500,
              color: isActive ? SHELL_C.accent : SHELL_C.muted,
              background: isActive ? SHELL_C.bg : "transparent",
              borderBottom: isActive ? `2px solid ${SHELL_C.accent}` : "2px solid transparent",
              display: "flex", alignItems: "center", gap: 6,
              transition: "color .15s",
            }}
          >
            <span style={{ fontSize: 11 }}>{tab.icon}</span>
            {TAB_LABELS[tab.id]}
          </button>
        );
      })}
    </div>
  );
}

function SnippetCard({ snippet, shop }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(snippet.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: SHELL_C.surface, borderRadius: 16,
      border: `1px solid ${SHELL_C.border}`, overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,.05)",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${SHELL_C.border}`,
        display: "flex", alignItems: "center", gap: 10,
        background: snippet.bgColor,
      }}>
        <span style={{
          width: 34, height: 34, borderRadius: 9, background: snippet.accentColor + "22",
          border: `1.5px solid ${snippet.accentColor}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, color: snippet.accentColor, flexShrink: 0,
          fontWeight: 600,
        }}>
          {snippet.icon}
        </span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: SHELL_C.text }}>{snippet.title}</div>
          <div style={{ fontSize: 11.5, color: SHELL_C.muted, marginTop: 2, lineHeight: 1.4 }}>{snippet.description}</div>
        </div>
      </div>

      {/* Live preview */}
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${SHELL_C.borderLight}`, background: "#fafbfc" }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: SHELL_C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
          Live Preview — Sample Data
        </div>
        {snippet.preview}
      </div>

      {/* Code block */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${SHELL_C.borderLight}` }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: SHELL_C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
          Snippet
        </div>
        <div style={{
          background: "#1e1e2e", borderRadius: 10,
          padding: "14px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <code style={{ fontSize: 12.5, color: "#a6e3a1", fontFamily: "monospace", wordBreak: "break-all", flex: 1 }}>
            {snippet.code}
          </code>
          <button
            onClick={copy}
            style={{
              border: "none", cursor: "pointer", borderRadius: 7,
              padding: "6px 12px", fontSize: 11.5, fontWeight: 600, flexShrink: 0,
              background: copied ? "#059669" : SHELL_C.accent,
              color: "#fff", transition: "background .2s",
            }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Prerequisite note */}
      <div style={{ padding: "12px 20px", background: SHELL_C.accentLt }}>
        <div style={{ fontSize: 11.5, color: SHELL_C.accent, lineHeight: 1.5 }}>
          {snippet.prerequisite}
        </div>
      </div>
    </div>
  );
}

function CodeEditor({ label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: SHELL_C.text, marginBottom: 6 }}>{label}</div>
      {hint && <div style={{ fontSize: 11.5, color: SHELL_C.muted, marginBottom: 8, lineHeight: 1.5 }}>{hint}</div>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        style={{
          width: "100%", boxSizing: "border-box",
          minHeight: 180, resize: "vertical",
          border: `1px solid ${SHELL_C.border}`, borderRadius: 10,
          padding: "12px 14px", fontSize: 12.5, fontFamily: "monospace",
          lineHeight: 1.6, background: "#1e1e2e",
          color: "#cdd6f4", outline: "none",
          transition: "border-color .15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = SHELL_C.accent)}
        onBlur={(e) => (e.target.style.borderColor = SHELL_C.border)}
      />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function CustomCodePage() {
  const { shop, lang: initialLang, customCss: initialCss, customJs: initialJs } = useLoaderData();

  const t = useAdminT();
  const [tab, setTab]         = useState("snippets");
  const [lang, setLang]       = useState(initialLang);
  const [css, setCss]         = useState(initialCss);
  const [js, setJs]           = useState(initialJs);
  const [codeSaved, setCodeSaved] = useState(false);

  const fetcher     = useFetcher();
  const langFetcher = useFetcher();

  const changeLanguage = (key) => {
    setLang(key);
    langFetcher.submit(
      { actionType: "language", language: key },
      { method: "POST", encType: "application/json" },
    );
  };

  const saveCode = () => {
    fetcher.submit(
      { actionType: "custom-code", css, js },
      { method: "POST", encType: "application/json" },
    );
    setCodeSaved(true);
    setTimeout(() => setCodeSaved(false), 3000);
  };

  return (
    <div style={{ minHeight: "100vh", background: SHELL_C.bg, fontFamily: "'Inter','DM Sans','Segoe UI',sans-serif" }}>

      {/* ── Topbar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 56,
        background: SHELL_C.surface, borderBottom: `1px solid ${SHELL_C.border}`,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/app" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${SHELL_C.border}`,
            color: SHELL_C.text, textDecoration: "none", fontSize: 14, background: SHELL_C.bg,
          }}>←</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link to="/app" style={{ fontSize: 13, color: SHELL_C.muted, textDecoration: "none" }}>Home</Link>
            <span style={{ fontSize: 13, color: SHELL_C.muted }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: SHELL_C.text }}>{t.customCodeTitle}</span>
          </div>
        </div>

        {tab === "code" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {codeSaved && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: 600, color: SHELL_C.green,
                background: SHELL_C.greenLt, padding: "4px 12px", borderRadius: 20,
              }}>
                ✓ Saved
              </span>
            )}
            <button
              onClick={saveCode}
              style={{
                border: "none", borderRadius: 8, padding: "8px 20px",
                background: SHELL_C.accent, color: "#fff",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              {t.saveCode}
            </button>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <TabBar active={tab} onChange={setTab} />

      {/* ── Content ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px" }}>

        {/* ── SNIPPETS TAB ── */}
        {tab === "snippets" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: SHELL_C.text, margin: "0 0 6px" }}>
                Custom Shortcodes
              </h2>
              <p style={{ fontSize: 13, color: SHELL_C.muted, margin: 0, lineHeight: 1.6 }}>
                These snippets let you place review widgets anywhere in your theme Liquid files — not just in the Theme Editor block areas.
                Copy the snippet and paste it into any <code style={{ fontFamily: "monospace", background: SHELL_C.borderLight, padding: "1px 5px", borderRadius: 4 }}>.liquid</code> file.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {SNIPPETS.map((s) => (
                <SnippetCard key={s.id} snippet={s} shop={shop} />
              ))}
            </div>

            {/* How it works */}
            <div style={{
              marginTop: 28, background: SHELL_C.surface, borderRadius: 14,
              border: `1px solid ${SHELL_C.border}`, padding: "18px 20px",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: SHELL_C.text, marginBottom: 12 }}>
                How shortcodes work
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { step: "1", text: "Add the matching app block to your theme template in the Theme Editor (one block per template)." },
                  { step: "2", text: "Paste the shortcode snippet in any Liquid file — product cards, section snippets, header/footer, anywhere." },
                  { step: "3", text: "The block's script auto-detects all shortcode elements on the page and populates them with live data." },
                ].map((item) => (
                  <div key={item.step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: "50%", background: SHELL_C.accent,
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 1,
                    }}>
                      {item.step}
                    </span>
                    <span style={{ fontSize: 13, color: SHELL_C.muted, lineHeight: 1.6 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LANGUAGE TAB ── */}
        {tab === "language" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: SHELL_C.text, margin: "0 0 6px" }}>
                {t.appLanguage}
              </h2>
              <p style={{ fontSize: 13, color: SHELL_C.muted, margin: 0, lineHeight: 1.6 }}>
                Controls the display language for the admin dashboard and all storefront widgets.
                Choose the language your customers speak.
              </p>
            </div>

            <div style={{
              background: SHELL_C.surface, borderRadius: 16, border: `1px solid ${SHELL_C.border}`,
              padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.05)",
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: SHELL_C.text, marginBottom: 10 }}>
                Display language
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {Object.entries(LANG_LABELS).map(([key, label]) => {
                  const active = lang === key;
                  return (
                    <button
                      key={key}
                      onClick={() => changeLanguage(key)}
                      style={{
                        padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                        border: active ? `2px solid ${SHELL_C.accent}` : `1px solid ${SHELL_C.border}`,
                        background: active ? SHELL_C.accentLt : SHELL_C.bg,
                        color: active ? SHELL_C.accent : SHELL_C.text,
                        fontSize: 13, fontWeight: active ? 600 : 400,
                        textAlign: "left", transition: "all .15s",
                      }}
                    >
                      {label}
                      {active && <span style={{ float: "right", fontSize: 11 }}>✓</span>}
                    </button>
                  );
                })}
              </div>

              {langFetcher.state !== "idle" && (
                <div style={{ marginTop: 14, fontSize: 12, color: SHELL_C.muted }}>Saving…</div>
              )}
              {langFetcher.state === "idle" && langFetcher.data?.success && (
                <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: SHELL_C.green }}>
                  ✓ Language updated
                </div>
              )}

              <div style={{
                marginTop: 16, background: SHELL_C.accentLt, borderRadius: 10,
                padding: "10px 14px", fontSize: 11.5, color: SHELL_C.accent, lineHeight: 1.5,
              }}>
                Changes take effect immediately on the storefront — no need to republish your theme.
              </div>
            </div>
          </div>
        )}

        {/* ── CUSTOM CSS & JS TAB ── */}
        {tab === "code" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: SHELL_C.text, margin: "0 0 6px" }}>
                {t.codeTab}
              </h2>
              <p style={{ fontSize: 13, color: SHELL_C.muted, margin: 0, lineHeight: 1.6 }}>
                Add custom styles or scripts that run on your storefront alongside the review widgets.
                Requires the <strong>Custom Code Injector</strong> block added to your theme.
              </p>
            </div>

            {/* Setup note */}
            <div style={{
              background: "#fffbe6", borderRadius: 12, border: "1px solid #fde68a",
              padding: "14px 18px", marginBottom: 22,
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>
                One-time setup required
              </div>
              <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.6 }}>
                Go to your Theme Editor → add the <strong>"Trust Custom Code"</strong> block to your theme's header or footer section.
                This block loads your CSS and JS on every page. You only need to do this once.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{
                background: SHELL_C.surface, borderRadius: 16, border: `1px solid ${SHELL_C.border}`,
                padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.05)",
              }}>
                <CodeEditor
                  label={t.customCss}
                  value={css}
                  onChange={setCss}
                  placeholder={`/* Example: change review card border radius */\n.review-card {\n  border-radius: 16px;\n}`}
                  hint="Styles are injected via a <style> tag on every storefront page where the block is active."
                />
              </div>

              <div style={{
                background: SHELL_C.surface, borderRadius: 16, border: `1px solid ${SHELL_C.border}`,
                padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.05)",
              }}>
                <CodeEditor
                  label={t.customJs}
                  value={js}
                  onChange={setJs}
                  placeholder={`// Example: log when a review is submitted\ndocument.addEventListener('trust:review-submitted', function(e) {\n  console.log('Review submitted:', e.detail);\n});`}
                  hint="Script is injected into the page head as a <script> tag. Runs after the page has loaded."
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button
                onClick={saveCode}
                style={{
                  border: "none", borderRadius: 10, padding: "10px 28px",
                  background: SHELL_C.accent, color: "#fff",
                  fontWeight: 600, fontSize: 14, cursor: "pointer",
                  boxShadow: `0 2px 8px ${SHELL_C.accent}44`,
                }}
              >
                {t.saveCode}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
