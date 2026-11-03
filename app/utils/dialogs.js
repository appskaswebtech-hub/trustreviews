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

/** Non-blocking message: App Bridge toast when available, otherwise a small snackbar. */
export function notify(message, { isError = false } = {}) {
  if (typeof document === "undefined") return;
  try {
    if (window.shopify?.toast?.show) { window.shopify.toast.show(message, { isError, duration: 5000 }); return; }
  } catch { /* fall through to the snackbar */ }
  const bar = el("div", {
    position: "fixed", left: "50%", bottom: "24px", transform: "translateX(-50%)", zIndex: "2147483000",
    background: isError ? "#d72c0d" : "#303030", color: "#fff", padding: "10px 16px", borderRadius: "8px",
    fontSize: "14px", fontFamily: FONT, boxShadow: "0 8px 24px rgba(0,0,0,.25)", maxWidth: "90vw",
  }, message);
  bar.setAttribute("role", "status");
  document.body.appendChild(bar);
  setTimeout(() => bar.remove(), 5000);
}
