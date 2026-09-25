// app/utils/google-places.server.js
// Fetches a store's own Google rating/reviews (via Google Business Profile
// Place ID) for the Google Reviews widget. Uses the Places API (New) with a
// single app-owned API key — plain fetch, no googleapis dependency, same
// style as the rest of this codebase's integrations.
import db from "../db.server";

const FIELD_MASK = "displayName,rating,userRatingCount,reviews";

function getApiKey() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Google Places API key is not configured (missing env var).");
  return apiKey;
}

export async function fetchGooglePlaceDetails(placeId) {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": getApiKey(),
      "X-Goog-FieldMask": FIELD_MASK,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 404) throw new Error("Place ID not found — double check it in Google's Place ID Finder.");
    if (response.status === 403) throw new Error("Google rejected the API key (Places API (New) may not be enabled, or the key is restricted).");
    throw new Error(`Google Places API returned status ${response.status}: ${body}`);
  }

  const json = await response.json();
  return {
    displayName: json.displayName?.text || null,
    rating: typeof json.rating === "number" ? json.rating : null,
    userRatingCount: typeof json.userRatingCount === "number" ? json.userRatingCount : 0,
    reviews: (json.reviews || []).map((r) => ({
      authorName: r.authorAttribution?.displayName || "Google user",
      rating: r.rating || 0,
      text: r.text?.text || "",
      relativeTime: r.relativePublishTimeDescription || "",
    })),
  };
}

// Pulls a business name + coordinates out of a pasted Google Maps share URL,
// e.g. https://www.google.com/maps/place/My+Shop/@lat,lng,17z/data=...!3dLAT!4dLNG...
// so we can resolve it to a real Place ID via a text search — Maps URLs
// don't carry the ChIJ-style Place ID the Places API needs directly.
export function parseGoogleMapsUrl(url) {
  const nameMatch = url.match(/\/maps\/place\/([^/@]+)/);
  const name = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, " ")) : null;

  const dataCoords = [...url.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
  let lat = null;
  let lng = null;
  if (dataCoords.length) {
    const last = dataCoords[dataCoords.length - 1];
    lat = parseFloat(last[1]);
    lng = parseFloat(last[2]);
  } else {
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }
  }

  if (!name) throw new Error("Could not find a business name in that Google Maps URL — try pasting the Place ID directly instead.");
  return { name, lat, lng };
}

export async function resolvePlaceIdFromMapsUrl(mapsUrl) {
  const { name, lat, lng } = parseGoogleMapsUrl(mapsUrl);

  const body = { textQuery: name };
  if (lat != null && lng != null) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 500 } };
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": getApiKey(),
      "X-Goog-FieldMask": "places.id,places.displayName",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`Google Places search failed (${response.status}): ${errBody}`);
  }

  const json = await response.json();
  const place = json.places?.[0];
  if (!place) throw new Error(`No matching Google Business Profile found for "${name}".`);
  return { placeId: place.id, displayName: place.displayName?.text || name };
}

// One-click flow for the "Google Maps URL" field: resolve → save → fetch.
export async function connectFromMapsUrl(shop, mapsUrl) {
  const { placeId } = await resolvePlaceIdFromMapsUrl(mapsUrl);
  await db.googleReviewsWidget.upsert({
    where: { shop },
    update: { placeId },
    create: { shop, placeId },
  });
  const details = await refreshGoogleReviewsCache(shop);
  return { ...details, placeId };
}

// Refreshed on Save and via the "Refresh now" button only — never called
// live from the storefront, per Google's caching guidance for review content.
export async function refreshGoogleReviewsCache(shop) {
  const widget = await db.googleReviewsWidget.findUnique({ where: { shop } });
  if (!widget?.placeId) throw new Error("Save a Place ID first.");

  try {
    const details = await fetchGooglePlaceDetails(widget.placeId);
    await db.googleReviewsWidget.update({
      where: { shop },
      data: {
        cachedDisplayName: details.displayName,
        cachedRating: details.rating,
        cachedReviewCount: details.userRatingCount,
        cachedReviews: details.reviews,
        lastFetchedAt: new Date(),
        lastFetchError: null,
      },
    });
    return details;
  } catch (error) {
    await db.googleReviewsWidget.update({
      where: { shop },
      data: { lastFetchError: error.message, lastFetchedAt: new Date() },
    });
    throw error;
  }
}
