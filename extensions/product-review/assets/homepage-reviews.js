(function () {
  var D_ACCENT = '#f59e0b', D_TEXT = '#111111', D_PANEL_BG = '#111111';

  function starHTML(rating, color) {
    var s = '';
    for (var i = 0; i < 5; i++) s += '<span style="color:' + (i < rating ? (color || D_ACCENT) : '#ddd') + '">&#9733;</span>';
    return s;
  }

  function ratingLabel(avg, t) {
    if (avg >= 4.5) return t.ratingExcellent || 'Excellent';
    if (avg >= 4.0) return t.ratingVeryGood  || 'Very Good';
    if (avg >= 3.5) return t.ratingGood      || 'Good';
    if (avg >= 3.0) return t.ratingAverage   || 'Average';
    return t.ratingMixed || 'Mixed';
  }

  function initials(name) {
    return (name || 'A').split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
  }

  function buildCard(r, s, t) {
    var div = document.createElement('div');
    div.className = 'hr-card';

    var starsHtml = starHTML(r.rating, s.starColor);
    var verifiedHtml = (s.showVerified && r.verified)
      ? '<div class="hr-card-verified"><span>&#10003;</span> ' + (t.verifiedPurchase || 'Verified purchase') + '</div>' : '';
    var imgHtml = (s.showMedia && r.mediaUrl)
      ? '<div class="hr-card-img"><img src="' + r.mediaUrl + '" alt="review" loading="lazy"></div>' : '';

    div.innerHTML =
      '<div class="hr-card-header"><span class="hr-card-name">' + (r.customer || 'Customer') + '</span><span class="hr-card-stars">' + starsHtml + '</span></div>' +
      verifiedHtml +
      '<div class="hr-card-text">' + (r.comment || '') + '</div>' +
      imgHtml;
    return div;
  }

  function buildSummaryCarousel(reviews, s, avg, total, t) {
    var cols = Math.min(3, s.columns || 3);
    var labelStr = ratingLabel(avg, t);

    var wrap = document.createElement('div');
    wrap.className = 'hr-sc-wrap';

    // Summary panel
    var panel = document.createElement('div');
    panel.className = 'hr-sc-panel';
    panel.innerHTML =
      '<div class="hr-sc-panel-label">' + labelStr + '</div>' +
      '<div class="hr-sc-panel-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>' +
      '<div class="hr-sc-panel-avg">' + avg.toFixed(1) + ' ' + (t.average || 'average') + '</div>' +
      '<div class="hr-sc-panel-count">' + total + ' ' + (t.reviews || 'reviews') + '</div>';
    wrap.appendChild(panel);

    // Carousel
    var carousel = document.createElement('div');
    carousel.className = 'hr-sc-carousel';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'hr-arrow';
    prevBtn.innerHTML = '&#8249;';
    prevBtn.setAttribute('aria-label', 'Previous');

    var trackWrap = document.createElement('div');
    trackWrap.className = 'hr-track-wrap';
    var track = document.createElement('div');
    track.className = 'hr-track';
    trackWrap.appendChild(track);

    var nextBtn = document.createElement('button');
    nextBtn.className = 'hr-arrow';
    nextBtn.innerHTML = '&#8250;';
    nextBtn.setAttribute('aria-label', 'Next');

    // Build slides
    var items = reviews.slice(0, s.maxRev || 9);
    var slideClass = cols === 3 ? 'hr-slide-3' : cols === 2 ? 'hr-slide-2' : 'hr-slide-1';
    var slides = [], current = 0;

    for (var i = 0; i < items.length; i += cols) {
      var slide = document.createElement('div');
      slide.className = 'hr-slide ' + slideClass;
      var chunk = items.slice(i, i + cols);
      for (var k = 0; k < chunk.length; k++) slide.appendChild(buildCard(chunk[k], s, t));
      track.appendChild(slide);
      slides.push(slide);
    }

    var total_slides = slides.length;
    function goTo(idx) {
      current = ((idx % total_slides) + total_slides) % total_slides;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
    }
    prevBtn.addEventListener('click', function () { goTo(current - 1); });
    nextBtn.addEventListener('click', function () { goTo(current + 1); });

    // Touch support
    var startX = 0;
    track.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
    });

    carousel.appendChild(prevBtn);
    carousel.appendChild(trackWrap);
    carousel.appendChild(nextBtn);
    wrap.appendChild(carousel);
    return wrap;
  }

  function buildGrid(reviews, s, t) {
    var grid = document.createElement('div');
    grid.className = 'hr-grid';
    var items = reviews.slice(0, s.maxRev || 9);
    for (var i = 0; i < items.length; i++) grid.appendChild(buildCard(items[i], s, t));
    return grid;
  }

  function buildMasonry(reviews, s, t) {
    var grid = document.createElement('div');
    grid.className = 'hr-masonry';
    var items = reviews.slice(0, s.maxRev || 9);
    for (var i = 0; i < items.length; i++) grid.appendChild(buildCard(items[i], s, t));
    return grid;
  }

  function buildSpotlight(reviews, s, avg, total, t) {
    var wrap = document.createElement('div');
    wrap.className = 'hr-spotlight';

    var left = document.createElement('div');
    left.className = 'hr-spotlight-left';
    left.innerHTML =
      '<div class="hr-spotlight-avg">' + avg.toFixed(1) + '</div>' +
      '<div class="hr-spotlight-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>' +
      '<div class="hr-spotlight-count">' + (t.basedOn || 'Based on') + ' ' + total + ' ' + (t.reviews || 'reviews') + '</div>';
    wrap.appendChild(left);

    var right = document.createElement('div');
    right.className = 'hr-spotlight-reviews';
    var items = reviews.slice(0, 3);
    for (var i = 0; i < items.length; i++) {
      var r = items[i];
      var card = document.createElement('div');
      card.className = 'hr-spotlight-card';
      card.innerHTML =
        '<div style="font-size:.85rem;margin-bottom:4px">' + starHTML(r.rating, s.starColor) + '</div>' +
        '<div class="hr-spotlight-text">"' + (r.comment || '') + '"</div>' +
        '<div class="hr-spotlight-meta"><strong>' + (r.customer || 'Customer') + '</strong>' +
        (r.verified ? ' &middot; &#10003; ' + (t.verified || 'Verified') : '') + '</div>';
      right.appendChild(card);
    }
    wrap.appendChild(right);
    return wrap;
  }

  function buildTicker(reviews, s) {
    var outer = document.createElement('div');
    outer.className = 'hr-ticker-outer';
    var inner = document.createElement('div');
    inner.className = 'hr-ticker-inner';
    var items = reviews.slice(0, 12);
    // Duplicate for seamless loop
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < items.length; i++) {
        var r = items[i];
        var item = document.createElement('div');
        item.className = 'hr-ticker-item';
        item.innerHTML =
          '<span>' + starHTML(r.rating, s.starColor) + '</span>' +
          '<span class="hr-ticker-name">' + (r.customer || 'Customer') + '</span>' +
          '<span>' + (r.comment || '').slice(0, 60) + (r.comment && r.comment.length > 60 ? '…' : '') + '</span>';
        inner.appendChild(item);
      }
    }
    outer.appendChild(inner);
    return outer;
  }

  function applyVars(el, s) {
    var vars = {
      '--hr-font':        s.fontFamily   || 'inherit',
      '--hr-bg':          s.pageBg       || 'transparent',
      '--hr-text':        s.textColor    || '#111',
      '--hr-muted':       s.mutedColor   || '#444',
      '--hr-accent':      s.accentColor  || D_ACCENT,
      '--hr-panel-bg':    s.panelBg      || D_PANEL_BG,
      '--hr-panel-text':  s.panelText    || '#fff',
      '--hr-card-bg':     s.cardBg       || '#fff',
      '--hr-border':      s.cardBorder   || '#e5e5e5',
      '--hr-card-radius': (s.cardRadius != null ? s.cardRadius : 8) + 'px',
      '--hr-card-pad':    (s.cardPadding != null ? s.cardPadding : 20) + 'px',
      '--hr-shadow':      s.showShadow ? '0 4px 16px rgba(0,0,0,.08)' : 'none',
      '--hr-gap':         (s.gap != null ? s.gap : 20) + 'px',
      '--hr-cols':        s.columns || 3,
      '--hr-h-size':      (s.headingSize || 36) + 'px',
      '--hr-h-align':     s.headingAlign || 'center',
      '--hr-pt':          (s.paddingTop != null ? s.paddingTop : 60) + 'px',
      '--hr-pb':          (s.paddingBottom != null ? s.paddingBottom : 60) + 'px',
      '--hr-name-size':   (s.nameSize || 14) + 'px',
      '--hr-rev-size':    (s.reviewSize || 14) + 'px',
      '--hr-radius':      (s.sectionRadius != null ? s.sectionRadius : 6) + 'px',
    };
    for (var k in vars) el.style.setProperty(k, vars[k]);
  }

  function initWidget(el) {
    if (el.dataset.hrInit) return;
    el.dataset.hrInit = '1';

    var shop      = el.dataset.shop;
    var locale    = el.dataset.locale || '';
    var productId = el.dataset.productId || '';
    var widgetKey = el.dataset.widgetKey || 'homepage_reviews';
    var layout    = el.dataset.layout || 'summary_carousel';
    var maxRev    = parseInt(el.dataset.max, 10) || 9;
    var seoEnabled = el.dataset.seoEnabled !== 'false';

    var loadingEl = el.querySelector('.hr-loading');
    var bodyEl    = el.querySelector('.hr-body');
    var headingEl = el.querySelector('.hr-heading');

    function injectHRSchema(avgRating, total) {
      if (!seoEnabled || !total) return;
      var sid = 'hr-ld-json-' + (el.dataset.blockId || shop);
      if (document.getElementById(sid)) return;
      var schema = {
        '@context': 'https://schema.org/', '@type': 'Organization',
        'name': shop || document.title,
        'aggregateRating': { '@type': 'AggregateRating', 'ratingValue': avgRating.toFixed(1), 'reviewCount': String(total), 'bestRating': '5', 'worstRating': '1' }
      };
      var sc = document.createElement('script'); sc.id = sid; sc.type = 'application/ld+json'; sc.textContent = JSON.stringify(schema); document.head.appendChild(sc);
    }

    // Fetch review data in parallel with the style settings instead of
    // waiting for settings to resolve first — the review fetch doesn't
    // depend on anything in the settings response.
    var reviewUrl = '/apps/review?shop=' + shop + (productId ? '&productId=' + productId : '') + '&widgetKey=homepage_reviews';
    Promise.all([
      fetch('/apps/review?shop=' + shop + '&type=widget-defaults&widgetKey=' + widgetKey + '&locale=' + encodeURIComponent(locale)).then(function (r) { return r.json(); }),
      fetch(reviewUrl).then(function (r) { return r.json(); }),
    ])
      .then(function (results) {
        var resp = results[0], data = results[1];
        var d = resp.settings || {};
        var t = resp.translations || {};
        // Field names map: API uses Widget model names, JS uses friendlier names
        var s = {
          accentColor:  d.accentColor      || D_ACCENT,
          starColor:    d.starColor        || D_ACCENT,
          panelBg:      d.summaryPosition   || D_PANEL_BG,
          panelText:    d.textAlign        || '#fff',
          pageBg:       d.backgroundColor || 'transparent',
          cardBg:       d.cardBackground  || '#fff',
          cardBorder:   d.borderColor     || '#e5e5e5',
          cardPadding:  d.cardPadding     != null ? d.cardPadding  : 20,
          cardRadius:   d.borderRadius    != null ? d.borderRadius : 8,
          showShadow:   d.showShadow      !== false,
          textColor:    d.textColor       || '#111',
          mutedColor:   '#444',
          fontFamily:   d.fontFamily      || 'inherit',
          headingSize:  d.headingSize     || 36,
          headingAlign: 'center',
          headingText:  (d.heading && d.heading !== 'Customer Reviews' && d.heading !== 'What our customers say') ? d.heading : (t.customerReviews || 'Customer Reviews'),
          nameSize:     14,
          reviewSize:   d.reviewSize      || 14,
          gap:          d.cardGap         != null ? d.cardGap      : 20,
          columns:      d.columns         || 3,
          maxRev:       d.maxReviews      || maxRev,
          paddingTop:   d.paddingTop      != null ? d.paddingTop   : 60,
          paddingBottom:d.paddingBottom   != null ? d.paddingBottom: 60,
          showVerified: d.showVerified    !== false,
          showMedia:    d.showAvatar      !== false,
          sectionRadius:d.borderRadius    != null ? d.borderRadius : 6,
          layout:       d.defaultStyle    || layout,
        };

        applyVars(el, s);
        if (headingEl && s.headingText) headingEl.textContent = s.headingText;

        if (loadingEl) loadingEl.style.display = 'none';
        var reviews = data.reviews || [];
        var avg = data.averageRating || 0;
        var total = data.total || reviews.length;

        if (!reviews.length) {
          bodyEl.textContent = t.noReviews || 'No reviews yet.';
          return;
        }

        var ly = s.layout;
        var content;
        if (ly === 'summary_carousel') content = buildSummaryCarousel(reviews, s, avg, total, t);
        else if (ly === 'grid')         content = buildGrid(reviews, s, t);
        else if (ly === 'masonry')      content = buildMasonry(reviews, s, t);
        else if (ly === 'spotlight')    content = buildSpotlight(reviews, s, avg, total, t);
        else if (ly === 'ticker')       content = buildTicker(reviews, s);
        else                            content = buildSummaryCarousel(reviews, s, avg, total, t);

        bodyEl.appendChild(content);
        injectHRSchema(avg, total);
      })
      .catch(function () {
        if (loadingEl) loadingEl.textContent = 'Could not load reviews.'; // t not available on error
      });
  }

  function run() {
    var els = document.querySelectorAll('.hr-widget');
    for (var i = 0; i < els.length; i++) initWidget(els[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
