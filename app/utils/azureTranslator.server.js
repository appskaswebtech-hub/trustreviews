// app/utils/azureTranslator.server.js
// Server-only — calls Microsoft Azure Translator (Cognitive Services) to
// machine-translate review/reply/Q&A text for storefront display.
// Pricing & free tier: https://azure.microsoft.com/en-in/pricing/details/translator/
import { SUPPORTED_LANGS } from "./widgetTranslations.server";

const ENDPOINT = "https://api.cognitive.microsofttranslator.com/translate";

// Our internal language codes (SUPPORTED_LANGS) mostly match Azure's own
// codes, except simplified Chinese which Azure expects as "zh-Hans".
const AZURE_LANG_OVERRIDES = { zh: "zh-Hans" };
const toAzureLang = (lang) => AZURE_LANG_OVERRIDES[lang] || lang;

async function callAzure(apiKey, region, texts, targetLang) {
  const response = await fetch(
    `${ENDPOINT}?api-version=3.0&to=${encodeURIComponent(toAzureLang(targetLang))}`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Ocp-Apim-Subscription-Region": region,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(texts.map((text) => ({ Text: text }))),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const err = new Error(`Azure Translator returned status ${response.status}: ${body.slice(0, 200)}`);
    err.status = response.status;
    // On a 429, Azure tells us how long to back off via Retry-After (seconds).
    // Fall back to a conservative guess when the header is missing so callers
    // still get a sane cooldown instead of retrying immediately.
    if (response.status === 429) {
      const retryAfterSec = Number(response.headers.get("retry-after"));
      err.retryAfterMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec * 1000 : 5 * 60_000;
    }
    throw err;
  }

  const data = await response.json();
  return data.map((entry) => entry?.translations?.[0]?.text ?? "");
}

export async function testAzureTranslatorConnection(apiKey, region) {
  if (!apiKey) return { ok: false, error: "Missing API key." };
  if (!region) return { ok: false, error: "Missing region." };
  try {
    const [translated] = await callAzure(apiKey, region, ["Hello"], "es");
    return translated ? { ok: true } : { ok: false, error: "Azure Translator returned an empty response." };
  } catch (error) {
    if (/status 401/.test(error.message)) return { ok: false, error: "Invalid API key." };
    if (/status 400/.test(error.message)) return { ok: false, error: "Request rejected — check the region matches your Translator resource." };
    return { ok: false, error: error.message };
  }
}

// Azure caps a single request at 100 array elements / ~50,000 chars, so
// texts are translated in small chunks. Blank strings are skipped (no need
// to spend characters translating nothing) and passed through unchanged.
const CHUNK_SIZE = 25;

export async function translateTexts(apiKey, region, texts, targetLang) {
  const results = new Array(texts.length).fill("");
  const nonEmptyIndexes = [];
  texts.forEach((text, i) => { if (text && String(text).trim()) nonEmptyIndexes.push(i); });

  for (let start = 0; start < nonEmptyIndexes.length; start += CHUNK_SIZE) {
    const chunkIndexes = nonEmptyIndexes.slice(start, start + CHUNK_SIZE);
    const chunkTexts = chunkIndexes.map((i) => texts[i]);
    const translated = await callAzure(apiKey, region, chunkTexts, targetLang);
    chunkIndexes.forEach((idx, j) => { results[idx] = translated[j] || texts[idx]; });
  }

  return results;
}

export function isAzureSupportedLang(lang) {
  return SUPPORTED_LANGS.includes(lang);
}
