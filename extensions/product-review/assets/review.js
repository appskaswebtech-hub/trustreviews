var reviewSection = document.querySelector(".review-section");
var productId = reviewSection ? reviewSection.dataset.productId : "";
var productTitle = reviewSection ? reviewSection.dataset.productTitle : "";
// Fall back to <html lang> (same mechanism the other widgets use, proven to
// follow the storefront's language switcher) if the block's own data-locale
// attribute is ever missing or empty, instead of silently sending no locale
// at all to the server (which would fall back to the merchant's saved
// default language instead of the customer's current one).
var storeLocale = (reviewSection && reviewSection.dataset.locale) || locale_language || (document.documentElement.lang || "").split("-")[0] || "";
var seoEnabled = reviewSection ? reviewSection.dataset.seoEnabled !== 'false' : true;
var rating = 0;
var allReviews = [];
var currentSort = "newest";
var searchQuery = "";
var currentPage = 1;
var listSettings = {
  listStyle: "list", cardBackground: "#FFFFFF", cardBorderColor: "#000000",
  cardTextColor: "#333333", accentColor: "#1a1a1a", reviewsPerPage: 10,
};

/* ============ TRANSLATIONS ============ */
// Fallback only — the full set of languages is served by /apps/review (see
// app/utils/widgetTranslations.server.js) to stay under Shopify's 100 KB
// Liquid-content cap per theme app extension.
var REVIEW_TRANSLATIONS_EN = {
  basedOn: "Based on", reviewsWord: "reviews", writeReview: "Write a Review", close: "Close",
  ratingQuestion: "What would you rate this product?", reviewTitleLabel: "Review title",
  reviewTitlePlaceholder: "Summarize your experience...",
  feedbackLabel: "Tell us your feedback about the product",
  feedbackPlaceholder: "Share your experience with this product...",
  uploadLabel: "Upload image/video", nameLabel: "Your name", namePlaceholder: "Name",
  emailLabel: "Your email address", emailPlaceholder: "Email", cancel: "Cancel", submit: "Submit",
  productReviewsTab: "Product Reviews", sort: "Sort",
  sortOptions: { newest: "Newest First", oldest: "Oldest First", highest: "Highest Rated", lowest: "Lowest Rated", helpful: "Most Helpful" },
  search: "Search", searchAria: "Search reviews", searchPlaceholder: "Search reviews...",
  searchClearAria: "Clear search", noResults: "No reviews match your search.",
  helpful: "Helpful", share: "Share",
  requiredFieldsAlert: "Please fill all required fields", reviewLinkCopiedAlert: "Review link copied!",
  prev: "← Prev", next: "Next →", page: "Page", of: "of",
  storeReplyLabel: "Store reply",
};
var T = REVIEW_TRANSLATIONS_EN;

// The "Write a Review" button/form can be turned off per-block (see
// show_write_review setting), so every element it touches may not exist —
// these helpers no-op instead of throwing when an id isn't on the page.
function setText(id, text){ var el = document.getElementById(id); if(el) el.textContent = text; }
function setPlaceholder(id, text){ var el = document.getElementById(id); if(el) el.placeholder = text; }
function setAria(id, text){ var el = document.getElementById(id); if(el) el.setAttribute("aria-label", text); }

function applyTranslations(remoteT){
  T = remoteT || REVIEW_TRANSLATIONS_EN;

  setText("based-on-label", T.basedOn);
  setText("reviews-word", T.reviewsWord);
  setText("open-review", T.writeReview);
  setText("form-title", T.writeReview);
  setAria("form-close-btn", T.close);
  setText("rating-question", T.ratingQuestion);
  setText("review-title-label", T.reviewTitleLabel);
  setPlaceholder("review-title", T.reviewTitlePlaceholder);
  setText("feedback-label", T.feedbackLabel);
  setPlaceholder("comment", T.feedbackPlaceholder);
  setText("upload-label", T.uploadLabel);
  setText("name-label", T.nameLabel);
  setPlaceholder("name", T.namePlaceholder);
  setText("email-label", T.emailLabel);
  setPlaceholder("email", T.emailPlaceholder);
  setText("cancel-btn", T.cancel);
  setText("submit-btn", T.submit);
  setText("reviews-tab-label", T.productReviewsTab);
  setText("sort-btn", T.sort + " ▾");
  document.querySelectorAll(".sort-option").forEach(function(el){
    var key = el.dataset.sort;
    if (T.sortOptions[key]) el.textContent = T.sortOptions[key];
  });
  setAria("search-toggle-btn", T.searchAria);
  setText("search-label", T.search);
  setPlaceholder("search-input", T.searchPlaceholder);
  setAria("search-clear-btn", T.searchClearAria);
  setText("no-results", T.noResults);
}

