// app/routes/app.billing.jsx

import { useLoaderData, useNavigation, useFetcher } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  getShopPlan,
  createSubscription,
  cancelSubscription,
  syncSubscriptionStatus,
  isDevStore,
} from "../billing.server";

/* ── Required by React Router v7 in production ── */
export function headers() {
  return {};
}

export function ErrorBoundary() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#a5423b" }}>
        Something went wrong on the billing page.
      </div>
    </div>
  );
}

/* ── Loader ── */
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  await getShopPlan(session.shop);

  const dev = await isDevStore(admin);

  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");
  if (chargeId) {
    await syncSubscriptionStatus(admin, session.shop);
  }

  const activePlan = await syncSubscriptionStatus(admin, session.shop);
  return { plan: activePlan, isDevStore: dev };
};

/* ── Action ── */
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  const dev = await isDevStore(admin);
  if (dev) return { error: "Dev stores do not require a subscription." };

  if (actionType === "subscribe") {
    const appUrl = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "");
    const apiKey = process.env.SHOPIFY_API_KEY;
    if (!appUrl) throw new Error("SHOPIFY_APP_URL is not set in .env");
    if (!apiKey) throw new Error("SHOPIFY_API_KEY is not set in .env");

    const storeName = session.shop.replace(".myshopify.com", "");
    const returnUrl = `https://admin.shopify.com/store/${storeName}/apps/${apiKey}/app/billing`;

    console.log("[billing] returnUrl:", returnUrl);

    const { confirmationUrl, subscriptionId } = await createSubscription(
      admin,
      session.shop,
      returnUrl,
    );

    console.log("[billing] confirmationUrl:", confirmationUrl);

    await db.shopPlan.upsert({
      where: { shop: session.shop },
      update: { subscriptionId, status: "active" },
      create: { shop: session.shop, plan: "free", subscriptionId, status: "active" },
    });

    return { confirmationUrl };
  }

  if (actionType === "cancel") {
    const shopPlan = await db.shopPlan.findUnique({ where: { shop: session.shop } });
    if (shopPlan?.subscriptionId) {
      await cancelSubscription(admin, shopPlan.subscriptionId);
    }
    await db.shopPlan.update({
      where: { shop: session.shop },
      data: { plan: "free", subscriptionId: null, status: "active" },
    });
    return redirect("/app/billing");
  }

  return null;
};

/* ── Styles ── */
const C = {
  bg: "#f6f6f8", surface: "#ffffff", border: "#e5e4ec",
  text: "#17171c", muted: "#6b6b78", accent: "#111827",
};

