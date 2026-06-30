import { useLoaderData, useSubmit, useSearchParams, useFetcher, Link } from "react-router";
import { authenticate } from "../shopify.server";
import { redirect } from "react-router";
import db from "../db.server";
import { useState, useRef, useEffect } from "react";
//import { syncSubscriptionStatus, isDevStore } from "../billing.server";

const REVIEW_STATUSES = new Set(["pending", "approved", "rejected"]);

const HIDE_REASONS = [
  { value: "fake",                    label: "Fake" },
  { value: "duplicate",                label: "Duplicated review" },
  { value: "spam",                     label: "Spam" },
  { value: "unrelated",                label: "Unrelated to the product" },
  { value: "legal",                    label: "Legal reasons" },
  { value: "inappropriate_language",   label: "Inappropriate language" },
  { value: "foreign_language",         label: "Foreign language" },
  { value: "private_info",             label: "Contains private information" },
  { value: "false_misleading",         label: "False or misleading" },
];

const SENTIMENT_META = {
  positive: { icon: "🟢", label: "Positive" },
  neutral:  { icon: "⚪", label: "Neutral"  },
  negative: { icon: "🔴", label: "Negative" },
};

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

async function ensureStore(shop) {
  return db.store.upsert({
    where: { shop },
    update: {},
    create: { shop },
    select: { id: true },
  });
}

