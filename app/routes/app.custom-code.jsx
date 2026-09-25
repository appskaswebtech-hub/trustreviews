import { useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { SHELL_C } from "../components/WidgetCustomizeShell";
import { useAdminT } from "../utils/adminTranslations";
import { hasAdvancedAccess } from "../utils/planGuard.server";
import AdvancedPaywall from "../components/AdvancedPaywall";

// ─── Loader ────────────────────────────────────────────────────────────────────
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const [store, customCode, isPro] = await Promise.all([
    prisma.store.findUnique({ where: { shop: session.shop }, select: { language: true } }),
    prisma.storeCustomCode.findUnique({ where: { shop: session.shop } }),
    hasAdvancedAccess(session.shop),
  ]);

  return {
    shop: session.shop,
    lang: store?.language || "en",
    customCss: customCode?.customCss || "",
    customJs:  customCode?.customJs  || "",
    isPro,
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
    const isPro = await hasAdvancedAccess(session.shop);
    if (!isPro) return { success: false, message: "Custom CSS/JS requires the Advanced plan." };

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
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "#fffbe6", borderRadius: 10, border: "1px solid #fde68a" }} className="tr-app-routes-app-custom-code-div-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} style={{ fontSize: 22, color: i <= 4 ? "#F59E0B" : "#ddd", lineHeight: 1 }} className="tr-app-routes-app-custom-code-span-2">★</span>
        ))}
        <span style={{ fontSize: 14, color: "#555", marginLeft: 4 }} className="tr-app-routes-app-custom-code-span-3">4.6 out of 5 based on 1,634 reviews</span>
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
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#eaf0ff", borderRadius: 10, border: "1px solid #c7c3fb" }} className="tr-app-routes-app-custom-code-div-4">
        <span style={{ fontSize: 13, fontWeight: 600, color: "#4C6FFF" }} className="tr-app-routes-app-custom-code-span-5">1,634</span>
        <span style={{ fontSize: 13, color: "#6b7280" }} className="tr-app-routes-app-custom-code-span-6">reviews</span>
      </div>
    ),
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tr = useAdminT();
  const TAB_LABELS = { snippets: tr.snippetsTab, language: tr.languageTab, code: tr.codeTab };
  return (
    // <div style={{
    //   display: "flex", gap: 4, padding: "16px 24px 0",
    //   borderBottom: `1px solid ${SHELL_C.border}`,
    //   background: SHELL_C.surface,
    // }} className="tr-app-routes-app-custom-code-div-7">
    //   {TABS.map((tab) => {
    //     const isActive = active === tab.id;
    //     return (
    //       <button
    //         key={tab.id}
    //         onClick={() => onChange(tab.id)}
    //         style={{
    //           border: "none", cursor: "pointer",
    //           padding: "9px 16px", borderRadius: "8px 8px 0 0",
    //           fontSize: 12.5, fontWeight: isActive ? 600 : 500,
    //           color: isActive ? SHELL_C.accent : SHELL_C.muted,
    //           background: isActive ? SHELL_C.bg : "transparent",
    //           borderBottom: isActive ? `2px solid ${SHELL_C.accent}` : "2px solid transparent",
    //           display: "flex", alignItems: "center", gap: 6,
    //           transition: "color .15s",
    //         }}
    //        className="tr-app-routes-app-custom-code-button-8">
    //         <span style={{ fontSize: 11 }} className="tr-app-routes-app-custom-code-span-9">{tab.icon}</span>
    //         {TAB_LABELS[tab.id]}
    //       </button>
    //     );
    //   })}
    // </div>
    <div
  className="tr-app-routes-app-custom-code-div-7"
  style={{
    display: "flex",
    gap: 6,
    padding: "12px 20px 0",
    borderBottom: "1px solid #D6E6F2",
    background: "linear-gradient(180deg,#FFFFFF 0%,#F9FCFE 100%)",
  }}
>
  {TABS.map((tab) => {
    const isActive = active === tab.id;

    return (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className="tr-app-routes-app-custom-code-button-8"
        style={{
          border: "none",
          cursor: "pointer",
          padding: "9px 15px",
          borderRadius: "9px 9px 0 0",
          fontSize: 14,
          fontWeight: isActive ? 700 : 550,
          color: isActive ? "#4F7392" : "#829CAF",
          background: isActive ? "#FFFFFF" : "transparent",
          borderBottom: isActive
            ? "3px solid #8DB4D6"
            : "3px solid transparent",
          display: "flex",
          alignItems: "center",
          gap: 7,
          transition: "all .16s ease",
          boxShadow: isActive
            ? "0 -2px 10px rgba(141,180,214,.06)"
            : "none",
        }}
      >
        <span
          className="tr-app-routes-app-custom-code-span-9"
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            background: isActive ? "#D6E6F2" : "#F2F7FB",
            color: isActive ? "#4F7392" : "#8DA7BC",
            border: isActive
              ? "1px solid rgba(141,180,214,.45)"
              : "1px solid #E3EDF4",
          }}
        >
          {tab.icon}
        </span>

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
    }} className="tr-app-routes-app-custom-code-div-10">
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${SHELL_C.border}`,
        display: "flex", alignItems: "center", gap: 10,
        background: snippet.bgColor,
      }} className="tr-app-routes-app-custom-code-div-11">
        <span style={{
          width: 34, height: 34, borderRadius: 9, background: snippet.accentColor + "22",
          border: `1.5px solid ${snippet.accentColor}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, color: snippet.accentColor, flexShrink: 0,
          fontWeight: 600,
        }} className="tr-app-routes-app-custom-code-span-12">
          {snippet.icon}
        </span>
        <div className="tr-app-routes-app-custom-code-div-13">
          <div style={{ fontSize: 16, fontWeight: 600, color: SHELL_C.text }} className="tr-app-routes-app-custom-code-div-14">{snippet.title}</div>
          <div style={{ fontSize: 14, color: SHELL_C.muted, marginTop: 2, lineHeight: 1.4 }} className="tr-app-routes-app-custom-code-div-15">{snippet.description}</div>
        </div>
      </div>

      {/* Live preview */}
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${SHELL_C.borderLight}`, background: "#fafbfc" }} className="tr-app-routes-app-custom-code-div-16">
        <div style={{ fontSize: 12, fontWeight: 600, color: SHELL_C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }} className="tr-app-routes-app-custom-code-div-17">
          Live Preview — Sample Data
        </div>
        {snippet.preview}
      </div>

      {/* Code block */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${SHELL_C.borderLight}` }} className="tr-app-routes-app-custom-code-div-18">
        <div style={{ fontSize: 12, fontWeight: 600, color: SHELL_C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }} className="tr-app-routes-app-custom-code-div-19">
          Snippet
        </div>
        <div style={{
          background: "#1e1e2e", borderRadius: 10,
          padding: "14px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }} className="tr-app-routes-app-custom-code-div-20">
          <code style={{ fontSize: 14, color: "#a6e3a1", fontFamily: "monospace", wordBreak: "break-all", flex: 1 }} className="tr-app-routes-app-custom-code-code-21">
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
           className="tr-app-routes-app-custom-code-button-22">
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Prerequisite note */}
      <div style={{ padding: "12px 20px", background: SHELL_C.accentLt }} className="tr-app-routes-app-custom-code-div-23">
        <div style={{ fontSize: 14, color: SHELL_C.accent, lineHeight: 1.5 }} className="tr-app-routes-app-custom-code-div-24">
          {snippet.prerequisite}
        </div>
      </div>
    </div>
  );
}

