import { useLoaderData, useSubmit, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import { redirect } from "react-router";
import db from "../db.server";
import { useState, useRef } from "react";

const REVIEW_STATUSES = new Set(["pending", "approved", "rejected"]);

const normalizeProductId = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^gid:\/\/shopify\/Product\//, "");
  return normalized || null;
};

const normalizeStatus = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return REVIEW_STATUSES.has(normalized) ? normalized : "pending";
};

const normalizeRating = (value) => {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return 5;
  return Math.min(5, Math.max(1, Math.round(rating)));
};

const normalizeCustomer = (value) => {
  const customer = String(value ?? "").trim();
  return customer || "Unknown";
};

const normalizeComment = (value) => String(value ?? "").trim();

const normalizeEmail = (value) => {
  const email = String(value ?? "").trim().toLowerCase();
  return email || null;
};

async function ensureStoreAndProduct(shop, rawProductId) {
  const shopifyProductId = normalizeProductId(rawProductId);
  if (!shopifyProductId) return null;

  const store = await db.store.upsert({
    where: { shop },
    update: {},
    create: { shop },
    select: { id: true },
  });

  const product = await db.product.upsert({
    where: {
      storeId_shopifyProductId: {
        storeId: store.id,
        shopifyProductId,
      },
    },
    update: {},
    create: {
      storeId: store.id,
      shopifyProductId,
    },
    select: { id: true, shopifyProductId: true },
  });

  return {
    storeId: store.id,
    productId: product.id,
    shopifyProductId: product.shopifyProductId,
  };
}

