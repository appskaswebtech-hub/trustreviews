import { authenticate } from "../shopify.server";
import db from "../db.server";

const toCSVCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const csvResponse = (csv) =>
  new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reviews.csv"',
    },
  });

const EMPTY_CSV = ["Customer", "Email", "Product", "ProductId", "Rating", "Comment", "Status", "Date"]
  .map(toCSVCell).join(",") + "\n";

// Streams a CSV of every review matching the request — either an explicit
// id list (scope=selected) or the same tab/search filter the dashboard's
// bulk actions already use (scope=all) — instead of only the current page,
// which is all the client has loaded into memory.
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") || "all";
  const tab = url.searchParams.get("tab") || "all";
  const search = url.searchParams.get("search") || "";
  const idsParam = url.searchParams.get("ids") || "";

  const store = await db.store.findUnique({ where: { shop: session.shop }, select: { id: true } });
  if (!store) return csvResponse(EMPTY_CSV);

  const where = { storeId: store.id };
  if (scope === "selected") {
    const ids = idsParam.split(",").map(Number).filter(Number.isFinite);
    if (!ids.length) return csvResponse(EMPTY_CSV);
    where.id = { in: ids };
  } else {
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
  }

  const reviews = await db.review.findMany({
    where,
    include: { product: { select: { shopifyProductId: true } } },
    orderBy: { createdAt: "desc" },
  });

  const productIds = [
    ...new Set(reviews.map((r) => r.product?.shopifyProductId).filter((id) => id && /^\d+$/.test(id))),
  ];

  const titles = Object.fromEntries(
    (
      await Promise.all(
        productIds.map(async (productId) => {
          try {
            const response = await admin.graphql(`{ product(id:"gid://shopify/Product/${productId}"){title} }`);
            const data = await response.json();
            return [productId, data?.data?.product?.title || null];
          } catch {
            return [productId, null];
          }
        }),
      )
    ).filter(([, title]) => title),
  );

  const rows = reviews.map((r) => {
    const shopifyProductId = r.product?.shopifyProductId || null;
    const productTitle = shopifyProductId ? (titles[shopifyProductId] || "Unknown Product") : "Unassigned";
    return [r.customer, r.email || "", productTitle, shopifyProductId || "", r.rating, r.comment, r.status, r.createdAt]
      .map(toCSVCell).join(",");
  });

  const csv = [
    ["Customer", "Email", "Product", "ProductId", "Rating", "Comment", "Status", "Date"].map(toCSVCell).join(","),
    ...rows,
  ].join("\n");

  return csvResponse(csv);
};