/* ============ TOAST ============ */
function showToast(message, type) {
  type = type || 'success';
  var container = document.getElementById('rf-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'rf-toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  var icon = type === 'success' ? '✓' : '✕';
  toast.innerHTML =
    '<div class="toast-icon">' + icon + '</div>' +
    '<span class="toast-msg">' + message + '</span>' +
    '<button class="toast-close" onclick="removeToast(this.parentElement)">✕</button>' +
    '<div class="toast-progress"></div>';
  container.appendChild(toast);
  setTimeout(function() { removeToast(toast); }, 3500);
}

function removeToast(toast) {
  if (!toast || toast.classList.contains('removing')) return;
  toast.classList.add('removing');
  setTimeout(function() { if (toast.parentElement) toast.remove(); }, 250);
}

/* ============ REVIEW-REWARD COUPON ============ */
// Shown right after a review is submitted, when the merchant has a coupon
// configured (Admin → Review Coupon). Purely a display + copy affordance —
// the discount itself already exists in Shopify, this just surfaces the code.
function showCouponModal(coupon) {
  if (!coupon || !coupon.code) return;

  var existing = document.getElementById('tr-coupon-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'tr-coupon-overlay';
  overlay.className = 'tr-coupon-overlay';
  overlay.innerHTML =
    '<div class="tr-coupon-modal">' +
      '<button class="tr-coupon-close" aria-label="Close">✕</button>' +
      '<div class="tr-coupon-message">' + (coupon.message || 'Thanks for your review! Use the code below to save on your next order.') + '</div>' +
      '<div class="tr-coupon-code-row">' +
        '<span class="tr-coupon-code">' + coupon.code + '</span>' +
        '<button class="tr-coupon-copy-btn">Copy</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  var close = function () { overlay.remove(); };
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  overlay.querySelector('.tr-coupon-close').addEventListener('click', close);

  overlay.querySelector('.tr-coupon-copy-btn').addEventListener('click', function (e) {
    navigator.clipboard.writeText(coupon.code).then(function () {
      e.target.textContent = 'Copied';
      setTimeout(function () { e.target.textContent = 'Copy'; }, 2000);
    }).catch(function () {});
  });
}

/* ============ LIST DESIGN (layout/colors/pagination from admin) ============ */
function applyListSettings(remoteSettings){
  listSettings = remoteSettings || listSettings;
  var section = document.querySelector(".reviews-section");
  if(!section) return;
  section.setAttribute("data-list-style", listSettings.listStyle || "list");
  section.style.setProperty("--rl-card-bg",     listSettings.cardBackground  || "#FFFFFF");
  section.style.setProperty("--rl-card-border", listSettings.cardBorderColor || "#000000");
  section.style.setProperty("--rl-card-text",   listSettings.cardTextColor   || "#333333");
  section.style.setProperty("--rl-accent",      listSettings.accentColor     || "#1a1a1a");

  if (listSettings.customCardCSS) {
    var existing = document.getElementById("tr-custom-card-css");
    if (existing) existing.remove();
    var style = document.createElement("style");
    style.id = "tr-custom-card-css";
    style.textContent = listSettings.customCardCSS;
    document.head.appendChild(style);
  }
}

/* ============ CUSTOM HTML CARD RENDERER ============ */
function buildCustomCardHTML(r, template, q) {
  var stars = "";
  for (var i = 1; i <= 5; i++) {
    stars += i <= r.rating
      ? '<span class="tr-star">★</span>'
      : '<span class="tr-star tr-star--empty">★</span>';
  }
  var initials   = getInitials(r.customer || "");
  var dateStr    = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "";
  var titleBlock = r.title
    ? '<div class="tr-card__title">' + highlight(r.title, q) + '</div>'
    : "";
  var reply = r.reply
    ? '<div class="tr-reply"><strong>Store reply:</strong> ' + escapeHTML(r.reply) + '</div>'
    : "";
  var media = "";
  if (r.mediaUrl) {
    var mUrl = escapeHTML(resolveMediaUrl(r.mediaUrl, "https://trustreviews.kaswebtechsolutions.com"));
    if (r.mediaType && r.mediaType.startsWith("image/")) {
      media = '<div class="tr-media"><img src="' + mUrl + '" alt="Review image"></div>';
    } else if (r.mediaType && r.mediaType.startsWith("video/")) {
      media = '<div class="tr-media"><video src="' + mUrl + '" controls></video></div>';
    }
  }
  return template
    .replace(/\{\{id\}\}/g,         r.id)
    .replace(/\{\{customer\}\}/g,   highlight(r.customer || "", q))
    .replace(/\{\{initials\}\}/g,   escapeHTML(initials))
    .replace(/\{\{rating\}\}/g,     r.rating)
    .replace(/\{\{stars\}\}/g,      stars)
    .replace(/\{\{comment\}\}/g,    highlight(r.comment || "", q))
    .replace(/\{\{title\}\}/g,      escapeHTML(r.title || ""))
    .replace(/\{\{titleBlock\}\}/g, titleBlock)
    .replace(/\{\{date\}\}/g,       escapeHTML(dateStr))
    .replace(/\{\{verified\}\}/g,   '<span class="tr-verified">✓ ' + (T.verified || 'Verified') + '</span>')
    .replace(/\{\{helpful\}\}/g,    r.likes || 0)
    .replace(/\{\{reply\}\}/g,      reply)
    .replace(/\{\{media\}\}/g,      media);
}

/* ============ OPEN / CLOSE FORM ============ */
var openReviewBtn = document.getElementById("open-review");
if (openReviewBtn) {
  openReviewBtn.onclick = function(){
    document.getElementById("review-form").style.display = "block";
    this.style.display = "none";
  };
}
function closeReview(){
  document.getElementById("review-form").style.display = "none";
  var btn = document.getElementById("open-review");
  if (btn) btn.style.display = "inline-block";
}

/* ============ STAR CLICK ============ */
document.querySelectorAll("#star-rating span").forEach(function(star) {
  star.addEventListener("click", function(){
    rating = this.dataset.value;
    document.querySelectorAll("#star-rating span").forEach(function(s, i) {
      s.classList.toggle("active", i < rating);
    });
  });
  star.addEventListener("mouseover", function(){
    var hv = this.dataset.value;
    document.querySelectorAll("#star-rating span").forEach(function(s, i) {
      s.classList.toggle("active", i < hv);
    });
  });
  star.addEventListener("mouseout", function(){
    document.querySelectorAll("#star-rating span").forEach(function(s, i) {
      s.classList.toggle("active", i < rating);
    });
  });
});

function previewReviewFile(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("file-preview");

  preview.innerHTML = "";

  if (!file) return;

  // if (file.size > 5 * 1024 * 1024) {
  //   alert("File size must be under 5MB");
  //   event.target.value = "";
  //   return;
  // }

  const url = URL.createObjectURL(file);

  if (file.type.startsWith("image/")) {
    preview.innerHTML = `<img src="${url}" alt="Review upload">`;
  } else if (file.type.startsWith("video/")) {
    preview.innerHTML = `<video src="${url}" controls></video>`;
  }
}

/* ============ SORT MENU ============ */
function toggleSortMenu(){
  var menu = document.getElementById("sort-menu");
  var btn  = document.getElementById("sort-btn");
  var isOpen = menu.style.display !== "none";
  menu.style.display = isOpen ? "none" : "block";
  btn.classList.toggle("open", !isOpen);
}
function selectSort(el){
  document.querySelectorAll(".sort-option").forEach(function(o) { o.classList.remove("active"); });
  el.classList.add("active");
  currentSort = el.dataset.sort;
  document.getElementById("sort-menu").style.display = "none";
  document.getElementById("sort-btn").classList.remove("open");
  document.getElementById("sort-btn").textContent = el.textContent + " ▾";
  currentPage = 1;
  renderReviews();
}
document.addEventListener("click", function(e){
  if(!e.target.closest(".sort-wrap")){
    document.getElementById("sort-menu").style.display = "none";
    document.getElementById("sort-btn").classList.remove("open");
  }
});

/* ============ SEARCH ============ */
function toggleSearch(){
  var box = document.getElementById("search-box");
  var btn = document.getElementById("search-toggle-btn");
  var isOpen = box.style.display !== "none";
  box.style.display = isOpen ? "none" : "flex";
  btn.classList.toggle("open", !isOpen);
  if(!isOpen) document.getElementById("search-input").focus();
}
function clearSearch(){
  document.getElementById("search-input").value = "";
  searchQuery = "";
  currentPage = 1;
  renderReviews();
  document.getElementById("search-input").focus();
}
document.addEventListener("input", function(e){
  if(e.target.id === "search-input"){
    searchQuery = e.target.value.trim().toLowerCase();
    currentPage = 1;
    renderReviews();
  }
});

/* ============ INITIALS ============ */
function getInitials(name){
  return (name || "?").trim().split(" ").map(function(w) { return w[0]; }).join("").toUpperCase().slice(0,2) || "?";
}

function escapeHTML(text){
  return String(text || "").replace(/[&<>"']/g, function(char){
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char];
  });
}

// Uploads from the live review form are stored as relative paths (e.g.
// "/uploads/x.jpg") served from our own app, so they need the app domain
// prefixed. Imported reviews (Judge.me, Loox, etc.) store the original
// absolute CDN URL — those must be left untouched or the prefix would
// double up into a broken URL.
function resolveMediaUrl(url, base){
  if (/^https?:\/\//i.test(url)) return url;
  return base + url;
}

/* ============ HIGHLIGHT ============ */
function highlight(text, query){
  var safeText = escapeHTML(text);
  if(!query) return safeText;
  var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safeText.replace(new RegExp("(" + escaped + ")", "gi"), '<span class="highlight">$1</span>');
}

/* ============ CARD MARKUP (per layout design) ============ */
function buildCardHTML(r, q, style){
  var stars = "";
  for(var i = 1; i <= 5; i++){
    stars += i <= r.rating ? '<span>★</span>' : '<span class="dim">★</span>';
  }
  var initials     = getInitials(r.customer);
  var customerHTML = highlight(r.customer || "", q);
  var commentHTML  = highlight(r.comment  || "", q);
  // When showing reviews from every product, the page's own product title
  // would be wrong for reviews that belong to other products — hide it instead.
  var productLabelHTML = listSettings.showAllProducts
    ? ""
    : `<div class="review-product-label">${escapeHTML(productTitle)}</div>`;

  var mediaHTML = "";
  if (r.mediaUrl) {
    if (r.mediaType && r.mediaType.startsWith("image/")) {
      mediaHTML = `
        <div class="review-media">
          <img src="${escapeHTML(resolveMediaUrl(r.mediaUrl, 'https://trustreviews.kaswebtechsolutions.com'))}" alt="Review image" onclick="openMediaModal('${escapeHTML(resolveMediaUrl(r.mediaUrl, 'https://staging-trustreviews.kaswebtechsolutions.com'))}', 'image')" />
        </div>
      `;
    } else if (r.mediaType && r.mediaType.startsWith("video/")) {
      mediaHTML = `
        <div class="review-media">
          <video src="${escapeHTML(resolveMediaUrl(r.mediaUrl, 'https://trustreviews.kaswebtechsolutions.com'))}" controls></video>
        </div>
      `;
    }
  }

  var titleLineHTML = r.title ? `<div class="review-title-line">${highlight(r.title, q)}</div>` : "";

  var replyHTML = r.reply
    ? `<div class="review-reply"><strong>${escapeHTML(T.storeReplyLabel || "Store reply")}:</strong> ${escapeHTML(r.reply)}</div>`
    : "";

  var metaHTML = `
    <div class="review-meta">
      <button class="helpful-btn" onclick="likeReview(${r.id})">
        <span class="check">✓</span> ${T.helpful} (${r.likes || 0})
      </button>
      <button class="share-btn" onclick="shareReview(${r.id})">${T.share}</button>
    </div>
  `;

  if(style === "grid"){
    return `
      <div class="review-card review-card--grid" id="review-${r.id}">
        <div class="review-body">
          <div class="review-card-head">
            <div class="review-avatar">${initials}</div>
            <div class="review-author">${customerHTML}</div>
          </div>
          <div class="review-stars">${stars}</div>
          ${productLabelHTML}
          ${titleLineHTML}
          <p class="review-comment">${commentHTML}</p>
          ${mediaHTML}
          ${replyHTML}
          ${metaHTML}
        </div>
      </div>
    `;
  }

  if(style === "compact"){
    return `
      <div class="review-card review-card--compact" id="review-${r.id}">
        <div class="review-avatar-outer">
          <div class="review-avatar">${initials}</div>
        </div>
        <div class="review-body">
          <div class="review-card-head">
            <div class="review-stars">${stars}</div>
            <div class="review-author">${customerHTML}</div>
          </div>
          ${titleLineHTML}
          <p class="review-comment">${commentHTML}</p>
          ${mediaHTML}
          ${replyHTML}
          ${metaHTML}
        </div>
      </div>
    `;
  }

  if(style === "minimal"){
    return `
      <div class="review-card review-card--minimal" id="review-${r.id}">
        <div class="review-stars">${stars}</div>
        <div class="review-card-head">
          <span class="review-avatar-icon">👤</span>
          <div class="review-author">${customerHTML}</div>
        </div>
        ${productLabelHTML}
        ${titleLineHTML}
        <p class="review-comment">${commentHTML}</p>
        ${mediaHTML}
        ${replyHTML}
        ${metaHTML}
      </div>
    `;
  }

  return `
    <div class="review-card" id="review-${r.id}">
      <div class="review-avatar-outer">
        <div class="review-avatar">${initials}</div>
      </div>
      <div class="review-body">
        <div class="flex-body">
        <div class="review-flex">
        <div class="review-stars">${stars}</div>
        ${productLabelHTML}
        <div class="review-author">${customerHTML}</div>
        ${titleLineHTML}
        <p class="review-comment">${commentHTML}</p>
        ${replyHTML}
        </div>
        ${mediaHTML}
        </div>
        ${metaHTML}
      </div>
    </div>
  `;
}

/* ============ PAGINATION ============ */
// Builds [1, "…", currentPage-1, currentPage, currentPage+1, "…", totalPages]
// (collapsing the ellipses away when there's nothing to skip) so large
// review counts don't render a button for every single page.
function buildPageList(current, total){
  var pages = [];
  var push = function(p){ if(pages[pages.length - 1] !== p) pages.push(p); };
  push(1);
  if(current > 3) push("…");
  for(var p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) push(p);
  if(current < total - 2) push("…");
  if(total > 1) push(total);
  return pages;
}

function renderPagination(totalPages){
  var el = document.getElementById("review-pagination");
  if(totalPages <= 1){
    el.style.display = "none";
    el.innerHTML = "";
    return;
  }
  el.style.display = "flex";

  var html = `<button class="pagination-arrow" id="page-prev-btn" aria-label="${T.prev}" ${currentPage <= 1 ? "disabled" : ""}>&lsaquo;</button>`;
  buildPageList(currentPage, totalPages).forEach(function(p){
    html += p === "…"
      ? `<span class="pagination-ellipsis">…</span>`
      : `<button class="pagination-num${p === currentPage ? " active" : ""}" data-page="${p}">${p}</button>`;
  });
  html += `<button class="pagination-arrow" id="page-next-btn" aria-label="${T.next}" ${currentPage >= totalPages ? "disabled" : ""}>&rsaquo;</button>`;

  el.innerHTML = html;
  document.getElementById("page-prev-btn").onclick = function(){ goToPage(currentPage - 1); };
  document.getElementById("page-next-btn").onclick = function(){ goToPage(currentPage + 1); };
  el.querySelectorAll(".pagination-num").forEach(function(btn){
    btn.onclick = function(){ goToPage(Number(btn.dataset.page)); };
  });
}

function goToPage(p){
  currentPage = p;
  renderReviews();
  document.querySelector(".reviews-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ============ RENDER REVIEWS ============ */
function renderReviews(){
  var container = document.getElementById("review-list");
  var noResults = document.getElementById("no-results");
  var q = searchQuery;

  var filtered = allReviews.filter(function(r) {
    if(!q) return true;
    return (r.customer || "").toLowerCase().includes(q) ||
           (r.comment  || "").toLowerCase().includes(q);
  });

  filtered = filtered.slice().sort(function(a, b) {
    if(currentSort === "newest")  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if(currentSort === "oldest")  return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    if(currentSort === "highest") return b.rating - a.rating;
    if(currentSort === "lowest")  return a.rating - b.rating;
    if(currentSort === "helpful") return (b.likes || 0) - (a.likes || 0);
    return 0;
  });

  if(filtered.length === 0){
    container.innerHTML = "";
    noResults.style.display = "block";
    renderPagination(0);
    return;
  }
  noResults.style.display = "none";

  var perPage    = listSettings.reviewsPerPage || 10;
  var totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  if(currentPage > totalPages) currentPage = totalPages;
  var pageItems  = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  var style      = listSettings.listStyle || "list";

  if (listSettings.customCardHTML) {
    container.innerHTML = pageItems.map(function(r) {
      return buildCustomCardHTML(r, listSettings.customCardHTML, q);
    }).join("");
  } else {
    container.innerHTML = pageItems.map(function(r) { return buildCardHTML(r, q, style); }).join("");
  }
  renderPagination(totalPages);
}

/* ============ MEDIA MODAL ============ */
function openMediaModal(url, type) {
  const modal = document.createElement('div');
  modal.className = 'media-modal';
  modal.onclick = function() {
    document.body.removeChild(modal);
  };

  if (type === 'image') {
    modal.innerHTML = `
      <div class="media-modal-content">
        <span class="media-modal-close">&times;</span>
        <img src="${url}" alt="Review image full size" />
      </div>
    `;
  }

  document.body.appendChild(modal);
}

/* ============ FETCH REVIEWS ============ */
async function loadReviews(){
  try {
    var res = await fetch('/apps/review?productId=' + encodeURIComponent(productId) + '&locale=' + encodeURIComponent(storeLocale));
    if(!res.ok) throw new Error("Unable to load reviews");
    var data = await res.json();
    allReviews = data.reviews || [];
    applyTranslations(data.translations);
    applyListSettings(data.listSettings);

    var total    = Number(data.total || 0);
    var avgValue = Number(data.averageRating || 0);
    var avg      = total ? avgValue.toFixed(1) : "0.0";
    document.getElementById("avg-rating").innerText    = avg;
    document.getElementById("total-reviews").innerText = total;

    var avgStars = "";
    for(var i = 1; i <= 5; i++){
      avgStars += i <= Math.round(avgValue)
        ? '<span>★</span>'
        : '<span style="color:#ddd">★</span>';
    }
    document.getElementById("avg-stars").innerHTML = avgStars;

    injectStructuredData(avgValue, total, allReviews);
    renderReviews();
  } catch(e){
    console.error("loadReviews error:", e);
  }
}

/* ============ RICH SNIPPETS / SEO ============ */
function injectStructuredData(avgRating, total, reviews) {
  if (!seoEnabled || !productTitle || !total) return;
  var existing = document.getElementById("tr-ld-json");
  if (existing) existing.remove();

  var schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": productTitle,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": avgRating.toFixed(1),
      "reviewCount": String(total),
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": reviews.slice(0, 20).map(function(r) {
      return {
        "@type": "Review",
        "author": { "@type": "Person", "name": r.customer || "Customer" },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": String(r.rating),
          "bestRating": "5",
          "worstRating": "1"
        },
        "reviewBody": r.comment || "",
        "datePublished": r.createdAt ? r.createdAt.split("T")[0] : undefined
      };
    })
  };

  var script = document.createElement("script");
  script.id   = "tr-ld-json";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/* ============ SUBMIT REVIEW ============ */
async function submitReview() {
  var name = document.getElementById("name").value.trim();
  var email = document.getElementById("email").value.trim();
  var comment = document.getElementById("comment").value.trim();
  var file = document.getElementById("review-file")?.files[0];
  var title = document.getElementById("review-title").value.trim();

  if (!name || !email || !comment || rating == 0) {
    showToast(T.requiredFieldsAlert, "error");
    return;
  }

  var uploadedFile = null;

  try {
    if (file) {
      var uploadFormData = new FormData();
      uploadFormData.append("file", file);

      var uploadResponse = await fetch("/apps/review", {
        method: "POST",
        body: uploadFormData
      });

      uploadedFile = await uploadResponse.json();

      if (!uploadedFile.success) {
        throw new Error("File upload failed");
      }
    }

    var data = {
      email: email,
      productId: productId,
      rating: rating,
      comment: comment,
      title: title,
      customer: name,
      mediaUrl: uploadedFile?.url || null,
      mediaType: uploadedFile?.mediaType || null,
      fileName: uploadedFile?.fileName || null
    };

    var response = await fetch("/apps/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error("Review submit failed");
    }

    var result = await response.json();

    showToast("Review submitted and sent for approval.", "success");

    document.getElementById("name").value = "";
    document.getElementById("email").value = "";
    document.getElementById("comment").value = "";
    document.getElementById("review-file").value = "";
    document.getElementById("file-preview").innerHTML = "";

    rating = 0;

    document.querySelectorAll("#star-rating span").forEach(function(s) { s.classList.remove("active"); });

    closeReview();
    loadReviews();

    if (result && result.coupon) {
      setTimeout(function () { showCouponModal(result.coupon); }, 400);
    }

  } catch (err) {
    console.error(err);
    showToast(err.message || "Error submitting review. Please try again.", "error");
  }
}

/* ============ LIKE REVIEW ============ */
async function likeReview(id){
  var response = await fetch("/apps/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "like", id: id })
  });
  if(!response.ok) return;
  loadReviews();
}

