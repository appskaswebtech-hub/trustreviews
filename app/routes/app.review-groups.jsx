import { useLoaderData, useSubmit, useFetcher, Link } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useState, useEffect, useRef } from "react";
import { useAdminT } from "../utils/adminTranslations";
import { hasAdvancedAccess } from "../utils/planGuard.server";
import AdvancedPaywall from "../components/AdvancedPaywall";

const C = {
  bg: "#f6f6f8", surface: "#ffffff", border: "#e5e4ec",
  text: "#17171c", muted: "#6b6b78",
  accent: "#4C6FFF", accentLt: "#eaf0ff",
  green: "#1f7a4d", greenLt: "#e7f4ec",
  red: "#a5423b", redLt: "#f7eae8",
  amber: "#a3690f", amberLt: "#f7f0e2",
};

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const isPro = await hasAdvancedAccess(session.shop);
  const store = await db.store.findUnique({ where: { shop: session.shop }, select: { id: true } });
  if (!store) return { groups: [], isPro };

  const groups = await db.productGroup.findMany({
    where: { storeId: store.id },
    include: { products: true },
    orderBy: { createdAt: "desc" },
  });

  const allShopifyIds = [
    ...new Set(groups.flatMap((g) => g.products.map((p) => p.shopifyProductId)).filter((id) => /^\d+$/.test(id))),
  ];

  const titleMap = Object.fromEntries(
    (await Promise.all(
      allShopifyIds.map(async (shopifyProductId) => {
        try {
          const res = await admin.graphql(
            `{ product(id:"gid://shopify/Product/${shopifyProductId}"){title featuredImage{url}} }`,
          );
          const data = await res.json();
          const product = data?.data?.product;
          return [shopifyProductId, product ? { title: product.title, image: product.featuredImage?.url } : null];
        } catch {
          return [shopifyProductId, null];
        }
      }),
    )).filter(([, v]) => v),
  );

  const enrich = (p, index) => ({
    dbId: p.id,
    shopifyProductId: p.shopifyProductId,
    title: titleMap[p.shopifyProductId]?.title || `Product ${p.shopifyProductId}`,
    image: titleMap[p.shopifyProductId]?.image || null,
    isPrimary: index === 0,
  });

  return {
    isPro,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      products: g.products.map((p, i) => enrich(p, i)),
    })),
  };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);

  const isPro = await hasAdvancedAccess(session.shop);
  if (!isPro) return { ok: false, message: "Product Grouping requires the Advanced plan." };

  const formData = await request.formData();
  const actionType = formData.get("actionType");

  const store = await db.store.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop },
    select: { id: true },
  });

  if (actionType === "createGroup") {
    const name = String(formData.get("name") || "").trim();
    if (name) await db.productGroup.create({ data: { storeId: store.id, name } });
  }

  if (actionType === "renameGroup") {
    const groupId = Number(formData.get("groupId"));
    const name    = String(formData.get("name") || "").trim();
    if (name) await db.productGroup.updateMany({ where: { id: groupId, storeId: store.id }, data: { name } });
  }

  if (actionType === "deleteGroup") {
    const groupId = Number(formData.get("groupId"));
    await db.productGroup.deleteMany({ where: { id: groupId, storeId: store.id } });
  }

  if (actionType === "addShopifyProduct") {
    const groupId         = Number(formData.get("groupId"));
    const shopifyProductId = String(formData.get("shopifyProductId"));
    await db.product.upsert({
      where:  { storeId_shopifyProductId: { storeId: store.id, shopifyProductId } },
      update: { groupId },
      create: { storeId: store.id, shopifyProductId, groupId },
    });
  }

  if (actionType === "removeFromGroup") {
    const productDbId = Number(formData.get("productDbId"));
    await db.product.updateMany({ where: { id: productDbId, storeId: store.id }, data: { groupId: null } });
  }

  return { ok: true };
}

