(function () {
  var TRANSLATIONS = {
    en: { verified: 'Verified', noReviews: 'No reviews yet.', couldNotLoad: 'Could not load reviews.', review: 'review', reviews: 'reviews', readReviews: 'Read reviews', reviewsBtn: 'Reviews', close: 'Close', customerReviews: 'Customer Reviews', previous: 'Previous', next: 'Next' }
  };
  var D_COLOR = '#6B1A2C', D_STYLE = 'dark_grid', D_COLS = '3', D_MAX = '6', D_HEADING = 'What our customers say';

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
    var widgetKey   = widget.dataset.widgetKey || 'review_widget';

    var loadingEl = widget.querySelector('.trust-reviews__loading');
    var container = widget.querySelector('.trust-reviews__container');
    var headingEl = widget.querySelector('.trust-reviews__heading');
    var resolvedT = null;

    function starHTML(rating, accent) {
      var out = '';
      for (var i = 0; i < 5; i++) out += '<span style="color:' + (i < rating ? accent : '#ddd') + '">&#9733;</span>';
      return out;
    }
    function initials(name) { return (name || 'A').split(' ').map(function(w){ return w[0]; }).join('').toUpperCase().slice(0,2); }
    function fmtDate(iso) { return new Date(iso).toLocaleDateString(storeLocale || undefined, { year:'numeric', month:'short', day:'numeric' }); }
    function mediaHTML(r) {
      if (!r.mediaUrl) return '';
      if ((r.mediaType || '').indexOf('video') === 0) return '<div class="trust-reviews__media"><video src="' + r.mediaUrl + '" controls playsinline></video></div>';
      return '<div class="trust-reviews__media"><img src="' + r.mediaUrl + '" alt="review media" loading="lazy"></div>';
    }

    function buildCard(r, s) {
      var card = document.createElement('div'); card.className = 'trust-reviews__card';
      var avatarHTML   = s.showAvatar   ? '<span class="trust-reviews__avatar" style="background:' + s.accentColor + '">' + initials(r.customer) + '</span>' : '';
      var verifiedHTML = s.showVerified ? '<span class="trust-reviews__verified">' + s.t.verified + '</span>' : '';
      var dateHTML     = (s.showDate && r.createdAt) ? '<span>' + fmtDate(r.createdAt) + '</span>' : '';
      var titleHTML    = r.title ? '<p class="trust-reviews__title">' + r.title + '</p>' : '';
      var likeHTML     = '<button class="trust-reviews__like-btn" data-id="' + r.id + '">+1 <span class="like-count">' + (r.likes || 0) + '</span></button>';
      if (s.style === 'editorial') {
        card.innerHTML = avatarHTML + '<div class="trust-reviews__body"><div class="trust-reviews__stars">' + starHTML(r.rating, s.accentColor) + '</div>' + titleHTML + '<p class="trust-reviews__comment">' + r.comment + '</p>' + mediaHTML(r) + '<div class="trust-reviews__meta"><strong>' + r.customer + '</strong>' + verifiedHTML + dateHTML + likeHTML + '</div></div>';
      } else {
        card.innerHTML = '<div class="trust-reviews__stars">' + starHTML(r.rating, s.accentColor) + '</div>' + titleHTML + '<p class="trust-reviews__comment">' + r.comment + '</p>' + mediaHTML(r) + '<div class="trust-reviews__meta">' + avatarHTML + '<strong>' + r.customer + '</strong>' + verifiedHTML + dateHTML + likeHTML + '</div>';
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

    function buildSlider(reviews, s) {
      var items = reviews.slice(0, s.maxRev), perView = Math.max(1, parseInt(s.columns,10)||1);
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__slider-wrap';
      var track = document.createElement('div'); track.className = 'trust-reviews__slider-track';
      wrap.appendChild(track);
      var slides = [], current = 0, dotBtns = [];
      for (var i = 0; i < items.length; i += perView) {
        var slideEl = document.createElement('div'); slideEl.className = 'trust-reviews__slide';
        var chunk = items.slice(i, i + perView);
        for (var k = 0; k < chunk.length; k++) slideEl.appendChild(buildCard(chunk[k], s));
        track.appendChild(slideEl); slides.push(slideEl);
      }
      var total = slides.length;
      function goTo(idx) {
        current = ((idx % total) + total) % total;
        track.style.transform = 'translateX(-' + (current * 100) + '%)';
        for (var k = 0; k < dotBtns.length; k++) dotBtns[k].classList.toggle('active', k === current);
      }
      if (s.showDots) {
        var dotsEl = document.createElement('div'); dotsEl.className = 'trust-reviews__slider-dots';
        for (var j = 0; j < slides.length; j++) {
          (function(idx){ var d = document.createElement('button'); d.className = 'trust-reviews__dot' + (idx===0?' active':''); d.addEventListener('click', function(){ goTo(idx); }); dotsEl.appendChild(d); dotBtns.push(d); })(j);
        }
        wrap.appendChild(dotsEl);
      }
      if (s.showArrows) {
        var arrowRow = document.createElement('div'); arrowRow.className = 'trust-reviews__slider-arrows';
        var prevBtn = document.createElement('button'), nextBtn = document.createElement('button');
        prevBtn.className = nextBtn.className = 'trust-reviews__slider-btn';
        prevBtn.innerHTML = '&#8249;'; nextBtn.innerHTML = '&#8250;';
        prevBtn.setAttribute('aria-label', s.t.previous); nextBtn.setAttribute('aria-label', s.t.next);
        prevBtn.addEventListener('click', function(){ goTo(current-1); }); nextBtn.addEventListener('click', function(){ goTo(current+1); });
        arrowRow.appendChild(prevBtn); arrowRow.appendChild(nextBtn); wrap.appendChild(arrowRow);
      }
      if (s.autoplay && total > 1) {
        var timer = setInterval(function(){ goTo(current+1); }, s.autoplaySpeed);
        wrap.addEventListener('mouseenter', function(){ clearInterval(timer); });
        wrap.addEventListener('mouseleave', function(){ timer = setInterval(function(){ goTo(current+1); }, s.autoplaySpeed); });
      }
      var startX = 0;
      track.addEventListener('touchstart', function(e){ startX = e.touches[0].clientX; }, { passive:true });
      track.addEventListener('touchend', function(e){ var dx = e.changedTouches[0].clientX - startX; if (Math.abs(dx)>40) goTo(current+(dx<0?1:-1)); });
      return wrap;
    }

    function buildScrollStrip(reviews, s) {
      var strip = document.createElement('div'); strip.className = 'trust-reviews__scroll-strip';
      var items = reviews.slice(0, s.maxRev);
      for (var i = 0; i < items.length; i++) strip.appendChild(buildCard(items[i], s));
      return strip;
    }

    function buildBadgeStrip(reviews, s, avgRating) {
      var wrap = document.createElement('div'); wrap.className = 'trust-reviews__badge-strip';
      var overall = document.createElement('div'); overall.className = 'trust-reviews__badge'; overall.textContent = avgRating.toFixed(1) + ' Overall';
      wrap.appendChild(overall);
      var items = reviews.slice(0, s.maxRev);
      for (var i = 0; i < items.length; i++) { var b = document.createElement('div'); b.className = 'trust-reviews__badge'; b.textContent = items[i].rating + '/5 ' + items[i].customer; wrap.appendChild(b); }
      return wrap;
    }

    function buildStarSummary(reviews, s, total, avgRating) {
      var wrap = document.createElement('div'), bar = document.createElement('div'); bar.className = 'trust-reviews__summary-bar';
      var starsRow = ''; for (var i=0;i<5;i++) starsRow += '<span style="color:'+(i<Math.round(avgRating)?s.accentColor:'#ddd')+'">&#9733;</span>';
      var barsHTML = '', ns=[5,4,3,2,1];
      for (var ni=0;ni<ns.length;ni++) {
        var n=ns[ni], cnt=0;
        for (var ri=0;ri<reviews.length;ri++) if(reviews[ri].rating===n) cnt++;
        var pct = total ? Math.round(cnt/total*100) : 0;
        barsHTML += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="width:18px;font-size:.8rem;color:#555">'+n+'</span><div style="flex:1;height:8px;background:#eee;border-radius:4px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:'+s.accentColor+';border-radius:4px"></div></div><span style="font-size:.8rem;color:#888;width:30px">'+cnt+'</span></div>';
      }
      bar.innerHTML = '<div><div class="trust-reviews__summary-score">'+avgRating.toFixed(1)+'</div><div style="font-size:1.1rem">'+starsRow+'</div><div class="trust-reviews__summary-label">'+total+' '+(total===1?s.t.review:s.t.reviews)+'</div></div><div style="flex:1">'+barsHTML+'</div>';
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
      var sortLabel=document.createElement('span'); sortLabel.className='trust-reviews__classic-sortlabel'; sortLabel.textContent='Sort:';
      var sortSel=document.createElement('select'); sortSel.className='trust-reviews__classic-select';
      [['newest','Newest'],['highest','Highest Rated'],['lowest','Lowest Rated']].forEach(function(o){ var opt=document.createElement('option'); opt.value=o[0]; opt.textContent=o[1]; sortSel.appendChild(opt); });
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
      var labelEl=document.createElement('div'); labelEl.className='trust-reviews__sl-label'; labelEl.textContent='Customer reviews';
      var headEl=document.createElement('div'); headEl.className='trust-reviews__sl-heading'; headEl.textContent=s.heading||'What our customers say';
      headerLeft.appendChild(labelEl); headerLeft.appendChild(headEl);

      var slRating=0;
      var slOverlay=document.createElement('div');
      slOverlay.id='tr-sl-modal-'+bid;
      slOverlay.style.cssText='display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);align-items:center;justify-content:center;padding:16px';
      var slModal=document.createElement('div');
      slModal.style.cssText='background:#fff;border-radius:14px;padding:28px 28px 24px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.25)';
      slModal.innerHTML=
        '<button id="tr-sl-close-'+bid+'" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#888;line-height:1">&times;</button>'+
        '<h3 style="margin:0 0 20px;font-size:1.2rem;font-weight:700;color:'+s.accentColor+'">Write a Review</h3>'+
        '<div style="margin-bottom:16px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">Your Rating <span style="color:red">*</span></label>'+
        '<div id="tr-sl-stars-'+bid+'" style="display:flex;gap:6px;cursor:pointer">'+
        '<span data-v="1" style="font-size:28px;color:#ddd">&#9733;</span><span data-v="2" style="font-size:28px;color:#ddd">&#9733;</span><span data-v="3" style="font-size:28px;color:#ddd">&#9733;</span><span data-v="4" style="font-size:28px;color:#ddd">&#9733;</span><span data-v="5" style="font-size:28px;color:#ddd">&#9733;</span></div></div>'+
        '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Review title</label><input id="tr-sl-title-'+bid+'" type="text" placeholder="Summarize your experience..." style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box"></div>'+
        '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Your review <span style="color:red">*</span></label><textarea id="tr-sl-comment-'+bid+'" placeholder="Share your experience..." rows="4" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;resize:vertical"></textarea></div>'+
        '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Upload image/video <span style="font-weight:400;color:#888">(optional)</span></label>'+
        '<div id="tr-sl-dropzone-'+bid+'" style="border:2px dashed #d1d5db;border-radius:10px;padding:24px 16px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;background:#fafafa;position:relative">'+
        '<input id="tr-sl-file-'+bid+'" type="file" accept="image/*,video/*" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%">'+
        '<div id="tr-sl-dz-content-'+bid+'"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 8px;display:block"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#374151">Click to upload or drag & drop</p><p style="margin:0;font-size:12px;color:#9ca3af">Images or videos — max 20 MB</p></div>'+
        '<div id="tr-sl-preview-'+bid+'" style="display:none;position:relative"><button id="tr-sl-remove-'+bid+'" type="button" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;background:#ef4444;color:#fff;border:none;font-size:14px;line-height:1;cursor:pointer;z-index:1;display:flex;align-items:center;justify-content:center">&times;</button><div id="tr-sl-preview-media-'+bid+'"></div><p id="tr-sl-preview-name-'+bid+'" style="margin:8px 0 0;font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></p></div></div></div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px"><div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Your name <span style="color:red">*</span></label><input id="tr-sl-name-'+bid+'" type="text" placeholder="Name" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box"></div><div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Email <span style="color:red">*</span></label><input id="tr-sl-email-'+bid+'" type="email" placeholder="Email" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box"></div></div>'+
        '<div id="tr-sl-msg-'+bid+'" style="display:none;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:12px"></div>'+
        '<div style="display:flex;gap:10px;justify-content:flex-end"><button id="tr-sl-cancel-'+bid+'" style="padding:10px 20px;background:#f5f5f5;color:#333;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Cancel</button><button id="tr-sl-submit-'+bid+'" style="padding:10px 24px;background:'+s.accentColor+';color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Submit Review</button></div>';
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
        if(!name||!email||!comment||slRating===0){ slMsg('Please fill in all required fields and select a star rating.',false); return; }
        submitBtn.disabled=true; submitBtn.textContent='Submitting…';
        var file=slFileInput.files[0], uploadPromise;
        if(file){
          submitBtn.textContent='Uploading…';
          var fd=new FormData(); fd.append('file',file);
          uploadPromise=fetch('/apps/review',{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(j){ if(!j.success) throw new Error('File upload failed'); return {mediaUrl:j.url,mediaType:j.mediaType,fileName:j.fileName}; });
        } else { uploadPromise=Promise.resolve({mediaUrl:null,mediaType:null,fileName:null}); }
        uploadPromise.then(function(media){
          submitBtn.textContent='Submitting…';
          return fetch('/apps/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,productId:productId,rating:slRating,comment:comment,title:title,customer:name,shop:shop,mediaUrl:media.mediaUrl,mediaType:media.mediaType,fileName:media.fileName})}).then(function(r){return r.json();});
        }).then(function(json){
          if(json.success===false) throw new Error(json.error||'Submission failed');
          slMsg('Thank you! Your review has been submitted for approval.',true);
          slModal.querySelector('#tr-sl-name-'+bid).value=''; slModal.querySelector('#tr-sl-email-'+bid).value='';
          slModal.querySelector('#tr-sl-comment-'+bid).value=''; slModal.querySelector('#tr-sl-title-'+bid).value='';
          slClearPreview(); slRating=0; slPaintStars(0); submitBtn.disabled=false; submitBtn.textContent='Submit Review'; setTimeout(slClose,2500);
        }).catch(function(err){ slMsg(err.message||'Something went wrong. Please try again.',false); submitBtn.disabled=false; submitBtn.textContent='Submit Review'; });
      });

      var writeBtn=document.createElement('button'); writeBtn.className='trust-reviews__sl-write-btn'; writeBtn.textContent='Write a review';
      writeBtn.addEventListener('click', slOpen);
      header.appendChild(headerLeft); header.appendChild(writeBtn);
      outer.appendChild(header);

      var layout=document.createElement('div'); layout.className='trust-reviews__sl-layout'; layout.setAttribute('data-pos',pos);
      var panel=document.createElement('div'); panel.className='trust-reviews__sl-panel';
      var scoreEl=document.createElement('div'); scoreEl.className='trust-reviews__sl-big-score'; scoreEl.textContent=avgRating.toFixed(1);
      var starsRowEl=document.createElement('div'); starsRowEl.className='trust-reviews__sl-stars-row'; starsRowEl.innerHTML=starHTML(Math.round(avgRating),starCol);
      var countEl=document.createElement('div'); countEl.className='trust-reviews__sl-count'; countEl.textContent='Based on '+total+' '+(total===1?(s.t?s.t.review:'review'):(s.t?s.t.reviews:'reviews'));
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
        for(var si=0;si<pageItems.length;si++){
          var r=pageItems[si], row=document.createElement('div'); row.className='trust-reviews__sl-review-row';
          var avatarHTML2=s.showAvatar?'<span class="trust-reviews__sl-row-avatar" style="background:'+s.accentColor+'">'+initials(r.customer)+'</span>':'';
          var verifiedHTML2=s.showVerified?'<span class="trust-reviews__verified">'+(s.t?s.t.verified:'Verified')+'</span>':'';
          var dateHTML2=(s.showDate&&r.createdAt)?'<span class="trust-reviews__sl-row-date">'+fmtDate(r.createdAt)+'</span>':'';
          var titleHTML2=r.title?'<p class="trust-reviews__sl-row-title">'+r.title+'</p>':'';
          var mediaHTML2='';
          if(r.mediaUrl){
            if((r.mediaType||'').indexOf('video')===0){
              mediaHTML2='<div class="trust-reviews__sl-row-media"><video src="'+r.mediaUrl+'" controls playsinline style="max-width:100%;max-height:220px;border-radius:8px;margin-top:8px"></video></div>';
            } else {
              mediaHTML2='<div class="trust-reviews__sl-row-media"><img src="'+r.mediaUrl+'" alt="review media" loading="lazy" style="max-width:100%;max-height:220px;border-radius:8px;margin-top:8px;object-fit:cover"></div>';
            }
          }
          row.innerHTML='<div class="trust-reviews__sl-row-head"><span class="trust-reviews__sl-row-stars">'+starHTML(r.rating,starCol)+'</span>'+dateHTML2+'</div>'+titleHTML2+'<p class="trust-reviews__sl-row-comment">'+r.comment+'</p>'+mediaHTML2+'<div class="trust-reviews__sl-row-meta">'+avatarHTML2+'<span class="trust-reviews__sl-row-name">'+r.customer+'</span>'+verifiedHTML2+'</div>';
          listDiv.appendChild(row);
        }
        attachLikes(listDiv);
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
      if(titleEl) titleEl.style.color=s.accentColor;
      fab.style.background=s.accentColor; fab.style.display='block';
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
      widget.style.setProperty('--tr-cols',String(s.columns)); widget.style.setProperty('--tr-cols-tablet',String(s.tabletColumns));
      widget.style.setProperty('--tr-cols-mobile',String(s.mobileColumns));
      if(headingEl) headingEl.style.color=s.accentColor;
      widget.setAttribute('data-style',s.style);
    }

    function buildPMCard(r,s){
      var card=document.createElement('div');
      card.className='trust-reviews__pm-card';
      var starsHtml='';
      for(var si=0;si<5;si++) starsHtml+='<span style="color:'+(si<(r.rating||0)?s.accentColor:'#ddd')+'">&#9733;</span>';
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
          '<button class="trust-reviews__pm-show-more">Show full review</button>'+
        '</div>';
      var showMore=card.querySelector('.trust-reviews__pm-show-more');
      var textEl=card.querySelector('.trust-reviews__pm-card-text');
      showMore.addEventListener('click',function(){
        var clamped=textEl.classList.toggle('pm-clamped');
        showMore.textContent=clamped?'Show full review':'Show less';
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
        '<button id="tr-pm-close-'+bid+'" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#888;line-height:1">&times;</button>'+
        '<h3 style="margin:0 0 20px;font-size:1.2rem;font-weight:700;color:'+s.accentColor+'">Write a Review</h3>'+
        '<div style="margin-bottom:16px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">Your Rating <span style="color:red">*</span></label>'+
        '<div id="tr-pm-stars-'+bid+'" style="display:flex;gap:6px;cursor:pointer"><span data-v="1" style="font-size:28px;color:#ddd">&#9733;</span><span data-v="2" style="font-size:28px;color:#ddd">&#9733;</span><span data-v="3" style="font-size:28px;color:#ddd">&#9733;</span><span data-v="4" style="font-size:28px;color:#ddd">&#9733;</span><span data-v="5" style="font-size:28px;color:#ddd">&#9733;</span></div></div>'+
        '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Review title</label><input id="tr-pm-title-'+bid+'" type="text" placeholder="Summarize your experience..." style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box"></div>'+
        '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Your review <span style="color:red">*</span></label><textarea id="tr-pm-comment-'+bid+'" placeholder="Share your experience..." rows="4" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;resize:vertical"></textarea></div>'+
        '<div style="margin-bottom:14px"><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Upload image/video <span style="font-weight:400;color:#888">(optional)</span></label>'+
        '<div id="tr-pm-dropzone-'+bid+'" style="border:2px dashed #d1d5db;border-radius:10px;padding:24px 16px;text-align:center;cursor:pointer;background:#fafafa;position:relative">'+
        '<input id="tr-pm-file-'+bid+'" type="file" accept="image/*,video/*" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%">'+
        '<div id="tr-pm-dz-content-'+bid+'"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#374151">Click to upload or drag &amp; drop</p><p style="margin:0;font-size:12px;color:#9ca3af">Images or videos &mdash; max 20 MB</p></div>'+
        '<div id="tr-pm-preview-'+bid+'" style="display:none;position:relative"><button id="tr-pm-remove-'+bid+'" type="button" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;background:#ef4444;color:#fff;border:none;font-size:14px;cursor:pointer;z-index:1">&times;</button><div id="tr-pm-preview-media-'+bid+'"></div><p id="tr-pm-preview-name-'+bid+'" style="margin:8px 0 0;font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></p></div></div></div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px"><div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Your name <span style="color:red">*</span></label><input id="tr-pm-name-'+bid+'" type="text" placeholder="Name" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box"></div><div><label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">Email <span style="color:red">*</span></label><input id="tr-pm-email-'+bid+'" type="email" placeholder="Email" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box"></div></div>'+
        '<div id="tr-pm-msg-'+bid+'" style="display:none;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:12px"></div>'+
        '<div style="display:flex;gap:10px;justify-content:flex-end"><button id="tr-pm-cancel-'+bid+'" style="padding:10px 20px;background:#f5f5f5;color:#333;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Cancel</button><button id="tr-pm-submit-'+bid+'" style="padding:10px 24px;background:'+s.accentColor+';color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Submit Review</button></div>';
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
        if(!name||!email||!comment||pmRating===0){ pmMsg('Please fill in all required fields and select a star rating.',false); return; }
        submitBtn.disabled=true; submitBtn.textContent='Submitting…';
        var file=pmFileInput.files[0], uploadPromise;
        if(file){ submitBtn.textContent='Uploading…'; var fd=new FormData(); fd.append('file',file); uploadPromise=fetch('/apps/review',{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(j){ if(!j.success) throw new Error('File upload failed'); return {mediaUrl:j.url,mediaType:j.mediaType,fileName:j.fileName}; }); }
        else { uploadPromise=Promise.resolve({mediaUrl:null,mediaType:null,fileName:null}); }
        uploadPromise.then(function(media){ submitBtn.textContent='Submitting…'; return fetch('/apps/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,productId:productId,rating:pmRating,comment:comment,title:title,customer:name,shop:shop,mediaUrl:media.mediaUrl,mediaType:media.mediaType,fileName:media.fileName})}).then(function(r){return r.json();}); })
        .then(function(json){ if(json.success===false) throw new Error(json.error||'Submission failed'); pmMsg('Thank you! Your review has been submitted for approval.',true); pmModal.querySelector('#tr-pm-name-'+bid).value=''; pmModal.querySelector('#tr-pm-email-'+bid).value=''; pmModal.querySelector('#tr-pm-comment-'+bid).value=''; pmModal.querySelector('#tr-pm-title-'+bid).value=''; pmClearPreview(); pmRating=0; pmPaintStars(0); submitBtn.disabled=false; submitBtn.textContent='Submit Review'; setTimeout(pmClose,2500); })
        .catch(function(err){ pmMsg(err.message||'Something went wrong. Please try again.',false); submitBtn.disabled=false; submitBtn.textContent='Submit Review'; });
      });

      /* ── Summary bar ── */
      var bar=document.createElement('div'); bar.className='trust-reviews__pm-summary';

      var starsHtml='';
      for(var si=0;si<5;si++) starsHtml+='<span style="color:'+(si<Math.round(avgRating)?s.accentColor:'#ddd')+'">&#9733;</span>';
      var scoreDiv=document.createElement('div'); scoreDiv.className='trust-reviews__pm-score';
      scoreDiv.innerHTML='<div class="trust-reviews__pm-score-num">'+avgRating.toFixed(1)+'</div><div class="trust-reviews__pm-score-stars">'+starsHtml+'</div><div class="trust-reviews__pm-score-count">'+total+' reviews</div>';
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
      writeBtn.textContent='Write a Review';
      writeBtn.addEventListener('click', pmOpen);

      /* Filter button + dropdown */
      var filterWrap=document.createElement('div'); filterWrap.style.cssText='position:relative;display:inline-block';
      var filterBtn=document.createElement('button'); filterBtn.className='trust-reviews__pm-btn-filter';
      filterBtn.innerHTML='&#9776; Filter';
      var filterMenu=document.createElement('div');
      filterMenu.style.cssText='display:none;position:absolute;right:0;top:calc(100% + 6px);background:#fff;border:1px solid #e4e4e4;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);min-width:160px;z-index:100;overflow:hidden';
      var filterOptions=[['all','All reviews'],['5','5 Stars'],['4','4 Stars'],['3','3 Stars'],['2','2 Stars'],['1','1 Star']];
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
          filterBtn.innerHTML='&#9776; '+(opt[0]==='all'?'Filter':opt[1]);
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

    function renderReviews(apiData, s) {
      loadingEl.style.display='none';
      var reviews=apiData.reviews||[];
      if(!reviews.length){ container.innerHTML='<p style="color:#888;font-size:.9rem">'+(s.t?s.t.noReviews:'No reviews yet.')+'</p>'; return; }
      applyVars(s);
      var el;
      if(s.style==='floating_tab')  { el=buildFloatingTab(reviews,s); }
      else if(s.style==='slider')   { el=buildSlider(reviews,s); }
      else if(s.style==='scroll_strip') { el=buildScrollStrip(reviews,s); }
      else if(s.style==='badge_strip')  { el=buildBadgeStrip(reviews,s,apiData.averageRating||0); }
      else if(s.style==='star_summary') { el=buildStarSummary(reviews,s,apiData.total||reviews.length,apiData.averageRating||0); }
      else if(s.style==='quote_fade')   { el=buildQuoteFade(reviews,s); }
      else if(s.style==='classic_list') { el=buildClassicList(reviews,s); }
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

    fetch('/apps/review?shop='+shop+'&type=widget-defaults&widgetKey='+widgetKey+'&locale='+encodeURIComponent(storeLocale))
    .then(function(r){return r.json();})
    .then(function(resp){
      var d=resp.settings||{}, t=resp.translations||TRANSLATIONS.en; resolvedT=t;
      var accentColor=(blockColor&&blockColor!==D_COLOR)?blockColor:(d.accentColor||D_COLOR);
      var style=(widgetKey==='custom_template'&&d.defaultStyle)?d.defaultStyle:((blockStyle&&blockStyle!==D_STYLE)?blockStyle:(d.defaultStyle||D_STYLE));
      var columns=(blockCols&&blockCols!==D_COLS)?parseInt(blockCols,10):(d.columns||3);
      var maxRev=(blockMax&&blockMax!==D_MAX)?parseInt(blockMax,10):(d.maxReviews||6);
      var showVerified=(blockVerif==='false')?false:(d.showVerified!==false);
      var showAvatar=(blockAvatar==='false')?false:(d.showAvatar!==false);
      var showDate=(blockDate==='false')?false:(d.showDate!==false);
      if(headingEl){ var cur=headingEl.textContent.trim(); if(!cur||cur===D_HEADING) headingEl.textContent=d.heading||t.defaultHeading||D_HEADING; }
      var s={t:t,accentColor:accentColor,starColor:d.starColor||'#F59E0B',starGap:d.starGap!=null?d.starGap:2,textAlign:d.textAlign||'left',style:style,columns:columns,maxRev:maxRev,showVerified:showVerified,showAvatar:showAvatar,showDate:showDate,tabletColumns:d.tabletColumns||2,mobileColumns:d.mobileColumns||1,paddingTop:d.paddingTop!=null?d.paddingTop:40,paddingBottom:d.paddingBottom!=null?d.paddingBottom:40,cardPadding:d.cardPadding!=null?d.cardPadding:16,cardGap:d.cardGap!=null?d.cardGap:16,borderRadius:d.borderRadius!=null?d.borderRadius:10,showShadow:d.showShadow!==false,backgroundColor:d.backgroundColor||'transparent',cardBackground:d.cardBackground||'#ffffff',textColor:d.textColor||'#333333',borderColor:d.borderColor||'#e4e4e4',fontFamily:d.fontFamily||'inherit',headingSize:d.headingSize||32,reviewSize:d.reviewSize||16,metaSize:d.metaSize||13,autoplay:d.autoplay!==false,autoplaySpeed:d.autoplaySpeed||3000,showArrows:d.showArrows!==false,showDots:d.showDots!==false,popupEnabled:d.popupEnabled||false,popupDelay:d.popupDelay!=null?d.popupDelay:5000,summaryPosition:d.summaryPosition||'left',showWriteReviewBtn:d.showWriteReviewBtn||false,heading:d.heading||D_HEADING};
      return fetch('/apps/review?shop='+shop+'&productId='+productId+'&widgetKey='+widgetKey).then(function(r){return r.json();}).then(function(apiData){ renderReviews(apiData,s); });
    })
    .catch(function(){ loadingEl.textContent=(resolvedT||TRANSLATIONS.en).couldNotLoad; });
  }

  var widgets = document.querySelectorAll('.trust-reviews-widget');
  for (var i = 0; i < widgets.length; i++) initWidget(widgets[i]);
})();
