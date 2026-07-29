// app/routes/api.review.jsx
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import fs from "fs";
import path from "path";
import { REVIEW_TRANSLATIONS, QA_TRANSLATIONS, SLIDER_TRANSLATIONS, resolveLanguage } from "../utils/widgetTranslations.server";
import { notifyIntegrations } from "../utils/events.server";
import { PRO_STYLE_VALUES, DEFAULT_FREE_STYLE } from "../utils/reviewWidgetStyles";
import { PRO_LAYOUT_VALUES, DEFAULT_FREE_LAYOUT } from "../utils/homepageReviewLayouts";
import { isAdvancedOrHigher, isGooglePro } from "../billing.server";

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
  return customer || "Anonymous";
};

const normalizeComment  = (value) => String(value ?? "").trim();
const normalizeTitle    = (value) => String(value ?? "").trim() || null;
const normalizeEmail    = (value) => {
  const email = String(value ?? "").trim().toLowerCase();
  return email || null;
};

// ── Auth helper ────────────────────────────────────────────────────────────────
async function getScopedShop(request) {
  const context = await authenticate.public.appProxy(request);
  const url     = new URL(request.url);
  const shop    = context.session?.shop || url.searchParams.get("shop");

  if (!shop) throw new Response("Shop context not found", { status: 401 });

  return { context, shop, url };
}

// ── Store / product upsert ─────────────────────────────────────────────────────
async function ensureStoreAndProduct(shop, rawProductId) {
  const shopifyProductId = normalizeProductId(rawProductId);
  if (!shopifyProductId) return null;

  const store = await prisma.store.upsert({
    where:  { shop },
    update: {},
    create: { shop },
    select: { id: true, autoPublish: true },
  });

  const product = await prisma.product.upsert({
    where: { storeId_shopifyProductId: { storeId: store.id, shopifyProductId } },
    update: {},
    create: { storeId: store.id, shopifyProductId },
    select: { id: true, groupId: true },
  });

  return { storeId: store.id, productId: product.id, groupId: product.groupId, autoPublish: store.autoPublish };
}

// ── File upload ────────────────────────────────────────────────────────────────
async function handleFileUpload(file) {
  if (!file || typeof file === "string") return null;

  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const bytes    = await file.arrayBuffer();
  const buffer   = Buffer.from(bytes);
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, buffer);

  return { url: `/uploads/${fileName}`, fileName, mediaType: file.type };
}

