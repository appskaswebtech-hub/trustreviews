// app/routes/api.reviews-widget.jsx
// Serves the embeddable reviews grid widget (no slider — fixed 4 cards)
// Usage: <div data-reviews-slider data-shop="your-shop.myshopify.com" data-product-id="123"></div>
//        <script src="YOUR_APP_URL/api/reviews-widget"></script>

export async function loader({ request }) {
  const APP_URL =
    process.env.SHOPIFY_APP_URL || process.env.APP_URL || "";

  const JS = /* javascript */ `
(function () {
  'use strict';

  var APP_URL = ${JSON.stringify(APP_URL)};

  /* ── Translations ── */
  var TRANSLATIONS = {
    en: { defaultTitle: 'What our customers say', basedOn: 'based on', review: 'review', reviews: 'reviews', verified: 'Verified', noReviews: 'No 5-star reviews yet.', loading: 'Loading reviews…' },
    hi: { defaultTitle: 'हमारे ग्राहक क्या कहते हैं', basedOn: 'आधारित', review: 'समीक्षा', reviews: 'समीक्षाएं', verified: 'सत्यापित', noReviews: 'अभी तक कोई 5-स्टार समीक्षा नहीं।', loading: 'समीक्षाएं लोड हो रही हैं…' },
    es: { defaultTitle: 'Lo que dicen nuestros clientes', basedOn: 'basado en', review: 'reseña', reviews: 'reseñas', verified: 'Verificado', noReviews: 'Aún no hay reseñas de 5 estrellas.', loading: 'Cargando reseñas…' },
    fr: { defaultTitle: 'Ce qu’en disent ceux qui l’ont essayé.', basedOn: 'basé sur', review: 'avis', reviews: 'avis', verified: 'Vérifié', noReviews: 'Aucun avis 5 étoiles pour le moment.', loading: 'Chargement des avis…' },
    de: { defaultTitle: 'Was unsere Kunden sagen', basedOn: 'basierend auf', review: 'Bewertung', reviews: 'Bewertungen', verified: 'Verifiziert', noReviews: 'Noch keine 5-Sterne-Bewertungen.', loading: 'Bewertungen werden geladen…' },
    it: { defaultTitle: 'Cosa dicono i nostri clienti', basedOn: 'basato su', review: 'recensione', reviews: 'recensioni', verified: 'Verificato', noReviews: 'Ancora nessuna recensione a 5 stelle.', loading: 'Caricamento recensioni…' },
    pt: { defaultTitle: 'O que dizem nossos clientes', basedOn: 'baseado em', review: 'avaliação', reviews: 'avaliações', verified: 'Verificado', noReviews: 'Ainda não há avaliações de 5 estrelas.', loading: 'Carregando avaliações…' },
    nl: { defaultTitle: 'Wat onze klanten zeggen', basedOn: 'gebaseerd op', review: 'review', reviews: 'reviews', verified: 'Geverifieerd', noReviews: 'Nog geen 5-sterren reviews.', loading: 'Reviews laden…' },
    ar: { defaultTitle: 'ما يقوله عملاؤنا', basedOn: 'بناءً على', review: 'تقييم', reviews: 'تقييمات', verified: 'موثّق', noReviews: 'لا توجد تقييمات 5 نجوم حتى الآن.', loading: 'جاري تحميل التقييمات…' },
    zh: { defaultTitle: '顾客评价', basedOn: '基于', review: '条评论', reviews: '条评论', verified: '已验证', noReviews: '暂无五星评论。', loading: '正在加载评论…' },
    ja: { defaultTitle: 'お客様の声', basedOn: 'に基づく', review: 'レビュー', reviews: 'レビュー', verified: '確認済み', noReviews: 'まだ5つ星のレビューはありません。', loading: 'レビューを読み込み中…' },
    ru: { defaultTitle: 'Что говорят наши клиенты', basedOn: 'на основе', review: 'отзыв', reviews: 'отзывов', verified: 'Проверено', noReviews: 'Пока нет отзывов с 5 звёздами.', loading: 'Загрузка отзывов…' },
    tr: { defaultTitle: 'Müşterilerimiz ne diyor', basedOn: 'şuna dayanarak', review: 'değerlendirme', reviews: 'değerlendirme', verified: 'Onaylı', noReviews: 'Henüz 5 yıldızlı değerlendirme yok.', loading: 'Değerlendirmeler yükleniyor…' },
    pl: { defaultTitle: 'Co mówią nasi klienci', basedOn: 'na podstawie', review: 'opinia', reviews: 'opinii', verified: 'Zweryfikowano', noReviews: 'Brak jeszcze 5-gwiazdkowych opinii.', loading: 'Wczytywanie opinii…' },
    ko: { defaultTitle: '고객님들의 후기', basedOn: '기준', review: '리뷰', reviews: '리뷰', verified: '인증됨', noReviews: '아직 5점 리뷰가 없습니다.', loading: '리뷰를 불러오는 중…' },
  };
  var T = TRANSLATIONS.en;

  /* ── Inject styles ── */
  var STYLE =
    ".trw-wrap{font-family:'Segoe UI',system-ui,sans-serif;padding:40px 20px;background:#6b0f2b;color:#fff}" +
    ".trw-header{display:flex;justify-content:space-between;align-items:flex-end;max-width:1200px;margin:0 auto 32px;flex-wrap:wrap;gap:16px}" +
    ".trw-title{font-size:clamp(20px,3vw,34px);font-weight:700;line-height:1.25;max-width:60%}" +
    ".trw-avg{text-align:right}" +
    ".trw-avg-num{font-size:48px;font-weight:800;line-height:1}" +
    ".trw-avg-stars{font-size:18px;letter-spacing:2px;margin:4px 0}" +
    ".trw-avg-count{font-size:11px;opacity:.6}" +
    ".trw-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;max-width:1200px;margin:0 auto}" +
    ".trw-card{background:#fff;color:#1a1a1a;border-radius:12px;padding:22px;display:flex;flex-direction:column;gap:10px;box-shadow:0 2px 10px rgba(0,0,0,.12)}" +
    ".trw-card-stars{font-size:15px;letter-spacing:1px}" +
    ".trw-card-quote{font-size:14px;font-weight:700;line-height:1.35;color:#1a1a1a}" +
    ".trw-card-body{font-size:12px;color:#666;line-height:1.5;flex:1}" +
    ".trw-card-foot{display:flex;align-items:center;gap:8px;border-top:1px solid #f0f0f0;padding-top:10px;margin-top:auto}" +
    ".trw-avatar{width:32px;height:32px;border-radius:50%;background:#6b0f2b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}" +
    ".trw-customer{font-size:11px;font-weight:600;color:#1a1a1a}" +
    ".trw-customer-sub{font-size:10px;color:#aaa}" +
    ".trw-verified{font-size:10px;color:#aaa;margin-left:auto}" +
    ".trw-empty{text-align:center;opacity:.6;padding:40px 0;font-size:13px;grid-column:1/-1}" +
    ".trw-card-title{font-size:13px;font-weight:700;color:#1a1a1a;letter-spacing:0.2px}" +
    "@media(max-width:900px){.trw-grid{grid-template-columns:repeat(2,1fr)}}" +
    "@media(max-width:520px){.trw-grid{grid-template-columns:1fr}}";

  function injectStyles() {
    if (document.getElementById('trw-styles')) return;
    var s = document.createElement('style');
    s.id = 'trw-styles';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  /* ── Star renderer ── */
  function starsHtml(rating) {
    var out = '';
    for (var i = 1; i <= 5; i++) {
      out += '<span style="color:' + (i <= rating ? '#F59E0B' : 'rgba(0,0,0,.15)') + '">&#9733;</span>';
    }
    return out;
  }

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  /* ── Build a single card ── */
  function buildCard(review) {
    var initials = (review.customer || 'A').trim().split(' ')
      .map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase();
    var cardLocale = document.documentElement.lang || 'en-IN';
    var date = review.createdAt
      ? new Date(review.createdAt).toLocaleDateString(cardLocale, { month: 'short', year: 'numeric' })
      : '';
    var comment = String(review.comment || '');
    var quote = comment
      ? ('' + comment.slice(0, 90) + (comment.length > 90 ? '...' : '') + '')
      : 'Great product!';

    var card = document.createElement('div');
    card.className = 'trw-card';
    card.innerHTML =
      '<div class="trw-card-stars">' + starsHtml(review.rating) + '</div>' +
      (review.title ? '<div class="trw-card-title">"' + escHtml(review.title) + '"</div>' : '') +  // ← ADD
      (comment.length > 90
        ? '<div class="trw-card-body">' + escHtml(comment.slice(0, 200)) + '</div>'
        : '') +
      '<div class="trw-card-foot">' +
        '<div class="trw-avatar">' + escHtml(initials) + '</div>' +
        '<div>' +
          '<div class="trw-customer">' + escHtml(review.customer || 'Anonymous') + '</div>' +
          (date ? '<div class="trw-customer-sub">' + date + '</div>' : '') +
        '</div>' +
        '<div class="trw-verified">' + escHtml(T.verified) + '</div>' +
      '</div>';
    return card;
  }

  /* ── Build the full widget ── */
  function buildWidget(container, data) {
    // Prefer the storefront's current language (set by the theme's language
    // switcher) over the merchant's saved default, so this script-tag widget
    // also follows the customer's language choice without a server round trip.
    var pageLocale = (document.documentElement.lang || '').split('-')[0].toLowerCase();
    T = TRANSLATIONS[pageLocale] || TRANSLATIONS[data.language] || TRANSLATIONS.en;

    var reviews   = (data.reviews || []).slice(0, 4); // max 4 cards
    var avgRating = data.average || 0;
    var count     = data.count   || reviews.length;
    var title     = container.getAttribute('data-title') || T.defaultTitle;

    injectStyles();

    /* average stars */
    var avgStars = '';
    for (var i = 1; i <= 5; i++) {
      avgStars += i <= Math.round(avgRating)
        ? '<span style="color:#fff">&#9733;</span>'
        : '<span style="color:rgba(255,255,255,.3)">&#9734;</span>';
    }

    var wrap = document.createElement('div');
    wrap.className = 'trw-wrap';
    wrap.innerHTML =
      '<div class="trw-header">' +
        '<div class="trw-title">' + escHtml(title) + '</div>' +
        '<div class="trw-avg">' +
          '<div class="trw-avg-num">' + avgRating.toFixed(1) + '</div>' +
          '<div class="trw-avg-stars">' + avgStars + '</div>' +
          '<div class="trw-avg-count">' + escHtml(T.basedOn) + ' ' + count + ' ' + escHtml(count === 1 ? T.review : T.reviews) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="trw-grid"></div>';

    var grid = wrap.querySelector('.trw-grid');

    if (!reviews.length) {
      grid.innerHTML = '<div class="trw-empty">' + escHtml(T.noReviews) + '</div>';
    } else {
      reviews.forEach(function(r) { grid.appendChild(buildCard(r)); });
    }

    container.innerHTML = '';
    container.appendChild(wrap);
  }

  /* ── Build the fetch URL with shop + product params ── */
  function buildFetchUrl(el) {
    var productId = el.getAttribute('data-product-id');
    var shop      = el.getAttribute('data-shop');

    // Fallback: try to read shop from Shopify globals injected on the storefront
    if (!shop) {
      shop = (typeof Shopify !== 'undefined' && Shopify.shop) ? Shopify.shop : null;
    }

    // Fallback: derive shop from current hostname (works on custom domains too)
    if (!shop) {
      shop = window.location.hostname;
    }

    var params = new URLSearchParams();
    if (shop)      params.set('shop',       shop);
    if (productId) params.set('product_id', productId);

    return APP_URL + '/api/top-reviews?' + params.toString();
  }

  /* ── Fetch + render per container, with one retry on failure ── */
  function initContainer(el) {
    var url = buildFetchUrl(el);

    el.innerHTML = '<div style="text-align:center;padding:40px;opacity:.5;font-size:13px;">Loading reviews\u2026</div>';

    function fetchReviews(attempt) {
      fetch(url)
        .then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function(data) {
          buildWidget(el, data);
        })
        .catch(function(err) {
          if (attempt < 2) {
            // Retry once after 1 second
            setTimeout(function() { fetchReviews(attempt + 1); }, 1000);
          } else {
            // Silent fail — hide the container instead of showing broken UI
            el.innerHTML = '';
            console.warn('[reviews-widget] Failed to load reviews from', url, err);
          }
        });
    }

    fetchReviews(1);
  }

  function init() {
    document.querySelectorAll('[data-reviews-slider]').forEach(initContainer);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
`;

  return new Response(JS, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}