/* ============ SHARE REVIEW ============ */
function shareReview(id){
  var url = window.location.href.split('#')[0] + "#review-" + id;
  navigator.clipboard.writeText(url).then(function(){
    showToast(T.reviewLinkCopiedAlert, "success");
  }).catch(function(){
    showToast("Could not copy link. Please copy manually.", "error");
  });
}

/* ============ FORM STYLE (color/font/size/background) ============ */
async function applyFormStyle(){
  try {
    const res = await fetch("/apps/review?type=form-settings");
    if(!res.ok) return;
    const data = await res.json();
    const s = data.settings || {};
    const section = document.querySelector(".review-section");
    if(!section) return;
    section.style.setProperty("--rf-accent",   s.accentColor     || "#1a1a1a");
    section.style.setProperty("--rf-btn-text", s.buttonTextColor || "#FFFFFF");
    section.style.setProperty("--rf-bg",       s.backgroundColor || "transparent");
    section.style.setProperty("--rf-font",     s.fontFamily      || "inherit");
    section.style.setProperty("--rf-radius",   (s.borderRadius ?? 3) + "px");

    // Admin-level visibility toggle — hides via CSS rather than removing the
    // elements, so re-enabling in Settings brings them straight back with no
    // theme re-save needed. (Separate from the block's own "show_write_review"
    // setting, which controls whether these elements render at all.)
    if (s.showWriteReview === false) {
      var openBtn = document.getElementById("open-review");
      var formEl  = document.getElementById("review-form");
      if (openBtn) openBtn.style.display = "none";
      if (formEl)  formEl.style.display  = "none";
    }
  } catch(e){
    console.error("Review form style error:", e);
  }
}

