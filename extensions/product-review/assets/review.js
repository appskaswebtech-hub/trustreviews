var reviewSection = document.querySelector(".review-section");
var productId = reviewSection ? reviewSection.dataset.productId : "";
var productTitle = reviewSection ? reviewSection.dataset.productTitle : "";
// Fall back to <html lang> (same mechanism the other widgets use, proven to
// follow the storefront's language switcher) if the block's own data-locale
// attribute is ever missing or empty, instead of silently sending no locale
// at all to the server (which would fall back to the merchant's saved
// default language instead of the customer's current one).
var storeLocale = (reviewSection && reviewSection.dataset.locale) || locale_language || (document.documentElement.lang || "").split("-")[0] || "";
let rating = 0;
let allReviews = [];
let currentSort = "newest";
let searchQuery = "";
let currentPage = 1;
let listSettings = {
  listStyle: "list", cardBackground: "#FFFFFF", cardBorderColor: "#000000",
  cardTextColor: "#333333", accentColor: "#1a1a1a", reviewsPerPage: 10,
};

/* ============ TRANSLATIONS ============ */
// Fallback only — the full set of languages is served by /apps/review (see
// app/utils/widgetTranslations.server.js) to stay under Shopify's 100 KB
// Liquid-content cap per theme app extension.
const REVIEW_TRANSLATIONS_EN = {
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
let T = REVIEW_TRANSLATIONS_EN;

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
  var container = document.getElementById('toast-container');
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
          <p class="review-comment">${commentHTML}</p>
          ${mediaHTML}
          ${replyHTML}
          ${metaHTML}
        </div>
      </div>
    `;
  }

  if(style === "minimal"){
    var titleLineHTML = r.title ? `<div class="review-title-line">${highlight(r.title, q)}</div>` : "";
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

  container.innerHTML = pageItems.map(function(r) { return buildCardHTML(r, q, style); }).join("");
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

    renderReviews();
  } catch(e){
    console.error("loadReviews error:", e);
  }
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

/* ============ INIT ============ */
loadReviews();
applyFormStyle();
