(function () {
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { return /^https:\/\//i.test(u || '') ? u : ''; }

  // Full-screen viewer: progress bars on top, tap right = next, left = previous,
  // photos advance on a timer, videos when they finish.
  function openViewer(stories, account, seconds) {
    var idx = 0, timer = null, raf = null;
    var v = document.createElement('div');
    v.className = 'igs-viewer';
    var bars = stories.map(function () { return '<span class="igs-bar"><i></i></span>'; }).join('');
    v.innerHTML =
      '<div class="igs-stage"><div class="igs-bars">' + bars + '</div>' +
      '<div class="igs-user">' + (account && safeUrl(account.avatar) ? '<img alt="" src="' + esc(safeUrl(account.avatar)) + '">' : '') +
      '<span>' + esc(account ? account.username : '') + '</span></div>' +
      '<button class="igs-close" aria-label="Close">&times;</button>' +
      '<div class="igs-slot"></div>' +
      '<button class="igs-tap prev" aria-label="Previous"></button><button class="igs-tap next" aria-label="Next"></button>' +
      '<a class="igs-link" target="_blank" rel="noopener">View on Instagram</a></div>';
    var slot = v.querySelector('.igs-slot'), barEls = v.querySelectorAll('.igs-bar');

    function stop() { clearTimeout(timer); cancelAnimationFrame(raf); }
    function close() { stop(); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; v.remove(); }
    function onKey(e) { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(idx + 1); else if (e.key === 'ArrowLeft') go(idx - 1); }

    function fill(i, ms) {
      var bar = barEls[i].firstChild, start = performance.now();
      (function step(now) {
        bar.style.width = Math.min(100, (now - start) / ms * 100) + '%';
        if (now - start < ms) raf = requestAnimationFrame(step);
      })(start);
    }

    function go(n) {
      stop();
      if (n >= stories.length) return close();
      idx = Math.max(0, n);
      for (var i = 0; i < barEls.length; i++) {
        barEls[i].classList.toggle('done', i < idx);
        barEls[i].firstChild.style.width = i < idx ? '100%' : '0';
      }
      var s = stories[idx];
      v.querySelector('.igs-link').href = safeUrl(s.permalink);
      if (s.type === 'VIDEO' && s.src) {
        slot.innerHTML = '<video class="igs-media" src="' + esc(safeUrl(s.src)) + '" autoplay playsinline></video>';
        var vid = slot.firstChild;
        vid.addEventListener('loadedmetadata', function () { fill(idx, (vid.duration || seconds) * 1000); });
        vid.addEventListener('ended', function () { go(idx + 1); });
        vid.addEventListener('error', function () { go(idx + 1); });
      } else {
        slot.innerHTML = '<img class="igs-media" alt="" src="' + esc(safeUrl(s.image || s.thumb)) + '">';
        fill(idx, seconds * 1000);
        timer = setTimeout(function () { go(idx + 1); }, seconds * 1000);
      }
    }

    v.addEventListener('click', function (e) {
      if (e.target.classList.contains('igs-close') || e.target === v) close();
      else if (e.target.classList.contains('next')) go(idx + 1);
      else if (e.target.classList.contains('prev')) go(idx - 1);
    });
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    document.body.appendChild(v);
    go(0);
  }

  function init(el) {
    if (el.dataset.igsInit) return;
    el.dataset.igsInit = '1';
    var seconds = parseInt(el.dataset.duration, 10) || 5;

    fetch('/apps/review?type=social-stories&shop=' + encodeURIComponent(el.dataset.shop) + '&limit=30', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var stories = (data.items || []).filter(function (s) { return safeUrl(s.src) || safeUrl(s.image) || safeUrl(s.thumb); });
        // Stories are only available for 24h — no live story, no widget.
        if (!stories.length || !data.account) {
          // Merchants in the Theme Editor should see why the block is empty.
          if (window.Shopify && window.Shopify.designMode) {
            el.querySelector('.igs-body').innerHTML = '<p style="text-align:center;opacity:.7;margin:0">Instagram Stories: no live story right now. Stories appear here for 24 hours after you post them (Highlights are not available).</p>';
          } else el.style.display = 'none';
          return;
        }
        var acc = data.account;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'igs-circle';
        var pic = safeUrl(acc.avatar) || safeUrl(stories[0].thumb) || safeUrl(stories[0].image);
        b.innerHTML = '<span class="igs-ring"><span class="igs-ring-in">' + (pic ? '<img alt="" src="' + esc(pic) + '">' : '') + '</span></span>' +
          '<span class="igs-name">' + esc(acc.username) + '</span>';
        b.addEventListener('click', function () { openViewer(stories, acc, seconds); });
        el.querySelector('.igs-body').appendChild(b);
      })
      .catch(function () { el.style.display = 'none'; });
  }

  function run() {
    var els = document.querySelectorAll('.igs-widget');
    for (var i = 0; i < els.length; i++) init(els[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
