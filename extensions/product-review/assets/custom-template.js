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

    if (!productId) {
      try {
        var _sa = window.ShopifyAnalytics;
        if (_sa && _sa.meta && _sa.meta.product) productId = String(_sa.meta.product.id || '');
      } catch (_e) {}
    }

    // Both requests are independent — fire them in parallel instead of
    // chaining, which was roughly doubling the network wait before render.
    Promise.all([
      fetch('/apps/review?shop=' + encodeURIComponent(shop) +
            '&type=widget-defaults&widgetKey=custom_template' +
            '&locale=' + encodeURIComponent(storeLocale))
        .then(function (r) { return r.json(); }),
      fetch('/apps/review?shop=' + encodeURIComponent(shop) +
            '&productId=' + encodeURIComponent(productId) +
            '&widgetKey=custom_template' +
            '&locale=' + encodeURIComponent(storeLocale))
        .then(function (r) { return r.json(); }),
    ])
    .then(function (results) {
      var resp = results[0], apiData = results[1];
      var d      = resp.settings     || {};
      var t      = resp.translations || {};
      var blocks = resp.blocks;      // null for legacy, array for page builder
      var s      = makeSettings(d);

      applyVars(widget, s);
      // Hide the static heading element — block-based mode renders its own
      if (headingEl) {
        if (Array.isArray(blocks) && blocks.length) {
          headingEl.style.display = 'none';
        } else {
          var _dH = 'What our customers say';
          var _cH = (d.heading && d.heading !== _dH && d.heading !== 'Customer Reviews') ? d.heading : null;
          headingEl.textContent = _cH || (t.defaultHeading || _dH);
        }
      }

      var rt = apiData.translations || {};
      for (var k in rt) if (!t[k]) t[k] = rt[k];
      loadingEl.style.display = 'none';

      if (Array.isArray(blocks) && blocks.length) {
        var openWrite = buildWriteModal(s, t, productId, shop);
        renderBlockBased(container, widget, blocks, apiData, t, productId, shop, openWrite);
      } else {
        render(container, widget, apiData, s, t, productId, shop);
      }
    })
    .catch(function () {
      if (loadingEl) loadingEl.textContent = 'Could not load reviews.';
    });
  }

  /* ══════════════════════════════════════════════════════════════
     BLOCK-BASED RENDERER
     Renders each block from the admin page builder independently.
  ══════════════════════════════════════════════════════════════ */
  function renderBlockBased(container, widget, blocksDef, apiData, t, productId, shop, openWrite) {
    var reviews   = apiData.reviews || [];
    var total     = Number(apiData.total || reviews.length);
    var avgRating = Number(apiData.averageRating || 0);

    // Compute star counts once
    var starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(function (r) { if (starCounts[r.rating] !== undefined) starCounts[r.rating]++; });

    // Reactive shared state
    var filterStar = 0;
    var sortMode   = 'newest';
    var searchQ    = '';
    var curPage    = 1;
    var listGridEl = null;
    var loadMoreBtn = null;
    var rlSettings = null; // set when review_list block is processed

    function getFiltered() {
      var arr = reviews.filter(function (r) {
        if (filterStar > 0 && r.rating !== filterStar) return false;
        if (!searchQ) return true;
        return (r.customer || '').toLowerCase().indexOf(searchQ) >= 0 ||
               (r.comment  || '').toLowerCase().indexOf(searchQ) >= 0 ||
               (r.title    || '').toLowerCase().indexOf(searchQ) >= 0;
      });
      if (sortMode === 'highest') arr.sort(function (a, b) { return b.rating - a.rating; });
      else if (sortMode === 'lowest') arr.sort(function (a, b) { return a.rating - b.rating; });
      else arr.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      return arr;
    }

    function rerenderList() {
      if (!listGridEl || !rlSettings) return;
      var perPage  = rlSettings.perPage || 9;
      var filtered = getFiltered();
      var visible  = filtered.slice(0, curPage * perPage);

      listGridEl.innerHTML = '';
      if (!visible.length) {
        var emp = document.createElement('p');
        emp.style.cssText = 'color:#6b7280;text-align:center;padding:32px 0;grid-column:1/-1';
        emp.textContent = t.noReviews || 'No reviews yet.';
        listGridEl.appendChild(emp);
      } else {
        visible.forEach(function (r) { listGridEl.appendChild(buildCTCard(r, rlSettings, t)); });
      }
      if (loadMoreBtn) {
        loadMoreBtn.style.display = (curPage * perPage < filtered.length) ? 'block' : 'none';
      }
    }

    blocksDef.forEach(function (block) {
      var st = block.settings || {};
      var el = null;

      switch (block.type) {
        // ── Layout blocks ──────────────────────────────────────────
        case 'heading': {
          el = document.createElement(st.level || 'h2');
          el.textContent = st.text || (t.defaultHeading || 'Customer Reviews');
          el.style.cssText =
            'font-size:' + (st.fontSize || 28) + 'px;' +
            'font-weight:' + (st.fontWeight || '800') + ';' +
            'color:' + (st.color || '#1a1a1a') + ';' +
            'text-align:' + (st.textAlign || 'left') + ';' +
            'font-family:' + (st.fontFamily || 'inherit') + ';' +
            'line-height:' + (st.lineHeight || 1.2) + ';' +
            'letter-spacing:' + (st.letterSpacing || 0) + 'px;' +
            'text-transform:' + (st.textTransform || 'none') + ';' +
            'margin:0 0 ' + (st.marginB != null ? st.marginB : 16) + 'px';
          break;
        }

        case 'paragraph': {
          el = document.createElement('p');
          el.textContent = st.text || '';
          el.style.cssText =
            'font-size:' + (st.fontSize || 16) + 'px;' +
            'color:' + (st.color || '#333333') + ';' +
            'line-height:' + (st.lineHeight || 1.6) + ';' +
            'text-align:' + (st.textAlign || 'left') + ';' +
            'margin:0 0 ' + (st.marginB != null ? st.marginB : 16) + 'px';
          break;
        }

        case 'divider': {
          el = document.createElement('div');
          if (st.type === 'space') {
            el.style.height = (st.height || 24) + 'px';
          } else {
            el.style.cssText = 'border:none;border-top:' + (st.height || 1) + 'px solid ' + (st.lineColor || '#e4e4e4') + ';margin:' + (st.marginT || 16) + 'px 0 ' + (st.marginB || 16) + 'px';
          }
          break;
        }

        case 'spacer': {
          el = document.createElement('div');
          el.style.height = (st.size || 32) + 'px';
          break;
        }

        case 'two_col':
        case 'three_col': {
          var colCount = block.type === 'three_col' ? 3 : 2;
          el = document.createElement('div');
          el.style.cssText =
            'display:grid;grid-template-columns:' + (st.colTemplate || ('1fr '.repeat(colCount).trim())) + ';' +
            'gap:' + (st.gap || 20) + 'px;align-items:' + (st.alignItems || 'start') + ';' +
            'margin-bottom:' + (st.marginB != null ? st.marginB : 24) + 'px';
          var cols = Array.isArray(block.columns) ? block.columns : Array.from({ length: colCount }, function () { return []; });
          cols.forEach(function (col) {
            var colEl = document.createElement('div');
            col.forEach(function (childBlock) {
              var childEl = renderSingleBlock(childBlock, starCounts, reviews, total, avgRating, t, rlSettings, openWrite);
              if (childEl) colEl.appendChild(childEl);
            });
            el.appendChild(colEl);
          });
          break;
        }

        // ── Review data blocks ─────────────────────────────────────
        case 'summary': {
          el = buildSummaryBlock(total, avgRating, st, t);
          break;
        }

        case 'progress_bars': {
          el = buildProgressBarsBlock(reviews, total, st, t);
          break;
        }

        case 'stats_row': {
          el = buildStatsRowBlock(total, avgRating, starCounts, st, t);
          break;
        }

        case 'filter': {
          el = buildFilterBlock(st, t, starCounts, function (star, filterEls) {
            filterStar = star;
            curPage = 1;
            // Update active chip styling
            filterEls.forEach(function (chip, i) {
              var isActive = (i === 0 && star === 0) || (i > 0 && star === 6 - i);
              chip.style.background  = isActive ? (st.accentColor || '#6B1A2C') : '#fff';
              chip.style.color       = isActive ? '#fff' : '#374151';
              chip.style.borderColor = isActive ? (st.accentColor || '#6B1A2C') : '#e4e4e4';
            });
            rerenderList();
          });
          break;
        }

        case 'sort': {
          el = buildSortBlock(st, t, function (mode) {
            sortMode = mode;
            curPage = 1;
            rerenderList();
          });
          break;
        }

        case 'search': {
          el = buildSearchBlock(st, t, function (q) {
            searchQ = q.toLowerCase();
            curPage = 1;
            rerenderList();
          });
          break;
        }

        case 'review_list': {
          rlSettings = {
            accentColor: st.accentColor || '#6B1A2C',
            starColor:   st.accentColor || '#F59E0B',
            cardBg:      st.cardBg      || '#ffffff',
            textColor:   st.textColor   || '#333333',
            borderColor: st.cardBorder  || '#e4e4e4',
            showVerified: st.showVerified !== false,
            showAvatar:   st.showAvatar  !== false,
            showDate:     st.showDate    !== false,
            showMedia:    st.showMedia   !== false,
            maxRev:       st.perPage     || 9,
            perPage:      st.perPage     || 9,
            columns:      st.columns     || 3,
            gap:          st.gap         || 16,
            radius:       st.cardRadius  || 12,
            showShadow:   (st.cardShadow || 'soft') !== 'none',
            cardPadding:  st.cardPadding || 18,
            layout:       st.layout      || 'grid',
          };

          var wrap = document.createElement('div');
          var grid = document.createElement('div');
          listGridEl = grid;

          if (st.layout === 'list') {
            grid.style.cssText = 'display:flex;flex-direction:column;gap:' + (st.gap || 16) + 'px';
          } else if (st.layout === 'masonry') {
            grid.style.cssText = 'column-count:' + (st.columns || 3) + ';column-gap:' + (st.gap || 16) + 'px';
          } else {
            grid.style.cssText =
              'display:grid;grid-template-columns:repeat(' + (st.columns || 3) + ',1fr);' +
              'gap:' + (st.gap || 16) + 'px';
          }

          rerenderList();
          wrap.appendChild(grid);

          // Load More button
          loadMoreBtn = document.createElement('button');
          loadMoreBtn.textContent = t.loadMore || 'Load More Reviews';
          loadMoreBtn.style.cssText =
            'display:none;margin:' + (st.gap || 16) + 'px auto 0;padding:10px 28px;' +
            'border-radius:8px;border:none;background:' + (st.accentColor || '#6B1A2C') + ';' +
            'color:#fff;font-size:14px;font-weight:600;cursor:pointer';
          loadMoreBtn.addEventListener('click', function () {
            curPage++;
            rerenderList();
          });

          var initFiltered = getFiltered();
          if (initFiltered.length > (st.perPage || 9)) {
            loadMoreBtn.style.display = 'block';
          }

          wrap.appendChild(loadMoreBtn);
          el = wrap;
          break;
        }

        case 'slider': {
          el = buildSliderBlock(reviews, st, t);
          break;
        }

        case 'testimonial': {
          el = buildTestimonialBlock(reviews, st, t);
          break;
        }

        case 'photo_grid': {
          el = buildPhotoGridBlock(reviews, st, t);
          break;
        }

        // ── Action blocks ──────────────────────────────────────────
        case 'write_review': {
          el = buildWriteBtn(st, t, openWrite);
          break;
        }

        case 'button_group': {
          el = buildButtonGroupBlock(st, t, openWrite);
          break;
        }

        case 'trust_badge': {
          el = buildTrustBadgeBlock(total, avgRating, st, t);
          break;
        }

        default:
          break;
      }

      if (el) {
        var mb = (block.type === 'two_col' || block.type === 'three_col') ? 0 : (st.marginB != null ? st.marginB : 24);
        if (!el.style.marginBottom || el.style.marginBottom === '0px') el.style.marginBottom = mb + 'px';
        container.appendChild(el);
      }
    });
  }

  /* Render a single block (used for column children) */
  function renderSingleBlock(block, starCounts, reviews, total, avgRating, t, rlSettings, openWrite) {
    var st = block.settings || {};
    switch (block.type) {
      case 'heading': {
        var el = document.createElement(st.level || 'h2');
        el.textContent = st.text || '';
        el.style.cssText = 'font-size:' + (st.fontSize || 22) + 'px;font-weight:' + (st.fontWeight || '700') + ';color:' + (st.color || '#1a1a1a') + ';margin:0 0 8px';
        return el;
      }
      case 'paragraph': {
        var p = document.createElement('p');
        p.textContent = st.text || '';
        p.style.cssText = 'font-size:' + (st.fontSize || 15) + 'px;color:' + (st.color || '#333') + ';line-height:1.6;margin:0 0 8px';
        return p;
      }
      case 'summary':   return buildSummaryBlock(total, avgRating, st, t);
      case 'progress_bars': return buildProgressBarsBlock(reviews, total, st, t);
      case 'stats_row': return buildStatsRowBlock(total, avgRating, starCounts, st, t);
      case 'trust_badge': return buildTrustBadgeBlock(total, avgRating, st, t);
      case 'write_review': return buildWriteBtn(st, t, openWrite);
      default: return null;
    }
  }

  /* ── Block builders ───────────────────────────────────────────── */

  function buildSummaryBlock(total, avgRating, st, t) {
    var el = document.createElement('div');
    el.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap';

    var scoreEl = document.createElement('div');
    scoreEl.style.cssText = 'font-size:' + (st.style === 'large' ? 56 : 40) + 'px;font-weight:900;color:' + (st.accentColor || '#6B1A2C') + ';line-height:1';
    scoreEl.textContent = avgRating.toFixed(1);

    var rightEl = document.createElement('div');
    var starsEl = document.createElement('div');
    starsEl.innerHTML = starsHtml(Math.round(avgRating), st.accentColor || '#F59E0B', st.style === 'large' ? 22 : 16);

    rightEl.appendChild(starsEl);
    if (st.showTotal !== false) {
      var countEl = document.createElement('div');
      countEl.style.cssText = 'font-size:13px;color:#6b7280;margin-top:2px';
      countEl.textContent = total + ' ' + (t.reviews || 'reviews');
      rightEl.appendChild(countEl);
    }

    el.appendChild(scoreEl);
    el.appendChild(rightEl);
    return el;
  }

  function buildProgressBarsBlock(reviews, total, st, t) {
    var el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;gap:6px';
    for (var n = 5; n >= 1; n--) {
      var cnt = 0;
      reviews.forEach(function (r) { if (r.rating === n) cnt++; });
      var pct = total ? Math.round(cnt / total * 100) : 0;
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:13px';
      row.innerHTML =
        '<span style="width:20px;text-align:right;color:#374151">' + n + '</span>' +
        '<span style="color:' + (st.accentColor || '#F59E0B') + ';font-size:12px">★</span>' +
        '<div style="flex:1;height:' + (st.barHeight || 8) + 'px;background:' + (st.trackColor || '#e4e4e4') + ';border-radius:' + (st.barRadius || 4) + 'px;overflow:hidden">' +
          '<div style="width:' + pct + '%;height:100%;background:' + (st.accentColor || '#6B1A2C') + ';border-radius:' + (st.barRadius || 4) + 'px"></div>' +
        '</div>' +
        (st.showCount !== false ? '<span style="width:22px;color:#6b7280">' + cnt + '</span>' : '') +
        (st.showPercent ? '<span style="width:30px;color:#6b7280">' + pct + '%</span>' : '');
      el.appendChild(row);
    }
    return el;
  }

  function buildStatsRowBlock(total, avgRating, starCounts, st, t) {
    var el = document.createElement('div');
    var isGrid = st.layout === 'grid';
    el.style.cssText = isGrid
      ? 'display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:12px'
      : 'display:flex;gap:12px;flex-wrap:wrap';
    var items = [];
    var fivePct = total ? Math.round((starCounts[5] || 0) / total * 100) : 0;
    if (st.showTotal !== false) items.push({ val: total, label: t.reviews || 'reviews' });
    if (st.showAvg   !== false) items.push({ val: avgRating.toFixed(1), label: t.average || 'avg rating' });
    if (st.showFiveStar !== false) items.push({ val: fivePct + '%', label: '5 ' + (t.reviews || 'reviews') });
    items.forEach(function (item) {
      var card = document.createElement('div');
      card.style.cssText = 'background:' + (st.statBg || '#f9fafb') + ';border-radius:' + (st.statRadius || 12) + 'px;padding:12px 14px;text-align:center;flex:1;min-width:80px';
      card.innerHTML = '<div style="font-size:22px;font-weight:800;color:' + (st.accentColor || '#6B1A2C') + '">' + item.val + '</div>' +
                       '<div style="font-size:11px;color:#6b7280;margin-top:2px">' + item.label + '</div>';
      el.appendChild(card);
    });
    return el;
  }

  function buildFilterBlock(st, t, starCounts, onChange) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    var chipEls = [];
    var accent  = st.accentColor || '#6B1A2C';
    var isUnder = st.style === 'underline';
    var radius  = st.style === 'pill' ? '20px' : (st.style === 'square' ? '4px' : '8px');

    function chipStyle(active) {
      if (isUnder) {
        return 'padding:6px 12px;background:none;border:none;border-bottom:2.5px solid ' +
               (active ? accent : 'transparent') + ';color:' + (active ? accent : '#374151') +
               ';font-size:13px;font-weight:' + (active ? '700' : '500') + ';cursor:pointer';
      }
      return 'padding:6px 14px;border-radius:' + radius + ';border:1.5px solid ' +
             (active ? accent : '#e4e4e4') + ';background:' + (active ? accent : '#fff') +
             ';color:' + (active ? '#fff' : '#374151') + ';font-size:13px;font-weight:600;cursor:pointer;transition:all .15s';
    }

    var labels = [[0, t.filterAll || 'All'], [5, '5★'], [4, '4★'], [3, '3★'], [2, '2★'], [1, '1★']];
    labels.forEach(function (pair, i) {
      var star  = pair[0];
      var label = pair[1];
      var chip  = document.createElement('button');
      var count = star === 0 ? null : (starCounts[star] || 0);
      chip.textContent = label + (st.showCounts !== false && count !== null ? ' (' + count + ')' : '');
      chip.style.cssText = chipStyle(i === 0);
      chip.addEventListener('click', function () { onChange(star, chipEls); });
      chipEls.push(chip);
      wrap.appendChild(chip);
    });
    return wrap;
  }

  function buildSortBlock(st, t, onChange) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:8px';
    var label = document.createElement('span');
    label.textContent = t.sort || 'Sort';
    label.style.cssText = 'font-size:13px;color:#6b7280;font-weight:500';

    var sel = document.createElement('select');
    sel.style.cssText = 'padding:6px 10px;border:1.5px solid #e4e4e4;border-radius:8px;font-size:13px;cursor:pointer;background:#fff;color:#374151;outline:none';
    var opts = [
      [t.sortNewest  || 'Newest First',    'newest'],
      [t.sortHighest || 'Highest Rated',   'highest'],
      [t.sortLowest  || 'Lowest Rated',    'lowest'],
    ];
    opts.forEach(function (o) {
      var opt = document.createElement('option');
      opt.textContent = o[0]; opt.value = o[1];
      if (o[1] === (st.defaultSort || 'newest')) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () { onChange(sel.value); });

    if (st.style === 'tabs') {
      var tabWrap = document.createElement('div');
      tabWrap.style.cssText = 'display:flex;gap:4px;border:1.5px solid #e4e4e4;border-radius:8px;overflow:hidden;background:#f9fafb';
      var activeSort = st.defaultSort || 'newest';
      var tabEls = [];
      opts.forEach(function (o) {
        var btn = document.createElement('button');
        btn.textContent = o[0]; btn.dataset.v = o[1];
        btn.style.cssText = 'padding:6px 12px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:' +
          (o[1] === activeSort ? '#fff' : 'transparent') + ';color:' + (o[1] === activeSort ? '#1a1a1a' : '#6b7280');
        btn.addEventListener('click', function () {
          activeSort = o[1];
          tabEls.forEach(function (tb) {
            tb.style.background = tb.dataset.v === activeSort ? '#fff' : 'transparent';
            tb.style.color      = tb.dataset.v === activeSort ? '#1a1a1a' : '#6b7280';
          });
          onChange(o[1]);
        });
        tabEls.push(btn);
        tabWrap.appendChild(btn);
      });
      return tabWrap;
    }

    wrap.appendChild(label);
    wrap.appendChild(sel);
    return wrap;
  }

  function buildSearchBlock(st, t, onChange) {
    var wrap = document.createElement('div');
    var bRadius = st.shape === 'pill' ? '24px' : (st.shape === 'square' ? '4px' : '8px');
    wrap.style.cssText = 'display:flex;align-items:center;border:1.5px solid #e4e4e4;border-radius:' + bRadius + ';overflow:hidden;background:#fff';
    wrap.innerHTML = '<span style="padding:0 10px;color:#9ca3af;font-size:16px">🔍</span>';
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = st.placeholder || (t.searchPlaceholder || 'Search reviews…');
    inp.style.cssText = 'flex:1;padding:10px 10px 10px 0;border:none;outline:none;font-size:14px;background:transparent';
    inp.addEventListener('input', function () { onChange(inp.value.trim()); });
    wrap.appendChild(inp);
    return wrap;
  }

  function buildSliderBlock(reviews, st, t) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;overflow:hidden';
    var track = document.createElement('div');
    track.style.cssText = 'display:flex;gap:' + (st.gap || 20) + 'px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:4px 0 8px';
    track.style.msOverflowStyle = 'none';

    var accent = st.accentColor || '#6B1A2C';
    reviews.slice(0, 12).forEach(function (r) {
      var card = document.createElement('div');
      card.style.cssText = 'min-width:' + (st.cardWidth || 300) + 'px;max-width:' + (st.cardWidth || 300) + 'px;background:' + (st.cardBg || '#fff') + ';border-radius:' + (st.cardRadius || 14) + 'px;padding:18px;box-shadow:0 2px 10px rgba(0,0,0,.08);scroll-snap-align:start;flex-shrink:0';
      card.innerHTML =
        '<div style="display:flex;gap:2px;margin-bottom:10px">' + starsHtml(r.rating, accent, 15) + '</div>' +
        '<p style="font-size:14px;color:#374151;line-height:1.5;margin:0 0 12px">' + escapeHTML(r.comment || '') + '</p>' +
        '<div style="font-size:12px;font-weight:700;color:#1a1a1a">' + escapeHTML(r.customer || '') + '</div>';
      track.appendChild(card);
    });

    wrap.appendChild(track);
    return wrap;
  }

  function buildTestimonialBlock(reviews, st, t) {
    var r = reviews[0];
    if (!r) return null;
    var el = document.createElement('div');
    var accent = st.accentColor || '#6B1A2C';
    el.style.cssText = 'background:' + (st.cardBg || '#f9fafb') + ';border-radius:16px;padding:28px 32px;position:relative';
    var quote = st.showQuote !== false ? '<div style="font-size:' + (st.quoteSize || 48) + 'px;color:' + accent + ';opacity:.25;line-height:.8;margin-bottom:8px">&ldquo;</div>' : '';
    el.innerHTML =
      quote +
      '<p style="font-size:18px;color:' + (st.textColor || '#1a1a1a') + ';line-height:1.6;margin:0 0 18px;font-style:italic">' + escapeHTML(r.comment || '') + '</p>' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="width:40px;height:40px;border-radius:50%;background:' + accent + ';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px">' + escapeHTML((r.customer||'A').trim().split(' ').map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2)) + '</div>' +
        '<div><div style="font-weight:700;font-size:14px;color:#1a1a1a">' + escapeHTML(r.customer || '') + '</div>' +
        '<div style="display:flex;gap:2px;margin-top:2px">' + starsHtml(r.rating, accent, 12) + '</div></div>' +
      '</div>';
    return el;
  }

  function buildPhotoGridBlock(reviews, st, t) {
    var photos = reviews.filter(function (r) { return r.mediaUrl && r.mediaType && r.mediaType.startsWith('image'); });
    if (!photos.length) return null;
    var el = document.createElement('div');
    el.style.cssText = 'display:grid;grid-template-columns:repeat(' + (st.columns || 4) + ',1fr);gap:' + (st.gap || 8) + 'px';
    photos.slice(0, (st.columns || 4) * 3).forEach(function (r) {
      var item = document.createElement('div');
      item.style.cssText = 'position:relative;border-radius:' + (st.radius || 8) + 'px;overflow:hidden;aspect-ratio:' + (st.aspectRatio || '1/1');
      var img = document.createElement('img');
      img.src = r.mediaUrl; img.alt = 'Review photo'; img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover';
      item.appendChild(img);
      if (st.overlay !== false) {
        item.style.cursor = 'pointer';
        item.addEventListener('mouseenter', function () { item.style.opacity = '.85'; });
        item.addEventListener('mouseleave', function () { item.style.opacity = '1'; });
      }
      el.appendChild(item);
    });
    return el;
  }

  function buildWriteBtn(st, t, openWrite) {
    var wrap = document.createElement('div');
    wrap.style.textAlign = st.align || 'left';
    var btn = document.createElement('button');
    btn.textContent = st.text || (t.writeReview || 'Write a Review');
    var sizes = { small: '8px 18px', medium: '11px 26px', large: '14px 36px' };
    var fz    = { small: 12, medium: 14, large: 16 };
    btn.style.cssText =
      'padding:' + (sizes[st.size || 'medium'] || '11px 26px') + ';' +
      'border-radius:' + (st.radius || 8) + 'px;' +
      'font-size:' + (fz[st.size || 'medium'] || 14) + 'px;font-weight:700;cursor:pointer;' +
      (st.fullWidth ? 'width:100%;' : '') +
      (st.outline
        ? 'background:transparent;color:' + (st.bg || '#6B1A2C') + ';border:2px solid ' + (st.bg || '#6B1A2C')
        : 'background:' + (st.bg || '#6B1A2C') + ';color:' + (st.color || '#fff') + ';border:none');
    btn.addEventListener('click', openWrite);
    wrap.appendChild(btn);
    return wrap;
  }

  function buildButtonGroupBlock(st, t, openWrite) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:' + (st.direction || 'row') + ';gap:' + (st.gap || 12) + 'px;justify-content:' + (st.align || 'flex-start') + ';flex-wrap:wrap';
    var btn1 = document.createElement('button');
    btn1.textContent = st.btn1Text || (t.writeReview || 'Write a Review');
    btn1.style.cssText = 'padding:10px 22px;border-radius:' + (st.btn1Radius || 8) + 'px;background:' + (st.btn1Bg || '#6B1A2C') + ';color:' + (st.btn1Color || '#fff') + ';border:none;font-weight:700;font-size:14px;cursor:pointer';
    btn1.addEventListener('click', openWrite);

    var btn2 = document.createElement('button');
    btn2.textContent = st.btn2Text || 'See All Reviews';
    btn2.style.cssText = 'padding:10px 22px;border-radius:' + (st.btn2Radius || 8) + 'px;background:' + (st.btn2Bg || 'transparent') + ';color:' + (st.btn2Color || '#6B1A2C') + ';border:2px solid ' + (st.btn2Border || '#6B1A2C') + ';font-weight:700;font-size:14px;cursor:pointer';

    wrap.appendChild(btn1);
    wrap.appendChild(btn2);
    return wrap;
  }

  function buildTrustBadgeBlock(total, avgRating, st, t) {
    var el    = document.createElement('div');
    var color = st.accentColor || '#6B1A2C';
    var icons = { check: '✓', shield: '🛡', star: '★' };
    var icon  = icons[st.iconType || 'check'] || '✓';
    var text  = (st.text || (t.verified || 'Verified Reviews'));
    if (st.style === 'inline') {
      el.style.cssText = 'display:inline-flex;align-items:center;gap:6px';
      el.innerHTML = '<span style="color:' + color + ';font-weight:700">' + icon + '</span><span style="font-size:14px;font-weight:700;color:' + color + '">' + total + ' ' + text + '</span>';
    } else if (st.style === 'card') {
      el.style.cssText = 'display:inline-flex;flex-direction:column;align-items:center;padding:14px 20px;border:2px solid ' + color + ';border-radius:12px;gap:4px';
      el.innerHTML = '<span style="font-size:22px;color:' + color + '">' + icon + '</span><span style="font-size:20px;font-weight:900;color:' + color + '">' + total + '</span><span style="font-size:12px;color:#6b7280">' + text + '</span>';
    } else {
      el.style.cssText = 'display:inline-flex;align-items:center;gap:8px;padding:7px 16px;border-radius:24px;background:' + color + '18;border:1.5px solid ' + color + '44';
      el.innerHTML = '<span style="color:' + color + ';font-weight:700">' + icon + '</span><span style="font-size:13px;font-weight:700;color:' + color + '">' + text + '</span>';
    }
    return el;
  }

  /* ── Card builder for block-based review list ── */
  function buildCTCard(r, s, t) {
    var card  = document.createElement('div');
    var shadow = s.showShadow ? '0 2px 12px rgba(0,0,0,.08)' : 'none';
    card.style.cssText =
      'background:' + (s.cardBg || '#fff') + ';' +
      'border:1px solid ' + (s.borderColor || '#e4e4e4') + ';' +
      'border-radius:' + (s.radius || 12) + 'px;' +
      'padding:' + (s.cardPadding || 18) + 'px;' +
      'box-shadow:' + shadow + ';' +
      'break-inside:avoid';

    var accent    = s.accentColor || '#6B1A2C';
    var starColor = s.starColor   || '#F59E0B';

    var avatarHTML   = s.showAvatar ? '<div style="width:36px;height:36px;border-radius:50%;background:' + accent + ';display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;flex-shrink:0">' + escapeHTML((r.customer||'A').trim().split(' ').map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2)||'A') + '</div>' : '';
    var verifiedHTML = (s.showVerified && r.isVerified) ? '<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#16a34a;font-weight:600;padding:2px 6px;background:#dcfce7;border-radius:4px">&#10003; ' + (t.verified || 'Verified') + '</span>' : '';
    var dateHTML     = (s.showDate && r.createdAt) ? '<span style="font-size:12px;color:#9ca3af">' + escapeHTML(fmtDate(r.createdAt)) + '</span>' : '';
    var titleHTML    = r.title ? '<div style="font-weight:700;font-size:14px;color:' + (s.textColor || '#1a1a1a') + ';margin-bottom:6px">' + escapeHTML(r.title) + '</div>' : '';
    var mediaHTML    = '';
    if (s.showMedia !== false && r.mediaUrl && r.mediaType && r.mediaType.startsWith('image')) {
      mediaHTML = '<img src="' + escapeHTML(r.mediaUrl) + '" alt="Review photo" loading="lazy" style="width:100%;border-radius:8px;margin-top:10px;object-fit:cover;max-height:200px">';
    }
    var replyHTML = r.reply ? '<div style="margin-top:10px;padding:8px 12px;background:#f9fafb;border-left:3px solid ' + accent + ';border-radius:0 8px 8px 0;font-size:13px"><strong>' + (t.storeReplyLabel || 'Store reply') + ':</strong> ' + escapeHTML(r.reply) + '</div>' : '';

    card.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
        avatarHTML +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
            '<span style="font-weight:700;font-size:14px;color:' + (s.textColor || '#1a1a1a') + '">' + escapeHTML(r.customer || '') + '</span>' +
            verifiedHTML +
            dateHTML +
          '</div>' +
          '<div style="display:flex;gap:2px;margin-top:3px">' + starsHtml(r.rating, starColor, 14) + '</div>' +
        '</div>' +
      '</div>' +
      titleHTML +
      '<p style="font-size:14px;color:' + (s.textColor || '#555') + ';line-height:1.6;margin:0">' + escapeHTML(r.comment || '') + '</p>' +
      mediaHTML +
      replyHTML;
    return card;
  }

  /* ══════════════════════════════════════════════════════════════
     LEGACY STYLE-BASED RENDERER (unchanged)
  ══════════════════════════════════════════════════════════════ */

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

  /* ── Shared helpers ── */
  function starsHtml(rating, color, size) {
    var h = ''; size = size || 15;
    for (var i = 1; i <= 5; i++) {
      h += '<span style="color:' + (i <= rating ? color : '#ddd') + ';font-size:' + size + 'px">&#9733;</span>';
    }
    return h;
  }

  function escapeHTML(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function initials(name) {
    return (name || 'A').split(' ').map(function (w) { return w[0] || ''; }).join('').toUpperCase().slice(0, 2) || 'A';
  }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (e) { return ''; }
  }

  /* ── Legacy card builder ── */
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
        '<div class="ct-stars">' + starsHtml(r.rating, s.starColor, 14) + '</div>' +
      '</div></div>' +
      titleHTML +
      '<p class="ct-comment">' + (r.comment || '') + '</p>' +
      mediaHTML;

    return card;
  }

  /* ── Legacy summary bar ── */
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
        '<div class="ct-score-stars">' + starsHtml(Math.round(avgRating), s.starColor, 16) + '</div>' +
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

  /* ── Write-a-review modal (shared) ── */
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
        .then(function (up) { submitReview(up.url || null, up.mediaType || null, up.fileName || null); })
        .catch(function () { submitReview(null, null, null); });
      } else {
        submitReview(null, null, null);
      }
    });

    return open;
  }

  /* ── Legacy compact rows layout ── */
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
          '<span class="ct-compact-stars">' + starsHtml(r.rating, s.starColor, 13) + '</span>' +
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

  function injectCTSchema(widget, avgRating, total, reviews) {
    if (widget.dataset.seoEnabled === 'false' || !total) return;
    var productTitle = widget.dataset.productTitle || '';
    if (!productTitle) return;
    var productId = widget.dataset.productId || '';

    var aggRating = { '@type': 'AggregateRating', 'ratingValue': avgRating.toFixed(1), 'reviewCount': String(total), 'bestRating': '5', 'worstRating': '1' };
    var reviewItems = reviews.slice(0, 20).map(function(r) {
      return { '@type': 'Review', 'author': { '@type': 'Person', 'name': r.customer || 'Customer' }, 'reviewRating': { '@type': 'Rating', 'ratingValue': String(r.rating), 'bestRating': '5', 'worstRating': '1' }, 'reviewBody': r.comment || '', 'datePublished': r.createdAt ? r.createdAt.split('T')[0] : undefined };
    });

    // Find the theme's existing Product schema and augment it instead of adding
    // a duplicate — two Product entities on the same page confuses Google's
    // structured data parser and typically breaks rich-result eligibility.
    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (var si = 0; si < scripts.length; si++) {
      var sc = scripts[si];
      var parsed;
      try { parsed = JSON.parse(sc.textContent); } catch(e) { continue; }
      var arr = Array.isArray(parsed) ? parsed : [parsed];
      var matched = false;
      for (var ni = 0; ni < arr.length; ni++) {
        if (arr[ni] && arr[ni]['@type'] === 'Product') {
          arr[ni]['aggregateRating'] = aggRating;
          arr[ni]['review']          = reviewItems;
          matched = true;
          break;
        }
      }
      if (matched) { sc.textContent = JSON.stringify(parsed); return; }
    }

    var sid = 'ct-ld-json-' + productId;
    if (document.getElementById(sid)) return;
    var schema = { '@context': 'https://schema.org/', '@type': 'Product', 'name': productTitle, 'aggregateRating': aggRating, 'review': reviewItems };
    var newSc = document.createElement('script'); newSc.id = sid; newSc.type = 'application/ld+json'; newSc.textContent = JSON.stringify(schema); document.head.appendChild(newSc);
  }

  /* ── Legacy main render ── */
  function render(container, widget, apiData, s, t, productId, shop) {
    var reviews   = apiData.reviews || [];
    var total     = apiData.total   || reviews.length;
    var avgRating = apiData.averageRating || 0;

    if (!reviews.length) {
      container.innerHTML = '<p class="ct-empty">' + (t.noReviews || 'No reviews yet.') + '</p>';
      return;
    }

    injectCTSchema(widget, avgRating, total, reviews);
    var openWrite = buildWriteModal(s, t, productId, shop);

    if (s.style === 'compact_rows') {
      container.appendChild(buildSummaryBar(reviews, s, t, total, avgRating, openWrite));
      buildCompactLayout(container, reviews, s, t);
      return;
    }

    container.appendChild(buildSummaryBar(reviews, s, t, total, avgRating, openWrite));

    var layout = document.createElement('div');

    if (s.style === 'masonry_wall') {
      layout.className = 'ct-masonry';
      layout.style.columnCount = s.columns;
      layout.style.columnGap   = s.gap + 'px';
    } else if (s.style === 'slider') {
      layout.className = 'ct-slider';
    } else {
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
