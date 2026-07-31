import { authenticate } from "../shopify.server";
import db from "../db.server";
import Anthropic from "@anthropic-ai/sdk";

export async function action({ request }) {
  const { session } = await authenticate.admin(request);

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { success: false, message: "ANTHROPIC_API_KEY is not set in .env" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const productId = Number(body.productId);

  const store = await db.store.findUnique({ where: { shop: session.shop }, select: { id: true } });
  if (!store) {
    return Response.json({ success: false, message: "Store not found" }, { status: 404 });
  }

  const product = await db.product.findFirst({
    where: { id: productId, storeId: store.id },
    select: { id: true },
  });
  if (!product) {
    return Response.json({ success: false, message: "Product not found" }, { status: 404 });
  }

  const reviews = await db.review.findMany({
    where: { storeId: store.id, productId: product.id, status: "approved" },
    select: { rating: true, comment: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (!reviews.length) {
    return Response.json(
      { success: false, message: "No approved reviews to summarize yet" },
      { status: 400 },
    );
  }

  const reviewText = reviews
    .map((r, i) => `${i + 1}. (${r.rating}/5) ${r.comment}`)
    .join("\n");

  try {
    const client = new Anthropic();
    const completion = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content:
          `Here are ${reviews.length} customer reviews for a product:\n\n${reviewText}\n\n` +
          `Write a short (2-3 sentence) merchant-facing summary highlighting overall sentiment ` +
          `and the most frequently mentioned themes (positive and negative). Be concise and factual.`,
      }],
    });

    const textBlock = completion.content.find((b) => b.type === "text");
    const summary = textBlock?.text?.trim() || "";

    await db.aiSummary.upsert({
      where: { storeId_productId: { storeId: store.id, productId: product.id } },
      update: { summary, reviewCount: reviews.length, generatedAt: new Date() },
      create: { storeId: store.id, productId: product.id, summary, reviewCount: reviews.length },
    });

    return Response.json({ success: true, summary, reviewCount: reviews.length });
  } catch (err) {
    console.error("[ai-summary error]", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
