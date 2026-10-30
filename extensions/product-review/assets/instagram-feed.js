(function () {
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { return /^https:\/\//i.test(u || '') ? u : ''; }

  function mediaHtml(p) {
    if (p.type === 'VIDEO') {
      if (p.src) return '<video src="' + esc(safeUrl(p.src)) + '" controls autoplay playsinline></video>';
      // No direct file from Instagram (e.g. licensed music): official embed player.
      return '<iframe src="' + esc(safeUrl(p.embed)) + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%;height:80vh;max-height:640px;border:0;border-radius:12px;background:#fff"></iframe>';
    }
    return '<img alt="" src="' + esc(safeUrl(p.image || p.thumb)) + '">';
  }

  function openModal(p) {
    var m = document.createElement('div');
    m.className = 'igf-modal';
    m.innerHTML =
      '<div class="igf-modal-inner"><button class="igf-close" aria-label="Close">&times;</button>' +
      mediaHtml(p) +
      (p.caption && p.type !== 'VIDEO' ? '<div class="igf-modal-cap">' + esc(p.caption) + '</div>' : '') +
      '<a class="igf-modal-link" target="_blank" rel="noopener" href="' + esc(safeUrl(p.permalink)) + '">' +
      (p.type === 'CAROUSEL_ALBUM' ? 'See all photos on Instagram' : 'View on Instagram') + ' &rarr;</a></div>';
    function close() { document.removeEventListener('keydown', onKey); m.remove(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    m.addEventListener('click', function (e) { if (e.target === m || e.target.className === 'igf-close') close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(m);
  }

  function tile(p, el) {
    var toInstagram = el.dataset.click === 'instagram';
    var t = document.createElement(toInstagram ? 'a' : 'button');
    t.className = 'igf-tile';
    if (toInstagram) { t.href = safeUrl(p.permalink); t.target = '_blank'; t.rel = 'noopener'; }
    else t.type = 'button';
    var cover = p.thumb || p.image;
    t.innerHTML =
      (cover ? '<img loading="lazy" alt="" src="' + esc(safeUrl(cover)) + '">' : '') +
      (p.type === 'VIDEO' ? '<span class="igf-type">&#9654;</span>' : p.type === 'CAROUSEL_ALBUM' ? '<span class="igf-type">&#10064;</span>' : '') +
      (el.dataset.caption === 'true' && p.caption ? '<span class="igf-cap">' + esc(p.caption) + '</span>' : '');
    if (!toInstagram) t.addEventListener('click', function () { openModal(p); });
    return t;
  }

  function init(el) {
    if (el.dataset.igfInit) return;
    el.dataset.igfInit = '1';
    var cols = parseInt(el.dataset.columns, 10) || 4;
    var max = parseInt(el.dataset.max, 10) || 8;
    el.style.setProperty('--igf-cols', cols);

    fetch('/apps/review?type=social-feed&shop=' + encodeURIComponent(el.dataset.shop) + '&limit=' + max, { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var posts = (data.items || []).filter(function (p) { return safeUrl(p.thumb) || safeUrl(p.image) || safeUrl(p.src) || safeUrl(p.embed); });
        if (!posts.length) { el.style.display = 'none'; return; }
        var acc = data.account;
        if (acc && el.dataset.header === 'true') {
          el.querySelector('.igf-head').innerHTML =
            (safeUrl(acc.avatar) ? '<img class="igf-avatar" alt="" src="' + esc(safeUrl(acc.avatar)) + '">' : '') +
            '<span class="igf-user">@' + esc(acc.username) + '</span>' +
            '<a class="igf-follow" target="_blank" rel="noopener" href="' + esc(safeUrl(acc.url)) + '">' + esc(el.dataset.followText || 'Follow') + '</a>';
        }
        var list = document.createElement('div');
        list.className = 'igf-list';
        posts.forEach(function (p) { list.appendChild(tile(p, el)); });
        el.querySelector('.igf-body').appendChild(list);
      })
      .catch(function () { el.style.display = 'none'; });
  }

  function run() {
    var els = document.querySelectorAll('.igf-widget');
    for (var i = 0; i < els.length; i++) init(els[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
