import prisma from "../db.server";
import { authenticate } from "../shopify.server";

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

const normalizeComment = (value) => String(value ?? "").trim();

const normalizeEmail = (value) => {
  const email = String(value ?? "").trim().toLowerCase();
  return email || null;
};

async function getScopedShop(request) {
  const context = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop = context.session?.shop || url.searchParams.get("shop");

  if (!shop) {
    throw new Response("Shop context not found", { status: 401 });
  }

  return { context, shop, url };
}

async function ensureStoreAndProduct(shop, rawProductId) {
  const shopifyProductId = normalizeProductId(rawProductId);
  if (!shopifyProductId) return null;

  const store = await prisma.store.upsert({
    where: { shop },
    update: {},
    create: { shop },
    select: { id: true },
  });

  const product = await prisma.product.upsert({
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
    select: { id: true },
  });

  return {
    storeId: store.id,
    productId: product.id,
  };
}

export async function loader({ request }) {
  const { shop, url } = await getScopedShop(request);

  const productId = normalizeProductId(url.searchParams.get("productId"));

  if (!productId) {
    return Response.json({ reviews: [], total: 0, averageRating: 0, page: 1, limit: 0 });
  }

  const store = await prisma.store.findUnique({
    where: { shop },
    select: { id: true },
  });

  if (!store) {
    return Response.json({ reviews: [], total: 0, averageRating: 0, page: 1, limit: 0 });
  }

  const product = await prisma.product.findUnique({
    where: {
      storeId_shopifyProductId: {
        storeId: store.id,
        shopifyProductId: productId,
      },
    },
    select: { id: true },
  });

  if (!product) {
    return Response.json({ reviews: [], total: 0, averageRating: 0, page: 1, limit: 0 });
  }

  const where = {
    storeId: store.id,
    productId: product.id,
    status: "approved",
  };

  const [reviews, total, summary] = await Promise.all([
    prisma.review.findMany({
      where,
      select: {
        id: true,
        rating: true,
        comment: true,
        customer: true,
        likes: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({
      where,
      _avg: { rating: true },
    }),
  ]);

  return Response.json({
    reviews,
    total,
    averageRating: summary._avg.rating || 0,
    page: 1,
    limit: reviews.length,
  });
}

export async function action({ request }) {
  const { shop } = await getScopedShop(request);
  const data = await request.json();

  if (data.type === "like") {
    const store = await prisma.store.findUnique({
      where: { shop },
      select: { id: true },
    });

    if (!store) {
      return Response.json({ success: false }, { status: 404 });
    }

    const result = await prisma.review.updateMany({
      where: {
        id: Number(data.id),
        storeId: store.id,
      },
      data: {
        likes: {
          increment: 1,
        },
      },
    });

    if (!result.count) {
      return Response.json({ success: false }, { status: 404 });
    }

    const review = await prisma.review.findUnique({
      where: { id: Number(data.id) },
      select: { id: true, likes: true },
    });

    return Response.json({ success: true, review });
  }

  const scopedProduct = await ensureStoreAndProduct(shop, data.productId);
  const comment = normalizeComment(data.comment);

  if (!scopedProduct || !comment) {
    return Response.json({ success: false, message: "Invalid review payload" }, { status: 400 });
  }

  const review = await prisma.review.create({
    data: {
      storeId: scopedProduct.storeId,
      productId: scopedProduct.productId,
      email: normalizeEmail(data.email),
      rating: normalizeRating(data.rating),
      comment,
      customer: normalizeCustomer(data.customer),
      status: normalizeStatus(data.status),
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
    },
  });

  return Response.json({ success: true, review }, { status: 201 });
}
