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

    let translated;
    try {
      translated = await translateTexts(creds.apiKey, creds.region, texts, targetLang);
    } catch (error) {
      console.error("[azure translator] review batch failed, serving original text:", error.message);
      return reviews;
    }

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

    let translated;
    try {
      translated = await translateTexts(creds.apiKey, creds.region, texts, targetLang);
    } catch (error) {
      console.error("[azure translator] Q&A batch failed, serving original text:", error.message);
      return questions;
    }

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
