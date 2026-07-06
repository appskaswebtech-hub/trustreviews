import { useLoaderData, useSubmit, useFetcher, Link } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#f0f2f7", surface: "#ffffff", border: "#e4e7ef",
  text: "#0f1623", muted: "#6b7280",
  accent: "#5145e5", accentLt: "#eeecfd",
  green: "#16a34a", greenLt: "#dcfce7",
  red: "#dc2626", redLt: "#fee2e2",
  amber: "#d97706", amberLt: "#fef3c7",
};

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const store = await db.store.findUnique({ where: { shop: session.shop }, select: { id: true } });
  if (!store) return { groups: [] };

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
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      products: g.products.map((p, i) => enrich(p, i)),
    })),
  };
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
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
    <div ref={wrapRef} style={{ position: "relative", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f9fafb", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px" }}>
        <span style={{ fontSize: 14, color: C.muted }}>🔍</span>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search all your Shopify products…"
          style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, outline: "none", color: C.text }}
        />
        {loading && <span style={{ fontSize: 11, color: C.muted }}>Searching…</span>}
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }}
            style={{ border: "none", background: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>
        )}
      </div>

      {open && query.trim() && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,.12)", overflow: "hidden",
        }}>
          {results.length === 0 && !loading && (
            <div style={{ padding: "16px 14px", fontSize: 13, color: C.muted, textAlign: "center" }}>
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
            >
              <img
                src={p.image || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png"}
                alt=""
                style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 7, border: `1px solid ${C.border}`, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>{p.title}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentLt, borderRadius: 6, padding: "3px 8px", flexShrink: 0 }}>+ Add</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product chip inside a group card ────────────────────────────────────────
function ProductChip({ product, onRemove }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "7px 10px", position: "relative",
    }}>
      {product.isPrimary && (
        <span style={{
          position: "absolute", top: -7, left: 8, fontSize: 10, fontWeight: 700,
          background: C.accent, color: "#fff", borderRadius: 20, padding: "1px 7px",
        }}>Primary</span>
      )}
      <img
        src={product.image || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png"}
        alt=""
        style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
          {product.title}
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>ID: {product.shopifyProductId}</div>
      </div>
      <button
        onClick={onRemove}
        title="Remove from group"
        style={{ border: "none", background: C.redLt, color: C.red, cursor: "pointer", fontSize: 12, borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      >✕</button>
    </div>
  );
}

// ── Group card ────────────────────────────────────────────────────────────────
function GroupCard({ group, onAddProduct, onRemoveProduct, onDeleteGroup, onRename }) {
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal]   = useState(group.name);

  const existingIds = group.products.map((p) => p.shopifyProductId);

  const submitRename = () => {
    if (nameVal.trim() && nameVal.trim() !== group.name) onRename(nameVal.trim());
    setRenaming(false);
  };

  return (
    <div style={{
      background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
      marginBottom: 18, boxShadow: "0 1px 6px rgba(0,0,0,.05)", overflow: "visible",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          {renaming ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") { setNameVal(group.name); setRenaming(false); } }}
              style={{ fontSize: 15, fontWeight: 700, border: `1px solid ${C.accent}`, borderRadius: 7, padding: "4px 10px", outline: "none", minWidth: 200 }}
            />
          ) : (
            <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{group.name}</span>
          )}
          <button onClick={() => setRenaming(true)} title="Rename"
            style={{ border: "none", background: "none", color: C.muted, cursor: "pointer", fontSize: 13, padding: "2px 6px" }}>✏️</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, background: C.accentLt, color: C.accent,
            borderRadius: 20, padding: "3px 10px",
          }}>
            {group.products.length} {group.products.length === 1 ? "product" : "products"}
          </span>
          <button onClick={onDeleteGroup} style={{
            border: "none", background: C.redLt, color: C.red, borderRadius: 8,
            padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>Delete</button>
        </div>
      </div>

      {/* Products */}
      <div style={{ padding: "16px 20px" }}>
        {group.products.length === 0 ? (
          <div style={{ fontSize: 13, color: C.muted, padding: "8px 0 12px" }}>
            No products yet — search below to add your first product.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 14 }}>
            {group.products.map((p) => (
              <ProductChip key={p.dbId} product={p} onRemove={() => onRemoveProduct(p.dbId)} />
            ))}
          </div>
        )}

        {/* Search picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ProductPicker
            groupId={group.id}
            existingIds={existingIds}
            onAdd={(shopifyProductId) => onAddProduct(shopifyProductId)}
          />
        </div>
        <p style={{ fontSize: 11.5, color: C.muted, margin: "8px 0 0" }}>
          All products in this group share the same pool of reviews across your storefront.
        </p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ReviewGroupsPage() {
  const { groups } = useLoaderData();
  const submit = useSubmit();
  const [newGroupName, setNewGroupName] = useState("");

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
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh", padding: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
        <Link to="/app" style={{ fontSize: 16, color: C.text, textDecoration: "none", marginTop: 4 }}>←</Link>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>Multi-Product Review Groups</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0", maxWidth: 560, lineHeight: 1.6 }}>
            Group products that belong together (variants, duplicate listings, bundles) so they
            share the same pool of reviews — customers on any grouped product page see all reviews.
          </p>
        </div>
      </div>

      {/* How it works banner */}
      <div style={{
        background: C.accentLt, border: `1px solid #c7c0fa`, borderRadius: 12,
        padding: "14px 18px", marginBottom: 22, display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <div style={{ fontSize: 13, color: C.accent, lineHeight: 1.7 }}>
          <strong>How it works:</strong> Create a group, then search and add any products from your Shopify store.
          Reviews left on <em>any</em> product in the group will appear on <em>all</em> of them.
          The first product added is marked <strong>Primary</strong>.
        </div>
      </div>

      {/* Create group form */}
      <form onSubmit={createGroup} style={{
        background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: "18px 20px", marginBottom: 24, display: "flex", gap: 10, alignItems: "center",
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            New Group Name
          </label>
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder='e.g. "Blue T-Shirt — all sizes" or "Winter Jacket Bundle"'
            style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 14px",
              fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!newGroupName.trim()}
          style={{
            alignSelf: "flex-end", border: "none", borderRadius: 9, padding: "10px 22px",
            fontSize: 13, fontWeight: 700, cursor: newGroupName.trim() ? "pointer" : "default",
            background: newGroupName.trim() ? C.accent : "#d1d5db", color: "#fff", whiteSpace: "nowrap",
          }}
        >+ Create Group</button>
      </form>

      {/* Groups */}
      {groups.length === 0 ? (
        <div style={{
          background: C.surface, borderRadius: 14, border: `1px dashed ${C.border}`,
          padding: "50px 20px", textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 6 }}>No groups yet</div>
          <div style={{ fontSize: 13, color: C.muted }}>Create your first group above and start linking products together.</div>
        </div>
      ) : (
        groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            onAddProduct={(shopifyProductId) => addShopifyProduct(g.id, shopifyProductId)}
            onRemoveProduct={removeFromGroup}
            onDeleteGroup={() => deleteGroup(g.id)}
            onRename={(name) => renameGroup(g.id, name)}
          />
        ))
      )}
    </div>
  );
}