// ── Searchable product picker ────────────────────────────────────────────────
function ProductPicker({ groupId, existingIds, onAdd }) {
  const fetcher  = useFetcher();
  const [query, setQuery]   = useState("");
  const [open, setOpen]     = useState(false);
  const t = useAdminT();
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) return;
    timerRef.current = setTimeout(() => {
      fetcher.load(`/app/product-search?q=${encodeURIComponent(query)}`);
    }, 280);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results = (fetcher.data?.products || []).filter((p) => !existingIds.includes(p.id));
  const loading  = fetcher.state === "loading";

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1 }} className="tr-app-routes-app-review-groups-div-1">
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f9fafb", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px" }} className="tr-app-routes-app-review-groups-div-2">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={t.searchProducts}
          style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, outline: "none", color: C.text }}
         className="tr-app-routes-app-review-groups-input-3"/>
        {loading && <span style={{ fontSize: 11, color: C.muted }} className="tr-app-routes-app-review-groups-span-4">Searching…</span>}
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }}
            style={{ border: "none", background: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 0 }} className="tr-app-routes-app-review-groups-button-5">✕</button>
        )}
      </div>

      {open && query.trim() && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,.12)", overflow: "hidden",
        }} className="tr-app-routes-app-review-groups-div-6">
          {results.length === 0 && !loading && (
            <div style={{ padding: "16px 14px", fontSize: 13, color: C.muted, textAlign: "center" }} className="tr-app-routes-app-review-groups-div-7">
              No products found — try a different name.
            </div>
          )}
          {results.map((p) => (
            <div
              key={p.id}
              onClick={() => { onAdd(p.id, p.title, p.image); setQuery(""); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                cursor: "pointer", borderBottom: `1px solid ${C.border}`,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f5f6fb"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
             className="tr-app-routes-app-review-groups-div-8">
              <img
                src={p.image || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png"}
                alt=""
                style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 7, border: `1px solid ${C.border}`, flexShrink: 0 }}
               className="tr-app-routes-app-review-groups-img-9"/>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }} className="tr-app-routes-app-review-groups-span-10">{p.title}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.accent, background: C.accentLt, borderRadius: 6, padding: "3px 8px", flexShrink: 0 }} className="tr-app-routes-app-review-groups-span-11">+ Add</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product chip inside a group card ────────────────────────────────────────
function ProductChip({ product, onRemove }) {
  const t = useAdminT();
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "7px 10px", position: "relative",
    }} className="tr-app-routes-app-review-groups-div-12">
      {product.isPrimary && (
        <span style={{
          position: "absolute", top: -7, left: 8, fontSize: 10, fontWeight: 600,
          background: C.accent, color: "#fff", borderRadius: 20, padding: "1px 7px",
        }} className="tr-app-routes-app-review-groups-span-13">{t.primary}</span>
      )}
      <img
        src={product.image || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png"}
        alt=""
        style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, flexShrink: 0 }}
       className="tr-app-routes-app-review-groups-img-14"/>
      <div style={{ flex: 1, minWidth: 0 }} className="tr-app-routes-app-review-groups-div-15">
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }} className="tr-app-routes-app-review-groups-div-16">
          {product.title}
        </div>
        <div style={{ fontSize: 11, color: C.muted }} className="tr-app-routes-app-review-groups-div-17">ID: {product.shopifyProductId}</div>
      </div>
      <button
        onClick={onRemove}
        title="Remove from group"
        style={{ border: "none", background: C.redLt, color: C.red, cursor: "pointer", fontSize: 12, borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
       className="tr-app-routes-app-review-groups-button-18">✕</button>
    </div>
  );
}

