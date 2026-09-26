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
      refreshDrawer();
    });
  });
  document.addEventListener('change', function (e) {
    var input = e.target.closest('[data-cart-qty-input]');
    if (!input) return;
    var line = input.closest('[data-key]');
    changeLine(line.getAttribute('data-key'), Math.max(0, parseInt(input.value, 10) || 0)).then(function (cart) {
      if (document.querySelector('[data-cart-page]') && !input.closest('[data-cart-drawer]')) { window.location.reload(); return; }
      updateCount(cart.item_count);
      refreshDrawer();
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
          refreshDrawer().then(function () { openDrawer('CartDrawer'); });
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
        if (media && gallery) {
          if (window.matchMedia('(max-width: 749px)').matches) gallery.scrollTo({ left: media.offsetLeft - 24, behavior: 'smooth' });
          else if (media !== gallery.firstElementChild) gallery.insertBefore(media, gallery.firstElementChild);
        }
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

  /* Pop-up de bienvenida + contador del descuento ---------------------------- */
  (function () {
    var popup = $('[data-welcome]');
    var badge = $('[data-welcome-badge]');
    if (!popup && !badge) return;
    var KEY = 'vlh_welcome';
    var read = function () { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    var write = function (o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
    var state = read();
    var now = Date.now();
    var designMode = window.Shopify && Shopify.designMode;

    // Contador
    var timerEl = badge && $('[data-welcome-timer]', badge);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var clearDiscount = function () {
      fetch((theme.routes.root || '/').replace(/\/?$/, '/') + 'cart/update.js', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ discount: '' })
      }).catch(function () {});
    };
    var runBadge = function () {
      if (!badge || !state.expires) return;
      var hiddenThisSession = false;
      try { hiddenThisSession = sessionStorage.getItem(KEY + '_badge_hidden') === '1'; } catch (e) {}
      if (!hiddenThisSession) badge.hidden = false;
      var tick = function () {
        var left = Math.max(0, state.expires - Date.now());
        var h = Math.floor(left / 3600000), m = Math.floor(left % 3600000 / 60000), s = Math.floor(left % 60000 / 1000);
        if (timerEl) timerEl.textContent = (h ? h + ':' + pad(m) : m) + ':' + pad(s);
        if (left <= 0) {
          clearInterval(iv);
          badge.hidden = true;
          if (!state.cleared) { state.cleared = true; write(state); clearDiscount(); }
        }
      };
      var iv = setInterval(tick, 1000);
      tick();
    };
    if (badge) {
      var hideBtn = $('[data-welcome-badge-hide]', badge);
      if (hideBtn) hideBtn.addEventListener('click', function () {
        badge.hidden = true;
        try { sessionStorage.setItem(KEY + '_badge_hidden', '1'); } catch (e) {}
      });
    }
    if (state.status === 'accepted') {
      if (state.expires > now) runBadge();
      else if (!state.cleared) { state.cleared = true; write(state); clearDiscount(); }
    }

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
      if (remember) { state.status = 'dismissed'; state.at = Date.now(); write(state); }
    };
    $$('[data-welcome-close]', popup).forEach(function (el) { el.addEventListener('click', function () { close(!designMode); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !popup.hidden) close(!designMode); });
    var accept = $('[data-welcome-accept]', popup);
    if (accept) accept.addEventListener('click', function () {
      if (designMode) return;
      var minutes = parseInt(popup.getAttribute('data-minutes'), 10) || 90;
      write({ status: 'accepted', at: Date.now(), expires: Date.now() + minutes * 60000, code: popup.getAttribute('data-code') });
    });

    if (designMode) {
      document.addEventListener('shopify:section:select', function (e) { if (e.target.contains(popup)) open(); });
      document.addEventListener('shopify:section:deselect', function (e) { if (e.target.contains(popup)) close(false); });
      return;
    }
    var repeatDays = parseInt(popup.getAttribute('data-repeat-days'), 10) || 7;
    var shouldShow = !state.status || (state.status === 'dismissed' && now - (state.at || 0) > repeatDays * 86400000);
    var onCart = /\/cart(\/|$|\?)/.test(location.pathname);
    if (shouldShow && !onCart) {
      setTimeout(open, (parseInt(popup.getAttribute('data-delay'), 10) || 0) * 1000);
    }
  })();

  /* Filters -------------------------------------------------------------- */
  $$('[data-facets-form]').forEach(function (form) {
    form.addEventListener('change', function (e) {
      if (e.target.matches('[data-autosubmit]')) form.submit();
    });
  });
  document.addEventListener('click', function (e) {
    $$('.facets details[open]').forEach(function (d) { if (!d.contains(e.target)) d.removeAttribute('open'); });
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
