import { useState } from "react";
import { useLoaderData, useSubmit } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import WidgetCustomizeShell, {
  InstallSection, ColorField, SelectField, SHELL_C,
} from "../components/WidgetCustomizeShell";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  const store = await db.store.findUnique({ where: { shop: session.shop }, select: { id: true } });
  if (!store) return { products: [], aiConfigured, style: defaultStyle(), shop: session.shop, apiKey };

  const [products, widget] = await Promise.all([
    db.product.findMany({
      where: { storeId: store.id },
      select: {
        id: true,
        shopifyProductId: true,
        _count: { select: { reviews: { where: { status: "approved" } } } },
        aiSummaries: { select: { summary: true, reviewCount: true, generatedAt: true } },
      },
    }),
    db.widget.findUnique({
      where: { shop_widgetKey: { shop: session.shop, widgetKey: "ai_summary" } },
      select: { accentColor: true, textColor: true, fontFamily: true },
    }),
  ]);

  const withReviews = products.filter((p) => p._count.reviews > 0);

  const titleEntries = await Promise.all(
    withReviews.map(async (p) => {
      if (!/^\d+$/.test(p.shopifyProductId)) return [p.shopifyProductId, null];
      try {
        const res = await admin.graphql(
          `{ product(id:"gid://shopify/Product/${p.shopifyProductId}"){title featuredImage{url}} }`,
        );
        const data = await res.json();
        const product = data?.data?.product;
        return [p.shopifyProductId, product ? { title: product.title, image: product.featuredImage?.url } : null];
      } catch {
        return [p.shopifyProductId, null];
      }
    }),
  );
  const titles = Object.fromEntries(titleEntries.filter(([, v]) => v));

  const result = withReviews.map((p) => ({
    productId: p.id,
    title: titles[p.shopifyProductId]?.title || "Unknown Product",
    image: titles[p.shopifyProductId]?.image,
    reviewCount: p._count.reviews,
    summary: p.aiSummaries[0]?.summary || null,
    generatedAt: p.aiSummaries[0]?.generatedAt || null,
  }));

  return { products: result, aiConfigured, style: widget || defaultStyle(), shop: session.shop, apiKey };
}

function defaultStyle() {
  return { accentColor: "#6B1A2C", textColor: "#333333", fontFamily: "inherit" };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  const payload = {
    accentColor: form.get("accentColor") || "#6B1A2C",
    textColor: form.get("textColor") || "#333333",
    fontFamily: form.get("fontFamily") || "inherit",
  };

  await db.widget.upsert({
    where: { shop_widgetKey: { shop: session.shop, widgetKey: "ai_summary" } },
    update: payload,
    create: { shop: session.shop, widgetKey: "ai_summary", ...payload },
  });

  return { ok: true };
}

const FONT_OPTIONS = [
  { label: "Inherit from theme",  value: "inherit"              },
  { label: "Inter",               value: "'Inter', sans-serif"  },
  { label: "Georgia",             value: "Georgia, serif"       },
  { label: "Playfair Display",    value: "'Playfair Display', serif" },
];

function SummaryPreview({ accentColor, textColor, fontFamily }) {
  return (
    <div style={{
      padding: "16px 18px", borderRadius: 10, background: "#f9fafb", border: "1px solid #e5e5e5",
      fontFamily: fontFamily === "inherit" ? undefined : fontFamily,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase", color: accentColor }}>✨ AI Summary</span>
      <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6, color: textColor }}>
        Customers consistently praise this product's quality and comfort, with several reviewers highlighting fast shipping
        and accurate sizing. A few mention it runs slightly large — sizing down is recommended.
      </p>
    </div>
  );
}

function ProductRow({ product, aiConfigured }) {
  const [summary, setSummary] = useState(product.summary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.productId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to generate summary");
      setSummary(data.summary);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 14, padding: "14px 0", borderTop: `1px solid ${SHELL_C.border}` }}>
      <img
        src={product.image || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png"}
        alt={product.title}
        style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: `1px solid ${SHELL_C.border}` }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{product.title}</div>
            <div style={{ fontSize: 11.5, color: SHELL_C.muted }}>{product.reviewCount} approved reviews</div>
          </div>
          <button
            onClick={generate}
            disabled={loading || !aiConfigured}
            style={{
              border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 11.5, fontWeight: 600,
              cursor: aiConfigured && !loading ? "pointer" : "default",
              background: aiConfigured ? SHELL_C.accent : "#d1d5db", color: "#fff", whiteSpace: "nowrap",
            }}
          >
            {loading ? "Generating…" : summary ? "Regenerate" : "Generate"}
          </button>
        </div>
        {summary && <p style={{ fontSize: 12.5, color: SHELL_C.text, marginTop: 8, lineHeight: 1.5 }}>{summary}</p>}
        {error && <p style={{ fontSize: 11.5, color: "#dc2626", marginTop: 6 }}>{error}</p>}
      </div>
    </div>
  );
}

export default function AiSummaryPage() {
  const { products, aiConfigured, style, shop, apiKey } = useLoaderData();
  const submit = useSubmit();
  const [saved, setSaved] = useState(false);

  const [accentColor, setAccentColor] = useState(style.accentColor);
  const [textColor, setTextColor]     = useState(style.textColor);
  const [fontFamily, setFontFamily]   = useState(style.fontFamily);

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
    `?template=product&addAppBlockId=${encodeURIComponent(apiKey)}/ai-summary&target=newAppsSection`;

  return (
    <WidgetCustomizeShell
      title="AI Reviews Summary"
      saved={saved}
      onSave={handleSave}
      installSection={
        <InstallSection
          description="Showcase an AI generated summary of your store's reviews to build instant trust."
          installUrl={installUrl}
          note={!aiConfigured ? (
            <span>Add <code>ANTHROPIC_API_KEY</code> to your <code>.env</code> to enable AI summary generation.</span>
          ) : null}
        />
      }
      sections={[
        {
          key: "style", label: "Color and styling",
          content: (
            <>
              <ColorField label="Accent Color" value={accentColor} onChange={setAccentColor} />
              <ColorField label="Text Color" value={textColor} onChange={setTextColor} />
              <SelectField label="Font Family" value={fontFamily} onChange={setFontFamily} options={FONT_OPTIONS} />
            </>
          ),
        },
      ]}
      preview={
        <div>
          <SummaryPreview accentColor={accentColor} textColor={textColor} fontFamily={fontFamily} />
          <div style={{ marginTop: 26 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: SHELL_C.muted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
              Products to summarize
            </div>
            {products.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: SHELL_C.muted, fontSize: 13 }}>
                No products with approved reviews yet.
              </div>
            ) : (
              products.map((p) => <ProductRow key={p.productId} product={p} aiConfigured={aiConfigured} />)
            )}
          </div>
        </div>
      }
    />
  );
}