// ── Loader ────────────────────────────────────────────────────────────────────
export async function loader({ request }) {
  const { shop, url } = await getScopedShop(request);

  // ── Custom CSS / JS injection ─────────────────────────────────────────────
  if (url.searchParams.get("type") === "custom-code") {
    const cc = await prisma.storeCustomCode.findUnique({ where: { shop } });
    const field = url.searchParams.get("field") || "css";
    const content = (field === "js" ? cc?.customJs : cc?.customCss) || "";
    return new Response(content, {
      headers: {
        "Content-Type": field === "js" ? "text/javascript" : "text/css",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  // ── Review form settings ───────────────────────────────────────────────────
  if (url.searchParams.get("type") === "form-settings") {
    const [formSettings, langStore] = await Promise.all([
      prisma.reviewFormSettings.findUnique({ where: { shop } }),
      prisma.store.findUnique({ where: { shop }, select: { language: true } }),
    ]);

    return Response.json({
      settings: formSettings || {
        accentColor: "#1a1a1a", fontFamily: "inherit", backgroundColor: "#FFFFFF",
        borderRadius: 3, buttonTextColor: "#FFFFFF", showWriteReview: true,
      },
      language: resolveLanguage(url.searchParams.get("locale"), langStore?.language),
    });
  }

  // ── Store-wide review totals (for the All Reviews Counter widget) ─────────
  if (url.searchParams.get("type") === "store-totals") {
    const totalsStore = await prisma.store.findUnique({ where: { shop }, select: { id: true, language: true } });
    const totalsLanguage = resolveLanguage(url.searchParams.get("locale"), totalsStore?.language);

    if (!totalsStore) {
      return Response.json({ total: 0, averageRating: 0, language: totalsLanguage });
    }

    const [total, summary] = await Promise.all([
      prisma.review.count({ where: { storeId: totalsStore.id, status: "approved" } }),
      prisma.review.aggregate({ where: { storeId: totalsStore.id, status: "approved" }, _avg: { rating: true } }),
    ]);

    return Response.json({
      total,
      averageRating: summary._avg.rating || 0,
      language: totalsLanguage,
    });
  }

  // ── Questions & Answers (answered, for storefront display) ────────────────
  if (url.searchParams.get("type") === "questions") {
    const qProductId = normalizeProductId(url.searchParams.get("productId"));
    const langStore = await prisma.store.findUnique({ where: { shop }, select: { id: true, language: true } });
    const qaLanguage = resolveLanguage(url.searchParams.get("locale"), langStore?.language);
    const qaTranslations = QA_TRANSLATIONS[qaLanguage] || QA_TRANSLATIONS.en;

    if (!qProductId || !langStore) {
      return Response.json({ questions: [], language: qaLanguage, translations: qaTranslations });
    }

    const product = await prisma.product.findUnique({
      where: { storeId_shopifyProductId: { storeId: langStore.id, shopifyProductId: qProductId } },
      select: { id: true },
    });

    if (!product) {
      return Response.json({ questions: [], language: qaLanguage, translations: qaTranslations });
    }

    const questions = await prisma.question.findMany({
      where: { storeId: langStore.id, productId: product.id, status: "answered" },
      select: { id: true, customer: true, question: true, answer: true, createdAt: true, answeredAt: true },
      orderBy: { answeredAt: "desc" },
    });

    return Response.json({ questions, language: qaLanguage, translations: qaTranslations });
  }

  // ── AI Reviews Summary (cached, for storefront display) ───────────────────
  if (url.searchParams.get("type") === "ai-summary") {
    const sProductId = normalizeProductId(url.searchParams.get("productId"));
    const [aiStore, aiWidget] = await Promise.all([
      prisma.store.findUnique({ where: { shop }, select: { id: true, language: true } }),
      prisma.widget.findUnique({
        where: { shop_widgetKey: { shop, widgetKey: "ai_summary" } },
        select: { accentColor: true, textColor: true, fontFamily: true },
      }),
    ]);

    const style = aiWidget || { accentColor: "#6B1A2C", textColor: "#333333", fontFamily: "inherit" };
    const aiLanguage = resolveLanguage(url.searchParams.get("locale"), aiStore?.language);

    if (!sProductId || !aiStore) {
      return Response.json({ summary: null, language: aiLanguage, style });
    }

    const sProduct = await prisma.product.findUnique({
      where: { storeId_shopifyProductId: { storeId: aiStore.id, shopifyProductId: sProductId } },
      select: { id: true },
    });

    if (!sProduct) {
      return Response.json({ summary: null, language: aiLanguage, style });
    }

    const aiSummary = await prisma.aiSummary.findUnique({
      where: { storeId_productId: { storeId: aiStore.id, productId: sProduct.id } },
      select: { summary: true, reviewCount: true },
    });

    return Response.json({
      summary: aiSummary?.summary || null,
      reviewCount: aiSummary?.reviewCount || 0,
      language: aiLanguage,
      style,
    });
  }

  // ── Google Reviews widget (Pro-gated; always served from cache) ───────────
  if (url.searchParams.get("type") === "google-reviews") {
    const plan = await prisma.shopPlan.findUnique({ where: { shop } });
    if (!isGooglePro(plan)) return Response.json({ configured: false });

    const widget = await prisma.googleReviewsWidget.findUnique({ where: { shop } });
    if (!widget?.placeId || !widget?.cachedRating) return Response.json({ configured: false });

    const spacing = {
      fontFamily: widget.fontFamily,
      fontSize: widget.fontSize,
      headingFontSize: widget.headingFontSize,
      starSize: widget.starSize,
      padding: widget.padding,
      margin: widget.margin,
      gap: widget.gap,
      borderRadius: widget.borderRadius,
      borderColor: widget.borderColor,
      borderWidth: widget.borderWidth,
      maxWidth: widget.maxWidth,
      minHeight: widget.minHeight,
      showWriteReviewButton: widget.showWriteReviewButton,
      writeReviewButtonText: widget.writeReviewButtonText,
      reviewsPerPage: widget.reviewsPerPage,
    };
    const colors = {
      accentColor: widget.accentColor,
      starColor: widget.starColor,
      backgroundColor: widget.backgroundColor,
      textColor: widget.textColor,
    };

    // If the merchant connected their Business Profile via OAuth, serve the
    // full, paginated review set from our own DB instead of the 5-review
    // Places API cache.
    const businessConnection = await prisma.googleBusinessConnection.findUnique({ where: { shop } });
    if (businessConnection?.connected) {
      const perPage = Math.max(1, Math.min(50, parseInt(url.searchParams.get("perPage")) || widget.reviewsPerPage || 5));
      const page = Math.max(0, parseInt(url.searchParams.get("page")) || 0);

      const [totalCount, reviews] = await Promise.all([
        prisma.googleFullReview.count({ where: { shop } }),
        prisma.googleFullReview.findMany({
          where: { shop },
          orderBy: { createTime: "desc" },
          skip: page * perPage,
          take: perPage,
        }),
      ]);

      return Response.json({
        configured: true,
        placeId: widget.placeId,
        style: widget.style,
        colors,
        spacing,
        rating: widget.cachedRating,
        reviewCount: totalCount,
        totalCount,
        page,
        perPage,
        reviews: reviews.map((r) => ({
          authorName: r.authorName,
          rating: r.rating,
          text: r.text,
          relativeTime: r.createTime ? new Date(r.createTime).toLocaleDateString() : "",
        })),
        displayName: widget.cachedDisplayName,
      });
    }

    return Response.json({
      configured: true,
      placeId: widget.placeId,
      style: widget.style,
      colors,
      spacing,
      rating: widget.cachedRating,
      reviewCount: widget.cachedReviewCount,
      reviews: widget.cachedReviews,
      displayName: widget.cachedDisplayName,
    });
  }

  // ── Widget defaults ────────────────────────────────────────────────────────
  if (url.searchParams.get("type") === "widget-defaults") {
    const widgetKey = url.searchParams.get("widgetKey") || "review_widget";
    const langStore = await prisma.store.findUnique({ where: { shop }, select: { language: true } });
    const widgetLanguage = resolveLanguage(url.searchParams.get("locale"), langStore?.language);

    // Custom Template: read the active (isDefault=true) WidgetTemplate
    if (widgetKey === "custom_template") {
      try {
        const tpl = await prisma.widgetTemplate.findFirst({
          where: { shop, isDefault: true },
          select: { blocks: true },
        });
        if (tpl?.blocks) {
          const LAYOUT_TO_STYLE = {
            grid:     "star_summary",
            list:     "list_view",
            masonry:  "masonry_wall",
            slider:   "slider",
            compact:  "compact_rows",
            featured: "summary_side",
          };

          // Page builder saves blocks as an array; legacy format is a plain object
          let s;
          if (Array.isArray(tpl.blocks)) {
            // Page builder stores { id, type, settings: {...} } per block
            const rlBlock  = tpl.blocks.find(b => b.type === "review_list") || {};
            const hdgBlock = tpl.blocks.find(b => b.type === "heading")     || {};
            const rls = rlBlock.settings  || {};
            const hdgs = hdgBlock.settings || {};
            const hasWriteBtn = tpl.blocks.some(b => b.type === "write_review");
            s = {
              layout:         rls.layout         || "grid",
              accentColor:    rls.accentColor    || "#6B1A2C",
              starColor:      rls.accentColor    || "#F59E0B",
              cardBg:         rls.cardBg         || "#FFFFFF",
              textColor:      rls.textColor      || "#333333",
              cardBorderColor: rls.cardBorder    || "#E5E5E5",
              showVerified:   rls.showVerified   ?? true,
              showAvatar:     rls.showAvatar     ?? true,
              showDate:       rls.showDate       ?? true,
              maxReviews:     rls.perPage        || 6,
              columnsDesktop: rls.columns        || 3,
              columnsTablet:  2,
              columnsMobile:  1,
              gap:            rls.gap            || 16,
              cardRadius:     rls.cardRadius     || 12,
              cardShadow:     rls.cardShadow     || "soft",
              headingText:    hdgs.text          || null,
              headingSize:    hdgs.fontSize      || 28,
              cardPadding:    rls.cardPadding    || 18,
              showWriteBtn:   hasWriteBtn,
              fontFamily:     rls.fontFamily     || "inherit",
            };
          } else {
            s = tpl.blocks;
          }

          return Response.json({
            settings: {
              defaultStyle:       LAYOUT_TO_STYLE[s.layout] || "star_summary",
              accentColor:        s.accentColor       || "#6B1A2C",
              starColor:          s.starColor         || "#F59E0B",
              cardBackground:     s.cardBg            || "#FFFFFF",
              textColor:          s.textColor         || "#333333",
              borderColor:        s.cardBorderColor   || "#E5E5E5",
              showVerified:       s.showVerified       ?? true,
              showAvatar:         s.showAvatar         ?? true,
              showDate:           s.showDate           ?? true,
              maxReviews:         s.maxReviews         || 6,
              columns:            s.columnsDesktop     || 3,
              tabletColumns:      s.columnsTablet      || 2,
              mobileColumns:      s.columnsMobile      || 1,
              cardGap:            s.gap                || 16,
              borderRadius:       s.cardRadius         || 12,
              showShadow:         (s.cardShadow || "soft") !== "none",
              heading:            s.headingText        || null,
              headingSize:        s.headingSize        || 28,
              cardPadding:        s.cardPadding        || 18,
              showWriteReviewBtn: s.showWriteBtn       ?? false,
              fontFamily:         s.fontFamily         || "inherit",
            },
            blocks: Array.isArray(tpl.blocks) ? tpl.blocks : null,
            language: widgetLanguage,
            translations: SLIDER_TRANSLATIONS[widgetLanguage] || SLIDER_TRANSLATIONS.en,
          });
        }
      } catch (e) {
        // widgetTemplate table not yet available — fall through to empty settings
      }
      return Response.json({
        settings: {},
        language: widgetLanguage,
        translations: SLIDER_TRANSLATIONS[widgetLanguage] || SLIDER_TRANSLATIONS.en,
      });
    }

    // ✅ FIX: was missing `return` — response was falling through to reviews logic
    const settings = await prisma.widget.findUnique({
      where: { shop_widgetKey: { shop, widgetKey } },
      select: {
        defaultStyle:    true,
        accentColor:     true,
        starColor:          true,
        starGap:            true,
        textAlign:          true,
        summaryPosition:    true,
        showWriteReviewBtn: true,
        heading:         true,
        contentFilter:   true,

        fontFamily:      true,
        headingSize:     true,
        reviewSize:      true,
        metaSize:        true,

        backgroundColor: true,
        cardBackground:  true,
        textColor:       true,
        borderColor:     true,

        showVerified:    true,
        showAvatar:      true,
        showDate:        true,

        maxReviews:      true,

        columns:         true,
        tabletColumns:   true,
        mobileColumns:   true,

        paddingTop:      true,
        paddingBottom:   true,
        cardPadding:     true,
        cardGap:         true,

        borderRadius:    true,
        showShadow:      true,

        autoplay:        true,
        autoplaySpeed:   true,
        showArrows:      true,
        showDots:        true,

        popupEnabled:    true,
        popupDelay:      true,
      },
    });

    // If the saved style/layout is Advanced-plan-only and the shop isn't
    // currently on that plan (e.g. it saved it, then downgraded), silently
    // substitute a free default instead of serving the locked design.
    let finalSettings = settings || {};
    const requestedStyle = finalSettings.defaultStyle;
    if (requestedStyle && (PRO_STYLE_VALUES.has(requestedStyle) || PRO_LAYOUT_VALUES.has(requestedStyle))) {
      const plan = await prisma.shopPlan.findUnique({ where: { shop } });
      if (!isAdvancedOrHigher(plan)) {
        finalSettings = {
          ...finalSettings,
          defaultStyle: PRO_LAYOUT_VALUES.has(requestedStyle) ? DEFAULT_FREE_LAYOUT : DEFAULT_FREE_STYLE,
        };
      }
    }

    return Response.json({
      settings: finalSettings,
      language: widgetLanguage,
      translations: SLIDER_TRANSLATIONS[widgetLanguage] || SLIDER_TRANSLATIONS.en,
    });
  }

  // ── Reviews list ───────────────────────────────────────────────────────────
  const productId = normalizeProductId(url.searchParams.get("productId"));

  const [store, listSettingsRow] = await Promise.all([
    prisma.store.findUnique({ where: { shop }, select: { id: true, language: true } }),
    prisma.reviewListSettings.findUnique({ where: { shop } }),
  ]);

  const language = resolveLanguage(url.searchParams.get("locale"), store?.language);
  const sliderT = SLIDER_TRANSLATIONS[language] || SLIDER_TRANSLATIONS.en;
  const reviewTranslations = { ...sliderT, ...(REVIEW_TRANSLATIONS[language] || REVIEW_TRANSLATIONS.en) };
  const listSettings = listSettingsRow || {
    listStyle: "list", cardBackground: "#FFFFFF", cardBorderColor: "#000000",
    cardTextColor: "#333333", accentColor: "#1a1a1a", reviewsPerPage: 10,
    showAllProducts: false,
  };

  if (!store) {
    return Response.json({
      reviews: [], total: 0, averageRating: 0, page: 1, limit: 0, language,
      translations: reviewTranslations, listSettings,
    });
  }

  // No productId = store-wide request (homepage widget / review wall)
  if (!productId) {
    const storeLimit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "24")));
    const [reviews, total, summary] = await Promise.all([
      prisma.review.findMany({
        where: { storeId: store.id, status: "approved" },
        select: {
          id: true, rating: true, comment: true, customer: true,
          title: true, likes: true, createdAt: true,
          mediaUrl: true, mediaType: true, fileName: true,
          reply: true, repliedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: storeLimit,
      }),
      prisma.review.count({ where: { storeId: store.id, status: "approved" } }),
      prisma.review.aggregate({ where: { storeId: store.id, status: "approved" }, _avg: { rating: true } }),
    ]);
    return Response.json({
      reviews, total,
      averageRating: summary._avg.rating || 0,
      page: 1, limit: reviews.length,
      language, translations: reviewTranslations, listSettings,
    });
  }

  const where = { storeId: store.id, status: "approved" };

  // showAllProducts pools reviews from every product in the store for this
  // widget only — other widgets (star rating, AI summary, etc.) keep filtering
  // by the current product as usual.
  if (!listSettings.showAllProducts) {
    const product = await prisma.product.findUnique({
      where: { storeId_shopifyProductId: { storeId: store.id, shopifyProductId: productId } },
      select: { id: true, groupId: true },
    });

    if (!product) {
      return Response.json({ reviews: [], total: 0, averageRating: 0, page: 1, limit: 0, language, translations: reviewTranslations, listSettings });
    }

    // Products grouped together (e.g. variants split into separate listings,
    // or duplicate listings) pool each other's reviews.
    if (product.groupId) {
      const groupProducts = await prisma.product.findMany({
        where: { groupId: product.groupId },
        select: { id: true },
      });
      where.productId = { in: groupProducts.map((p) => p.id) };
    } else {
      where.productId = product.id;
    }
  }

  const widgetKey = url.searchParams.get("widgetKey");
  if (widgetKey) {
    const widget = await prisma.widget.findUnique({
      where: { shop_widgetKey: { shop, widgetKey } },
      select: { contentFilter: true },
    });
    if (widget?.contentFilter === "video") where.mediaType = { startsWith: "video" };
    if (widget?.contentFilter === "photo") where.mediaType = { startsWith: "image" };
  }

  const [reviews, total, summary] = await Promise.all([
    prisma.review.findMany({
      where,
      select: {
        id: true, rating: true, comment: true, customer: true,
        title: true, likes: true, createdAt: true,
        mediaUrl: true, mediaType: true, fileName: true,
        reply: true, repliedAt: true, sentiment: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
  ]);

  return Response.json({
    reviews,
    total,
    averageRating: summary._avg.rating || 0,
    page:  1,
    limit: reviews.length,
    language,
    translations: reviewTranslations,
    listSettings,
  });
}

// ── Action ────────────────────────────────────────────────────────────────────
export async function action({ request }) {
  const { shop } = await getScopedShop(request);
  const contentType = request.headers.get("content-type") || "";

  // File upload
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData     = await request.formData();
      const file         = formData.get("file");
      const uploadedFile = await handleFileUpload(file);

      if (!uploadedFile) {
        return Response.json({ success: false, message: "No file uploaded or invalid file" }, { status: 400 });
      }
      return Response.json({ success: true, ...uploadedFile });
    } catch (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  const data = await request.json();

  // Like
  if (data.type === "like") {
    const store = await prisma.store.findUnique({ where: { shop }, select: { id: true } });
    if (!store) return Response.json({ success: false }, { status: 404 });

    const result = await prisma.review.updateMany({
      where: { id: Number(data.id), storeId: store.id },
      data:  { likes: { increment: 1 } },
    });

    if (!result.count) return Response.json({ success: false }, { status: 404 });

    const review = await prisma.review.findUnique({
      where:  { id: Number(data.id) },
      select: { id: true, likes: true },
    });
    return Response.json({ success: true, review });
  }

  // Ask a question
  if (data.type === "question") {
    const scopedQProduct = await ensureStoreAndProduct(shop, data.productId);
    const question = String(data.question || "").trim();

    if (!scopedQProduct || !question) {
      return Response.json({ success: false, message: "Invalid question payload" }, { status: 400 });
    }

    const created = await prisma.question.create({
      data: {
        storeId:   scopedQProduct.storeId,
        productId: scopedQProduct.productId,
        customer:  normalizeCustomer(data.customer),
        email:     normalizeEmail(data.email),
        question,
      },
      select: { id: true, status: true, createdAt: true },
    });

    return Response.json({ success: true, question: created }, { status: 201 });
  }

  // Create review
  const scopedProduct = await ensureStoreAndProduct(shop, data.productId);
  const comment       = normalizeComment(data.comment);

  if (!scopedProduct || !comment) {
    return Response.json({ success: false, message: "Invalid review payload" }, { status: 400 });
  }

  // Auto-publish (set in Settings) skips the pending queue for new storefront
  // submissions; explicit data.status (not used by the live form today) still wins.
  const status = data.status
    ? normalizeStatus(data.status)
    : (scopedProduct.autoPublish ? "approved" : "pending");

  const review = await prisma.review.create({
    data: {
      storeId:   scopedProduct.storeId,
      productId: scopedProduct.productId,
      email:     normalizeEmail(data.email),
      rating:    normalizeRating(data.rating),
      title:     normalizeTitle(data.title),
      comment,
      customer:  normalizeCustomer(data.customer),
      status,
      source:    "storefront",
      mediaUrl:  data.mediaUrl  || null,
      mediaType: data.mediaType || null,
      fileName:  data.fileName  || null,
    },
    select: { id: true, status: true, createdAt: true, mediaUrl: true, mediaType: true },
  });

  notifyIntegrations(shop, {
    metricName: "Review Submitted",
    email: normalizeEmail(data.email),
    properties: {
      rating: normalizeRating(data.rating),
      comment,
      customer: normalizeCustomer(data.customer),
      status: review.status,
    },
  }).catch((error) => console.error("notifyIntegrations failed:", error.message));

  return Response.json({ success: true, review }, { status: 201 });
}
