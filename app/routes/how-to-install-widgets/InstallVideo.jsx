import { useEffect, useRef, useState } from "react";
import { BLOCKS, logoIconStyle, widgetImage } from "./guideData";

// A 20-second animated walkthrough of installing one widget in Shopify's Theme
// Editor (Customize): Themes → Customize → pick the template → Add section →
// Apps → the widget's block → move it → block settings → Save.
// Every frame is derived from the playhead `t`, so it pauses and scrubs like a video.

export const DURATION = 20;
const W = 960;
const H = 540;
const FONT = "Inter, -apple-system, 'Segoe UI', Roboto, sans-serif";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;

/* ------------------------------------------------------------ timeline */

// Key moments (seconds).
const T = {
  customize: 2.4, editorIn: 2.7, loaded: 3.5,
  menu: 4.3, pick: 5.3,
  addSection: 6.4, appsTab: 7.0, typeFrom: 7.2, typeTo: 7.9, choose: 8.6,
  inserted: 8.7, panel: 8.9,
  dragFrom: 10.2, dragTo: 11.4, release: 11.6,
  selOpen: 12.8, selPick: 13.8,
  save: 17.1, end: 18.4,
};

// Sidebar rows (stage coordinates).
const SIDEBAR_TOP = 104;
const ROW = 26;
const rowY = (i) => SIDEBAR_TOP + i * ROW + ROW / 2;

// Settings panel field i: control center y.
const fieldY = (i) => 166 + 56 * i;

// "Add section" picker.
const PICKER = { x: 300, y: 150, w: 280 };
const APPS_TAB = [403, PICKER.y + 59];
const pickerItemY = (i) => PICKER.y + 119 + 30 * i;

const TEMPLATE_OPTIONS = ["Home page", "Products › Default product", "Collections › Default collection", "Pages › Default page"];
const templateOptionY = (i) => 89 + 30 * i;

const CUSTOMIZE_BTN = [862, 323];
const SAVE_BTN = [916, 52];

function buildScript(widget) {
  const isTrust = widget.blockHandle === "reviews-widget";
  const kf = [
    [0, 640, 420], [1.9, ...CUSTOMIZE_BTN], [2.6, ...CUSTOMIZE_BTN],
    [3.6, 700, 300], [4.1, 480, 52], [4.4, 480, 52],
    [5.0, 470, templateOptionY(1)], [5.4, 470, templateOptionY(1)],
    [6.2, 110, rowY(4)], [6.5, 110, rowY(4)],
    [6.9, ...APPS_TAB], [7.1, ...APPS_TAB],
    [8.3, 400, pickerItemY(0)], [8.7, 400, pickerItemY(0)],
    [10.0, 282, rowY(4)], [T.dragFrom, 282, rowY(4)], [T.dragTo, 282, rowY(3)], [11.8, 282, rowY(3)],
  ];
  const clicks = [T.customize, T.menu, T.pick, T.addSection, T.appsTab, T.choose, T.dragFrom, T.release];
  if (isTrust) {
    kf.push([12.5, 840, fieldY(0)], [12.9, 840, fieldY(0)], [13.6, 840, fieldY(0) + 61], [14.2, 840, fieldY(0) + 61], [15.2, 700, 300]);
    clicks.push(T.selOpen, T.selPick);
  } else {
    const n = Math.max(1, Math.min(widget.blockSettings.length, 4));
    kf.push([12.4, 840, fieldY(0)], [14.8, 840, fieldY(n - 1)], [15.4, 700, 300]);
  }
  kf.push([16.8, ...SAVE_BTN], [DURATION, ...SAVE_BTN]);
  clicks.push(T.save);

  // Apps list in the picker: this widget's block first, then the app's other blocks.
  const others = [...new Set(Object.values(BLOCKS).map((b) => b.name))].filter((n) => n !== widget.block);
  return { kf, clicks, isTrust, appItems: [widget.block, ...others].slice(0, 5) };
}

function cursorAt(kf, t) {
  if (t <= kf[0][0]) return [kf[0][1], kf[0][2]];
  for (let i = 1; i < kf.length; i++) {
    const [t1, x1, y1] = kf[i];
    const [t0, x0, y0] = kf[i - 1];
    if (t <= t1) {
      const p = ease(seg(t, t0, t1));
      return [lerp(x0, x1, p), lerp(y0, y1, p)];
    }
  }
  const last = kf[kf.length - 1];
  return [last[1], last[2]];
}

function captionAt(t, widget, isTrust) {
  if (t < 3.6) return ["1", "Shopify admin → Online Store → Themes → Customize"];
  if (t < 6.0) return ["2", "Top dropdown → Products › Default product"];
  if (t < 9.4) return ["3", `Add section → Apps → search “Trust” → “${widget.block}”`];
  if (t < 12.0) return ["4", "Drag ⋮⋮ to move the widget up or down the page"];
  if (t < 17.0) return ["5", isTrust ? `Block settings → Show this widget: ${widget.title}` : `“${widget.block}” block settings`];
  return ["6", `Save: ${widget.title} is live on your store`];
}

