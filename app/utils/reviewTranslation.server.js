// app/utils/reviewTranslation.server.js
// Machine-translates review/reply/Q&A text for storefront display only —
// the original text saved on Review/Question is never modified. Results are
// cached in ReviewTranslation / QuestionTranslation, keyed by a hash of the
// source text, so a shop's Azure Translator quota is spent once per
// review-or-question per language (re-spent only if the merchant edits the
// original text or writes/edits a reply/answer).
import crypto from "crypto";
import db from "../db.server";
import { translateTexts } from "./azureTranslator.server";

function hashParts(parts) {
  return crypto.createHash("sha1").update(parts.join("")).digest("hex");
}

// Azure's free (F0) tier caps requests/sec very low, and a busy storefront
// can have several widgets independently asking to translate the same
// product's reviews within the same page load. Without this, every one of
// those requests re-hits Azure and gets 429'd again, since a failed call
// never reaches the point where it would populate the cache. Once a shop
// gets rate-limited, skip calling Azure for it until the cooldown Azure told
// us about (via Retry-After) elapses — stale/uncached text is just served
// untranslated in the meantime.
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;
const rateLimitedUntil = new Map();

function isRateLimited(shop) {
  const until = rateLimitedUntil.get(shop);
  return until != null && until > Date.now();
}

function markIfRateLimited(shop, error) {
  if (error.status !== 429) return;
  rateLimitedUntil.set(shop, Date.now() + (error.retryAfterMs || DEFAULT_RATE_LIMIT_COOLDOWN_MS));
}

// A page load can fire several concurrent requests that each need
// translation for the same shop (e.g. two widgets on one page). Checking
// isRateLimited() before each independent Azure call isn't enough on its
// own — if both checks run before either call has failed, both still slip
// through and both get 429'd. Queuing all Azure calls for a shop through
// here means each one re-checks isRateLimited() only once it's actually its
// turn, after any earlier call in the queue has already recorded a failure.
const shopQueues = new Map();

function runExclusive(shop, fn) {
  const prev = (shopQueues.get(shop) || Promise.resolve()).catch(() => {});
  const result = prev.then(fn);
  shopQueues.set(shop, result.catch(() => {}));
  return result;
}

async function getAzureCreds(shop) {
  const integration = await db.integration.findUnique({
    where: { shop_provider: { shop, provider: "azure_translator" } },
  });
  if (!integration?.connected || !integration.apiKey || !integration.listId) return null;
  return { apiKey: integration.apiKey, region: integration.listId };
}

export async function translateReviews(shop, reviews, targetLang, baseLang = "en") {
  if (!reviews.length || targetLang === baseLang) return reviews;
  const creds = await getAzureCreds(shop);
  if (!creds) return reviews;

  const hashes = new Map(reviews.map((r) => [r.id, hashParts([r.title || "", r.comment || "", r.reply || ""])]));

  const cached = await db.reviewTranslation.findMany({
    where: { reviewId: { in: reviews.map((r) => r.id) }, language: targetLang },
  });
  const cacheByReviewId = new Map(cached.map((c) => [c.reviewId, c]));

  const stale = reviews.filter((r) => {
    const c = cacheByReviewId.get(r.id);
    return !c || c.sourceHash !== hashes.get(r.id);
  });

  if (stale.length) {
    const texts = [];
    const slots = [];
    stale.forEach((r) => {
      slots.push({ reviewId: r.id, field: "title" });   texts.push(r.title || "");
      slots.push({ reviewId: r.id, field: "comment" }); texts.push(r.comment || "");
      slots.push({ reviewId: r.id, field: "reply" });   texts.push(r.reply || "");
    });

    const translated = await runExclusive(shop, async () => {
      if (isRateLimited(shop)) return null;
      try {
        return await translateTexts(creds.apiKey, creds.region, texts, targetLang);
      } catch (error) {
        markIfRateLimited(shop, error);
        console.error("[azure translator] review batch failed, serving original text:", error.message);
        return null;
      }
    });

    if (translated) {
      const byReview = new Map();
      slots.forEach((slot, i) => {
        const entry = byReview.get(slot.reviewId) || {};
        entry[slot.field] = translated[i];
        byReview.set(slot.reviewId, entry);
      });

      await Promise.all(stale.map(async (r) => {
        const t = byReview.get(r.id) || {};
        const row = await db.reviewTranslation.upsert({
          where: { reviewId_language: { reviewId: r.id, language: targetLang } },
          update: { title: t.title || null, comment: t.comment || r.comment, reply: t.reply || null, sourceHash: hashes.get(r.id) },
          create: { reviewId: r.id, language: targetLang, title: t.title || null, comment: t.comment || r.comment, reply: t.reply || null, sourceHash: hashes.get(r.id) },
        });
        cacheByReviewId.set(r.id, row);
      }));
    }
  }

  return reviews.map((r) => {
    const t = cacheByReviewId.get(r.id);
    if (!t) return r;
    return {
      ...r,
      title: r.title ? (t.title || r.title) : r.title,
      comment: t.comment || r.comment,
      reply: r.reply ? (t.reply || r.reply) : r.reply,
    };
  });
}

export async function translateQuestions(shop, questions, targetLang, baseLang = "en") {
  if (!questions.length || targetLang === baseLang) return questions;
  const creds = await getAzureCreds(shop);
  if (!creds) return questions;

  const hashes = new Map(questions.map((q) => [q.id, hashParts([q.question || "", q.answer || ""])]));

  const cached = await db.questionTranslation.findMany({
    where: { questionId: { in: questions.map((q) => q.id) }, language: targetLang },
  });
  const cacheByQuestionId = new Map(cached.map((c) => [c.questionId, c]));

  const stale = questions.filter((q) => {
    const c = cacheByQuestionId.get(q.id);
    return !c || c.sourceHash !== hashes.get(q.id);
  });

  if (stale.length) {
    const texts = [];
    const slots = [];
    stale.forEach((q) => {
      slots.push({ questionId: q.id, field: "questionText" }); texts.push(q.question || "");
      slots.push({ questionId: q.id, field: "answerText" });   texts.push(q.answer || "");
    });

    const translated = await runExclusive(shop, async () => {
      if (isRateLimited(shop)) return null;
      try {
        return await translateTexts(creds.apiKey, creds.region, texts, targetLang);
      } catch (error) {
        markIfRateLimited(shop, error);
        console.error("[azure translator] Q&A batch failed, serving original text:", error.message);
        return null;
      }
    });

    if (translated) {
      const byQuestion = new Map();
      slots.forEach((slot, i) => {
        const entry = byQuestion.get(slot.questionId) || {};
        entry[slot.field] = translated[i];
        byQuestion.set(slot.questionId, entry);
      });

      await Promise.all(stale.map(async (q) => {
        const t = byQuestion.get(q.id) || {};
        const row = await db.questionTranslation.upsert({
          where: { questionId_language: { questionId: q.id, language: targetLang } },
          update: { questionText: t.questionText || q.question, answerText: t.answerText || null, sourceHash: hashes.get(q.id) },
          create: { questionId: q.id, language: targetLang, questionText: t.questionText || q.question, answerText: t.answerText || null, sourceHash: hashes.get(q.id) },
        });
        cacheByQuestionId.set(q.id, row);
      }));
    }
  }

  return questions.map((q) => {
    const t = cacheByQuestionId.get(q.id);
    if (!t) return q;
    return {
      ...q,
      question: t.questionText || q.question,
      answer: q.answer ? (t.answerText || q.answer) : q.answer,
    };
  });
}
