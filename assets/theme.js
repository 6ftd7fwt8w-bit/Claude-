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

  /* Descuento de bienvenida: dura 24 h desde que se activa en el aviso del formulario.
     Al caducar se quita el código de la cesta. */
  var WKEY = 'vlh_welcome';
  var WELCOME_MS = 24 * 3600000;
  var readWelcome = function () { try { return JSON.parse(localStorage.getItem(WKEY)) || {}; } catch (e) { return {}; } };
  var writeWelcome = function (o) { try { localStorage.setItem(WKEY, JSON.stringify(o)); } catch (e) {} };
  var welcome = readWelcome();
  var welcomeActive = function () { return welcome.status === 'accepted' && welcome.expires > Date.now(); };
  var welcomeExpire = function () {
    if (welcome.status !== 'accepted' || welcome.expires > Date.now() || welcome.cleared) return;
    welcome.cleared = true; writeWelcome(welcome);
    removeCode(welcome.code || (discountState && discountState.code) || '').then(afterCartChange);
  };
  var dismissedThisSession = function () { try { return sessionStorage.getItem('vlh_welcome_no') === '1'; } catch (e) { return false; } };
  window.vivaWelcome = {
    active: welcomeActive,
    // Se ofrece hasta la primera compra; «No, gracias» solo lo oculta en esta visita
    canOffer: function () { return welcome.status !== 'purchased' && !welcomeActive() && !dismissedThisSession(); },
    expires: function () { return welcome.expires || 0; },
    activate: function (code) {
      welcome = { status: 'accepted', at: Date.now(), expires: Date.now() + WELCOME_MS, code: code };
      writeWelcome(welcome);
      return addCode(code).then(function () { refreshDrawer().then(refreshDiscount); }).catch(function () {});
    },
    dismiss: function () { try { sessionStorage.setItem('vlh_welcome_no', '1'); } catch (e) {} }
  };
  // Primera compra hecha: la cesta con el descuento desaparece (Shopify la vacía y crea otra al pagar)
  // o la clienta ha iniciado sesión y ya tiene pedidos. A partir de ahí no se vuelve a ofrecer.
  discountListeners.push(function (ds) {
    if (!ds || welcome.status === 'purchased') return;
    if (ds.customerOrders > 0 || (welcome.status === 'accepted' && welcome.items > 0 && welcome.token && ds.token !== welcome.token)) {
      welcome = { status: 'purchased', at: Date.now() };
      writeWelcome(welcome);
      return;
    }
    if (welcome.status === 'accepted' && ds.token && (ds.token !== welcome.token || ds.itemCount !== welcome.items)) {
      welcome.token = ds.token; welcome.items = ds.itemCount;
      writeWelcome(welcome);
    }
  });
  if (discountState) discountListeners[discountListeners.length - 1](discountState);
  // Código ya aplicado sin activación (p. ej. de antes de este cambio): sus 24 h empiezan ahora
  discountListeners.push(function (ds) {
    if (ds && ds.applied > 0 && welcome.status !== 'accepted' && welcome.status !== 'purchased') {
      welcome = { status: 'accepted', at: Date.now(), expires: Date.now() + WELCOME_MS, code: ds.code };
      writeWelcome(welcome);
    }
  });
  if (discountState) discountListeners[discountListeners.length - 1](discountState);
  welcomeExpire();
  setInterval(welcomeExpire, 60000);

  /* Sets de 3 láminas: panel con tamaño, total con 3x2 y «Añadir las 3» */
  (function () {
    var sheets = $$('[data-set-sheet]');
    if (!sheets.length) return;
    var paint = function (sh) {
      var items = $$('[data-set-item]', sh), prices = items.map(function (it) { return parseInt(it.getAttribute('data-' + (it._size || 'A4').toLowerCase() + '-price'), 10) || 0; });
      var total = prices.reduce(function (a, b) { return a + b; }, 0);
      var min = Math.min.apply(null, prices), freeIdx = prices.indexOf(min), hasCode = !!sh.getAttribute('data-code') && items.length >= 3;
      items.forEach(function (it, i) {
        var el = $('[data-set-item-price]', it);
        var free = hasCode && i === freeIdx;
        it.classList.toggle('is-free', free);
        el.textContent = free ? 'GRATIS' : formatMoney(prices[i]);
      });
      $('[data-set-old]', sh).textContent = hasCode ? formatMoney(total) : '';
      $('[data-set-total]', sh).textContent = formatMoney(hasCode ? total - min : total);
    };
    sheets.forEach(function (sh) {
      paint(sh);
      var setItemSize = function (it, size) {
        it._size = size;
        $$('[data-item-size]', it).forEach(function (x) { var on = x.getAttribute('data-item-size') === size; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on); });
      };
      // Marca el botón general solo si las 3 van del mismo tamaño
      var syncAll = function () {
        var sizes = $$('[data-set-item]', sh).map(function (it) { return it._size || 'A4'; });
        var same = sizes.every(function (z) { return z === sizes[0]; }) ? sizes[0] : null;
        sh._size = same;
        $$('[data-set-size]', sh).forEach(function (x) { var on = x.getAttribute('data-set-size') === same; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on); });
      };
      sh._applySize = function (size) { $$('[data-set-item]', sh).forEach(function (it) { setItemSize(it, size); }); syncAll(); paint(sh); };
      $$('[data-set-size]', sh).forEach(function (b) {
        b.addEventListener('click', function () { sh._applySize(b.getAttribute('data-set-size')); });
      });
      $$('[data-set-item]', sh).forEach(function (it) {
        $$('[data-item-size]', it).forEach(function (b) {
          b.addEventListener('click', function () { setItemSize(it, b.getAttribute('data-item-size')); syncAll(); paint(sh); });
        });
      });
      var close = function () { if (sh.open) sh.close(); document.body.classList.remove('set-open'); };
      $('[data-set-close]', sh).addEventListener('click', close);
      sh.addEventListener('click', function (e) { if (e.target === sh) close(); });
      sh.addEventListener('close', function () { document.body.classList.remove('set-open'); });
      var add = $('[data-set-add]', sh), msg = $('[data-set-msg]', sh);
      add.addEventListener('click', function () {
        var items = $$('[data-set-item]', sh).map(function (it) { return { id: parseInt(it.getAttribute('data-' + (it._size || 'A4').toLowerCase()), 10), quantity: 1 }; });
        add.disabled = true; msg.hidden = true;
        fetch((theme.routes.cartAdd || '/cart/add') + '.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: items }) })
          .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
          .then(function () { var code = sh.getAttribute('data-code'); return code ? addCode(code).catch(function () {}) : null; })
          .then(function () { close(); add.disabled = false; if (window.vivaCartAdded) window.vivaCartAdded(); })
          .catch(function () { add.disabled = false; msg.hidden = false; msg.textContent = 'No se ha podido añadir el set. Inténtalo de nuevo.'; });
      });
    });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-set-open]');
      if (!b) return;
      var sh = document.getElementById(b.getAttribute('data-set-open'));
      if (sh && sh.showModal) { sh.showModal(); document.body.classList.add('set-open'); }
    });
    /* «Siguiente set»: cierra el panel y abre el del siguiente set (en bucle) */
    sheets.forEach(function (sh, i) {
      var nx = $('[data-set-next]', sh);
      if (!nx) return;
      if (sheets.length < 2) { nx.hidden = true; return; }
      nx.addEventListener('click', function () {
        var next = sheets[(i + 1) % sheets.length];
        if (sh._size && next._applySize) next._applySize(sh._size);
        sh.close(); next.showModal(); document.body.classList.add('set-open');
        var panel = $('.set-sheet__panel', next); if (panel) panel.scrollTop = 0;
      });
    });
  })();

  /* Vídeos de la galería: se descargan y reproducen solo cuando están en pantalla */
  (function () {
    var vids = $$('video[data-lazy-video]');
    if (!vids.length) return;
    var start = function (v) {
      if (!v.getAttribute('src')) { v.src = v.getAttribute('data-lazy-video'); }
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    };
    if (!('IntersectionObserver' in window)) { vids.forEach(start); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) start(e.target); else if (!e.target.paused) e.target.pause(); });
    }, { rootMargin: '150px 200px' });
    vids.forEach(function (v) { io.observe(v); });
  })();

  /* Precarga de las fotos ampliadas (miniaturas de ejemplo, packs...) para que se abran al instante */
  (function () {
    var done = {};
    var prefetch = function (el) {
      var list; try { list = JSON.parse(el.getAttribute('data-lightbox-images') || '[]'); } catch (e) { return; }
      list.forEach(function (src) { if (!done[src]) { done[src] = 1; var im = new Image(); im.decoding = 'async'; im.src = src; } });
    };
    ['pointerenter', 'touchstart', 'focusin'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        var el = e.target && e.target.closest && e.target.closest('[data-lightbox-images]');
        if (el) prefetch(el);
      }, { passive: true, capture: true });
    });
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1500); };
    window.addEventListener('load', function () { idle(function () { $$('.vlh-canvas__thumb[data-lightbox-images]').forEach(prefetch); }); });
  })();

  /* Envío gratis: franja bajo la cabecera con lo que falta ----------------------- */
  (function () {
    var fs = theme.freeShipping || {};
    var paintShip = function (ds) {
      if (!ds) return;
      var total = ds.total || 0, count = ds.itemCount || 0, limit = fs.threshold || 0;
      document.dispatchEvent(new CustomEvent('vlh:cart-state', { detail: { total: total, count: count } }));
      $$('[data-ship-strip]').forEach(function (el) {
        el.hidden = !(limit > 0 && count > 0);
        if (el.hidden) return;
        var left = limit - total;
        var txt = $('[data-ship-text]', el);
        el.classList.toggle('is-free', left <= 0);
        if (left > 0) {
          var parts = (theme.strings.shipRemaining || '').split('[amount]');
          txt.innerHTML = '';
          parts.forEach(function (p, i) {
            var tmp = document.createElement('span'); tmp.innerHTML = p;
            while (tmp.firstChild) txt.appendChild(tmp.firstChild);
            if (i < parts.length - 1) { var b = document.createElement('strong'); b.textContent = formatMoney(left); txt.appendChild(b); }
          });
        } else {
          txt.textContent = theme.strings.shipReached || '';
        }
        $('.ship-strip__icon', el).textContent = left > 0 ? '🚚' : '🎉';
        var fill = $('[data-ship-fill]', el);
        if (fill) fill.style.width = Math.min(100, Math.round(total * 100 / limit)) + '%';
      });
    };
    paintShip(discountState);
    discountListeners.push(paintShip);
  })();

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

  /* Barra fija "Añadir al carrito" (formulario personalizado): aparece al bajar por debajo del botón.
     Con el descuento de bienvenida activo enseña el precio tachado, el nuevo y «válido 24 h». */
  (function () {
    var submit = document.getElementById('vlh-submit-btn');
    var totalEl = document.getElementById('vlh-total-price');
    if (!submit || !totalEl) return;
    var oldEl = document.getElementById('vlh-total-old');
    var perkEl = document.getElementById('vlh-perk');
    var envioEl = document.getElementById('vlh-envio');
    var bar = document.createElement('div');
    bar.className = 'sticky-buy';
    bar.innerHTML = '<div class="sticky-buy__price"><span class="sticky-buy__label">Total</span>' +
      '<span class="sticky-buy__amounts"><s data-sticky-old hidden></s><b data-sticky-total></b></span>' +
      '<span class="sticky-buy__perk" data-sticky-perk hidden><i aria-hidden="true"></i><span></span></span>' +
      '<span class="sticky-buy__ship" data-sticky-ship hidden>Envío gratis</span></div>' +
      '<button type="button" class="button sticky-buy__btn">' + (submit.textContent.trim() || 'Añadir al carrito') + '</button>';
    document.body.appendChild(bar);
    document.body.classList.add('has-sticky-buy');
    var tEl = $('[data-sticky-total]', bar), sOld = $('[data-sticky-old]', bar), sPerk = $('[data-sticky-perk]', bar), sShip = $('[data-sticky-ship]', bar);
    var sync = function () {
      tEl.textContent = totalEl.textContent;
      var deal = !!(perkEl && !perkEl.hidden);
      var hasOld = !!(oldEl && !oldEl.hidden && oldEl.textContent.trim());
      sOld.hidden = !hasOld;
      sOld.textContent = hasOld ? oldEl.textContent : '';
      var pct = deal ? ((perkEl.textContent.match(/(\d+)\s*%/) || [])[1] || '10') : '';
      $('span', sPerk).textContent = deal ? '−' + pct + ' % en tu ilustración · 24 h' : '';
      sPerk.hidden = !deal;
      sShip.hidden = deal || !(envioEl && /gratis/i.test(envioEl.textContent));
      bar.classList.toggle('has-deal', deal);
    };
    sync();
    var mo = new MutationObserver(sync);
    [totalEl, oldEl, perkEl, envioEl].forEach(function (el) { if (el) mo.observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }); });
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

  /* Ver más (colecciones): carga automática al acercarse al final (scroll infinito); el enlace queda solo como respaldo sin JS */
  var loadMore = function (btn) {
    var wrap = btn.closest('[data-load-more]');
    var grid = document.querySelector('[data-product-grid]');
    if (!wrap || !grid || btn.classList.contains('is-loading')) return false;
    btn.classList.add('is-loading');
    wrap.classList.add('is-loading');
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
      wrap.classList.remove('is-loading');
      // Si aún se ve el final (pantallas grandes), sigue cargando
      if (document.body.contains(btn) && wrap.getBoundingClientRect().top < window.innerHeight + 600) loadMore(btn);
    }).catch(function () { window.location.href = btn.href; });
    return true;
  };
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-load-more-btn]');
    if (btn && loadMore(btn)) e.preventDefault();
  });
  (function () {
    var wrap = document.querySelector('[data-load-more]');
    if (!wrap || !wrap.querySelector('[data-load-more-btn]') || !('IntersectionObserver' in window)) return;
    wrap.classList.add('is-auto');
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var btn = wrap.querySelector('[data-load-more-btn]');
        if (en.isIntersecting && btn) loadMore(btn);
      });
    }, { rootMargin: '0px 0px 900px 0px' }).observe(wrap);
  })();

  /* Hacen pack (recomendaciones complementarias) ------------------------ */
  $$('[data-pack-recs]').forEach(function (sec) {
    var grid = $('[data-pack-grid]', sec);
    if (!grid) return;
    var btn = $('[data-pack-add]', sec);
    var offer = $('[data-pack-offer]', sec);
    var q = function (sel) { return $(sel, sec); };
    var money = function (cents) {
      return (cents / 100).toLocaleString(document.documentElement.lang || 'es', { style: 'currency', currency: (window.Shopify && Shopify.currency && Shopify.currency.active) || 'EUR' });
    };
    var pick = function (item) {
      var vs = [];
      try { vs = JSON.parse($('[data-pack-variants]', item).textContent); } catch (err) {}
      var sel = $('[data-pack-variant]', item);
      var want = sel ? parseInt(sel.value, 10) : null;
      return vs.filter(function (v) { return v.a && v.id === want; })[0] || vs.filter(function (v) { return v.a; })[0] || null;
    };
    var saving = 0;
    var show = function (sel, on) { var el = q(sel); if (el) el.hidden = !on; };
    var update = function () {
      var chosen = $$('[data-pack-item]', grid).filter(function (i) { return i.classList.contains('is-on'); });
      var subtotal = 0, n = 0, crossPrices = [];
      chosen.forEach(function (item) {
        var v = pick(item);
        if (!v) return;
        subtotal += v.p; n++;
        if (item.getAttribute('data-cross') === 'true') crossPrices.push(v.p);
      });
      // Compra 2 y llévate 1: gratis la más barata de cada grupo de 3
      crossPrices.sort(function (x, y) { return x - y; });
      var free = Math.floor(crossPrices.length / 3);
      saving = 0;
      for (var i = 0; i < free; i++) saving += crossPrices[i];
      var extra = n > 1;
      show('[data-pack-intro]', !extra);
      show('[data-pack-lines]', extra);
      btn.hidden = !extra;
      show('[data-pack-sub-row]', saving > 0);
      show('[data-pack-save-row]', saving > 0);
      if (offer) {
        var need = (3 - crossPrices.length % 3) % 3;
        var txt;
        if (free > 0 && need === 0) txt = offer.getAttribute('data-got').replace('[amount]', money(saving));
        else if (need === 1) txt = offer.getAttribute('data-need-one');
        else txt = offer.getAttribute('data-need-many').replace('[n]', need);
        if (free > 0 && need !== 0) txt = offer.getAttribute('data-got').replace('[amount]', money(saving)) + ' ' + txt;
        $('[data-pack-offer-text]', offer).textContent = txt;
        offer.classList.toggle('is-won', free > 0);
      }
      if (!extra) return;
      q('[data-pack-count]').textContent = btn.getAttribute('data-count-label').replace('[n]', n);
      q('[data-pack-subtotal]').textContent = money(subtotal);
      if (saving > 0) {
        q('[data-pack-save-label]').textContent = btn.getAttribute('data-save-label').replace('[n]', free);
        q('[data-pack-save]').textContent = '−' + money(saving);
      }
      q('[data-pack-total]').textContent = money(subtotal - saving);
      btn.textContent = btn.getAttribute('data-label').replace('[n]', n);
    };
    sec.addEventListener('click', function (e) {
      var t = e.target.closest('[data-pack-toggle]');
      if (!t) return;
      var item = t.closest('[data-pack-item]');
      var on = !item.classList.contains('is-on');
      item.classList.toggle('is-on', on);
      t.setAttribute('aria-pressed', on);
      update();
    });
    sec.addEventListener('change', function (e) { if (e.target.matches('[data-pack-variant]')) update(); });
    btn.addEventListener('click', function () {
      var items = $$('[data-pack-item]', grid).filter(function (i) { return i.classList.contains('is-on'); })
        .map(function (i) { var v = pick(i); return v ? { id: v.id, quantity: 1 } : null; }).filter(Boolean);
      if (!items.length) return;
      var code = btn.getAttribute('data-code');
      btn.disabled = true;
      fetch((theme.routes.root || '/').replace(/\/?$/, '/') + 'cart/add.js', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: items })
      }).then(function (r) { if (!r.ok) throw new Error('add'); return r.json(); })
        .then(function () { return saving > 0 && code ? addCode(code).catch(function () {}) : null; })
        .then(function () { btn.disabled = false; window.vivaCartAdded(); })
        .catch(function () { btn.disabled = false; toast(theme.strings.unavailable); });
    });
    // Complementarias de Search & Discovery; si hay menos de 2, completamos con relacionadas
    var MIN = 2, FILL = 3;
    var loadRecs = function (url) {
      return fetch(url).then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.querySelector('[data-pack-fresh]');
        return fresh ? $$('[data-pack-item]', fresh) : [];
      }).catch(function () { return []; });
    };
    var url = sec.getAttribute('data-url');
    // Si se muestra "Combínala con…", sobra "También te puede gustar"
    var related = $$('[data-recommendations]').map(function (el) { return el.closest('.shopify-section') || el; });
    related.forEach(function (el) { el.hidden = true; });
    var showRelated = function () { related.forEach(function (el) { el.hidden = false; }); };
    loadRecs(url).then(function (recs) {
      if (recs.length >= MIN) return recs;
      return loadRecs(url.replace('intent=complementary', 'intent=related').replace(/limit=\d+/, 'limit=10')).then(function (related) {
        var seen = {};
        seen[$('[data-pack-item]', grid).getAttribute('data-product-id')] = true;
        recs.forEach(function (i) { seen[i.getAttribute('data-product-id')] = true; });
        var extra = related.filter(function (i) { return !seen[i.getAttribute('data-product-id')]; });
        // Primero las que entran en la oferta
        extra.sort(function (a, b) { return (b.getAttribute('data-cross') === 'true') - (a.getAttribute('data-cross') === 'true'); });
        return recs.concat(extra.slice(0, FILL - recs.length));
      });
    }).then(function (recs) {
      if (!recs.length) { showRelated(); return; }
      related.forEach(function (el) { el.remove(); });
      // El botón "Ver más láminas" pasa debajo del bloque
      var back = document.querySelector('[data-back-link]');
      var more = $('[data-pack-more]', sec);
      if (back && more) { back.classList.remove('button--full'); more.appendChild(back); more.hidden = false; }
      recs.forEach(function (item) { grid.appendChild(document.importNode(item, true)); });
      grid.style.setProperty('--pack-n', recs.length + 1);
      sec.hidden = false;
      update();
    }).catch(showRelated);
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