// ── Group card ────────────────────────────────────────────────────────────────
function GroupCard({ group, onAddProduct, onRemoveProduct, onDeleteGroup, onRename }) {
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal]   = useState(group.name);
  const t = useAdminT();

  const existingIds = group.products.map((p) => p.shopifyProductId);

  const submitRename = () => {
    if (nameVal.trim() && nameVal.trim() !== group.name) onRename(nameVal.trim());
    setRenaming(false);
  };

  return (
    <div style={{
      background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
      marginBottom: 18, boxShadow: "0 1px 6px rgba(0,0,0,.05)", overflow: "visible",
    }} className="tr-app-routes-app-review-groups-div-19">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${C.border}` }} className="tr-app-routes-app-review-groups-div-20">
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }} className="tr-app-routes-app-review-groups-div-21">
          {renaming ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") { setNameVal(group.name); setRenaming(false); } }}
              style={{ fontSize: 15, fontWeight: 600, border: `1px solid ${C.accent}`, borderRadius: 7, padding: "4px 10px", outline: "none", minWidth: 200 }}
             className="tr-app-routes-app-review-groups-input-22"/>
          ) : (
            <span style={{ fontWeight: 600, fontSize: 15, color: C.text }} className="tr-app-routes-app-review-groups-span-23">{group.name}</span>
          )}
          <button onClick={() => setRenaming(true)} title="Rename"
            style={{ border: "none", background: "none", color: C.muted, cursor: "pointer", fontSize: 12, padding: "2px 6px", fontWeight: 600 }} className="tr-app-routes-app-review-groups-button-24">Rename</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }} className="tr-app-routes-app-review-groups-div-25">
          <span style={{
            fontSize: 11, fontWeight: 600, background: C.accentLt, color: C.accent,
            borderRadius: 20, padding: "3px 10px",
          }} className="tr-app-routes-app-review-groups-span-26">
            {group.products.length} {group.products.length === 1 ? "product" : "products"}
          </span>
          <button onClick={onDeleteGroup} style={{
            border: "none", background: C.redLt, color: C.red, borderRadius: 8,
            padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }} className="tr-app-routes-app-review-groups-button-27">{t.deleteGroup}</button>
        </div>
      </div>

      {/* Products */}
      <div style={{ padding: "16px 20px" }} className="tr-app-routes-app-review-groups-div-28">
        {group.products.length === 0 ? (
          <div style={{ fontSize: 13, color: C.muted, padding: "8px 0 12px" }} className="tr-app-routes-app-review-groups-div-29">
            No products yet — search below to add your first product.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 14 }} className="tr-app-routes-app-review-groups-div-30">
            {group.products.map((p) => (
              <ProductChip key={p.dbId} product={p} onRemove={() => onRemoveProduct(p.dbId)} />
            ))}
          </div>
        )}

        {/* Search picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="tr-app-routes-app-review-groups-div-31">
          <ProductPicker
            groupId={group.id}
            existingIds={existingIds}
            onAdd={(shopifyProductId) => onAddProduct(shopifyProductId)}
          />
        </div>
        <p style={{ fontSize: 11.5, color: C.muted, margin: "8px 0 0" }} className="tr-app-routes-app-review-groups-p-32">
          All products in this group share the same pool of reviews across your storefront.
        </p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ReviewGroupsPage() {
  const { groups, isPro } = useLoaderData();
  const submit = useSubmit();
  const [newGroupName, setNewGroupName] = useState("");
  const t = useAdminT();

  const createGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const fd = new FormData();
    fd.append("actionType", "createGroup");
    fd.append("name", newGroupName.trim());
    submit(fd, { method: "post" });
    setNewGroupName("");
  };

  const addShopifyProduct = (groupId, shopifyProductId) => {
    const fd = new FormData();
    fd.append("actionType", "addShopifyProduct");
    fd.append("groupId", groupId);
    fd.append("shopifyProductId", shopifyProductId);
    submit(fd, { method: "post" });
  };

  const removeFromGroup = (productDbId) => {
    const fd = new FormData();
    fd.append("actionType", "removeFromGroup");
    fd.append("productDbId", productDbId);
    submit(fd, { method: "post" });
  };

  const deleteGroup = (groupId) => {
    if (!confirm("Delete this group? Products will become ungrouped but their reviews are kept.")) return;
    const fd = new FormData();
    fd.append("actionType", "deleteGroup");
    fd.append("groupId", groupId);
    submit(fd, { method: "post" });
  };

  const renameGroup = (groupId, name) => {
    const fd = new FormData();
    fd.append("actionType", "renameGroup");
    fd.append("groupId", groupId);
    fd.append("name", name);
    submit(fd, { method: "post" });
  };

  return (
    // <div style={{ fontFamily: "var(--app-font-family)", background: C.bg, minHeight: "100vh", padding: 28 }} className="tr-app-routes-app-review-groups-div-33">
    //   {/* Header */}
    //   <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 6 }} className="tr-app-routes-app-review-groups-div-34">
    //     <Link to="/app" style={{ fontSize: 16, color: C.text, textDecoration: "none", marginTop: 4 }}>←</Link>
    //     <div className="tr-app-routes-app-review-groups-div-35">
    //       <h1 style={{ fontSize: 24, fontWeight: 600, color: C.text, margin: 0 }} className="tr-app-routes-app-review-groups-h1-36">{t.groupsTitle}</h1>
    //       <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0", maxWidth: 560, lineHeight: 1.6 }} className="tr-app-routes-app-review-groups-p-37">
    //         Group products that belong together (variants, duplicate listings, bundles) so they
    //         share the same pool of reviews — customers on any grouped product page see all reviews.
    //       </p>
    //     </div>
    //   </div>

    //   {!isPro ? (
    //     <AdvancedPaywall
    //       title="Product Grouping — Advanced Plan"
    //       description="Group products that belong together (variants, duplicate listings, bundles) so they share the same pool of reviews."
    //       features={[
    //         "Combine variants & duplicate listings",
    //         "Shared reviews across grouped products",
    //         "Unlimited groups",
    //         "Everything else in Advanced",
    //       ]}
    //       accentColor={C.accent}
    //     />
    //   ) : (
    //   <>
    //   {/* How it works banner */}
    //   <div style={{
    //     background: C.accentLt, border: `1px solid #c7c0fa`, borderRadius: 12,
    //     padding: "14px 18px", marginBottom: 22, display: "flex", gap: 12, alignItems: "flex-start",
    //   }} className="tr-app-routes-app-review-groups-div-38">
    //     <div style={{ fontSize: 13, color: C.accent, lineHeight: 1.7 }} className="tr-app-routes-app-review-groups-div-39">
    //       <strong className="tr-app-routes-app-review-groups-strong-40">How it works:</strong> Create a group, then search and add any products from your Shopify store.
    //       Reviews left on <em className="tr-app-routes-app-review-groups-em-41">any</em> product in the group will appear on <em className="tr-app-routes-app-review-groups-em-42">all</em> of them.
    //       The first product added is marked <strong className="tr-app-routes-app-review-groups-strong-43">Primary</strong>.
    //     </div>
    //   </div>

    //   {/* Create group form */}
    //   <form onSubmit={createGroup} style={{
    //     background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
    //     padding: "18px 20px", marginBottom: 24, display: "flex", gap: 10, alignItems: "center",
    //   }} className="tr-app-routes-app-review-groups-form-44">
    //     <div style={{ flex: 1 }} className="tr-app-routes-app-review-groups-div-45">
    //       <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }} className="tr-app-routes-app-review-groups-label-46">
    //         {t.groupName}
    //       </label>
    //       <input
    //         value={newGroupName}
    //         onChange={(e) => setNewGroupName(e.target.value)}
    //         placeholder={t.groupNamePlaceholder}
    //         style={{
    //           width: "100%", border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 14px",
    //           fontSize: 13, outline: "none", boxSizing: "border-box",
    //         }}
    //        className="tr-app-routes-app-review-groups-input-47"/>
    //     </div>
    //     <button
    //       type="submit"
    //       disabled={!newGroupName.trim()}
    //       style={{
    //         alignSelf: "flex-end", border: "none", borderRadius: 9, padding: "10px 22px",
    //         fontSize: 13, fontWeight: 600, cursor: newGroupName.trim() ? "pointer" : "default",
    //         background: newGroupName.trim() ? C.accent : "#d1d5db", color: "#fff", whiteSpace: "nowrap",
    //       }}
    //      className="tr-app-routes-app-review-groups-button-48">{t.createGroup}</button>
    //   </form>

    //   {/* Groups */}
    //   {groups.length === 0 ? (
    //     <div style={{
    //       background: C.surface, borderRadius: 14, border: `1px dashed ${C.border}`,
    //       padding: "50px 20px", textAlign: "center",
    //     }} className="tr-app-routes-app-review-groups-div-49">
    //       <div style={{ fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 6 }} className="tr-app-routes-app-review-groups-div-50">{t.groupsTitle}</div>
    //       <div style={{ fontSize: 13, color: C.muted }} className="tr-app-routes-app-review-groups-div-51">{t.noGroups}</div>
    //     </div>
    //   ) : (
    //     groups.map((g) => (
    //       <GroupCard
    //         key={g.id}
    //         group={g}
    //         onAddProduct={(shopifyProductId) => addShopifyProduct(g.id, shopifyProductId)}
    //         onRemoveProduct={removeFromGroup}
    //         onDeleteGroup={() => deleteGroup(g.id)}
    //         onRename={(name) => renameGroup(g.id, name)}
    //       />
    //     ))
    //   )}
    //   </>
    //   )}
    // </div>
    <div
  className="tr-app-routes-app-review-groups-div-33"
  style={{
    fontFamily: "var(--app-font-family)",
    background: "#F2F7FB",
    minHeight: "100vh",
    padding: 28,
  }}
>
  {/* Header */}
  <div
    className="tr-app-routes-app-review-groups-div-34"
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 18,
      padding: "18px 20px",
      background: "linear-gradient(135deg,#FFFFFF 0%,#F2F7FB 100%)",
      border: "1px solid #D6E6F2",
      borderRadius: 16,
      boxShadow: "0 8px 24px rgba(79,115,146,.07)",
    }}
  >
    <Link
      to="/app"
      style={{
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 9,
        border: "1px solid #D6E6F2",
        background: "#FFFFFF",
        color: "#4F7392",
        textDecoration: "none",
        fontSize: 16,
        fontWeight: 700,
        flexShrink: 0,
        boxShadow: "0 4px 10px rgba(79,115,146,.06)",
      }}
    >
      ←
    </Link>

    <div className="tr-app-routes-app-review-groups-div-35">
      <h1
        className="tr-app-routes-app-review-groups-h1-36"
        style={{
          fontSize: 26,
          fontWeight: 750,
          color: "#4F7392",
          margin: 0,
          letterSpacing: "-.025em",
          lineHeight: 1.2,
        }}
      >
        {t.groupsTitle}
      </h1>

      <p
        className="tr-app-routes-app-review-groups-p-37"
        style={{
          fontSize: 13.5,
          color: "#829CAF",
          margin: "6px 0 0",
          maxWidth: 650,
          lineHeight: 1.6,
        }}
      >
        Group products that belong together (variants, duplicate listings, bundles) so they
        share the same pool of reviews — customers on any grouped product page see all reviews.
      </p>
    </div>
  </div>

  {!isPro ? (
    <AdvancedPaywall
      title="Product Grouping — Advanced Plan"
      description="Group products that belong together (variants, duplicate listings, bundles) so they share the same pool of reviews."
      features={[
        "Combine variants & duplicate listings",
        "Shared reviews across grouped products",
        "Unlimited groups",
        "Everything else in Advanced",
      ]}
      accentColor={C.accent}
    />
  ) : (
    <>
      {/* How it works banner */}
      <div
        className="tr-app-routes-app-review-groups-div-38"
        style={{
          background: "linear-gradient(135deg,#F2F7FB,#FFFFFF)",
          border: "1px solid #D6E6F2",
          borderRadius: 12,
          padding: "13px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "flex-start",
          boxShadow: "0 5px 16px rgba(79,115,146,.05)",
        }}
      >
        <div
          className="tr-app-routes-app-review-groups-div-39"
          style={{
            fontSize: 13,
            color: "#6F8FA9",
            lineHeight: 1.65,
          }}
        >
          <strong
            className="tr-app-routes-app-review-groups-strong-40"
            style={{
              color: "#4F7392",
              fontWeight: 750,
            }}
          >
            How it works:
          </strong>{" "}
          Create a group, then search and add any products from your Shopify store.
          Reviews left on{" "}
          <em
            className="tr-app-routes-app-review-groups-em-41"
            style={{ color: "#4F7392" }}
          >
            any
          </em>{" "}
          product in the group will appear on{" "}
          <em
            className="tr-app-routes-app-review-groups-em-42"
            style={{ color: "#4F7392" }}
          >
            all
          </em>{" "}
          of them. The first product added is marked{" "}
          <strong
            className="tr-app-routes-app-review-groups-strong-43"
            style={{
              color: "#4F7392",
              fontWeight: 750,
            }}
          >
            Primary
          </strong>
          .
        </div>
      </div>

      {/* Create group form */}
      <form
        onSubmit={createGroup}
        className="tr-app-routes-app-review-groups-form-44"
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          border: "1px solid #D6E6F2",
          padding: "16px 18px",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 8px 24px rgba(79,115,146,.06)",
        }}
      >
        <div
          className="tr-app-routes-app-review-groups-div-45"
          style={{ flex: 1 }}
        >
          <label
            className="tr-app-routes-app-review-groups-label-46"
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: "#6F8FA9",
              display: "block",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            {t.groupName}
          </label>

          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder={t.groupNamePlaceholder}
            className="tr-app-routes-app-review-groups-input-47"
            style={{
              width: "100%",
              border: "1px solid #D6E6F2",
              borderRadius: 9,
              padding: "10px 13px",
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
              background: "#F9FCFE",
              color: "#4F7392",
              fontFamily: "inherit",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!newGroupName.trim()}
          className="tr-app-routes-app-review-groups-button-48"
          style={{
            alignSelf: "flex-end",
            border: "none",
            borderRadius: 9,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 700,
            cursor: newGroupName.trim() ? "pointer" : "default",
            background: newGroupName.trim()
              ? "linear-gradient(135deg,#8DB4D6,#6F96B6)"
              : "#D6E6F2",
            color: "#FFFFFF",
            whiteSpace: "nowrap",
            boxShadow: newGroupName.trim()
              ? "0 6px 16px rgba(79,115,146,.18)"
              : "none",
          }}
        >
          {t.createGroup}
        </button>
      </form>

      {/* Groups */}
      {groups.length === 0 ? (
        <div
          className="tr-app-routes-app-review-groups-div-49"
          style={{
            background: "linear-gradient(145deg,#FFFFFF,#F7FAFC)",
            borderRadius: 14,
            border: "1px dashed #C9DDEA",
            padding: "46px 20px",
            textAlign: "center",
            boxShadow: "0 8px 24px rgba(79,115,146,.04)",
          }}
        >
          <div
            className="tr-app-routes-app-review-groups-div-50"
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "#4F7392",
              marginBottom: 5,
            }}
          >
            {t.groupsTitle}
          </div>

          <div
            className="tr-app-routes-app-review-groups-div-51"
            style={{
              fontSize: 13,
              color: "#829CAF",
            }}
          >
            {t.noGroups}
          </div>
        </div>
      ) : (
        groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            onAddProduct={(shopifyProductId) =>
              addShopifyProduct(g.id, shopifyProductId)
            }
            onRemoveProduct={removeFromGroup}
            onDeleteGroup={() => deleteGroup(g.id)}
            onRename={(name) => renameGroup(g.id, name)}
          />
        ))
      )}
    </>
  )}
</div>
  );
}
