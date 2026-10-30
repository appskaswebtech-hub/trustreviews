(function () {
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { return /^https:\/\//i.test(u || '') ? u : ''; }

  function openModal(v) {
    var m = document.createElement('div');
    m.className = 'sv-modal';
    m.innerHTML =
      '<div class="sv-modal-inner"><button class="sv-close" aria-label="Close">&times;</button>' +
      '<video src="' + esc(safeUrl(v.src)) + '" controls autoplay playsinline></video>' +
      (v.permalink ? '<a class="sv-modal-link" target="_blank" rel="noopener" href="' + esc(safeUrl(v.permalink)) + '">View on ' + (v.provider === 'facebook' ? 'Facebook' : 'Instagram') + ' &rarr;</a>' : '') +
      '</div>';
    function close() { document.removeEventListener('keydown', onKey); m.remove(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    m.addEventListener('click', function (e) { if (e.target === m || e.target.className === 'sv-close') close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(m);
  }

  function tile(v) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sv-tile';
    b.setAttribute('aria-label', 'Play video');
    // Instagram/Facebook thumbnails when we have them; otherwise the first frame of the video.
    b.innerHTML = (v.thumb
      ? '<img loading="lazy" alt="" src="' + esc(safeUrl(v.thumb)) + '">'
      : '<video muted playsinline preload="metadata" src="' + esc(safeUrl(v.src)) + '#t=0.1"></video>') +
      '<span class="sv-badge">' + (v.provider === 'facebook' ? 'Facebook' : 'Instagram') + '</span>' +
      '<span class="sv-play">&#9654;</span>';
    b.addEventListener('click', function () { openModal(v); });
    return b;
  }

  function init(el) {
    if (el.dataset.svInit) return;
    el.dataset.svInit = '1';
    var body = el.querySelector('.sv-body');
    var cols = parseInt(el.dataset.columns, 10) || 4;
    var max = parseInt(el.dataset.max, 10) || 12;
    el.style.setProperty('--sv-cols', cols);

    fetch('/apps/review?type=social-videos&shop=' + encodeURIComponent(el.dataset.shop) + '&limit=' + max, { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var videos = (data.videos || []).filter(function (v) { return safeUrl(v.src); });
        if (!videos.length) { el.style.display = 'none'; return; }
        var list = document.createElement('div');
        list.className = 'sv-list';
        videos.forEach(function (v) { list.appendChild(tile(v)); });
        body.appendChild(list);
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