// Returns null when rawProductId is missing/unrecognized — callers decide
// whether that means "skip this row" or "import with no product assigned".
async function ensureProduct(storeId, rawProductId) {
  const shopifyProductId = normalizeProductId(rawProductId);
  if (!shopifyProductId) return null;

  const product = await db.product.upsert({
    where: { storeId_shopifyProductId: { storeId, shopifyProductId } },
    update: {},
    create: { storeId, shopifyProductId },
    select: { id: true },
  });

  return product.id;
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

  /*try {
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
  }*/

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
    select: { id: true, language: true, autoPublish: true },
  });

  shopLocale = store?.language || shopLocale;

  if (!store) {
    return {
      shopLocale,
      grouped: [], total: 0, page, limit,
      allCount: 0, approvedCount: 0, pendingCount: 0, rejectedCount: 0,
      tab, search, autoPublish: false,
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
        .map((r) => r.product?.shopifyProductId)
        .filter((id) => id && /^\d+$/.test(id)),
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

  // Reviews imported without a product ID (or whose product was deleted)
  // have no `product` row at all — group those under "Unassigned" so they're
  // visible and can be assigned a product from the dashboard instead of
  // disappearing.
  const enriched = reviews.map((r) => {
    const shopifyProductId = r.product?.shopifyProductId || null;
    return {
      ...r,
      storefrontProductId: shopifyProductId || "unassigned",
      productTitle: shopifyProductId ? (products[shopifyProductId]?.title || "Unknown Product") : "Unassigned",
      productImage: shopifyProductId ? products[shopifyProductId]?.image : null,
    };
  });

  const grouped = {};
  // Always show the Unassigned group first so it can't be missed.
  grouped.unassigned = {
    productId: "unassigned",
    productTitle: "Unassigned",
    productImage: null,
    reviews: [],
  };
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
  if (grouped.unassigned.reviews.length === 0) delete grouped.unassigned;

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
    autoPublish: store.autoPublish,
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
    await db.review.updateMany({ where: { id, storeId: store.id }, data: { status: "approved", hideReason: null } });
  }
  if (actionType === "reject" && store) {
    const hideReason = formData.get("hideReason");
    await db.review.updateMany({
      where: { id, storeId: store.id },
      data: { status: "rejected", hideReason: hideReason ? String(hideReason) : null },
    });
  }
  if (actionType === "delete" && store) {
    await db.review.deleteMany({ where: { id, storeId: store.id } });
  }
  if (actionType === "edit" && store) {
    await db.review.updateMany({ where: { id, storeId: store.id }, data: { comment: normalizeComment(comment) } });
  }
  if (actionType === "reply" && store) {
    const reply = String(formData.get("reply") || "").trim();
    await db.review.updateMany({
      where: { id, storeId: store.id },
      data: reply ? { reply, repliedAt: new Date() } : { reply: null, repliedAt: null },
    });
  }
  if (actionType === "tag" && store) {
    const tags = String(formData.get("tags") || "").trim();
    await db.review.updateMany({ where: { id, storeId: store.id }, data: { tags: tags || null } });
  }
  if (actionType === "bulk" && store) {
    const ids = JSON.parse(String(formData.get("ids") || "[]")).map(Number).filter(Number.isFinite);
    const bulkAction = formData.get("bulkAction");
    if (ids.length) {
      if (bulkAction === "approve") {
        await db.review.updateMany({ where: { id: { in: ids }, storeId: store.id }, data: { status: "approved", hideReason: null } });
      } else if (bulkAction === "reject") {
        await db.review.updateMany({ where: { id: { in: ids }, storeId: store.id }, data: { status: "rejected" } });
      } else if (bulkAction === "delete") {
        await db.review.deleteMany({ where: { id: { in: ids }, storeId: store.id } });
      }
    }
  }
  // Assign one product to many reviews at once — same picker as the
  // per-review "Assign/Change Product" button, just applied in bulk.
  if (actionType === "bulkAssignProduct" && store) {
    const ids = JSON.parse(String(formData.get("ids") || "[]")).map(Number).filter(Number.isFinite);
    const shopifyProductId = normalizeProductId(formData.get("shopifyProductId"));
    if (ids.length && shopifyProductId) {
      const newProductId = await ensureProduct(store.id, shopifyProductId);
      await db.review.updateMany({ where: { id: { in: ids }, storeId: store.id }, data: { productId: newProductId } });
    }
  }
  if (actionType === "toggleAutoPublish") {
    const autoPublish = formData.get("autoPublish") === "true";
    await db.store.upsert({
      where: { shop: session.shop },
      update: { autoPublish },
      create: { shop: session.shop, autoPublish },
    });
  }
  // Assign or change which product a review belongs to — used both for
  // reviews imported without a product ID, and to re-point any review to a
  // different product later.
  if (actionType === "assignProduct" && store) {
    const shopifyProductId = normalizeProductId(formData.get("shopifyProductId"));
    if (shopifyProductId) {
      const newProductId = await ensureProduct(store.id, shopifyProductId);
      await db.review.updateMany({ where: { id, storeId: store.id }, data: { productId: newProductId } });
    }
  }
  if (actionType === "import") {
    const rows = JSON.parse(String(formData.get("rows") || "[]"));
    const importStore = await ensureStore(session.shop);
    for (const row of rows) {
      // No product ID? Import anyway with productId left unassigned — it'll
      // show up under "Unassigned" in the dashboard for the merchant to pick
      // a product for later, instead of silently dropping the review.
      const productId = await ensureProduct(importStore.id, row.productid || row.productId);
      await db.review.create({
        data: {
          storeId:  importStore.id,
          productId,
          customer: normalizeCustomer(row.customer),
          email:    normalizeEmail(row.email),
          rating:   normalizeRating(row.rating),
          title:    row.title ? normalizeComment(row.title) : null,
          comment:  normalizeComment(row.comment),
          status:   normalizeStatus(row.status),
          source:   "imported",
          mediaUrl:  row.mediaUrl  || null,
          mediaType: row.mediaType || null,
          fileName:  row.fileName  || null,
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
  de: {
    flag: "🇩🇪", label: "Deutsch",
    pageTitle: "Produktbewertungen",
    pageSubtitle: "Kundenfeedback verwalten, moderieren und exportieren",
    installWidget: "Widget installieren",
    installing: "Wird installiert...",
    import: "Importieren",
    exportCSV: "CSV exportieren",
    totalReviews: "Bewertungen insgesamt",
    approved: "Genehmigt",
    pending: "Ausstehend",
    rejected: "Abgelehnt",
    allReviews: "Alle Bewertungen",
    searchPlaceholder: "Kunde, E-Mail oder Kommentar suchen…",
    search: "Suchen",
    customer: "Kunde",
    rating: "Bewertung",
    comment: "Kommentar",
    status: "Status",
    date: "Datum",
    actions: "Aktionen",
    approve: "Genehmigen",
    reject: "Ablehnen",
    noReviews: "Keine Bewertungen für den aktuellen Filter gefunden.",
    prev: "← Zurück",
    next: "Weiter →",
    page: "Seite",
    of: "von",
    reviews: "Bewertungen",
    review: "Bewertung",
    importTitle: "Bewertungen importieren",
    importSubtitle: "Laden Sie eine CSV-Datei aus jeder unterstützten Bewertungs-App hoch — das Format wird automatisch erkannt.",
    chooseFile: "CSV-Datei auswählen",
    changeFile: "Datei ändern",
    cancel: "Abbrechen",
    widgetInstalled: "Widget erfolgreich installiert!",
    widgetSubtitle: "Fügen Sie nun das Bewertungs-Widget mit folgenden Schritten zu Ihren Produktseiten hinzu:",
    gotIt: "Verstanden! Schließen",
  },
  it: {
    flag: "🇮🇹", label: "Italiano",
    pageTitle: "Recensioni Prodotti",
    pageSubtitle: "Gestisci, modera ed esporta i feedback dei clienti",
    installWidget: "Installa Widget",
    installing: "Installazione in corso...",
    import: "Importa",
    exportCSV: "Esporta CSV",
    totalReviews: "Recensioni Totali",
    approved: "Approvata",
    pending: "In attesa",
    rejected: "Rifiutata",
    allReviews: "Tutte le Recensioni",
    searchPlaceholder: "Cerca cliente, email o commento…",
    search: "Cerca",
    customer: "Cliente",
    rating: "Valutazione",
    comment: "Commento",
    status: "Stato",
    date: "Data",
    actions: "Azioni",
    approve: "Approva",
    reject: "Rifiuta",
    noReviews: "Nessuna recensione trovata per il filtro attuale.",
    prev: "← Precedente",
    next: "Successivo →",
    page: "Pagina",
    of: "di",
    reviews: "recensioni",
    review: "recensione",
    importTitle: "Importa Recensioni",
    importSubtitle: "Carica un CSV da qualsiasi app di recensioni supportata — il formato viene rilevato automaticamente.",
    chooseFile: "Scegli file CSV",
    changeFile: "Cambia file",
    cancel: "Annulla",
    widgetInstalled: "Widget installato con successo!",
    widgetSubtitle: "Ora aggiungi il widget delle recensioni alle tue pagine prodotto seguendo questi passaggi:",
    gotIt: "Capito! Chiudi",
  },
  pt: {
    flag: "🇵🇹", label: "Português",
    pageTitle: "Avaliações de Produtos",
    pageSubtitle: "Gerencie, modere e exporte o feedback dos clientes",
    installWidget: "Instalar Widget",
    installing: "Instalando...",
    import: "Importar",
    exportCSV: "Exportar CSV",
    totalReviews: "Total de Avaliações",
    approved: "Aprovada",
    pending: "Pendente",
    rejected: "Rejeitada",
    allReviews: "Todas as Avaliações",
    searchPlaceholder: "Buscar cliente, e-mail ou comentário…",
    search: "Buscar",
    customer: "Cliente",
    rating: "Classificação",
    comment: "Comentário",
    status: "Status",
    date: "Data",
    actions: "Ações",
    approve: "Aprovar",
    reject: "Rejeitar",
    noReviews: "Nenhuma avaliação encontrada para o filtro atual.",
    prev: "← Anterior",
    next: "Próximo →",
    page: "Página",
    of: "de",
    reviews: "avaliações",
    review: "avaliação",
    importTitle: "Importar Avaliações",
    importSubtitle: "Envie um CSV de qualquer app de avaliações compatível — o formato é detectado automaticamente.",
    chooseFile: "Escolher arquivo CSV",
    changeFile: "Alterar arquivo",
    cancel: "Cancelar",
    widgetInstalled: "Widget instalado com sucesso!",
    widgetSubtitle: "Agora adicione o widget de avaliações às suas páginas de produto seguindo estas etapas:",
    gotIt: "Entendi! Fechar",
  },
  nl: {
    flag: "🇳🇱", label: "Nederlands",
    pageTitle: "Productrecensies",
    pageSubtitle: "Beheer, modereer en exporteer klantfeedback",
    installWidget: "Widget installeren",
    installing: "Installeren...",
    import: "Importeren",
    exportCSV: "CSV exporteren",
    totalReviews: "Totaal aantal recensies",
    approved: "Goedgekeurd",
    pending: "In behandeling",
    rejected: "Afgewezen",
    allReviews: "Alle recensies",
    searchPlaceholder: "Zoek klant, e-mail of opmerking…",
    search: "Zoeken",
    customer: "Klant",
    rating: "Beoordeling",
    comment: "Opmerking",
    status: "Status",
    date: "Datum",
    actions: "Acties",
    approve: "Goedkeuren",
    reject: "Afwijzen",
    noReviews: "Geen recensies gevonden voor het huidige filter.",
    prev: "← Vorige",
    next: "Volgende →",
    page: "Pagina",
    of: "van",
    reviews: "recensies",
    review: "recensie",
    importTitle: "Recensies importeren",
    importSubtitle: "Upload een CSV vanuit elke ondersteunde recensie-app — het formaat wordt automatisch herkend.",
    chooseFile: "CSV-bestand kiezen",
    changeFile: "Bestand wijzigen",
    cancel: "Annuleren",
    widgetInstalled: "Widget succesvol geïnstalleerd!",
    widgetSubtitle: "Voeg nu de recensiewidget toe aan je productpagina's met deze stappen:",
    gotIt: "Begrepen! Sluiten",
  },
  ar: {
    flag: "🇸🇦", label: "العربية",
    pageTitle: "تقييمات المنتجات",
    pageSubtitle: "إدارة وتعديل وتصدير ملاحظات العملاء",
    installWidget: "تثبيت الودجت",
    installing: "جاري التثبيت...",
    import: "استيراد",
    exportCSV: "تصدير CSV",
    totalReviews: "إجمالي التقييمات",
    approved: "مقبول",
    pending: "قيد الانتظار",
    rejected: "مرفوض",
    allReviews: "جميع التقييمات",
    searchPlaceholder: "البحث عن العميل أو البريد الإلكتروني أو التعليق…",
    search: "بحث",
    customer: "العميل",
    rating: "التقييم",
    comment: "التعليق",
    status: "الحالة",
    date: "التاريخ",
    actions: "الإجراءات",
    approve: "قبول",
    reject: "رفض",
    noReviews: "لم يتم العثور على تقييمات لهذا الفلتر.",
    prev: "← السابق",
    next: "التالي →",
    page: "صفحة",
    of: "من",
    reviews: "تقييمات",
    review: "تقييم",
    importTitle: "استيراد التقييمات",
    importSubtitle: "قم بتحميل ملف CSV من أي تطبيق تقييمات مدعوم — يتم اكتشاف التنسيق تلقائيًا.",
    chooseFile: "اختر ملف CSV",
    changeFile: "تغيير الملف",
    cancel: "إلغاء",
    widgetInstalled: "تم تثبيت الودجت بنجاح!",
    widgetSubtitle: "أضف الآن ودجت التقييمات إلى صفحات منتجاتك باتباع هذه الخطوات:",
    gotIt: "حسنًا! إغلاق",
  },
  zh: {
    flag: "🇨🇳", label: "中文",
    pageTitle: "产品评论",
    pageSubtitle: "管理、审核并导出客户反馈",
    installWidget: "安装小工具",
    installing: "正在安装...",
    import: "导入",
    exportCSV: "导出 CSV",
    totalReviews: "评论总数",
    approved: "已批准",
    pending: "待处理",
    rejected: "已拒绝",
    allReviews: "所有评论",
    searchPlaceholder: "搜索客户、邮箱或评论内容…",
    search: "搜索",
    customer: "客户",
    rating: "评分",
    comment: "评论",
    status: "状态",
    date: "日期",
    actions: "操作",
    approve: "批准",
    reject: "拒绝",
    noReviews: "当前筛选条件下未找到评论。",
    prev: "← 上一页",
    next: "下一页 →",
    page: "第",
    of: "/ 共",
    reviews: "条评论",
    review: "条评论",
    importTitle: "导入评论",
    importSubtitle: "从任何受支持的评论应用上传 CSV 文件 — 格式将自动识别。",
    chooseFile: "选择 CSV 文件",
    changeFile: "更改文件",
    cancel: "取消",
    widgetInstalled: "小工具安装成功！",
    widgetSubtitle: "现在请按照以下步骤将评论小工具添加到您的产品页面：",
    gotIt: "知道了！关闭",
  },
  ja: {
    flag: "🇯🇵", label: "日本語",
    pageTitle: "商品レビュー",
    pageSubtitle: "顧客フィードバックの管理・承認・エクスポート",
    installWidget: "ウィジェットをインストール",
    installing: "インストール中...",
    import: "インポート",
    exportCSV: "CSVを書き出す",
    totalReviews: "レビュー総数",
    approved: "承認済み",
    pending: "保留中",
    rejected: "拒否",
    allReviews: "すべてのレビュー",
    searchPlaceholder: "顧客名、メール、コメントを検索…",
    search: "検索",
    customer: "顧客",
    rating: "評価",
    comment: "コメント",
    status: "状態",
    date: "日付",
    actions: "操作",
    approve: "承認",
    reject: "拒否",
    noReviews: "現在のフィルターに一致するレビューはありません。",
    prev: "← 前へ",
    next: "次へ →",
    page: "ページ",
    of: "/ 全",
    reviews: "件のレビュー",
    review: "件のレビュー",
    importTitle: "レビューをインポート",
    importSubtitle: "対応するレビューアプリからCSVをアップロードしてください — 形式は自動的に検出されます。",
    chooseFile: "CSVファイルを選択",
    changeFile: "ファイルを変更",
    cancel: "キャンセル",
    widgetInstalled: "ウィジェットのインストールが完了しました！",
    widgetSubtitle: "次の手順に従って、商品ページにレビューウィジェットを追加してください：",
    gotIt: "了解しました！閉じる",
  },
  ru: {
    flag: "🇷🇺", label: "Русский",
    pageTitle: "Отзывы о товарах",
    pageSubtitle: "Управляйте, модерируйте и экспортируйте отзывы клиентов",
    installWidget: "Установить виджет",
    installing: "Установка...",
    import: "Импорт",
    exportCSV: "Экспорт CSV",
    totalReviews: "Всего отзывов",
    approved: "Одобрено",
    pending: "На рассмотрении",
    rejected: "Отклонено",
    allReviews: "Все отзывы",
    searchPlaceholder: "Поиск по клиенту, email или комментарию…",
    search: "Поиск",
    customer: "Клиент",
    rating: "Оценка",
    comment: "Комментарий",
    status: "Статус",
    date: "Дата",
    actions: "Действия",
    approve: "Одобрить",
    reject: "Отклонить",
    noReviews: "По текущему фильтру отзывов не найдено.",
    prev: "← Назад",
    next: "Далее →",
    page: "Страница",
    of: "из",
    reviews: "отзывов",
    review: "отзыв",
    importTitle: "Импорт отзывов",
    importSubtitle: "Загрузите CSV из любого поддерживаемого приложения отзывов — формат определяется автоматически.",
    chooseFile: "Выбрать файл CSV",
    changeFile: "Изменить файл",
    cancel: "Отмена",
    widgetInstalled: "Виджет успешно установлен!",
    widgetSubtitle: "Теперь добавьте виджет отзывов на страницы товаров, выполнив следующие шаги:",
    gotIt: "Понятно! Закрыть",
  },
  tr: {
    flag: "🇹🇷", label: "Türkçe",
    pageTitle: "Ürün Değerlendirmeleri",
    pageSubtitle: "Müşteri geri bildirimlerini yönetin, denetleyin ve dışa aktarın",
    installWidget: "Widget'ı Yükle",
    installing: "Yükleniyor...",
    import: "İçe Aktar",
    exportCSV: "CSV Dışa Aktar",
    totalReviews: "Toplam Değerlendirme",
    approved: "Onaylandı",
    pending: "Beklemede",
    rejected: "Reddedildi",
    allReviews: "Tüm Değerlendirmeler",
    searchPlaceholder: "Müşteri, e-posta veya yorum ara…",
    search: "Ara",
    customer: "Müşteri",
    rating: "Puan",
    comment: "Yorum",
    status: "Durum",
    date: "Tarih",
    actions: "İşlemler",
    approve: "Onayla",
    reject: "Reddet",
    noReviews: "Geçerli filtre için değerlendirme bulunamadı.",
    prev: "← Önceki",
    next: "Sonraki →",
    page: "Sayfa",
    of: "/",
    reviews: "değerlendirme",
    review: "değerlendirme",
    importTitle: "Değerlendirmeleri İçe Aktar",
    importSubtitle: "Desteklenen herhangi bir değerlendirme uygulamasından CSV yükleyin — biçim otomatik olarak algılanır.",
    chooseFile: "CSV dosyası seç",
    changeFile: "Dosyayı değiştir",
    cancel: "İptal",
    widgetInstalled: "Widget başarıyla yüklendi!",
    widgetSubtitle: "Şimdi şu adımları izleyerek değerlendirme widget'ını ürün sayfalarınıza ekleyin:",
    gotIt: "Anladım! Kapat",
  },
  pl: {
    flag: "🇵🇱", label: "Polski",
    pageTitle: "Opinie o Produktach",
    pageSubtitle: "Zarządzaj, moderuj i eksportuj opinie klientów",
    installWidget: "Zainstaluj Widget",
    installing: "Instalowanie...",
    import: "Importuj",
    exportCSV: "Eksportuj CSV",
    totalReviews: "Łączna liczba opinii",
    approved: "Zatwierdzona",
    pending: "Oczekująca",
    rejected: "Odrzucona",
    allReviews: "Wszystkie opinie",
    searchPlaceholder: "Szukaj klienta, e-maila lub komentarza…",
    search: "Szukaj",
    customer: "Klient",
    rating: "Ocena",
    comment: "Komentarz",
    status: "Status",
    date: "Data",
    actions: "Akcje",
    approve: "Zatwierdź",
    reject: "Odrzuć",
    noReviews: "Nie znaleziono opinii dla bieżącego filtra.",
    prev: "← Wstecz",
    next: "Dalej →",
    page: "Strona",
    of: "z",
    reviews: "opinii",
    review: "opinia",
    importTitle: "Importuj opinie",
    importSubtitle: "Wczytaj plik CSV z dowolnej obsługiwanej aplikacji do opinii — format jest wykrywany automatycznie.",
    chooseFile: "Wybierz plik CSV",
    changeFile: "Zmień plik",
    cancel: "Anuluj",
    widgetInstalled: "Widget został pomyślnie zainstalowany!",
    widgetSubtitle: "Teraz dodaj widget opinii do swoich stron produktów, wykonując te kroki:",
    gotIt: "Rozumiem! Zamknij",
  },
  ko: {
    flag: "🇰🇷", label: "한국어",
    pageTitle: "상품 리뷰",
    pageSubtitle: "고객 피드백을 관리, 검토 및 내보내기",
    installWidget: "위젯 설치",
    installing: "설치 중...",
    import: "가져오기",
    exportCSV: "CSV 내보내기",
    totalReviews: "총 리뷰 수",
    approved: "승인됨",
    pending: "대기 중",
    rejected: "거부됨",
    allReviews: "모든 리뷰",
    searchPlaceholder: "고객, 이메일 또는 댓글 검색…",
    search: "검색",
    customer: "고객",
    rating: "평점",
    comment: "댓글",
    status: "상태",
    date: "날짜",
    actions: "작업",
    approve: "승인",
    reject: "거부",
    noReviews: "현재 필터에 대한 리뷰가 없습니다.",
    prev: "← 이전",
    next: "다음 →",
    page: "페이지",
    of: "/",
    reviews: "리뷰",
    review: "리뷰",
    importTitle: "리뷰 가져오기",
    importSubtitle: "지원되는 리뷰 앱에서 CSV를 업로드하세요 — 형식이 자동으로 감지됩니다.",
    chooseFile: "CSV 파일 선택",
    changeFile: "파일 변경",
    cancel: "취소",
    widgetInstalled: "위젯이 성공적으로 설치되었습니다!",
    widgetSubtitle: "다음 단계를 따라 리뷰 위젯을 상품 페이지에 추가하세요:",
    gotIt: "확인! 닫기",
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

  // Normalize "Reviewer Name", "reviewer.name", "reviewer_name" etc. to the
  // same key so every export's header spelling lines up with FIELD_ALIASES.
  const normalizeHeader = (h) =>
    h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const headers = parseCSVLine(lines[0]).map(normalizeHeader);
    const rows = lines.slice(1).map((line) => {
      const vals = parseCSVLine(line);
      const row  = {};
      headers.forEach((h, i) => (row[h] = vals[i]?.trim() || ""));
      return row;
    });
    return { headers, rows };
  };

  // Every review platform names its export columns differently — instead of
  // hardcoding one column-mapping per platform (and rejecting anything that
  // doesn't match exactly), we look for the same logical field under any of
  // its common aliases. This makes import work with Judge.me, Loox, Yotpo,
  // Stamped, Okendo, Ali Reviews, and our own native export alike.
  const FIELD_ALIASES = {
    customer:  ["customer", "reviewer_name", "author", "name", "user_display_name", "username", "full_name", "reviewer"],
    email:     ["email", "reviewer_email", "user_email", "customer_email"],
    productId: ["product_id", "productid", "product_sku", "productsku", "sku", "external_id"],
    rating:    ["rating", "score", "review_score", "stars", "star_rating"],
    title:     ["title", "review_title", "headline", "subject"],
    comment:   ["comment", "body", "content", "message", "review", "review_content", "review_text", "review_body", "description", "text"],
    status:    ["status", "published", "curated", "approved", "review_state", "state", "verified", "verified_buyer"],
    media:     ["pics", "picture_urls", "pic_urls", "images", "image_urls", "photos", "photo_urls", "videos", "video_urls", "media_urls", "media", "attachments", "photourls", "videourls"],
  };

  const pickField = (row, field) => {
    for (const key of FIELD_ALIASES[field]) {
      if (row[key]) return row[key];
    }
    return "";
  };

  const TRUTHY_STATUS = new Set(["true", "1", "yes", "approved", "published", "verified"]);

  // Media columns often hold multiple URLs separated by commas/semicolons/pipes.
  // We import the first one — good enough for a "does this review have media"
  // signal without needing to model multiple attachments per review yet.
  const parseMedia = (raw) => {
    if (!raw) return null;
    const parts = raw.split(/[,;|]+/).map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    const url = parts.find((p) => /^https?:\/\//i.test(p));
    if (!url) return null;
    const clean = url.split("?")[0];
    const ext = (clean.split(".").pop() || "").toLowerCase();
    const isVideo = ["mp4", "mov", "webm", "m4v", "avi"].includes(ext);
    const mediaType = isVideo
      ? `video/${ext === "mov" ? "quicktime" : ext}`
      : `image/${ext === "jpg" ? "jpeg" : (ext || "jpeg")}`;
    let fileName;
    try { fileName = decodeURIComponent(clean.split("/").pop()); } catch { fileName = clean.split("/").pop(); }
    return { mediaUrl: url, mediaType, fileName: fileName || null };
  };

  // Cosmetic only — picks which badge to show in the UI. Import itself never
  // depends on this; normalizeRow() below works the same regardless of label.
  const detectFormat = (headers) => {
    const set = new Set(headers);
    if (set.has("curated") && (set.has("reviewer_name") || set.has("reviewer_email"))) return "judgeme";
    if (set.has("verified_buyer")) return "loox";
    if (set.has("review_score") || set.has("user_display_name")) return "yotpo";
    if (set.has("author") && (set.has("photourls") || set.has("videourls"))) return "stamped";
    if (set.has("author") && (set.has("product_id") || set.has("productid"))) return "zeppo";
    if (set.has("customer") && (set.has("productid") || set.has("product_id"))) return "native";
    // No stronger signal matched — still importable (checked separately via
    // isImportable), just shown under a generic label instead of a named platform.
    return "generic";
  };

  // A CSV is importable as long as it has some kind of review text —
  // a product column is no longer required: rows without one import as
  // "Unassigned" and the merchant picks a product for them afterward from
  // the dashboard. Everything else (name, email, rating, status, media)
  // already has a sane fallback.
  const isImportable = (headers) => {
    const set = new Set(headers);
    return [...FIELD_ALIASES.comment, ...FIELD_ALIASES.title].some((a) => set.has(a));
  };

  const normalizeRow = (row) => {
    const media = parseMedia(pickField(row, "media"));
    return {
      customer:  pickField(row, "customer") || "Unknown",
      email:     pickField(row, "email"),
      productId: pickField(row, "productId"),
      rating:    pickField(row, "rating") || "5",
      title:     pickField(row, "title"),
      comment:   pickField(row, "comment") || pickField(row, "title") || "",
      status:    TRUTHY_STATUS.has(String(pickField(row, "status")).toLowerCase()) ? "approved" : "pending",
      mediaUrl:  media?.mediaUrl  || "",
      mediaType: media?.mediaType || "",
      fileName:  media?.fileName  || "",
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
        if (!isImportable(headers)) {
          setError("Could not find a review-text column in this CSV. Make sure the export includes a review title or body/content column.");
          setPreview([]); setDetected(""); setTotalRows(0);
          return;
        }
        const format = detectFormat(headers);
        const normalized = rows.map(normalizeRow);
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
      const { rows } = parseCSV(ev.target.result);
      const normalized = rows.map(normalizeRow);
      onImport(normalized);
      onClose();
    };
    reader.readAsText(file);
  };

  const FORMAT_META = {
    judgeme: { icon: "⚖️", label: "Judge.me",            color: "#7c3aed", bg: "#ede9fe" },
    loox:    { icon: "📸", label: "Loox",                 color: "#be185d", bg: "#fce7f3" },
    yotpo:   { icon: "🟦", label: "Yotpo",                color: "#1d4ed8", bg: "#dbeafe" },
    stamped: { icon: "🟧", label: "Stamped",              color: "#c2410c", bg: "#ffedd5" },
    zeppo:   { icon: "⚡", label: "Zeppo / Okendo",        color: "#0369a1", bg: "#e0f2fe" },
    native:  { icon: "🏠", label: "Native Export",         color: "#16a34a", bg: "#dcfce7" },
    generic: { icon: "📄", label: "Generic CSV",          color: "#475569", bg: "#f1f5f9" },
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
          <span style={{ fontSize: 11, color: C.muted }}>Judge.me · Loox · Yotpo · Stamped · Okendo · Ali Reviews · any CSV with a product + review column</span>
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
                {row.mediaUrl && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 34 }}>
                    {row.mediaType.startsWith("video/") ? (
                      <video src={row.mediaUrl} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
                    ) : (
                      <img src={row.mediaUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
                    )}
                    <span style={{ fontSize: 10.5, color: C.muted }}>
                      {row.mediaType.startsWith("video/") ? "🎬 video attached" : "🖼 image attached"}
                    </span>
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
function ReviewRow({ review, onAction, t, selected, onToggleSelect }) {
  const ss = statusStyle(review.status);
  const [replying, setReplying]   = useState(false);
  const [replyDraft, setReplyDraft] = useState(review.reply || "");
  const [tagDraft, setTagDraft]   = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [sentiment, setSentiment] = useState(review.sentiment || null);
  const [pickingProduct, setPickingProduct] = useState(false);
  const tags = (review.tags || "").split(",").map((s) => s.trim()).filter(Boolean);

  const saveReply = () => {
    onAction("reply", review, { reply: replyDraft });
    setReplying(false);
  };

  const addTag = (e) => {
    if (e.key !== "Enter" || !tagDraft.trim()) return;
    e.preventDefault();
    onAction("tag", review, { tags: [...tags, tagDraft.trim()].join(",") });
    setTagDraft("");
  };

  const removeTag = (tag) => {
    onAction("tag", review, { tags: tags.filter((x) => x !== tag).join(",") || null });
  };

  const analyzeSentiment = async () => {
    setAnalyzing(true);
    try {
      const res  = await fetch("/api/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id }),
      });
      const data = await res.json();
      if (data.success) setSentiment(data.sentiment);
      else alert(data.message || "Could not analyze sentiment.");
    } catch {
      alert("Could not analyze sentiment.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <tr
        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8f9fc")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        style={{ transition: "background .12s" }}
      >
        <td style={{ ...TD, width: 30 }}>
          <input type="checkbox" checked={selected} onChange={() => onToggleSelect(review.id)} />
        </td>
        <td style={TD}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: C.accentLt,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 13, color: C.accent, flexShrink: 0,
            }}>{(review.customer || "?")[0].toUpperCase()}</div>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13, display: "block" }}>{review.customer}</span>
              <span style={{ fontSize: 10.5, color: C.muted }}>
                {review.source === "imported" ? "via Imported" : "via Storefront"}
              </span>
            </div>
          </div>
        </td>
        <td style={TD}>
          <div style={{ display: "flex" }}>{stars(review.rating)}</div>
          {sentiment ? (
            <button onClick={analyzeSentiment} disabled={analyzing} title="Re-analyze sentiment" style={{
              border: "none", background: "none", cursor: analyzing ? "default" : "pointer",
              fontSize: 11, marginTop: 4, padding: 0, color: C.muted,
            }}>
              {SENTIMENT_META[sentiment]?.icon} {SENTIMENT_META[sentiment]?.label}
            </button>
          ) : (
            <button onClick={analyzeSentiment} disabled={analyzing} style={{
              border: `1px dashed ${C.border}`, background: "none", cursor: analyzing ? "default" : "pointer",
              fontSize: 10.5, marginTop: 4, padding: "2px 6px", borderRadius: 6, color: C.muted,
            }}>
              {analyzing ? "Analyzing…" : "✨ Analyze"}
            </button>
          )}
        </td>
        <td style={TD}>
          {review.mediaUrl ? (
            <a href={review.mediaUrl} target="_blank" rel="noreferrer" title={review.fileName || "View attachment"}>
              {review.mediaType?.startsWith("video/") ? (
                <video src={review.mediaUrl} style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover", display: "block" }} />
              ) : (
                <img src={review.mediaUrl} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover", display: "block" }} />
              )}
            </a>
          ) : (
            <span style={{ color: C.muted }}>—</span>
          )}
        </td>
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
            onBlur={(e)  => { e.target.style.borderColor = C.border;  e.target.style.boxShadow = "none"; onAction("edit", review, { comment: e.target.value }); }}
          />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
            {tags.map((tag) => (
              <span key={tag} style={{
                fontSize: 10.5, background: "#eef2ff", color: "#4338ca", borderRadius: 12, padding: "2px 8px",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                {tag}
                <span onClick={() => removeTag(tag)} style={{ cursor: "pointer", fontWeight: 700 }}>×</span>
              </span>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={addTag}
              placeholder="+ tag"
              style={{
                border: `1px dashed ${C.border}`, borderRadius: 12, padding: "2px 8px",
                fontSize: 10.5, width: 60, outline: "none", background: "transparent",
              }}
            />
          </div>
          {review.reply && !replying && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: C.muted, background: "#f9fafb", borderRadius: 6, padding: "5px 8px" }}>
              💬 <strong>Your reply:</strong> {review.reply}
            </div>
          )}
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
          {review.status === "rejected" && review.hideReason && (
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
              {HIDE_REASONS.find((r) => r.value === review.hideReason)?.label || review.hideReason}
            </div>
          )}
        </td>
        <td style={{ ...TD, color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>
          {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </td>
        <td style={TD}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => onAction("approve", review)} style={ABT("approve")}>✓ {t.approve}</button>
            <select
              defaultValue=""
              onChange={(e) => onAction("reject", review, { hideReason: e.target.value || null })}
              style={{ ...ABT("reject"), padding: "5px 6px" }}
              title="Reject / hide with reason"
            >
              <option value="">✕ {t.reject}</option>
              {HIDE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>Hide: {r.label}</option>
              ))}
            </select>
            <button onClick={() => setReplying((v) => !v)} style={ABT("neutral")}>💬 Reply</button>
            <button onClick={() => setPickingProduct((v) => !v)} style={ABT("neutral")}>
              🔗 {review.productId ? "Change" : "Assign"} Product
            </button>
            <button onClick={() => onAction("delete", review)} style={ABT("delete")} title="Delete">🗑</button>
          </div>
        </td>
      </tr>
      {pickingProduct && (
        <tr>
          <td colSpan={8} style={{ padding: "0 16px 14px", borderTop: "none" }}>
            <ProductPicker
              onSelect={(shopifyProductId) => onAction("assignProduct", review, { shopifyProductId })}
              onClose={() => setPickingProduct(false)}
            />
          </td>
        </tr>
      )}
      {replying && (
        <tr>
          <td colSpan={8} style={{ padding: "0 16px 14px", borderTop: "none" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#f9fafb", borderRadius: 8, padding: 10 }}>
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder="Write a public reply to this review…"
                style={{
                  flex: 1, minHeight: 60, border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={saveReply} style={{ ...ABT("approve"), whiteSpace: "nowrap" }}>Save</button>
                <button onClick={() => setReplying(false)} style={{ ...ABT("neutral"), whiteSpace: "nowrap" }}>Cancel</button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ─────────────────────────────────────────
   PRODUCT PICKER — small fetcher-backed search,
   used to assign/change which product a review belongs to.
───────────────────────────────────────── */
function ProductPicker({ onSelect, onClose }) {
  const fetcher = useFetcher();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(() => {
      fetcher.load(`/app/product-search?q=${encodeURIComponent(query)}`);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const results = fetcher.data?.products || [];

  const handleSelect = (shopifyProductId) => {
    onSelect(shopifyProductId);
    onClose();
  };

  return (
    <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, maxWidth: 360 }}>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products by name…"
        style={{
          width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "7px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
        }}
      />
      {fetcher.state === "loading" && (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>Searching…</div>
      )}
      {results.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "6px 10px", background: "#fff", cursor: "pointer", textAlign: "left",
              }}
            >
              <img
                src={p.image || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png"}
                alt="" style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
              />
              <span style={{ fontSize: 12.5, color: C.text }}>{p.title}</span>
            </button>
          ))}
        </div>
      )}
      {query.trim() && fetcher.state !== "loading" && results.length === 0 && (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>No products found.</div>
      )}
      <button
        onClick={onClose}
        style={{ marginTop: 8, border: "none", background: "none", color: C.muted, fontSize: 11.5, cursor: "pointer", textDecoration: "underline", padding: 0, display: "block" }}
      >
        Cancel
      </button>
    </div>
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
function ProductGroup({ group, onAction, t, selectedIds, onToggleSelect }) {
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
              {["", t.customer, t.rating, "🖼", t.comment, t.status, t.date, t.actions].map((h, i) => (
                <th key={i} style={{
                  textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted,
                  letterSpacing: ".07em", textTransform: "uppercase",
                  padding: "9px 16px", background: "#f8f9fc",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.reviews.map((r) => (
              <ReviewRow
                key={r.id} review={r} onAction={onAction} t={t}
                selected={selectedIds.includes(r.id)} onToggleSelect={onToggleSelect}
              />
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
    tab, search, autoPublish,
  } = useLoaderData();

  const submit = useSubmit();
  const [, setSearchParams] = useSearchParams();
  const [showImport, setShowImport] = useState(false);
  const [searchVal,  setSearchVal]  = useState(search);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const lang = shopLocale || "en"; // ← persisted store language, switcher lives in Settings

  const [installing, setInstalling]     = useState(false);
  const [installMsg, setInstallMsg]     = useState("");
  const [installOk,  setInstallOk]      = useState(null);
  const [showInstallDocs, setShowInstallDocs] = useState(false);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en; // current language strings
  const totalPages = Math.ceil(total / limit);

  const handleAction = (actionType, review, extra = {}) => {
    const fd = new FormData();
    fd.append("actionType", actionType);
    fd.append("id", review.id);
    for (const [key, value] of Object.entries(extra)) {
      if (value !== null && value !== undefined) fd.append(key, value);
    }
    submit(fd, { method: "post" });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const allVisibleIds = grouped.flatMap((g) => g.reviews.map((r) => r.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => prev.length === allVisibleIds.length ? [] : allVisibleIds);
  };

  const handleBulkAction = (bulkAction) => {
    if (!selectedIds.length) return;
    const fd = new FormData();
    fd.append("actionType", "bulk");
    fd.append("bulkAction", bulkAction);
    fd.append("ids", JSON.stringify(selectedIds));
    submit(fd, { method: "post" });
    setSelectedIds([]);
  };

  const handleBulkAssignProduct = (shopifyProductId) => {
    if (!selectedIds.length) return;
    const fd = new FormData();
    fd.append("actionType", "bulkAssignProduct");
    fd.append("shopifyProductId", shopifyProductId);
    fd.append("ids", JSON.stringify(selectedIds));
    submit(fd, { method: "post" });
    setSelectedIds([]);
    setBulkAssigning(false);
  };

  const handleToggleAutoPublish = () => {
    const fd = new FormData();
    fd.append("actionType", "toggleAutoPublish");
    fd.append("autoPublish", String(!autoPublish));
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

          <button
            onClick={handleToggleAutoPublish}
            title="When on, new reviews skip moderation and go live immediately"
            style={{
              border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 14px",
              fontSize: 13, fontWeight: 600, background: C.surface, cursor: "pointer",
              color: C.text, display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span style={{
              width: 30, height: 17, borderRadius: 20, position: "relative",
              background: autoPublish ? C.accent : "#d1d5db", transition: "background .15s", flexShrink: 0,
            }}>
              <span style={{
                position: "absolute", top: 2, left: autoPublish ? 15 : 2, width: 13, height: 13,
                borderRadius: "50%", background: "#fff", transition: "left .15s",
              }} />
            </span>
            Auto-publish: {autoPublish ? "On" : "Off"}
          </button>

          <button onClick={() => setShowImport(true)} style={{
            border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 18px",
            fontSize: 13, fontWeight: 600, background: C.surface, cursor: "pointer",
            color: C.text, display: "flex", alignItems: "center", gap: 7,
          }}>📥 {t.import}</button>

          <Link to="/app/review-groups" style={{
            border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 18px",
            fontSize: 13, fontWeight: 600, background: C.surface, cursor: "pointer",
            color: C.text, display: "flex", alignItems: "center", gap: 7, textDecoration: "none",
          }}>🔗 Review groups</Link>

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

      {/* ── Bulk Selection Bar ── */}
      {grouped.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12.5, color: C.muted }}>
            {selectedIds.length > 0 ? (
              <>
                <span style={{ fontWeight: 700, color: C.text }}>{selectedIds.length} selected</span>
                <button onClick={() => handleBulkAction("approve")} style={ABT("approve")}>✓ Approve selected</button>
                <button onClick={() => handleBulkAction("reject")} style={ABT("reject")}>✕ Reject selected</button>
                <button onClick={() => setBulkAssigning((v) => !v)} style={ABT("neutral")}>🔗 Assign Product</button>
                <button onClick={() => handleBulkAction("delete")} style={ABT("delete")}>🗑 Delete selected</button>
                <button onClick={() => { setSelectedIds([]); setBulkAssigning(false); }} style={{ border: "none", background: "none", color: C.muted, cursor: "pointer", fontSize: 12.5, textDecoration: "underline" }}>
                  Clear
                </button>
              </>
            ) : (
              <button onClick={toggleSelectAll} style={{ border: "none", background: "none", color: C.accent, cursor: "pointer", fontSize: 12.5, fontWeight: 600, padding: 0 }}>
                Select all {allVisibleIds.length} visible
              </button>
            )}
          </div>
          {bulkAssigning && selectedIds.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <ProductPicker onSelect={handleBulkAssignProduct} onClose={() => setBulkAssigning(false)} />
            </div>
          )}
        </div>
      )}

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
        grouped.map((g) => (
          <ProductGroup
            key={g.productId} group={g} onAction={handleAction} t={t}
            selectedIds={selectedIds} onToggleSelect={toggleSelect}
          />
        ))
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