/* ─────────────────────────────────────────
   LOADER
───────────────────────────────────────── */
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const tab = url.searchParams.get("tab") || "all";
  const search = url.searchParams.get("search") || "";
  const limit = 5;

  const store = await db.store.findUnique({
    where: { shop: session.shop },
    select: { id: true },
  });

  if (!store) {
    return {
      grouped: [],
      total: 0,
      page,
      limit,
      allCount: 0,
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      tab,
      search,
    };
  }

  const where = { storeId: store.id };
  if (tab === "approved") where.status = "approved";
  if (tab === "pending") where.status = "pending";
  if (tab === "rejected") where.status = "rejected";
  if (search) {
    where.OR = [
      { customer: { contains: search } },
      { email: { contains: search } },
      { comment: { contains: search } },
    ];
  }

  const reviews = await db.review.findMany({
    where,
    include: {
      product: {
        select: { shopifyProductId: true },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const productIds = [
    ...new Set(
      reviews
        .map((review) => review.product.shopifyProductId)
        .filter((productId) => /^\d+$/.test(productId)),
    ),
  ];

  const products = Object.fromEntries(
    (
      await Promise.all(
        productIds.map(async (productId) => {
          try {
            const response = await admin.graphql(
              `{ product(id:"gid://shopify/Product/${productId}"){title featuredImage{url}} }`,
            );
            const data = await response.json();
            const product = data?.data?.product;

            return [
              productId,
              product
                ? {
                    title: product.title,
                    image: product.featuredImage?.url,
                  }
                : null,
            ];
          } catch {
            return [productId, null];
          }
        }),
      )
    ).filter(([, value]) => value),
  );

  const enriched = reviews.map((r) => ({
    ...r,
    storefrontProductId: r.product.shopifyProductId,
    productTitle: products[r.product.shopifyProductId]?.title || "Unknown Product",
    productImage: products[r.product.shopifyProductId]?.image,
  }));

  const grouped = {};
  for (const r of enriched) {
    if (!grouped[r.storefrontProductId]) {
      grouped[r.storefrontProductId] = {
        productId: r.storefrontProductId,
        productTitle: r.productTitle,
        productImage: r.productImage,
        reviews: [],
      };
    }
    grouped[r.storefrontProductId].reviews.push(r);
  }

  const [total, approvedCount, pendingCount, rejectedCount, allCount] = await Promise.all([
    db.review.count({ where }),
    db.review.count({ where: { storeId: store.id, status: "approved" } }),
    db.review.count({ where: { storeId: store.id, status: "pending" } }),
    db.review.count({ where: { storeId: store.id, status: "rejected" } }),
    db.review.count({ where: { storeId: store.id } }),
  ]);

  return {
    grouped: Object.values(grouped),
    total,
    page,
    limit,
    allCount, approvedCount, pendingCount, rejectedCount,
    tab, search,
  };
};

/* ─────────────────────────────────────────
   ACTION
───────────────────────────────────────── */
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const id = Number(formData.get("id"));
  const comment = formData.get("comment");

  const store = await db.store.findUnique({
    where: { shop: session.shop },
    select: { id: true },
  });

  if (actionType === "approve" && store) {
    await db.review.updateMany({
      where: { id, storeId: store.id },
      data: { status: "approved" },
    });
  }

  if (actionType === "reject" && store) {
    await db.review.updateMany({
      where: { id, storeId: store.id },
      data: { status: "rejected" },
    });
  }

  if (actionType === "delete" && store) {
    await db.review.deleteMany({
      where: { id, storeId: store.id },
    });
  }

  if (actionType === "edit" && store) {
    await db.review.updateMany({
      where: { id, storeId: store.id },
      data: { comment: normalizeComment(comment) },
    });
  }

  if (actionType === "import") {
    const rows = JSON.parse(String(formData.get("rows") || "[]"));
    for (const row of rows) {
      const scopedProduct = await ensureStoreAndProduct(
        session.shop,
        row.productid || row.productId,
      );

      if (!scopedProduct) continue;

      await db.review.create({
        data: {
          storeId: scopedProduct.storeId,
          productId: scopedProduct.productId,
          customer: normalizeCustomer(row.customer),
          email: normalizeEmail(row.email),
          rating: normalizeRating(row.rating),
          comment: normalizeComment(row.comment),
          status: normalizeStatus(row.status),
        },
      });
    }
  }

  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") || "all";
  const search = url.searchParams.get("search") || "";
  return redirect(`/app/review?tab=${tab}&search=${encodeURIComponent(search)}`);
};

/* ─────────────────────────────────────────
   TOKENS
───────────────────────────────────────── */
const C = {
  bg: "#f0f2f7", surface: "#ffffff", border: "#e4e7ef",
  text: "#0f1623", muted: "#6b7280",
  accent: "#5145e5", accentLt: "#eeecfd",
  green: "#16a34a", greenLt: "#dcfce7",
  amber: "#d97706", amberLt: "#fef3c7",
  red:   "#dc2626", redLt:   "#fee2e2",
};

const statusStyle = (s) =>
  s === "approved" ? { bg: C.greenLt, color: C.green, dot: C.green }
  : s === "pending" ? { bg: C.amberLt, color: C.amber, dot: C.amber }
  : { bg: C.redLt, color: C.red, dot: C.red };

const stars = (n) =>
  Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ color: i < n ? "#f59e0b" : "#d1d5db", fontSize: 14 }}>★</span>
  ));