/* ============ BLOCK-LEVEL COLOR OVERRIDES ============ */
function applyBlockSettings() {
  var section = document.querySelector(".review-section");
  if (!section) return;
  var inner = section.querySelector(".reviews-section");
  var d = section.dataset;
  if (d.accent) {
    section.style.setProperty("--rf-accent", d.accent);
    section.style.setProperty("--rl-accent", d.accent);
    if (inner) inner.style.setProperty("--rl-accent", d.accent);
  }
  if (d.btnText)    section.style.setProperty("--rf-btn-text", d.btnText);
  if (d.cardBg) {
    section.style.setProperty("--rl-card-bg", d.cardBg);
    if (inner) inner.style.setProperty("--rl-card-bg", d.cardBg);
  }
  if (d.cardBorder) {
    section.style.setProperty("--rl-card-border", d.cardBorder);
    if (inner) inner.style.setProperty("--rl-card-border", d.cardBorder);
  }
  if (d.cardText) {
    section.style.setProperty("--rl-card-text", d.cardText);
    if (inner) inner.style.setProperty("--rl-card-text", d.cardText);
  }
  if (d.sectionBg)  section.style.setProperty("--rs-bg", d.sectionBg);
  if (d.heading)    section.style.setProperty("--rs-heading", d.heading);
  if (d.muted)      section.style.setProperty("--rs-muted", d.muted);
  if (d.formBg)     section.style.setProperty("--rf-bg", d.formBg);
}

/* ============ INIT ============ */
// Guarded so this engine can safely load sitewide (via the "Trust Reviews
// Engine" app embed, for page-builder compatibility) without firing wasted
// fetches or console errors on pages that don't actually have the review
// section on them.
if (reviewSection) {
  Promise.all([loadReviews(), applyFormStyle()]).then(applyBlockSettings);
}
