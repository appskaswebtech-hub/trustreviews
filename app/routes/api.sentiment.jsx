import { authenticate } from "../shopify.server";
import db from "../db.server";
import Anthropic from "@anthropic-ai/sdk";

const VALID_SENTIMENTS = new Set(["positive", "neutral", "negative"]);

export async function action({ request }) {
  const { session } = await authenticate.admin(request);

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { success: false, message: "ANTHROPIC_API_KEY is not set in .env" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const reviewId = Number(body.reviewId);

  const store = await db.store.findUnique({ where: { shop: session.shop }, select: { id: true } });
  if (!store) {
    return Response.json({ success: false, message: "Store not found" }, { status: 404 });
  }

  const review = await db.review.findFirst({
    where: { id: reviewId, storeId: store.id },
    select: { id: true, rating: true, comment: true },
  });
  if (!review) {
    return Response.json({ success: false, message: "Review not found" }, { status: 404 });
  }

  try {
    const client = new Anthropic();
    const completion = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16,
      messages: [{
        role: "user",
        content:
          `Classify the sentiment of this customer review (rated ${review.rating}/5 stars):\n\n"${review.comment}"\n\n` +
          `Reply with exactly one word: positive, neutral, or negative. No other text.`,
      }],
    });

    const textBlock = completion.content.find((b) => b.type === "text");
    const raw = (textBlock?.text || "").trim().toLowerCase();
    const sentiment = VALID_SENTIMENTS.has(raw) ? raw : "neutral";

    await db.review.update({
      where: { id: review.id },
      data: { sentiment, sentimentAt: new Date() },
    });

    return Response.json({ success: true, sentiment });
  } catch (err) {
    console.error("[sentiment error]", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
