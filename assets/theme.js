/* Viva Galería — theme.js (sin dependencias) */
(function () {
  'use strict';

  var theme = window.theme || { routes: {}, strings: {} };
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* Toast ---------------------------------------------------------------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2600);
  }

  /* Drawers -------------------------------------------------------------- */
  var lastFocus = null;
  function openDrawer(id) {
    var d = document.getElementById(id);
    if (!d) return;
    lastFocus = document.activeElement;
    d.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');
    var closeBtn = $('[data-drawer-close].drawer__close', d);
    if (closeBtn) closeBtn.focus();
  }
  function closeDrawer(d) {
    d.classList.remove('is-open');
    d.setAttribute('aria-hidden', 'true');
    if (!$('.drawer.is-open')) document.body.classList.remove('overflow-hidden');
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-drawer-open]');
    if (opener) { e.preventDefault(); openDrawer(opener.getAttribute('data-drawer-open')); return; }
    var closer = e.target.closest('[data-drawer-close]');
    if (closer) { closeDrawer(closer.closest('.drawer')); return; }
    var cartToggle = e.target.closest('[data-cart-toggle]');
    if (cartToggle && theme.cartType === 'drawer' && document.getElementById('CartDrawer') && !document.querySelector('[data-cart-page]')) {
      e.preventDefault(); openDrawer('CartDrawer');
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') $$('.drawer.is-open').forEach(closeDrawer);
  });

  /* Announcement rotation (móvil) -------------------------------------- */
  $$('[data-announcement]').forEach(function (bar) {
    var items = $$('.announcement__item', bar);
    if (items.length < 2) return;
    var i = 0;
    setInterval(function () {
      if (!window.matchMedia('(max-width: 749px)').matches) return;
      items[i].classList.remove('is-active');
      i = (i + 1) % items.length;
      items[i].classList.add('is-active');
    }, 4000);
  });

  /* Header shadow -------------------------------------------------------- */
  var header = $('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 10); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Cart ----------------------------------------------------------------- */
  function updateCount(count) {
    $$('[data-cart-count]').forEach(function (el) { el.textContent = count; el.hidden = count === 0; });
    $$('[data-cart-count-text]').forEach(function (el) { el.textContent = count; });
  }
  function refreshDrawer() {
    var target = $('[data-cart-drawer-content]');
    if (!target) return Promise.resolve();
    return fetch((theme.routes.root || '/') + '?section_id=cart-drawer-content')
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var wrapper = doc.querySelector('.shopify-section') || doc.body;
        var countEl = wrapper.querySelector('[data-cart-count-value]');
        if (countEl) updateCount(parseInt(countEl.textContent, 10) || 0);
        target.innerHTML = wrapper.innerHTML;
      });
  }
  function changeLine(key, qty) {
    return fetch((theme.routes.cartChange || '/cart/change') + '.js', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    }).then(function (r) { return r.json(); });
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cart-qty]');
    if (!btn) return;
    var line = btn.closest('[data-key]');
    if (!line) return;
    e.preventDefault();
    line.style.opacity = '.5';
    changeLine(line.getAttribute('data-key'), parseInt(btn.getAttribute('data-cart-qty'), 10)).then(function (cart) {
      if (document.querySelector('[data-cart-page]') && !btn.closest('[data-cart-drawer]')) { window.location.reload(); return; }
      updateCount(cart.item_count);
      refreshDrawer().then(refreshDiscount);
    });
  });
  document.addEventListener('change', function (e) {
    var input = e.target.closest('[data-cart-qty-input]');
    if (!input) return;
    var line = input.closest('[data-key]');
    changeLine(line.getAttribute('data-key'), Math.max(0, parseInt(input.value, 10) || 0)).then(function (cart) {
      if (document.querySelector('[data-cart-page]') && !input.closest('[data-cart-drawer]')) { window.location.reload(); return; }
      updateCount(cart.item_count);
      refreshDrawer().then(refreshDiscount);
    });
  });

  /* Product form --------------------------------------------------------- */
  $$('[data-product-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (theme.cartType !== 'drawer') return;
      e.preventDefault();
      var btn = $('[data-add-button]', form);
      var err = $('[data-form-error]', form);
      if (err) err.hidden = true;
      btn.disabled = true;
      fetch((theme.routes.cartAdd || '/cart/add') + '.js', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
        .then(function (res) {
          btn.disabled = false;
          if (!res.ok) { if (err) { err.textContent = res.body.description || res.body.message; err.hidden = false; } return; }
          window.vivaCartAdded();
        })
        .catch(function () { btn.disabled = false; form.submit(); });
    });
  });

  document.addEventListener('click', function (e) {
    var minus = e.target.closest('[data-qty-minus]');
    var plus = e.target.closest('[data-qty-plus]');
    if (!minus && !plus) return;
    var input = (minus || plus).parentElement.querySelector('input');
    var v = parseInt(input.value, 10) || 1;
    input.value = Math.max(1, v + (plus ? 1 : -1));
  });

  /* Variant picker ------------------------------------------------------- */
  $$('[data-variant-picker]').forEach(function (picker) {
    var root = picker.closest('[data-product]');
    var json = $('[data-variants-json]', picker);
    if (!json) return;
    var variants = JSON.parse(json.textContent);
    var money = function (cents) {
      return (cents / 100).toLocaleString(document.documentElement.lang || 'es', { style: 'currency', currency: (window.Shopify && Shopify.currency && Shopify.currency.active) || 'EUR' });
    };
    picker.addEventListener('change', function () {
      var selected = $$('input[type=radio]:checked', picker).map(function (i) { return i.value; });
      $$('[data-option-selected]', picker).forEach(function (el, idx) { el.textContent = selected[idx] || ''; });
      var variant = variants.find(function (v) { return v.options.every(function (o, i) { return o === selected[i]; }); });
      var idInput = $('[data-variant-id]', root);
      var btn = $('[data-add-button]', root);
      var price = $('[data-product-price]', root);
      if (!variant) {
        if (btn) { btn.disabled = true; btn.textContent = theme.strings.unavailable; }
        return;
      }
      if (idInput) idInput.value = variant.id;
      if (btn) { btn.disabled = !variant.available; btn.textContent = variant.available ? theme.strings.addToCart : theme.strings.soldOut; }
      if (price) {
        var html = '<span class="price' + (variant.compare_at_price > variant.price ? ' price--sale' : '') + '">' + money(variant.price);
        if (variant.compare_at_price > variant.price) html += '<s class="price__compare">' + money(variant.compare_at_price) + '</s>';
        price.innerHTML = html + '</span>';
      }
      var url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
      if (variant.featured_media) {
        var media = $('[data-media-id="' + variant.featured_media.id + '"]', root);
        var gallery = $('[data-product-gallery]', root);
        if (media && gallery) gallery.scrollTo({ left: media.offsetLeft - gallery.offsetLeft, behavior: 'smooth' });
      }
    });
  });

  /* Slideshow ------------------------------------------------------------ */
  $$('[data-slideshow]').forEach(function (show) {
    var track = $('[data-slideshow-track]', show);
    var slides = $$('[data-slide]', show);
    var dots = $$('[data-slide-dot]', show);
    if (slides.length < 2) return;
    var i = 0, timer = null;
    var go = function (n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (-100 * i) + '%)';
      slides.forEach(function (s, k) {
        s.setAttribute('aria-hidden', k === i ? 'false' : 'true');
        var box = $('.slide__fade', s);
        if (box && k === i) { box.style.animation = 'none'; void box.offsetWidth; box.style.animation = ''; }
      });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
    };
    var play = function () {
      if (show.getAttribute('data-autoplay') !== 'true') return;
      clearInterval(timer);
      timer = setInterval(function () { go(i + 1); }, (parseInt(show.getAttribute('data-speed'), 10) || 6) * 1000);
    };
    $('[data-slide-prev]', show).addEventListener('click', function () { go(i - 1); play(); });
    $('[data-slide-next]', show).addEventListener('click', function () { go(i + 1); play(); });
    dots.forEach(function (d) { d.addEventListener('click', function () { go(parseInt(d.getAttribute('data-slide-dot'), 10)); play(); }); });
    show.addEventListener('mouseenter', function () { clearInterval(timer); });
    show.addEventListener('mouseleave', play);
    var startX = null;
    show.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    show.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); play(); }
      startX = null;
    });
    if (window.Shopify && Shopify.designMode) {
      document.addEventListener('shopify:block:select', function (e) {
        var idx = slides.indexOf(e.target);
        if (idx > -1) { go(idx); clearInterval(timer); }
      });
    }
    play();
  });

  /* Carousels ------------------------------------------------------------ */
  function initCarousel(c) {
    if (c._init) return; c._init = true;
    var track = $('[data-carousel-track]', c);
    var prev = $('[data-carousel-prev]', c);
    var next = $('[data-carousel-next]', c);
    var bar = $('[data-carousel-progress]', c);
    if (!track) return;
    var step = function () { var first = track.firstElementChild; return first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 20) : track.clientWidth; };
    var update = function () {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
      if (bar) {
        var ratio = track.clientWidth / track.scrollWidth;
        bar.style.width = (ratio * 100) + '%';
        bar.style.transform = 'translateX(' + (max > 0 ? (track.scrollLeft / max) * ((1 / ratio) - 1) * 100 : 0) + '%)';
      }
    };
    var stopHint = function () { if (next) next.classList.remove('is-hint'); };
    if (next && track.scrollWidth > track.clientWidth + 4) next.classList.add('is-hint');
    track.addEventListener('scroll', function () { if (track.scrollLeft > 8) stopHint(); }, { passive: true });
    track.addEventListener('pointerdown', stopHint, { passive: true });
    if (next) next.addEventListener('click', stopHint);
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step() * Math.max(1, Math.floor(track.clientWidth / step())), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: step() * Math.max(1, Math.floor(track.clientWidth / step())), behavior: 'smooth' }); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  $$('[data-carousel]').forEach(initCarousel);

  /* Reveal on scroll ----------------------------------------------------- */
  var reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !(window.Shopify && Shopify.designMode)) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* Clip de vídeo (banner partido): bucle continuo entre inicio y fin ------ */
  var clipVideos = $$('[data-clip-video]');
  function clipPlay(v) { if (v._visible && !document.hidden) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
  function startClip(v) {
    if (v._started) return;
    v._started = true;
    var start = parseFloat(v.getAttribute('data-start')) || 0;
    var end = parseFloat(v.getAttribute('data-end')) || start + 8;
    var small = window.matchMedia('(max-width: 749px)').matches || (navigator.connection && navigator.connection.saveData);
    var src = v.getAttribute(small ? 'data-src-small' : 'data-src-large') || v.getAttribute('data-src-small');
    if (!src) return;
    v.muted = true;
    v.defaultMuted = true;
    v.loop = false;
    var rewind = function () { try { v.currentTime = start; } catch (e) {} clipPlay(v); };
    v.addEventListener('loadedmetadata', function () { if (v.currentTime < start - 0.5 || v.currentTime > end) v.currentTime = start; clipPlay(v); });
    v.addEventListener('timeupdate', function () { if (v.currentTime >= end - 0.15 || v.currentTime < start - 0.5) rewind(); });
    v.addEventListener('ended', rewind);
    v.addEventListener('pause', function () { if (v._visible && !document.hidden) setTimeout(function () { if (v.paused) rewind(); }, 150); });
    // Respaldo por si algún navegador no dispara timeupdate con suficiente frecuencia
    setInterval(function () { if (v._visible && !document.hidden && (v.paused || v.currentTime >= end - 0.15)) { if (v.currentTime >= end - 0.15) rewind(); else clipPlay(v); } }, 1000);
    v.src = src + '#t=' + start;
    v.load();
  }
  if (clipVideos.length) {
    document.addEventListener('visibilitychange', function () { clipVideos.forEach(function (v) { if (v._started) { if (document.hidden) v.pause(); else clipPlay(v); } }); });
    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var v = en.target;
          v._visible = en.isIntersecting;
          if (en.isIntersecting) { startClip(v); clipPlay(v); }
          else if (v._started) v.pause();
        });
      }, { rootMargin: '200px 0px' });
      clipVideos.forEach(function (v) { vio.observe(v); });
    } else {
      clipVideos.forEach(function (v) { v._visible = true; startClip(v); });
    }
  }

  /* Descuento: estado real del carrito ----------------------------------- */
  var parseDiscountState = function (root) {
    var el = (root || document).querySelector('[data-discount-state]');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  };
  var discountState = parseDiscountState();
  var formatMoney = function (cents) {
    var ds = discountState || {};
    try { return (cents / 100).toLocaleString(ds.locale || 'es', { style: 'currency', currency: ds.currency || 'EUR' }); }
    catch (e) { return (cents / 100).toFixed(2) + ' €'; }
  };
  var discountListeners = [];
  var refreshDiscount = function () {
    return fetch((theme.routes.root || '/') + '?section_id=discount-state')
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var ds = parseDiscountState(doc);
        if (ds) { discountState = ds; discountListeners.forEach(function (fn) { fn(ds); }); }
        return ds;
      }).catch(function () {});
  };
  window.vivaRefreshDiscount = refreshDiscount;

  // Tras añadir al carrito: abre el panel lateral con un aviso breve (o va al carrito si no hay panel)
  window.vivaCartAdded = function () {
    var drawer = document.getElementById('CartDrawer');
    if (!drawer || theme.cartType !== 'drawer') { window.location.href = theme.routes.cart || '/cart'; return; }
    refreshDrawer().then(function () {
      openDrawer('CartDrawer');
      drawer.classList.remove('is-just-added'); void drawer.offsetWidth; drawer.classList.add('is-just-added');
      clearTimeout(drawer._addedTimer);
      drawer._addedTimer = setTimeout(function () { drawer.classList.remove('is-just-added'); }, 5000);
      refreshDiscount();
    });
  };
  var cartUpdateDiscount = function (code) {
    return fetch((theme.routes.root || '/').replace(/\/?$/, '/') + 'cart/update.js', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ discount: code })
    }).then(function (r) { return r.json(); });
  };
  // Códigos guardados en el carrito (aplicables o pendientes)
  var getCartCodes = function () {
    return fetch((theme.routes.root || '/').replace(/\/?$/, '/') + 'cart.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) { return (cart.discount_codes || []).map(function (d) { return { code: d.code, applicable: d.applicable }; }); })
      .catch(function () { return []; });
  };
  var sameCode = function (a, b) { return String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase(); };
  var addCode = function (code) {
    return getCartCodes().then(function (codes) {
      var list = codes.map(function (c) { return c.code; }).filter(function (c) { return !sameCode(c, code); });
      list.push(code);
      return cartUpdateDiscount(list.join(','));
    });
  };
  var removeCode = function (code) {
    return getCartCodes().then(function (codes) {
      var list = codes.map(function (c) { return c.code; }).filter(function (c) { return !sameCode(c, code); });
      return cartUpdateDiscount(list.join(','));
    });
  };
  window.vivaAddDiscountCode = addCode;
  var afterCartChange = function () {
    if (document.querySelector('[data-cart-page]')) { window.location.reload(); return; }
    refreshDrawer().then(refreshDiscount);
  };

  /* Pop-up de bienvenida + pastilla con contador ------------------------------ */
  var WKEY = 'vlh_welcome';
  var readWelcome = function () { try { return JSON.parse(localStorage.getItem(WKEY)) || {}; } catch (e) { return {}; } };
  var writeWelcome = function (o) { try { localStorage.setItem(WKEY, JSON.stringify(o)); } catch (e) {} };
  var welcome = readWelcome();
  var welcomeActive = function () { return welcome.status === 'accepted' && welcome.expires > Date.now(); };

  (function () {
    var popup = $('[data-welcome]');
    var badge = $('[data-welcome-badge]');
    var now = Date.now();
    var designMode = window.Shopify && Shopify.designMode;

    // Pastilla
    if (badge) {
      var timerEl = $('[data-welcome-timer]', badge);
      var titleEl = $('[data-badge-title]', badge);
      var textEl = $('[data-badge-text]', badge);
      var linkEl = $('[data-badge-link]', badge);
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      var wasApplied = null;
      var render = function (key, ds, amountCents, codesApplied) {
        titleEl.textContent = badge.getAttribute('data-' + key + '-title');
        var parts = (badge.getAttribute('data-' + key + '-text') || '').replace('[codes]', codesApplied.join(' + ')).split('[amount]');
        textEl.textContent = parts[0];
        if (parts.length > 1) {
          var amt = document.createElement('b');
          amt.className = 'welcome-badge__amount';
          amt.textContent = formatMoney(amountCents);
          textEl.appendChild(amt);
          textEl.appendChild(document.createTextNode(parts.slice(1).join('')));
        }
        var url = key === 'wait' ? badge.getAttribute('data-wait-url') : (key === 'cross' ? (ds.crossUrl || badge.getAttribute('data-ok-url')) : badge.getAttribute('data-ok-url'));
        linkEl.setAttribute('href', url);
        badge.classList.toggle('is-cross', key === 'cross');
      };
      var paint = function (ds) {
        if (!ds) return;
        var applied = ds.applied > 0;
        var codesApplied = (ds.codesApplied || []).filter(Boolean);
        var isMax = applied && codesApplied.length > 1;
        var key = isMax ? 'max' : (applied ? 'ok' : 'wait');
        badge.classList.toggle('is-success', applied);
        badge.classList.toggle('is-max', isMax);
        render(key, ds, isMax ? (ds.saving || ds.applied) : ds.applied, codesApplied);
        if (key === 'ok' && ds.crossCode) {
          getCartCodes().then(function (codes) {
            var saved = codes.some(function (c) { return sameCode(c.code, ds.crossCode); });
            if (saved && discountState === ds) render('cross', ds, ds.applied, codesApplied);
          });
        }
        if ((applied && wasApplied === false) || (isMax && badge._wasMax === false)) {
          badge.classList.remove('is-celebrate'); void badge.offsetWidth; badge.classList.add('is-celebrate');
        }
        wasApplied = applied;
        badge._wasMax = isMax;
      };
      var hideBtn = $('[data-welcome-badge-hide]', badge);
      if (hideBtn) hideBtn.addEventListener('click', function () {
        badge.hidden = true;
        try { sessionStorage.setItem(WKEY + '_badge_hidden', '1'); } catch (e) {}
      });
      var runBadge = function () {
        var hiddenThisSession = false;
        try { hiddenThisSession = sessionStorage.getItem(WKEY + '_badge_hidden') === '1'; } catch (e) {}
        if (!hiddenThisSession) badge.hidden = false;
        paint(discountState);
        discountListeners.push(paint);
        var iv;
        var tick = function () {
          var left = Math.max(0, welcome.expires - Date.now());
          var h = Math.floor(left / 3600000), m = Math.floor(left % 3600000 / 60000), sec = Math.floor(left % 60000 / 1000);
          var txt = (h ? h + ':' + pad(m) : m) + ':' + pad(sec);
          $$('[data-welcome-timer]').forEach(function (el) { el.textContent = txt; });
          var showCartTimer = left > 0 && discountState && discountState.applied > 0;
          $$('[data-cart-timer]').forEach(function (el) { el.hidden = !showCartTimer; });
          if (left <= 0) {
            clearInterval(iv);
            badge.hidden = true;
            $$('[data-cart-timer]').forEach(function (el) { el.hidden = true; });
            if (!welcome.cleared) { welcome.cleared = true; writeWelcome(welcome); removeCode(welcome.code || (discountState && discountState.code) || ''); }
          }
        };
        iv = setInterval(tick, 1000);
        tick();
      };
      if (welcomeActive()) runBadge();
      else if (welcome.status === 'accepted' && !welcome.cleared) { welcome.cleared = true; writeWelcome(welcome); removeCode(welcome.code || (discountState && discountState.code) || ''); }
    }

    // Pop-up
    if (!popup) return;
    var open = function () {
      popup.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () { popup.classList.add('is-open'); }); });
      document.body.classList.add('overflow-hidden');
      var cta = $('[data-welcome-accept]', popup);
      if (cta) cta.focus({ preventScroll: true });
    };
    var close = function (remember) {
      popup.classList.remove('is-open');
      document.body.classList.remove('overflow-hidden');
      setTimeout(function () { popup.hidden = true; }, 450);
      if (remember) { welcome.status = 'dismissed'; welcome.at = Date.now(); writeWelcome(welcome); }
    };
    $$('[data-welcome-close]', popup).forEach(function (el) { el.addEventListener('click', function () { close(!designMode); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !popup.hidden) close(!designMode); });
    var accept = $('[data-welcome-accept]', popup);
    if (accept) accept.addEventListener('click', function () {
      if (designMode) return;
      var minutes = parseInt(popup.getAttribute('data-minutes'), 10) || 90;
      writeWelcome({ status: 'accepted', at: Date.now(), expires: Date.now() + minutes * 60000, code: popup.getAttribute('data-code') });
    });
    if (designMode) {
      document.addEventListener('shopify:section:select', function (e) { if (e.target.contains(popup)) open(); });
      document.addEventListener('shopify:section:deselect', function (e) { if (e.target.contains(popup)) close(false); });
      return;
    }
    var repeatDays = parseInt(popup.getAttribute('data-repeat-days'), 10) || 7;
    var shouldShow = !welcome.status || (welcome.status === 'dismissed' && now - (welcome.at || 0) > repeatDays * 86400000);
    var onCart = /\/cart(\/|$|\?)/.test(location.pathname);
    if (shouldShow && !onCart) setTimeout(open, (parseInt(popup.getAttribute('data-delay'), 10) || 0) * 1000);
  })();

  /* Código de descuento en el carrito ---------------------------------------- */
  var paintCartHints = function () {
    $$('[data-discount-hint]').forEach(function (h) {
      var show = welcomeActive() && discountState && !(discountState.applied > 0);
      h.hidden = !show;
      var box = h.closest('[data-cart-discount]');
      var input = box && $('[data-discount-input]', box);
      if (show && input && !input.value) input.value = (discountState && discountState.code) || '';
    });
  };
  paintCartHints();
  discountListeners.push(paintCartHints);
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-discount-form]');
    if (!form) return;
    e.preventDefault();
    var input = $('[data-discount-input]', form);
    var msg = $('[data-discount-msg]', form);
    var btn = $('button[type=submit]', form);
    var code = (input.value || '').trim();
    if (!code) { input.focus(); return; }
    btn.disabled = true;
    addCode(code).then(function (cart) {
      btn.disabled = false;
      var entry = (cart.discount_codes || []).find(function (d) { return sameCode(d.code, code); });
      if (entry && entry.applicable) { afterCartChange(); return; }
      var ds = discountState || {};
      var known = sameCode(code, ds.code) || sameCode(code, ds.crossCode);
      msg.hidden = false;
      msg.classList.toggle('is-error', !known);
      msg.textContent = known ? theme.strings.discountPending : theme.strings.discountInvalid;
      if (!known) removeCode(code);
      else { refreshDiscount(); paintCrossCards(); }
    }).catch(function () { btn.disabled = false; });
  });
  document.addEventListener('click', function (e) {
    var rm = e.target.closest('[data-discount-remove]');
    if (rm) {
      e.preventDefault();
      removeCode(rm.getAttribute('data-discount-remove')).then(afterCartChange);
      return;
    }
    var cross = e.target.closest('[data-cross-apply]');
    if (cross) {
      e.preventDefault();
      var card = cross.closest('[data-cross-card]');
      cross.disabled = true;
      addCode(card.getAttribute('data-code')).then(function () {
        window.location.href = card.getAttribute('data-url') || '/';
      }).catch(function () { cross.disabled = false; });
    }
  });

  /* Oferta cruzada: si el código ya está guardado (pendiente), cambia el texto y el botón */
  var paintCrossCards = function () {
    var cards = $$('[data-cross-card]');
    if (!cards.length) return;
    getCartCodes().then(function (codes) {
      cards.forEach(function (card) {
        var saved = codes.some(function (c) { return sameCode(c.code, card.getAttribute('data-code')); });
        $('[data-cross-offer]', card).hidden = saved;
        $('[data-cross-pending]', card).hidden = !saved;
        $('[data-cross-apply]', card).hidden = saved;
        $('[data-cross-go]', card).hidden = !saved;
      });
    });
  };
  paintCrossCards();
  discountListeners.push(paintCrossCards);

  /* Visor de fotos (lightbox) -------------------------------------------- */
  var lightbox = $('[data-lightbox]');
  var lb = { list: [], i: 0 };
  var lbShow = function () {
    if (!lightbox || !lb.list.length) return;
    $('[data-lightbox-img]', lightbox).src = lb.list[lb.i];
    $('[data-lightbox-count]', lightbox).textContent = lb.list.length > 1 ? (lb.i + 1) + ' / ' + lb.list.length : '';
    $('[data-lightbox-prev]', lightbox).hidden = lb.list.length < 2;
    $('[data-lightbox-next]', lightbox).hidden = lb.list.length < 2;
  };
  var lbOpen = function (list, index) {
    if (!lightbox) return;
    lb.list = list.filter(Boolean); lb.i = Math.max(0, Math.min(index || 0, lb.list.length - 1));
    lbShow();
    lightbox.hidden = false;
    requestAnimationFrame(function () { lightbox.classList.add('is-open'); });
    document.body.classList.add('overflow-hidden');
    $('[data-lightbox-close]', lightbox).focus({ preventScroll: true });
  };
  var lbClose = function () {
    if (!lightbox || lightbox.hidden) return;
    lightbox.classList.remove('is-open');
    setTimeout(function () { lightbox.hidden = true; }, 250);
    if (!$('.drawer.is-open') && !($('[data-welcome]') && !$('[data-welcome]').hidden)) document.body.classList.remove('overflow-hidden');
  };
  var lbStep = function (d) { if (lb.list.length) { lb.i = (lb.i + d + lb.list.length) % lb.list.length; lbShow(); } };
  window.vivaLightbox = lbOpen;
  if (lightbox) {
    $('[data-lightbox-close]', lightbox).addEventListener('click', lbClose);
    $('[data-lightbox-prev]', lightbox).addEventListener('click', function () { lbStep(-1); });
    $('[data-lightbox-next]', lightbox).addEventListener('click', function () { lbStep(1); });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox || e.target.hasAttribute('data-lightbox-stage')) lbClose(); });
    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') lbClose();
      if (e.key === 'ArrowLeft') lbStep(-1);
      if (e.key === 'ArrowRight') lbStep(1);
    });
    var lbX = null;
    lightbox.addEventListener('touchstart', function (e) { lbX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', function (e) {
      if (lbX === null) return;
      var dx = e.changedTouches[0].clientX - lbX;
      if (Math.abs(dx) > 40) lbStep(dx < 0 ? 1 : -1);
      lbX = null;
    });
  }
  // Botones "Ver fotos" (packs, etc.)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-lightbox-images]');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    try { lbOpen(JSON.parse(btn.getAttribute('data-lightbox-images')), 0); } catch (err) {}
  }, true);

  /* Galería de producto: carrusel con miniaturas -------------------------- */
  $$('[data-gallery]').forEach(function (g) {
    var track = $('[data-gallery-track]', g);
    if (!track) return;
    var slides = $$('.gallery-main__slide', track);
    var thumbs = $$('[data-gallery-thumb]', g);
    var dots = $$('.gallery-dots__dot', g);
    var prev = $('[data-gallery-prev]', g), next = $('[data-gallery-next]', g);
    var zoomList = [];
    try { zoomList = JSON.parse($('[data-gallery-zoom-list]', g).textContent); } catch (e) {}
    var current = 0;
    var goTo = function (i) { var s2 = slides[i]; if (s2) track.scrollTo({ left: s2.offsetLeft - track.offsetLeft, behavior: 'smooth' }); };
    var mark = function (i) {
      current = i;
      thumbs.forEach(function (t, k) { t.classList.toggle('is-active', k === i); });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === slides.length - 1;
      var t = thumbs[i];
      if (t && t.parentNode.scrollWidth > t.parentNode.clientWidth) t.parentNode.scrollTo({ left: t.offsetLeft - t.parentNode.clientWidth / 2 + t.clientWidth / 2, behavior: 'smooth' });
    };
    var onScroll = function () {
      var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (i !== current) mark(Math.max(0, Math.min(i, slides.length - 1)));
    };
    track.addEventListener('scroll', function () { window.requestAnimationFrame(onScroll); }, { passive: true });
    thumbs.forEach(function (t) { t.addEventListener('click', function () { goTo(parseInt(t.getAttribute('data-gallery-thumb'), 10)); }); });
    if (prev) prev.addEventListener('click', function () { goTo(Math.max(0, current - 1)); });
    if (next) next.addEventListener('click', function () { goTo(Math.min(slides.length - 1, current + 1)); });
    $$('[data-gallery-zoom]', g).forEach(function (z) {
      z.addEventListener('click', function () {
        var idx = parseInt(z.getAttribute('data-gallery-zoom'), 10);
        var imgs = zoomList.filter(Boolean);
        var target = zoomList[idx];
        lbOpen(imgs, Math.max(0, imgs.indexOf(target)));
      });
    });
    mark(0);
  });

  /* Barra fija "Añadir al carrito" en móvil (formulario personalizado) ------ */
  (function () {
    var submit = document.getElementById('vlh-submit-btn');
    var totalEl = document.getElementById('vlh-total-price');
    if (!submit || !totalEl) return;
    var bar = document.createElement('div');
    bar.className = 'sticky-buy';
    bar.innerHTML = '<span class="sticky-buy__total">Total<b data-sticky-total></b></span><button type="button" class="button">' + (submit.textContent.trim() || 'Añadir al carrito') + '</button>';
    document.body.appendChild(bar);
    document.body.classList.add('has-sticky-buy');
    var tEl = $('[data-sticky-total]', bar);
    var sync = function () { tEl.textContent = totalEl.textContent; };
    sync();
    new MutationObserver(sync).observe(totalEl, { childList: true, characterData: true, subtree: true });
    $('button', bar).addEventListener('click', function () {
      submit.click();
      setTimeout(function () {
        var err = document.getElementById('vlh-error');
        if (err && !err.hidden) err.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    });
    var formTop = document.getElementById('vlh-form');
    var submitVisible = true;
    var update = function () {
      var started = formTop ? formTop.getBoundingClientRect().top < window.innerHeight * 0.6 : window.scrollY > 300;
      bar.classList.toggle('is-visible', started && !submitVisible);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { submitVisible = en[0].isIntersecting; update(); }).observe(submit);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  })();

  /* Protección de imágenes: sin clic derecho ni arrastrar sobre fotos -------- */
  if (document.body.classList.contains('protect-images')) {
    var isProtected = function (el) { return el && (el.tagName === 'IMG' || el.tagName === 'VIDEO' || (el.closest && el.closest('.gallery-main, .lightbox__stage, .card__media, .tile .media, .gallery__item'))); };
    document.addEventListener('contextmenu', function (e) { if (isProtected(e.target)) e.preventDefault(); });
    document.addEventListener('dragstart', function (e) { if (isProtected(e.target)) e.preventDefault(); });
  }

  /* Filters -------------------------------------------------------------- */
  $$('[data-facets-form]').forEach(function (form) {
    form.addEventListener('change', function (e) {
      if (e.target.matches('[data-autosubmit]')) form.submit();
    });
  });
  document.addEventListener('click', function (e) {
    $$('.facets details[open]').forEach(function (d) { if (!d.contains(e.target)) d.removeAttribute('open'); });
  });

  /* Ver más (colecciones) ------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-load-more-btn]');
    if (!btn) return;
    var wrap = btn.closest('[data-load-more]');
    var grid = document.querySelector('[data-product-grid]');
    if (!wrap || !grid) return;
    e.preventDefault();
    btn.classList.add('is-loading');
    fetch(btn.href).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var freshGrid = doc.querySelector('[data-product-grid]');
      var freshWrap = doc.querySelector('[data-load-more]');
      if (!freshGrid) { window.location.href = btn.href; return; }
      Array.prototype.slice.call(freshGrid.children).forEach(function (card) { grid.appendChild(card); });
      if (freshWrap) {
        var count = freshWrap.querySelector('[data-load-more-count]');
        var bar = freshWrap.querySelector('[data-load-more-bar]');
        var next = freshWrap.querySelector('[data-load-more-btn]');
        if (count) wrap.querySelector('[data-load-more-count]').innerHTML = count.innerHTML;
        if (bar) wrap.querySelector('[data-load-more-bar]').style.width = bar.style.width;
        if (next) { btn.href = next.href; btn.classList.remove('is-loading'); } else { btn.remove(); }
      } else { btn.remove(); }
    }).catch(function () { window.location.href = btn.href; });
  });

  /* Recommendations ------------------------------------------------------ */
  $$('[data-recommendations]').forEach(function (el) {
    if (el.children.length && el.querySelector('.card')) return;
    fetch(el.getAttribute('data-url')).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var fresh = doc.querySelector('[data-recommendations]');
      if (fresh && fresh.innerHTML.trim()) {
        el.innerHTML = fresh.innerHTML;
        $$('[data-carousel]', el).forEach(initCarousel);
      }
    });
  });

  /* Theme editor --------------------------------------------------------- */
  document.addEventListener('shopify:section:load', function (e) {
    $$('[data-carousel]', e.target).forEach(initCarousel);
    $$('[data-reveal]', e.target).forEach(function (el) { el.classList.add('is-visible'); });
  });

  window.vivaToast = toast;
})();