/* ------------------------------------------------------------ Shopify admin: Themes */

function ShopifyBag({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: "none" }}>
      <path d="M6 7h12l-1 14H7L6 7z" fill="#95bf47" />
      <path d="M9 7V6a3 3 0 0 1 6 0v1" stroke="#5e8e3e" strokeWidth="1.6" fill="none" />
      <path d="M10.2 16.4c.5.3 1.2.5 1.8.5.9 0 1.4-.4 1.4-1 0-1.3-3-1-3-3 0-1.1.9-1.9 2.3-1.9.6 0 1.1.1 1.4.3" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function ThemesScene({ t }) {
  const nav = ["Home", "Orders", "Products", "Customers", "Marketing", "Discounts", "Content", "Markets", "Analytics"];
  const icons = ["⌂", "⬒", "◈", "☺", "◎", "%", "▤", "◍", "▥"];
  const hot = t > 1.7;
  // Positions below are stage coordinates minus the 30px browser bar.
  return (
    <div style={{ position: "absolute", inset: "30px 0 0 0", background: "#f1f1f1" }}>
      <div style={{ height: 40, background: "#1a1a1a", display: "flex", alignItems: "center", padding: "0 14px", gap: 8 }}>
        <ShopifyBag />
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: "-.01em" }}>shopify</span>
        <div style={{ marginLeft: 150, width: 420, height: 26, borderRadius: 8, background: "#303030", border: "1px solid #474747", color: "#a3a3a3", fontSize: 12, display: "flex", alignItems: "center", padding: "0 10px" }}>⌕&nbsp; Search <span style={{ marginLeft: "auto", fontSize: 10, border: "1px solid #555", borderRadius: 4, padding: "0 4px" }}>CTRL K</span></div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, color: "#e3e3e3", fontSize: 12 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: "#36fba1", color: "#1a1a1a", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>YS</span>
          Your Store
        </div>
      </div>
      <div style={{ position: "absolute", top: 40, left: 0, bottom: 0, width: 200, background: "#ebebeb", padding: "10px 8px", fontSize: 12.5, color: "#303030" }}>
        {nav.map((n, i) => (
          <div key={n} style={{ height: 28, display: "flex", alignItems: "center", gap: 10, padding: "0 10px", fontWeight: 550 }}><span style={{ width: 14, color: "#4a4a4a", fontSize: 13 }}>{icons[i]}</span>{n}</div>
        ))}
        <div style={{ fontSize: 11, color: "#616161", padding: "8px 10px 2px", fontWeight: 600 }}>Sales channels</div>
        <div style={{ height: 28, display: "flex", alignItems: "center", gap: 10, padding: "0 10px", fontWeight: 650 }}><span style={{ width: 14 }}>▣</span>Online Store</div>
        <div style={{ height: 26, display: "flex", alignItems: "center", padding: "0 10px 0 34px", borderRadius: 8, background: "#fff", fontWeight: 650 }}>Themes</div>
        <div style={{ height: 26, display: "flex", alignItems: "center", padding: "0 10px 0 34px", color: "#616161" }}>Preferences</div>
      </div>

      <div style={{ position: "absolute", left: 230, top: 92 - 30, fontSize: 20, fontWeight: 700, lineHeight: "28px" }}>Themes</div>
      <div style={{ position: "absolute", left: 230, top: 136 - 30, width: 700, height: 220, boxSizing: "border-box", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.12)", padding: 18 }}>
        <div style={{ position: "absolute", left: 18, top: 18, width: 280, height: 184, borderRadius: 8, background: "linear-gradient(135deg,#f5ede3,#e9d9c6)", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 12, left: 12, right: 12, height: 10, background: "#fff", borderRadius: 3 }} />
          <div style={{ position: "absolute", top: 34, left: 12, width: 130, height: 110, background: "#c8a98a", borderRadius: 4 }} />
          <div style={{ position: "absolute", top: 34, left: 152, right: 12, height: 12, background: "#fff", borderRadius: 3 }} />
          <div style={{ position: "absolute", top: 54, left: 152, width: 60, height: 10, background: "#fff", borderRadius: 3 }} />
          <div style={{ position: "absolute", top: 76, left: 152, right: 12, height: 18, background: "#222", borderRadius: 3 }} />
        </div>
        <div style={{ position: "absolute", left: 320, top: 22, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Dawn</span>
          <span style={{ fontSize: 11, background: "#cdfed4", color: "#0c5132", borderRadius: 8, padding: "2px 8px", fontWeight: 600 }}>Current theme</span>
        </div>
        <div style={{ position: "absolute", left: 320, top: 50, fontSize: 12, color: "#616161" }}>Last saved: Today · Version 15.0.0</div>
        <div style={{ position: "absolute", right: 128, bottom: 18, width: 34, height: 30, borderRadius: 8, background: "#e3e3e3", display: "flex", alignItems: "center", justifyContent: "center" }}>⋯</div>
        <div style={{ position: "absolute", right: 18, bottom: 18, width: 100, height: 30, borderRadius: 8, background: hot ? "#1a1a1a" : "#303030", color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: hot ? "0 0 0 3px #b4d0ff" : "none" }}>Customize</div>
      </div>
      <div style={{ position: "absolute", left: 230, top: 372 - 30, width: 700, height: 120, background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.12)", padding: "14px 18px", fontSize: 13 }}>
        <b>Theme library</b>
        <div style={{ color: "#616161", fontSize: 12, marginTop: 6 }}>These themes are only visible to you. Switch to another theme by publishing it.</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ theme editor */

function SettingControl({ s, active }) {
  const box = { height: 28, border: `1px solid ${active ? "#2c6ecb" : "#c9cccf"}`, borderRadius: 7, display: "flex", alignItems: "center", padding: "0 8px", fontSize: 11.5, background: "#fff", boxShadow: active ? "0 0 0 2px #cfe0fb" : "none" };
  if (s.type === "checkbox") {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11.5, lineHeight: 1.35, paddingTop: 6 }}>
        <span style={{ width: 15, height: 15, flex: "none", borderRadius: 4, background: s.value ? "#303030" : "#fff", border: `1px solid ${active ? "#2c6ecb" : "#8a8a8a"}`, color: "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.value ? "✓" : ""}</span>
        <span>{s.label}</span>
      </div>
    );
  }
  if (s.type === "color") {
    return <div style={box}><span style={{ width: 18, height: 18, borderRadius: 4, background: s.value, border: "1px solid rgba(0,0,0,.15)", marginRight: 8 }} />{s.value}</div>;
  }
  if (s.type === "range") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#e3e3e3", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "45%", background: "#303030", borderRadius: 2 }} />
          <div style={{ position: "absolute", left: "45%", top: -6, width: 16, height: 16, marginLeft: -8, borderRadius: "50%", background: "#fff", border: `1px solid ${active ? "#2c6ecb" : "#8a8a8a"}` }} />
        </div>
        <div style={{ ...box, width: 50, justifyContent: "center" }}>{s.value}</div>
      </div>
    );
  }
  return (
    <div style={box}>
      <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: s.value ? "#303030" : "#9a9a9a" }}>{s.value || "—"}</span>
      {s.type === "select" && <span style={{ marginLeft: "auto", paddingLeft: 6, color: "#616161" }}>⌄</span>}
    </div>
  );
}

