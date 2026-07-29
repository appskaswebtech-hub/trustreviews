(function(){
  var section = document.querySelector(".rs-section");
  if(!section) return;

  var productId    = section.dataset.productId;
  var productTitle = section.dataset.productTitle;
  var storeLocale  = section.dataset.locale;
  var showVerified = section.dataset.showVerified === "true";
  var seoEnabled   = section.dataset.seoEnabled !== "false";

  var rating = 0;
  var allReviews = [];
  var currentSort = "newest";
  var currentPage = 1;
  var perPage = 10;

  var T = {
    basedOn: "Based on", reviewsWord: "reviews", writeReview: "Write a Review", close: "Close",
    ratingQuestion: "What would you rate this product?", reviewTitleLabel: "Review title",
    reviewTitlePlaceholder: "Summarize your experience...",
    feedbackLabel: "Tell us your feedback about the product",
    feedbackPlaceholder: "Share your experience with this product...",
    uploadLabel: "Upload image/video", nameLabel: "Your name", namePlaceholder: "Name",
    emailLabel: "Your email address", emailPlaceholder: "Email", cancel: "Cancel", submit: "Submit",
    requiredFieldsAlert: "Please fill all required fields",
    prev: "← Prev", next: "Next →", page: "Page", of: "of",
    verified: "Verified", outOf5: "out of 5", noResults: "No reviews yet.",
    sortOptions: { newest: "Most Recent", oldest: "Oldest First", highest: "Highest Rated", lowest: "Lowest Rated", helpful: "Most Helpful" },
  };

  function setText(id, text){ var el = document.getElementById(id); if(el) el.textContent = text; }
  function setPlaceholder(id, text){ var el = document.getElementById(id); if(el) el.placeholder = text; }

  function applyTranslations(remoteT){
    T = remoteT || T;
    setText("rs-based-on-label", T.basedOn);
    setText("rs-reviews-word", T.reviewsWord);
    setText("rs-out-of", T.outOf5);
    setText("rs-no-results", T.noResults);
    setText("rs-write-label", T.writeReview);
    setText("rs-form-title", T.writeReview);
    setText("rs-rating-question", T.ratingQuestion);
    setText("rs-review-title-label", T.reviewTitleLabel);
    setPlaceholder("rs-review-title", T.reviewTitlePlaceholder);
    setText("rs-feedback-label", T.feedbackLabel);
    setPlaceholder("rs-comment", T.feedbackPlaceholder);
    setText("rs-upload-label", T.uploadLabel);
    setText("rs-name-label", T.nameLabel);
    setPlaceholder("rs-name", T.namePlaceholder);
    setText("rs-email-label", T.emailLabel);
    setPlaceholder("rs-email", T.emailPlaceholder);
    setText("rs-cancel-btn", T.cancel);
    setText("rs-submit-btn", T.submit);
    if (T.sortOptions) {
      document.querySelectorAll(".rs-sort-option").forEach(function(el){
        var key = el.dataset.sort;
        if (T.sortOptions[key]) el.textContent = T.sortOptions[key];
      });
      var activeOpt = document.querySelector(".rs-sort-option.active");
      setText("rs-sort-btn", (activeOpt ? activeOpt.textContent : T.sortOptions.newest) + " ▾");
    }
  }

  function showToast(message, type){
    var container = document.getElementById("rs-toast-container");
    var toast = document.createElement("div");
    toast.className = "rs-toast" + (type === "error" ? " rs-toast-error" : "");
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function(){ if(toast.parentElement) toast.remove(); }, 3500);
  }

  function escapeHTML(text){
    return String(text || "").replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c];
    });
  }

  function starsHTML(n){
    var s = "";
    for(var i = 1; i <= 5; i++){ s += i <= n ? "★" : '<span class="dim">★</span>'; }
    return s;
  }

  /* ── OPEN / CLOSE FORM ── */
  var openBtn = document.getElementById("rs-open-review");
  if(openBtn){
    openBtn.onclick = function(){
      document.getElementById("rs-review-form").style.display = "block";
      this.style.display = "none";
    };
  }
  function rsCloseReview(){
    var form = document.getElementById("rs-review-form");
    if(form) form.style.display = "none";
    var btn = document.getElementById("rs-open-review");
    if(btn) btn.style.display = "inline-block";
  }
  window.rsCloseReview = rsCloseReview;

  /* ── STAR CLICK ── */
  document.querySelectorAll("#rs-star-rating span").forEach(function(star){
    star.addEventListener("click", function(){
      rating = this.dataset.value;
      document.querySelectorAll("#rs-star-rating span").forEach(function(s, i){ s.classList.toggle("active", i < rating); });
    });
  });

  /* ── FILE PREVIEW ── */
  window.rsPreviewFile = function(event){
    var file = event.target.files[0];
    var preview = document.getElementById("rs-file-preview");
    preview.innerHTML = "";
    if(!file) return;
    var url = URL.createObjectURL(file);
    if(file.type.startsWith("image/")) preview.innerHTML = '<img src="' + url + '">';
    else if(file.type.startsWith("video/")) preview.innerHTML = '<video src="' + url + '" controls></video>';
  };

  /* ── SORT MENU ── */
  window.rsToggleSortMenu = function(){
    var menu = document.getElementById("rs-sort-menu");
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  };
  window.rsSelectSort = function(el){
    document.querySelectorAll(".rs-sort-option").forEach(function(o){ o.classList.remove("active"); });
    el.classList.add("active");
    currentSort = el.dataset.sort;
    document.getElementById("rs-sort-menu").style.display = "none";
    document.getElementById("rs-sort-btn").textContent = el.textContent + " ▾";
    currentPage = 1;
    renderReviews();
  };
  document.addEventListener("click", function(e){
    if(!e.target.closest(".rs-sort-wrap")){
      var menu = document.getElementById("rs-sort-menu");
      if(menu) menu.style.display = "none";
    }
  });

  /* ── BREAKDOWN BARS ── */
  function renderBreakdown(reviews, total){
    var el = document.getElementById("rs-breakdown");
    var html = "";
    [5, 4, 3, 2, 1].forEach(function(n){
      var count = 0;
      for(var i = 0; i < reviews.length; i++){ if(reviews[i].rating === n) count++; }
      var pct = total ? Math.round((count / total) * 100) : 0;
      html += '<div class="rs-breakdown-row">' +
        '<span>' + n + '★</span>' +
        '<div class="rs-bar-track"><div class="rs-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="rs-bar-count">' + count + '</span>' +
      '</div>';
    });
    el.innerHTML = html;
  }

  /* ── CARD MARKUP ── */
  function buildCardHTML(r){
    var date = r.createdAt ? new Date(r.createdAt).toLocaleDateString(storeLocale || undefined, { year: "numeric", month: "2-digit", day: "2-digit" }) : "";
    var verifiedHTML = showVerified ? '<span class="rs-verified-badge">' + escapeHTML(T.verified || "Verified") + '</span>' : "";
    var titleHTML = r.title ? '<div class="rs-card-title">' + escapeHTML(r.title) + '</div>' : "";
    var mediaHTML = "";
    if(r.mediaUrl){
      var src = /^https?:\/\//i.test(r.mediaUrl) ? r.mediaUrl : ("https://trustreviews.kaswebtechsolutions.com" + r.mediaUrl);
      mediaHTML = r.mediaType && r.mediaType.startsWith("video/")
        ? '<div class="rs-card-media"><video src="' + escapeHTML(src) + '" controls></video></div>'
        : '<div class="rs-card-media"><img src="' + escapeHTML(src) + '" alt="Review media"></div>';
    }
    return (
      '<div class="rs-review-card">' +
        '<div class="rs-card-date">' + date + '</div>' +
        '<div class="rs-card-stars">' + starsHTML(r.rating) + '</div>' +
        '<div class="rs-card-head">' +
          '<span class="rs-avatar-icon">👤</span>' +
          '<span class="rs-card-author">' + escapeHTML(r.customer || "Anonymous") + '</span>' +
          verifiedHTML +
        '</div>' +
        titleHTML +
        '<p class="rs-card-comment">' + escapeHTML(r.comment || "") + '</p>' +
        mediaHTML +
      '</div>'
    );
  }

  /* ── PAGINATION (numbered) ── */
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
    var el = document.getElementById("rs-pagination");
    if(totalPages <= 1){ el.style.display = "none"; el.innerHTML = ""; return; }
    el.style.display = "flex";
    var html = '<button class="rs-page-arrow" id="rs-prev-btn" ' + (currentPage <= 1 ? "disabled" : "") + '>&lsaquo;</button>';
    buildPageList(currentPage, totalPages).forEach(function(p){
      html += p === "…"
        ? '<span class="rs-page-ellipsis">…</span>'
        : '<button class="rs-page-num' + (p === currentPage ? " active" : "") + '" data-page="' + p + '">' + p + '</button>';
    });
    html += '<button class="rs-page-arrow" id="rs-next-btn" ' + (currentPage >= totalPages ? "disabled" : "") + '>&rsaquo;</button>';
    el.innerHTML = html;
    document.getElementById("rs-prev-btn").onclick = function(){ goToPage(currentPage - 1); };
    document.getElementById("rs-next-btn").onclick = function(){ goToPage(currentPage + 1); };
    el.querySelectorAll(".rs-page-num").forEach(function(btn){
      btn.onclick = function(){ goToPage(Number(btn.dataset.page)); };
    });
  }

  function goToPage(p){
    currentPage = p;
    renderReviews();
    document.querySelector(".rs-section").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ── RENDER REVIEWS ── */
  function renderReviews(){
    var container = document.getElementById("rs-review-list");
    var noResults = document.getElementById("rs-no-results");

    var sorted = allReviews.slice().sort(function(a, b){
      if(currentSort === "newest")  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if(currentSort === "oldest")  return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if(currentSort === "highest") return b.rating - a.rating;
      if(currentSort === "lowest")  return a.rating - b.rating;
      if(currentSort === "helpful") return (b.likes || 0) - (a.likes || 0);
      return 0;
    });

    if(sorted.length === 0){
      container.innerHTML = "";
      noResults.style.display = "block";
      renderPagination(0);
      return;
    }
    noResults.style.display = "none";

    var totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    if(currentPage > totalPages) currentPage = totalPages;
    var pageItems = sorted.slice((currentPage - 1) * perPage, currentPage * perPage);

    container.innerHTML = pageItems.map(buildCardHTML).join("");
    renderPagination(totalPages);
  }

  function injectStructuredData(avgRating, total, reviews) {
    if (!seoEnabled || !productTitle || !total) return;

    var aggRating = { "@type": "AggregateRating", "ratingValue": avgRating.toFixed(1), "reviewCount": String(total), "bestRating": "5", "worstRating": "1" };
    var reviewItems = reviews.slice(0, 20).map(function(r) {
      return { "@type": "Review", "author": { "@type": "Person", "name": r.customer || "Customer" }, "reviewRating": { "@type": "Rating", "ratingValue": String(r.rating), "bestRating": "5", "worstRating": "1" }, "reviewBody": r.comment || "", "datePublished": r.createdAt ? r.createdAt.split("T")[0] : undefined };
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
        if (arr[ni] && arr[ni]["@type"] === "Product") {
          arr[ni]["aggregateRating"] = aggRating;
          arr[ni]["review"]          = reviewItems;
          matched = true;
          break;
        }
      }
      if (matched) { sc.textContent = JSON.stringify(parsed); return; }
    }

    var sid = 'rs-ld-json';
    if (document.getElementById(sid)) return;
    var schema = { "@context": "https://schema.org/", "@type": "Product", "name": productTitle, "aggregateRating": aggRating, "review": reviewItems };
    var sc2 = document.createElement("script"); sc2.id = sid; sc2.type = "application/ld+json"; sc2.textContent = JSON.stringify(schema); document.head.appendChild(sc2);
  }

  /* ── LOAD REVIEWS ── */
  async function loadReviews(){
    try {
      var res = await fetch("/apps/review?productId=" + encodeURIComponent(productId) + "&locale=" + encodeURIComponent(storeLocale), { credentials: "same-origin", cache: "no-store" });
      if(!res.ok) throw new Error("Unable to load reviews");
      var data = await res.json();
      allReviews = data.reviews || [];
      applyTranslations(data.translations);

      var total = Number(data.total || 0);
      var avg = Number(data.averageRating || 0);
      document.getElementById("rs-avg-rating").textContent = total ? avg.toFixed(1) : "0.0";
      document.getElementById("rs-total-reviews").textContent = total;
      document.getElementById("rs-avg-stars").innerHTML = starsHTML(Math.round(avg));

      renderBreakdown(allReviews, total);
      injectStructuredData(avg, total, allReviews);
      renderReviews();
    } catch(e){
      console.error("Reviews summary load error:", e);
    }
  }

  /* ── SUBMIT REVIEW ── */
  window.rsSubmitReview = async function(){
    var name = document.getElementById("rs-name").value.trim();
    var email = document.getElementById("rs-email").value.trim();
    var comment = document.getElementById("rs-comment").value.trim();
    var title = document.getElementById("rs-review-title").value.trim();
    var file = document.getElementById("rs-review-file")?.files[0];

    if(!name || !email || !comment || rating == 0){
      showToast(T.requiredFieldsAlert, "error");
      return;
    }

    var uploadedFile = null;
    try {
      if(file){
        var fd = new FormData();
        fd.append("file", file);
        var uploadRes = await fetch("/apps/review", { method: "POST", body: fd, credentials: "same-origin", cache: "no-store" });
        uploadedFile = await uploadRes.json();
        if(!uploadedFile.success) throw new Error("File upload failed");
      }

      var payload = {
        email: email, productId: productId, rating: rating, comment: comment, title: title, customer: name,
        mediaUrl: uploadedFile?.url || null, mediaType: uploadedFile?.mediaType || null, fileName: uploadedFile?.fileName || null,
      };

      var response = await fetch("/apps/review", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        credentials: "same-origin", cache: "no-store",
      });
      if(!response.ok) throw new Error("Review submit failed");

      showToast("Review submitted and sent for approval.", "success");
      document.getElementById("rs-name").value = "";
      document.getElementById("rs-email").value = "";
      document.getElementById("rs-comment").value = "";
      document.getElementById("rs-review-title").value = "";
      if(document.getElementById("rs-review-file")) document.getElementById("rs-review-file").value = "";
      var preview = document.getElementById("rs-file-preview");
      if(preview) preview.innerHTML = "";
      rating = 0;
      document.querySelectorAll("#rs-star-rating span").forEach(function(s){ s.classList.remove("active"); });
      rsCloseReview();
      loadReviews();
    } catch(err){
      console.error(err);
      showToast(err.message || "Error submitting review. Please try again.", "error");
    }
  };

  /* ── FORM STYLE (reuses the same admin settings as the Product Review block) ── */
  async function applyFormStyle(){
    try {
      var res = await fetch("/apps/review?type=form-settings", { credentials: "same-origin", cache: "no-store" });
      if(!res.ok) return;
      var data = await res.json();
      var s = data.settings || {};
      if(!section) return;
      section.style.setProperty("--rs-accent-color", s.accentColor || "#6B5BD6");
      section.style.setProperty("--rs-font", s.fontFamily || "inherit");
    } catch(e){
      console.error("Reviews summary style error:", e);
    }
  }

  loadReviews();
  applyFormStyle();
})();
