import { useLoaderData, useSubmit, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import { redirect } from "react-router";
import db from "../db.server";
import { useState, useRef } from "react";
import { syncSubscriptionStatus, isDevStore } from "../billing.server";

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
/* ─────────────────────────────────────────
   LOCALE HELPER
───────────────────────────────────────── */
const SUPPORTED_LANGS = ["en", "hi", "es", "fr", "de", "it", "pt", "nl", "ar", "zh", "ja", "ru", "tr", "pl", "ko"];

function mapLocale(shopifyLocale = "en") {
  const base = shopifyLocale.split("-")[0].toLowerCase();
  return SUPPORTED_LANGS.includes(base) ? base : "en";
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    const dev = await isDevStore(admin);
    if (!dev) {
      const activePlan = await syncSubscriptionStatus(admin, session.shop);
      if (activePlan !== "advanced") {
        const url = new URL(request.url);
        const billingUrl = `/app/billing?${url.searchParams.toString()}`;
        throw redirect(billingUrl);
      }
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[billing gate] error, skipping:", err.message);
  }

  // ── Fetch shop's primary locale ──────────────────────────────────────────────
  let shopLocale = "en";
  try {
    const res  = await admin.graphql(`{ shop { primaryLocale } }`);
    const data = await res.json();
    shopLocale = mapLocale(data?.data?.shop?.primaryLocale || "en");
  } catch (e) {
    console.error("[locale fetch] failed, defaulting to en:", e.message);
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const tab = url.searchParams.get("tab") || "all";
  const search = url.searchParams.get("search") || "";
  const limit = 5;

  const store = await db.store.findUnique({
    where: { shop: session.shop },
    select: { id: true, language: true },
  });

  shopLocale = store?.language || shopLocale;

  if (!store) {
    return {
      shopLocale,
      grouped: [], total: 0, page, limit,
      allCount: 0, approvedCount: 0, pendingCount: 0, rejectedCount: 0,
      tab, search,
    };
  }

  const where = { storeId: store.id };
  if (tab === "approved") where.status = "approved";
  if (tab === "pending")  where.status = "pending";
  if (tab === "rejected") where.status = "rejected";
  if (search) {
    where.OR = [
      { customer: { contains: search } },
      { email:    { contains: search } },
      { comment:  { contains: search } },
    ];
  }

  const reviews = await db.review.findMany({
    where,
    include: { product: { select: { shopifyProductId: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const productIds = [
    ...new Set(
      reviews
        .map((r) => r.product.shopifyProductId)
        .filter((id) => /^\d+$/.test(id)),
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
              product ? { title: product.title, image: product.featuredImage?.url } : null,
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
    shopLocale,
    grouped: Object.values(grouped),
    total, page, limit,
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
    await db.review.updateMany({ where: { id, storeId: store.id }, data: { status: "approved" } });
  }
  if (actionType === "reject" && store) {
    await db.review.updateMany({ where: { id, storeId: store.id }, data: { status: "rejected" } });
  }
  if (actionType === "delete" && store) {
    await db.review.deleteMany({ where: { id, storeId: store.id } });
  }
  if (actionType === "edit" && store) {
    await db.review.updateMany({ where: { id, storeId: store.id }, data: { comment: normalizeComment(comment) } });
  }
  if (actionType === "import") {
    const rows = JSON.parse(String(formData.get("rows") || "[]"));
    for (const row of rows) {
      const scopedProduct = await ensureStoreAndProduct(session.shop, row.productid || row.productId);
      if (!scopedProduct) continue;
      await db.review.create({
        data: {
          storeId:  scopedProduct.storeId,
          productId: scopedProduct.productId,
          customer: normalizeCustomer(row.customer),
          email:    normalizeEmail(row.email),
          rating:   normalizeRating(row.rating),
          comment:  normalizeComment(row.comment),
          status:   normalizeStatus(row.status),
        },
      });
    }
  }

  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") || "all";
  const search = url.searchParams.get("search") || "";
  return redirect(`/app?tab=${tab}&search=${encodeURIComponent(search)}`);
};

/* ─────────────────────────────────────────
   TRANSLATIONS
───────────────────────────────────────── */
const TRANSLATIONS = {
  en: {
    flag: "🇬🇧", label: "English",
    pageTitle: "Product Reviews",
    pageSubtitle: "Manage, moderate and export customer feedback",
    installWidget: "Install Widget",
    installing: "Installing...",
    import: "Import",
    exportCSV: "Export CSV",
    totalReviews: "Total Reviews",
    approved: "Approved",
    pending: "Pending",
    rejected: "Rejected",
    allReviews: "All Reviews",
    searchPlaceholder: "Search customer, email or comment…",
    search: "Search",
    customer: "Customer",
    rating: "Rating",
    comment: "Comment",
    status: "Status",
    date: "Date",
    actions: "Actions",
    approve: "Approve",
    reject: "Reject",
    noReviews: "No reviews found for the current filter.",
    prev: "← Prev",
    next: "Next →",
    page: "Page",
    of: "of",
    reviews: "reviews",
    review: "review",
    importTitle: "Import Reviews",
    importSubtitle: "Upload a CSV from any supported review app — format is detected automatically.",
    chooseFile: "Choose CSV file",
    changeFile: "Change file",
    cancel: "Cancel",
    widgetInstalled: "Widget Installed Successfully!",
    widgetSubtitle: "Now add the review widget to your product pages by following these steps:",
    gotIt: "Got it! Close",
  },
  hi: {
    flag: "🇮🇳", label: "हिंदी",
    pageTitle: "उत्पाद समीक्षाएँ",
    pageSubtitle: "ग्राहक प्रतिक्रिया प्रबंधित करें और निर्यात करें",
    installWidget: "विजेट इंस्टॉल करें",
    installing: "इंस्टॉल हो रहा है...",
    import: "आयात करें",
    exportCSV: "CSV निर्यात करें",
    totalReviews: "कुल समीक्षाएँ",
    approved: "स्वीकृत",
    pending: "लंबित",
    rejected: "अस्वीकृत",
    allReviews: "सभी समीक्षाएँ",
    searchPlaceholder: "ग्राहक, ईमेल या टिप्पणी खोजें…",
    search: "खोजें",
    customer: "ग्राहक",
    rating: "रेटिंग",
    comment: "टिप्पणी",
    status: "स्थिति",
    date: "तारीख",
    actions: "क्रियाएँ",
    approve: "स्वीकृत करें",
    reject: "अस्वीकृत करें",
    noReviews: "वर्तमान फ़िल्टर के लिए कोई समीक्षा नहीं मिली।",
    prev: "← पिछला",
    next: "अगला →",
    page: "पृष्ठ",
    of: "में से",
    reviews: "समीक्षाएँ",
    review: "समीक्षा",
    importTitle: "समीक्षाएँ आयात करें",
    importSubtitle: "किसी भी समर्थित ऐप से CSV अपलोड करें — प्रारूप स्वचालित रूप से पहचाना जाएगा।",
    chooseFile: "CSV फ़ाइल चुनें",
    changeFile: "फ़ाइल बदलें",
    cancel: "रद्द करें",
    widgetInstalled: "विजेट सफलतापूर्वक इंस्टॉल हो गया!",
    widgetSubtitle: "अब इन चरणों का पालन करके अपने उत्पाद पृष्ठों पर समीक्षा विजेट जोड़ें:",
    gotIt: "समझ गया! बंद करें",
  },
  es: {
    flag: "🇪🇸", label: "Español",
    pageTitle: "Reseñas de Productos",
    pageSubtitle: "Gestiona, modera y exporta comentarios de clientes",
    installWidget: "Instalar Widget",
    installing: "Instalando...",
    import: "Importar",
    exportCSV: "Exportar CSV",
    totalReviews: "Total de Reseñas",
    approved: "Aprobado",
    pending: "Pendiente",
    rejected: "Rechazado",
    allReviews: "Todas las Reseñas",
    searchPlaceholder: "Buscar cliente, correo o comentario…",
    search: "Buscar",
    customer: "Cliente",
    rating: "Calificación",
    comment: "Comentario",
    status: "Estado",
    date: "Fecha",
    actions: "Acciones",
    approve: "Aprobar",
    reject: "Rechazar",
    noReviews: "No se encontraron reseñas para el filtro actual.",
    prev: "← Anterior",
    next: "Siguiente →",
    page: "Página",
    of: "de",
    reviews: "reseñas",
    review: "reseña",
    importTitle: "Importar Reseñas",
    importSubtitle: "Sube un CSV de cualquier app compatible — el formato se detecta automáticamente.",
    chooseFile: "Elegir archivo CSV",
    changeFile: "Cambiar archivo",
    cancel: "Cancelar",
    widgetInstalled: "¡Widget Instalado Exitosamente!",
    widgetSubtitle: "Ahora agrega el widget de reseñas a tus páginas de productos siguiendo estos pasos:",
    gotIt: "¡Entendido! Cerrar",
  },
  fr: {
    flag: "🇫🇷", label: "Français",
    pageTitle: "Avis sur les Produits",
    pageSubtitle: "Gérez, modérez et exportez les avis clients",
    installWidget: "Installer le Widget",
    installing: "Installation...",
    import: "Importer",
    exportCSV: "Exporter CSV",
    totalReviews: "Total des Avis",
    approved: "Approuvé",
    pending: "En attente",
    rejected: "Rejeté",
    allReviews: "Tous les Avis",
    searchPlaceholder: "Rechercher client, email ou commentaire…",
    search: "Rechercher",
    customer: "Client",
    rating: "Note",
    comment: "Commentaire",
    status: "Statut",
    date: "Date",
    actions: "Actions",
    approve: "Approuver",
    reject: "Rejeter",
    noReviews: "Aucun avis trouvé pour le filtre actuel.",
    prev: "← Précédent",
    next: "Suivant →",
    page: "Page",
    of: "sur",
    reviews: "avis",
    review: "avis",
    importTitle: "Importer des Avis",
    importSubtitle: "Téléchargez un CSV depuis n'importe quelle app compatible — le format est détecté automatiquement.",
    chooseFile: "Choisir un fichier CSV",
    changeFile: "Changer de fichier",
    cancel: "Annuler",
    widgetInstalled: "Widget Installé avec Succès !",
    widgetSubtitle: "Ajoutez maintenant le widget d'avis à vos pages produits en suivant ces étapes :",
    gotIt: "Compris ! Fermer",
  },
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
   INSTALLATION DOCS MODAL
───────────────────────────────────────── */
function InstallDocsModal({ onClose, t }) {
  const codeSnippet = '<div data-trust-product-id="{{ product.id }}"></div>';
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        background: C.surface, borderRadius: 20, padding: 32, width: 650,
        maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)", position: "relative",
      }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14, width: 30, height: 30,
          borderRadius: 8, border: "none", background: "#f3f4f6",
          cursor: "pointer", fontSize: 15, color: C.muted,
        }}>✕</button>

        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>
          ✅ {t.widgetInstalled}
        </div>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>{t.widgetSubtitle}</p>

        {[
          { n: 1, title: "Go to Theme Editor", body: <>Navigate to <strong>Online Store → Themes</strong> and click <strong>Customize</strong> on your active theme.</> },
          { n: 2, title: "Find Your Product Template", body: <>In the theme editor, navigate to <strong>Products → Default Product</strong>.</> },
          { n: 3, title: "Edit Code", body: <>Click <strong>⋮</strong> → <strong>Edit code</strong>. Find <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4 }}>sections/main-product.liquid</code></> },
          { n: 5, title: "Save & Preview", body: <>Click <strong>Save</strong>, then view any product page to see your review widget live! 🎉</> },
        ].map(({ n, title, body }) => (
          <div key={n} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontSize: 16, fontWeight: 700, color: C.text }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%", background: C.accentLt,
                color: C.accent, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800,
              }}>{n}</span>
              {title}
            </div>
            <p style={{ fontSize: 13, color: C.muted, marginLeft: 38, lineHeight: 1.6 }}>{body}</p>
          </div>
        ))}

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontSize: 16, fontWeight: 700, color: C.text }}>
            <span style={{
              width: 28, height: 28, borderRadius: "50%", background: C.accentLt,
              color: C.accent, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800,
            }}>4</span>
            Paste the Widget Code
          </div>
          <div style={{
            background: "#1e293b", borderRadius: 10, padding: "14px 16px",
            marginLeft: 38, position: "relative", border: "1px solid #334155",
          }}>
            <code style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 13, display: "block", whiteSpace: "pre" }}>
              {codeSnippet}
            </code>
            <button onClick={copyCode} style={{
              position: "absolute", top: 10, right: 10,
              background: copied ? C.green : C.accent,
              color: "#fff", border: "none", borderRadius: 6,
              padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <button onClick={onClose} style={{
          width: "100%", border: "none", borderRadius: 10, padding: "12px",
          background: C.accent, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>{t.gotIt}</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   IMPORT MODAL
───────────────────────────────────────── */
function ImportModal({ onClose, onImport, t }) {
  const fileRef = useRef();
  const [preview, setPreview]     = useState([]);
  const [error, setError]         = useState("");
  const [detected, setDetected]   = useState("");
  const [totalRows, setTotalRows] = useState(0);

  const parseCSVLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
      current += char;
    }
    values.push(current.trim());
    return values.map((v) => v.replace(/\r$/, ""));
  };

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1).map((line) => {
      const vals = parseCSVLine(line);
      const row  = {};
      headers.forEach((h, i) => (row[h] = vals[i]?.trim() || ""));
      return row;
    });
    return { headers, rows };
  };

  const detectFormat = (headers) => {
    if (headers.includes("reviewer_name") && headers.includes("product_id")) return "judgeme";
    if (headers.includes("author") && (headers.includes("product_id") || headers.includes("productid"))) return "zeppo";
    if (headers.includes("customer") && (headers.includes("productid") || headers.includes("product_id"))) return "native";
    return "unknown";
  };

  const normalizeRow = (row, format) => {
    if (format === "judgeme") return {
      customer:  row["reviewer_name"]  || "Unknown",
      email:     row["reviewer_email"] || "",
      productId: row["product_id"]     || "",
      rating:    row["rating"]         || "5",
      comment:   row["body"]           || row["title"] || "",
      status:    row["curated"] === "true" ? "approved" : "pending",
    };
    if (format === "zeppo") return {
      customer:  row["author"]     || row["reviewer_name"] || "Unknown",
      email:     row["email"]      || row["reviewer_email"] || "",
      productId: row["product_id"] || row["productid"]     || "",
      rating:    row["rating"]     || row["score"]          || "5",
      comment:   row["body"]       || row["content"]        || row["message"] || "",
      status:    row["published"] === "true" || row["status"] === "approved" ? "approved" : "pending",
    };
    return {
      customer:  row["customer"]  || "Unknown",
      email:     row["email"]     || "",
      productId: row["productid"] || row["product_id"] || "",
      rating:    row["rating"]    || "5",
      comment:   row["comment"]   || "",
      status:    row["status"]    || "pending",
    };
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) { setError("Only .csv files are supported."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { headers, rows } = parseCSV(ev.target.result);
        const format = detectFormat(headers);
        if (format === "unknown") {
          setError("Could not recognise the CSV format. Supported: Judge.me, Zeppo/Okendo/Stamped, or native export.");
          setPreview([]); setDetected(""); setTotalRows(0);
          return;
        }
        const normalized = rows.map((r) => normalizeRow(r, format));
        setDetected(format); setTotalRows(normalized.length);
        setPreview(normalized.slice(0, 3)); setError("");
      } catch { setError("Failed to parse CSV."); }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const file = fileRef.current?.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);
      const format = detectFormat(headers);
      const normalized = rows.map((r) => normalizeRow(r, format));
      onImport(normalized);
      onClose();
    };
    reader.readAsText(file);
  };

  const FORMAT_META = {
    judgeme: { icon: "⚖️", label: "Judge.me",               color: "#7c3aed", bg: "#ede9fe" },
    zeppo:   { icon: "⚡", label: "Zeppo / Okendo / Stamped", color: "#0369a1", bg: "#e0f2fe" },
    native:  { icon: "🏠", label: "Native Export",            color: "#16a34a", bg: "#dcfce7" },
  };

  const fmt = FORMAT_META[detected];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        background: C.surface, borderRadius: 20, padding: 32, width: 520,
        maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,.22)", position: "relative",
      }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14, width: 30, height: 30,
          borderRadius: 8, border: "none", background: "#f3f4f6",
          cursor: "pointer", fontSize: 15, color: C.muted,
        }}>✕</button>

        <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 6 }}>📥 {t.importTitle}</div>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>{t.importSubtitle}</p>

        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {Object.values(FORMAT_META).map((f) => (
            <span key={f.label} style={{
              fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 11px",
              background: f.bg, color: f.color,
            }}>{f.icon} {f.label}</span>
          ))}
        </div>

        <label style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          border: `2px dashed ${detected ? "#a78bfa" : C.border}`,
          borderRadius: 12, padding: "28px 20px", cursor: "pointer",
          background: detected ? "#faf8ff" : "#fafbff", marginBottom: 14, gap: 6,
        }}>
          <span style={{ fontSize: 36 }}>📂</span>
          <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>
            {detected ? t.changeFile : t.chooseFile}
          </span>
          <span style={{ fontSize: 11, color: C.muted }}>Judge.me · Zeppo/Okendo/Stamped · Native export</span>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFile} />
        </label>

        {fmt && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: fmt.bg, borderRadius: 10, padding: "10px 14px", marginBottom: 14,
          }}>
            <span style={{ fontSize: 22 }}>{fmt.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: fmt.color }}>{fmt.label} format detected</div>
              <div style={{ fontSize: 11, color: fmt.color, opacity: 0.8 }}>
                {totalRows} {totalRows !== 1 ? t.reviews : t.review} found
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: C.redLt, border: `1px solid #fca5a5`,
            borderRadius: 10, padding: "10px 14px",
            fontSize: 12, color: C.red, marginBottom: 14,
          }}>⚠️ {error}</div>
        )}

        {preview.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 8 }}>
              Preview — first {preview.length} of {totalRows} rows
            </div>
            {preview.map((row, i) => (
              <div key={i} style={{
                background: "#f9fafb", borderRadius: 10, padding: "10px 14px",
                fontSize: 12, color: C.text, marginBottom: 6,
                border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 4,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: "50%", background: C.accentLt,
                    color: C.accent, display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, flexShrink: 0,
                  }}>{(row.customer || "?")[0].toUpperCase()}</span>
                  <strong style={{ fontSize: 13 }}>{row.customer}</strong>
                  {row.email && <span style={{ color: C.muted, fontSize: 11 }}>{row.email}</span>}
                  <span style={{ marginLeft: "auto", display: "flex" }}>
                    {Array.from({ length: 5 }, (_, idx) => (
                      <span key={idx} style={{ color: idx < Number(row.rating) ? "#f59e0b" : "#d1d5db", fontSize: 13 }}>★</span>
                    ))}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 8px",
                    background: row.status === "approved" ? C.greenLt : C.amberLt,
                    color: row.status === "approved" ? C.green : C.amber,
                  }}>{row.status}</span>
                </div>
                {row.comment && (
                  <div style={{ color: C.muted, fontSize: 11, paddingLeft: 34, lineHeight: 1.5 }}>
                    {row.comment.length > 100 ? row.comment.slice(0, 100) + "…" : row.comment}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 20px",
            fontSize: 13, fontWeight: 600, background: "#fff", cursor: "pointer", color: C.text,
          }}>{t.cancel}</button>
          <button onClick={handleImport} disabled={!preview.length} style={{
            border: "none", borderRadius: 10, padding: "9px 22px",
            fontSize: 13, fontWeight: 700,
            background: preview.length ? C.accent : "#d1d5db",
            color: "#fff", cursor: preview.length ? "pointer" : "default",
          }}>
            {preview.length ? `${t.import} ${totalRows} ${totalRows !== 1 ? t.reviews : t.review}` : t.import}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   REVIEW ROW
───────────────────────────────────────── */
function ReviewRow({ review, onAction, t }) {
  const ss = statusStyle(review.status);
  return (
    <tr
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f9fc")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      style={{ transition: "background .12s" }}
    >
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
      <td style={TD}><div style={{ display: "flex" }}>{stars(review.rating)}</div></td>
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
      <td style={TD}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          background: ss.bg, color: ss.color, borderRadius: 20, padding: "3px 11px",
          fontSize: 12, fontWeight: 600,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ss.dot }} />
          {t[review.status] || review.status}
        </span>
      </td>
      <td style={{ ...TD, color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>
        {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </td>
      <td style={TD}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onAction("approve", review)} style={ABT("approve")}>✓ {t.approve}</button>
          <button onClick={() => onAction("reject",  review)} style={ABT("reject")}>✕ {t.reject}</button>
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
function ProductGroup({ group, onAction, t }) {
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
          borderBottom: open ? `1px solid ${C.border}` : "none",
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
        }}>
          {group.reviews.length} {group.reviews.length !== 1 ? t.reviews : t.review}
        </span>
        <span style={{
          fontSize: 11, color: C.muted,
          transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .2s", display: "inline-block",
        }}>▶</span>
      </div>

      {open && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[t.customer, t.rating, t.comment, t.status, t.date, t.actions].map((h) => (
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
              <ReviewRow key={r.id} review={r} onAction={onAction} t={t} />
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
    shopLocale, grouped, total, page, limit,
    allCount, approvedCount, pendingCount, rejectedCount,
    tab, search,
  } = useLoaderData();

  const submit = useSubmit();
  const [, setSearchParams] = useSearchParams();
  const [showImport, setShowImport] = useState(false);
  const [searchVal,  setSearchVal]  = useState(search);
  const lang = shopLocale || "en"; // ← persisted store language, switcher lives in Settings

  const [installing, setInstalling]     = useState(false);
  const [installMsg, setInstallMsg]     = useState("");
  const [installOk,  setInstallOk]      = useState(null);
  const [showInstallDocs, setShowInstallDocs] = useState(false);

  const t = TRANSLATIONS[lang]; // current language strings
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

  const handleInstallScript = async () => {
    setInstalling(true); setInstallMsg(""); setInstallOk(null);
    try {
      const res  = await fetch("/api/install-script");
      const data = await res.json();
      setInstallMsg(data.message || "Installed!");
      setInstallOk(true);
      setTimeout(() => { setShowInstallDocs(true); setInstallMsg(""); }, 1000);
    } catch {
      setInstallMsg("Error installing script");
      setInstallOk(false);
      setTimeout(() => { setInstallMsg(""); setInstallOk(null); }, 4000);
    } finally { setInstalling(false); }
  };

  const exportCSV = () => {
    const toCSVCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = grouped.flatMap((g) =>
      g.reviews.map((r) =>
        [r.customer, r.email || "", g.productTitle, g.productId,
         r.rating, r.comment, r.status, r.createdAt].map(toCSVCell).join(",")
      )
    );
    const csv = [
      ["Customer","Email","Product","ProductId","Rating","Comment","Status","Date"].map(toCSVCell).join(","),
      ...rows,
    ].join("\n");
    Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })),
      download: "reviews.csv",
    }).click();
  };

  const go = (params) => setSearchParams(params);
  const changeTab  = (tk) => go({ tab: tk, search: searchVal, page: 1 });
  const changePage = (p)  => go({ tab, search: searchVal, page: p });

  const handleSearch = (e) => {
    e.preventDefault();
    go({ tab, search: searchVal, page: 1 });
  };

  const TABS = [
    { key: "all",      label: t.allReviews, count: allCount      },
    { key: "approved", label: t.approved,   count: approvedCount },
    { key: "pending",  label: t.pending,    count: pendingCount  },
    { key: "rejected", label: t.rejected,   count: rejectedCount },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.bg, minHeight: "100vh", padding: "28px" }}>
      {showImport     && <ImportModal     onClose={() => setShowImport(false)}     onImport={handleImport} t={t} />}
      {showInstallDocs && <InstallDocsModal onClose={() => setShowInstallDocs(false)} t={t} />}

      {/* ── Top Bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-0.4px" }}>
            {t.pageTitle}
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0" }}>{t.pageSubtitle}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={handleInstallScript}
            disabled={installing}
            style={{
              border: `1px solid ${C.accent}`, borderRadius: 10, padding: "9px 18px",
              fontSize: 13, fontWeight: 600,
              background: installing ? "#f3f4f6" : C.accentLt,
              color: installing ? C.muted : C.accent,
              cursor: installing ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 7,
            }}
          >
            {installing ? `⏳ ${t.installing}` : `⚡ ${t.installWidget}`}
          </button>

          {installMsg && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: installOk ? C.green : C.red,
              background: installOk ? C.greenLt : C.redLt,
              padding: "6px 12px", borderRadius: 8,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              {installOk ? "✅" : "❌"} {installMsg}
            </span>
          )}

          <button onClick={() => setShowImport(true)} style={{
            border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 18px",
            fontSize: 13, fontWeight: 600, background: C.surface, cursor: "pointer",
            color: C.text, display: "flex", alignItems: "center", gap: 7,
          }}>📥 {t.import}</button>

          <button onClick={exportCSV} style={{
            border: "none", borderRadius: 10, padding: "9px 18px",
            fontSize: 13, fontWeight: 700, background: C.accent, color: "#fff",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
          }}>↓ {t.exportCSV}</button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <StatCard label={t.totalReviews} value={allCount}      icon="💬" bg={C.accentLt} color={C.accent} />
        <StatCard label={t.approved}     value={approvedCount} icon="✅" bg={C.greenLt}  color={C.green}  />
        <StatCard label={t.pending}      value={pendingCount}  icon="⏳" bg={C.amberLt}  color={C.amber}  />
        <StatCard label={t.rejected}     value={rejectedCount} icon="❌" bg={C.redLt}    color={C.red}    />
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
        padding: "12px 18px", marginBottom: 18,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,.04)",
      }}>
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

        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
          <input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 14px",
              fontSize: 13, color: C.text, background: "#f9fafb",
              outline: "none", fontFamily: "inherit", width: 220,
            }}
          />
          <button type="submit" style={{
            border: "none", borderRadius: 9, padding: "7px 16px",
            background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>{t.search}</button>
          {searchVal && (
            <button type="button" onClick={() => { setSearchVal(""); go({ tab, search: "", page: 1 }); }} style={{
              border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 12px",
              background: "#fff", color: C.muted, fontSize: 13, cursor: "pointer",
            }}>✕</button>
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
          {t.noReviews}
        </div>
      ) : (
        grouped.map((g) => <ProductGroup key={g.productId} group={g} onAction={handleAction} t={t} />)
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
          }}>{t.prev}</button>
          <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
            {t.page} {page} {t.of} {totalPages}
          </span>
          <button disabled={page === totalPages} onClick={() => changePage(page + 1)} style={{
            border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 20px",
            fontSize: 13, fontWeight: 600,
            cursor: page === totalPages ? "default" : "pointer",
            background: page === totalPages ? "#f3f4f6" : C.surface,
            color: page === totalPages ? "#d1d5db" : C.text,
          }}>{t.next}</button>
        </div>
      )}
    </div>
  );
}