// app/utils/dialogs.js
// Replacements for the browser's confirm() / alert(), which Shopify's design
// guidelines don't allow inside an embedded app. Client-only: call these from
// event handlers, never during render.

const FONT = "var(--app-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)";

function el(tag, style, text) {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text != null) node.textContent = text;
  return node;
}

/**
 * Modal confirmation. Resolves true when confirmed, false on cancel / Esc / backdrop click.
 * `await confirmDialog("Delete this?", { confirmLabel: "Delete", destructive: true })`
 */
export function confirmDialog(message, { title = "Are you sure?", confirmLabel = "Confirm", cancelLabel = "Cancel", destructive = false } = {}) {
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    const backdrop = el("div", {
      position: "fixed", inset: "0", zIndex: "2147483000", background: "rgba(23,32,42,.55)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: FONT,
    });
    const box = el("div", {
      width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "14px", padding: "20px",
      boxShadow: "0 24px 60px rgba(23,32,42,.25)",
    });
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", title);
    box.appendChild(el("div", { fontSize: "16px", fontWeight: "650", color: "#1a1a1a", marginBottom: "8px" }, title));
    box.appendChild(el("div", { fontSize: "14px", lineHeight: "1.5", color: "#4a4a4a", marginBottom: "18px" }, message));

    const row = el("div", { display: "flex", justifyContent: "flex-end", gap: "8px" });
    const btn = (label, bg, color, border) => el("button", {
      padding: "8px 16px", borderRadius: "8px", border: border || "1px solid transparent", background: bg, color,
      fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: FONT,
    }, label);
    const cancelBtn = btn(cancelLabel, "#fff", "#1a1a1a", "1px solid #c9cccf");
    const okBtn = btn(confirmLabel, destructive ? "#d72c0d" : "#303030", "#fff");
    cancelBtn.type = okBtn.type = "button";
    row.append(cancelBtn, okBtn);
    box.appendChild(row);
    backdrop.appendChild(box);

    function done(result) {
      document.removeEventListener("keydown", onKey, true);
      backdrop.remove();
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      resolve(result);
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); done(false); }
      else if (e.key === "Tab") { // keep focus inside the dialog
        e.preventDefault();
        (document.activeElement === okBtn ? cancelBtn : okBtn).focus();
      }
    }
    cancelBtn.addEventListener("click", () => done(false));
    okBtn.addEventListener("click", () => done(true));
    backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) done(false); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(backdrop);
    okBtn.focus();
  });
}

const TONES = {
  info:     { bg: "#eaf4ff", border: "#a4d0ff", icon: "#0b69d4", label: "Information" },
  success:  { bg: "#e3f5e9", border: "#95d5aa", icon: "#047b5d", label: "Success" },
  warning:  { bg: "#fff5d6", border: "#f0c24b", icon: "#8a6116", label: "Warning" },
  critical: { bg: "#fee9e8", border: "#f5a8a3", icon: "#c70a24", label: "Error" },
};

/**
 * Dismissible banner pinned to the top of the app, per Shopify's alert
 * guidelines (info = blue, success = green, warning = yellow, critical = red).
 * Stays until dismissed. `showBanner("Could not save.", { tone: "critical" })`
 */
export function showBanner(message, { tone = "info", title } = {}) {
  if (typeof document === "undefined") return;
  const t = TONES[tone] || TONES.info;
  const wrap = el("div", {
    position: "fixed", top: "12px", left: "50%", transform: "translateX(-50%)", zIndex: "2147483000",
    width: "calc(100% - 32px)", maxWidth: "640px", background: t.bg, border: `1px solid ${t.border}`,
    borderRadius: "12px", padding: "12px 14px", display: "flex", gap: "10px", alignItems: "flex-start",
    boxShadow: "0 8px 24px rgba(0,0,0,.12)", fontFamily: FONT,
  });
  wrap.setAttribute("role", tone === "critical" ? "alert" : "status");
  wrap.appendChild(el("span", { width: "10px", height: "10px", borderRadius: "50%", background: t.icon, flex: "none", marginTop: "5px" }));
  const body = el("div", { flex: "1", fontSize: "14px", lineHeight: "1.45", color: "#1a1a1a" });
  body.appendChild(el("div", { fontWeight: "650" }, title || t.label));
  body.appendChild(el("div", {}, message));
  const close = el("button", { border: "0", background: "transparent", cursor: "pointer", fontSize: "18px", lineHeight: "1", color: "#4a4a4a", padding: "0 2px" }, "×");
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss");
  close.addEventListener("click", () => wrap.remove());
  wrap.append(body, close);
  document.body.appendChild(wrap);
}

/**
 * Non-blocking message. Success uses an App Bridge toast (short, top center).
 * Errors use a dismissible red banner: Shopify's guidelines say toasts
 * shouldn't carry errors.
 */
export function notify(message, { isError = false } = {}) {
  if (typeof document === "undefined") return;
  if (isError) { showBanner(message, { tone: "critical" }); return; }
  try {
    if (window.shopify?.toast?.show) { window.shopify.toast.show(message, { duration: 5000 }); return; }
  } catch { /* fall through to the snackbar */ }
  const bar = el("div", {
    position: "fixed", left: "50%", top: "16px", transform: "translateX(-50%)", zIndex: "2147483000",
    background: "#303030", color: "#fff", padding: "10px 16px", borderRadius: "8px",
    fontSize: "14px", fontFamily: FONT, boxShadow: "0 8px 24px rgba(0,0,0,.25)", maxWidth: "90vw",
  }, message);
  bar.setAttribute("role", "status");
  document.body.appendChild(bar);
  setTimeout(() => bar.remove(), 5000);
}