/* ── Page ── */
export default function BillingPage() {
  const { plan, isDevStore: devStore } = useLoaderData();
  const fetcher = useFetcher();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle" || fetcher.state !== "idle";
  const isAdvanced = plan === "advanced";

  if (fetcher.data?.confirmationUrl) {
    window.top.location.href = fetcher.data.confirmationUrl;
  }

  const handleSubscribe = () => {
    const fd = new FormData();
    fd.append("actionType", "subscribe");
    fetcher.submit(fd, { method: "post" });
  };

  const handleCancel = () => {
    if (!confirm("Downgrade to Free? You'll lose Advanced features.")) return;
    const fd = new FormData();
    fd.append("actionType", "cancel");
    fetcher.submit(fd, { method: "post" });
  };

  return (
    <div style={{
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      background: C.bg,
      minHeight: "100vh",
      padding: "48px 28px",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: C.text, margin: "0 0 8px" }}>
          Pricing
        </h1>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 28px" }}>
          Choose the plan that fits your store.
        </p>

        {devStore && (
          <div style={{
            background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 10,
            padding: "12px 18px", marginBottom: 24, fontSize: 13,
            color: "#1e40af", fontWeight: 600,
          }}>
            Development store detected — <strong>Advanced plan is free</strong> for development and testing.
          </div>
        )}

        {!devStore && isAdvanced && (
          <div style={{
            background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 10,
            padding: "12px 18px", marginBottom: 24, fontSize: 13,
            color: "#065f46", fontWeight: 600,
          }}>
            ✓ You are currently on the <strong>Advanced</strong> plan.
          </div>
        )}

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
          <PlanCard
            name="Free"
            price={null}
            features={[
              "All core review widgets & group products",
              "Review Wall, Homepage Reviews (5 layouts)",
              "Questions & Answers widget",
              "CSV import/export, bulk moderation actions",
              "15-language storefront",
              "Custom CSS/JS code injection",
              "PageFly & GemPages support",
              "SEO Schema & Tags",
            ]}
            isCurrent={!isAdvanced}
            badge={null}
            action={
              devStore ? null
              : isAdvanced
                ? { label: "Downgrade to Free", onClick: handleCancel, variant: "outline" }
                : null
            }
            isLoading={isLoading}
          />
          <PlanCard
            name="Advanced"
            price={9.99}
            features={[
              "Priority customer support",
              "Automatic feature updates",
              "High-performance and scalable setup",
              "Review-Reward Coupon thank-you discount",
              "All integrations — Klaviyo, Mailchimp, etc.",
              "Custom Template Builder — 20+ blocks",
              "Everything in Free, plus:",
              "Google Reviews — Business Profile sync",
            ]}
            isCurrent={isAdvanced}
            badge={devStore ? "FREE FOR DEV STORES" : null}
            action={
              devStore ? null
              : !isAdvanced
                ? { label: "Upgrade to Advanced", onClick: handleSubscribe, variant: "primary" }
                : null
            }
            isLoading={isLoading}
            footer="5-day free trial"
          />
        </div>

        <p style={{ fontSize: 13, color: C.muted }}>
          All charges are billed in USD. Recurring and usage-based charges are billed every 30 days.
        </p>
      </div>
    </div>
  );
}

/* ── Plan Card ── */
function PlanCard({ name, price, features, isCurrent, badge, action, isLoading, footer }) {
  return (
    <div style={{
      flex: "1 1 300px",
      background: "#fff",
      borderRadius: 14,
      border: `1px solid ${isCurrent ? "#111827" : "#e8e8e4"}`,
      boxShadow: isCurrent ? "0 0 0 2px #111827" : "0 1px 4px rgba(0,0,0,.06)",
      position: "relative",
    }}>
      <div style={{ padding: "28px 24px 24px" }}>
      {isCurrent && !badge && (
        <span style={{
          position: "absolute", top: -11, left: 20,
          background: "#111827", color: "#fff",
          fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 12px",
          letterSpacing: ".04em",
        }}>CURRENT PLAN</span>
      )}
      {badge && (
        <span style={{
          position: "absolute", top: -11, left: 20,
          background: "#1d4ed8", color: "#fff",
          fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 12px",
          letterSpacing: ".04em",
        }}>{badge}</span>
      )}

      <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 36, fontWeight: 600, color: "#17171c", marginBottom: 24, lineHeight: 1.1 }}>
        {price === null ? "Free" : (
          <>
            ${price.toFixed(2)}
            <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}> / month</span>
          </>
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "#17171c", marginBottom: 10 }}>Features</div>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 7 }}>
        {features.map((f, i) => (
          <li key={i} style={{ fontSize: 13, color: "#374151", display: "flex", alignItems: "flex-start", gap: 7 }}>
            <span style={{ color: "#111827", fontWeight: 600, flexShrink: 0 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {action && (
        <button
          onClick={action.onClick}
          disabled={isLoading}
          style={{
            width: "100%",
            border: action.variant === "primary" ? "none" : "1.5px solid #111827",
            borderRadius: 9,
            padding: "10px 0",
            fontSize: 13,
            fontWeight: 600,
            cursor: isLoading ? "wait" : "pointer",
            background: action.variant === "primary" ? "#111827" : "#fff",
            color: action.variant === "primary" ? "#fff" : "#111827",
            transition: "opacity .15s",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? "Please wait…" : action.label}
        </button>
      )}
      </div>
      {footer && (
        <div style={{
          padding: "12px 24px", background: "#f8f9fc", borderTop: "1px solid #e8e8e4",
          fontSize: 13, color: "#6b7280", borderBottomLeftRadius: 13, borderBottomRightRadius: 13,
        }}>
          {footer}
        </div>
      )}
    </div>
  );
}
