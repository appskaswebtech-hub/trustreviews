import db from "../db.server";
import { batchRatings } from "../utils/ratings.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
};

// GET /api/ratings?product_id=123                     → { product_id, average, count }
// GET /api/ratings?shop=x.myshopify.com&product_ids=1,2,3
//     → { ratings: { "1": { average, count }, ... } } — one request for every
//       star badge on a page (collection grids can have dozens of cards).
export async function loader({ request }) {
  try {
    const url = new URL(request.url);

    const batchIds = url.searchParams.get("product_ids");
    if (batchIds !== null) {
      return Response.json(await batchRatings(url.searchParams.get("shop"), batchIds), { headers: CORS });
    }

    const productId = url.searchParams.get("product_id");

    if (!productId) {
      return Response.json(
        { success: false, message: "product_id required" },
        { status: 400 }
      );
    }

    // Product dhundho
    const product = await db.product.findFirst({
      where: {
        shopifyProductId: String(productId),
      },
    });

    if (!product) {
      return Response.json(
        { product_id: productId, average: 0, count: 0 },
        { headers: CORS }
      );
    }

    // Sirf approved reviews ka average nikalo
    const result = await db.review.aggregate({
      where: {
        productId: product.id,
        status: "approved",
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return Response.json(
      {
        product_id: productId,
        average: Math.round((result._avg.rating || 0) * 10) / 10,
        count: result._count.rating || 0,
      },
      { headers: CORS }
    );

  } catch (err) {
    console.error("[api.ratings error]", err);
    return Response.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
