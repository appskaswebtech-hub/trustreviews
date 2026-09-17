// app/utils/onboarding-token.server.js
//
// The onboarding wizard lives on its own page outside the embedded admin
// iframe (app/routes/onboarding.jsx), so it can't rely on Shopify's session
// token (App Bridge only injects that inside the iframe). Instead the
// embedded app hands it a short-lived, HMAC-signed token that resolves to a
// shop — this keeps the standalone page from trusting a bare `?shop=` query
// param, which anyone could tamper with to read/edit another merchant's data
// or kick off a subscription on their behalf.

import crypto from "node:crypto";

const SECRET = process.env.SHOPIFY_API_SECRET || "";
const TTL_MS = 60 * 60 * 1000; // 1 hour — generous enough to fill in the form

function sign(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function signOnboardingToken(shop) {
  const expires = Date.now() + TTL_MS;
  const payload = `${shop}|${expires}`;
  return Buffer.from(`${payload}|${sign(payload)}`, "utf8").toString("base64url");
}

/** Returns the shop domain if the token is valid and unexpired, else null. */
export function verifyOnboardingToken(token) {
  if (!token) return null;
  try {
    const decoded = Buffer.from(String(token), "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return null;
    const [shop, expiresStr, sig] = parts;
    const expires = Number(expiresStr);
    if (!shop || !Number.isFinite(expires)) return null;

    const expectedSig = sign(`${shop}|${expiresStr}`);
    const sigBuf = Buffer.from(sig, "utf8");
    const expectedBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    if (Date.now() > expires) return null;

    return shop;
  } catch {
    return null;
  }
}
