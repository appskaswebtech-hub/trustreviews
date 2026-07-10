(function () {
  'use strict';

  document.querySelectorAll('.ct-widget').forEach(function (widget) {
    initCT(widget);
  });

  function initCT(widget) {
    var productId   = widget.dataset.productId  || '';
    var shop        = widget.dataset.shop        || '';
    var storeLocale = widget.dataset.locale      || (document.documentElement.lang || '').split('-')[0] || '';
    var headingEl   = widget.querySelector('.ct-heading');
    var loadingEl   = widget.querySelector('.ct-loading');
    var container   = widget.querySelector('.ct-container');

    if (!container) return;

    // Fallback: Shopify sets ShopifyAnalytics.meta.product.id on product pages
    if (!productId) {
      try {
        var _sa = window.ShopifyAnalytics;
        if (_sa && _sa.meta && _sa.meta.product) productId = String(_sa.meta.product.id || '');
      } catch (_e) {}
    }

    fetch('/apps/review?shop=' + encodeURIComponent(shop) +
          '&type=widget-defaults&widgetKey=custom_template' +
          '&locale=' + encodeURIComponent(storeLocale))
    .then(function (r) { return r.json(); })
    .then(function (resp) {
      var d = resp.settings || {};
      var t = resp.translations || {};
      var s = makeSettings(d);

      applyVars(widget, s);
      if (headingEl) { var _dH='What our customers say'; var _cH=(d.heading&&d.heading!==_dH&&d.heading!=='Customer Reviews')?d.heading:null; headingEl.textContent=_cH||(t.defaultHeading||_dH); }
      if (loadingEl) loadingEl.textContent = t.loading || 'Loading reviews…';

      return fetch('/apps/review?shop=' + encodeURIComponent(shop) +
                   '&productId=' + encodeURIComponent(productId) +
                   '&widgetKey=custom_template' +
                   '&locale=' + encodeURIComponent(storeLocale))
      .then(function (r) { return r.json(); })
      .then(function (apiData) {
        var rt=apiData.translations||{}; for(var k in rt) if(!t[k]) t[k]=rt[k];
        loadingEl.style.display = 'none';
        render(container, widget, apiData, s, t, productId, shop);
      });
    })
    .catch(function () {
      if (loadingEl) loadingEl.textContent = 'Could not load reviews.';
    });
  }

  /* ── Settings ── */
  function makeSettings(d) {
    return {
      style:             d.defaultStyle       || 'star_summary',
      accentColor:       d.accentColor        || '#6B1A2C',
      starColor:         d.starColor          || '#F59E0B',
      cardBg:            d.cardBackground     || '#ffffff',
      textColor:         d.textColor          || '#333333',
      borderColor:       d.borderColor        || '#e4e4e4',
      showVerified:      d.showVerified       !== false,
      showAvatar:        d.showAvatar         !== false,
      showDate:          d.showDate           !== false,
      maxRev:            d.maxReviews         || 6,
      columns:           d.columns            || 3,
      gap:               d.cardGap            || 20,
      radius:            d.borderRadius       || 12,
      showShadow:        d.showShadow         !== false,
      cardPadding:       d.cardPadding        || 18,
      showWriteBtn:      d.showWriteReviewBtn || false,
      fontFamily:        d.fontFamily         || 'inherit',
      headingSize:       d.headingSize        || 28,
    };
  }

  function applyVars(widget, s) {
    var st = widget.style;
    st.setProperty('--ct-accent',       s.accentColor);
    st.setProperty('--ct-star',         s.starColor);
    st.setProperty('--ct-card-bg',      s.cardBg);
    st.setProperty('--ct-text',         s.textColor);
    st.setProperty('--ct-border',       s.borderColor);
    st.setProperty('--ct-radius',       s.radius    + 'px');
    st.setProperty('--ct-gap',          s.gap       + 'px');
    st.setProperty('--ct-padding',      s.cardPadding + 'px');
    st.setProperty('--ct-font',         s.fontFamily);
    st.setProperty('--ct-heading-size', s.headingSize + 'px');
    st.setProperty('--ct-shadow',       s.showShadow ? '0 2px 12px rgba(0,0,0,.08)' : 'none');
  }

  /* ── Helpers ── */
  function stars(rating, color) {
    var h = '';
    for (var i = 1; i <= 5; i++) {
      h += '<span style="color:' + (i <= rating ? color : '#ddd') + '">&#9733;</span>';
    }
    return h;
  }

  function initials(name) {
    return (name || 'A').split(' ').map(function (w) { return w[0] || ''; }).join('').toUpperCase().slice(0, 2) || 'A';
  }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (e) { return ''; }
  }

  /* ── Card builder ── */
  function buildCard(r, s, t) {
    var card = document.createElement('div');
    card.className = 'ct-card';

    var avatarHTML   = s.showAvatar ? '<div class="ct-avatar" style="background:' + s.accentColor + '">' + initials(r.customer) + '</div>' : '';
    var verifiedHTML = (s.showVerified && r.isVerified) ? '<span class="ct-verified">&#10003; ' + (t.verified || 'Verified') + '</span>' : '';
    var dateHTML     = (s.showDate && r.createdAt) ? '<span class="ct-date">' + fmtDate(r.createdAt) + '</span>' : '';
    var titleHTML    = r.title ? '<div class="ct-title">' + r.title + '</div>' : '';
    var mediaHTML    = (r.mediaUrl && r.mediaType && r.mediaType.startsWith('image'))
      ? '<img class="ct-media" src="' + r.mediaUrl + '" alt="Review photo" loading="lazy">' : '';

    card.innerHTML =
      '<div class="ct-card-header">' + avatarHTML +
      '<div class="ct-card-meta">' +
        '<div class="ct-name-row"><span class="ct-name">' + (r.customer || 'Anonymous') + '</span>' + verifiedHTML + dateHTML + '</div>' +
        '<div class="ct-stars">' + stars(r.rating, s.starColor) + '</div>' +
      '</div></div>' +
      titleHTML +
      '<p class="ct-comment">' + (r.comment || '') + '</p>' +
      mediaHTML;

    return card;
  }

  /* ── Summary bar ── */
  function buildSummaryBar(reviews, s, t, total, avgRating, onWrite) {
    var bar = document.createElement('div');
    bar.className = 'ct-summary-bar';

    var barsHTML = '';
    for (var n = 5; n >= 1; n--) {
      var cnt = 0;
      for (var ri = 0; ri < reviews.length; ri++) if (reviews[ri].rating === n) cnt++;
      var pct = total ? Math.round(cnt / total * 100) : 0;
      barsHTML +=
        '<div class="ct-bar-row">' +
          '<span class="ct-bar-label">' + n + '</span>' +
          '<div class="ct-bar-track"><div class="ct-bar-fill" style="width:' + pct + '%;background:' + s.starColor + '"></div></div>' +
          '<span class="ct-bar-count">' + cnt + '</span>' +
        '</div>';
    }

    bar.innerHTML =
      '<div class="ct-score-block">' +
        '<div class="ct-score">' + avgRating.toFixed(1) + '</div>' +
        '<div class="ct-score-stars">' + stars(Math.round(avgRating), s.starColor) + '</div>' +
        '<div class="ct-score-total">' + total + ' ' + (total !== 1 ? (t.reviews || 'reviews') : (t.review || 'review')) + '</div>' +
      '</div>' +
      '<div class="ct-bars">' + barsHTML + '</div>';

    if (s.showWriteBtn) {
      var wb = document.createElement('button');
      wb.className = 'ct-write-btn';
      wb.style.background = s.accentColor;
      wb.textContent = t.writeReview || 'Write a Review';
      wb.addEventListener('click', onWrite);
      bar.appendChild(wb);
    }

    return bar;
  }

  /* ── Write-a-review modal ── */
  function buildWriteModal(s, t, productId, shop) {
    var overlay = document.createElement('div');
    overlay.className = 'ct-modal-overlay';

    var pickRating = 0;

    overlay.innerHTML =
      '<div class="ct-modal">' +
        '<button class="ct-modal-close" aria-label="' + (t.close || 'Close') + '">&times;</button>' +
        '<h3 class="ct-modal-title" style="color:' + s.accentColor + '">' + (t.writeReview || 'Write a Review') + '</h3>' +
        '<div class="ct-field"><label>'+(t.ratingQuestion||'Your Rating')+' <span style="color:red">*</span></label>' +
          '<div class="ct-stars-pick"><span data-v="1">&#9733;</span><span data-v="2">&#9733;</span><span data-v="3">&#9733;</span><span data-v="4">&#9733;</span><span data-v="5">&#9733;</span></div>' +
        '</div>' +
        '<div class="ct-field"><label>'+(t.reviewTitleLabel||'Review title')+'</label><input class="ct-inp" id="ct-inp-title" type="text" placeholder="'+(t.reviewTitlePlaceholder||'Summarize your experience...')+'"></div>' +
        '<div class="ct-field"><label>'+(t.feedbackLabel||'Your review')+' <span style="color:red">*</span></label><textarea class="ct-inp ct-ta" id="ct-inp-comment" placeholder="'+(t.feedbackPlaceholder||'Share your experience...')+'"></textarea></div>' +
        '<div class="ct-row2">' +
          '<div class="ct-field"><label>'+(t.nameLabel||'Your name')+' <span style="color:red">*</span></label><input class="ct-inp" id="ct-inp-name" type="text" placeholder="'+(t.namePlaceholder||'Name')+'"></div>' +
          '<div class="ct-field"><label>'+(t.emailLabel||'Email')+' <span style="color:red">*</span></label><input class="ct-inp" id="ct-inp-email" type="email" placeholder="'+(t.emailPlaceholder||'Email')+'"></div>' +
        '</div>' +
        '<div class="ct-field">' +
          '<label>' + (t.photoOptional || 'Photo (optional)') + '</label>' +
          '<label class="ct-file-label" id="ct-file-label"><span id="ct-file-text">' + (t.choosePhoto || 'Choose photo…') + '</span><input class="ct-file-inp" id="ct-inp-file" type="file" accept="image/*"></label>' +
          '<img class="ct-file-preview" id="ct-file-preview" alt="Preview">' +
        '</div>' +
        '<div class="ct-msg" id="ct-inp-msg" style="display:none"></div>' +
        '<div class="ct-modal-footer">' +
          '<button class="ct-cancel-btn" id="ct-inp-cancel">' + (t.cancel || 'Cancel') + '</button>' +
          '<button class="ct-submit-btn" id="ct-inp-submit" style="background:' + s.accentColor + '">' + (t.submitReview || 'Submit Review') + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var starSpans = overlay.querySelectorAll('.ct-stars-pick span');

    function paintStars(n) {
      starSpans.forEach(function (sp, i) { sp.style.color = i < n ? s.starColor : '#ddd'; });
    }

    starSpans.forEach(function (sp) {
      sp.addEventListener('mouseover', function () { paintStars(parseInt(sp.dataset.v)); });
      sp.addEventListener('mouseout',  function () { paintStars(pickRating); });
      sp.addEventListener('click',     function () { pickRating = parseInt(sp.dataset.v); paintStars(pickRating); });
    });

    /* File preview */
    var fileInput   = overlay.querySelector('#ct-inp-file');
    var filePreview = overlay.querySelector('#ct-file-preview');
    var fileText    = overlay.querySelector('#ct-file-text');
    fileInput.addEventListener('change', function () {
      var f = fileInput.files[0];
      if (f && f.type.startsWith('image/')) {
        fileText.textContent = f.name;
        var reader = new FileReader();
        reader.onload = function (e) { filePreview.src = e.target.result; filePreview.style.display = 'block'; };
        reader.readAsDataURL(f);
      } else {
        fileText.textContent = t.choosePhoto || 'Choose photo…';
        filePreview.src = ''; filePreview.style.display = 'none';
      }
    });

    function open()  { overlay.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
    function close() { overlay.style.display = 'none';  document.body.style.overflow = ''; }

    overlay.querySelector('.ct-modal-close').addEventListener('click', close);
    overlay.querySelector('#ct-inp-cancel').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    overlay.querySelector('#ct-inp-submit').addEventListener('click', function () {
      var name    = overlay.querySelector('#ct-inp-name').value.trim();
      var email   = overlay.querySelector('#ct-inp-email').value.trim();
      var comment = overlay.querySelector('#ct-inp-comment').value.trim();
      var title   = overlay.querySelector('#ct-inp-title').value.trim();
      var msg     = overlay.querySelector('#ct-inp-msg');
      var btn     = overlay.querySelector('#ct-inp-submit');

      if (!name || !email || !comment || pickRating === 0) {
        msg.textContent = t.submitRequired || 'Please fill in all required fields and select a star rating.';
        msg.style.cssText = 'display:block;background:#fee2e2;color:#991b1b';
        return;
      }

      btn.disabled = true;

      function submitReview(mediaUrl, mediaType, fileName) {
        btn.textContent = t.submitting || 'Submitting…';
        fetch('/apps/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, productId: productId, rating: pickRating, comment: comment, title: title, customer: name, shop: shop, mediaUrl: mediaUrl || null, mediaType: mediaType || null, fileName: fileName || null })
        })
        .then(function (r) { return r.json(); })
        .then(function (json) {
          if (json.success === false) throw new Error(json.error || 'Submission failed');
          msg.textContent = t.submitSuccess || 'Thank you! Your review has been submitted for approval.';
          msg.style.cssText = 'display:block;background:#dcfce7;color:#166534';
          btn.disabled = false; btn.textContent = t.submitReview || 'Submit Review';
          setTimeout(close, 2500);
        })
        .catch(function (err) {
          msg.textContent = err.message || 'Something went wrong.';
          msg.style.cssText = 'display:block;background:#fee2e2;color:#991b1b';
          btn.disabled = false; btn.textContent = t.submitReview || 'Submit Review';
        });
      }

      var file = fileInput.files[0];
      if (file) {
        btn.textContent = t.uploadingPhoto || 'Uploading photo…';
        var fd = new FormData();
        fd.append('file', file);
        fetch('/apps/review?shop=' + encodeURIComponent(shop) + '&type=upload-file', { method: 'POST', body: fd })
        .then(function (r) { return r.json(); })
        .then(function (up) {
          submitReview(up.url || null, up.mediaType || null, up.fileName || null);
        })
        .catch(function () { submitReview(null, null, null); });
      } else {
        submitReview(null, null, null);
      }
    });

    return open;
  }

  /* ── Compact rows layout ── */
  function buildCompactLayout(container, reviews, s, t) {
    var activeFilter = 0;
    var sortMode = 'newest';
    var page = 1;
    var PER_PAGE = s.maxRev || 8;

    var filterBar = document.createElement('div');
    filterBar.className = 'ct-filter-bar';

    var chipsDiv = document.createElement('div');
    chipsDiv.className = 'ct-filter-chips';

    var sortDiv = document.createElement('div');
    sortDiv.className = 'ct-sort-right';
    var sortSel = document.createElement('select');
    sortSel.className = 'ct-sort-sel';
    [['newest', t.sortNewest || 'Newest First'], ['highest', t.sortHighest || 'Highest Rated'], ['lowest', t.sortLowest || 'Lowest Rated']].forEach(function (o) {
      var opt = document.createElement('option'); opt.value = o[0]; opt.textContent = o[1]; sortSel.appendChild(opt);
    });
    sortDiv.appendChild(sortSel);

    var chipLabels = [t.filterAll || 'All', '5★', '4★', '3★', '2★', '1★'];
    var chipEls = chipLabels.map(function (label, i) {
      var chip = document.createElement('button');
      chip.className = 'ct-filter-chip' + (i === 0 ? ' ct-active' : '');
      chip.textContent = label;
      if (i === 0) { chip.style.background = s.accentColor; chip.style.color = '#fff'; chip.style.borderColor = s.accentColor; }
      chipsDiv.appendChild(chip);
      return chip;
    });

    filterBar.appendChild(chipsDiv);
    filterBar.appendChild(sortDiv);
    container.appendChild(filterBar);

    var listEl = document.createElement('div');
    listEl.className = 'ct-compact-rows';
    container.appendChild(listEl);

    var loadBtn = document.createElement('button');
    loadBtn.className = 'ct-load-more-btn';
    loadBtn.textContent = t.loadMore || 'Load More Reviews';
    loadBtn.style.background = s.accentColor;
    container.appendChild(loadBtn);

    function getFiltered() {
      var filtered = reviews.slice();
      if (activeFilter > 0) {
        var star = 6 - activeFilter;
        filtered = filtered.filter(function (r) { return r.rating === star; });
      }
      if (sortMode === 'highest') filtered.sort(function (a, b) { return b.rating - a.rating; });
      else if (sortMode === 'lowest') filtered.sort(function (a, b) { return a.rating - b.rating; });
      else filtered.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      return filtered;
    }

    function renderRows() {
      var filtered = getFiltered();
      var visible = filtered.slice(0, page * PER_PAGE);
      listEl.innerHTML = '';
      visible.forEach(function (r) {
        var row = document.createElement('div');
        row.className = 'ct-compact-row';
        var verifiedHTML = (s.showVerified && r.isVerified) ? '<span class="ct-verified ct-compact-ver">&#10003; ' + (t.verified || 'Verified') + '</span>' : '';
        var dateHTML = (s.showDate && r.createdAt) ? '<span class="ct-compact-date">' + fmtDate(r.createdAt) + '</span>' : '';
        var text = r.title ? (r.title + (r.comment ? ' — ' + r.comment : '')) : (r.comment || '');
        row.innerHTML =
          '<span class="ct-compact-stars">' + stars(r.rating, s.starColor) + '</span>' +
          verifiedHTML +
          '<span class="ct-compact-text">' + text + '</span>' +
          '<span class="ct-compact-name">' + (r.customer || 'Anonymous') + '</span>' +
          dateHTML;
        listEl.appendChild(row);
      });
      loadBtn.style.display = visible.length < filtered.length ? 'block' : 'none';
    }

    chipEls.forEach(function (chip, i) {
      chip.addEventListener('click', function () {
        activeFilter = i;
        page = 1;
        chipEls.forEach(function (c, ci) {
          c.classList.toggle('ct-active', ci === i);
          c.style.background = ci === i ? s.accentColor : '';
          c.style.color = ci === i ? '#fff' : '';
          c.style.borderColor = ci === i ? s.accentColor : '';
        });
        renderRows();
      });
    });

    sortSel.addEventListener('change', function () { sortMode = sortSel.value; page = 1; renderRows(); });
    loadBtn.addEventListener('click', function () { page++; renderRows(); });

    renderRows();
  }

  /* ── Main render ── */
  function render(container, widget, apiData, s, t, productId, shop) {
    var reviews   = apiData.reviews || [];
    var total     = apiData.total   || reviews.length;
    var avgRating = apiData.averageRating || 0;

    if (!reviews.length) {
      container.innerHTML = '<p class="ct-empty">' + (t.noReviews || 'No reviews yet.') + '</p>';
      return;
    }

    var openWrite = buildWriteModal(s, t, productId, shop);

    if (s.style === 'compact_rows') {
      container.appendChild(buildSummaryBar(reviews, s, t, total, avgRating, openWrite));
      buildCompactLayout(container, reviews, s, t);
      return;
    }

    /* Summary bar for all other layouts */
    container.appendChild(buildSummaryBar(reviews, s, t, total, avgRating, openWrite));

    /* Layout container */
    var layout = document.createElement('div');

    if (s.style === 'masonry_wall') {
      layout.className = 'ct-masonry';
      layout.style.columnCount = s.columns;
      layout.style.columnGap   = s.gap + 'px';

    } else if (s.style === 'slider') {
      layout.className = 'ct-slider';

    } else {
      /* grid / list / list_view / star_summary / summary_side — all use the CSS grid */
      layout.className = 'ct-grid';
      var cols = (s.style === 'list_view' || s.style === 'summary_side') ? 1 : s.columns;
      layout.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
      layout.style.gap = s.gap + 'px';
    }

    var shownCount = s.maxRev;
    reviews.slice(0, shownCount).forEach(function (r) {
      layout.appendChild(buildCard(r, s, t));
    });

    container.appendChild(layout);

    /* Load More for grid / masonry */
    if (s.style !== 'slider' && reviews.length > shownCount) {
      var lmBtn = document.createElement('button');
      lmBtn.className = 'ct-load-more-btn';
      lmBtn.textContent = t.loadMore || 'Load More Reviews';
      lmBtn.style.background = s.accentColor;
      lmBtn.addEventListener('click', function () {
        reviews.slice(shownCount, shownCount + s.maxRev).forEach(function (r) {
          layout.appendChild(buildCard(r, s, t));
        });
        shownCount += s.maxRev;
        if (shownCount >= reviews.length) lmBtn.style.display = 'none';
      });
      container.appendChild(lmBtn);
    }

    /* Slider dots */
    if (s.style === 'slider') {
      var dots = document.createElement('div');
      dots.className = 'ct-slider-dots';
      var dotCnt = Math.min(reviews.length, 6);
      for (var i = 0; i < dotCnt; i++) {
        var dot = document.createElement('div');
        dot.className = 'ct-slider-dot' + (i === 0 ? ' ct-active' : '');
        dots.appendChild(dot);
      }
      container.appendChild(dots);

      /* Basic scroll → active dot sync */
      var scrollTimer;
      layout.addEventListener('scroll', function () {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function () {
          var idx = Math.round(layout.scrollLeft / (layout.clientWidth || 1));
          dots.querySelectorAll('.ct-slider-dot').forEach(function (d, i) {
            d.classList.toggle('ct-active', i === idx);
          });
        }, 80);
      });
    }
  }

})();
