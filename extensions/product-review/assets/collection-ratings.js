/* Trust Reviews — Collection Star Ratings (app embed: blocks/collection-ratings.liquid)
 *
 * Puts star ratings under the product name on product cards: collection pages,
 * home page (featured collection / featured product), search results and the
 * related products on a product page. Off unless the merchant turns the embed
 * on in Theme Editor → App embeds; every look-and-feel setting comes from there.
 *
 * All ratings on a page are fetched in one request through the app proxy, and
 * cards added later (filters, sorting, infinite scroll) are picked up too.
 */
(function () {
  'use strict';
  if (window.__trustCollectionRatings) return;
  window.__trustCollectionRatings = true;

  var cfgEl = document.getElementById('trust-cr-config');
  if (!cfgEl) return;
  var CFG;
  try { CFG = JSON.parse(cfgEl.textContent); } catch (e) { return; }

  // Star widgets that are already on a card (snippets, Inline Star Rating…) win.
  var EXISTING = '.trust-cr, [data-trust-product-id], [data-trust-count], .trust-inline-rating';
  // Promotional tiles that happen to link to a product ("New in", banners).
  var PROMO = '[class*="promo"], [class*="banner"], [class*="hero"], [class*="slideshow"]';
  var CARD_TITLE_SELECTORS = 'h2, h3, h4, h5, .h2, .h3, .h4, .h5, .card__heading, [class*="title"], [class*="name"]';

  /* ── finding product cards ─────────────────────────────────────────────── */

  function handleOf(href) {
    var part = String(href || '').split('/products/')[1];
    return part ? part.split(/[?#/]/)[0] : null;
  }

  function onlyLinksTo(el, handle) {
    var links = el.querySelectorAll('a[href*="/products/"]');
    for (var j = 0; j < links.length; j++) {
      if (handleOf(links[j].getAttribute('href')) !== handle) return false;
    }
    return true;
  }

  function imageCount(el) { return el.querySelectorAll('img, picture').length; }

  // The card = nearest ancestor of the product link with an image and some
  // text, linking to only this product — widened to the whole card (themes put
  // several links in one card; Dawn hides a copy of the name in the image box).
  function cardFor(link, handle) {
    var el = link, card = null;
    for (var depth = 0; el && el !== document.body && depth < 8; depth++, el = el.parentElement) {
      if (!onlyLinksTo(el, handle)) return null;
      if (el.querySelector('img, picture') && el.textContent.trim()) { card = el; break; }
    }
    if (!card) return null;
    var images = imageCount(card);
    while (card.parentElement && card.parentElement !== document.body &&
           onlyLinksTo(card.parentElement, handle) && imageCount(card.parentElement) === images) {
      card = card.parentElement;
    }
    return card;
  }

  function isVisible(el) {
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  }

  // The whole product tile: some themes split a card into parts that each look
  // like a card (image box / text box with icon images). Everything up to the
  // grid that links only to this product is one tile → one set of stars.
  function tileFor(card, handle) {
    var el = card;
    for (var d = 0; d < 6; d++) {
      var p = el.parentElement;
      if (!p || p === document.body || p.tagName === 'MAIN' || !onlyLinksTo(p, handle)) break;
      if (p.querySelector('h1') && !el.querySelector('h1')) break; // never swallow a page heading
      el = p;
    }
    return el;
  }

  function linksTo(a, handle) {
    return !!a && handleOf(a.getAttribute('href')) === handle;
  }

  // The product name shoppers actually see: a visible title-like element that
  // is (or sits in, or holds) this product's link. Themes often print the name
  // twice — one copy hidden.
  function productTitle(scope, handle) {
    var all = Array.prototype.filter.call(scope.querySelectorAll(CARD_TITLE_SELECTORS), function (el) {
      var text = el.textContent.trim();
      return text && text.length < 200 && isVisible(el);
    });
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (linksTo(el.closest('a[href*="/products/"]'), handle) || linksTo(el.querySelector('a[href*="/products/"]'), handle)) return el;
    }
    // Card covered by an overlay link (e.g. Horizon): the name isn't in a link
    // at all — take the first visible heading / "title" element.
    for (var j = 0; j < all.length; j++) {
      if (/^H[2-5]$/.test(all[j].tagName) || /title/i.test(String(all[j].className))) return all[j];
    }
    return null;
  }

  var idCache = {};
  function productIdFor(handle, card) {
    // Dawn-style card links carry the id ("CardLink-…-1234567890").
    var withId = card.querySelectorAll('a[id]');
    for (var k = 0; k < withId.length; k++) {
      var tail = String(withId[k].id).split('-').pop();
      if (/^[0-9]{6,}$/.test(tail)) return Promise.resolve(tail);
    }
    if (!idCache[handle]) {
      idCache[handle] = fetch('/products/' + handle + '.js')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (p) { return p && p.id ? String(p.id) : null; })
        .catch(function () { return null; });
    }
    return idCache[handle];
  }

  /* ── rendering ─────────────────────────────────────────────────────────── */

  function starsHTML(avg) {
    var full = Math.round(avg);
    var out = '';
    for (var i = 1; i <= 5; i++) {
      out += '<span aria-hidden="true" style="color:' + (i <= full ? CFG.starColor : CFG.emptyColor) + '">&#9733;</span>';
    }
    return out;
  }

  function textFor(avg, count) {
    var word = count === 1 ? (CFG.reviewWord || 'review') : (CFG.reviewsWord || 'reviews');
    switch (CFG.textFormat) {
      case 'rating': return avg.toFixed(1);
      case 'count': return '(' + count.toLocaleString() + ')';
      case 'rating_count': return avg.toFixed(1) + ' (' + count.toLocaleString() + ')';
      case 'count_word': return count.toLocaleString() + ' ' + word;
      default: return '';
    }
  }

  function render(slot, r) {
    var avg = r ? r.average : 0;
    var count = r ? r.count : 0;
    if (!count && !CFG.showEmpty) return;
    var text = count ? textFor(avg, count) : '';
    slot.innerHTML =
      '<span class="trust-cr__stars" style="display:inline-flex;gap:' + CFG.starGap + 'px;font-size:' + CFG.starSize + 'px;line-height:1">' + starsHTML(avg) + '</span>' +
      (text ? '<span class="trust-cr__text" style="font-size:' + CFG.textSize + 'px;color:' + CFG.textColor + '">' + text + '</span>' : '');
    slot.setAttribute('aria-label', count ? avg.toFixed(1) + ' out of 5, ' + count + ' ' + (count === 1 ? 'review' : 'reviews') : 'No reviews yet');
    slot.style.display = 'flex';
  }

  function makeSlot(pid) {
    var el = document.createElement('div');
    el.className = 'trust-cr';
    el.setAttribute('data-trust-cr-id', pid);
    el.setAttribute('role', 'img');
    el.style.cssText = 'display:none;align-items:center;gap:6px;flex-wrap:wrap;' +
      'justify-content:' + CFG.justify + ';margin:' + CFG.marginTop + 'px 0 ' + CFG.marginBottom + 'px;';
    return el;
  }

  /* ── main loop ─────────────────────────────────────────────────────────── */

  function placeOnCards() {
    var scope = document.querySelector('main') || document.body;
    var jobs = [];
    scope.querySelectorAll('a[href*="/products/"]').forEach(function (link) {
      var handle = handleOf(link.getAttribute('href'));
      if (!handle || link.closest(PROMO)) return;
      var card = cardFor(link, handle);
      if (!card) { placeOnTitleLink(link, handle, jobs); return; }
      var tile = tileFor(card, handle);
      if (tile.hasAttribute('data-trust-cr-card') || tile.querySelector(EXISTING)) return;
      // No visible product name → no stars (better than a wrong spot).
      var title = productTitle(tile, handle);
      if (!title) return;
      tile.setAttribute('data-trust-cr-card', '');
      jobs.push(productIdFor(handle, tile).then(function (pid) {
        // The product a product page is about is not a card.
        if (!pid || (pid === CFG.currentProductId && !tile.closest('[class*="related"], [class*="recommend"]'))) return;
        // Name inside a link that holds only the name (Featured product, many
        // themes' title links) → after the link. A link wrapping the whole card
        // (name + price) → right after the name, inside it.
        var titleLink = title.closest('a');
        var anchor = titleLink && titleLink !== tile && tile.contains(titleLink) &&
          titleLink.textContent.trim() === title.textContent.trim() ? titleLink : title;
        anchor.insertAdjacentElement('afterend', makeSlot(pid));
      }));
    });
    return Promise.all(jobs);
  }

  // Cards that also link to other products (e.g. each color is its own product)
  // have no single-product tile — but if this link is the product name, the
  // stars can still go right under it.
  function placeOnTitleLink(link, handle, jobs) {
    var title = link.matches(CARD_TITLE_SELECTORS) ? link : link.closest(CARD_TITLE_SELECTORS);
    if (!title) {
      // …or the name sits inside this link (link wraps name + price).
      var inner = link.querySelectorAll(CARD_TITLE_SELECTORS);
      for (var i = 0; i < inner.length && !title; i++) if (inner[i].textContent.trim() && isVisible(inner[i])) title = inner[i];
    }
    if (!title || title.hasAttribute('data-trust-cr-card') || title.closest('[data-trust-cr-card]')) return;
    var text = title.textContent.trim();
    if (!text || text.length > 200 || !isVisible(title)) return;
    var next = title.nextElementSibling;
    if (next && next.matches(EXISTING)) return;
    title.setAttribute('data-trust-cr-card', '');
    jobs.push(productIdFor(handle, title.parentElement || title).then(function (pid) {
      if (!pid || pid === CFG.currentProductId) return;
      title.insertAdjacentElement('afterend', makeSlot(pid));
    }));
  }

  function loadRatings() {
    var slots = Array.prototype.slice.call(document.querySelectorAll('.trust-cr:not([data-trust-cr-loaded])'));
    if (!slots.length) return;
    var ids = [];
    slots.forEach(function (s) {
      s.setAttribute('data-trust-cr-loaded', '');
      var id = s.getAttribute('data-trust-cr-id');
      if (ids.indexOf(id) < 0) ids.push(id);
    });
    for (var i = 0; i < ids.length; i += 100) {
      (function (chunk) {
        fetch('/apps/review?type=ratings-batch&product_ids=' + chunk.join(','))
          .then(function (r) { return r.json(); })
          .then(function (data) {
            slots.forEach(function (s) {
              var id = s.getAttribute('data-trust-cr-id');
              if (chunk.indexOf(id) >= 0) render(s, (data.ratings || {})[id]);
            });
          })
          .catch(function () {});
      })(ids.slice(i, i + 100));
    }
  }

  function run() { placeOnCards().then(loadRatings); }

  function start() {
    run();
    // Filters, sorting and infinite scroll swap the cards in later.
    var timer;
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(run, 300);
    }).observe(document.body, { childList: true, subtree: true });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
