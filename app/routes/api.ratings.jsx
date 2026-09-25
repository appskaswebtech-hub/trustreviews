import db from "../db.server";

export async function loader({ request }) {
  try {
    const url = new URL(request.url);
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
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
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
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        },
      }
    );

  } catch (err) {
    console.error("[api.ratings error]", err);
    return Response.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}