function StoreHeader() {
  return (
    <div style={{ position: "relative", zIndex: 2, height: 36, background: "#fff", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", padding: "0 16px", fontSize: 11.5, gap: 16 }}>
      <span style={{ color: "#666" }}>Home</span><span style={{ color: "#666" }}>Catalog</span>
      <b style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", letterSpacing: ".12em", fontSize: 13 }}>YOUR STORE</b>
      <span style={{ marginLeft: "auto", color: "#666" }}>⌕ &nbsp;♡</span>
    </div>
  );
}

function HomePreview() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ height: 170, borderRadius: 6, background: "linear-gradient(120deg,#3b3355,#8a6f9e)", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 500 }}>Glow, naturally</div>
        <div style={{ fontSize: 11, marginTop: 10, border: "1px solid #fff", padding: "5px 16px" }}>Shop all</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, margin: "16px 0 10px" }}>Featured collection</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {["#ece5dc", "#dfe7ea", "#efe1e1", "#e4e9dc"].map((c) => <div key={c} style={{ height: 110, borderRadius: 4, background: c }} />)}
      </div>
    </div>
  );
}

function ProductPreview({ widget, t, boxW }) {
  const inserted = ease(seg(t, T.inserted, T.inserted + 0.6));
  const dragP = ease(seg(t, T.dragFrom, T.dragTo));
  const widgetH = 250;
  // Content y (inside the preview) of the two sections below the product.
  const relatedTop = lerp(250, 250 + widgetH + 16, dragP);
  const widgetTop = lerp(250 + 136, 250, dragP);
  const scroll = lerp(0, 240, ease(seg(t, T.inserted + 0.1, T.inserted + 0.8))) + lerp(0, -120, dragP);
  const selected = t >= T.inserted && t < T.save + 0.1;

  return (
    <div style={{ position: "absolute", top: 36, left: 16, width: boxW, transform: `translateY(${16 - scroll}px)` }}>
      <div style={{ display: "flex", gap: 20, height: 232 }}>
        <div style={{ width: Math.min(230, boxW * 0.45), flex: "none", height: 230, borderRadius: 6, background: "linear-gradient(160deg,#efe9e1,#d9cdbd)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 70, height: 120, borderRadius: "30px 30px 10px 10px", background: "#f9f6f1", boxShadow: "0 6px 16px rgba(0,0,0,.08)" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: "#888", letterSpacing: ".1em" }}>YOUR STORE</div>
          <div style={{ fontSize: 19, fontWeight: 500, margin: "4px 0 6px" }}>Hydrating Face Serum</div>
          <div style={{ fontSize: 13 }}>Rs. 1,299.00</div>
          <div style={{ fontSize: 10.5, color: "#777", margin: "10px 0 4px" }}>Size</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {["30 ml", "50 ml"].map((s, i) => <span key={s} style={{ border: "1px solid #222", borderRadius: 20, padding: "3px 12px", fontSize: 10.5, background: i === 0 ? "#222" : "#fff", color: i === 0 ? "#fff" : "#222" }}>{s}</span>)}
          </div>
          <div style={{ height: 34, border: "1px solid #222", borderRadius: 3, marginBottom: 6, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>Add to cart</div>
          <div style={{ height: 34, background: "#5a31f4", color: "#fff", borderRadius: 3, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>Buy with Shop Pay</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: relatedTop, left: 0, right: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>You may also like</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {["#ece5dc", "#dfe7ea", "#efe1e1", "#e4e9dc"].map((c) => <div key={c} style={{ height: 80, borderRadius: 4, background: c }} />)}
        </div>
      </div>
      {t >= T.inserted && (
        <div style={{ position: "absolute", top: widgetTop, left: 0, right: 0, height: widgetH * inserted, overflow: "hidden", borderRadius: 6, background: "#f5f8fc" }}>
          <img src={widgetImage(widget)} alt="" style={{ width: "100%", height: widgetH, objectFit: "contain", display: "block", opacity: inserted }} />
          {selected && (
            <div style={{ position: "absolute", inset: 0, border: "2px solid #2c6ecb", borderRadius: 6, pointerEvents: "none" }}>
              <span style={{ position: "absolute", top: 0, left: 0, background: "#2c6ecb", color: "#fff", fontSize: 10.5, padding: "2px 8px", borderBottomRightRadius: 6, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, ...logoIconStyle }} />{widget.block}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditorScene({ widget, script, t }) {
  const loaded = t >= T.loaded;
  const product = t >= T.pick;
  const reloading = t >= T.pick && t < T.pick + 0.4;
  const menuOpen = t >= T.menu && t < T.pick;
  const pickerOpen = t >= T.addSection && t < T.inserted;
  const appsTab = t >= T.appsTab;
  const typed = "Trust".slice(0, Math.floor(seg(t, T.typeFrom, T.typeTo) * 5));
  const added = t >= T.inserted;
  const dragP = ease(seg(t, T.dragFrom, T.dragTo));
  const dragging = t >= T.dragFrom && t < T.release;
  const panelP = ease(seg(t, T.panel, T.panel + 0.5));
  const panelOpen = t >= T.panel;
  const selOpen = script.isTrust && t >= T.selOpen && t < T.selPick;
  const saved = t >= T.save;
  const savedToast = t >= T.save + 0.1 && t < T.end + 0.4;

  const settings = widget.blockSettings.map((s, i) =>
    script.isTrust && i === 0 && t >= T.selPick ? { ...s, value: widget.title } : s,
  );
  const shown = settings.slice(0, 4);
  const hoverField = !script.isTrust && shown.length > 0 && t >= 12.4 && t < 15
    ? Math.round(seg(t, 12.4, 14.8) * (shown.length - 1))
    : -1;

  // Sidebar rows. After the block is added: 4 Apps, 5 block, 6 Add block,
  // 7 Add section, 8 Footer — and the Apps group is dragged one row up.
  const top = (i) => {
    if (!added) return i * ROW;
    if (i === 3) return 3 * ROW + 3 * ROW * dragP;
    if (i >= 4 && i <= 6) return i * ROW - ROW * dragP;
    return i * ROW;
  };
  const row = (i, style, children, key = i) => (
    <div key={key} style={{ position: "absolute", left: 0, right: 0, top: top(i), height: ROW, display: "flex", alignItems: "center", gap: 7, fontSize: 12, ...style }}>{children}</div>
  );
  const groupBg = dragging ? "#f6f6f7" : "#fff";
  const icon = (c) => <span style={{ color: "#8a8a8a", width: 14 }}>{c}</span>;
  const addHot = t >= 6.0 && t < T.inserted;

  let rows;
  if (!product) {
    rows = [
      row(0, { paddingLeft: 14 }, <>{icon("▭")}Header</>),
      row(1, { paddingLeft: 14, color: "#8a8a8a", fontSize: 10.5, fontWeight: 600, alignItems: "flex-end", paddingBottom: 4 }, "Template"),
      row(2, { paddingLeft: 14 }, <>{icon("›")}Image banner</>),
      row(3, { paddingLeft: 14 }, <>{icon("›")}Featured collection</>),
      row(4, { paddingLeft: 14 }, <>{icon("›")}Rich text</>),
      row(5, { paddingLeft: 14, color: "#005bd3" }, "⊕  Add section"),
      row(6, { paddingLeft: 14, borderTop: "1px solid #eee" }, <>{icon("▭")}Footer</>),
    ];
  } else if (!added) {
    rows = [
      row(0, { paddingLeft: 14 }, <>{icon("▭")}Header</>),
      row(1, { paddingLeft: 14, color: "#8a8a8a", fontSize: 10.5, fontWeight: 600, alignItems: "flex-end", paddingBottom: 4 }, "Template"),
      row(2, { paddingLeft: 14 }, <>{icon("›")}Product information</>),
      row(3, { paddingLeft: 14 }, <>{icon("›")}Related products</>),
      row(4, { paddingLeft: 14, color: "#005bd3", background: addHot ? "#f0f5ff" : "#fff", fontWeight: addHot ? 600 : 400 }, "⊕  Add section"),
      row(5, { paddingLeft: 14, borderTop: "1px solid #eee" }, <>{icon("▭")}Footer</>),
    ];
  } else {
    rows = [
      row(0, { paddingLeft: 14 }, <>{icon("▭")}Header</>),
      row(1, { paddingLeft: 14, color: "#8a8a8a", fontSize: 10.5, fontWeight: 600, alignItems: "flex-end", paddingBottom: 4 }, "Template"),
      row(2, { paddingLeft: 14 }, <>{icon("›")}Product information</>),
      row(3, { paddingLeft: 14, background: "#fff" }, <>{icon("›")}Related products</>),
      row(4, { paddingLeft: 14, background: groupBg, boxShadow: dragging ? "0 4px 12px rgba(0,0,0,.12)" : "none", zIndex: 2 },
        <>{icon("⌄")}Apps<span style={{ marginLeft: "auto", marginRight: 12, color: t >= 9.8 && t < 12 ? "#303030" : "#b5b5b5", letterSpacing: -2 }}>⋮⋮</span></>),
      row(5, { paddingLeft: 30, background: "#eaf1ff", borderLeft: "3px solid #2c6ecb", fontWeight: 600, zIndex: 2 },
        <><span style={{ width: 14, height: 14, borderRadius: 3, flex: "none", ...logoIconStyle }} /><span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{widget.block}</span></>),
      row(6, { paddingLeft: 36, color: "#005bd3", background: groupBg, zIndex: 2 }, "⊕  Add block"),
      row(7, { paddingLeft: 14, color: "#005bd3" }, "⊕  Add section"),
      row(8, { paddingLeft: 14, borderTop: "1px solid #eee" }, <>{icon("▭")}Footer</>),
    ];
  }

  const previewW = panelOpen ? 636 - 240 * panelP : 636;

  return (
    <div style={{ position: "absolute", inset: "30px 0 0 0", background: "#f1f1f1", opacity: seg(t, T.editorIn, T.editorIn + 0.3) }}>
      {/* top bar */}
      <div style={{ height: 44, background: "#fff", borderBottom: "1px solid #e3e3e3", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 12.5, position: "relative" }}>
        <span style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>←</span>
        <span style={{ fontWeight: 650, marginLeft: 4 }}>Dawn</span>
        <span style={{ marginLeft: 8, fontSize: 10.5, background: "#cdfed4", color: "#0c5132", borderRadius: 8, padding: "1px 7px", fontWeight: 600 }}>Live</span>
        <span style={{ marginLeft: 8, color: "#8a8a8a" }}>⋯</span>
        <div style={{ position: "absolute", left: 370, width: 220, height: 30, top: 7, border: `1px solid ${menuOpen ? "#8a8a8a" : "#c9cccf"}`, borderRadius: 8, display: "flex", alignItems: "center", padding: "0 10px", fontSize: 11.5, background: menuOpen ? "#f6f6f7" : "#fff" }}>
          {product ? "▭" : "⌂"}&nbsp; {product ? TEMPLATE_OPTIONS[1] : TEMPLATE_OPTIONS[0]} <span style={{ marginLeft: "auto" }}>⌄</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", color: "#616161" }}>
          <span style={{ width: 26, height: 26, borderRadius: 6, background: "#f1f1f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🖥</span>
          <span style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📱</span>
          <span style={{ width: 22, textAlign: "center", color: added ? "#303030" : "#c9c9c9" }}>↶</span>
          <span style={{ width: 22, textAlign: "center", color: "#c9c9c9" }}>↷</span>
          <div style={{ width: 64, height: 30, marginLeft: 4, borderRadius: 8, background: saved || !added ? "#e3e3e3" : "#303030", color: saved || !added ? "#8a8a8a" : "#fff", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{saved ? "Saved" : "Save"}</div>
        </div>
        {(!loaded || reloading) && <div style={{ position: "absolute", left: 0, bottom: -2, height: 2, width: `${(loaded ? seg(t, T.pick, T.pick + 0.4) : seg(t, T.editorIn, T.loaded)) * 100}%`, background: "#2c6ecb" }} />}
      </div>

      {/* icon rail */}
      <div style={{ position: "absolute", top: 44, left: 0, width: 48, bottom: 0, background: "#fff", borderRight: "1px solid #e3e3e3" }}>
        {[["▤", 26, true], ["⚙", 66, false], ["⧉", 106, false]].map(([c, y, on]) => (
          <div key={y} style={{ position: "absolute", top: y - 16, left: 8, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#303030", background: on ? "#e3e3e3" : "transparent" }}>{c}</div>
        ))}
      </div>

      {/* sidebar */}
      <div style={{ position: "absolute", top: 44, left: 48, width: 252, bottom: 0, background: "#fff", borderRight: "1px solid #e3e3e3", overflow: "hidden" }}>
        <div style={{ height: 30, display: "flex", alignItems: "center", fontWeight: 650, fontSize: 13, padding: "0 12px" }}>{product ? "Default product" : "Home page"}</div>
        {!loaded ? (
          <div style={{ padding: "6px 14px" }}>
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ height: 12, width: `${60 + (i * 13) % 35}%`, background: "#ececec", borderRadius: 4, margin: "10px 0" }} />)}
          </div>
        ) : (
          <div style={{ position: "relative" }}>{rows}</div>
        )}
      </div>

      {/* preview */}
      <div style={{ position: "absolute", top: 56, left: 312, width: previewW, bottom: 12, background: "#fff", borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,.15)", overflow: "hidden" }}>
        {loaded && <StoreHeader />}
        {!loaded || reloading ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", zIndex: 3 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #e3e3e3", borderTopColor: "#616161", transform: `rotate(${t * 720}deg)` }} />
          </div>
        ) : product ? (
          <ProductPreview widget={widget} t={t} boxW={previewW - 32} />
        ) : (
          <HomePreview />
        )}
      </div>

      {/* template dropdown */}
      {menuOpen && (
        <div style={{ position: "absolute", left: 370, top: 40, width: 250, background: "#fff", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,.2)", padding: 4, fontSize: 12, zIndex: 5 }}>
          {TEMPLATE_OPTIONS.map((o, i) => {
            const hover = i === 1 && t >= 4.9;
            return <div key={o} style={{ height: 30, display: "flex", alignItems: "center", padding: "0 10px", borderRadius: 6, background: hover ? "#f1f1f1" : "transparent", fontWeight: i === 0 || hover ? 600 : 400 }}>{i === 0 ? "✓ " : ""}{o}</div>;
          })}
        </div>
      )}

      {/* Add section picker */}
      {pickerOpen && (
        <div style={{ position: "absolute", left: PICKER.x, top: PICKER.y - 30, width: PICKER.w, boxSizing: "border-box", background: "#fff", borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,.22)", padding: 10, fontSize: 12, zIndex: 5 }}>
          <div style={{ height: 28, border: `1px solid ${typed ? "#2c6ecb" : "#c9cccf"}`, borderRadius: 7, display: "flex", alignItems: "center", padding: "0 8px", color: typed ? "#222" : "#9a9a9a" }}>
            ⌕&nbsp;{typed || "Search sections"}{appsTab && t < 8.2 && <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0 }}>|</span>}
          </div>
          <div style={{ display: "flex", gap: 6, height: 26, marginTop: 8, alignItems: "center" }}>
            <span style={{ padding: "4px 10px", borderRadius: 6, background: appsTab ? "transparent" : "#e3e3e3", fontWeight: 600 }}>Sections</span>
            <span style={{ padding: "4px 10px", borderRadius: 6, background: appsTab ? "#e3e3e3" : "transparent", fontWeight: 600 }}>Apps</span>
          </div>
          {appsTab ? (
            <>
              <div style={{ height: 24, display: "flex", alignItems: "center", gap: 6, marginTop: 10, color: "#616161", fontSize: 11, fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, ...logoIconStyle }} />Trust Reviews
              </div>
              {script.appItems.map((b, i) => (
                <div key={b} style={{ height: 30, display: "flex", alignItems: "center", gap: 8, padding: "0 8px", borderRadius: 6, background: i === 0 && t >= 8.1 ? "#f1f1f1" : "transparent", fontWeight: i === 0 ? 600 : 400 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 4, flex: "none", ...logoIconStyle }} />{b}
                </div>
              ))}
            </>
          ) : (
            <div style={{ marginTop: 10 }}>
              {["Image banner", "Image with text", "Rich text", "Multicolumn", "Collapsible content", "Video"].map((b) => (
                <div key={b} style={{ height: 30, display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}><span style={{ color: "#8a8a8a" }}>▭</span>{b}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* block settings panel */}
      {panelOpen && (
        <div style={{ position: "absolute", top: 44, right: 0, width: 240, bottom: 0, background: "#fff", borderLeft: "1px solid #e3e3e3", transform: `translateX(${(1 - panelP) * 240}px)`, padding: "12px 14px", fontSize: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 34 }}>
            <span style={{ width: 20, height: 20, borderRadius: 5, flex: "none", ...logoIconStyle }} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 650, fontSize: 12.5 }}>{widget.block}</div>
              <div style={{ color: "#8a8a8a", fontSize: 10 }}>Trust Reviews</div>
            </div>
          </div>
          {shown.length === 0 ? (
            <div style={{ marginTop: 16, background: "#f6f6f8", borderRadius: 8, padding: 10, lineHeight: 1.5, color: "#4a4a4a", fontSize: 11.5 }}>
              This block has no settings here. Its design comes from <b>Trust Reviews → Widgets → {widget.title}</b>.
            </div>
          ) : (
            <div style={{ position: "absolute", top: 58, left: 14, right: 14 }}>
              {shown.map((s, i) => (
                <div key={s.label} style={{ position: "absolute", top: i * 56, left: 0, right: 0 }}>
                  {s.type !== "checkbox" && <div style={{ fontSize: 11.5, fontWeight: 550, height: 16, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>}
                  <SettingControl s={s} active={(script.isTrust && i === 0 && (selOpen || (t >= T.selPick && t < T.selPick + 1))) || hoverField === i} />
                </div>
              ))}
            </div>
          )}
          {selOpen && (
            <div style={{ position: "absolute", left: 14, right: 14, top: fieldY(0) - 74 + 18, background: "#fff", boxShadow: "0 6px 20px rgba(0,0,0,.22)", borderRadius: 8, padding: 4, zIndex: 3, fontSize: 11.5 }}>
              {["Auto (installed from app)", widget.title, "Custom Template (Customize)"].filter((v, i, a) => a.indexOf(v) === i).map((o, i) => (
                <div key={o} style={{ height: 26, display: "flex", alignItems: "center", padding: "0 8px", borderRadius: 5, background: i === 1 && t >= 13.4 ? "#eaf1ff" : "transparent", fontWeight: i === 1 ? 600 : 400 }}>{i === 0 ? "✓ " : ""}{o}</div>
              ))}
            </div>
          )}
          <div style={{ position: "absolute", bottom: 14, left: 14, color: "#c70a24", fontSize: 11.5 }}>🗑 Remove block</div>
        </div>
      )}

      {savedToast && <div style={{ position: "absolute", left: "50%", bottom: 70, transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13 }}>Saved</div>}
    </div>
  );
}

/* ------------------------------------------------------------ stage */

function BrowserBar({ t }) {
  const editor = t >= T.customize + 0.2;
  const url = editor ? "admin.shopify.com/store/your-store/themes/current/editor" : "admin.shopify.com/store/your-store/themes";
  return (
    <div style={{ height: 30, background: "#dee1e6", display: "flex", alignItems: "center", padding: "0 10px", gap: 6 }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, flex: "none" }} />)}
      <div style={{ display: "flex", marginLeft: 8, alignSelf: "stretch" }}>
        <div style={{ height: 24, marginTop: 6, width: 180, borderRadius: "8px 8px 0 0", background: "#fff", display: "flex", alignItems: "center", gap: 6, padding: "0 10px", fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden" }}>
          <ShopifyBag size={12} />{editor ? "Customize Dawn · Shopify" : "Themes · Your Store · Shopify"}
        </div>
      </div>
      <div style={{ marginLeft: 10, flex: 1, minWidth: 0, height: 20, borderRadius: 10, background: "#fff", fontSize: 10.5, color: "#555", display: "flex", alignItems: "center", padding: "0 10px", whiteSpace: "nowrap", overflow: "hidden" }}>🔒&nbsp;{url}</div>
    </div>
  );
}

function Stage({ widget, t }) {
  const script = buildScript(widget);
  const [cx, cy] = cursorAt(script.kf, t);
  const [step, caption] = captionAt(t, widget, script.isTrust);
  const finalP = seg(t, T.end, T.end + 0.4);
  const pressing = script.clicks.some((c) => t >= c && t < c + 0.12) || (t >= T.dragFrom && t < T.release);

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, background: "#dcdcdc", fontFamily: FONT, color: "#303030", overflow: "hidden", userSelect: "none" }}>
      <BrowserBar t={t} />
      {t < T.editorIn + 0.3 && <ThemesScene t={t} />}
      {t >= T.editorIn && <EditorScene widget={widget} script={script} t={t} />}

      {script.clicks.map((c) => {
        const p = (t - c) / 0.45;
        if (p < 0 || p > 1) return null;
        const r = 8 + 20 * p;
        const [x, y] = cursorAt(script.kf, c);
        return <div key={c} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", border: "2px solid rgba(44,110,203,.8)", opacity: 1 - p, pointerEvents: "none", zIndex: 9 }} />;
      })}

      <svg width="22" height="26" viewBox="0 0 22 26" style={{ position: "absolute", left: cx - 3, top: cy - 2, filter: "drop-shadow(0 1px 2px rgba(0,0,0,.4))", zIndex: 10, transform: `scale(${pressing ? 0.88 : 1})`, transformOrigin: "3px 2px" }}>
        <path d="M3 2 L3 20 L8 15.5 L11.5 23 L14.5 21.6 L11 14.4 L18 14.4 Z" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>

      {finalP < 1 && (
        <div style={{ position: "absolute", left: "50%", bottom: 16, transform: "translateX(-50%)", background: "rgba(17,17,24,.88)", color: "#fff", borderRadius: 999, padding: "8px 18px 8px 8px", fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap", zIndex: 11, opacity: 1 - finalP, maxWidth: 920, overflow: "hidden" }}>
          <span style={{ width: 26, height: 26, flex: "none", borderRadius: "50%", background: "#4C6FFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{step}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{caption}</span>
        </div>
      )}

      {finalP > 0 && (
        <div style={{ position: "absolute", inset: 0, background: `rgba(17,17,24,${0.55 * finalP})`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 12 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "26px 36px", textAlign: "center", transform: `scale(${0.9 + 0.1 * finalP})`, opacity: finalP, boxShadow: "0 20px 50px rgba(0,0,0,.3)" }}>
            <div style={{ position: "relative", width: 56, height: 56, margin: "0 auto 12px" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, ...logoIconStyle }} />
              <div style={{ position: "absolute", right: -6, bottom: -6, width: 22, height: 22, borderRadius: "50%", background: "#1f7a4d", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>✓</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{widget.title} installed</div>
            <div style={{ fontSize: 14, color: "#666", marginTop: 6 }}>Added in Shopify Customize and saved</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ player */

const fmt = (s) => `0:${String(Math.floor(s)).padStart(2, "0")}`;

export default function InstallVideo({ widget, autoPlay = false, className }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const tRef = useRef(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Restart when switching to another widget.
  useEffect(() => {
    tRef.current = 0;
    setT(0);
    setPlaying(autoPlay);
  }, [widget.key, autoPlay]);

  useEffect(() => {
    if (!playing) return;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const next = Math.min(DURATION, tRef.current + (now - last) / 1000);
      last = now;
      tRef.current = next;
      setT(next);
      if (next >= DURATION) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const toggle = () => {
    if (!playing && tRef.current >= DURATION) {
      tRef.current = 0;
      setT(0);
    }
    setPlaying((p) => !p);
  };

  const seek = (v) => {
    tRef.current = v;
    setT(v);
  };

  const started = playing || t > 0;

  return (
    <div className={className} style={{ borderRadius: 12, overflow: "hidden", background: "#111", boxShadow: "0 10px 30px rgba(20,20,40,.18)" }}>
      <div ref={wrapRef} onClick={toggle} style={{ position: "relative", width: "100%", paddingTop: `${(H / W) * 100}%`, overflow: "hidden", cursor: "pointer" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <Stage widget={widget} t={t} />
        </div>
        {!started && (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.55))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", gap: 10 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(76,111,255,.95)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(0,0,0,.35)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#fff" /></svg>
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, textShadow: "0 1px 4px rgba(0,0,0,.5)" }}>How to install {widget.title} · 0:20</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#17171c", color: "#fff", fontSize: 12 }}>
        <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} style={{ background: "none", border: 0, color: "#fff", cursor: "pointer", padding: 4, display: "flex" }}>
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
          )}
        </button>
        <button type="button" onClick={() => { seek(0); setPlaying(true); }} aria-label="Restart" style={{ background: "none", border: 0, color: "#fff", cursor: "pointer", padding: 4, fontSize: 14 }}>↺</button>
        <input type="range" min={0} max={DURATION} step={0.05} value={t} onChange={(e) => seek(Number(e.target.value))} aria-label="Seek" style={{ flex: 1, accentColor: "#4C6FFF" }} />
        <span style={{ fontVariantNumeric: "tabular-nums", color: "#bbb" }}>{fmt(t)} / {fmt(DURATION)}</span>
      </div>
    </div>
  );
}
