(function () {
  document.querySelectorAll(".rw-widget").forEach(function (widget) {
    var blockId    = widget.dataset.blockId;
    var shop       = widget.dataset.shop;
    var locale     = widget.dataset.locale || "en";
    var accent     = widget.dataset.accent || "#6B1A2C";
    var columns    = parseInt(widget.dataset.columns || "3");
    var perPage    = parseInt(widget.dataset.perPage || "18");
    var showSearch = widget.dataset.showSearch !== "false";
    var showFilter = widget.dataset.showFilter !== "false";
    var seoEnabled = widget.dataset.seoEnabled !== "false";

    var gridEl       = document.getElementById("rw-grid-"       + blockId);
    var loadingEl    = document.getElementById("rw-loading-"    + blockId);
    var paginationEl = document.getElementById("rw-pagination-" + blockId);
    var statsEl      = document.getElementById("rw-stats-"      + blockId);
    var filtersEl    = document.getElementById("rw-filters-"    + blockId);
    var searchEl     = document.getElementById("rw-search-"     + blockId);

    widget.style.setProperty("--rw-accent",  accent);
    widget.style.setProperty("--rw-cols",    String(columns));

    var allReviews   = [];
    var filteredStar = 0;
    var searchQ      = "";
    var currentPage  = 1;
    var avgRating    = 0;
    var totalCount   = 0;
    var T            = {};

    /* ── Helpers ── */
    function escapeHTML(text) {
      return String(text || "").replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }

    function getInitials(name) {
      return (name || "?").trim().split(" ").map(function (w) { return w[0]; }).join("").toUpperCase().slice(0, 2) || "?";
    }

    function highlight(text, q) {
      var s = escapeHTML(text);
      if (!q) return s;
      var esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return s.replace(new RegExp("(" + esc + ")", "gi"), '<mark class="rw-hl">$1</mark>');
    }

    function buildStars(r) {
      var s = "";
      for (var i = 1; i <= 5; i++) {
        s += i <= r ? '<span class="rw-star rw-star--on">★</span>' : '<span class="rw-star">★</span>';
      }
      return s;
    }

    function timeAgo(dateStr) {
      if (!dateStr) return "";
      var diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
      if (diff < 60)       return "just now";
      if (diff < 3600)     return Math.floor(diff / 60)     + "m ago";
      if (diff < 86400)    return Math.floor(diff / 3600)   + "h ago";
      if (diff < 2592000)  return Math.floor(diff / 86400)  + "d ago";
      if (diff < 31536000) return Math.floor(diff / 2592000)+ "mo ago";
      return Math.floor(diff / 31536000) + "y ago";
    }

    function resolveMedia(url) {
      if (!url) return "";
      if (/^https?:\/\//i.test(url)) return url;
      return "https://trustreviews.kaswebtechsolutions.com" + url;
    }

    /* ── Card HTML ── */
    function buildCard(r, q) {
      var initials  = escapeHTML(getInitials(r.customer));
      var titleHTML = r.title ? '<div class="rw-card__title">' + highlight(r.title, q) + "</div>" : "";
      var replyHTML = r.reply
        ? '<div class="rw-card__reply"><strong>' + (T.storeReplyLabel || 'Store reply') + ':</strong> ' + escapeHTML(r.reply) + "</div>"
        : "";
      var mediaHTML = "";
      if (r.mediaUrl && r.mediaType && r.mediaType.startsWith("image/")) {
        mediaHTML = '<div class="rw-card__media"><img src="' + escapeHTML(resolveMedia(r.mediaUrl)) + '" alt="Review image" loading="lazy"></div>';
      }
      return (
        '<div class="rw-card">' +
          '<div class="rw-card__head">' +
            '<div class="rw-card__avatar">' + initials + "</div>" +
            '<div class="rw-card__info">' +
              '<span class="rw-card__name">' + highlight(r.customer || "", q) + "</span>" +
              '<span class="rw-card__verified">✓ ' + (T.verified || 'Verified') + '</span>' +
            "</div>" +
            '<span class="rw-card__date">' + escapeHTML(timeAgo(r.createdAt)) + "</span>" +
          "</div>" +
          '<div class="rw-card__stars">' + buildStars(r.rating) + "</div>" +
          titleHTML +
          '<p class="rw-card__comment">' + highlight(r.comment || "", q) + "</p>" +
          mediaHTML +
          replyHTML +
        "</div>"
      );
    }

    /* ── Filter & Render ── */
    function getFiltered() {
      return allReviews.filter(function (r) {
        if (filteredStar && r.rating !== filteredStar) return false;
        if (!searchQ) return true;
        return (
          (r.customer || "").toLowerCase().includes(searchQ) ||
          (r.comment  || "").toLowerCase().includes(searchQ) ||
          (r.title    || "").toLowerCase().includes(searchQ)
        );
      });
    }

    function render() {
      var filtered   = getFiltered();
      var totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
      if (currentPage > totalPages) currentPage = totalPages;
      var pageItems  = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

      if (pageItems.length === 0) {
        gridEl.innerHTML = '<div class="rw-empty">' + (T.noReviews || 'No reviews found.') + '</div>';
      } else {
        gridEl.innerHTML = pageItems.map(function (r) { return buildCard(r, searchQ); }).join("");
      }
      renderPagination(totalPages, filtered.length);
    }

    function renderPagination(totalPages, total) {
      if (totalPages <= 1) { paginationEl.innerHTML = ""; return; }
      var html = "";
      html += '<button class="rw-page-btn rw-page-arrow" ' + (currentPage <= 1 ? "disabled" : "") + ' data-page="' + (currentPage - 1) + '">&lsaquo;</button>';

      var pages = [];
      var push = function (p) { if (pages[pages.length - 1] !== p) pages.push(p); };
      push(1);
      if (currentPage > 3) push("…");
      for (var p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) push(p);
      if (currentPage < totalPages - 2) push("…");
      if (totalPages > 1) push(totalPages);

      pages.forEach(function (p) {
        if (p === "…") {
          html += '<span style="padding:0 4px;color:#9ca3af">…</span>';
        } else {
          html += '<button class="rw-page-btn' + (p === currentPage ? " active" : "") + '" data-page="' + p + '">' + p + "</button>";
        }
      });
      html += '<button class="rw-page-btn rw-page-arrow" ' + (currentPage >= totalPages ? "disabled" : "") + ' data-page="' + (currentPage + 1) + '">&rsaquo;</button>';
      paginationEl.innerHTML = html;
      paginationEl.querySelectorAll("[data-page]").forEach(function (btn) {
        btn.onclick = function () {
          currentPage = parseInt(btn.dataset.page);
          render();
          widget.scrollIntoView({ behavior: "smooth", block: "start" });
        };
      });
    }

    function renderStats() {
      if (!statsEl) return;
      var avg = avgRating ? avgRating.toFixed(1) : "0.0";
      statsEl.innerHTML =
        '<span class="rw-stat-avg">' + avg + "</span>" +
        '<span class="rw-stat-stars">' + buildStars(Math.round(avgRating)) + "</span>" +
        '<span class="rw-stat-count">' + totalCount + ' ' + (T.reviews || 'reviews') + "</span>";
    }

    function renderFilters() {
      if (!filtersEl || !showFilter) return;
      var counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      allReviews.forEach(function (r) { if (counts[r.rating] !== undefined) counts[r.rating]++; });
      var html = '<button class="rw-filter-btn' + (!filteredStar ? " active" : "") + '" data-star="0">' + (T.filterAll || 'All') + '</button>';
      for (var s = 5; s >= 1; s--) {
        html += '<button class="rw-filter-btn' + (filteredStar === s ? " active" : "") + '" data-star="' + s + '">' + s + "★ (" + counts[s] + ")</button>";
      }
      filtersEl.innerHTML = html;
      filtersEl.querySelectorAll("[data-star]").forEach(function (btn) {
        btn.onclick = function () {
          filteredStar = parseInt(btn.dataset.star);
          currentPage  = 1;
          render();
          renderFilters();
        };
      });
    }

    /* ── Load ── */
    async function loadWall() {
      try {
        var url = "/apps/review?shop=" + encodeURIComponent(shop) +
                  "&locale=" + encodeURIComponent(locale) + "&limit=200";
        var res  = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);
        var json = await res.json();
        T           = json.translations || {};
        allReviews  = json.reviews  || [];
        avgRating   = Number(json.averageRating || 0);
        totalCount  = Number(json.total || 0);
        loadingEl.style.display = "none";
        renderStats();
        renderFilters();
        render();
        injectWallSchema();
      } catch (e) {
        loadingEl.innerHTML = "<span>Could not load reviews.</span>";
      }
    }

    /* ── SEO: inject AggregateRating for this page ── */
    function injectWallSchema() {
      if (!seoEnabled || !totalCount) return;
      var existing = document.getElementById("tr-wall-ld-json");
      if (existing) existing.remove();
      var schema = {
        "@context": "https://schema.org/",
        "@type": "Organization",
        "name": shop.replace(/\.myshopify\.com$/, ""),
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": avgRating.toFixed(1),
          "reviewCount": String(totalCount),
          "bestRating": "5",
          "worstRating": "1"
        }
      };
      var script = document.createElement("script");
      script.id   = "tr-wall-ld-json";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }

    if (searchEl && showSearch) {
      searchEl.addEventListener("input", function () {
        searchQ = searchEl.value.trim().toLowerCase();
        currentPage = 1;
        render();
      });
    }

    loadWall();
  });
})();