/* Comparativa A4/A3 a escala en las fichas de láminas */
document.addEventListener('click', (e) => {
  const open = e.target.closest('[data-guide-open]');
  if (open) {
    const dlg = open.parentElement.querySelector('[data-guide]') || document.querySelector('[data-guide]');
    const art = open.getAttribute('data-guide-art');
    if (dlg && art) dlg.querySelectorAll('image').forEach((im) => im.setAttribute('href', art));
    if (dlg) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    return;
  }
  const dlg = e.target.closest('[data-guide]');
  if (dlg && (e.target.closest('[data-guide-close]') || e.target === dlg)) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
});

/* «Siguiente lámina»: precarga la ficha siguiente al acercar el dedo o el ratón */
document.addEventListener('pointerover', (e) => {
  const a = e.target.closest && e.target.closest('a[data-next-prod]');
  if (!a || a._pf) return;
  a._pf = true;
  const l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.href; document.head.appendChild(l);
}, { passive: true });
document.addEventListener('touchstart', (e) => {
  const a = e.target.closest && e.target.closest('a[data-next-prod]');
  if (!a || a._pf) return;
  a._pf = true;
  const l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.href; document.head.appendChild(l);
}, { passive: true });

/* «Combínala con…» en móvil: flechas para desplazar la fila de láminas */
document.querySelectorAll('[data-scroller]').forEach((wrap) => {
  const track = wrap.querySelector('[data-scroller-track]');
  const prev = wrap.querySelector('[data-scroller-prev]');
  const next = wrap.querySelector('[data-scroller-next]');
  if (!track || !next) return;
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const scrollable = max > 8 && getComputedStyle(track).overflowX !== 'visible';
    next.hidden = !scrollable || track.scrollLeft >= max - 8;
    if (prev) prev.hidden = !scrollable || track.scrollLeft <= 8;
  };
  const step = (dir) => {
    const item = track.children[0];
    const w = item ? item.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * w, behavior: 'smooth' });
  };
  next.addEventListener('click', () => step(1));
  if (prev) prev.addEventListener('click', () => step(-1));
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  new MutationObserver(update).observe(track, { childList: true });
  update();
});

