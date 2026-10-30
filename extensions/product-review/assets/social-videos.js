(function () {
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { return /^https:\/\//i.test(u || '') ? u : ''; }
  function providerName(v) { return v.provider === 'facebook' ? 'Facebook' : 'Instagram'; }

  // Full-screen, reels-style viewer: one video at a time, next / previous by
  // arrows, keyboard (← → ↑ ↓) or a vertical swipe; plays on to the next video.
  function openViewer(videos, start) {
    var idx = start;
    var m = document.createElement('div');
    m.className = 'sv-modal';
    m.innerHTML =
      '<button class="sv-arrow prev" aria-label="Previous">&#8249;</button>' +
      '<div class="sv-stage">' +
        '<div class="sv-top"><span class="sv-count"></span><button class="sv-close" aria-label="Close">&times;</button></div>' +
        '<div class="sv-slot"></div>' +
        '<div class="sv-bottom"><div class="sv-mcap"></div><a target="_blank" rel="noopener"></a></div>' +
      '</div>' +
      '<button class="sv-arrow next" aria-label="Next">&#8250;</button>';
    var slot = m.querySelector('.sv-slot'), prev = m.querySelector('.sv-arrow.prev'), next = m.querySelector('.sv-arrow.next');

    function show(n) {
      idx = Math.max(0, Math.min(videos.length - 1, n));
      var v = videos[idx];
      if (v.src) {
        slot.innerHTML = '<video src="' + esc(safeUrl(v.src)) + '" controls autoplay playsinline></video>';
        var el = slot.firstChild;
        el.addEventListener('ended', function () { if (idx < videos.length - 1) show(idx + 1); });
      } else {
        // No direct file from Instagram/Facebook (e.g. licensed music): official embed player.
        slot.innerHTML = '<iframe src="' + esc(safeUrl(v.embed)) + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
      }
      m.querySelector('.sv-count').textContent = (idx + 1) + ' / ' + videos.length;
      m.querySelector('.sv-mcap').textContent = v.caption || '';
      var link = m.querySelector('.sv-bottom a');
      link.href = safeUrl(v.permalink);
      link.textContent = 'View on ' + providerName(v) + ' →';
      prev.disabled = idx === 0;
      next.disabled = idx === videos.length - 1;
    }
    function close() { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; m.remove(); }
    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') show(idx + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') show(idx - 1);
    }
    prev.addEventListener('click', function () { show(idx - 1); });
    next.addEventListener('click', function () { show(idx + 1); });
    m.addEventListener('click', function (e) {
      if (e.target.className === 'sv-close' || e.target === m) close();
    });
    var y0 = null;
    m.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    m.addEventListener('touchend', function (e) {
      if (y0 === null) return;
      var dy = e.changedTouches[0].clientY - y0; y0 = null;
      if (Math.abs(dy) > 60) show(idx + (dy < 0 ? 1 : -1));
    });
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    document.body.appendChild(m);
    show(idx);
  }

  function tile(v, i, all, el) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sv-tile';
    b.setAttribute('aria-label', 'Play video');
    b.innerHTML =
      (v.thumb ? '<img loading="lazy" alt="" src="' + esc(safeUrl(v.thumb)) + '">' : '') +
      '<span class="sv-shade"></span>' +
      '<span class="sv-badge">' + providerName(v) + '</span>' +
      '<span class="sv-play">&#9654;</span>' +
      (el.dataset.caption === 'true' && v.caption ? '<span class="sv-cap">' + esc(v.caption) + '</span>' : '');

    // Silent preview while hovering (desktop only, and only when there is a real file).
    if (el.dataset.preview === 'true' && v.src && window.matchMedia('(hover:hover)').matches) {
      var vid = null;
      b.addEventListener('mouseenter', function () {
        if (!vid) {
          vid = document.createElement('video');
          vid.src = safeUrl(v.src); vid.muted = true; vid.loop = true; vid.playsInline = true;
          b.insertBefore(vid, b.querySelector('.sv-shade'));
        }
        b.classList.add('is-playing');
        vid.play().catch(function () {});
      });
      b.addEventListener('mouseleave', function () { b.classList.remove('is-playing'); if (vid) vid.pause(); });
    }
    b.addEventListener('click', function () { openViewer(all, i); });
    return b;
  }

  function init(el) {
    if (el.dataset.svInit) return;
    el.dataset.svInit = '1';
    var body = el.querySelector('.sv-body');
    var cols = parseInt(el.dataset.columns, 10) || 5;
    var max = parseInt(el.dataset.max, 10) || 12;
    el.style.setProperty('--sv-cols', cols);

    fetch('/apps/review?type=social-videos&shop=' + encodeURIComponent(el.dataset.shop) + '&limit=' + max, { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var videos = (data.videos || []).filter(function (v) { return safeUrl(v.src) || safeUrl(v.embed); });
        if (!videos.length) { el.style.display = 'none'; return; }
        var wrap = document.createElement('div');
        wrap.className = 'sv-wrap';
        var list = document.createElement('div');
        list.className = 'sv-list';
        videos.forEach(function (v, i) { list.appendChild(tile(v, i, videos, el)); });
        wrap.appendChild(list);

        if (el.dataset.layout === 'carousel') {
          var prev = document.createElement('button'), next = document.createElement('button');
          prev.className = 'sv-nav prev'; next.className = 'sv-nav next';
          prev.setAttribute('aria-label', 'Previous'); next.setAttribute('aria-label', 'Next');
          prev.innerHTML = '&#8249;'; next.innerHTML = '&#8250;';
          function update() {
            prev.disabled = list.scrollLeft <= 2;
            next.disabled = list.scrollLeft >= list.scrollWidth - list.clientWidth - 2;
          }
          prev.addEventListener('click', function () { list.scrollBy({ left: -list.clientWidth * 0.8 }); });
          next.addEventListener('click', function () { list.scrollBy({ left: list.clientWidth * 0.8 }); });
          list.addEventListener('scroll', update, { passive: true });
          window.addEventListener('resize', update);
          wrap.appendChild(prev); wrap.appendChild(next);
          setTimeout(update, 50);
        }
        body.appendChild(wrap);
      })
      .catch(function () { el.style.display = 'none'; });
  }

  function run() {
    var els = document.querySelectorAll('.sv-widget');
    for (var i = 0; i < els.length; i++) init(els[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
