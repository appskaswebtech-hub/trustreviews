/* Trust Reviews — review-reward coupon popup.
   Shared by every widget with a "Write a review" form. Widgets load this file
   on demand (only after a review is submitted and the server returned a
   coupon), then call window.TrustReviewsCoupon.show({ code, message }). */
(function () {
  if (window.TrustReviewsCoupon) return;

  var I18N = {
    en: { title: 'Thank you for your review!', msg: 'Here is a little reward — use this code on your next order.', copy: 'Copy code', copied: 'Copied!', close: 'Close' },
    hi: { title: 'आपकी समीक्षा के लिए धन्यवाद!', msg: 'आपके लिए एक छोटा सा तोहफ़ा — अगले ऑर्डर पर यह कोड इस्तेमाल करें।', copy: 'कोड कॉपी करें', copied: 'कॉपी हो गया!', close: 'बंद करें' },
    es: { title: '¡Gracias por tu reseña!', msg: 'Aquí tienes una pequeña recompensa: usa este código en tu próximo pedido.', copy: 'Copiar código', copied: '¡Copiado!', close: 'Cerrar' },
    fr: { title: 'Merci pour votre avis !', msg: 'Voici une petite récompense : utilisez ce code lors de votre prochaine commande.', copy: 'Copier le code', copied: 'Copié !', close: 'Fermer' },
    de: { title: 'Danke für Ihre Bewertung!', msg: 'Eine kleine Belohnung: Nutzen Sie diesen Code bei Ihrer nächsten Bestellung.', copy: 'Code kopieren', copied: 'Kopiert!', close: 'Schließen' },
    it: { title: 'Grazie per la tua recensione!', msg: 'Ecco un piccolo premio: usa questo codice nel tuo prossimo ordine.', copy: 'Copia codice', copied: 'Copiato!', close: 'Chiudi' },
    pt: { title: 'Obrigado pela sua avaliação!', msg: 'Aqui está uma pequena recompensa: use este código no seu próximo pedido.', copy: 'Copiar código', copied: 'Copiado!', close: 'Fechar' },
    nl: { title: 'Bedankt voor je review!', msg: 'Een kleine beloning: gebruik deze code bij je volgende bestelling.', copy: 'Code kopiëren', copied: 'Gekopieerd!', close: 'Sluiten' },
    ar: { title: 'شكراً لتقييمك!', msg: 'إليك مكافأة صغيرة — استخدم هذا الرمز في طلبك القادم.', copy: 'نسخ الرمز', copied: 'تم النسخ!', close: 'إغلاق' },
    zh: { title: '感谢您的评价！', msg: '送您一份小礼物——下次下单时使用此优惠码。', copy: '复制优惠码', copied: '已复制！', close: '关闭' },
    ja: { title: 'レビューありがとうございます！', msg: 'ささやかなお礼です。次回のご注文でこのコードをお使いください。', copy: 'コードをコピー', copied: 'コピーしました！', close: '閉じる' },
    ru: { title: 'Спасибо за ваш отзыв!', msg: 'Небольшой подарок — используйте этот код в следующем заказе.', copy: 'Скопировать код', copied: 'Скопировано!', close: 'Закрыть' },
    tr: { title: 'Değerlendirmeniz için teşekkürler!', msg: 'Küçük bir hediye — bu kodu bir sonraki siparişinizde kullanın.', copy: 'Kodu kopyala', copied: 'Kopyalandı!', close: 'Kapat' },
    pl: { title: 'Dziękujemy za opinię!', msg: 'Mała nagroda — użyj tego kodu przy następnym zamówieniu.', copy: 'Kopiuj kod', copied: 'Skopiowano!', close: 'Zamknij' },
    ko: { title: '리뷰를 남겨 주셔서 감사합니다!', msg: '작은 선물을 드려요 — 다음 주문 시 이 코드를 사용하세요.', copy: '코드 복사', copied: '복사됨!', close: '닫기' },
  };

  var CSS =
    '.trc-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(15,15,20,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:trcFade .2s ease;font-family:inherit}' +
    '@keyframes trcFade{from{opacity:0}to{opacity:1}}' +
    '@keyframes trcPop{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}' +
    '.trc-modal{position:relative;width:min(400px,100%);background:#fff;color:#1f1f1f;border-radius:20px;padding:34px 26px 26px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.25);animation:trcPop .3s cubic-bezier(.2,.8,.2,1);box-sizing:border-box}' +
    '.trc-close{position:absolute;top:12px;right:12px;width:34px;height:34px;border:none;border-radius:50%;background:#f2f2f2;color:#555;font-size:18px;line-height:1;cursor:pointer}' +
    '.trc-close:hover{background:#e6e6e6}' +
    '.trc-icon{width:64px;height:64px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#ffe29f,#ffa99f);font-size:30px}' +
    '.trc-title{margin:0 0 8px;font-size:20px;font-weight:800;line-height:1.3}' +
    '.trc-msg{margin:0 0 20px;font-size:14.5px;line-height:1.55;color:#555;white-space:pre-line}' +
    '.trc-code-row{display:flex;align-items:stretch;border:2px dashed #d0d0d0;border-radius:12px;overflow:hidden}' +
    '.trc-code{flex:1;min-width:0;padding:14px 12px;font:800 20px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:2px;color:#111;background:#fafafa;overflow-wrap:anywhere;user-select:all}' +
    '.trc-copy{flex-shrink:0;border:none;padding:0 18px;background:#111;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;transition:background .2s}' +
    '.trc-copy:hover{background:#333}.trc-copy.is-copied{background:#15803d}' +
    '@media (max-width:420px){.trc-code-row{flex-direction:column}.trc-copy{padding:12px}}';

  function lang() {
    var l = (document.documentElement.lang || (window.Shopify && window.Shopify.locale) || 'en').split('-')[0].toLowerCase();
    return I18N[l] ? l : 'en';
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
      ta.remove();
    });
  }

  function show(coupon) {
    if (!coupon || !coupon.code) return;
    var t = I18N[lang()];
    if (!document.getElementById('trc-style')) {
      var st = document.createElement('style'); st.id = 'trc-style'; st.textContent = CSS; document.head.appendChild(st);
    }
    var old = document.querySelector('.trc-overlay'); if (old) old.remove();

    var overlay = document.createElement('div'); overlay.className = 'trc-overlay';
    overlay.innerHTML =
      '<div class="trc-modal" role="dialog" aria-modal="true" aria-labelledby="trc-title">' +
        '<button type="button" class="trc-close"></button>' +
        '<div class="trc-icon" aria-hidden="true">&#127873;</div>' +
        '<h3 class="trc-title" id="trc-title"></h3>' +
        '<p class="trc-msg"></p>' +
        '<div class="trc-code-row"><span class="trc-code"></span><button type="button" class="trc-copy"></button></div>' +
      '</div>';
    var closeBtn = overlay.querySelector('.trc-close'), copyBtn = overlay.querySelector('.trc-copy');
    closeBtn.textContent = '✕'; closeBtn.setAttribute('aria-label', t.close);
    overlay.querySelector('.trc-title').textContent = t.title;
    // Merchant's own message (Admin → Review Coupon) wins over the default text.
    overlay.querySelector('.trc-msg').textContent = coupon.message || t.msg;
    overlay.querySelector('.trc-code').textContent = coupon.code;
    copyBtn.textContent = t.copy;

    function close() { document.removeEventListener('keydown', onKey); overlay.remove(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    copyBtn.addEventListener('click', function () {
      copyText(coupon.code).then(function () {
        copyBtn.textContent = t.copied; copyBtn.classList.add('is-copied');
        setTimeout(function () { copyBtn.textContent = t.copy; copyBtn.classList.remove('is-copied'); }, 2000);
      }).catch(function () {});
    });

    document.body.appendChild(overlay);
    copyBtn.focus();
  }

  window.TrustReviewsCoupon = { show: show };
})();
