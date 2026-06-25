import { useLoaderData, useSubmit, Link } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useState } from "react";

const C = {
  bg: "#f0f2f7", surface: "#ffffff", border: "#e4e7ef",
  text: "#0f1623", muted: "#6b7280",
  accent: "#5145e5", accentLt: "#eeecfd",
  red: "#dc2626", redLt: "#fee2e2",
};

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  const store = await db.store.findUnique({ where: { shop: session.shop }, select: { id: true } });
  if (!store) {
    return { groups: [], ungrouped: [] };
  }

  const [groups, ungroupedProducts] = await Promise.all([
    db.productGroup.findMany({
      where: { storeId: store.id },
      include: { products: true },
      orderBy: { createdAt: "desc" },
    }),
    db.product.findMany({ where: { storeId: store.id, groupId: null } }),
  ]);

  // Enrich every referenced product (grouped + ungrouped) with its Shopify
  // title/image in one batch — same pattern as the main reviews dashboard.
  const allShopifyIds = [
    ...new Set([
      ...groups.flatMap((g) => g.products.map((p) => p.shopifyProductId)),
      ...ungroupedProducts.map((p) => p.shopifyProductId),
    ].filter((id) => /^\d+$/.test(id))),
  ];

  const titleMap = Object.fromEntries(
    (
      await Promise.all(
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
      )
    ).filter(([, v]) => v),
  );

  const enrich = (p) => ({
    dbId: p.id,
    shopifyProductId: p.shopifyProductId,
    title: titleMap[p.shopifyProductId]?.title || `Product ${p.shopifyProductId}`,
    image: titleMap[p.shopifyProductId]?.image || null,
  });

  return {
    groups: groups.map((g) => ({ id: g.id, name: g.name, products: g.products.map(enrich) })),
    ungrouped: ungroupedProducts.map(enrich),
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
  if (actionType === "deleteGroup") {
    const groupId = Number(formData.get("groupId"));
    await db.productGroup.deleteMany({ where: { id: groupId, storeId: store.id } });
  }
  if (actionType === "addToGroup") {
    const groupId = Number(formData.get("groupId"));
    const productDbId = Number(formData.get("productDbId"));
    await db.product.updateMany({ where: { id: productDbId, storeId: store.id }, data: { groupId } });
  }
  if (actionType === "removeFromGroup") {
    const productDbId = Number(formData.get("productDbId"));
    await db.product.updateMany({ where: { id: productDbId, storeId: store.id }, data: { groupId: null } });
  }

  return { ok: true };
}

function ProductChip({ product, onRemove }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, background: "#f9fafb",
      border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 10px",
    }}>
      <img
        src={product.image || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png"}
        alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 6 }}
      />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{product.title}</span>
      {onRemove && (
        <button onClick={onRemove} title="Remove from group" style={{
          border: "none", background: "none", color: C.muted, cursor: "pointer", fontSize: 13, padding: 0, marginLeft: 4,
        }}>✕</button>
      )}
    </div>
  );
}

function GroupCard({ group, ungrouped, onAddProduct, onRemoveProduct, onDeleteGroup }) {
  const [picking, setPicking] = useState("");

  return (
    <div style={{
      background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
      padding: 18, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{group.name}</span>
        <button onClick={onDeleteGroup} style={{
          border: "none", background: C.redLt, color: C.red, borderRadius: 8,
          padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Delete group</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {group.products.length === 0 && (
          <span style={{ fontSize: 12.5, color: C.muted }}>No products in this group yet.</span>
        )}
        {group.products.map((p) => (
          <ProductChip key={p.dbId} product={p} onRemove={() => onRemoveProduct(p.dbId)} />
        ))}
      </div>

      {ungrouped.length > 0 && (
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={picking}
            onChange={(e) => setPicking(e.target.value)}
            style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 12.5, flex: 1 }}
          >
            <option value="">Add a product to this group…</option>
            {ungrouped.map((p) => (
              <option key={p.dbId} value={p.dbId}>{p.title}</option>
            ))}
          </select>
          <button
            disabled={!picking}
            onClick={() => { onAddProduct(Number(picking)); setPicking(""); }}
            style={{
              border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, fontWeight: 600,
              background: picking ? C.accent : "#d1d5db", color: "#fff", cursor: picking ? "pointer" : "default",
            }}
          >+ Add</button>
        </div>
      )}
    </div>
  );
}

export default function ReviewGroupsPage() {
  const { groups, ungrouped } = useLoaderData();
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

  const deleteGroup = (groupId) => {
    if (!confirm("Delete this group? Its products will become ungrouped.")) return;
    const fd = new FormData();
    fd.append("actionType", "deleteGroup");
    fd.append("groupId", groupId);
    submit(fd, { method: "post" });
  };

  const addToGroup = (groupId, productDbId) => {
    const fd = new FormData();
    fd.append("actionType", "addToGroup");
    fd.append("groupId", groupId);
    fd.append("productDbId", productDbId);
    submit(fd, { method: "post" });
  };

  const removeFromGroup = (productDbId) => {
    const fd = new FormData();
    fd.append("actionType", "removeFromGroup");
    fd.append("productDbId", productDbId);
    submit(fd, { method: "post" });
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh", padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <Link to="/app" style={{ fontSize: 16, color: C.text, textDecoration: "none" }}>←</Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Product Review Groups</h1>
      </div>
      <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 20px" }}>
        Group together products that are really the same item (duplicate listings, multiple variants split into
        separate products, etc.) so their reviews are pooled and shown together everywhere on your storefront.
      </p>

      <form onSubmit={createGroup} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder='New group name (e.g. "Plankpad Pro — all listings")'
          style={{ flex: 1, maxWidth: 360, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 14px", fontSize: 13 }}
        />
        <button type="submit" style={{
          border: "none", borderRadius: 9, padding: "8px 18px", fontSize: 13, fontWeight: 700,
          background: C.accent, color: "#fff", cursor: "pointer",
        }}>+ Create group</button>
      </form>

      {groups.length === 0 ? (
        <div style={{
          background: C.surface, borderRadius: 14, border: `1px dashed ${C.border}`,
          padding: 40, textAlign: "center", color: C.muted, fontSize: 13,
        }}>
          No review groups yet — create one above, then add products to it.
        </div>
      ) : (
        groups.map((g) => (
          <GroupCard
            key={g.id} group={g} ungrouped={ungrouped}
            onAddProduct={(productDbId) => addToGroup(g.id, productDbId)}
            onRemoveProduct={removeFromGroup}
            onDeleteGroup={() => deleteGroup(g.id)}
          />
        ))
      )}
    </div>
  );
}
