import prisma from "../db.server";

const REVIEW_WORDS = {
  en: { review: "review", reviews: "reviews", starsFrom: "Stars From" },
  hi: { review: "रिव्यू", reviews: "रिव्यू", starsFrom: "स्टार आधारित" },
  es: { review: "reseña", reviews: "reseñas", starsFrom: "Estrellas Basado en" },
  fr: { review: "avis", reviews: "avis", starsFrom: "Étoiles Basé sur" },
  de: { review: "Bewertung", reviews: "Bewertungen", starsFrom: "Sterne Basierend auf" },
  it: { review: "recensione", reviews: "recensioni", starsFrom: "Stelle Basato su" },
  pt: { review: "avaliação", reviews: "avaliações", starsFrom: "Estrelas Baseado em" },
  nl: { review: "review", reviews: "reviews", starsFrom: "Sterren Gebaseerd op" },
  ar: { review: "تقييم", reviews: "تقييمات", starsFrom: "نجوم بناءً على" },
  zh: { review: "条评论", reviews: "条评论", starsFrom: "星 基于" },
  ja: { review: "レビュー", reviews: "レビュー", starsFrom: "つ星 に基づく" },
  ru: { review: "отзыв", reviews: "отзывов", starsFrom: "Звёзд На основе" },
  tr: { review: "değerlendirme", reviews: "değerlendirme", starsFrom: "Yıldız Şuna dayanarak" },
  pl: { review: "opinia", reviews: "opinii", starsFrom: "Gwiazdek Na podstawie" },
  ko: { review: "리뷰", reviews: "리뷰", starsFrom: "별점 기준" },
};

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const APP_URL = process.env.SHOPIFY_APP_URL || process.env.APP_URL;

  const [settings, store] = await Promise.all([
    shop ? prisma.widgetSettings.findUnique({ where: { shop } }) : null,
    shop ? prisma.store.findUnique({ where: { shop }, select: { language: true } }) : null,
  ]);

  const defaultLanguage = store?.language || "en";

  const cfg = {
    starColor:      settings?.starColor     ?? "#F59E0B",
    starSize:       settings?.starSize      ?? 15,
    countColor:     settings?.countColor    ?? "#6B7280",
    countFontSize:  settings?.countFontSize ?? 12,
    showEmpty:      settings?.showEmpty     ?? false,
    borderRadius:   settings?.borderRadius  ?? 4,
    background:     settings?.background    ?? "#FFFFFF",
    widgetStyle:    settings?.widgetStyle   ?? "compact",
    secondaryStat:  settings?.secondaryStat ?? "",
    // Full word table baked in (not just one language) so the widget can pick
    // the right words from the storefront's current language at render time,
    // even though this script is generated once per request.
    words:          REVIEW_WORDS,
    defaultLanguage,
  };

  const JS = `
(function() {
  var APP_URL = "${APP_URL}";
  var CFG = ${JSON.stringify(cfg)};

  /* ── helpers ─────────────────────────────────── */
  function stars(avg) {
    var s = "";
    for (var i = 1; i <= 5; i++) {
      var color   = avg >= i ? CFG.starColor : (avg >= i - 0.5 ? CFG.starColor : "#D1D5DB");
      var opacity = (avg >= i - 0.5 && avg < i) ? "0.55" : "1";
      s += '<span style="color:' + color + ';opacity:' + opacity + ';font-size:' + CFG.starSize + 'px;line-height:1;">★</span>';
    }
    return s;
  }

  /* ── pick words from the storefront's current language ── */
  function currentWords() {
    var pageLocale = (document.documentElement.lang || '').split('-')[0].toLowerCase();
    return CFG.words[pageLocale] || CFG.words[CFG.defaultLanguage] || CFG.words.en;
  }

  /* ── style renderers ──────────────────────────── */
  var renderers = {

    /* ★★★★☆ 4.7 - 13 avis  (original storefront look) */
    compact: function(avg, count, words) {
      return (
        '<span class="trust-main" style="display:inline-flex;align-items:center;gap:2px;' +
          'background:' + CFG.background + ';' +
          'border-radius:' + CFG.borderRadius + 'px;' +
          'padding:2px 6px;">' +
          stars(avg) +
          '<span class="trust-avg" style="font-size:' + (CFG.countFontSize - 1) + 'px;font-weight:600;color:#111827;margin-left:4px;">' + avg.toFixed(1) + '</span>' +
          '<span class="trust-count" style="font-size:' + CFG.countFontSize + 'px;color:' + CFG.countColor + ';margin-left:3px;">- ' + count + ' ' + words.reviews + '</span>' +
        '</span>'
      );
    },

    /* card with subtle border + shadow */
    card: function(avg, count, words) {
      return (
        '<span class="trust-main" style="display:inline-flex;align-items:center;gap:5px;' +
          'background:' + CFG.background + ';' +
          'border:1px solid #E5E7EB;' +
          'border-radius:' + CFG.borderRadius + 'px;' +
          'padding:5px 10px;' +
          'box-shadow:0 1px 3px rgba(0,0,0,0.06);">' +
          stars(avg) +
          '<span class="trust-avg" style="font-size:' + (CFG.countFontSize - 1) + 'px;font-weight:600;color:#111827;margin-left:2px;">' + avg.toFixed(1) + '</span>' +
          '<span class="trust-count" style="font-size:' + CFG.countFontSize + 'px;color:' + CFG.countColor + ';">(' + count + ' ' + (count === 1 ? words.review : words.reviews) + ')</span>' +
        '</span>'
      );
    },

    /* ★ 4.7 · 13 reviews — pill badge */
    pill: function(avg, count, words) {
      var bg     = CFG.starColor + "18";
      var border = CFG.starColor + "55";
      return (
        '<span class="trust-main" style="display:inline-flex;align-items:center;gap:4px;' +
          'background:' + bg + ';' +
          'border:1px solid ' + border + ';' +
          'border-radius:999px;' +
          'padding:3px 10px;">' +
          '<span  style="color:' + CFG.starColor + ';font-size:' + CFG.starSize + 'px;line-height:1;">★</span>' +
          '<span class="trust-avg" style="font-size:' + (CFG.countFontSize - 1) + 'px;font-weight:700;color:#111827;">' + avg.toFixed(1) + '</span>' +
          '<span class="trust-count" style="font-size:' + CFG.countFontSize + 'px;color:' + CFG.countColor + ';">· ' + count + ' ' + words.reviews + '</span>' +
        '</span>'
      );
    },

    /* pure inline, no bg */
    minimal: function(avg, count, words) {
      return (
        '<span  class="trust-avg-main" style="display:inline-flex;align-items:center;gap:2px;">' +
          stars(avg) +
          '<span class="trust-avg-count" style="font-size:' + CFG.countFontSize + 'px;color:' + CFG.countColor + ';margin-left:3px;">' +
            avg.toFixed(1) + ' (' + count + ')' +
          '</span>' +
        '</span>'
      );
    },

    /* ★★★★★ 4.8 Stars From 4,225 Reviews | 1.5M+ Servings */
    text: function(avg, count, words) {
      var secondary = CFG.secondaryStat
        ? '<span style="color:' + CFG.countColor + ';font-weight:500;"> | ' + CFG.secondaryStat + '</span>'
        : '';
      return (
        '<span class="trust-main" style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
          stars(avg) +
          '<span style="font-size:' + (CFG.countFontSize + 2) + 'px;font-weight:700;color:#111827;">' +
            avg.toFixed(1) + ' ' + words.starsFrom + ' ' + count.toLocaleString() + ' ' + (count === 1 ? words.review : words.reviews) +
            secondary +
          '</span>' +
        '</span>'
      );
    },
  };

  var render = renderers[CFG.widgetStyle] || renderers.compact;

  /* ── fetch + inject ───────────────────────────── */
  function loadRatings() {
    document.querySelectorAll('[data-trust-product-id]').forEach(function(el) {
      var pid = el.getAttribute('data-trust-product-id');
      fetch(APP_URL + '/api/ratings?product_id=' + pid)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.count > 0 || CFG.showEmpty) {
            el.innerHTML  = render(data.average, data.count, currentWords());
            el.style.cssText = 'display:inline-block;';
          }
        })
        .catch(function() {});
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', loadRatings)
    : loadRatings();
})();
  `;

  return new Response(JS, {
    headers: {
      "Content-Type": "application/javascript",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
