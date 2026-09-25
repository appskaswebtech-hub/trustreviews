(function () {
  var TRANSLATIONS = {
    en: { verified: 'Verified', noReviews: 'No reviews yet.', couldNotLoad: 'Could not load reviews.', review: 'review', reviews: 'reviews', readReviews: 'Read reviews', reviewsBtn: 'Reviews', close: 'Close', customerReviews: 'Customer Reviews', previous: 'Previous', next: 'Next' }
  };
  var D_COLOR = '#6B1A2C', D_STYLE = 'dark_grid', D_COLS = '3', D_MAX = '6', D_HEADING = 'What our customers say';
  var D_STAR_COLOR = '#F59E0B', D_TEXT_COLOR = '#333333', D_HEADING_COLOR = '#333333', D_MUTED_COLOR = '#888888',
      D_WRITE_BTN_COLOR = '#333333', D_BORDER_COLOR = '#E5E5E5', D_BG_COLOR = '#FFFFFF', D_CARD_BG = '#FFFFFF';

  // Review-reward coupon: after a successful submit the server returns
  // { coupon: { code, message } } when the merchant enabled one (Admin → Review
  // Coupon). The shared popup (assets/coupon-popup.js, next to this file) is
  // only downloaded when there is actually a coupon to show.
  var TR_ASSET_BASE = ((document.currentScript && document.currentScript.src) || '').replace(/[^\/?#]*([?#].*)?$/, '');
  function trShowCoupon(coupon) {
    if (!coupon || !coupon.code) return;
    if (window.TrustReviewsCoupon) return window.TrustReviewsCoupon.show(coupon);
    if (!TR_ASSET_BASE) return;
    var sc = document.createElement('script'); sc.src = TR_ASSET_BASE + 'coupon-popup.js';
    sc.onload = function () { if (window.TrustReviewsCoupon) window.TrustReviewsCoupon.show(coupon); };
    document.head.appendChild(sc);
  }

  function initWidget(widget) {
    if (widget.dataset.trInit) return;
    widget.dataset.trInit = '1';

    var bid         = widget.dataset.blockId || widget.id.replace('trust-reviews-widget-', '');
    var productId   = widget.dataset.productId;
    var shop        = widget.dataset.shop;
    var storeLocale = widget.dataset.locale || '';
    var blockColor  = widget.dataset.color;
    var blockCols   = widget.dataset.columns;
    var blockMax    = widget.dataset.max;
    var blockVerif  = widget.dataset.verified;
    var blockAvatar = widget.dataset.avatar;
    var blockDate   = widget.dataset.date;
    var blockStyle  = widget.dataset.style;
    var blockStarColor    = widget.dataset.starColor;
    var blockTextColor    = widget.dataset.textColor;
    var blockHeadingColor = widget.dataset.headingColor;
    var blockMutedColor   = widget.dataset.mutedColor;
    var blockWriteBtnColor = widget.dataset.writeBtnColor;
    var blockBorderColor  = widget.dataset.borderColor;
    var blockBgColor      = widget.dataset.bgColor;
    var blockCardBg       = widget.dataset.cardBg;
    var widgetKey   = widget.dataset.widgetKey || 'review_widget';
    var seoEnabled  = widget.dataset.seoEnabled !== 'false';
    var productTitle = widget.dataset.productTitle || '';

    var loadingEl = widget.querySelector('.trust-reviews__loading');
    var container = widget.querySelector('.trust-reviews__container');
    var headingEl = widget.querySelector('.trust-reviews__heading');
    var resolvedT = null;

    function starHTML(rating, accent) {
      var out = '';
      for (var i = 0; i < 5; i++) out += '<span class="tr-extensions-product-review-assets-reviews-widget-span-1" style="color:' + (i < rating ? accent : '#ddd') + '">&#9733;</span>';
      return out;
    }
    // Uploaded media is stored as a relative path ("/uploads/x.mp4") served by
    // our app, not the storefront — prefix the app domain. Imported reviews
    // already carry an absolute CDN URL and are left as-is.
    function resolveMedia(url) { return (!url || /^(https?:)?\/\//i.test(url) || url.indexOf('data:') === 0) ? url : 'https://trustreviews.kaswebtechsolutions.com' + url; }
    // Headings nobody typed (block defaults / old French DB default) are swapped for the store-language translation; the merchant's own text is kept.
    function isStockHeading(s){ s=String(s||'').trim().toLowerCase().replace(/[.!\s]+$/,''); return !s||s==='what our customers say'||s==='customer reviews'||s==="ce qu'en disent ceux qui l'ont essayé"; }
    function initials(name) { return (name || 'A').split(' ').map(function(w){ return w[0]; }).join('').toUpperCase().slice(0,2); }
    function fmtDate(iso) { return new Date(iso).toLocaleDateString(storeLocale || undefined, { year:'numeric', month:'short', day:'numeric' }); }
    function mediaHTML(r) {
      if (!r.mediaUrl) return '';
      if ((r.mediaType || '').indexOf('video') === 0) return '<div class="trust-reviews__media"><video class="tr-extensions-product-review-assets-reviews-widget-video-2" src="' + r.mediaUrl + '" controls playsinline></video></div>';
      return '<div class="trust-reviews__media"><img class="tr-extensions-product-review-assets-reviews-widget-img-3" src="' + r.mediaUrl + '" alt="review media" loading="lazy"></div>';
    }

    function buildCard(r, s) {
      var card = document.createElement('div'); card.className = 'trust-reviews__card';
      var avatarHTML   = s.showAvatar   ? '<span class="trust-reviews__avatar" style="background:' + s.accentColor + '">' + initials(r.customer) + '</span>' : '';
      var verifiedHTML = s.showVerified ? '<span class="trust-reviews__verified">' + s.t.verified + '</span>' : '';
      var dateHTML     = (s.showDate && r.createdAt) ? '<span class="tr-extensions-product-review-assets-reviews-widget-span-4">' + fmtDate(r.createdAt) + '</span>' : '';
      var titleHTML    = r.title ? '<p class="trust-reviews__title">' + r.title + '</p>' : '';
      var likeHTML     = '<button class="trust-reviews__like-btn" data-id="' + r.id + '">+1 <span class="like-count">' + (r.likes || 0) + '</span></button>';
      if (s.style === 'editorial') {
        card.innerHTML = avatarHTML + '<div class="trust-reviews__body"><div class="trust-reviews__stars">' + starHTML(r.rating, s.accentColor) + '</div>' + titleHTML + '<p class="trust-reviews__comment">' + r.comment + '</p>' + mediaHTML(r) + '<div class="trust-reviews__meta"><strong class="tr-extensions-product-review-assets-reviews-widget-strong-5">' + r.customer + '</strong>' + verifiedHTML + dateHTML + likeHTML + '</div></div>';
      } else {
        card.innerHTML = '<div class="trust-reviews__stars">' + starHTML(r.rating, s.accentColor) + '</div>' + titleHTML + '<p class="trust-reviews__comment">' + r.comment + '</p>' + mediaHTML(r) + '<div class="trust-reviews__meta">' + avatarHTML + '<strong class="tr-extensions-product-review-assets-reviews-widget-strong-6">' + r.customer + '</strong>' + verifiedHTML + dateHTML + likeHTML + '</div>';
      }
      return card;
    }

    function attachLikes(root) {
      var btns = root.querySelectorAll('.trust-reviews__like-btn');
      for (var i = 0; i < btns.length; i++) {
        (function(btn) {
          btn.addEventListener('click', function() {
            if (btn.disabled) return; btn.disabled = true;
            fetch('/apps/review?shop=' + shop, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ type:'like', id:btn.dataset.id }) })
            .then(function(r){ return r.json(); }).then(function(json){ if (json.success) btn.querySelector('.like-count').textContent = json.review.likes; })
            .catch(function(){}).finally(function(){ btn.disabled = false; });
          });
        })(btns[i]);
      }
    }

    function attachHelpfulVotes(root) {
      function wire(btn, type, countSel) {
        btn.addEventListener('click', function() {
          if (btn.disabled) return; btn.disabled = true;
          fetch('/apps/review?shop=' + shop, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ type:type, id:btn.dataset.id }) })
          .then(function(r){ return r.json(); }).then(function(json){ if (json.success) btn.querySelector(countSel).textContent = type==='like'?json.review.likes:json.review.dislikes; })
          .catch(function(){}).finally(function(){ btn.disabled = false; });
        });
      }
      var upBtns = root.querySelectorAll('.trust-reviews__sl-helpful-up');
      for (var i = 0; i < upBtns.length; i++) wire(upBtns[i], 'like', '.trust-reviews__sl-helpful-count');
      var downBtns = root.querySelectorAll('.trust-reviews__sl-helpful-down');
      for (var j = 0; j < downBtns.length; j++) wire(downBtns[j], 'dislike', '.trust-reviews__sl-helpful-count');
    }

    function buildBadgeStrip(reviews, s, avgRating) {
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__badge-strip';
      var overall = document.createElement('div'); overall.className = 'trust-reviews__badge'; overall.textContent = avgRating.toFixed(1) + ' ' + (s.t.overall || 'Overall');
      wrap.appendChild(overall);
      var items = reviews.slice(0, s.maxRev);
      for (var i = 0; i < items.length; i++) { var b = document.createElement('div'); b.className = 'trust-reviews__badge'; b.textContent = items[i].rating + '/5 ' + items[i].customer; wrap.appendChild(b); }
      return wrap;
    }

    function buildStarSummary(reviews, s, total, avgRating) {
      var wrap = document.createElement('div'), bar = document.createElement('div'); bar.className = 'trust-reviews__summary-bar';
      var starsRow = ''; for (var i=0;i<5;i++) starsRow += '<span class="tr-extensions-product-review-assets-reviews-widget-span-7" style="color:'+(i<Math.round(avgRating)?s.accentColor:'#ddd')+'">&#9733;</span>';
      var barsHTML = '', ns=[5,4,3,2,1];
      for (var ni=0;ni<ns.length;ni++) {
        var n=ns[ni], cnt=0;
        for (var ri=0;ri<reviews.length;ri++) if(reviews[ri].rating===n) cnt++;
        var pct = total ? Math.round(cnt/total*100) : 0;
        barsHTML += '<div class="tr-extensions-product-review-assets-reviews-widget-div-8" style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="tr-extensions-product-review-assets-reviews-widget-span-9" style="width:18px;font-size:.8rem;color:#555">'+n+'</span><div class="tr-extensions-product-review-assets-reviews-widget-div-10" style="flex:1;height:8px;background:#eee;border-radius:4px;overflow:hidden"><div class="tr-extensions-product-review-assets-reviews-widget-div-11" style="width:'+pct+'%;height:100%;background:'+s.accentColor+';border-radius:4px"></div></div><span class="tr-extensions-product-review-assets-reviews-widget-span-12" style="font-size:.8rem;color:#888;width:30px">'+cnt+'</span></div>';
      }
      bar.innerHTML = '<div class="tr-extensions-product-review-assets-reviews-widget-div-13"><div class="trust-reviews__summary-score">'+avgRating.toFixed(1)+'</div><div class="tr-extensions-product-review-assets-reviews-widget-div-14" style="font-size:1.1rem">'+starsRow+'</div><div class="trust-reviews__summary-label">'+total+' '+(total===1?s.t.review:s.t.reviews)+'</div></div><div class="tr-extensions-product-review-assets-reviews-widget-div-15" style="flex:1">'+barsHTML+'</div>';
      wrap.appendChild(bar);
      var grid = document.createElement('div'); grid.className = 'trust-reviews__grid'; grid.style.gridTemplateColumns = 'repeat('+s.columns+',1fr)';
      var items = reviews.slice(0, s.maxRev); for (var j=0;j<items.length;j++) grid.appendChild(buildCard(items[j],s));
      wrap.appendChild(grid); return wrap;
    }

    function buildQuoteFade(reviews, s) {
      var items = reviews.slice(0, s.maxRev);
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__quote-fade-wrap';
      var stage = document.createElement('div'); stage.className = 'trust-reviews__quote-fade'; wrap.appendChild(stage);
      var slides = [], current = 0, total, dotBtns = [];
      for (var i=0;i<items.length;i++) {
        var r=items[i], item=document.createElement('div'); item.className='trust-reviews__quote-fade-item'+(i===0?' active':'');
        item.innerHTML='<div class="trust-reviews__stars">'+starHTML(r.rating,s.accentColor)+'</div><p class="trust-reviews__quote-fade-text">&ldquo;'+r.comment+'&rdquo;</p><div class="trust-reviews__quote-fade-name">'+r.customer+'</div>';
        stage.appendChild(item); slides.push(item);
      }
      total = slides.length;
      function goTo(idx){ current=((idx%total)+total)%total; for(var k=0;k<slides.length;k++) slides[k].classList.toggle('active',k===current); for(var d=0;d<dotBtns.length;d++) dotBtns[d].classList.toggle('active',d===current); }
      if (s.showDots && total>1) {
        var dotsEl=document.createElement('div'); dotsEl.className='trust-reviews__slider-dots';
        for(var j=0;j<total;j++){ (function(idx){ var d=document.createElement('button'); d.className='trust-reviews__dot'+(idx===0?' active':''); d.addEventListener('click',function(){ goTo(idx); }); dotsEl.appendChild(d); dotBtns.push(d); })(j); }
        wrap.appendChild(dotsEl);
      }
      if (s.showArrows && total>1) {
        var arrowRow=document.createElement('div'); arrowRow.className='trust-reviews__slider-arrows';
        var prevBtn=document.createElement('button'), nextBtn=document.createElement('button');
        prevBtn.className=nextBtn.className='trust-reviews__slider-btn'; prevBtn.innerHTML='&#8249;'; nextBtn.innerHTML='&#8250;';
        prevBtn.setAttribute('aria-label',s.t.previous); nextBtn.setAttribute('aria-label',s.t.next);
        prevBtn.addEventListener('click',function(){ goTo(current-1); }); nextBtn.addEventListener('click',function(){ goTo(current+1); });
        arrowRow.appendChild(prevBtn); arrowRow.appendChild(nextBtn); wrap.appendChild(arrowRow);
      }
      if (s.autoplay && total>1) {
        var timer=setInterval(function(){ goTo(current+1); },s.autoplaySpeed);
        wrap.addEventListener('mouseenter',function(){ clearInterval(timer); });
        wrap.addEventListener('mouseleave',function(){ timer=setInterval(function(){ goTo(current+1); },s.autoplaySpeed); });
      }
      return wrap;
    }

    function buildClassicList(reviews, s) {
      var perPage=Math.max(1,s.maxRev), sorted=reviews.slice(), current=0;
      var starCol=s.starColor||'#F59E0B', tAlign=s.textAlign||'left';
      var justify=tAlign==='center'?'center':tAlign==='right'?'flex-end':'flex-start';
      widget.style.setProperty('--tr-list-justify', justify);
      var wrap=document.createElement('div'); wrap.className='trust-reviews__classic-list';
      var sortBar=document.createElement('div'); sortBar.className='trust-reviews__classic-sortbar';
      var sortLabel=document.createElement('span'); sortLabel.className='trust-reviews__classic-sortlabel'; sortLabel.textContent=(s.t.sort||'Sort')+':';
      var sortSel=document.createElement('select'); sortSel.className='trust-reviews__classic-select';
      [['newest',s.t.sortNewest||'Newest'],['highest',s.t.sortHighest||'Highest Rated'],['lowest',s.t.sortLowest||'Lowest Rated']].forEach(function(o){ var opt=document.createElement('option'); opt.value=o[0]; opt.textContent=o[1]; sortSel.appendChild(opt); });
      sortBar.appendChild(sortLabel); sortBar.appendChild(sortSel); wrap.appendChild(sortBar);
      var listEl=document.createElement('div'); listEl.className='trust-reviews__classic-rows';
      var pagEl=document.createElement('div'); pagEl.className='trust-reviews__classic-pagination';
      wrap.appendChild(listEl); wrap.appendChild(pagEl);
      function doSort(mode){ sorted=reviews.slice(); if(mode==='highest') sorted.sort(function(a,b){return b.rating-a.rating;}); else if(mode==='lowest') sorted.sort(function(a,b){return a.rating-b.rating;}); else sorted.sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);}); }
      function renderPage(page) {
        var totalPages=Math.ceil(sorted.length/perPage), pageItems=sorted.slice(page*perPage,page*perPage+perPage);
        listEl.innerHTML='';
        pageItems.forEach(function(r){
          var row=document.createElement('div'); row.className='trust-reviews__classic-row';
          var avatarHTML=s.showAvatar?'<span class="trust-reviews__avatar trust-reviews__classic-avatar" style="background:'+s.accentColor+'">'+initials(r.customer)+'</span>':'';
          var verifiedHTML=s.showVerified?'<span class="trust-reviews__verified">'+(s.t?s.t.verified:'Verified')+'</span>':'';
          var dateHTML=(s.showDate&&r.createdAt)?'<span class="trust-reviews__classic-date">'+fmtDate(r.createdAt)+'</span>':'';
          var titleHTML=r.title?'<p class="trust-reviews__classic-title">'+r.title+'</p>':'';
          row.innerHTML='<div class="trust-reviews__classic-meta-row">'+avatarHTML+'<strong class="trust-reviews__classic-name">'+r.customer+'</strong><span class="trust-reviews__classic-stars-inline">'+starHTML(r.rating,starCol)+'</span>'+verifiedHTML+dateHTML+'</div>'+titleHTML+'<p class="trust-reviews__classic-comment">'+r.comment+'</p>';
          listEl.appendChild(row);
        });
        pagEl.innerHTML=''; if(totalPages<=1) return;
        function mkBtn(label,pg,isActive,isDisabled){ var btn=document.createElement('button'); btn.className='trust-reviews__classic-pg-btn'+(isActive?' tr-active':''); btn.textContent=label; btn.disabled=isDisabled; if(!isDisabled) btn.addEventListener('click',function(){ current=pg; renderPage(current); }); return btn; }
        pagEl.appendChild(mkBtn('‹',current-1,false,current===0));
        var startP=Math.max(0,current-2), endP=Math.min(totalPages-1,startP+4); if(endP-startP<4) startP=Math.max(0,endP-4);
        for(var p=startP;p<=endP;p++) pagEl.appendChild(mkBtn(p+1,p,p===current,false));
        pagEl.appendChild(mkBtn('›',current+1,false,current===totalPages-1));
        pagEl.appendChild(mkBtn('»',totalPages-1,false,current===totalPages-1));
      }
      doSort('newest'); renderPage(0);
      sortSel.addEventListener('change',function(){ current=0; doSort(sortSel.value); renderPage(0); });
      return wrap;
    }

    function buildSummaryList(reviews, s, total, avgRating) {
      var pos=s.summaryPosition||'left', starCol=s.starColor||'#F59E0B';
      var outer=document.createElement('div');

      var header=document.createElement('div'); header.className='trust-reviews__sl-header';
      var headerLeft=document.createElement('div');
      var labelEl=document.createElement('div'); labelEl.className='trust-reviews__sl-label'; labelEl.textContent=(s.t.customerReviews||'Customer reviews');
      var headEl=document.createElement('div'); headEl.className='trust-reviews__sl-heading'; headEl.textContent=s.heading||'What our customers say';
      headerLeft.appendChild(labelEl); headerLeft.appendChild(headEl);

      var slRating=0;
      var slOverlay=document.createElement('div');
      slOverlay.id='tr-sl-modal-'+bid;
      slOverlay.style.cssText='display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);align-items:center;justify-content:center;padding:16px';
      var slModal=document.createElement('div');
      slModal.style.cssText='background:#fff;border-radius:14px;padding:28px 28px 24px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.25)';
      slModal.innerHTML=
        '<button class="tr-extensions-product-review-assets-reviews-widget-button-16" id="tr-sl-close-'+bid+'" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#888;line-height:1">&times;</button>'+
        '<h3 class="tr-extensions-product-review-assets-reviews-widget-h3-17" style="margin:0 0 20px;font-size:1.2rem;font-weight:700;color:'+s.accentColor+'">'+(s.t.writeReview||'Write a Review')+'</h3>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-18" style="margin-bottom:16px"><label class="tr-extensions-product-review-assets-reviews-widget-label-19" style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">'+(s.t.ratingQuestion||'Your Rating')+' <span class="tr-extensions-product-review-assets-reviews-widget-span-20" style="color:red">*</span></label>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-21" id="tr-sl-stars-'+bid+'" style="display:flex;gap:6px;cursor:pointer">'+
        '<span class="tr-extensions-product-review-assets-reviews-widget-span-22" data-v="1" style="font-size:28px;color:#ddd">&#9733;</span><span class="tr-extensions-product-review-assets-reviews-widget-span-23" data-v="2" style="font-size:28px;color:#ddd">&#9733;</span><span class="tr-extensions-product-review-assets-reviews-widget-span-24" data-v="3" style="font-size:28px;color:#ddd">&#9733;</span><span class="tr-extensions-product-review-assets-reviews-widget-span-25" data-v="4" style="font-size:28px;color:#ddd">&#9733;</span><span class="tr-extensions-product-review-assets-reviews-widget-span-26" data-v="5" style="font-size:28px;color:#ddd">&#9733;</span></div></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-27" style="margin-bottom:14px"><label class="tr-extensions-product-review-assets-reviews-widget-label-28" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">'+(s.t.reviewTitleLabel||'Review title')+'</label><input class="tr-extensions-product-review-assets-reviews-widget-input-29" id="tr-sl-title-'+bid+'" type="text" placeholder="'+(s.t.reviewTitlePlaceholder||'Summarize your experience...')+'" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box"></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-30" style="margin-bottom:14px"><label class="tr-extensions-product-review-assets-reviews-widget-label-31" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">'+(s.t.feedbackLabel||'Your review')+' <span class="tr-extensions-product-review-assets-reviews-widget-span-32" style="color:red">*</span></label><textarea class="tr-extensions-product-review-assets-reviews-widget-textarea-33" id="tr-sl-comment-'+bid+'" placeholder="'+(s.t.feedbackPlaceholder||'Share your experience...')+'" rows="4" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;resize:vertical"></textarea></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-34" style="margin-bottom:14px"><label class="tr-extensions-product-review-assets-reviews-widget-label-35" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">'+(s.t.uploadLabel||'Upload image/video')+' <span class="tr-extensions-product-review-assets-reviews-widget-span-36" style="font-weight:400;color:#888">(optional)</span></label>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-37" id="tr-sl-dropzone-'+bid+'" style="border:2px dashed #d1d5db;border-radius:10px;padding:24px 16px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;background:#fafafa;position:relative">'+
        '<input class="tr-extensions-product-review-assets-reviews-widget-input-38" id="tr-sl-file-'+bid+'" type="file" accept="image/*,video/*" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%">'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-39" id="tr-sl-dz-content-'+bid+'"><svg class="tr-extensions-product-review-assets-reviews-widget-svg-40" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 8px;display:block"><path class="tr-extensions-product-review-assets-reviews-widget-path-41" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline class="tr-extensions-product-review-assets-reviews-widget-polyline-42" points="17 8 12 3 7 8"/><line class="tr-extensions-product-review-assets-reviews-widget-line-43" x1="12" y1="3" x2="12" y2="15"/></svg><p class="tr-extensions-product-review-assets-reviews-widget-p-44" style="margin:0 0 4px;font-size:13px;font-weight:600;color:#374151">Click to upload or drag & drop</p><p class="tr-extensions-product-review-assets-reviews-widget-p-45" style="margin:0;font-size:12px;color:#9ca3af">Images or videos — max 20 MB</p></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-46" id="tr-sl-preview-'+bid+'" style="display:none;position:relative"><button class="tr-extensions-product-review-assets-reviews-widget-button-47" id="tr-sl-remove-'+bid+'" type="button" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;background:#ef4444;color:#fff;border:none;font-size:14px;line-height:1;cursor:pointer;z-index:1;display:flex;align-items:center;justify-content:center">&times;</button><div class="tr-extensions-product-review-assets-reviews-widget-div-48" id="tr-sl-preview-media-'+bid+'"></div><p class="tr-extensions-product-review-assets-reviews-widget-p-49" id="tr-sl-preview-name-'+bid+'" style="margin:8px 0 0;font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></p></div></div></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-50" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px"><div class="tr-extensions-product-review-assets-reviews-widget-div-51"><label class="tr-extensions-product-review-assets-reviews-widget-label-52" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">'+(s.t.nameLabel||'Your name')+' <span class="tr-extensions-product-review-assets-reviews-widget-span-53" style="color:red">*</span></label><input class="tr-extensions-product-review-assets-reviews-widget-input-54" id="tr-sl-name-'+bid+'" type="text" placeholder="'+(s.t.namePlaceholder||'Name')+'" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box"></div><div class="tr-extensions-product-review-assets-reviews-widget-div-55"><label class="tr-extensions-product-review-assets-reviews-widget-label-56" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">'+(s.t.emailLabel||'Email')+' <span class="tr-extensions-product-review-assets-reviews-widget-span-57" style="color:red">*</span></label><input class="tr-extensions-product-review-assets-reviews-widget-input-58" id="tr-sl-email-'+bid+'" type="email" placeholder="'+(s.t.emailPlaceholder||'Email')+'" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box"></div></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-59" id="tr-sl-msg-'+bid+'" style="display:none;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:12px"></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-60" style="display:flex;gap:10px;justify-content:flex-end"><button class="tr-extensions-product-review-assets-reviews-widget-button-61" id="tr-sl-cancel-'+bid+'" style="padding:10px 20px;background:#f5f5f5;color:#333;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">'+(s.t.cancel||'Cancel')+'</button><button class="tr-extensions-product-review-assets-reviews-widget-button-62" id="tr-sl-submit-'+bid+'" style="padding:10px 24px;background:'+s.accentColor+';color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">'+(s.t.submitReview||'Submit Review')+'</button></div>';
      slOverlay.appendChild(slModal);
      document.body.appendChild(slOverlay);

      var slFileInput=slModal.querySelector('#tr-sl-file-'+bid), slDropzone=slModal.querySelector('#tr-sl-dropzone-'+bid);
      var slDzContent=slModal.querySelector('#tr-sl-dz-content-'+bid), slPreview=slModal.querySelector('#tr-sl-preview-'+bid);
      var slPreviewMedia=slModal.querySelector('#tr-sl-preview-media-'+bid), slPreviewName=slModal.querySelector('#tr-sl-preview-name-'+bid);
      var slRemoveBtn=slModal.querySelector('#tr-sl-remove-'+bid);

      function slShowPreview(file) {
        var url=URL.createObjectURL(file); slPreviewMedia.innerHTML='';
        var el;
        if(file.type.indexOf('video')===0){ el=document.createElement('video'); el.src=url; el.controls=true; el.style.cssText='max-width:100%;max-height:160px;border-radius:8px;display:block;margin:0 auto'; }
        else { el=document.createElement('img'); el.src=url; el.alt='preview'; el.style.cssText='max-width:100%;max-height:160px;border-radius:8px;display:block;margin:0 auto;object-fit:cover'; }
        slPreviewMedia.appendChild(el); slPreviewName.textContent=file.name;
        slDzContent.style.display='none'; slPreview.style.display='block';
        slDropzone.style.borderColor=s.accentColor; slDropzone.style.background='#f0fdf4';
      }
      function slClearPreview() {
        slPreviewMedia.innerHTML=''; slPreviewName.textContent=''; slPreview.style.display='none';
        slDzContent.style.display='block'; slDropzone.style.borderColor='#d1d5db'; slDropzone.style.background='#fafafa'; slFileInput.value='';
      }
      function slOpen()  { slOverlay.style.display='flex'; document.body.style.overflow='hidden'; }
      function slClose() { slOverlay.style.display='none'; document.body.style.overflow=''; slClearPreview(); }

      slFileInput.addEventListener('change', function(){ if(slFileInput.files[0]) slShowPreview(slFileInput.files[0]); });
      slDropzone.addEventListener('dragover', function(e){ e.preventDefault(); slDropzone.style.borderColor=s.accentColor; slDropzone.style.background='#f5f3ff'; });
      slDropzone.addEventListener('dragleave', function(){ if(!slFileInput.files[0]){ slDropzone.style.borderColor='#d1d5db'; slDropzone.style.background='#fafafa'; } });
      slDropzone.addEventListener('drop', function(e){ e.preventDefault(); var file=e.dataTransfer.files[0]; if(!file) return; try{ var dt=new DataTransfer(); dt.items.add(file); slFileInput.files=dt.files; }catch(err){} slShowPreview(file); });
      slRemoveBtn.addEventListener('click', function(e){ e.stopPropagation(); slClearPreview(); });
      slModal.querySelector('#tr-sl-close-'+bid).addEventListener('click', slClose);
      slModal.querySelector('#tr-sl-cancel-'+bid).addEventListener('click', slClose);
      slOverlay.addEventListener('click', function(e){ if(e.target===slOverlay) slClose(); });

      var slStarSpans=slModal.querySelectorAll('#tr-sl-stars-'+bid+' span');
      function slPaintStars(n){ slStarSpans.forEach(function(sp,i){ sp.style.color=i<n?(s.starColor||'#F59E0B'):'#ddd'; }); }
      slStarSpans.forEach(function(sp){
        sp.addEventListener('mouseover',function(){ slPaintStars(parseInt(sp.dataset.v)); });
        sp.addEventListener('mouseout', function(){ slPaintStars(slRating); });
        sp.addEventListener('click',    function(){ slRating=parseInt(sp.dataset.v); slPaintStars(slRating); });
      });

      function slMsg(text,ok){ var el=slModal.querySelector('#tr-sl-msg-'+bid); el.textContent=text; el.style.display='block'; el.style.background=ok?'#dcfce7':'#fee2e2'; el.style.color=ok?'#166534':'#991b1b'; }

      slModal.querySelector('#tr-sl-submit-'+bid).addEventListener('click', function() {
        var name=slModal.querySelector('#tr-sl-name-'+bid).value.trim();
        var email=slModal.querySelector('#tr-sl-email-'+bid).value.trim();
        var comment=slModal.querySelector('#tr-sl-comment-'+bid).value.trim();
        var title=slModal.querySelector('#tr-sl-title-'+bid).value.trim();
        var submitBtn=this;
        if(!name||!email||!comment||slRating===0){ slMsg(s.t.submitRequired||'Please fill in all required fields and select a star rating.',false); return; }
        submitBtn.disabled=true; submitBtn.textContent=(s.t.submitting||'Submitting…');
        var file=slFileInput.files[0], uploadPromise;
        if(file){
          submitBtn.textContent=(s.t.uploadingPhoto||'Uploading…');
          var fd=new FormData(); fd.append('file',file);
          uploadPromise=fetch('/apps/review',{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(j){ if(!j.success) throw new Error('File upload failed'); return {mediaUrl:j.url,mediaType:j.mediaType,fileName:j.fileName}; });
        } else { uploadPromise=Promise.resolve({mediaUrl:null,mediaType:null,fileName:null}); }
        uploadPromise.then(function(media){
          submitBtn.textContent=(s.t.submitting||'Submitting…');
          return fetch('/apps/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,productId:productId,rating:slRating,comment:comment,title:title,customer:name,shop:shop,mediaUrl:media.mediaUrl,mediaType:media.mediaType,fileName:media.fileName})}).then(function(r){return r.json();});
        }).then(function(json){
          if(json.success===false) throw new Error(json.error||'Submission failed');
          slMsg(s.t.submitSuccess||'Thank you! Your review has been submitted for approval.',true);
          slModal.querySelector('#tr-sl-name-'+bid).value=''; slModal.querySelector('#tr-sl-email-'+bid).value='';
          slModal.querySelector('#tr-sl-comment-'+bid).value=''; slModal.querySelector('#tr-sl-title-'+bid).value='';
          slClearPreview(); slRating=0; slPaintStars(0); submitBtn.disabled=false; submitBtn.textContent=(s.t.submitReview||'Submit Review');
          if(json.coupon&&json.coupon.code){ slClose(); trShowCoupon(json.coupon); } else setTimeout(slClose,2500);
        }).catch(function(err){ slMsg(err.message||'Something went wrong. Please try again.',false); submitBtn.disabled=false; submitBtn.textContent=(s.t.submitReview||'Submit Review'); });
      });

      var writeBtn=document.createElement('button'); writeBtn.className='trust-reviews__sl-write-btn'; writeBtn.textContent=(s.t.writeReview||'Write a review');
      writeBtn.addEventListener('click', slOpen);
      header.appendChild(headerLeft); header.appendChild(writeBtn);
      outer.appendChild(header);

      var layout=document.createElement('div'); layout.className='trust-reviews__sl-layout'; layout.setAttribute('data-pos',pos);
      var panel=document.createElement('div'); panel.className='trust-reviews__sl-panel';
      var scoreEl=document.createElement('div'); scoreEl.className='trust-reviews__sl-big-score'; scoreEl.textContent=avgRating.toFixed(1);
      var starsRowEl=document.createElement('div'); starsRowEl.className='trust-reviews__sl-stars-row'; starsRowEl.innerHTML=starHTML(Math.round(avgRating),starCol);
      var countEl=document.createElement('div'); countEl.className='trust-reviews__sl-count'; countEl.textContent=(s.t.basedOn||'Based on')+' '+total+' '+(total===1?(s.t.review||'review'):(s.t.reviews||'reviews'));
      panel.appendChild(scoreEl); panel.appendChild(starsRowEl); panel.appendChild(countEl);
      var ns=[5,4,3,2,1];
      for(var ni=0;ni<ns.length;ni++){
        var n=ns[ni],cnt=0;
        for(var ri=0;ri<reviews.length;ri++) if(reviews[ri].rating===n) cnt++;
        var pct=total?Math.round(cnt/total*100):0;
        var barRow=document.createElement('div'); barRow.className='trust-reviews__sl-bar-row';
        barRow.innerHTML='<span class="trust-reviews__sl-bar-n">'+n+'</span><span class="trust-reviews__sl-bar-star">&#9733;</span><div class="trust-reviews__sl-bar-track"><div class="trust-reviews__sl-bar-fill" style="width:'+pct+'%"></div></div><span class="trust-reviews__sl-bar-ct">'+cnt+'</span>';
        panel.appendChild(barRow);
      }
      var listDiv=document.createElement('div'); listDiv.className='trust-reviews__sl-reviews';
      var pagDiv=document.createElement('div'); pagDiv.className='trust-reviews__sl-pagination';
      var slPerPage=s.maxRev, slPage=0;
      function slRenderPage(page){
        var start=page*slPerPage, pageItems=reviews.slice(start,start+slPerPage);
        listDiv.innerHTML='';
        if(!pageItems.length){ listDiv.innerHTML='<p class="tr-extensions-product-review-assets-reviews-widget-p-63" style="color:var(--tr-muted,#888);font-size:.9rem;padding:12px 0">'+(s.t.noReviews||'No reviews yet. Be the first to write one!')+'</p>'; }
        for(var si=0;si<pageItems.length;si++){
          var r=pageItems[si], row=document.createElement('div'); row.className='trust-reviews__sl-review-row';
          var avatarHTML2=s.showAvatar?'<span class="trust-reviews__sl-row-avatar" style="background:'+s.accentColor+'">'+initials(r.customer)+'</span>':'';
          var verifiedHTML2=s.showVerified?'<span class="trust-reviews__verified">'+(s.t?s.t.verified:'Verified')+'</span>':'';
          var dateHTML2=(s.showDate&&r.createdAt)?'<span class="trust-reviews__sl-row-date">'+fmtDate(r.createdAt)+'</span>':'';
          var titleHTML2=r.title?'<p class="trust-reviews__sl-row-title">'+r.title+'</p>':'';
          var helpfulHTML2=s.showHelpfulVoting?('<div class="trust-reviews__sl-helpful">'+
            '<span class="trust-reviews__sl-helpful-label">'+(s.t.helpfulQuestion||'Was this review helpful?')+'</span>'+
            '<button class="trust-reviews__sl-helpful-btn trust-reviews__sl-helpful-up" data-id="'+r.id+'" aria-label="'+(s.t.helpful||'Helpful')+'">👍 <span class="trust-reviews__sl-helpful-count">'+(r.likes||0)+'</span></button>'+
            '<button class="trust-reviews__sl-helpful-btn trust-reviews__sl-helpful-down" data-id="'+r.id+'" aria-label="'+(s.t.notHelpful||'Not helpful')+'">👎 <span class="trust-reviews__sl-helpful-count">'+(r.dislikes||0)+'</span></button>'+
          '</div>'):'';
          var mediaHTML2='';
          if(r.mediaUrl){
            if((r.mediaType||'').indexOf('video')===0){
              mediaHTML2='<div class="trust-reviews__sl-row-media"><video class="tr-extensions-product-review-assets-reviews-widget-video-64" src="'+r.mediaUrl+'" controls playsinline style="max-width:100%;max-height:220px;border-radius:8px;margin-top:8px"></video></div>';
            } else {
              mediaHTML2='<div class="trust-reviews__sl-row-media"><img class="tr-extensions-product-review-assets-reviews-widget-img-65" src="'+r.mediaUrl+'" alt="review media" loading="lazy" style="max-width:100%;max-height:220px;border-radius:8px;margin-top:8px;object-fit:cover"></div>';
            }
          }
          row.innerHTML='<div class="trust-reviews__sl-row-head"><span class="trust-reviews__sl-row-stars">'+starHTML(r.rating,starCol)+'</span>'+dateHTML2+'</div>'+titleHTML2+'<p class="trust-reviews__sl-row-comment">'+r.comment+'</p>'+mediaHTML2+'<div class="trust-reviews__sl-row-meta">'+avatarHTML2+'<span class="trust-reviews__sl-row-name">'+r.customer+'</span>'+verifiedHTML2+'</div>'+helpfulHTML2;
          listDiv.appendChild(row);
        }
        attachLikes(listDiv);
        attachHelpfulVotes(listDiv);
        var totalPages=Math.ceil(reviews.length/slPerPage);
        pagDiv.innerHTML='';
        if(totalPages<=1) return;
        function mkPagBtn(label,pg,isActive,isDisabled){
          var btn=document.createElement('button'); btn.className='trust-reviews__sl-pg-btn'+(isActive?' tr-active':'');
          btn.textContent=label; btn.disabled=isDisabled;
          if(!isDisabled) btn.addEventListener('click',function(){ slPage=pg; slRenderPage(slPage); pagDiv.scrollIntoView({behavior:'smooth',block:'nearest'}); });
          return btn;
        }
        pagDiv.appendChild(mkPagBtn('‹',slPage-1,false,slPage===0));
        var startP=Math.max(0,slPage-2), endP=Math.min(totalPages-1,startP+4);
        if(endP-startP<4) startP=Math.max(0,endP-4);
        for(var p=startP;p<=endP;p++) pagDiv.appendChild(mkPagBtn(p+1,p,p===slPage,false));
        pagDiv.appendChild(mkPagBtn('›',slPage+1,false,slPage===totalPages-1));
      }
      slRenderPage(0);
      layout.appendChild(panel);
      var rightCol=document.createElement('div'); rightCol.style.flex='1'; rightCol.style.minWidth='0';
      rightCol.appendChild(listDiv); rightCol.appendChild(pagDiv);
      layout.appendChild(rightCol); outer.appendChild(layout);
      return outer;
    }

    function buildFloatingTab(reviews, s) {
      var tab=document.createElement('div'); tab.className='trust-reviews__floating-tab'; tab.textContent='★ '+(s.t?s.t.reviewsBtn:'Reviews'); tab.style.background=s.accentColor;
      var panel=document.createElement('div'); panel.className='trust-reviews__floating-panel';
      var closeBtn=document.createElement('button'); closeBtn.className='trust-reviews__floating-close'; closeBtn.setAttribute('aria-label',s.t?s.t.close:'Close'); closeBtn.innerHTML='&times;';
      var grid=document.createElement('div'); grid.className='trust-reviews__grid';
      var items=reviews.slice(0,s.maxRev); for(var i=0;i<items.length;i++) grid.appendChild(buildCard(items[i],s));
      panel.appendChild(closeBtn); panel.appendChild(grid);
      document.body.appendChild(panel); document.body.appendChild(tab);
      tab.addEventListener('click',function(){ panel.classList.add('open'); });
      closeBtn.addEventListener('click',function(){ panel.classList.remove('open'); });
      attachLikes(panel);
      return document.createElement('div');
    }

    function setupPopup(reviews, s) {
      if(!s.popupEnabled) return;
      var fab=document.getElementById('trust-reviews-popup-btn-'+bid);
      var overlay=document.getElementById('trust-reviews-popup-'+bid);
      if(!fab||!overlay) return;
      var body=overlay.querySelector('.trust-reviews__popup-body');
      var closeBtn=overlay.querySelector('.trust-reviews__popup-close');
      var titleEl=overlay.querySelector('.trust-reviews__popup-title');
      if(titleEl){ titleEl.style.color=s.accentColor; titleEl.textContent=s.t.customerReviews||'Customer Reviews'; }
      fab.style.background=s.accentColor; fab.style.display='block'; fab.textContent=s.t.reviewsBtn||'Reviews';
      var grid=document.createElement('div'); grid.className='trust-reviews__grid'; grid.style.gridTemplateColumns='1fr';
      var items=reviews.slice(0,s.maxRev); for(var i=0;i<items.length;i++) grid.appendChild(buildCard(items[i],s));
      body.appendChild(grid); attachLikes(body);
      function openPopup()  { overlay.style.display='flex'; document.body.style.overflow='hidden'; }
      function closePopup() { overlay.style.display='none'; document.body.style.overflow=''; }
      fab.addEventListener('click',openPopup);
      if(closeBtn) closeBtn.addEventListener('click',closePopup);
      overlay.addEventListener('click',function(e){ if(e.target===overlay) closePopup(); });
    }

    function applyVars(s) {
      widget.style.setProperty('--tr-accent',s.accentColor); widget.style.setProperty('--tr-bg',s.backgroundColor);
      widget.style.setProperty('--tr-card-bg',s.cardBackground); widget.style.setProperty('--tr-text',s.textColor);
      widget.style.setProperty('--tr-border',s.borderColor); widget.style.setProperty('--tr-font',s.fontFamily);
      widget.style.setProperty('--tr-h-size',s.headingSize+'px'); widget.style.setProperty('--tr-rev-size',s.reviewSize+'px');
      widget.style.setProperty('--tr-meta-size',s.metaSize+'px'); widget.style.setProperty('--tr-pt',s.paddingTop+'px');
      widget.style.setProperty('--tr-pb',s.paddingBottom+'px'); widget.style.setProperty('--tr-card-pad',s.cardPadding+'px');
      widget.style.setProperty('--tr-gap',s.cardGap+'px'); widget.style.setProperty('--tr-radius',s.borderRadius+'px');
      widget.style.setProperty('--tr-shadow',s.showShadow?'0 2px 12px rgba(0,0,0,.08)':'none');
      widget.style.setProperty('--tr-star-color',s.starColor||'#F59E0B');
      widget.style.setProperty('--tr-star-size',(s.reviewSize||16)+'px');
      widget.style.setProperty('--tr-star-gap',(s.starGap!=null?s.starGap:2)+'px');
      widget.style.setProperty('--tr-text-align',s.textAlign||'left');
      widget.style.setProperty('--tr-muted',s.mutedTextColor||'#888888');
      if(s.headingColor) widget.style.setProperty('--tr-heading-color',s.headingColor); else widget.style.removeProperty('--tr-heading-color');
      widget.style.setProperty('--tr-write-btn-color',s.writeBtnColor||s.textColor||'#333333');
      widget.style.setProperty('--tr-cols',String(s.columns)); widget.style.setProperty('--tr-cols-tablet',String(s.tabletColumns));
      widget.style.setProperty('--tr-cols-mobile',String(s.mobileColumns));
      if(headingEl) headingEl.style.color=s.headingColor||s.accentColor;
      widget.setAttribute('data-style',s.style);
    }

    function buildPMCard(r,s){
      var card=document.createElement('div');
      card.className='trust-reviews__pm-card';
      var starsHtml='';
      for(var si=0;si<5;si++) starsHtml+='<span class="tr-extensions-product-review-assets-reviews-widget-span-66" style="color:'+(si<(r.rating||0)?s.accentColor:'#ddd')+'">&#9733;</span>';
      var ini=(r.customer||'A').split(' ').map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2);
      var imgHtml=r.mediaUrl&&(r.mediaType||'').indexOf('video')!==0
        ?'<img class="trust-reviews__pm-card-img" src="'+r.mediaUrl+'" alt="review photo" loading="lazy">'
        :'';
      card.innerHTML=
        imgHtml+
        '<div class="trust-reviews__pm-card-body">'+
          '<div class="trust-reviews__pm-card-stars">'+starsHtml+'</div>'+
          '<div class="trust-reviews__pm-card-meta">'+
            '<div class="trust-reviews__pm-avatar">'+
              '<div class="trust-reviews__pm-avatar-circle">'+ini+'</div>'+
              '<div class="trust-reviews__pm-avatar-dot"></div>'+
            '</div>'+
            '<span class="trust-reviews__pm-card-name">'+(r.customer||'Customer')+'</span>'+
          '</div>'+
          '<div class="trust-reviews__pm-card-text pm-clamped">'+(r.comment||'')+'</div>'+
          '<button class="trust-reviews__pm-show-more">'+(s.t.showFullReview||'Show full review')+'</button>'+
        '</div>';
      var showMore=card.querySelector('.trust-reviews__pm-show-more');
      var textEl=card.querySelector('.trust-reviews__pm-card-text');
      showMore.addEventListener('click',function(){
        var clamped=textEl.classList.toggle('pm-clamped');
        showMore.textContent=clamped?(s.t.showFullReview||'Show full review'):(s.t.showLess||'Show less');
      });
      return card;
    }

    function buildPhotoMasonry(reviews,s,total,avgRating){
      var dist=[0,0,0,0,0];
      for(var ri=0;ri<reviews.length;ri++){ var rv=Math.round(reviews[ri].rating||0); if(rv>=1&&rv<=5) dist[rv-1]++; }
      var photos=[];
      for(var ri=0;ri<reviews.length;ri++){ if(reviews[ri].mediaUrl&&(reviews[ri].mediaType||'').indexOf('video')!==0) photos.push(reviews[ri].mediaUrl); }
      var wrap=document.createElement('div');

      /* ── Write-review modal ── */
      var pmRating=0;
      var pmOverlay=document.createElement('div');
      pmOverlay.style.cssText='display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);align-items:center;justify-content:center;padding:16px';
      var pmModal=document.createElement('div');
      pmModal.style.cssText='background:#fff;border-radius:14px;padding:28px 28px 24px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.25)';
      pmModal.innerHTML=
        '<button class="tr-extensions-product-review-assets-reviews-widget-button-67" id="tr-pm-close-'+bid+'" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#888;line-height:1">&times;</button>'+
        '<h3 class="tr-extensions-product-review-assets-reviews-widget-h3-68" style="margin:0 0 20px;font-size:1.2rem;font-weight:700;color:'+s.accentColor+'">'+(s.t.writeReview||'Write a Review')+'</h3>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-69" style="margin-bottom:16px"><label class="tr-extensions-product-review-assets-reviews-widget-label-70" style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">'+(s.t.ratingQuestion||'Your Rating')+' <span class="tr-extensions-product-review-assets-reviews-widget-span-71" style="color:red">*</span></label>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-72" id="tr-pm-stars-'+bid+'" style="display:flex;gap:6px;cursor:pointer"><span class="tr-extensions-product-review-assets-reviews-widget-span-73" data-v="1" style="font-size:28px;color:#ddd">&#9733;</span><span class="tr-extensions-product-review-assets-reviews-widget-span-74" data-v="2" style="font-size:28px;color:#ddd">&#9733;</span><span class="tr-extensions-product-review-assets-reviews-widget-span-75" data-v="3" style="font-size:28px;color:#ddd">&#9733;</span><span class="tr-extensions-product-review-assets-reviews-widget-span-76" data-v="4" style="font-size:28px;color:#ddd">&#9733;</span><span class="tr-extensions-product-review-assets-reviews-widget-span-77" data-v="5" style="font-size:28px;color:#ddd">&#9733;</span></div></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-78" style="margin-bottom:14px"><label class="tr-extensions-product-review-assets-reviews-widget-label-79" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">'+(s.t.reviewTitleLabel||'Review title')+'</label><input class="tr-extensions-product-review-assets-reviews-widget-input-80" id="tr-pm-title-'+bid+'" type="text" placeholder="'+(s.t.reviewTitlePlaceholder||'Summarize your experience...')+'" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box"></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-81" style="margin-bottom:14px"><label class="tr-extensions-product-review-assets-reviews-widget-label-82" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">'+(s.t.feedbackLabel||'Your review')+' <span class="tr-extensions-product-review-assets-reviews-widget-span-83" style="color:red">*</span></label><textarea class="tr-extensions-product-review-assets-reviews-widget-textarea-84" id="tr-pm-comment-'+bid+'" placeholder="'+(s.t.feedbackPlaceholder||'Share your experience...')+'" rows="4" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;resize:vertical"></textarea></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-85" style="margin-bottom:14px"><label class="tr-extensions-product-review-assets-reviews-widget-label-86" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">'+(s.t.uploadLabel||'Upload image/video')+' <span class="tr-extensions-product-review-assets-reviews-widget-span-87" style="font-weight:400;color:#888">(optional)</span></label>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-88" id="tr-pm-dropzone-'+bid+'" style="border:2px dashed #d1d5db;border-radius:10px;padding:24px 16px;text-align:center;cursor:pointer;background:#fafafa;position:relative">'+
        '<input class="tr-extensions-product-review-assets-reviews-widget-input-89" id="tr-pm-file-'+bid+'" type="file" accept="image/*,video/*" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%">'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-90" id="tr-pm-dz-content-'+bid+'"><p class="tr-extensions-product-review-assets-reviews-widget-p-91" style="margin:0 0 4px;font-size:13px;font-weight:600;color:#374151">Click to upload or drag &amp; drop</p><p class="tr-extensions-product-review-assets-reviews-widget-p-92" style="margin:0;font-size:12px;color:#9ca3af">Images or videos &mdash; max 20 MB</p></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-93" id="tr-pm-preview-'+bid+'" style="display:none;position:relative"><button class="tr-extensions-product-review-assets-reviews-widget-button-94" id="tr-pm-remove-'+bid+'" type="button" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;background:#ef4444;color:#fff;border:none;font-size:14px;cursor:pointer;z-index:1">&times;</button><div class="tr-extensions-product-review-assets-reviews-widget-div-95" id="tr-pm-preview-media-'+bid+'"></div><p class="tr-extensions-product-review-assets-reviews-widget-p-96" id="tr-pm-preview-name-'+bid+'" style="margin:8px 0 0;font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></p></div></div></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-97" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px"><div class="tr-extensions-product-review-assets-reviews-widget-div-98"><label class="tr-extensions-product-review-assets-reviews-widget-label-99" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">'+(s.t.nameLabel||'Your name')+' <span class="tr-extensions-product-review-assets-reviews-widget-span-100" style="color:red">*</span></label><input class="tr-extensions-product-review-assets-reviews-widget-input-101" id="tr-pm-name-'+bid+'" type="text" placeholder="'+(s.t.namePlaceholder||'Name')+'" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box"></div><div class="tr-extensions-product-review-assets-reviews-widget-div-102"><label class="tr-extensions-product-review-assets-reviews-widget-label-103" style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">'+(s.t.emailLabel||'Email')+' <span class="tr-extensions-product-review-assets-reviews-widget-span-104" style="color:red">*</span></label><input class="tr-extensions-product-review-assets-reviews-widget-input-105" id="tr-pm-email-'+bid+'" type="email" placeholder="'+(s.t.emailPlaceholder||'Email')+'" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box"></div></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-106" id="tr-pm-msg-'+bid+'" style="display:none;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:12px"></div>'+
        '<div class="tr-extensions-product-review-assets-reviews-widget-div-107" style="display:flex;gap:10px;justify-content:flex-end"><button class="tr-extensions-product-review-assets-reviews-widget-button-108" id="tr-pm-cancel-'+bid+'" style="padding:10px 20px;background:#f5f5f5;color:#333;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">'+(s.t.cancel||'Cancel')+'</button><button class="tr-extensions-product-review-assets-reviews-widget-button-109" id="tr-pm-submit-'+bid+'" style="padding:10px 24px;background:'+s.accentColor+';color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">'+(s.t.submitReview||'Submit Review')+'</button></div>';
      pmOverlay.appendChild(pmModal);
      document.body.appendChild(pmOverlay);

      var pmFileInput=pmModal.querySelector('#tr-pm-file-'+bid);
      var pmDzContent=pmModal.querySelector('#tr-pm-dz-content-'+bid);
      var pmPreview=pmModal.querySelector('#tr-pm-preview-'+bid);
      var pmPreviewMedia=pmModal.querySelector('#tr-pm-preview-media-'+bid);
      var pmPreviewName=pmModal.querySelector('#tr-pm-preview-name-'+bid);
      var pmDropzone=pmModal.querySelector('#tr-pm-dropzone-'+bid);
      var pmRemoveBtn=pmModal.querySelector('#tr-pm-remove-'+bid);

      function pmShowPreview(file){ var url=URL.createObjectURL(file); pmPreviewMedia.innerHTML=''; var el; if(file.type.indexOf('video')===0){el=document.createElement('video');el.src=url;el.controls=true;el.style.cssText='max-width:100%;max-height:160px;border-radius:8px;display:block;margin:0 auto';}else{el=document.createElement('img');el.src=url;el.alt='preview';el.style.cssText='max-width:100%;max-height:160px;border-radius:8px;display:block;margin:0 auto;object-fit:cover';} pmPreviewMedia.appendChild(el); pmPreviewName.textContent=file.name; pmDzContent.style.display='none'; pmPreview.style.display='block'; pmDropzone.style.borderColor=s.accentColor; pmDropzone.style.background='#f0fdf4'; }
      function pmClearPreview(){ pmPreviewMedia.innerHTML=''; pmPreviewName.textContent=''; pmPreview.style.display='none'; pmDzContent.style.display='block'; pmDropzone.style.borderColor='#d1d5db'; pmDropzone.style.background='#fafafa'; pmFileInput.value=''; }
      function pmOpen(){ pmOverlay.style.display='flex'; document.body.style.overflow='hidden'; }
      function pmClose(){ pmOverlay.style.display='none'; document.body.style.overflow=''; pmClearPreview(); }

      pmFileInput.addEventListener('change',function(){ if(pmFileInput.files[0]) pmShowPreview(pmFileInput.files[0]); });
      pmDropzone.addEventListener('dragover',function(e){ e.preventDefault(); pmDropzone.style.borderColor=s.accentColor; pmDropzone.style.background='#f5f3ff'; });
      pmDropzone.addEventListener('dragleave',function(){ if(!pmFileInput.files[0]){pmDropzone.style.borderColor='#d1d5db';pmDropzone.style.background='#fafafa';} });
      pmDropzone.addEventListener('drop',function(e){ e.preventDefault(); var file=e.dataTransfer.files[0]; if(!file) return; try{var dt=new DataTransfer();dt.items.add(file);pmFileInput.files=dt.files;}catch(err){} pmShowPreview(file); });
      pmRemoveBtn.addEventListener('click',function(e){ e.stopPropagation(); pmClearPreview(); });
      pmModal.querySelector('#tr-pm-close-'+bid).addEventListener('click',pmClose);
      pmModal.querySelector('#tr-pm-cancel-'+bid).addEventListener('click',pmClose);
      pmOverlay.addEventListener('click',function(e){ if(e.target===pmOverlay) pmClose(); });

      var pmStarSpans=pmModal.querySelectorAll('#tr-pm-stars-'+bid+' span');
      function pmPaintStars(n){ pmStarSpans.forEach(function(sp,i){ sp.style.color=i<n?(s.starColor||'#F59E0B'):'#ddd'; }); }
      pmStarSpans.forEach(function(sp){
        sp.addEventListener('mouseover',function(){ pmPaintStars(parseInt(sp.dataset.v)); });
        sp.addEventListener('mouseout', function(){ pmPaintStars(pmRating); });
        sp.addEventListener('click',    function(){ pmRating=parseInt(sp.dataset.v); pmPaintStars(pmRating); });
      });

      function pmMsg(text,ok){ var el=pmModal.querySelector('#tr-pm-msg-'+bid); el.textContent=text; el.style.display='block'; el.style.background=ok?'#dcfce7':'#fee2e2'; el.style.color=ok?'#166534':'#991b1b'; }

      pmModal.querySelector('#tr-pm-submit-'+bid).addEventListener('click',function(){
        var name=pmModal.querySelector('#tr-pm-name-'+bid).value.trim();
        var email=pmModal.querySelector('#tr-pm-email-'+bid).value.trim();
        var comment=pmModal.querySelector('#tr-pm-comment-'+bid).value.trim();
        var title=pmModal.querySelector('#tr-pm-title-'+bid).value.trim();
        var submitBtn=this;
        if(!name||!email||!comment||pmRating===0){ pmMsg(s.t.submitRequired||'Please fill in all required fields and select a star rating.',false); return; }
        submitBtn.disabled=true; submitBtn.textContent=(s.t.submitting||'Submitting…');
        var file=pmFileInput.files[0], uploadPromise;
        if(file){ submitBtn.textContent=(s.t.uploadingPhoto||'Uploading…'); var fd=new FormData(); fd.append('file',file); uploadPromise=fetch('/apps/review',{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(j){ if(!j.success) throw new Error('File upload failed'); return {mediaUrl:j.url,mediaType:j.mediaType,fileName:j.fileName}; }); }
        else { uploadPromise=Promise.resolve({mediaUrl:null,mediaType:null,fileName:null}); }
        uploadPromise.then(function(media){ submitBtn.textContent=(s.t.submitting||'Submitting…'); return fetch('/apps/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,productId:productId,rating:pmRating,comment:comment,title:title,customer:name,shop:shop,mediaUrl:media.mediaUrl,mediaType:media.mediaType,fileName:media.fileName})}).then(function(r){return r.json();}); })
        .then(function(json){ if(json.success===false) throw new Error(json.error||'Submission failed'); pmMsg(s.t.submitSuccess||'Thank you! Your review has been submitted for approval.',true); pmModal.querySelector('#tr-pm-name-'+bid).value=''; pmModal.querySelector('#tr-pm-email-'+bid).value=''; pmModal.querySelector('#tr-pm-comment-'+bid).value=''; pmModal.querySelector('#tr-pm-title-'+bid).value=''; pmClearPreview(); pmRating=0; pmPaintStars(0); submitBtn.disabled=false; submitBtn.textContent=(s.t.submitReview||'Submit Review'); if(json.coupon&&json.coupon.code){ pmClose(); trShowCoupon(json.coupon); } else setTimeout(pmClose,2500); })
        .catch(function(err){ pmMsg(err.message||'Something went wrong. Please try again.',false); submitBtn.disabled=false; submitBtn.textContent=(s.t.submitReview||'Submit Review'); });
      });

      /* ── Summary bar ── */
      var bar=document.createElement('div'); bar.className='trust-reviews__pm-summary';

      var starsHtml='';
      for(var si=0;si<5;si++) starsHtml+='<span class="tr-extensions-product-review-assets-reviews-widget-span-110" style="color:'+(si<Math.round(avgRating)?s.accentColor:'#ddd')+'">&#9733;</span>';
      var scoreDiv=document.createElement('div'); scoreDiv.className='trust-reviews__pm-score';
      scoreDiv.innerHTML='<div class="trust-reviews__pm-score-num">'+avgRating.toFixed(1)+'</div><div class="trust-reviews__pm-score-stars">'+starsHtml+'</div><div class="trust-reviews__pm-score-count">'+total+' '+(s.t.reviews||'reviews')+'</div>';
      bar.appendChild(scoreDiv);

      var d1=document.createElement('div'); d1.className='trust-reviews__pm-divider'; bar.appendChild(d1);

      var barsDiv=document.createElement('div'); barsDiv.className='trust-reviews__pm-bars';
      for(var bi=4;bi>=0;bi--){
        var pct=total>0?Math.round(dist[bi]/total*100):0;
        var barRow=document.createElement('div'); barRow.className='trust-reviews__pm-bar-row';
        barRow.innerHTML='<span class="trust-reviews__pm-bar-label">'+(bi+1)+'</span><div class="trust-reviews__pm-bar-track"><div class="trust-reviews__pm-bar-fill" style="width:'+pct+'%"></div></div><span class="trust-reviews__pm-bar-count">'+dist[bi]+'</span>';
        barsDiv.appendChild(barRow);
      }
      bar.appendChild(barsDiv);

      if(photos.length){
        var d2=document.createElement('div'); d2.className='trust-reviews__pm-divider'; bar.appendChild(d2);
        var thumbsDiv=document.createElement('div'); thumbsDiv.className='trust-reviews__pm-thumbs';
        var maxT=Math.min(8,photos.length);
        for(var ti=0;ti<maxT;ti++){
          var img=document.createElement('img'); img.className='trust-reviews__pm-thumb';
          img.src=photos[ti]; img.alt='review photo'; img.loading='lazy';
          thumbsDiv.appendChild(img);
        }
        bar.appendChild(thumbsDiv);
      }

      var d3=document.createElement('div'); d3.className='trust-reviews__pm-divider'; bar.appendChild(d3);

      /* ── Action buttons ── */
      var actDiv=document.createElement('div'); actDiv.className='trust-reviews__pm-actions';
      var writeBtn=document.createElement('button'); writeBtn.className='trust-reviews__pm-btn-write';
      writeBtn.textContent=(s.t.writeReview||'Write a Review');
      writeBtn.addEventListener('click', pmOpen);

      /* Filter button + dropdown */
      var filterWrap=document.createElement('div'); filterWrap.style.cssText='position:relative;display:inline-block';
      var filterBtn=document.createElement('button'); filterBtn.className='trust-reviews__pm-btn-filter';
      filterBtn.innerHTML='&#9776; '+(s.t.filterAllReviews||'All reviews');
      var filterMenu=document.createElement('div');
      filterMenu.style.cssText='display:none;position:absolute;right:0;top:calc(100% + 6px);background:#fff;border:1px solid #e4e4e4;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);min-width:160px;z-index:100;overflow:hidden';
      var filterOptions=[['all',s.t.filterAllReviews||'All reviews'],['5','5 ★'],['4','4 ★'],['3','3 ★'],['2','2 ★'],['1','1 ★']];
      var activeFilter='all';
      filterOptions.forEach(function(opt){
        var item=document.createElement('button');
        item.dataset.fv=opt[0];
        item.style.cssText='display:block;width:100%;text-align:left;padding:10px 16px;background:none;border:none;font-size:.84rem;cursor:pointer;color:#333;transition:background .12s';
        item.textContent=opt[1];
        item.addEventListener('mouseenter',function(){ item.style.background='#f5f5f5'; });
        item.addEventListener('mouseleave',function(){ item.style.background=item.dataset.fv===activeFilter?'#f0f0f0':'none'; });
        item.addEventListener('click',function(){
          activeFilter=opt[0]; filterMenu.style.display='none';
          filterBtn.innerHTML='&#9776; '+(opt[0]==='all'?(s.t.filterAllReviews||'All reviews'):opt[1]);
          var filtered=opt[0]==='all'?reviews:reviews.filter(function(r){ return Math.round(r.rating||0)===parseInt(opt[0]); });
          pmRenderGrid(filtered);
        });
        filterMenu.appendChild(item);
      });
      filterBtn.addEventListener('click',function(e){ e.stopPropagation(); filterMenu.style.display=filterMenu.style.display==='none'?'block':'none'; });
      document.addEventListener('click',function(){ filterMenu.style.display='none'; });
      filterWrap.appendChild(filterBtn); filterWrap.appendChild(filterMenu);

      actDiv.appendChild(writeBtn); actDiv.appendChild(filterWrap);
      bar.appendChild(actDiv);
      wrap.appendChild(bar);

      /* ── Masonry grid ── */
      var grid=document.createElement('div'); grid.className='trust-reviews__pm-grid';
      function pmRenderGrid(revs){
        grid.innerHTML='';
        var items=revs.slice(0,s.maxRev||12);
        for(var ci=0;ci<items.length;ci++) grid.appendChild(buildPMCard(items[ci],s));
      }
      pmRenderGrid(reviews);
      wrap.appendChild(grid);
      return wrap;
    }

    function buildCompactRows(reviews, s) {
      var starCol=s.starColor||'#F59E0B', perPage=Math.max(1,s.maxRev), sorted=reviews.slice();
      var wrap=document.createElement('div'); wrap.className='trust-reviews__compact-wrap';
      var sortBar=document.createElement('div'); sortBar.className='trust-reviews__compact-sortbar';
      var sortLabel=document.createElement('span'); sortLabel.className='trust-reviews__classic-sortlabel'; sortLabel.textContent=(s.t.sort||'Sort')+':';
      var sortSel=document.createElement('select'); sortSel.className='trust-reviews__classic-select';
      [['newest',s.t.sortNewest||'Newest'],['highest',s.t.sortHighest||'Highest Rated'],['lowest',s.t.sortLowest||'Lowest Rated']].forEach(function(o){ var opt=document.createElement('option'); opt.value=o[0]; opt.textContent=o[1]; sortSel.appendChild(opt); });
      sortBar.appendChild(sortLabel); sortBar.appendChild(sortSel); wrap.appendChild(sortBar);
      var listEl=document.createElement('div'); listEl.className='trust-reviews__compact-rows';
      wrap.appendChild(listEl);
      function doSort(mode){ sorted=reviews.slice(); if(mode==='highest') sorted.sort(function(a,b){return b.rating-a.rating;}); else if(mode==='lowest') sorted.sort(function(a,b){return a.rating-b.rating;}); else sorted.sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);}); }
      function renderRows(){
        listEl.innerHTML='';
        sorted.slice(0,perPage).forEach(function(r){
          var row=document.createElement('div'); row.className='trust-reviews__compact-row';
          var verifiedHTML=(s.showVerified&&r.isVerified)?'<span class="trust-reviews__verified trust-reviews__compact-verified">'+(s.t?s.t.verified:'Verified')+'</span>':'';
          var dateHTML=(s.showDate&&r.createdAt)?'<span class="trust-reviews__compact-date">'+fmtDate(r.createdAt)+'</span>':'';
          var text=r.title?(r.title+(r.comment?' — '+r.comment:'')):(r.comment||'');
          row.innerHTML='<span class="trust-reviews__compact-stars">'+starHTML(r.rating,starCol)+'</span>'+verifiedHTML+'<span class="trust-reviews__compact-text">'+text+'</span><span class="trust-reviews__compact-reviewer">'+(r.customer||'Anonymous')+'</span>'+dateHTML;
          listEl.appendChild(row);
        });
      }
      doSort('newest'); renderRows();
      sortSel.addEventListener('change',function(){ doSort(sortSel.value); renderRows(); });
      return wrap;
    }

    function buildSnippetRotator(reviews, s) {
      var items = reviews.slice(0, s.maxRev), total = items.length;
      var wrap  = document.createElement('div'); wrap.className = 'trust-reviews__snippet-wrap';
      var stage = document.createElement('div'); stage.className = 'trust-reviews__snippet-stage';
      wrap.appendChild(stage);
      var current = 0, timer = null, dotBtns = [];
      function render(idx) {
        current = ((idx % total) + total) % total;
        stage.innerHTML = '';
        var card = buildCard(items[current], s);
        card.classList.add('trust-reviews__snippet-card');
        stage.appendChild(card);
        attachLikes(stage); // each rotation swaps in a fresh card with its own like button
        for (var d = 0; d < dotBtns.length; d++) dotBtns[d].classList.toggle('active', d === current);
      }
      if (s.showDots !== false && total > 1) {
        var dotsEl = document.createElement('div'); dotsEl.className = 'trust-reviews__slider-dots';
        for (var j = 0; j < total; j++) {
          (function(idx) { var d = document.createElement('button'); d.className = 'trust-reviews__dot'; d.addEventListener('click', function(){ render(idx); resetTimer(); }); dotsEl.appendChild(d); dotBtns.push(d); })(j);
        }
        wrap.appendChild(dotsEl);
      }
      function resetTimer() {
        clearInterval(timer);
        if (s.autoplay !== false && total > 1) timer = setInterval(function(){ render(current + 1); }, s.autoplaySpeed || 4000);
      }
      render(0);
      resetTimer();
      wrap.addEventListener('mouseenter', function(){ clearInterval(timer); });
      wrap.addEventListener('mouseleave', resetTimer);
      return wrap;
    }

    // Instagram-Stories-style widget: a horizontal ring of gradient-bordered
    // avatar/thumbnail circles; tapping one opens a fullscreen story player
    // (progress segments, tap-left/right nav, autoplay, video-with-sound-off).
    // Reviews with video/photo media are shown first; text-only reviews still
    // get a slide (a gradient quote card) instead of being dropped, so the
    // widget never renders emptier than the review list actually is.
    function buildInstaStories(reviews, s) {
      var items = reviews.slice(0, s.maxRev);
      items.sort(function(a, b) {
        function rank(r) { if (!r.mediaUrl) return 2; return (r.mediaType || '').indexOf('video') === 0 ? 0 : 1; }
        return rank(a) - rank(b);
      });
      var total = items.length;

      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__insta-wrap';
      var ring = document.createElement('div'); ring.className = 'trust-reviews__insta-ring';
      wrap.appendChild(ring);

      var viewer = null, dwellTimer = null, videoEl = null, current = 0;

      function ringItem(r, idx) {
        var btn = document.createElement('button'); btn.className = 'trust-reviews__insta-item'; btn.type = 'button';
        var circle = document.createElement('div'); circle.className = 'trust-reviews__insta-ring-circle';
        var inner;
        if (r.mediaUrl && (r.mediaType || '').indexOf('video') === 0) {
          inner = document.createElement('video'); inner.muted = true; inner.playsInline = true; inner.preload = 'metadata'; inner.src = r.mediaUrl + (r.mediaUrl.indexOf('#') < 0 ? '#t=0.1' : '');
        } else if (r.mediaUrl) {
          inner = document.createElement('img'); inner.src = r.mediaUrl; inner.alt = ''; inner.loading = 'lazy';
        } else {
          inner = document.createElement('div'); inner.className = 'trust-reviews__insta-ring-fallback'; inner.textContent = initials(r.customer);
        }
        inner.className = (inner.className ? inner.className + ' ' : '') + 'trust-reviews__insta-ring-media';
        circle.appendChild(inner);
        var name = document.createElement('span'); name.className = 'trust-reviews__insta-item-name'; name.textContent = (r.customer || 'Customer').split(' ')[0];
        btn.appendChild(circle); btn.appendChild(name);
        btn.addEventListener('click', function(){ openViewer(idx); });
        return btn;
      }
      for (var i = 0; i < total; i++) ring.appendChild(ringItem(items[i], i));

      function markSeen(idx) { var el = ring.children[idx]; if (el) el.classList.add('seen'); }

      function next() { if (current >= total - 1) { closeViewer(); return; } renderSlide(current + 1); }
      function prev() { if (current <= 0) return; renderSlide(current - 1); }

      function renderSlide(idx) {
        clearTimeout(dwellTimer);
        if (videoEl) { videoEl.pause(); videoEl = null; }
        current = idx;
        markSeen(current);
        var r = items[current];

        var stage = viewer.querySelector('.trust-reviews__insta-stage');
        stage.innerHTML = '';
        var segWrap = viewer.querySelector('.trust-reviews__insta-progress');
        segWrap.innerHTML = '';
        for (var p = 0; p < total; p++) {
          var seg = document.createElement('div'); seg.className = 'trust-reviews__insta-seg';
          var fill = document.createElement('div'); fill.className = 'trust-reviews__insta-seg-fill';
          if (p < current) fill.style.width = '100%';
          seg.appendChild(fill); segWrap.appendChild(seg);
        }
        var activeFill = segWrap.children[current].firstChild;

        var isTextOnly = !r.mediaUrl;
        var media;
        if (r.mediaUrl && (r.mediaType || '').indexOf('video') === 0) {
          media = document.createElement('video'); media.src = r.mediaUrl; media.autoplay = true; media.muted = true; media.playsInline = true; media.className = 'trust-reviews__insta-media';
        } else if (r.mediaUrl) {
          media = document.createElement('img'); media.src = r.mediaUrl; media.alt = ''; media.className = 'trust-reviews__insta-media';
        } else {
          media = document.createElement('div'); media.className = 'trust-reviews__insta-media trust-reviews__insta-media--text';
          media.style.background = 'linear-gradient(135deg,' + (s.accentColor || '#6B1A2C') + ',#1a1a1a)';
          media.innerHTML = '<div class="trust-reviews__insta-quote">' + starHTML(r.rating, '#fff') + '<p class="tr-extensions-product-review-assets-reviews-widget-p-111">&ldquo;' + (r.comment || '') + '&rdquo;</p></div>';
        }
        stage.appendChild(media);

        var caption = document.createElement('div'); caption.className = 'trust-reviews__insta-caption';
        caption.innerHTML = isTextOnly
          ? '<div class="trust-reviews__insta-cap-name">' + (r.customer || 'Customer') + '</div>'
          : '<div class="trust-reviews__insta-cap-stars">' + starHTML(r.rating, '#fff') + '</div>' + (r.comment ? '<p class="trust-reviews__insta-cap-text">' + r.comment + '</p>' : '') + '<div class="trust-reviews__insta-cap-name">' + (r.customer || 'Customer') + '</div>';
        stage.appendChild(caption);

        var duration = s.autoplaySpeed || 4000;
        if (media.tagName === 'VIDEO') {
          // Videos advance on 'ended' with the progress bar sized to the clip,
          // not the fixed photo dwell time (which cut long videos off early).
          videoEl = media;
          var slideIdx = current;
          videoEl.addEventListener('ended', function(){ if (s.autoplay !== false && current === slideIdx) next(); });
          videoEl.addEventListener('loadedmetadata', function(){
            if (s.autoplay === false || current !== slideIdx || !activeFill || !isFinite(media.duration)) return;
            activeFill.style.transition = 'width ' + Math.round(media.duration * 1000) + 'ms linear';
            activeFill.style.width = '100%';
          });
          // Unplayable/missing file — fall back to the normal dwell so the story doesn't stall.
          videoEl.addEventListener('error', function(){ if (s.autoplay !== false && current === slideIdx) dwellTimer = setTimeout(next, duration); });
          videoEl.play().catch(function(){});
          return;
        }
        if (s.autoplay !== false) {
          if (activeFill) {
            void activeFill.offsetWidth; // force a reflow so the transition below actually animates instead of snapping to 100%
            activeFill.style.transition = 'width ' + duration + 'ms linear';
            activeFill.style.width = '100%';
          }
          dwellTimer = setTimeout(next, duration);
        }
      }

      function openViewer(idx) {
        viewer = document.createElement('div'); viewer.className = 'trust-reviews__insta-viewer';
        viewer.innerHTML =
          '<div class="trust-reviews__insta-progress"></div>' +
          '<button class="trust-reviews__insta-close" type="button" aria-label="' + (s.t.close || 'Close') + '">&times;</button>' +
          '<div class="trust-reviews__insta-stage"></div>' +
          '<button class="trust-reviews__insta-tap trust-reviews__insta-tap--left" type="button" aria-label="' + (s.t.previous || 'Previous') + '"></button>' +
          '<button class="trust-reviews__insta-tap trust-reviews__insta-tap--right" type="button" aria-label="' + (s.t.next || 'Next') + '"></button>';
        document.body.appendChild(viewer);
        document.body.style.overflow = 'hidden';
        viewer.querySelector('.trust-reviews__insta-close').addEventListener('click', closeViewer);
        viewer.querySelector('.trust-reviews__insta-tap--left').addEventListener('click', prev);
        viewer.querySelector('.trust-reviews__insta-tap--right').addEventListener('click', next);
        renderSlide(idx);
      }

      function closeViewer() {
        if (!viewer) return;
        clearTimeout(dwellTimer);
        if (videoEl) { videoEl.pause(); videoEl = null; }
        viewer.remove(); viewer = null;
        document.body.style.overflow = '';
      }

      document.addEventListener('keydown', function(e) {
        if (!viewer) return;
        if (e.key === 'Escape') closeViewer();
        else if (e.key === 'ArrowRight') next();
        else if (e.key === 'ArrowLeft') prev();
      });

      return wrap;
    }

    // Reels mode for the Insta Stories widget: a continuous vertical scroll-snap
    // feed instead of a tap-to-open tray. Each video plays only while its slide
    // is actually in view (IntersectionObserver), never several at once.
    function buildInstaReels(reviews, s) {
      var items = reviews.slice(0, s.maxRev);
      items.sort(function(a, b) {
        function rank(r) { if (!r.mediaUrl) return 2; return (r.mediaType || '').indexOf('video') === 0 ? 0 : 1; }
        return rank(a) - rank(b);
      });

      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__reels-wrap';
      var feed = document.createElement('div'); feed.className = 'trust-reviews__reels-feed';
      wrap.appendChild(feed);

      function buildSlide(r) {
        var slide = document.createElement('div'); slide.className = 'trust-reviews__reels-slide';
        var media, isVideo = r.mediaUrl && (r.mediaType || '').indexOf('video') === 0;
        if (isVideo) {
          // muted/playsinline as real attributes (iOS Safari checks them for inline
          // autoplay); preload + #t=0.1 so a paused slide shows its first frame, not black.
          media = document.createElement('video'); media.muted = true; media.loop = true; media.playsInline = true; media.preload = 'metadata';
          media.setAttribute('muted', ''); media.setAttribute('playsinline', ''); media.setAttribute('webkit-playsinline', '');
          media.src = r.mediaUrl + (r.mediaUrl.indexOf('#') < 0 ? '#t=0.1' : ''); media.className = 'trust-reviews__reels-media';
        } else if (r.mediaUrl) {
          media = document.createElement('img'); media.src = r.mediaUrl; media.alt = ''; media.loading = 'lazy'; media.className = 'trust-reviews__reels-media';
        } else {
          media = document.createElement('div'); media.className = 'trust-reviews__reels-media trust-reviews__reels-media--text';
          media.style.background = 'linear-gradient(135deg,' + (s.accentColor || '#6B1A2C') + ',#1a1a1a)';
        }
        slide.appendChild(media);

        if (isVideo) {
          var muteBtn = document.createElement('button'); muteBtn.type = 'button'; muteBtn.className = 'trust-reviews__reels-mute'; muteBtn.textContent = '\uD83D\uDD07';
          muteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            media.muted = !media.muted;
            muteBtn.textContent = media.muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
          });
          slide.appendChild(muteBtn);

          // Play badge shown whenever the video is paused — including when the browser
          // blocks autoplay (iOS Low Power Mode, data saver, in-app browsers).
          var playBadge = document.createElement('span'); playBadge.className = 'trust-reviews__reels-play'; playBadge.innerHTML = '&#9654;';
          slide.appendChild(playBadge);
          media.addEventListener('play', function(){ slide.classList.add('is-playing'); });
          media.addEventListener('pause', function(){ slide.classList.remove('is-playing'); });
        }

        var caption = document.createElement('div'); caption.className = 'trust-reviews__reels-caption';
        caption.innerHTML = '<div class="trust-reviews__reels-cap-stars">' + starHTML(r.rating, '#fff') + '</div>' +
          (r.comment ? '<p class="trust-reviews__reels-cap-text">' + r.comment + '</p>' : '') +
          '<div class="trust-reviews__reels-cap-name">' + (r.customer || 'Customer') + '</div>';
        slide.appendChild(caption);

        feed.appendChild(slide);
        return { slide: slide, media: media, isVideo: isVideo };
      }

      var slides = [];
      for (var i = 0; i < items.length; i++) slides.push(buildSlide(items[i]));

      if (s.autoplay !== false && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            var found = null;
            for (var k = 0; k < slides.length; k++) if (slides[k].slide === entry.target) { found = slides[k]; break; }
            if (!found || !found.isVideo) return;
            if (entry.isIntersecting && entry.intersectionRatio > 0.6) found.media.play().catch(function(){});
            else found.media.pause();
          });
        }, { threshold: [0, 0.6, 1], root: feed });
        slides.forEach(function(it) { io.observe(it.slide); });
      }
      // Tap a video to play/pause — always, not only with autoplay off, since the
      // browser may refuse autoplay and the viewer would otherwise be stuck.
      slides.forEach(function(it) {
        if (!it.isVideo) return;
        it.slide.addEventListener('click', function(e) {
          if (e.target.closest && e.target.closest('.trust-reviews__reels-mute')) return;
          if (it.media.paused) it.media.play().catch(function(){}); else it.media.pause();
        });
      });

      return wrap;
    }

    // ─── Insta design family: shared helpers ──────────────────────────────
    // Used by Reels Carousel, Social Mix, Phone Showcase and Swipe Deck.
    var IG_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none"/></svg>';
    var PLAY_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
    var HEART_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
    var COMMENT_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/></svg>';
    var SEND_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>';

    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
    function isVid(r) { return !!r.mediaUrl && (r.mediaType || '').indexOf('video') === 0; }
    // Videos first, then photos, then text-only — sorted before the maxRev cut so
    // a media review never loses its slot to an older text review.
    function mediaFirst(reviews, max) {
      function rk(r) { return !r.mediaUrl ? 2 : isVid(r) ? 0 : 1; }
      return reviews.slice().sort(function(a, b){ return rk(a) - rk(b); }).slice(0, max);
    }
    function timeAgo(iso) {
      if (!iso) return '';
      var sec = (Date.now() - new Date(iso).getTime()) / 1000;
      if (!(sec >= 0)) return '';
      var units = [[31536000,'year'],[2592000,'month'],[604800,'week'],[86400,'day'],[3600,'hour'],[60,'minute']];
      try {
        var rtf = new Intl.RelativeTimeFormat(storeLocale || undefined, { numeric: 'auto' });
        for (var i = 0; i < units.length; i++) if (sec >= units[i][0]) return rtf.format(-Math.floor(sec / units[i][0]), units[i][1]);
        return rtf.format(0, 'second');
      } catch (e) { return fmtDate(iso); }
    }
    // Video (muted, inline, first frame visible), photo, or a gradient quote card for text-only reviews.
    function instaMedia(r, cls, s) {
      var el;
      if (isVid(r)) {
        el = document.createElement('video'); el.muted = true; el.loop = true; el.playsInline = true; el.preload = 'metadata';
        el.setAttribute('muted', ''); el.setAttribute('playsinline', '');
        el.src = r.mediaUrl + (r.mediaUrl.indexOf('#') < 0 ? '#t=0.1' : '');
      } else if (r.mediaUrl) {
        el = document.createElement('img'); el.src = r.mediaUrl; el.alt = ''; el.loading = 'lazy';
      } else {
        el = document.createElement('div'); el.className = 'trust-reviews__ig-textmedia';
        el.style.background = 'linear-gradient(135deg,' + (s.accentColor || '#6B1A2C') + ',#1a1a1a)';
        el.innerHTML = '<p>&ldquo;' + esc(r.comment || r.title || '') + '&rdquo;</p>';
      }
      el.className = (el.className ? el.className + ' ' : '') + cls;
      return el;
    }
    // Desktop-only muted preview on hover; touch devices open the lightbox instead.
    function hoverPlay(card, media) {
      if (media.tagName !== 'VIDEO' || !window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;
      card.addEventListener('mouseenter', function(){ card.classList.add('is-playing'); media.play().catch(function(){}); });
      card.addEventListener('mouseleave', function(){ card.classList.remove('is-playing'); media.pause(); });
    }
    function asButton(el, onActivate) {
      el.setAttribute('role', 'button'); el.tabIndex = 0;
      el.addEventListener('click', onActivate);
      el.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(e); } });
    }
    function avatarHTML(r, cls) { return '<span class="' + cls + '">' + esc(initials(r.customer)) + '</span>'; }

    // Fullscreen player shared by the Insta designs: plays video with sound and
    // controls (a tap is a user gesture, so unmuted playback is allowed).
    function openInstaLightbox(items, start, s) {
      var idx = start;
      var lb = document.createElement('div'); lb.className = 'trust-reviews__ig-lb';
      lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
      lb.innerHTML =
        '<button type="button" class="trust-reviews__ig-lb-close" aria-label="' + esc(s.t.close || 'Close') + '">&times;</button>' +
        '<button type="button" class="trust-reviews__ig-lb-nav trust-reviews__ig-lb-nav--prev" aria-label="' + esc(s.t.previous || 'Previous') + '">&#8249;</button>' +
        '<div class="trust-reviews__ig-lb-stage"></div>' +
        '<button type="button" class="trust-reviews__ig-lb-nav trust-reviews__ig-lb-nav--next" aria-label="' + esc(s.t.next || 'Next') + '">&#8250;</button>';
      var stage = lb.querySelector('.trust-reviews__ig-lb-stage');
      if (items.length < 2) lb.classList.add('is-single');

      function show(i) {
        idx = (i + items.length) % items.length;
        var r = items[idx];
        stage.innerHTML = '';
        var m = instaMedia(r, 'trust-reviews__ig-lb-media', s);
        stage.appendChild(m);
        if (m.tagName === 'VIDEO') {
          m.controls = true; m.loop = false; m.muted = false; m.removeAttribute('muted');
          m.play().catch(function(){ m.muted = true; m.play().catch(function(){}); });
        }
        var cap = document.createElement('div'); cap.className = 'trust-reviews__ig-lb-cap';
        cap.innerHTML =
          '<div class="trust-reviews__ig-lb-head">' + avatarHTML(r, 'trust-reviews__ig-avatar') +
            '<span class="trust-reviews__ig-who"><strong>' + esc(r.customer || 'Customer') + '</strong><small>' + esc(timeAgo(r.createdAt)) + '</small></span>' +
            '<span class="trust-reviews__ig-lb-stars">' + starHTML(r.rating, s.starColor || '#F59E0B') + '</span></div>' +
          (r.title ? '<p class="trust-reviews__ig-lb-title">' + esc(r.title) + '</p>' : '') +
          (r.mediaUrl && r.comment ? '<p class="trust-reviews__ig-lb-text">' + esc(r.comment) + '</p>' : '');
        stage.appendChild(cap);
      }
      function close() {
        document.removeEventListener('keydown', onKey);
        lb.remove(); document.body.style.overflow = '';
      }
      function onKey(e) {
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowRight') show(idx + 1);
        else if (e.key === 'ArrowLeft') show(idx - 1);
      }
      lb.querySelector('.trust-reviews__ig-lb-close').addEventListener('click', close);
      lb.querySelector('.trust-reviews__ig-lb-nav--prev').addEventListener('click', function(){ show(idx - 1); });
      lb.querySelector('.trust-reviews__ig-lb-nav--next').addEventListener('click', function(){ show(idx + 1); });
      lb.addEventListener('click', function(e){ if (e.target === lb) close(); });
      document.body.appendChild(lb);
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey);
      show(start);
      lb.querySelector('.trust-reviews__ig-lb-close').focus();
    }

    // ─── 1. Reels Carousel ───────────────────────────────────────────────
    // Horizontal row of 9:16 cards (play badge, rating chip, author + time +
    // Instagram mark along the bottom). Hover previews on desktop, tap opens the player.
    function buildInstaCarousel(reviews, s) {
      var items = mediaFirst(reviews, s.maxRev);
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__igc-wrap';
      var track = document.createElement('div'); track.className = 'trust-reviews__igc-track';
      wrap.appendChild(track);

      items.forEach(function(r, i) {
        var card = document.createElement('div'); card.className = 'trust-reviews__igc-card';
        var media = instaMedia(r, 'trust-reviews__igc-media', s);
        card.appendChild(media);
        var over = document.createElement('div'); over.className = 'trust-reviews__igc-overlay';
        over.innerHTML =
          '<span class="trust-reviews__igc-chip">&#9733; ' + Number(r.rating || 0).toFixed(1) + '</span>' +
          (isVid(r) ? '<span class="trust-reviews__igc-play">' + PLAY_SVG + '</span>' : '') +
          '<div class="trust-reviews__igc-foot">' + avatarHTML(r, 'trust-reviews__ig-avatar') +
            '<span class="trust-reviews__ig-who"><strong>' + esc(r.customer || 'Customer') + '</strong><small>' + esc(timeAgo(r.createdAt)) + '</small></span>' +
            '<span class="trust-reviews__igc-ig">' + IG_SVG + '</span></div>';
        card.appendChild(over);
        card.setAttribute('aria-label', (r.customer || 'Customer') + ' — ' + (r.rating || 0) + '/5');
        asButton(card, function(){ openInstaLightbox(items, i, s); });
        hoverPlay(card, media);
        track.appendChild(card);
      });

      if (s.showArrows !== false && items.length > 1) {
        var prev = document.createElement('button'); prev.type = 'button'; prev.className = 'trust-reviews__igc-arrow trust-reviews__igc-arrow--prev'; prev.innerHTML = '&#8249;'; prev.setAttribute('aria-label', s.t.previous || 'Previous');
        var next = document.createElement('button'); next.type = 'button'; next.className = 'trust-reviews__igc-arrow trust-reviews__igc-arrow--next'; next.innerHTML = '&#8250;'; next.setAttribute('aria-label', s.t.next || 'Next');
        prev.addEventListener('click', function(){ track.scrollBy({ left: -track.clientWidth * 0.8, behavior: 'smooth' }); });
        next.addEventListener('click', function(){ track.scrollBy({ left:  track.clientWidth * 0.8, behavior: 'smooth' }); });
        wrap.appendChild(prev); wrap.appendChild(next);
        function syncArrows() {
          var max = track.scrollWidth - track.clientWidth - 2;
          prev.classList.toggle('is-hidden', track.scrollLeft <= 2);
          next.classList.toggle('is-hidden', track.scrollLeft >= max);
        }
        track.addEventListener('scroll', syncArrows, { passive: true });
        window.addEventListener('resize', syncArrows);
        setTimeout(syncArrows, 0);
      }
      return wrap;
    }

    // ─── 2. Social Mix ───────────────────────────────────────────────────
    // Masonry collage cycling three Instagram card types — Story, Post, Reel —
    // so the section reads like a real profile feed rather than a uniform grid.
    function buildInstaMosaic(reviews, s) {
      var items = mediaFirst(reviews, s.maxRev);
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__igm-wrap';
      var kinds = ['story', 'post', 'reel', 'post', 'reel', 'story'];

      items.forEach(function(r, i) {
        var kind = kinds[i % kinds.length];
        var card = document.createElement('div'); card.className = 'trust-reviews__igm-card trust-reviews__igm-card--' + kind;
        var name = esc(r.customer || 'Customer'), ago = esc(timeAgo(r.createdAt));
        var media = instaMedia(r, 'trust-reviews__igm-media', s);

        if (kind === 'post') {
          var mbox = document.createElement('div'); mbox.className = 'trust-reviews__igm-postmedia';
          mbox.appendChild(media);
          if (isVid(r)) mbox.insertAdjacentHTML('beforeend', '<span class="trust-reviews__igc-play">' + PLAY_SVG + '</span>');
          card.appendChild(mbox);
          card.insertAdjacentHTML('beforeend',
            '<div class="trust-reviews__igm-postbody">' +
              '<div class="trust-reviews__igm-posthead">' + avatarHTML(r, 'trust-reviews__ig-avatar') +
                '<span class="trust-reviews__ig-who"><strong>' + name + '</strong><small>' + ago + '</small></span>' +
                '<span class="trust-reviews__igm-logo">' + IG_SVG + '</span></div>' +
              '<div class="trust-reviews__igm-stars">' + starHTML(r.rating, s.starColor || '#F59E0B') + '</div>' +
              (r.mediaUrl && r.comment ? '<p class="trust-reviews__igm-posttext">' + esc(r.comment) + '</p>' : '') +
            '</div>');
        } else {
          card.appendChild(media);
          var over = document.createElement('div'); over.className = 'trust-reviews__igm-overlay';
          if (kind === 'story') {
            over.innerHTML =
              '<div class="trust-reviews__igm-bars"><i class="is-done"></i><i class="is-on"></i><i></i></div>' +
              '<div class="trust-reviews__igm-storyhead">' + avatarHTML(r, 'trust-reviews__ig-avatar trust-reviews__ig-avatar--sm') +
                '<strong>' + name + '</strong><small>' + ago + '</small><span class="trust-reviews__igm-x">&times;</span></div>' +
              '<div class="trust-reviews__igm-storyfoot"><span class="trust-reviews__igm-pill">' + starHTML(r.rating, '#fff') + '</span>' + HEART_SVG + SEND_SVG + '</div>';
          } else {
            over.innerHTML =
              '<div class="trust-reviews__igm-reeltop"><strong>Reels</strong>' + IG_SVG + '</div>' +
              '<div class="trust-reviews__igm-side"><span>' + HEART_SVG + '<b>' + (r.likes || 0) + '</b></span><span>' + COMMENT_SVG + '<b>' + Number(r.rating || 0).toFixed(1) + '</b></span><span>' + SEND_SVG + '</span></div>' +
              '<div class="trust-reviews__igm-reelfoot">' + avatarHTML(r, 'trust-reviews__ig-avatar trust-reviews__ig-avatar--sm') + '<strong>' + name + '</strong>' +
                (r.mediaUrl && r.comment ? '<p>' + esc(r.comment) + '</p>' : '') + '</div>';
          }
          card.appendChild(over);
          if (isVid(r)) card.insertAdjacentHTML('beforeend', '<span class="trust-reviews__igc-play">' + PLAY_SVG + '</span>');
        }
        card.setAttribute('aria-label', (r.customer || 'Customer') + ' — ' + (r.rating || 0) + '/5');
        asButton(card, function(){ openInstaLightbox(items, i, s); });
        hoverPlay(card, media);
        wrap.appendChild(card);
      });
      return wrap;
    }

    // ─── 3. Phone Showcase ───────────────────────────────────────────────
    // A phone mockup plays the active review as a reel (progress bar, side
    // actions, caption) next to a clickable review playlist. Auto-advances only
    // while the widget is on screen; videos advance when they end.
    function buildInstaPhone(reviews, s) {
      var items = mediaFirst(reviews, s.maxRev), total = items.length, current = 0;
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__igp-wrap';
      var phone = document.createElement('div'); phone.className = 'trust-reviews__igp-phone';
      phone.innerHTML = '<div class="trust-reviews__igp-notch"></div><div class="trust-reviews__igp-screen"></div>';
      var screen = phone.querySelector('.trust-reviews__igp-screen');
      var list = document.createElement('div'); list.className = 'trust-reviews__igp-list';
      wrap.appendChild(phone); wrap.appendChild(list);

      var timer = null, media = null, inView = false, muted = true;
      var dwell = Math.max(s.autoplaySpeed || 4000, 4000);

      items.forEach(function(r, i) {
        var row = document.createElement('div'); row.className = 'trust-reviews__igp-row';
        var thumb = document.createElement('div'); thumb.className = 'trust-reviews__igp-thumb';
        if (r.mediaUrl) { var tm = instaMedia(r, 'trust-reviews__igp-thumbmedia', s); if (tm.tagName === 'VIDEO') tm.loop = false; thumb.appendChild(tm); }
        else thumb.innerHTML = avatarHTML(r, 'trust-reviews__ig-avatar trust-reviews__ig-avatar--lg');
        if (isVid(r)) thumb.insertAdjacentHTML('beforeend', '<span class="trust-reviews__igp-thumbplay">' + PLAY_SVG + '</span>');
        row.appendChild(thumb);
        row.insertAdjacentHTML('beforeend',
          '<div class="trust-reviews__igp-rowbody"><div class="trust-reviews__igp-rowhead"><strong>' + esc(r.customer || 'Customer') + '</strong><small>' + esc(timeAgo(r.createdAt)) + '</small></div>' +
          '<div class="trust-reviews__igp-rowstars">' + starHTML(r.rating, s.starColor || '#F59E0B') + '</div>' +
          '<p>' + esc(r.comment || r.title || '') + '</p></div>');
        asButton(row, function(){ show(i, true); });
        list.appendChild(row);
      });

      function schedule() {
        clearTimeout(timer);
        if (s.autoplay === false || !inView || total < 2) return;
        if (media && media.tagName === 'VIDEO') return; // advances on 'ended'
        timer = setTimeout(function(){ show(current + 1); }, dwell);
      }
      function show(i, userPicked) {
        clearTimeout(timer);
        if (media && media.tagName === 'VIDEO') media.pause();
        current = (i + total) % total;
        var r = items[current];
        for (var k = 0; k < list.children.length; k++) list.children[k].classList.toggle('is-active', k === current);
        if (userPicked && window.innerWidth > 749) {
          var row = list.children[current];
          list.scrollTo({ top: row.offsetTop - 8, behavior: 'smooth' });
        }

        screen.innerHTML = '';
        media = instaMedia(r, 'trust-reviews__igp-media', s);
        screen.appendChild(media);
        var bars = '';
        for (var b = 0; b < total; b++) bars += '<i class="' + (b < current ? 'is-done' : b === current ? 'is-on' : '') + '"></i>';
        var ui = document.createElement('div'); ui.className = 'trust-reviews__igp-ui';
        ui.innerHTML =
          '<div class="trust-reviews__igm-bars">' + bars + '</div>' +
          '<div class="trust-reviews__igm-storyhead">' + avatarHTML(r, 'trust-reviews__ig-avatar trust-reviews__ig-avatar--sm') +
            '<strong>' + esc(r.customer || 'Customer') + '</strong><small>' + esc(timeAgo(r.createdAt)) + '</small></div>' +
          '<div class="trust-reviews__igm-side"><span>' + HEART_SVG + '<b>' + (r.likes || 0) + '</b></span><span>' + COMMENT_SVG + '</span><span>' + SEND_SVG + '</span></div>' +
          '<div class="trust-reviews__igp-caption"><div>' + starHTML(r.rating, '#fff') + '</div>' +
            (r.mediaUrl && r.comment ? '<p>' + esc(r.comment) + '</p>' : '') + '</div>';
        screen.appendChild(ui);

        if (media.tagName === 'VIDEO') {
          var v = media;
          v.loop = total < 2; v.muted = muted;
          var mb = document.createElement('button'); mb.type = 'button'; mb.className = 'trust-reviews__reels-mute';
          mb.textContent = muted ? '🔇' : '🔊';
          mb.addEventListener('click', function(e){ e.stopPropagation(); muted = !muted; v.muted = muted; mb.textContent = muted ? '🔇' : '🔊'; });
          screen.appendChild(mb);
          var badge = document.createElement('span'); badge.className = 'trust-reviews__reels-play'; badge.innerHTML = '&#9654;';
          screen.appendChild(badge);
          v.addEventListener('play', function(){ screen.classList.add('is-playing'); });
          v.addEventListener('pause', function(){ screen.classList.remove('is-playing'); });
          v.addEventListener('ended', function(){ if (s.autoplay !== false && media === v) show(current + 1); });
          v.addEventListener('error', function(){ if (media === v && s.autoplay !== false && inView) timer = setTimeout(function(){ show(current + 1); }, dwell); });
          var active = screen.querySelector('.trust-reviews__igm-bars .is-on');
          v.addEventListener('timeupdate', function(){ if (active && v.duration) active.style.setProperty('--p', (v.currentTime / v.duration * 100) + '%'); });
          if (inView || userPicked) v.play().catch(function(){});
        } else {
          screen.classList.remove('is-playing');
          var on = screen.querySelector('.trust-reviews__igm-bars .is-on');
          if (on && s.autoplay !== false && inView && total > 1) {
            on.style.setProperty('--dur', dwell + 'ms');
            void on.offsetWidth; on.classList.add('is-timed');
          }
        }
        schedule();
      }

      screen.addEventListener('click', function(e){
        if (e.target.closest && e.target.closest('.trust-reviews__reels-mute')) return;
        if (media && media.tagName === 'VIDEO') { if (media.paused) media.play().catch(function(){}); else media.pause(); }
        else show(current + 1, true);
      });

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function(entries){
          var was = inView; inView = entries[0].isIntersecting;
          if (inView && !was) show(current);
          else if (!inView) { clearTimeout(timer); if (media && media.tagName === 'VIDEO') media.pause(); }
        }, { threshold: 0.35 }).observe(wrap);
      } else inView = true;
      show(0);
      return wrap;
    }

    // ─── 4. Swipe Deck ───────────────────────────────────────────────────
    // A stack of reel cards: drag/swipe the top card away (or use the buttons /
    // arrow keys) to reveal the next one. Swiped cards go to the back of the deck.
    function buildInstaStack(reviews, s) {
      var items = mediaFirst(reviews, s.maxRev), total = items.length;
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__igs-wrap';
      var deck = document.createElement('div'); deck.className = 'trust-reviews__igs-deck';
      deck.tabIndex = 0; deck.setAttribute('aria-roledescription', 'carousel');
      wrap.appendChild(deck);

      var cards = items.map(function(r, i) {
        var card = document.createElement('div'); card.className = 'trust-reviews__igs-card';
        var media = instaMedia(r, 'trust-reviews__igs-media', s);
        card.appendChild(media);
        card.insertAdjacentHTML('beforeend',
          '<div class="trust-reviews__igs-top"><span class="trust-reviews__igc-chip">&#9733; ' + Number(r.rating || 0).toFixed(1) + '</span><span class="trust-reviews__igc-ig">' + IG_SVG + '</span></div>' +
          '<div class="trust-reviews__igs-cap">' +
            '<div class="trust-reviews__igc-foot">' + avatarHTML(r, 'trust-reviews__ig-avatar') +
              '<span class="trust-reviews__ig-who"><strong>' + esc(r.customer || 'Customer') + '</strong><small>' + esc(timeAgo(r.createdAt)) + '</small></span></div>' +
            (r.mediaUrl && r.comment ? '<p>' + esc(r.comment) + '</p>' : '') +
          '</div>');
        deck.appendChild(card);
        return { el: card, media: media, idx: i };
      });

      var order = cards.map(function(_, i){ return i; });
      var counter = document.createElement('div'); counter.className = 'trust-reviews__igs-controls';
      counter.innerHTML =
        '<button type="button" class="trust-reviews__igs-btn" data-dir="-1" aria-label="' + esc(s.t.previous || 'Previous') + '">&#8249;</button>' +
        '<span class="trust-reviews__igs-count"></span>' +
        '<button type="button" class="trust-reviews__igs-btn trust-reviews__igs-btn--main" data-dir="1" aria-label="' + esc(s.t.next || 'Next') + '">&#8250;</button>';
      if (total > 1) wrap.appendChild(counter);
      var countEl = counter.querySelector('.trust-reviews__igs-count');

      function layout() {
        order.forEach(function(ci, pos) {
          var c = cards[ci].el;
          c.style.zIndex = String(total - pos);
          c.style.transform = 'translateY(' + (Math.min(pos, 3) * 14) + 'px) scale(' + (1 - Math.min(pos, 3) * 0.05) + ') rotate(' + (pos === 0 ? 0 : (pos % 2 ? 2.5 : -2.5)) + 'deg)';
          c.style.opacity = pos > 2 ? '0' : '1';
          c.classList.toggle('is-top', pos === 0);
          var m = cards[ci].media;
          if (m.tagName === 'VIDEO') { if (pos === 0 && inView) m.play().catch(function(){}); else m.pause(); }
        });
        countEl.textContent = (order[0] + 1) + ' / ' + total;
      }
      function go(dir, flyX) {
        if (total < 2) return;
        if (dir > 0) {
          var top = cards[order[0]].el;
          top.style.transform = 'translateX(' + (flyX || 1) * 130 + '%) rotate(' + (flyX || 1) * 18 + 'deg)';
          top.style.opacity = '0';
          order.push(order.shift());
          setTimeout(layout, 260);
        } else {
          order.unshift(order.pop());
          layout();
        }
      }
      counter.addEventListener('click', function(e){ var b = e.target.closest('[data-dir]'); if (b) go(Number(b.getAttribute('data-dir'))); });
      deck.addEventListener('keydown', function(e){ if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); });

      // Drag / swipe on the top card; a tap (no real movement) opens the player.
      var startX = 0, dx = 0, dragging = false, dragEl = null;
      deck.addEventListener('pointerdown', function(e){
        dragEl = e.target.closest('.trust-reviews__igs-card.is-top'); if (!dragEl) return;
        dragging = true; startX = e.clientX; dx = 0; dragEl.classList.add('is-dragging');
        try { dragEl.setPointerCapture(e.pointerId); } catch (_) {}
      });
      deck.addEventListener('pointermove', function(e){
        if (!dragging) return;
        dx = e.clientX - startX;
        dragEl.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 18) + 'deg)';
      });
      function endDrag() {
        if (!dragging) return;
        dragging = false; dragEl.classList.remove('is-dragging');
        if (Math.abs(dx) > 90) go(1, dx > 0 ? 1 : -1);
        else if (Math.abs(dx) < 6) { layout(); openInstaLightbox(items, order[0], s); }
        else layout();
      }
      deck.addEventListener('pointerup', endDrag);
      deck.addEventListener('pointercancel', function(){ dx = 0; if (dragging) { dragging = false; dragEl.classList.remove('is-dragging'); layout(); } });

      var inView = !('IntersectionObserver' in window);
      if (!inView) new IntersectionObserver(function(entries){ inView = entries[0].isIntersecting; layout(); }, { threshold: 0.4 }).observe(wrap);
      layout();
      return wrap;
    }

    // ─── Carousel family: shared engine ──────────────────────────────────
    // Native horizontal scrolling (touch / trackpad / scroll-snap friendly) with
    // overlay arrows, page dots or a progress bar, keyboard support, and autoplay
    // that pauses on hover, touch, hidden tabs and while off-screen.
    // opts.byCard: step/dot per card (centered) instead of per visible page.
    // opts.nav: 'sides' (overlay arrows) | 'top' (arrows top-right) | 'none'
    // opts.progress: show a progress bar instead of dots.
    var CHEV_L = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
    var CHEV_R = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
    var QUOTE_SVG = '<svg viewBox="0 0 32 32" width="34" height="34" fill="currentColor" aria-hidden="true"><path d="M9.3 25.5c-3 0-5.3-2.4-5.3-5.9 0-5.3 3.8-10 9.4-12.1l1 1.9c-3.4 1.6-5.4 4.2-5.6 6.9h.9c2.8 0 4.8 2 4.8 4.6 0 2.7-2.2 4.6-5.2 4.6zm14.7 0c-3 0-5.3-2.4-5.3-5.9 0-5.3 3.8-10 9.4-12.1l1 1.9c-3.4 1.6-5.4 4.2-5.6 6.9h.9c2.8 0 4.8 2 4.8 4.6 0 2.7-2.2 4.6-5.2 4.6z"/></svg>';

    function attachCarousel(wrap, track, s, opts) {
      opts = opts || {};
      var nav = opts.nav || 'sides', timer = null, paused = false, inView = true, dotBtns = [], raf = 0;
      track.tabIndex = 0;
      track.setAttribute('role', 'region');
      track.setAttribute('aria-roledescription', 'carousel');

      function maxScroll() { return Math.max(0, track.scrollWidth - track.clientWidth); }
      function cards() { return track.children; }
      // Pages = how many viewport-widths of scrolling exist (+ the first page).
      // Rounding (not ceil) keeps the card gap/padding slack from adding a phantom page.
      function pageCount() { return opts.byCard ? cards().length : Math.round(maxScroll() / Math.max(1, track.clientWidth)) + 1; }
      function activeIndex() {
        if (opts.byCard) {
          var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bestD = Infinity, c = cards();
          for (var i = 0; i < c.length; i++) { var d = Math.abs(c[i].offsetLeft + c[i].offsetWidth / 2 - mid); if (d < bestD) { bestD = d; best = i; } }
          return best;
        }
        if (track.scrollLeft >= maxScroll() - 4) return pageCount() - 1;
        return Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      }
      function goTo(i) {
        var n = pageCount(); i = ((i % n) + n) % n;
        var left;
        if (opts.byCard) { var c = cards()[i]; left = c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2; }
        else left = i * track.clientWidth;
        track.scrollTo({ left: Math.max(0, Math.min(left, maxScroll())), behavior: 'smooth' });
      }
      function step(dir) {
        if (!opts.byCard) {
          if (dir > 0 && track.scrollLeft >= maxScroll() - 4) return goTo(0);
          if (dir < 0 && track.scrollLeft <= 4) return goTo(pageCount() - 1);
        }
        goTo(activeIndex() + dir);
      }

      if (s.showArrows !== false && nav !== 'none') {
        var prev = document.createElement('button'), next = document.createElement('button');
        prev.type = next.type = 'button';
        prev.className = 'trust-reviews__car-arrow trust-reviews__car-arrow--prev';
        next.className = 'trust-reviews__car-arrow trust-reviews__car-arrow--next';
        prev.innerHTML = CHEV_L; next.innerHTML = CHEV_R;
        prev.setAttribute('aria-label', s.t.previous || 'Previous'); next.setAttribute('aria-label', s.t.next || 'Next');
        prev.addEventListener('click', function(){ step(-1); restart(); });
        next.addEventListener('click', function(){ step(1); restart(); });
        if (nav === 'top') {
          var bar = document.createElement('div'); bar.className = 'trust-reviews__car-topnav';
          bar.appendChild(prev); bar.appendChild(next);
          wrap.insertBefore(bar, wrap.firstChild);
        } else { wrap.appendChild(prev); wrap.appendChild(next); }
      }

      var foot = document.createElement('div'); foot.className = 'trust-reviews__car-foot';
      var dotsEl = null, fill = null;
      if (opts.progress) {
        var prog = document.createElement('div'); prog.className = 'trust-reviews__car-progress';
        fill = document.createElement('span'); prog.appendChild(fill); foot.appendChild(prog);
      } else if (s.showDots !== false) {
        dotsEl = document.createElement('div'); dotsEl.className = 'trust-reviews__car-dots'; foot.appendChild(dotsEl);
      }
      if (foot.children.length) wrap.appendChild(foot);

      function buildDots() {
        if (!dotsEl) return;
        var n = pageCount();
        if (n === dotBtns.length) return;
        dotsEl.innerHTML = ''; dotBtns = [];
        for (var i = 0; i < n && n > 1; i++) (function(idx){
          var d = document.createElement('button'); d.type = 'button'; d.className = 'trust-reviews__car-dot';
          d.setAttribute('aria-label', (idx + 1) + ' / ' + n);
          d.addEventListener('click', function(){ goTo(idx); restart(); });
          dotsEl.appendChild(d); dotBtns.push(d);
        })(i);
      }
      function sync() {
        raf = 0;
        var a = activeIndex();
        for (var i = 0; i < dotBtns.length; i++) dotBtns[i].classList.toggle('is-active', i === a);
        if (fill) {
          var vis = track.clientWidth / Math.max(1, track.scrollWidth);
          fill.style.width = Math.max(vis * 100, 8) + '%';
          fill.style.transform = 'translateX(' + (maxScroll() ? track.scrollLeft / maxScroll() * (1 / Math.max(vis, .08) - 1) * 100 : 0) + '%)';
        }
        if (opts.byCard) { var c = cards(); for (var k = 0; k < c.length; k++) c[k].classList.toggle('is-center', k === a); }
        wrap.classList.toggle('is-static', maxScroll() <= 2);
      }
      // rAF keeps dots/progress smooth while scrolling; scrollend plus a short
      // debounce guarantee a final sync even when frames are throttled.
      var settleT;
      track.addEventListener('scroll', function(){
        if (!raf) raf = requestAnimationFrame(sync);
        clearTimeout(settleT); settleT = setTimeout(sync, 120);
      }, { passive: true });
      track.addEventListener('scrollend', sync);
      window.addEventListener('resize', function(){ buildDots(); sync(); });
      track.addEventListener('keydown', function(e){
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); restart(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); restart(); }
      });

      // Autoplay
      function tick() { if (!paused && inView && !document.hidden && maxScroll() > 2) step(1); }
      function restart() { clearInterval(timer); if (s.autoplay && !opts.noAutoplay) timer = setInterval(tick, Math.max(s.autoplaySpeed || 4000, 2500)); }
      wrap.addEventListener('mouseenter', function(){ paused = true; });
      wrap.addEventListener('mouseleave', function(){ paused = false; });
      var touchT;
      track.addEventListener('touchstart', function(){ paused = true; clearTimeout(touchT); }, { passive: true });
      track.addEventListener('touchend', function(){ touchT = setTimeout(function(){ paused = false; }, 4000); }, { passive: true });
      if ('IntersectionObserver' in window) new IntersectionObserver(function(e){ inView = e[0].isIntersecting; }, { threshold: 0.3 }).observe(wrap);
      restart();

      // First layout happens after the widget is attached to the page.
      requestAnimationFrame(function(){ buildDots(); sync(); });
      return { goTo: goTo, step: step };
    }

    // Modern review card used by the carousel family: optional media on top
    // (tap opens the fullscreen player), stars, title, text, author footer.
    function carCard(r, s, all, idx, opts) {
      opts = opts || {};
      var card = document.createElement('article'); card.className = 'trust-reviews__cc' + (opts.cls ? ' ' + opts.cls : '');
      if (opts.media !== false && r.mediaUrl) {
        var mw = document.createElement('div'); mw.className = 'trust-reviews__cc-media';
        var m = instaMedia(r, 'trust-reviews__cc-mediael', s);
        mw.appendChild(m);
        if (isVid(r)) mw.insertAdjacentHTML('beforeend', '<span class="trust-reviews__igc-play">' + PLAY_SVG + '</span>');
        mw.setAttribute('aria-label', r.customer || 'Customer');
        asButton(mw, function(){ openInstaLightbox(all, idx, s); });
        hoverPlay(mw, m);
        card.appendChild(mw);
      }
      var who = '<span class="trust-reviews__cc-who"><strong>' + esc(r.customer || 'Customer') + '</strong>' +
        (s.showVerified ? '<span class="trust-reviews__cc-verified"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z"/><path d="M8.5 12.3l2.3 2.2 4.7-4.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' + esc(s.t.verified || 'Verified') + '</span>' : '') +
        '</span>';
      card.insertAdjacentHTML('beforeend',
        '<div class="trust-reviews__cc-body">' +
          (opts.quote ? '<span class="trust-reviews__cc-quote">' + QUOTE_SVG + '</span>' : '') +
          '<div class="trust-reviews__cc-stars">' + starHTML(r.rating, s.starColor || '#F59E0B') + '</div>' +
          (r.title ? '<p class="trust-reviews__cc-title">' + esc(r.title) + '</p>' : '') +
          '<p class="trust-reviews__cc-text">' + esc(r.comment || '') + '</p>' +
          '<div class="trust-reviews__cc-foot">' +
            (s.showAvatar ? '<span class="trust-reviews__cc-avatar">' + esc(initials(r.customer)) + '</span>' : '') + who +
            (s.showDate && r.createdAt ? '<small class="trust-reviews__cc-date">' + esc(fmtDate(r.createdAt)) + '</small>' : '') +
          '</div>' +
        '</div>');
      return card;
    }

    // Cards Carousel / Single Review. Columns per view come from the widget's
    // desktop/tablet/mobile column settings (CSS vars set in applyVars).
    function buildSlider(reviews, s) {
      var items = reviews.slice(0, s.maxRev);
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__car trust-reviews__car--slider';
      if ((parseInt(s.columns, 10) || 1) === 1) wrap.classList.add('is-single');
      var track = document.createElement('div'); track.className = 'trust-reviews__car-track';
      wrap.appendChild(track);
      items.forEach(function(r, i){ track.appendChild(carCard(r, s, items, i, { quote: wrap.classList.contains('is-single') })); });
      attachCarousel(wrap, track, s, { nav: 'sides' });
      return wrap;
    }

    // Videos Carousel (and "Horizontal Scroll"): media-first tall cards with a
    // progress bar; videos preview on hover and open in the fullscreen player.
    function buildScrollStrip(reviews, s) {
      var items = mediaFirst(reviews, s.maxRev);
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__car trust-reviews__car--strip';
      var track = document.createElement('div'); track.className = 'trust-reviews__car-track';
      wrap.appendChild(track);
      items.forEach(function(r, i){ track.appendChild(carCard(r, s, items, i)); });
      attachCarousel(wrap, track, s, { nav: 'sides', progress: true });
      return wrap;
    }

    // Infinite Marquee: one or two rows gliding in opposite directions forever
    // (content duplicated for a seamless loop). Pauses on hover; static and
    // scrollable for visitors who prefer reduced motion.
    function buildMarquee(reviews, s) {
      var items = reviews.slice(0, s.maxRev);
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__mq';
      var rows = items.length >= 6 ? [items.filter(function(_, i){ return i % 2 === 0; }), items.filter(function(_, i){ return i % 2 === 1; })] : [items];
      rows.forEach(function(rowItems, ri) {
        var row = document.createElement('div'); row.className = 'trust-reviews__mq-row' + (ri % 2 ? ' is-reverse' : '');
        var lane = document.createElement('div'); lane.className = 'trust-reviews__mq-lane';
        lane.style.animationDuration = Math.max(20, rowItems.length * 7) + 's';
        for (var copy = 0; copy < 2; copy++) rowItems.forEach(function(r) {
          var c = document.createElement('div'); c.className = 'trust-reviews__mq-card';
          if (copy) c.setAttribute('aria-hidden', 'true');
          c.innerHTML =
            '<div class="trust-reviews__mq-head">' +
              (r.mediaUrl && !isVid(r) ? '<img class="trust-reviews__mq-thumb" src="' + esc(r.mediaUrl) + '" alt="" loading="lazy">' : '<span class="trust-reviews__cc-avatar">' + esc(initials(r.customer)) + '</span>') +
              '<span class="trust-reviews__cc-who"><strong>' + esc(r.customer || 'Customer') + '</strong><span class="trust-reviews__mq-stars">' + starHTML(r.rating, s.starColor || '#F59E0B') + '</span></span>' +
            '</div>' +
            '<p class="trust-reviews__mq-text">' + esc(r.comment || r.title || '') + '</p>';
          lane.appendChild(c);
        });
        row.appendChild(lane); wrap.appendChild(row);
      });
      return wrap;
    }

    // Bubble Testimonials: speech-bubble cards (big quote mark, tail) with the
    // author sitting under the bubble; arrows live top-right like a section nav.
    function buildBubbleCarousel(reviews, s) {
      var items = reviews.slice(0, s.maxRev);
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__car trust-reviews__car--bubble';
      var track = document.createElement('div'); track.className = 'trust-reviews__car-track';
      wrap.appendChild(track);
      items.forEach(function(r, i) {
        var card = document.createElement('article'); card.className = 'trust-reviews__bb';
        card.innerHTML =
          '<div class="trust-reviews__bb-bubble">' +
            '<span class="trust-reviews__cc-quote">' + QUOTE_SVG + '</span>' +
            '<div class="trust-reviews__cc-stars">' + starHTML(r.rating, s.starColor || '#F59E0B') + '</div>' +
            (r.title ? '<p class="trust-reviews__cc-title">' + esc(r.title) + '</p>' : '') +
            '<p class="trust-reviews__cc-text">' + esc(r.comment || '') + '</p>' +
          '</div>' +
          '<div class="trust-reviews__bb-author">' +
            (r.mediaUrl && !isVid(r) ? '<img class="trust-reviews__bb-photo" src="' + esc(r.mediaUrl) + '" alt="" loading="lazy">' : '<span class="trust-reviews__cc-avatar trust-reviews__bb-photo">' + esc(initials(r.customer)) + '</span>') +
            '<span class="trust-reviews__cc-who"><strong>' + esc(r.customer || 'Customer') + '</strong>' +
              (s.showDate && r.createdAt ? '<small>' + esc(fmtDate(r.createdAt)) + '</small>' : (s.showVerified ? '<small>' + esc(s.t.verified || 'Verified') + '</small>' : '')) + '</span>' +
          '</div>';
        if (r.mediaUrl) { card.classList.add('has-media'); asButton(card.querySelector('.trust-reviews__bb-photo'), function(){ openInstaLightbox(items, i, s); }); }
        track.appendChild(card);
      });
      attachCarousel(wrap, track, s, { nav: 'top' });
      return wrap;
    }

    // Center Focus: the centered card is full size with an accent glow, its
    // neighbours shrink and fade. Steps one card at a time.
    function buildCenterCarousel(reviews, s) {
      var items = reviews.slice(0, s.maxRev);
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__car trust-reviews__car--center';
      var track = document.createElement('div'); track.className = 'trust-reviews__car-track';
      wrap.appendChild(track);
      items.forEach(function(r, i){
        var c = carCard(r, s, items, i, { quote: true });
        c.addEventListener('click', function(e){ if (!c.classList.contains('is-center') && !(e.target.closest && e.target.closest('.trust-reviews__cc-media'))) ctl.goTo(i); });
        track.appendChild(c);
      });
      var ctl = attachCarousel(wrap, track, s, { nav: 'sides', byCard: true });
      return wrap;
    }

    // Spotlight Slider: a rating panel (big score, counter, segmented progress,
    // arrows) beside one large crossfading testimonial with the review photo.
    function buildSpotlight(reviews, s, total, avg) {
      var items = reviews.slice(0, s.maxRev), n = items.length, current = 0, timer = null, paused = false, inView = true;
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__sp';
      var avgNum = Number(avg || 0);
      var pad = function(x){ return (x < 10 ? '0' : '') + x; };
      var panel = document.createElement('div'); panel.className = 'trust-reviews__sp-panel';
      panel.innerHTML =
        '<div class="trust-reviews__sp-score">' + avgNum.toFixed(1) + '</div>' +
        '<div class="trust-reviews__sp-stars">' + starHTML(Math.round(avgNum), s.starColor || '#F59E0B') + '</div>' +
        '<div class="trust-reviews__sp-based">' + esc((s.t.basedOn || 'Based on') + ' ' + total + ' ' + (total === 1 ? (s.t.review || 'review') : (s.t.reviews || 'reviews'))) + '</div>' +
        '<div class="trust-reviews__sp-counter"><b>' + pad(1) + '</b> / ' + pad(n) + '</div>' +
        '<div class="trust-reviews__sp-segs"></div>' +
        '<div class="trust-reviews__sp-nav">' +
          '<button type="button" class="trust-reviews__car-arrow trust-reviews__sp-btn" data-dir="-1" aria-label="' + esc(s.t.previous || 'Previous') + '">' + CHEV_L + '</button>' +
          '<button type="button" class="trust-reviews__car-arrow trust-reviews__sp-btn" data-dir="1" aria-label="' + esc(s.t.next || 'Next') + '">' + CHEV_R + '</button>' +
        '</div>';
      var stage = document.createElement('div'); stage.className = 'trust-reviews__sp-stage';
      wrap.appendChild(panel); wrap.appendChild(stage);
      var segs = panel.querySelector('.trust-reviews__sp-segs'), counter = panel.querySelector('.trust-reviews__sp-counter b');
      if (s.showArrows === false || n < 2) panel.querySelector('.trust-reviews__sp-nav').style.display = 'none';

      var slides = items.map(function(r, i) {
        var sl = document.createElement('div'); sl.className = 'trust-reviews__sp-slide' + (i === 0 ? ' is-active' : '');
        sl.innerHTML =
          '<span class="trust-reviews__sp-quote">' + QUOTE_SVG + '</span>' +
          (r.title ? '<p class="trust-reviews__sp-title">' + esc(r.title) + '</p>' : '') +
          '<p class="trust-reviews__sp-text">' + esc(r.comment || '') + '</p>' +
          '<div class="trust-reviews__sp-author">' +
            '<span class="trust-reviews__cc-avatar">' + esc(initials(r.customer)) + '</span>' +
            '<span class="trust-reviews__cc-who"><strong>' + esc(r.customer || 'Customer') + '</strong>' +
              '<small>' + starHTML(r.rating, s.starColor || '#F59E0B') + (s.showVerified ? ' &middot; ' + esc(s.t.verified || 'Verified') : '') + '</small></span>' +
          '</div>';
        if (r.mediaUrl) {
          var mw = document.createElement('div'); mw.className = 'trust-reviews__sp-media';
          var m = instaMedia(r, 'trust-reviews__cc-mediael', s); mw.appendChild(m);
          if (isVid(r)) mw.insertAdjacentHTML('beforeend', '<span class="trust-reviews__igc-play">' + PLAY_SVG + '</span>');
          asButton(mw, function(){ openInstaLightbox(items, i, s); });
          hoverPlay(mw, m);
          sl.classList.add('has-media'); sl.insertBefore(mw, sl.firstChild);
        }
        stage.appendChild(sl);
        var seg = document.createElement('button'); seg.type = 'button'; seg.className = 'trust-reviews__sp-seg' + (i === 0 ? ' is-active' : '');
        seg.setAttribute('aria-label', (i + 1) + ' / ' + n);
        seg.addEventListener('click', function(){ show(i); restart(); });
        segs.appendChild(seg);
        return sl;
      });

      function show(i) {
        current = ((i % n) + n) % n;
        slides.forEach(function(sl, k){ sl.classList.toggle('is-active', k === current); });
        var sg = segs.children;
        for (var k = 0; k < sg.length; k++) { sg[k].classList.toggle('is-active', k === current); sg[k].classList.toggle('is-done', k < current); }
        counter.textContent = pad(current + 1);
      }
      panel.addEventListener('click', function(e){ var b = e.target.closest('[data-dir]'); if (b) { show(current + Number(b.getAttribute('data-dir'))); restart(); } });
      var sx = 0;
      stage.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; paused = true; }, { passive: true });
      stage.addEventListener('touchend', function(e){ var dx = e.changedTouches[0].clientX - sx; paused = false; if (Math.abs(dx) > 40) { show(current + (dx < 0 ? 1 : -1)); restart(); } });
      wrap.addEventListener('mouseenter', function(){ paused = true; });
      wrap.addEventListener('mouseleave', function(){ paused = false; });
      if ('IntersectionObserver' in window) new IntersectionObserver(function(e){ inView = e[0].isIntersecting; }, { threshold: 0.3 }).observe(wrap);
      function restart() { clearInterval(timer); if (s.autoplay && n > 1) timer = setInterval(function(){ if (!paused && inView && !document.hidden) show(current + 1); }, Math.max(s.autoplaySpeed || 5000, 4000)); }
      restart();
      return wrap;
    }

    // "Hero Quote" carousel: full-bleed crossfading slides — the review's photo
    // (or a gradient) fills the background with a large centered quote overlay.
    function buildHeroQuote(reviews, s) {
      var items = reviews.slice(0, s.maxRev), total = items.length;
      var wrap  = document.createElement('div'); wrap.className = 'trust-reviews__hero-wrap';
      var stage = document.createElement('div'); stage.className = 'trust-reviews__hero-stage';
      wrap.appendChild(stage);

      var slides = [], dotBtns = [], current = 0;
      for (var i = 0; i < total; i++) {
        var r = items[i];
        var slide = document.createElement('div'); slide.className = 'trust-reviews__hero-slide' + (i === 0 ? ' active' : '');
        if (r.mediaUrl && (r.mediaType || '').indexOf('video') !== 0) {
          slide.style.backgroundImage = 'linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.55)), url(' + r.mediaUrl + ')';
        } else {
          slide.style.background = 'linear-gradient(135deg,' + (s.accentColor || '#6B1A2C') + ',#1a1a1a)';
        }
        slide.innerHTML = '<div class="trust-reviews__hero-inner"><div class="trust-reviews__hero-stars">' + starHTML(r.rating, '#fff') + '</div>' +
          '<p class="trust-reviews__hero-quote">&ldquo;' + (r.comment || '') + '&rdquo;</p>' +
          '<div class="trust-reviews__hero-name">' + (r.customer || 'Customer') + '</div></div>';
        stage.appendChild(slide); slides.push(slide);
      }

      function goTo(idx) {
        current = ((idx % total) + total) % total;
        for (var k = 0; k < slides.length; k++) slides[k].classList.toggle('active', k === current);
        for (var d = 0; d < dotBtns.length; d++) dotBtns[d].classList.toggle('active', d === current);
      }
      if (s.showArrows !== false && total > 1) {
        var prevBtn = document.createElement('button'), nextBtn = document.createElement('button');
        prevBtn.className = 'trust-reviews__hero-arrow-btn tr-left'; nextBtn.className = 'trust-reviews__hero-arrow-btn tr-right';
        prevBtn.innerHTML = '&#8249;'; nextBtn.innerHTML = '&#8250;';
        prevBtn.setAttribute('aria-label', s.t.previous); nextBtn.setAttribute('aria-label', s.t.next);
        prevBtn.addEventListener('click', function(){ goTo(current - 1); }); nextBtn.addEventListener('click', function(){ goTo(current + 1); });
        stage.appendChild(prevBtn); stage.appendChild(nextBtn);
      }
      if (s.showDots !== false && total > 1) {
        var dotsEl = document.createElement('div'); dotsEl.className = 'trust-reviews__slider-dots';
        for (var j = 0; j < total; j++) { (function(idx){ var d = document.createElement('button'); d.className = 'trust-reviews__dot' + (idx === 0 ? ' active' : ''); d.addEventListener('click', function(){ goTo(idx); }); dotsEl.appendChild(d); dotBtns.push(d); })(j); }
        wrap.appendChild(dotsEl);
      }
      if (s.autoplay !== false && total > 1) {
        var timer = setInterval(function(){ goTo(current + 1); }, s.autoplaySpeed || 4000);
        wrap.addEventListener('mouseenter', function(){ clearInterval(timer); });
        wrap.addEventListener('mouseleave', function(){ timer = setInterval(function(){ goTo(current + 1); }, s.autoplaySpeed || 4000); });
      }
      return wrap;
    }

    // Coverflow / peek carousel: the active review card sits centered at full
    // size, neighboring cards peek at reduced scale/opacity on either side.
    function buildCoverflow(reviews, s) {
      var items = reviews.slice(0, s.maxRev), total = items.length;
      var wrap  = document.createElement('div'); wrap.className = 'trust-reviews__coverflow-wrap';
      var track = document.createElement('div'); track.className = 'trust-reviews__coverflow-track';
      wrap.appendChild(track);

      var current = 0, cardEls = [], dotBtns = [];

      function goTo(idx) {
        current = ((idx % total) + total) % total;
        for (var k = 0; k < cardEls.length; k++) {
          var offset = k - current, el = cardEls[k], abs = Math.abs(offset);
          el.classList.toggle('is-active', offset === 0);
          el.style.transform = 'translateX(calc(-50% + ' + (offset * 78) + '%)) scale(' + (offset === 0 ? 1 : 0.84) + ')';
          el.style.opacity = String(abs > 2 ? 0 : (offset === 0 ? 1 : 0.55));
          el.style.zIndex = String(10 - abs);
          el.style.pointerEvents = abs > 2 ? 'none' : 'auto';
        }
        for (var d = 0; d < dotBtns.length; d++) dotBtns[d].classList.toggle('active', d === current);
      }

      for (var i = 0; i < total; i++) {
        var cardWrap = document.createElement('div'); cardWrap.className = 'trust-reviews__coverflow-item';
        cardWrap.appendChild(buildCard(items[i], s));
        (function(idx) { cardWrap.addEventListener('click', function(){ goTo(idx); }); })(i);
        track.appendChild(cardWrap); cardEls.push(cardWrap);
      }

      if (s.showDots !== false && total > 1) {
        var dotsEl = document.createElement('div'); dotsEl.className = 'trust-reviews__slider-dots';
        for (var j = 0; j < total; j++) { (function(idx){ var d = document.createElement('button'); d.className = 'trust-reviews__dot'; d.addEventListener('click', function(){ goTo(idx); }); dotsEl.appendChild(d); dotBtns.push(d); })(j); }
        wrap.appendChild(dotsEl);
      }
      if (s.showArrows !== false && total > 1) {
        var arrowRow = document.createElement('div'); arrowRow.className = 'trust-reviews__slider-arrows';
        var prevBtn = document.createElement('button'), nextBtn = document.createElement('button');
        prevBtn.className = nextBtn.className = 'trust-reviews__slider-btn';
        prevBtn.innerHTML = '&#8249;'; nextBtn.innerHTML = '&#8250;';
        prevBtn.setAttribute('aria-label', s.t.previous); nextBtn.setAttribute('aria-label', s.t.next);
        prevBtn.addEventListener('click', function(){ goTo(current - 1); }); nextBtn.addEventListener('click', function(){ goTo(current + 1); });
        arrowRow.appendChild(prevBtn); arrowRow.appendChild(nextBtn); wrap.appendChild(arrowRow);
      }

      goTo(0);

      if (s.autoplay !== false && total > 1) {
        var timer = setInterval(function(){ goTo(current + 1); }, s.autoplaySpeed || 4000);
        wrap.addEventListener('mouseenter', function(){ clearInterval(timer); });
        wrap.addEventListener('mouseleave', function(){ timer = setInterval(function(){ goTo(current + 1); }, s.autoplaySpeed || 4000); });
      }
      return wrap;
    }

    // Split media carousel: photo/video on one side, review text on the other —
    // one review per slide. Only the active slide's video plays.
    function buildSplitMedia(reviews, s) {
      var items = reviews.slice(0, s.maxRev), total = items.length;
      var wrap  = document.createElement('div'); wrap.className = 'trust-reviews__split-wrap';
      var stage = document.createElement('div'); stage.className = 'trust-reviews__split-stage';
      wrap.appendChild(stage);

      var slides = [], videoEls = [], dotBtns = [], current = 0;

      for (var i = 0; i < total; i++) {
        var r = items[i];
        var slide = document.createElement('div'); slide.className = 'trust-reviews__split-slide' + (i === 0 ? ' active' : '');
        var mediaCol = document.createElement('div'); mediaCol.className = 'trust-reviews__split-media-col';
        var media, isVideo = r.mediaUrl && (r.mediaType || '').indexOf('video') === 0;
        if (isVideo) {
          media = document.createElement('video'); media.src = r.mediaUrl; media.muted = true; media.loop = true; media.playsInline = true; media.className = 'trust-reviews__split-media';
        } else if (r.mediaUrl) {
          media = document.createElement('img'); media.src = r.mediaUrl; media.alt = ''; media.loading = 'lazy'; media.className = 'trust-reviews__split-media';
        } else {
          media = document.createElement('div'); media.className = 'trust-reviews__split-media trust-reviews__split-media--text';
          media.style.background = 'linear-gradient(135deg,' + (s.accentColor || '#6B1A2C') + ',#1a1a1a)';
        }
        mediaCol.appendChild(media);
        videoEls.push(isVideo ? media : null);

        var textCol = document.createElement('div'); textCol.className = 'trust-reviews__split-text-col';
        textCol.innerHTML =
          '<div class="trust-reviews__split-stars">' + starHTML(r.rating, s.accentColor) + '</div>' +
          (r.title ? '<h3 class="trust-reviews__split-title">' + r.title + '</h3>' : '') +
          '<p class="trust-reviews__split-comment">' + (r.comment || '') + '</p>' +
          '<div class="trust-reviews__split-name">' + (r.customer || 'Customer') + '</div>';

        slide.appendChild(mediaCol); slide.appendChild(textCol);
        stage.appendChild(slide); slides.push(slide);
      }

      function goTo(idx) {
        current = ((idx % total) + total) % total;
        for (var k = 0; k < slides.length; k++) {
          slides[k].classList.toggle('active', k === current);
          if (videoEls[k]) { if (k === current) videoEls[k].play().catch(function(){}); else videoEls[k].pause(); }
        }
        for (var d = 0; d < dotBtns.length; d++) dotBtns[d].classList.toggle('active', d === current);
      }

      if (s.showDots !== false && total > 1) {
        var dotsEl = document.createElement('div'); dotsEl.className = 'trust-reviews__slider-dots';
        for (var j = 0; j < total; j++) { (function(idx){ var d = document.createElement('button'); d.className = 'trust-reviews__dot' + (idx === 0 ? ' active' : ''); d.addEventListener('click', function(){ goTo(idx); }); dotsEl.appendChild(d); dotBtns.push(d); })(j); }
        wrap.appendChild(dotsEl);
      }
      if (s.showArrows !== false && total > 1) {
        var arrowRow = document.createElement('div'); arrowRow.className = 'trust-reviews__slider-arrows';
        var prevBtn = document.createElement('button'), nextBtn = document.createElement('button');
        prevBtn.className = nextBtn.className = 'trust-reviews__slider-btn';
        prevBtn.innerHTML = '&#8249;'; nextBtn.innerHTML = '&#8250;';
        prevBtn.setAttribute('aria-label', s.t.previous); nextBtn.setAttribute('aria-label', s.t.next);
        prevBtn.addEventListener('click', function(){ goTo(current - 1); }); nextBtn.addEventListener('click', function(){ goTo(current + 1); });
        arrowRow.appendChild(prevBtn); arrowRow.appendChild(nextBtn); wrap.appendChild(arrowRow);
      }

      if (videoEls[0]) videoEls[0].play().catch(function(){});

      if (s.autoplay !== false && total > 1) {
        var timer = setInterval(function(){ goTo(current + 1); }, s.autoplaySpeed || 4000);
        wrap.addEventListener('mouseenter', function(){ clearInterval(timer); });
        wrap.addEventListener('mouseleave', function(){ timer = setInterval(function(){ goTo(current + 1); }, s.autoplaySpeed || 4000); });
      }
      return wrap;
    }

    function injectWidgetSchema(avgRating, total, reviews) {
      if (!seoEnabled || !productTitle || !total) return;

      var aggRating = {
        '@type': 'AggregateRating',
        'ratingValue': avgRating.toFixed(1),
        'reviewCount': String(total),
        'bestRating': '5',
        'worstRating': '1'
      };
      var reviewItems = reviews.slice(0, 20).map(function(r) {
        var item = {
          '@type': 'Review',
          'author': { '@type': 'Person', 'name': r.customer || 'Customer' },
          'reviewRating': { '@type': 'Rating', 'ratingValue': String(r.rating), 'bestRating': '5', 'worstRating': '1' },
          'reviewBody': r.comment || ''
        };
        if (r.createdAt) item['datePublished'] = r.createdAt.split('T')[0];
        return item;
      });

      // Find the theme's existing Product schema and augment it instead of adding a duplicate
      var existingScript = null;
      var existingRoot   = null;
      var existingData   = null;
      document.querySelectorAll('script[type="application/ld+json"]').forEach(function(sc) {
        if (existingData) return;
        try {
          var d = JSON.parse(sc.textContent);
          var arr = Array.isArray(d) ? d : [d];
          arr.forEach(function(node) {
            if (!existingData && node['@type'] === 'Product') {
              existingData   = node;
              existingScript = sc;
              existingRoot   = d;
            }
          });
        } catch(e) {}
      });

      if (existingScript && existingData) {
        existingData['aggregateRating'] = aggRating;
        existingData['review']          = reviewItems;
        // Write back the same root we mutated (array or single object) —
        // re-parsing existingScript.textContent here would produce a fresh,
        // unmutated object graph and silently drop these fields whenever the
        // theme wraps its Product schema in an array.
        existingScript.textContent = JSON.stringify(existingRoot);
        return;
      }

      var sid = 'tr-ld-json-' + productId;
      if (document.getElementById(sid)) return;
      var schema = {
        '@context': 'https://schema.org/', '@type': 'Product', 'name': productTitle,
        'aggregateRating': aggRating,
        'review': reviewItems
      };
      var sc = document.createElement('script');
      sc.id   = sid;
      sc.type = 'application/ld+json';
      sc.textContent = JSON.stringify(schema);
      document.head.appendChild(sc);
    }

    function renderReviews(apiData, s) {
      loadingEl.style.display='none';
      var reviews=apiData.reviews||[];
      // summary_side ships its own "Write a Review" button/modal, so it must render
      // even with zero reviews — otherwise there'd be no way for a customer to add one.
      if(!reviews.length && s.style!=='summary_side'){ container.innerHTML='<p class="tr-extensions-product-review-assets-reviews-widget-p-112" style="color:#888;font-size:.9rem">'+(s.t?s.t.noReviews:'No reviews yet.')+'</p>'; return; }
      if(reviews.length) injectWidgetSchema(apiData.averageRating || 0, apiData.total || reviews.length, reviews);
      applyVars(s);
      var el;
      if(s.style==='floating_tab')  { el=buildFloatingTab(reviews,s); }
      else if(s.style==='slider')   { el=buildSlider(reviews,s); }
      else if(s.style==='insta_stories') { el=buildInstaStories(reviews,s); }
      else if(s.style==='insta_reels')   { el=buildInstaReels(reviews,s); }
      else if(s.style==='insta_carousel') { el=buildInstaCarousel(reviews,s); }
      else if(s.style==='marquee')         { el=buildMarquee(reviews,s); }
      else if(s.style==='bubble_carousel') { el=buildBubbleCarousel(reviews,s); }
      else if(s.style==='center_carousel') { el=buildCenterCarousel(reviews,s); }
      else if(s.style==='spotlight_slider'){ el=buildSpotlight(reviews,s,apiData.total||reviews.length,apiData.averageRating||0); }
      else if(s.style==='insta_mosaic')   { el=buildInstaMosaic(reviews,s); }
      else if(s.style==='insta_phone')    { el=buildInstaPhone(reviews,s); }
      else if(s.style==='insta_stack')    { el=buildInstaStack(reviews,s); }
      else if(s.style==='hero_quote')    { el=buildHeroQuote(reviews,s); }
      else if(s.style==='coverflow')     { el=buildCoverflow(reviews,s); }
      else if(s.style==='split_media')   { el=buildSplitMedia(reviews,s); }
      else if(s.style==='snippet_rotator') { el=buildSnippetRotator(reviews,s); }
      else if(s.style==='compact_rows')    { el=buildCompactRows(reviews,s); }
      else if(s.style==='scroll_strip') { el=buildScrollStrip(reviews,s); }
      else if(s.style==='badge_strip')  { el=buildBadgeStrip(reviews,s,apiData.averageRating||0); }
      else if(s.style==='star_summary') { el=buildStarSummary(reviews,s,apiData.total||reviews.length,apiData.averageRating||0); }
      else if(s.style==='quote_fade')   { el=buildQuoteFade(reviews,s); }
      else if(s.style==='classic_list')   { el=buildClassicList(reviews,s); }
      else if(s.style==='compact_rows')   { el=buildCompactRows(reviews,s); }
      else if(s.style==='summary_side') { el=buildSummaryList(reviews,s,apiData.total||reviews.length,apiData.averageRating||0); }
      else if(s.style==='photo_masonry'){ el=buildPhotoMasonry(reviews,s,apiData.total||reviews.length,apiData.averageRating||0); }
      else if(s.style==='popup') {
        el=document.createElement('div'); el.className='trust-reviews__grid'; el.style.gridTemplateColumns='repeat('+s.columns+',1fr)';
        var pItems=reviews.slice(0,s.maxRev); for(var pi=0;pi<pItems.length;pi++) el.appendChild(buildCard(pItems[pi],s));
        setupPopup(reviews,s);
      } else {
        el=document.createElement('div'); el.className='trust-reviews__grid';
        if(s.style!=='list_view'&&s.style!=='editorial') el.style.gridTemplateColumns='repeat('+s.columns+',1fr)';
        var gItems=reviews.slice(0,s.maxRev); for(var gi=0;gi<gItems.length;gi++) el.appendChild(buildCard(gItems[gi],s));
      }
      container.appendChild(el); attachLikes(container);
    }

    // widgetKey 'auto' → the server decides (and remembers) which saved widget this
    // block shows, using the block id + whether we're inside the Theme Editor.
    var autoParams = widgetKey === 'auto'
      ? '&blockId=' + encodeURIComponent(bid) + '&designMode=' + (widget.dataset.designMode === 'true' || !!(window.Shopify && window.Shopify.designMode))
      : '';
    fetch('/apps/review?shop='+shop+'&type=widget-defaults&widgetKey='+widgetKey+autoParams+'&locale='+encodeURIComponent(storeLocale))
    .then(function(r){return r.json();})
    .then(function(resp){
      if (resp.widgetKey) widgetKey = resp.widgetKey; // resolved 'auto' → real key for the reviews fetch below
      var d=resp.settings||{}, t=resp.translations||TRANSLATIONS.en; resolvedT=t;
      var accentColor=(blockColor&&blockColor!==D_COLOR)?blockColor:(d.accentColor||D_COLOR);
      // blockStyle is the block-level "Widget Design Override" field. '' is its new
      // "inherit from Saved widget" default; 'dark_grid' is kept here too since every
      // block saved before that change still has 'dark_grid' stored as its value and
      // must keep inheriting rather than suddenly start overriding on next page load.
      var style=(widgetKey==='custom_template'&&d.defaultStyle)?d.defaultStyle:((blockStyle&&blockStyle!==D_STYLE&&blockStyle!=='')?blockStyle:(d.defaultStyle||D_STYLE));
      var columns=(blockCols&&blockCols!==D_COLS)?parseInt(blockCols,10):(d.columns||3);
      var maxRev=(blockMax&&blockMax!==D_MAX)?parseInt(blockMax,10):(d.maxReviews||6);
      var showVerified=(blockVerif==='false')?false:(d.showVerified!==false);
      var showAvatar=(blockAvatar==='false')?false:(d.showAvatar!==false);
      var showDate=(blockDate==='false')?false:(d.showDate!==false);
      var showHelpfulVoting=d.showHelpfulVoting!==false;
      // Block-level color overrides follow the same pattern as accentColor above:
      // only win over the Saved Widget's value when the merchant has actually
      // changed them away from the block schema's own default in Theme Editor.
      var starColor=(blockStarColor&&blockStarColor!==D_STAR_COLOR)?blockStarColor:(d.starColor||D_STAR_COLOR);
      var textColor=(blockTextColor&&blockTextColor!==D_TEXT_COLOR)?blockTextColor:(d.textColor||D_TEXT_COLOR);
      var mutedTextColor=(blockMutedColor&&blockMutedColor!==D_MUTED_COLOR)?blockMutedColor:(d.mutedTextColor||D_MUTED_COLOR);
      // headingColor stays null (unset) rather than resolving to a concrete
      // default here: unlike the other colors, the "no customization" look
      // differs per widget style (accent-colored heading on grid/list styles
      // vs. text-colored on Summary + List) — baking in one default here would
      // force every widget's heading to whichever default won, so the CSS's
      // own per-selector var(--tr-heading-color, <style-appropriate default>)
      // fallback is left to decide instead.
      var headingColor=(blockHeadingColor&&blockHeadingColor!==D_HEADING_COLOR)?blockHeadingColor:((d.headingColor&&d.headingColor!==D_HEADING_COLOR)?d.headingColor:null);
      var writeBtnColor=(blockWriteBtnColor&&blockWriteBtnColor!==D_WRITE_BTN_COLOR)?blockWriteBtnColor:(d.writeBtnColor||d.textColor||D_WRITE_BTN_COLOR);
      var borderColor=(blockBorderColor&&blockBorderColor!==D_BORDER_COLOR)?blockBorderColor:(d.borderColor||D_BORDER_COLOR);
      var backgroundColor=(blockBgColor&&blockBgColor!==D_BG_COLOR)?blockBgColor:(d.backgroundColor||'transparent');
      var cardBackground=(blockCardBg&&blockCardBg!==D_CARD_BG)?blockCardBg:(d.cardBackground||D_CARD_BG);
      if(headingEl){ var customH=(d.heading&&!isStockHeading(d.heading))?d.heading:null; if(isStockHeading(headingEl.textContent)) headingEl.textContent=customH||t.defaultHeading||D_HEADING; }
      var s={t:t,accentColor:accentColor,starColor:starColor,starGap:d.starGap!=null?d.starGap:2,textAlign:d.textAlign||'left',style:style,columns:columns,maxRev:maxRev,showVerified:showVerified,showAvatar:showAvatar,showDate:showDate,showHelpfulVoting:showHelpfulVoting,mutedTextColor:mutedTextColor,headingColor:headingColor,writeBtnColor:writeBtnColor,tabletColumns:d.tabletColumns||2,mobileColumns:d.mobileColumns||1,paddingTop:d.paddingTop!=null?d.paddingTop:40,paddingBottom:d.paddingBottom!=null?d.paddingBottom:40,cardPadding:d.cardPadding!=null?d.cardPadding:16,cardGap:d.cardGap!=null?d.cardGap:16,borderRadius:d.borderRadius!=null?d.borderRadius:10,showShadow:d.showShadow!==false,backgroundColor:backgroundColor,cardBackground:cardBackground,textColor:textColor,borderColor:borderColor,fontFamily:d.fontFamily||'inherit',headingSize:d.headingSize||32,reviewSize:d.reviewSize||16,metaSize:d.metaSize||13,autoplay:d.autoplay!==false,autoplaySpeed:d.autoplaySpeed||3000,showArrows:d.showArrows!==false,showDots:d.showDots!==false,popupEnabled:d.popupEnabled||false,popupDelay:d.popupDelay!=null?d.popupDelay:5000,summaryPosition:d.summaryPosition||'left',showWriteReviewBtn:d.showWriteReviewBtn||false,heading:d.heading||D_HEADING};
      return fetch('/apps/review?shop='+shop+'&productId='+productId+'&widgetKey='+widgetKey+'&locale='+encodeURIComponent(storeLocale)).then(function(r){return r.json();}).then(function(apiData){ (apiData.reviews||[]).forEach(function(r){ r.mediaUrl=resolveMedia(r.mediaUrl); }); var rt=apiData.translations||{}; for(var k in rt) if(!s.t[k]) s.t[k]=rt[k]; renderReviews(apiData,s); });
    })
    .catch(function(){ loadingEl.textContent=(resolvedT||TRANSLATIONS.en).couldNotLoad; });
  }

  var widgets = document.querySelectorAll('.trust-reviews-widget');
  for (var i = 0; i < widgets.length; i++) initWidget(widgets[i]);
})();
