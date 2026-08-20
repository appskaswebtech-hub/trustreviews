import { useState } from "react";
import { Link, useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { SHELL_C, ToggleField, TextFieldInput, Field } from "../components/WidgetCustomizeShell";

const DEFAULT_MESSAGE = "Thanks for your review! Use the code below to save on your next order.";

// ─── Loader ────────────────────────────────────────────────────────────────────
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const coupon = await prisma.reviewCoupon.findUnique({ where: { shop: session.shop } });

  return {
    enabled: coupon?.enabled ?? false,
    code:    coupon?.code    ?? "",
    message: coupon?.message ?? DEFAULT_MESSAGE,
  };
}

// ─── Action ────────────────────────────────────────────────────────────────────
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const body = await request.json();

  const enabled = Boolean(body.enabled);
  const code = String(body.code || "").trim();
  const message = String(body.message || "").trim() || DEFAULT_MESSAGE;

  await prisma.reviewCoupon.upsert({
    where: { shop: session.shop },
    update: { enabled: enabled && Boolean(code), code, message },
    create: { shop: session.shop, enabled: enabled && Boolean(code), code, message },
  });

  return { success: true, enabled: enabled && Boolean(code) };
}

// ─── Preview ───────────────────────────────────────────────────────────────────
function CouponPreview({ enabled, code, message }) {
  if (!enabled || !code) {
    return (
      <div style={{
        border: `1px dashed ${SHELL_C.border}`, borderRadius: 12, padding: "28px 24px",
        textAlign: "center", color: SHELL_C.muted, fontSize: 13,
      }}>
        Turn this on and set a code to see what customers will get after submitting a review.
      </div>
    );
  }
  return (
    <div style={{
      background: SHELL_C.surface, border: `1px solid ${SHELL_C.border}`, borderRadius: 12,
      padding: "24px 26px", textAlign: "center",
    }}>
      <div style={{ fontSize: 13, color: SHELL_C.text, marginBottom: 16, lineHeight: 1.6 }}>{message}</div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        border: `1.5px dashed ${SHELL_C.accent}`, borderRadius: 9, padding: "10px 16px",
        background: SHELL_C.accentLt,
      }}>
        <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 600, color: SHELL_C.text, letterSpacing: ".04em" }}>{code}</span>
        <span style={{
          fontSize: 11.5, fontWeight: 600, color: "#fff", background: SHELL_C.accent,
          borderRadius: 6, padding: "5px 11px",
        }}>Copy</span>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ReviewCouponSettings() {
  const initial = useLoaderData();
  const fetcher = useFetcher();

  const [enabled, setEnabled] = useState(initial.enabled);
  const [code, setCode]       = useState(initial.code);
  const [message, setMessage] = useState(initial.message);
  const [saved, setSaved]     = useState(false);

  const save = () => {
    fetcher.submit(
      { enabled, code, message },
      { method: "POST", encType: "application/json" },
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
            <span style={{ fontSize: 13, fontWeight: 600, color: SHELL_C.text }}>Review Coupon</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saved && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 12, fontWeight: 600, color: SHELL_C.green,
              background: SHELL_C.greenLt, padding: "4px 12px", borderRadius: 20,
            }}>
              Saved
            </span>
          )}
          <button
            onClick={save}
            disabled={enabled && !code.trim()}
            style={{
              border: "none", borderRadius: 8, padding: "8px 20px",
              background: SHELL_C.accent, color: "#fff",
              fontWeight: 600, fontSize: 13, cursor: enabled && !code.trim() ? "default" : "pointer",
              opacity: enabled && !code.trim() ? 0.5 : 1,
            }}
          >
            Save
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: SHELL_C.text, margin: "0 0 6px" }}>Review Coupon</h2>
          <p style={{ fontSize: 13, color: SHELL_C.muted, margin: 0, lineHeight: 1.6 }}>
            Reward customers for reviewing. When this is on, a discount code you've already created in
            Shopify Discounts is shown to the customer right after they submit a review, ready to copy and use.
          </p>
        </div>

        <div style={{
          background: SHELL_C.surface, border: `1px solid ${SHELL_C.border}`, borderRadius: 14,
          padding: 22, marginBottom: 20, display: "flex", flexDirection: "column", gap: 18,
        }}>
          <ToggleField
            label="Show a coupon after a review is submitted"
            checked={enabled}
            onChange={setEnabled}
          />

          <TextFieldInput
            label="Discount code"
            value={code}
            onChange={setCode}
            placeholder="e.g. THANKYOU10"
            helpText="This must already exist as an active discount in Shopify Admin → Discounts. This page only displays it — it doesn't create or manage the discount itself."
          />

          <Field label="Message shown with the code" helpText="Keep it short — it's shown right above the code.">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              style={{
                width: "100%", border: `1px solid ${SHELL_C.border}`, borderRadius: 8,
                padding: "9px 11px", fontSize: 13, fontFamily: "inherit", color: SHELL_C.text,
                resize: "vertical", boxSizing: "border-box",
              }}
            />
          </Field>
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 600, color: SHELL_C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
          What the customer sees
        </div>
        <CouponPreview enabled={enabled} code={code} message={message} />
      </div>
    </div>
  );
}