/* «Visto en Instagram»: avanza solo y también se puede arrastrar (con el dedo o el ratón);
   al soltar sigue avanzando. Las dos copias de fotos permiten un bucle sin saltos. */
document.querySelectorAll('.ig-marquee').forEach((box) => {
  const track = box.querySelector('.ig-marquee__track');
  const set = box.querySelector('.ig-marquee__set');
  if (!track || !set || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  box.classList.add('is-js');
  const secs = parseFloat(getComputedStyle(box).getPropertyValue('--ig-duration')) || 60;
  let pos = 0, last = 0, visible = false, holdUntil = 0, dragging = false, raf = 0;
  const half = () => set.getBoundingClientRect().width;
  const hold = (ms) => { holdUntil = Math.max(holdUntil, performance.now() + ms); };
  const step = (t) => {
    raf = 0;
    if (!visible) return;
    const dt = last ? Math.min(t - last, 64) : 0;
    last = t;
    const w = half();
    if (w > 0) {
      if (!dragging && t > holdUntil) pos += (w / secs) * (dt / 1000);
      else pos = box.scrollLeft;
      if (pos >= w) pos -= w;
      if (pos < 0) pos += w;
      if (Math.abs(box.scrollLeft - pos) >= 0.5) box.scrollLeft = pos;
    }
    raf = requestAnimationFrame(step);
  };
  const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(step); } };
  // Al tocarlo o arrastrarlo se para; sigue solo poco después de soltarlo (incluida la inercia)
  // Si está al principio, salta a la segunda copia (idéntica) para poder arrastrar también hacia la izquierda
  const roomLeft = () => { const w = half(); if (w > 0 && box.scrollLeft < w * 0.3) { box.scrollLeft += w; pos = box.scrollLeft; } };
  box.addEventListener('touchstart', () => { dragging = true; roomLeft(); }, { passive: true });
  box.addEventListener('touchend', () => { dragging = false; hold(1500); }, { passive: true });
  box.addEventListener('scroll', () => { if (dragging || performance.now() < holdUntil) { pos = box.scrollLeft; hold(1200); } }, { passive: true });
  box.addEventListener('wheel', () => hold(1500), { passive: true });
  box.addEventListener('mouseenter', () => { dragging = true; });
  box.addEventListener('mouseleave', () => { dragging = false; hold(600); });
  // Arrastrar con el ratón en ordenador
  let mx = null, ms = 0, moved = false;
  box.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; roomLeft(); mx = e.clientX; ms = box.scrollLeft; moved = false; });
  window.addEventListener('pointermove', (e) => { if (mx === null) return; const d = e.clientX - mx; if (Math.abs(d) > 4) moved = true; box.scrollLeft = ms - d; pos = box.scrollLeft; });
  window.addEventListener('pointerup', () => { mx = null; });
  box.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
  box.addEventListener('dragstart', (e) => e.preventDefault());
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) start(); }).observe(box);
  } else { visible = true; start(); }
});