/* ─────────────────────────────────────────
   STAT CARD
───────────────────────────────────────── */
function StatCard({ label, value, icon, bg, color }) {
  return (
    <div style={{
      flex: "1 1 150px", background: C.surface, borderRadius: 14,
      border: `1px solid ${C.border}`, padding: "18px 22px",
      display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,.05)",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   IMPORT MODAL
───────────────────────────────────────── */
function ImportModal({ onClose, onImport }) {
  const fileRef = useRef();
  const [preview, setPreview] = useState([]);
  const [error, setError]     = useState("");

  const parseCSVLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === "\"") {
        if (inQuotes && line[i + 1] === "\"") {
          current += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values.map((value) => value.replace(/\r$/, ""));
  };

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const vals = parseCSVLine(line);
      const row = {};
      headers.forEach((h, i) => (row[h] = vals[i]?.trim() || ""));
      return row;
    });
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) { setError("Only .csv files allowed."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { setPreview(parseCSV(ev.target.result).slice(0, 3)); setError(""); }
      catch { setError("Invalid CSV format."); }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const file = fileRef.current?.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { onImport(parseCSV(ev.target.result)); onClose(); };
    reader.readAsText(file);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        background: C.surface, borderRadius: 20, padding: 32, width: 480,
        boxShadow: "0 24px 64px rgba(0,0,0,.22)", position: "relative",
      }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14, width: 30, height: 30,
          borderRadius: 8, border: "none", background: "#f3f4f6",
          cursor: "pointer", fontSize: 15, color: C.muted,
        }}>✕</button>

        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>📥 Import Reviews</div>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
          CSV columns: <code style={{ background: "#f3f4f6", borderRadius: 4, padding: "1px 5px" }}>
            customer, email, productId, rating, comment, status
          </code>
        </p>

        <label style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          border: `2px dashed ${C.border}`, borderRadius: 12, padding: "28px 20px",
          cursor: "pointer", background: "#fafbff", marginBottom: 16, gap: 6,
        }}>
          <span style={{ fontSize: 34 }}>📂</span>
          <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>Choose CSV file</span>
          <span style={{ fontSize: 11, color: C.muted }}>Max 500 rows recommended</span>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFile} />
        </label>

        {error && <p style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>{error}</p>}

        {preview.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>
              Preview (first 3 rows)
            </div>
            {preview.map((row, i) => (
              <div key={i} style={{
                background: "#f9fafb", borderRadius: 8, padding: "8px 12px",
                fontSize: 12, color: C.text, marginBottom: 4, border: `1px solid ${C.border}`,
              }}>
                👤 {row.customer} &nbsp;|&nbsp; ⭐ {row.rating} &nbsp;|&nbsp; {row.comment}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 20px",
            fontSize: 13, fontWeight: 600, background: "#fff", cursor: "pointer", color: C.text,
          }}>Cancel</button>
          <button onClick={handleImport} disabled={!preview.length} style={{
            border: "none", borderRadius: 10, padding: "9px 20px",
            fontSize: 13, fontWeight: 700,
            background: preview.length ? C.accent : "#d1d5db", color: "#fff",
            cursor: preview.length ? "pointer" : "default",
          }}>Import</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   REVIEW ROW
───────────────────────────────────────── */
function ReviewRow({ review, onAction }) {
  const ss = statusStyle(review.status);
  return (
    <tr
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f9fc")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      style={{ transition: "background .12s" }}
    >
      {/* Customer */}
      <td style={TD}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: C.accentLt,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 13, color: C.accent, flexShrink: 0,
          }}>{(review.customer || "?")[0].toUpperCase()}</div>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{review.customer}</span>
        </div>
      </td>

      {/* Rating */}
      <td style={TD}><div style={{ display: "flex" }}>{stars(review.rating)}</div></td>

      {/* Comment */}
      <td style={TD}>
        <input
          type="text"
          defaultValue={review.comment}
          style={{
            border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px",
            fontSize: 13, color: C.text, background: "#f9fafb",
            fontFamily: "inherit", outline: "none", width: "100%", minWidth: 140,
          }}
          onFocus={(e) => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accentLt}`; }}
          onBlur={(e)  => { e.target.style.borderColor = C.border;  e.target.style.boxShadow = "none"; onAction("edit", review, e.target.value); }}
        />
      </td>

      {/* Status */}
      <td style={TD}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          background: ss.bg, color: ss.color, borderRadius: 20, padding: "3px 11px",
          fontSize: 12, fontWeight: 600,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ss.dot }} />
          {review.status}
        </span>
      </td>

      {/* Date */}
      <td style={{ ...TD, color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>
        {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </td>

      {/* Actions */}
      <td style={TD}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onAction("approve", review)} style={ABT("approve")}>✓ Approve</button>
          <button onClick={() => onAction("reject",  review)} style={ABT("reject")}>✕ Reject</button>
          <button onClick={() => onAction("delete",  review)} style={ABT("delete")} title="Delete">🗑</button>
        </div>
      </td>
    </tr>
  );
}

const TD = {
  padding: "13px 16px", fontSize: 13, color: C.text,
  borderTop: `1px solid ${C.border}`, verticalAlign: "middle",
};

const ABT = (v) => ({
  border: "none", borderRadius: 7, padding: "5px 11px", fontSize: 12,
  fontWeight: 600, cursor: "pointer",
  ...(v === "approve" ? { background: C.greenLt, color: C.green }
    : v === "reject"  ? { background: C.redLt,   color: C.red   }
    : { background: "#f3f4f6", color: C.muted }),
});

/* ─────────────────────────────────────────
   PRODUCT GROUP
───────────────────────────────────────── */
function ProductGroup({ group, onAction }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{
      background: C.surface, borderRadius: 14, marginBottom: 12,
      border: `1px solid ${C.border}`, overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,.04)",
    }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
          cursor: "pointer", userSelect: "none", background: open ? "#fafbff" : C.surface,
          borderBottom: open ? `1px solid ${C.border}` : "none", transition: "background .15s",
        }}
      >
        <img
          src={group.productImage || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png"}
          alt={group.productTitle}
          style={{ width: 46, height: 46, objectFit: "cover", borderRadius: 10, flexShrink: 0, border: `1px solid ${C.border}` }}
        />
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: C.text }}>{group.productTitle}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, background: C.accentLt, color: C.accent,
          borderRadius: 20, padding: "3px 10px",
        }}>{group.reviews.length} review{group.reviews.length !== 1 ? "s" : ""}</span>
        <span style={{
          fontSize: 11, color: C.muted,
          transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .2s", display: "inline-block",
        }}>▶</span>
      </div>

      {open && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Customer","Rating","Comment","Status","Date","Actions"].map((h) => (
                <th key={h} style={{
                  textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted,
                  letterSpacing: ".07em", textTransform: "uppercase",
                  padding: "9px 16px", background: "#f8f9fc",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.reviews.map((r) => (
              <ReviewRow key={r.id} review={r} onAction={onAction} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
export default function ReviewsPage() {
  const {
    grouped, total, page, limit,
    allCount, approvedCount, pendingCount, rejectedCount,
    tab, search,
  } = useLoaderData();

  const submit = useSubmit();
  const [, setSearchParams] = useSearchParams();
  const [showImport, setShowImport] = useState(false);
  const [searchVal,  setSearchVal]  = useState(search);

  const totalPages = Math.ceil(total / limit);

  const handleAction = (actionType, review, comment = null) => {
    const fd = new FormData();
    fd.append("actionType", actionType);
    fd.append("id", review.id);
    if (comment !== null) fd.append("comment", comment);
    submit(fd, { method: "post" });
  };

  const handleImport = (rows) => {
    const fd = new FormData();
    fd.append("actionType", "import");
    fd.append("rows", JSON.stringify(rows));
    submit(fd, { method: "post" });
  };

  const exportCSV = () => {
    const toCSVCell = (value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
    const rows = grouped.flatMap((g) =>
      g.reviews.map((r) =>
        [
          r.customer,
          r.email || "",
          g.productTitle,
          g.productId,
          r.rating,
          r.comment,
          r.status,
          r.createdAt,
        ].map(toCSVCell).join(",")
      )
    );
    const csv = [[
      "Customer",
      "Email",
      "Product",
      "ProductId",
      "Rating",
      "Comment",
      "Status",
      "Date",
    ].map(toCSVCell).join(","), ...rows].join("\n");
    Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })),
      download: "reviews.csv",
    }).click();
  };

  const go = (params) => setSearchParams(params);
  const changeTab  = (t) => go({ tab: t, search: searchVal, page: 1 });
  const changePage = (p) => go({ tab, search: searchVal, page: p });

  const handleSearch = (e) => {
    e.preventDefault();
    go({ tab, search: searchVal, page: 1 });
  };

  const TABS = [
    { key: "all",      label: "All Reviews", count: allCount      },
    { key: "approved", label: "Approved",     count: approvedCount },
    { key: "pending",  label: "Pending",      count: pendingCount  },
    { key: "rejected", label: "Rejected",     count: rejectedCount },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh", padding: "28px" }}>
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}

      {/* ── Top Bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-0.4px" }}>
            Product Reviews
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>
            Manage, moderate and export customer feedback
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowImport(true)} style={{
            border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 18px",
            fontSize: 13, fontWeight: 600, background: C.surface, cursor: "pointer",
            color: C.text, display: "flex", alignItems: "center", gap: 7,
          }}>📥 Import</button>
          <button onClick={exportCSV} style={{
            border: "none", borderRadius: 10, padding: "9px 18px",
            fontSize: 13, fontWeight: 700, background: C.accent, color: "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
          }}>↓ Export CSV</button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <StatCard label="Total Reviews"  value={allCount}      icon="💬" bg={C.accentLt} color={C.accent} />
        <StatCard label="Approved"       value={approvedCount} icon="✅" bg={C.greenLt}  color={C.green}  />
        <StatCard label="Pending"        value={pendingCount}  icon="⏳" bg={C.amberLt}  color={C.amber}  />
        <StatCard label="Rejected"       value={rejectedCount} icon="❌" bg={C.redLt}    color={C.red}    />
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: "12px 18px", marginBottom: 18,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,.04)",
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => changeTab(key)}
              style={{
                border: "none", borderRadius: 8, padding: "6px 14px",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: tab === key ? C.accent : "transparent",
                color: tab === key ? "#fff" : C.muted,
                display: "flex", alignItems: "center", gap: 6,
                transition: "all .15s",
              }}
            >
              {label}
              <span style={{
                fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 7px",
                background: tab === key ? "rgba(255,255,255,.25)" : C.border,
                color: tab === key ? "#fff" : C.muted,
              }}>{count}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
          <input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search customer, email or comment…"
            style={{
              border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 14px",
              fontSize: 13, color: C.text, background: "#f9fafb",
              outline: "none", fontFamily: "inherit", width: 220,
            }}
          />
          <button type="submit" style={{
            border: "none", borderRadius: 9, padding: "7px 16px",
            background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Search</button>
          {searchVal && (
            <button
              type="button"
              onClick={() => { setSearchVal(""); go({ tab, search: "", page: 1 }); }}
              style={{
                border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 12px",
                background: "#fff", color: C.muted, fontSize: 13, cursor: "pointer",
              }}
            >✕</button>
          )}
        </form>
      </div>

      {/* ── Groups ── */}
      {grouped.length === 0 ? (
        <div style={{
          background: C.surface, borderRadius: 14, border: `1px dashed ${C.border}`,
          padding: 60, textAlign: "center", color: C.muted, fontSize: 14,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          No reviews found for the current filter.
        </div>
      ) : (
        grouped.map((g) => <ProductGroup key={g.productId} group={g} onAction={handleAction} />)
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 28 }}>
          <button disabled={page === 1} onClick={() => changePage(page - 1)} style={{
            border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 20px",
            fontSize: 13, fontWeight: 600,
            cursor: page === 1 ? "default" : "pointer",
            background: page === 1 ? "#f3f4f6" : C.surface,
            color: page === 1 ? "#d1d5db" : C.text,
          }}>← Prev</button>

          <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
            Page {page} of {totalPages}
          </span>

          <button disabled={page === totalPages} onClick={() => changePage(page + 1)} style={{
            border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 20px",
            fontSize: 13, fontWeight: 600,
            cursor: page === totalPages ? "default" : "pointer",
            background: page === totalPages ? "#f3f4f6" : C.surface,
            color: page === totalPages ? "#d1d5db" : C.text,
          }}>Next →</button>
        </div>
      )}
    </div>
  );
}