function CodeEditor({ label, value, onChange, placeholder, hint }) {
  return (
    <div className="tr-app-routes-app-custom-code-div-25">
      <div style={{ fontSize: 12.5, fontWeight: 600, color: SHELL_C.text, marginBottom: 6 }} className="tr-app-routes-app-custom-code-div-26">{label}</div>
      {hint && <div style={{ fontSize: 11.5, color: SHELL_C.muted, marginBottom: 8, lineHeight: 1.5 }} className="tr-app-routes-app-custom-code-div-27">{hint}</div>}
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
       className="tr-app-routes-app-custom-code-textarea-28"/>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function CustomCodePage() {
  const { shop, lang: initialLang, customCss: initialCss, customJs: initialJs, isPro } = useLoaderData();

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
    // <div style={{ minHeight: "100vh", background: SHELL_C.bg, fontFamily: "var(--app-font-family)" }} className="tr-app-routes-app-custom-code-div-29">

    //   {/* ── Topbar ── */}
    //   <div style={{
    //     display: "flex", alignItems: "center", justifyContent: "space-between",
    //     padding: "0 24px", height: 56,
    //     background: SHELL_C.surface, borderBottom: `1px solid ${SHELL_C.border}`,
    //     position: "sticky", top: 0, zIndex: 100,
    //     boxShadow: "0 1px 4px rgba(0,0,0,.06)",
    //   }} className="tr-app-routes-app-custom-code-div-30">
    //     <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="tr-app-routes-app-custom-code-div-31">
    //       <Link to="/app" style={{
    //         display: "flex", alignItems: "center", justifyContent: "center",
    //         width: 32, height: 32, borderRadius: 8, border: `1px solid ${SHELL_C.border}`,
    //         color: SHELL_C.text, textDecoration: "none", fontSize: 14, background: SHELL_C.bg,
    //       }}>←</Link>
    //       <div style={{ display: "flex", alignItems: "center", gap: 6 }} className="tr-app-routes-app-custom-code-div-32">
    //         <Link to="/app" style={{ fontSize: 13, color: SHELL_C.muted, textDecoration: "none" }}>Home</Link>
    //         <span style={{ fontSize: 13, color: SHELL_C.muted }} className="tr-app-routes-app-custom-code-span-33">/</span>
    //         <span style={{ fontSize: 13, fontWeight: 600, color: SHELL_C.text }} className="tr-app-routes-app-custom-code-span-34">{t.customCodeTitle}</span>
    //       </div>
    //     </div>

    //     {tab === "code" && (
    //       <div style={{ display: "flex", alignItems: "center", gap: 12 }} className="tr-app-routes-app-custom-code-div-35">
    //         {codeSaved && (
    //           <span style={{
    //             display: "inline-flex", alignItems: "center", gap: 5,
    //             fontSize: 12, fontWeight: 600, color: SHELL_C.green,
    //             background: SHELL_C.greenLt, padding: "4px 12px", borderRadius: 20,
    //           }} className="tr-app-routes-app-custom-code-span-36">
    //             ✓ Saved
    //           </span>
    //         )}
    //         <button
    //           onClick={saveCode}
    //           style={{
    //             border: "none", borderRadius: 8, padding: "8px 20px",
    //             background: SHELL_C.accent, color: "#fff",
    //             fontWeight: 600, fontSize: 13, cursor: "pointer",
    //           }}
    //          className="tr-app-routes-app-custom-code-button-37">
    //           {t.saveCode}
    //         </button>
    //       </div>
    //     )}
    //   </div>

    //   {/* ── Tab bar ── */}
    //   <TabBar active={tab} onChange={setTab} />

    //   {/* ── Content ── */}
    //   <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px" }} className="tr-app-routes-app-custom-code-div-38">

    //     {/* ── SNIPPETS TAB ── */}
    //     {tab === "snippets" && (
    //       <div className="tr-app-routes-app-custom-code-div-39">
    //         <div style={{ marginBottom: 24 }} className="tr-app-routes-app-custom-code-div-40">
    //           <h2 style={{ fontSize: 20, fontWeight: 600, color: SHELL_C.text, margin: "0 0 6px" }} className="tr-app-routes-app-custom-code-h2-41">
    //             Custom Shortcodes
    //           </h2>
    //           <p style={{ fontSize: 13, color: SHELL_C.muted, margin: 0, lineHeight: 1.6 }} className="tr-app-routes-app-custom-code-p-42">
    //             These snippets let you place review widgets anywhere in your theme Liquid files — not just in the Theme Editor block areas.
    //             Copy the snippet and paste it into any <code style={{ fontFamily: "monospace", background: SHELL_C.borderLight, padding: "1px 5px", borderRadius: 4 }} className="tr-app-routes-app-custom-code-code-43">.liquid</code> file.
    //           </p>
    //         </div>

    //         <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="tr-app-routes-app-custom-code-div-44">
    //           {SNIPPETS.map((s) => (
    //             <SnippetCard key={s.id} snippet={s} shop={shop} />
    //           ))}
    //         </div>

    //         {/* How it works */}
    //         <div style={{
    //           marginTop: 28, background: SHELL_C.surface, borderRadius: 14,
    //           border: `1px solid ${SHELL_C.border}`, padding: "18px 20px",
    //         }} className="tr-app-routes-app-custom-code-div-45">
    //           <div style={{ fontSize: 13, fontWeight: 600, color: SHELL_C.text, marginBottom: 12 }} className="tr-app-routes-app-custom-code-div-46">
    //             How shortcodes work
    //           </div>
    //           <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="tr-app-routes-app-custom-code-div-47">
    //             {[
    //               { step: "1", text: "Add the matching app block to your theme template in the Theme Editor (one block per template)." },
    //               { step: "2", text: "Paste the shortcode snippet in any Liquid file — product cards, section snippets, header/footer, anywhere." },
    //               { step: "3", text: "The block's script auto-detects all shortcode elements on the page and populates them with live data." },
    //             ].map((item) => (
    //               <div key={item.step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }} className="tr-app-routes-app-custom-code-div-48">
    //                 <span style={{
    //                   width: 24, height: 24, borderRadius: "50%", background: SHELL_C.accent,
    //                   color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    //                   fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 1,
    //                 }} className="tr-app-routes-app-custom-code-span-49">
    //                   {item.step}
    //                 </span>
    //                 <span style={{ fontSize: 13, color: SHELL_C.muted, lineHeight: 1.6 }} className="tr-app-routes-app-custom-code-span-50">{item.text}</span>
    //               </div>
    //             ))}
    //           </div>
    //         </div>
    //       </div>
    //     )}

    //     {/* ── LANGUAGE TAB ── */}
    //     {tab === "language" && (
    //       <div className="tr-app-routes-app-custom-code-div-51">
    //         <div style={{ marginBottom: 24 }} className="tr-app-routes-app-custom-code-div-52">
    //           <h2 style={{ fontSize: 20, fontWeight: 600, color: SHELL_C.text, margin: "0 0 6px" }} className="tr-app-routes-app-custom-code-h2-53">
    //             {t.appLanguage}
    //           </h2>
    //           <p style={{ fontSize: 13, color: SHELL_C.muted, margin: 0, lineHeight: 1.6 }} className="tr-app-routes-app-custom-code-p-54">
    //             Controls the display language for the admin dashboard and all storefront widgets.
    //             Choose the language your customers speak.
    //           </p>
    //         </div>

    //         <div style={{
    //           background: SHELL_C.surface, borderRadius: 16, border: `1px solid ${SHELL_C.border}`,
    //           padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.05)",
    //         }} className="tr-app-routes-app-custom-code-div-55">
    //           <div style={{ fontSize: 12.5, fontWeight: 600, color: SHELL_C.text, marginBottom: 10 }} className="tr-app-routes-app-custom-code-div-56">
    //             Display language
    //           </div>
    //           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }} className="tr-app-routes-app-custom-code-div-57">
    //             {Object.entries(LANG_LABELS).map(([key, label]) => {
    //               const active = lang === key;
    //               return (
    //                 <button
    //                   key={key}
    //                   onClick={() => changeLanguage(key)}
    //                   style={{
    //                     padding: "10px 14px", borderRadius: 10, cursor: "pointer",
    //                     border: active ? `2px solid ${SHELL_C.accent}` : `1px solid ${SHELL_C.border}`,
    //                     background: active ? SHELL_C.accentLt : SHELL_C.bg,
    //                     color: active ? SHELL_C.accent : SHELL_C.text,
    //                     fontSize: 13, fontWeight: active ? 600 : 400,
    //                     textAlign: "left", transition: "all .15s",
    //                   }}
    //                  className="tr-app-routes-app-custom-code-button-58">
    //                   {label}
    //                   {active && <span style={{ float: "right", fontSize: 11 }} className="tr-app-routes-app-custom-code-span-59">✓</span>}
    //                 </button>
    //               );
    //             })}
    //           </div>

    //           {langFetcher.state !== "idle" && (
    //             <div style={{ marginTop: 14, fontSize: 12, color: SHELL_C.muted }} className="tr-app-routes-app-custom-code-div-60">Saving…</div>
    //           )}
    //           {langFetcher.state === "idle" && langFetcher.data?.success && (
    //             <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: SHELL_C.green }} className="tr-app-routes-app-custom-code-div-61">
    //               ✓ Language updated
    //             </div>
    //           )}

    //           <div style={{
    //             marginTop: 16, background: SHELL_C.accentLt, borderRadius: 10,
    //             padding: "10px 14px", fontSize: 11.5, color: SHELL_C.accent, lineHeight: 1.5,
    //           }} className="tr-app-routes-app-custom-code-div-62">
    //             Changes take effect immediately on the storefront — no need to republish your theme.
    //           </div>
    //         </div>
    //       </div>
    //     )}

    //     {/* ── CUSTOM CSS & JS TAB ── */}
    //     {tab === "code" && (
    //       isPro ? (
    //       <div className="tr-app-routes-app-custom-code-div-63">
    //         <div style={{ marginBottom: 24 }} className="tr-app-routes-app-custom-code-div-64">
    //           <h2 style={{ fontSize: 20, fontWeight: 600, color: SHELL_C.text, margin: "0 0 6px" }} className="tr-app-routes-app-custom-code-h2-65">
    //             {t.codeTab}
    //           </h2>
    //           <p style={{ fontSize: 13, color: SHELL_C.muted, margin: 0, lineHeight: 1.6 }} className="tr-app-routes-app-custom-code-p-66">
    //             Add custom styles or scripts that run on your storefront alongside the review widgets.
    //             Requires the <strong className="tr-app-routes-app-custom-code-strong-67">Custom Code Injector</strong> block added to your theme.
    //           </p>
    //         </div>

    //         {/* Setup note */}
    //         <div style={{
    //           background: "#fffbe6", borderRadius: 12, border: "1px solid #fde68a",
    //           padding: "14px 18px", marginBottom: 22,
    //         }} className="tr-app-routes-app-custom-code-div-68">
    //           <div style={{ fontSize: 12.5, fontWeight: 600, color: "#92400e", marginBottom: 4 }} className="tr-app-routes-app-custom-code-div-69">
    //             One-time setup required
    //           </div>
    //           <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.6 }} className="tr-app-routes-app-custom-code-div-70">
    //             Go to your Theme Editor → add the <strong className="tr-app-routes-app-custom-code-strong-71">"Trust Custom Code"</strong> block to your theme's header or footer section.
    //             This block loads your CSS and JS on every page. You only need to do this once.
    //           </div>
    //         </div>

    //         <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="tr-app-routes-app-custom-code-div-72">
    //           <div style={{
    //             background: SHELL_C.surface, borderRadius: 16, border: `1px solid ${SHELL_C.border}`,
    //             padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.05)",
    //           }} className="tr-app-routes-app-custom-code-div-73">
    //             <CodeEditor
    //               label={t.customCss}
    //               value={css}
    //               onChange={setCss}
    //               placeholder={`/* Example: change review card border radius */\n.review-card {\n  border-radius: 16px;\n}`}
    //               hint="Styles are injected via a <style> tag on every storefront page where the block is active."
    //             />
    //           </div>

    //           <div style={{
    //             background: SHELL_C.surface, borderRadius: 16, border: `1px solid ${SHELL_C.border}`,
    //             padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.05)",
    //           }} className="tr-app-routes-app-custom-code-div-74">
    //             <CodeEditor
    //               label={t.customJs}
    //               value={js}
    //               onChange={setJs}
    //               placeholder={`// Example: log when a review is submitted\ndocument.addEventListener('trust:review-submitted', function(e) {\n  console.log('Review submitted:', e.detail);\n});`}
    //               hint="Script is injected into the page head as a <script> tag. Runs after the page has loaded."
    //             />
    //           </div>
    //         </div>

    //         <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }} className="tr-app-routes-app-custom-code-div-75">
    //           <button
    //             onClick={saveCode}
    //             style={{
    //               border: "none", borderRadius: 10, padding: "10px 28px",
    //               background: SHELL_C.accent, color: "#fff",
    //               fontWeight: 600, fontSize: 14, cursor: "pointer",
    //               boxShadow: `0 2px 8px ${SHELL_C.accent}44`,
    //             }}
    //            className="tr-app-routes-app-custom-code-button-76">
    //             {t.saveCode}
    //           </button>
    //         </div>
    //       </div>
    //       ) : (
    //         <AdvancedPaywall
    //           title="Custom CSS/JS — Advanced Plan"
    //           description="Add custom styles or scripts that run on your storefront alongside the review widgets."
    //           features={[
    //             "Inject custom CSS",
    //             "Inject custom JS",
    //             "PageFly & GemPages support",
    //             "Everything else in Advanced",
    //           ]}
    //           accentColor={SHELL_C.accent}
    //         />
    //       )
    //     )}
    //   </div>
    // </div>
    <div
  style={{
    minHeight: "100vh",
    background: "#F2F7FB",
    fontFamily: "var(--app-font-family)",
  }}
  className="tr-app-routes-app-custom-code-div-29"
>
  {/* ── Topbar ── */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      height: 62,
      background: "linear-gradient(135deg,#FFFFFF 0%,#F2F7FB 100%)",
      borderBottom: "1px solid #D6E6F2",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 6px 18px rgba(79,115,146,.06)",
    }}
    className="tr-app-routes-app-custom-code-div-30"
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
      className="tr-app-routes-app-custom-code-div-31"
    >
      <Link
        to="/app"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: 9,
          border: "1px solid #D6E6F2",
          color: "#4F7392",
          textDecoration: "none",
          fontSize: 15,
          background: "#FFFFFF",
          boxShadow: "0 4px 10px rgba(79,115,146,.05)",
        }}
      >
        ←
      </Link>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 9px",
          background: "#FFFFFF",
          border: "1px solid #D6E6F2",
          borderRadius: 8,
        }}
        className="tr-app-routes-app-custom-code-div-32"
      >
        <Link
          to="/app"
          style={{
            fontSize: 14,
            color: "#829CAF",
            textDecoration: "none",
          }}
        >
          Home
        </Link>

        <span
          style={{
            fontSize: 14,
            color: "#B3C3CF",
          }}
          className="tr-app-routes-app-custom-code-span-33"
        >
          /
        </span>

        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#4F7392",
          }}
          className="tr-app-routes-app-custom-code-span-34"
        >
          {t.customCodeTitle}
        </span>
      </div>
    </div>

    {tab === "code" && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
        className="tr-app-routes-app-custom-code-div-35"
      >
        {codeSaved && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              fontWeight: 700,
              color: "#4F7392",
              background: "#D6E6F2",
              padding: "5px 11px",
              borderRadius: 20,
              border: "1px solid rgba(141,180,214,.45)",
            }}
            className="tr-app-routes-app-custom-code-span-36"
          >
            ✓ Saved
          </span>
        )}

        <button
          onClick={saveCode}
          style={{
            border: "none",
            borderRadius: 9,
            padding: "9px 18px",
            background: "linear-gradient(135deg,#8DB4D6,#6F96B6)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 12.5,
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(79,115,146,.17)",
          }}
          className="tr-app-routes-app-custom-code-button-37"
        >
          {t.saveCode}
        </button>
      </div>
    )}
  </div>

  {/* ── Tab bar ── */}
  <TabBar active={tab} onChange={setTab} />

  {/* ── Content ── */}
  <div
    style={{
      maxWidth: 920,
      margin: "0 auto",
      padding: "26px 24px 34px",
    }}
    className="tr-app-routes-app-custom-code-div-38"
  >
    {/* ── SNIPPETS TAB ── */}
    {tab === "snippets" && (
      <div className="tr-app-routes-app-custom-code-div-39">
        <div
          style={{
            marginBottom: 18,
            padding: "18px 20px",
            background: "linear-gradient(135deg,#FFFFFF,#F2F7FB)",
            border: "1px solid #D6E6F2",
            borderRadius: 14,
            boxShadow: "0 7px 20px rgba(79,115,146,.05)",
          }}
          className="tr-app-routes-app-custom-code-div-40"
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 750,
              color: "#4F7392",
              margin: "0 0 6px",
              letterSpacing: "-.02em",
            }}
            className="tr-app-routes-app-custom-code-h2-41"
          >
            Custom Shortcodes
          </h2>

          <p
            style={{
              fontSize: 14,
              color: "#829CAF",
              margin: 0,
              lineHeight: 1.65,
            }}
            className="tr-app-routes-app-custom-code-p-42"
          >
            These snippets let you place review widgets anywhere in your theme Liquid files — not just in the Theme Editor block areas.
            Copy the snippet and paste it into any{" "}
            <code
              style={{
                fontFamily: "monospace",
                background: "#D6E6F2",
                color: "#4F7392",
                padding: "2px 6px",
                borderRadius: 5,
                fontSize: 14,
              }}
              className="tr-app-routes-app-custom-code-code-43"
            >
              .liquid
            </code>{" "}
            file.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
          className="tr-app-routes-app-custom-code-div-44"
        >
          {SNIPPETS.map((s) => (
            <SnippetCard key={s.id} snippet={s} shop={shop} />
          ))}
        </div>

        {/* How it works */}
        <div
          style={{
            marginTop: 20,
            background: "#FFFFFF",
            borderRadius: 14,
            border: "1px solid #D6E6F2",
            padding: "16px 18px",
            boxShadow: "0 7px 20px rgba(79,115,146,.05)",
          }}
          className="tr-app-routes-app-custom-code-div-45"
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#4F7392",
              marginBottom: 10,
            }}
            className="tr-app-routes-app-custom-code-div-46"
          >
            How shortcodes work
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
            className="tr-app-routes-app-custom-code-div-47"
          >
            {[
              {
                step: "1",
                text: "Add the matching app block to your theme template in the Theme Editor (one block per template).",
              },
              {
                step: "2",
                text: "Paste the shortcode snippet in any Liquid file — product cards, section snippets, header/footer, anywhere.",
              },
              {
                step: "3",
                text: "The block's script auto-detects all shortcode elements on the page and populates them with live data.",
              },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "8px 10px",
                  background: "#F9FCFE",
                  border: "1px solid #E1ECF4",
                  borderRadius: 9,
                }}
                className="tr-app-routes-app-custom-code-div-48"
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#8DB4D6",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                  className="tr-app-routes-app-custom-code-span-49"
                >
                  {item.step}
                </span>

                <span
                  style={{
                    fontSize: 14,
                    color: "#6F8FA9",
                    lineHeight: 1.6,
                  }}
                  className="tr-app-routes-app-custom-code-span-50"
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* ── LANGUAGE TAB ── */}
    {tab === "language" && (
      <div className="tr-app-routes-app-custom-code-div-51">
        <div
          style={{
            marginBottom: 16,
            padding: "18px 20px",
            background: "linear-gradient(135deg,#FFFFFF,#F2F7FB)",
            border: "1px solid #D6E6F2",
            borderRadius: 14,
            boxShadow: "0 7px 20px rgba(79,115,146,.05)",
          }}
          className="tr-app-routes-app-custom-code-div-52"
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 750,
              color: "#4F7392",
              margin: "0 0 6px",
              letterSpacing: "-.02em",
            }}
            className="tr-app-routes-app-custom-code-h2-53"
          >
            {t.appLanguage}
          </h2>

          <p
            style={{
              fontSize: 13,
              color: "#829CAF",
              margin: 0,
              lineHeight: 1.65,
            }}
            className="tr-app-routes-app-custom-code-p-54"
          >
            Controls the display language for the admin dashboard and all storefront widgets.
            Choose the language your customers speak.
          </p>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid #D6E6F2",
            padding: 20,
            boxShadow: "0 8px 24px rgba(79,115,146,.06)",
          }}
          className="tr-app-routes-app-custom-code-div-55"
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#4F7392",
              marginBottom: 9,
            }}
            className="tr-app-routes-app-custom-code-div-56"
          >
            Display language
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 8,
            }}
            className="tr-app-routes-app-custom-code-div-57"
          >
            {Object.entries(LANG_LABELS).map(([key, label]) => {
              const active = lang === key;

              return (
                <button
                  key={key}
                  onClick={() => changeLanguage(key)}
                  style={{
                    padding: "10px 13px",
                    borderRadius: 9,
                    cursor: "pointer",
                    border: active
                      ? "2px solid #8DB4D6"
                      : "1px solid #D6E6F2",
                    background: active ? "#F2F7FB" : "#FFFFFF",
                    color: active ? "#4F7392" : "#6F8FA9",
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    textAlign: "left",
                    transition: "all .15s",
                    boxShadow: active
                      ? "0 5px 14px rgba(141,180,214,.10)"
                      : "none",
                  }}
                  className="tr-app-routes-app-custom-code-button-58"
                >
                  {label}

                  {active && (
                    <span
                      style={{
                        float: "right",
                        fontSize: 14,
                        color: "#8DB4D6",
                      }}
                      className="tr-app-routes-app-custom-code-span-59"
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {langFetcher.state !== "idle" && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#829CAF",
              }}
              className="tr-app-routes-app-custom-code-div-60"
            >
              Saving…
            </div>
          )}

          {langFetcher.state === "idle" && langFetcher.data?.success && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                fontWeight: 700,
                color: SHELL_C.green,
              }}
              className="tr-app-routes-app-custom-code-div-61"
            >
              ✓ Language updated
            </div>
          )}

          <div
            style={{
              marginTop: 14,
              background: "#F2F7FB",
              border: "1px solid #D6E6F2",
              borderRadius: 9,
              padding: "10px 12px",
              fontSize: 14,
              color: "#6F8FA9",
              lineHeight: 1.55,
            }}
            className="tr-app-routes-app-custom-code-div-62"
          >
            Changes take effect immediately on the storefront — no need to republish your theme.
          </div>
        </div>
      </div>
    )}

    {/* ── CUSTOM CSS & JS TAB ── */}
    {tab === "code" &&
      (isPro ? (
        <div className="tr-app-routes-app-custom-code-div-63">
          <div
            style={{
              marginBottom: 16,
              padding: "18px 20px",
              background: "linear-gradient(135deg,#FFFFFF,#F2F7FB)",
              border: "1px solid #D6E6F2",
              borderRadius: 14,
              boxShadow: "0 7px 20px rgba(79,115,146,.05)",
            }}
            className="tr-app-routes-app-custom-code-div-64"
          >
            <h2
              style={{
                fontSize: 22,
                fontWeight: 750,
                color: "#4F7392",
                margin: "0 0 6px",
                letterSpacing: "-.02em",
              }}
              className="tr-app-routes-app-custom-code-h2-65"
            >
              {t.codeTab}
            </h2>

            <p
              style={{
                fontSize: 13,
                color: "#829CAF",
                margin: 0,
                lineHeight: 1.65,
              }}
              className="tr-app-routes-app-custom-code-p-66"
            >
              Add custom styles or scripts that run on your storefront alongside the review widgets.
              Requires the{" "}
              <strong
                className="tr-app-routes-app-custom-code-strong-67"
                style={{ color: "#4F7392" }}
              >
                Custom Code Injector
              </strong>{" "}
              block added to your theme.
            </p>
          </div>

          {/* Setup note */}
          <div
            style={{
              background: "#FFF9E8",
              borderRadius: 11,
              border: "1px solid #F2D58A",
              padding: "12px 15px",
              marginBottom: 16,
            }}
            className="tr-app-routes-app-custom-code-div-68"
          >
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: "#8A5A12",
                marginBottom: 3,
              }}
              className="tr-app-routes-app-custom-code-div-69"
            >
              One-time setup required
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#8A651F",
                lineHeight: 1.6,
              }}
              className="tr-app-routes-app-custom-code-div-70"
            >
              Go to your Theme Editor → add the{" "}
              <strong className="tr-app-routes-app-custom-code-strong-71">
                "Trust Custom Code"
              </strong>{" "}
              block to your theme's header or footer section.
              This block loads your CSS and JS on every page. You only need to do this once.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
            className="tr-app-routes-app-custom-code-div-72"
          >
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 14,
                border: "1px solid #D6E6F2",
                padding: 20,
                boxShadow: "0 7px 20px rgba(79,115,146,.05)",
              }}
              className="tr-app-routes-app-custom-code-div-73"
            >
              <CodeEditor
                label={t.customCss}
                value={css}
                onChange={setCss}
                placeholder={`/* Example: change review card border radius */
.review-card {
  border-radius: 16px;
}`}
                hint="Styles are injected via a <style> tag on every storefront page where the block is active."
              />
            </div>

            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 14,
                border: "1px solid #D6E6F2",
                padding: 20,
                boxShadow: "0 7px 20px rgba(79,115,146,.05)",
              }}
              className="tr-app-routes-app-custom-code-div-74"
            >
              <CodeEditor
                label={t.customJs}
                value={js}
                onChange={setJs}
                placeholder={`// Example: log when a review is submitted
document.addEventListener('trust:review-submitted', function(e) {
  console.log('Review submitted:', e.detail);
});`}
                hint="Script is injected into the page head as a <script> tag. Runs after the page has loaded."
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 16,
            }}
            className="tr-app-routes-app-custom-code-div-75"
          >
            <button
              onClick={saveCode}
              style={{
                border: "none",
                borderRadius: 9,
                padding: "10px 24px",
                background: "linear-gradient(135deg,#8DB4D6,#6F96B6)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: "0 7px 18px rgba(79,115,146,.17)",
              }}
              className="tr-app-routes-app-custom-code-button-76"
            >
              {t.saveCode}
            </button>
          </div>
        </div>
      ) : (
        <AdvancedPaywall
          title="Custom CSS/JS — Advanced Plan"
          description="Add custom styles or scripts that run on your storefront alongside the review widgets."
          features={[
            "Inject custom CSS",
            "Inject custom JS",
            "PageFly & GemPages support",
            "Everything else in Advanced",
          ]}
          accentColor={SHELL_C.accent}
        />
      ))}
  </div>
</div>
  );
}
