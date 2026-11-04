/**
 * ═══════════════════════════════════════════════════════════════
 *  premium.js — Metehan Tabak Portfolio · Ortak premium davranışlar
 * ═══════════════════════════════════════════════════════════════
 *  <script src="assets/js/premium.js" defer></script> olarak, sayfanın
 *  kendi script'lerinden SONRA çalışır. Modüller:
 *    · Preloader (lav dolan taç) + sayfa geçişi perdesi
 *    · Lenis smooth scroll (yalnızca fare + reduced-motion kapalıyken)
 *    · Özel imleç (lerp, hover / "İncele" etiketi)
 *    · Magnetic butonlar, spotlight kartlar, 3D tilt
 *    · Kelime maskeli başlıklar, görsel açılışları, paralaks
 *    · Nav pill + scrollspy, otomatik gizlenen nav, scroll progress
 *    · Scroll hızına tepki veren marquee
 *    · Hero WebGL "erimiş topografya" shader'ı (yalnızca index)
 *  Tek bir requestAnimationFrame döngüsü; görünmeyen işler durur.
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var lang = function () { return (root.lang === 'tr' || localStorage.getItem('mt_lang') === 'tr') ? 'tr' : 'en'; };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ─────────────────────────────────────────
     1 · PRELOADER + SAYFA GEÇİŞİ
     ───────────────────────────────────────── */
  var pre = $('#preloader');
  var quick = root.classList.contains('pl-quick');
  var readyFired = false;

  function markReady() {
    if (readyFired) return;
    readyFired = true;
    try { sessionStorage.setItem('mt_seen', '1'); } catch (e) {}
    root.classList.add('is-ready');
    document.dispatchEvent(new CustomEvent('mt:ready'));
  }

  if (pre) {
    var fill = $('.pl-fill', pre), num = $('.pl-num', pre);
    var t0 = performance.now();
    var minDur = quick || reduced ? 120 : 1100;
    var loaded = document.readyState === 'complete';
    window.addEventListener('load', function () { loaded = true; });
    var shown = 0;
    (function tick(now) {
      var k = clamp((now - t0) / minDur, 0, 1);
      var target = loaded ? k : Math.min(k, 0.88);
      shown = lerp(shown, target, quick ? 1 : 0.14);
      if (target === 1 && shown > 0.995) shown = 1;
      var eased = 1 - Math.pow(1 - shown, 2);
      if (fill) fill.style.setProperty('--p', eased.toFixed(4));
      if (num) num.textContent = Math.round(eased * 100);
      if (shown >= 1) { setTimeout(markReady, quick ? 0 : 180); return; }
      requestAnimationFrame(tick);
    })(t0);
    setTimeout(markReady, 4500); // emniyet
  } else {
    markReady();
  }

  // Sayfa içi .html linklerinde perde iner, sonra gidilir
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return; // aynı sayfa anchor
    if (!/\.html?$|\/$/.test(url.pathname)) return;
    if (reduced || !pre) return;
    e.preventDefault();
    root.classList.add('is-leaving');
    setTimeout(function () { location.href = url.href; }, 560);
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { root.classList.remove('is-leaving'); markReady(); }
  });

  /* ─────────────────────────────────────────
     2 · SMOOTH SCROLL (Lenis)
     ───────────────────────────────────────── */
  var lenis = null;
  if (fine && !reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.095, wheelMultiplier: 0.95, smoothWheel: true, autoRaf: true });
    // Mobil menü açıkken kaydırmayı kilitle
    new MutationObserver(function () {
      document.body.classList.contains('mob-open') ? lenis.stop() : lenis.start();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  var hasPbar = !!$('#project-bar');
  // Tüm # linklerini tek noktadan yönet (sayfanın kendi handler'larından önce, capture fazında)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    var target = id === '#' ? null : document.querySelector(id);
    if (id !== '#' && !target) return;
    e.preventDefault();
    e.stopPropagation();
    var offset = hasPbar ? -(72 + 52 + 8) : 0;
    if (lenis) {
      lenis.scrollTo(target || 0, { offset: target ? offset : 0, duration: 1.4, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    } else {
      var top = target ? target.getBoundingClientRect().top + window.scrollY + offset : 0;
      window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
    }
  }, true);

  /* ─────────────────────────────────────────
     3 · İMLEÇ
     ───────────────────────────────────────── */
  var cur = { x: -100, y: -100, rx: -100, ry: -100, on: false };
  var dot, ring, hand;
  // Özel işaret eli — parmak ucu (11,3) imlecin tam noktasıdır
  var HAND_SVG = '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">' +
    '<defs><linearGradient id="pcHandG" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#fffaf1"/><stop offset="1" stop-color="#e9dcc6"/></linearGradient></defs>' +
    '<path class="pc-hand-body" d="M6 4A2 2 0 0 1 10 4V9.5A2 2 0 0 1 14 9.5V10.5A2 2 0 0 1 18 10.5V11.5A2 2 0 0 1 22 11.5V14A8 8 0 0 1 14 22H12C9.2 22 7.5 21.1 6 19.7L2.6 16.3A2 2 0 0 1 5.4 13.5L6 14.1Z"/>' +
    '<path class="pc-hand-line" d="M10 9.5V12.6M14 10.5V13M18 11.5V13.4"/>' +
    '<circle class="pc-hand-tip" cx="8" cy="3.6" r="1.05"/>' +
    '</svg>';
  if (fine && !reduced) {
    var pc = document.createElement('div');
    pc.className = 'pc';
    pc.setAttribute('aria-hidden', 'true');
    pc.innerHTML = '<div class="pc-ring"></div><div class="pc-dot"></div><div class="pc-hand"><div class="pc-hand-in">' + HAND_SVG + '</div></div>';
    document.body.appendChild(pc);
    dot = $('.pc-dot', pc); ring = $('.pc-ring', pc); hand = $('.pc-hand', pc);
    root.classList.add('has-pc');

    var HOVER = 'a, button, [role="button"], .lang-btn, label, .tech-item, .highlight-item, .contact-link-item';
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      cur.x = e.clientX; cur.y = e.clientY;
      if (!cur.on) { cur.on = true; cur.rx = cur.x; cur.ry = cur.y; root.classList.add('cur-on'); }
      var t = e.target;
      var onHand = !!(t.closest && t.closest('[data-cursor="hand"]'));
      var txt = t.closest && t.closest('input, textarea, select');
      root.classList.toggle('cur-text', !!txt);
      root.classList.toggle('cur-hand', onHand);
      root.classList.toggle('cur-hover', !onHand && !!(t.closest && t.closest(HOVER)));
    }, { passive: true });
    document.addEventListener('pointerdown', function () { root.classList.add('cur-down'); });
    document.addEventListener('pointerup', function () { root.classList.remove('cur-down'); });
    document.documentElement.addEventListener('mouseleave', function () { cur.on = false; root.classList.remove('cur-on'); });
  }

  /* ─────────────────────────────────────────
     3b · BUTONLAR: sondaki ok ikonu + yuvarlanan etiket
     ───────────────────────────────────────── */
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8.5 7H17v8.5"/></svg>';
  $$('.btn-primary, .btn-secondary').forEach(function (btn) {
    if (btn.__enh) return; btn.__enh = true;
    var lead = btn.querySelector(':scope > svg'); if (lead) lead.remove();
    var lab = btn.querySelector(':scope > span');
    if (!lab) {
      lab = document.createElement('span');
      Array.prototype.slice.call(btn.childNodes).forEach(function (n) { if (n.nodeType === 3) lab.appendChild(n); });
      btn.appendChild(lab);
    }
    var roll = document.createElement('span'); roll.className = 'btn-roll';
    btn.insertBefore(roll, lab); roll.appendChild(lab);
    if (btn.classList.contains('btn-primary')) {
      var ico = document.createElement('span'); ico.className = 'btn-ico'; ico.setAttribute('aria-hidden', 'true');
      ico.innerHTML = ARROW + ARROW;
      btn.appendChild(ico);
    }
  });
  // Dolgu, imlecin butona girdiği noktadan yayılsın
  $$('.btn-primary, .btn-secondary, .form-submit').forEach(function (btn) {
    btn.addEventListener('pointerenter', function (e) {
      var r = btn.getBoundingClientRect();
      btn.style.setProperty('--fx', clamp((e.clientX - r.left) / r.width * 100, 0, 100).toFixed(0) + '%');
    });
  });

  /* ─────────────────────────────────────────
     4 · MAGNETIC
     ───────────────────────────────────────── */
  if (fine && !reduced) {
    $$('.btn-primary, .btn-secondary, .nav-cta, .social-btn, #btt, .form-submit, .mob-social-btn').forEach(function (el) {
      el.setAttribute('data-magnetic', '');
      var strength = el.classList.contains('social-btn') || el.id === 'btt' ? 0.45 : 0.28;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate3d(' + (dx * strength).toFixed(1) + 'px,' + (dy * strength * 1.2).toFixed(1) + 'px,0)';
        Array.prototype.forEach.call(el.children, function (c) {
          c.style.transform = 'translate3d(' + (dx * strength * 0.35).toFixed(1) + 'px,' + (dy * strength * 0.35).toFixed(1) + 'px,0)';
        });
      });
      el.addEventListener('pointerleave', function () {
        el.style.transform = '';
        Array.prototype.forEach.call(el.children, function (c) { c.style.transform = ''; });
      });
    });
  }

  /* ─────────────────────────────────────────
     5 · SPOTLIGHT + TILT
     ───────────────────────────────────────── */
  var SPOT = '.project-card, .highlight-item, .tech-item, .disc, .contact-form, .contact-link-item, .stat-card, .cs-card, .result-card, .next-card, .about-card-main';
  $$(SPOT).forEach(function (el) {
    el.classList.add('spot');
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  });
  if (fine) {
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('.spot');
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
    }, { passive: true });

    if (!reduced) {
      $$('.project-card').forEach(function (card) {
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = 'perspective(1100px) rotateY(' + (x * 5).toFixed(2) + 'deg) rotateX(' + (-y * 5).toFixed(2) + 'deg) translate3d(0,-6px,0)';
        });
        card.addEventListener('pointerleave', function () { card.style.transform = ''; });
      });
    }
    // hero tacı fareye doğru hafifçe döner
    var crown = $('.crown-tilt');
    if (crown && !reduced) window.addEventListener('pointermove', function (e) {
      var x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
      crown.style.setProperty('--ry', (x * 16).toFixed(2) + 'deg');
      crown.style.setProperty('--rx', (-y * 12).toFixed(2) + 'deg');
    }, { passive: true });
    // footer wordmark imleci takip eder
    var fm = $('.footer-mark');
    if (fm) fm.parentElement.addEventListener('pointermove', function (e) {
      var r = fm.getBoundingClientRect();
      fm.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      fm.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
    }, { passive: true });
  }

  // Proje kartının tamamı projeye götürsün; üzerindeyken imleç işaret eline dönüşür
  $$('.project-card').forEach(function (card) {
    var link = $('.project-link', card);
    if (!link) return;
    card.setAttribute('data-cursor', 'hand');
    card.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      link.click();
    });
  });
  $$('.next-card').forEach(function (c) { c.setAttribute('data-cursor', 'hand'); });

  /* ─────────────────────────────────────────
     6 · KELİME MASKELİ BAŞLIKLAR
     ───────────────────────────────────────── */
  function splitWords(el) {
    if (el.__splitHTML === el.innerHTML) return;
    var i = 0;
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          frag.appendChild(wrap(document.createTextNode(part), i++));
        });
      } else if (node.nodeType === 1 && node.tagName !== 'BR') {
        frag.appendChild(wrap(node, i++));
      } else {
        frag.appendChild(node);
      }
    });
    el.innerHTML = '';
    el.appendChild(frag);
    el.classList.add('split');
    el.__splitHTML = el.innerHTML;
  }
  function wrap(node, i) {
    // Özel etiketler: sayfaların ".cta-title span" gibi kurallarına takılmasın
    var w = document.createElement('mt-w');
    var inner = document.createElement('mt-wi');
    inner.style.setProperty('--i', i);
    inner.appendChild(node); w.appendChild(inner);
    return w;
  }
  var TITLES = '.section-title, .contact-info-title, .cta-title';
  var splitIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); splitIO.unobserve(en.target); }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  function initTitles() {
    $$(TITLES).forEach(function (el) {
      if (el.closest('#hero')) return;
      el.classList.remove('reveal');
      el.style.opacity = '1';
      splitWords(el);
      if (!el.classList.contains('in')) splitIO.observe(el);
    });
  }
  if (!reduced) initTitles();
  // Dil değişince i18n içerikleri yeniden yazar → yeniden böl
  $$('.lang-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      requestAnimationFrame(function () {
        if (!reduced) initTitles();
        splitHero();
        document.dispatchEvent(new CustomEvent('mt:lang'));
      });
    });
  });

  /* Hero başlığı: satır satır maske */
  function splitHero() {
    var h = $('#hero h1.hero-title[data-i18n-html]');
    if (!h || h.__lines === h.innerHTML) return;
    var lines = [], buf = [];
    Array.prototype.slice.call(h.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && n.textContent.trim()) lines.push(document.createTextNode(n.textContent.trim()));
      else if (n.nodeType === 1) lines.push(n);
    });
    h.innerHTML = '';
    lines.forEach(function (n, i) {
      var l = document.createElement('span'); l.className = 'ln';
      var li = document.createElement('span'); li.className = 'ln-i'; li.style.setProperty('--i', i);
      li.appendChild(n); l.appendChild(li); h.appendChild(l);
    });
    h.__lines = h.innerHTML;
  }
  splitHero();

  /* ─────────────────────────────────────────
     6b · PROJE SAYFASI HERO: parçacık logo + renk tozu
     Logo binlerce parçacığa bölünür; açılışta dağınık halden toplanır,
     fare yaklaşınca savrulur ve yayla yerine döner. Arkada logonun
     renklerinde ince bir toz bulutu süzülür.
     ───────────────────────────────────────── */
  (function projectHeroParticles() {
    var hero = $('#hero'), art = hero && $('.hero-art', hero);
    if (!hero || !art) return;

    var aura = document.createElement('div');
    aura.className = 'hero-aura'; aura.setAttribute('aria-hidden', 'true');
    hero.insertBefore(aura, art);
    if (reduced) return;

    var logo = $('#heroLogoImg');
    var cv = document.createElement('canvas');
    cv.className = 'hero-ptl'; cv.setAttribute('aria-hidden', 'true');
    hero.appendChild(cv);
    var ctx = cv.getContext('2d');
    if (!ctx) return;

    var cs = getComputedStyle(hero);
    var P1 = (cs.getPropertyValue('--p1') || '255,128,0').trim(), P2 = (cs.getPropertyValue('--p2') || '232,192,122').trim();

    var W = 0, H = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // Fare (hero koordinatlarında) + hızı
    var m = { x: -9999, y: -9999, vx: 0, vy: 0, on: false, lx: 0, ly: 0 };
    window.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (m.on) { m.vx = x - m.lx; m.vy = y - m.ly; }
      m.lx = x; m.ly = y; m.x = x; m.y = y; m.on = true;
      kick();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { m.on = false; m.x = m.y = -9999; });
    window.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') { m.on = false; m.x = m.y = -9999; } });

    // ── Toz ──
    var dust = [];
    var dustN = window.innerWidth < 768 ? 55 : 110;
    for (var i = 0; i < dustN; i++) {
      dust.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0,
        s: 0.8 + Math.random() * 1.8, a: 0.15 + Math.random() * 0.4,
        c: Math.random() < 0.6 ? P1 : P2, sp: 0.08 + Math.random() * 0.25, ph: Math.random() * 6.28 });
    }

    // ── Logo parçacıkları ──
    var parts = [], buckets = {}, bucketKeys = [], cols = 1, ready = false, born = 0;
    function buildLogo() {
      if (!logo || !logo.naturalWidth) return;
      var nw = logo.naturalWidth, nh = logo.naturalHeight;
      var off = document.createElement('canvas'), oc = off.getContext('2d', { willReadFrequently: true });
      function sample(cw) {
        var ch = Math.max(1, Math.round(cw * nh / nw));
        off.width = cw; off.height = ch;
        oc.clearRect(0, 0, cw, ch); oc.drawImage(logo, 0, 0, cw, ch);
        return { w: cw, h: ch, d: oc.getImageData(0, 0, cw, ch).data };
      }
      var s;
      try {
        s = sample(160);
        var cnt = 0; for (var k = 3; k < s.d.length; k += 4) if (s.d[k] > 150) cnt++;
        var target = window.innerWidth < 1200 ? 3400 : 5200;
        var cw = Math.max(60, Math.min(360, Math.round(160 * Math.sqrt(target / Math.max(1, cnt)))));
        s = sample(cw);
      } catch (err) { return; } // file:// → görsel "tainted"; normal logo kalır
      cols = s.w;
      for (var y = 0; y < s.h; y++) for (var x = 0; x < s.w; x++) {
        var o = (y * s.w + x) * 4;
        if (s.d[o + 3] < 150) continue;
        var r = s.d[o], g = s.d[o + 1], b = s.d[o + 2];
        var key = (r >> 4) + ',' + (g >> 4) + ',' + (b >> 4);
        if (!buckets[key]) { buckets[key] = { c: 'rgb(' + ((r >> 4) * 17) + ',' + ((g >> 4) * 17) + ',' + ((b >> 4) * 17) + ')', p: [] }; bucketKeys.push(key); }
        var p = { hx: (x + 0.5) / s.w, hy: (y + 0.5) / s.h,
          x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0,
          d: (x / s.w) * 0.55 + Math.random() * 0.35, ph: Math.random() * 6.28 };
        parts.push(p); buckets[key].p.push(p);
      }
      if (!parts.length) return;
      ready = true;
      hero.classList.add('ptl-on');
    }
    function logoRect() {
      if (!logo) return null;
      var r = logo.getBoundingClientRect(); if (!r.width) return null;
      var hr = hero.getBoundingClientRect();
      var nw = logo.naturalWidth, nh = logo.naturalHeight;
      var sc = Math.min(r.width / nw, r.height / nh);
      var dw = nw * sc, dh = nh * sc;
      return { x: r.left - hr.left + (r.width - dw) / 2, y: r.top - hr.top + (r.height - dh) / 2, w: dw, h: dh };
    }

    var visible = true, running = false, last = 0;
    var R = 120, R2 = R * R;
    function frame(now) {
      if (!visible || document.hidden) { running = false; return; }
      var dt = last ? Math.min((now - last) / 16.67, 2.5) : 1; last = now;
      var t = now / 1000;
      ctx.clearRect(0, 0, W, H);
      var mx = m.x, my = m.y, mvx = m.vx, mvy = m.vy;
      m.vx *= 0.8; m.vy *= 0.8;

      // toz
      for (var i = 0; i < dust.length; i++) {
        var q = dust[i];
        q.vy += (-q.sp * 0.02) * dt; q.vx += Math.sin(t * 0.6 + q.ph) * 0.004 * dt;
        var dx = q.x - mx, dy = q.y - my, d2 = dx * dx + dy * dy;
        if (d2 < R2 * 1.6) { var dd = Math.sqrt(d2) || 1, f = 1 - dd / (R * 1.26); q.vx += dx / dd * f * 0.9 * dt + mvx * f * 0.02; q.vy += dy / dd * f * 0.9 * dt + mvy * f * 0.02; }
        q.vx *= Math.pow(0.94, dt); q.vy *= Math.pow(0.94, dt);
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.y < -10) { q.y = H + 10; q.x = Math.random() * W; }
        if (q.x < -10) q.x = W + 10; else if (q.x > W + 10) q.x = -10;
        ctx.fillStyle = 'rgba(' + q.c + ',' + q.a.toFixed(2) + ')';
        ctx.fillRect(q.x, q.y, q.s, q.s);
      }

      // logo
      var rect = ready && logoRect();
      if (rect) {
        var age = root.classList.contains('is-ready') ? (now - (born || (born = now))) / 1000 : 0;
        var cell = rect.w / cols, rad = Math.max(0.75, cell * 0.36);
        var spring = 0.05, damp = Math.pow(0.84, dt);
        for (var b = 0; b < bucketKeys.length; b++) {
          var bk = buckets[bucketKeys[b]];
          ctx.fillStyle = bk.c;
          ctx.beginPath();
          var arr = bk.p;
          for (var j = 0; j < arr.length; j++) {
            var p = arr[j];
            var tx = rect.x + p.hx * rect.w + Math.sin(t * 1.3 + p.ph) * 0.35;
            var ty = rect.y + p.hy * rect.h + Math.cos(t * 1.1 + p.ph) * 0.35;
            var k2 = age > p.d ? spring : 0.0;
            var ax = (tx - p.x) * k2, ay = (ty - p.y) * k2;
            var ex = p.x - mx, ey = p.y - my, e2 = ex * ex + ey * ey;
            if (e2 < R2) {
              var ed = Math.sqrt(e2) || 1, ff = 1 - ed / R; ff *= ff;
              ax += ex / ed * ff * 9 + mvx * ff * 0.35;
              ay += ey / ed * ff * 9 + mvy * ff * 0.35;
            }
            p.vx = (p.vx + ax * dt) * damp; p.vy = (p.vy + ay * dt) * damp;
            p.x += p.vx * dt; p.y += p.vy * dt;
            ctx.moveTo(p.x + rad, p.y);
            ctx.arc(p.x, p.y, rad, 0, 6.2832);
          }
          ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    }
    function kick() { if (!running && visible && !document.hidden) { running = true; last = 0; requestAnimationFrame(frame); } }
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; kick(); }).observe(hero);
    document.addEventListener('visibilitychange', kick);

    function start() { buildLogo(); kick(); }
    if (logo && !logo.complete) logo.addEventListener('load', start, { once: true });
    else start();
  })();

  /* ─────────────────────────────────────────
     6c · GÖRSEL SERGİ + TAM EKRAN GÖRÜNTÜLEYİCİ
     ───────────────────────────────────────── */
  (function gallery() {
    var gal = $('#gallery'); if (!gal || !$('.gx-shot', gal)) return;
    var heroEl = $('#hero');
    if (heroEl) { // proje renklerini sayfa geneline taşı (sahne ışığı için)
      var hcs = getComputedStyle(heroEl);
      root.style.setProperty('--p1', hcs.getPropertyValue('--p1').trim());
      root.style.setProperty('--p2', hcs.getPropertyValue('--p2').trim());
    }
    var stage = $('.gx-stage', gal);
    if (reduced) stage.classList.add('in');
    else new IntersectionObserver(function (en, obs) {
      if (en[0].isIntersecting) { stage.classList.add('in'); obs.disconnect(); }
    }, { threshold: 0.2 }).observe(stage);

    var shots = {};
    $$('.gx-shot', gal).forEach(function (s) { shots[s.getAttribute('data-lb')] = s; });
    var items = {};
    $$('.gx-item', gal).forEach(function (it) {
      var k = it.getAttribute('data-lb'); items[k] = it;
      it.addEventListener('pointerenter', function () { shots[k] && shots[k].classList.add('is-hl'); });
      it.addEventListener('pointerleave', function () { shots[k] && shots[k].classList.remove('is-hl'); });
      it.addEventListener('click', function () { open(+k, shots[k]); });
    });
    var order = Object.keys(shots).map(Number).sort();

    // ── Görüntüleyici ──
    var L = { tr: { close: 'Kapat', prev: 'Önceki', next: 'Sonraki' }, en: { close: 'Close', prev: 'Previous', next: 'Next' } };
    var lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-hidden', 'true');
    var chev = function (dir) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (dir < 0 ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6') + '"/></svg>'; };
    lb.innerHTML =
      '<div class="lb-top"><span class="lb-count"></span><button type="button" class="lb-btn lb-close"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
      '<div class="lb-stage"><button type="button" class="lb-btn lb-prev">' + chev(-1) + '</button><img class="lb-img" alt=""><button type="button" class="lb-btn lb-next">' + chev(1) + '</button></div>' +
      '<div class="lb-bottom"><p class="lb-cap"><span class="lb-cap-d"></span><strong class="lb-cap-n"></strong></p></div>';
    document.body.appendChild(lb);
    var img = $('.lb-img', lb), cnt = $('.lb-count', lb), capD = $('.lb-cap-d', lb), capN = $('.lb-cap-n', lb);
    var bClose = $('.lb-close', lb), bPrev = $('.lb-prev', lb), bNext = $('.lb-next', lb);
    var cur = -1, lastFocus = null;

    function labels() {
      var t = L[lang()];
      bClose.setAttribute('aria-label', t.close); bPrev.setAttribute('aria-label', t.prev); bNext.setAttribute('aria-label', t.next);
    }
    function fill(i) {
      var s = shots[i], si = $('img', s), it = items[i];
      img.src = si.getAttribute('src'); img.alt = si.alt;
      capD.textContent = it ? $('.gx-item-d', it).textContent : '';
      capN.textContent = it ? $('.gx-item-n', it).textContent : si.alt;
      cnt.textContent = (order.indexOf(i) + 1) + ' / ' + order.length;
      lb.setAttribute('aria-label', capN.textContent);
    }
    // FLIP: küçük görselin yerinden büyüyerek açıl
    function flipFrom(el) {
      if (reduced || !el) return;
      var from = $('.gx-screen', el).getBoundingClientRect(), to = img.getBoundingClientRect();
      if (!to.width) return;
      img.style.transition = 'none';
      img.style.transform = 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + (from.width / to.width) + ',' + (from.height / to.height) + ')';
      img.getBoundingClientRect();
      requestAnimationFrame(function () {
        img.style.transition = 'transform .75s cubic-bezier(.16,1,.3,1)';
        img.style.transform = 'none';
      });
    }
    function open(i, el) {
      lastFocus = document.activeElement;
      root.classList.remove('cur-hand');
      cur = i; labels(); fill(i);
      lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
      if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
      var go = function () { flipFrom(el); bClose.focus({ preventScroll: true }); };
      if (img.complete && img.naturalWidth) go(); else img.onload = function () { img.onload = null; go(); };
    }
    function close() {
      if (cur < 0) return;
      var el = shots[cur];
      if (!reduced && el) {
        var to = $('.gx-screen', el).getBoundingClientRect(), from = img.getBoundingClientRect();
        img.style.transition = 'transform .55s cubic-bezier(.65,0,.35,1)';
        img.style.transform = 'translate(' + (to.left - from.left) + 'px,' + (to.top - from.top) + 'px) scale(' + (to.width / from.width) + ',' + (to.height / from.height) + ')';
      }
      lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true');
      if (lenis) lenis.start(); else document.body.style.overflow = '';
      setTimeout(function () { img.style.transition = 'none'; img.style.transform = ''; }, 600);
      cur = -1;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    function step(dir) {
      if (cur < 0) return;
      var n = order[(order.indexOf(cur) + dir + order.length) % order.length];
      img.classList.add('is-swap'); img.style.opacity = '0'; img.style.transform = 'translateX(' + (dir * 24) + 'px)';
      setTimeout(function () {
        cur = n; fill(n);
        img.style.transition = 'none'; img.style.transform = 'translateX(' + (-dir * 24) + 'px)';
        var show = function () {
          requestAnimationFrame(function () {
            img.style.transition = ''; img.style.opacity = '1'; img.style.transform = 'none';
          });
        };
        if (img.complete && img.naturalWidth) show(); else img.onload = function () { img.onload = null; show(); };
      }, 220);
    }
    $$('.gx-shot', gal).forEach(function (s) {
      var k = +s.getAttribute('data-lb');
      s.addEventListener('click', function () { open(k, s); });
      s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(k, s); } });
    });
    bClose.addEventListener('click', close);
    bPrev.addEventListener('click', function () { step(-1); });
    bNext.addEventListener('click', function () { step(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-stage')) close(); });
    document.addEventListener('keydown', function (e) {
      if (cur < 0) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Tab') { // odağı görüntüleyicide tut
        var f = [bClose, bPrev, bNext], i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
    // Mobil: kaydırarak geçiş
    var sx = null;
    lb.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    lb.addEventListener('pointerup', function (e) { if (sx !== null && Math.abs(e.clientX - sx) > 50) step(e.clientX < sx ? 1 : -1); sx = null; });
  })();

  /* ─────────────────────────────────────────
     7 · GÖRSEL AÇILIŞLARI + COUNTERS etc.
     ───────────────────────────────────────── */
  if (!reduced) {
    // Not: clip-path'li öğenin kendisi IO'da "görünmez" sayılır → ebeveyni izlenir
    var imgIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.__revealKid.classList.add('in'); imgIO.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    $$('.project-img, .browser-screen, .phone-screen, .about-card-main').forEach(function (el) {
      el.classList.add('img-reveal');
      el.parentElement.__revealKid = el;
      imgIO.observe(el.parentElement);
    });
  }

  /* ─────────────────────────────────────────
     8 · NAV: pill + scrollspy + gizlenme
     ───────────────────────────────────────── */
  var nav = $('#navbar');
  var navList = $('.nav-links');
  var pill = null, activeLink = null;
  if (navList && fine) {
    pill = document.createElement('span');
    pill.className = 'nav-pill';
    navList.appendChild(pill);
    var links = $$('a:not(.nav-cta)', navList);
    var movePill = function (a) {
      if (!a) { pill.style.opacity = '0'; return; }
      var lr = navList.getBoundingClientRect(), ar = a.getBoundingClientRect();
      pill.style.width = ar.width + 'px';
      pill.style.transform = 'translateX(' + (ar.left - lr.left) + 'px)';
      pill.style.opacity = '1';
    };
    links.forEach(function (a) {
      a.addEventListener('pointerenter', function () { movePill(a); });
    });
    navList.addEventListener('pointerleave', function () { movePill(activeLink); });
    // scrollspy (yalnızca aynı sayfadaki bölümler)
    var map = {};
    links.forEach(function (a) {
      var h = a.getAttribute('href') || '';
      if (h.charAt(0) === '#' && h.length > 1) { var s = document.querySelector(h); if (s) map[h.slice(1)] = a; }
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          if (activeLink) activeLink.classList.remove('active');
          activeLink = map[en.target.id];
          activeLink.classList.add('active');
          if (!navList.matches(':hover')) movePill(activeLink);
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { spy.observe(document.getElementById(id)); });
    var heroEl = $('#hero');
    if (heroEl) new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && activeLink) { activeLink.classList.remove('active'); activeLink = null; movePill(null); }
    }, { threshold: 0.6 }).observe(heroEl);
    document.addEventListener('mt:lang', function () { movePill(activeLink); });
    window.addEventListener('resize', function () { movePill(activeLink); });
  }

  // Footer görünürken "başa dön" butonu sosyal ikonların üstüne binmesin
  var btt = $('#btt'), foot = $('footer');
  if (btt && foot) new IntersectionObserver(function (en) {
    btt.classList.toggle('at-footer', en[0].isIntersecting);
  }, { rootMargin: '0px 0px -40px 0px' }).observe($('.footer-socials') || foot);

  var progress = null;
  if (!hasPbar) {
    progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);
  }

  /* ─────────────────────────────────────────
     9 · MARQUEE (scroll hızına tepki)
     ───────────────────────────────────────── */
  var mq = $('.marquee-track'), mqAnim = null;
  if (mq && mq.getAnimations && !reduced) {
    mqAnim = mq.getAnimations()[0] || null;
  }

  /* ─────────────────────────────────────────
     10 · PARALAKS
     ───────────────────────────────────────── */
  var px = $$('[data-parallax]').map(function (el) {
    return { el: el, k: parseFloat(el.getAttribute('data-parallax')) || 0.1, y: 0 };
  });

  /* ─────────────────────────────────────────
     11 · ANA DÖNGÜ
     ───────────────────────────────────────── */
  var lastY = window.scrollY, vel = 0, mqRate = 1, mqDir = 1, lastNavY = 0;
  function frame() {
    var y = window.scrollY;
    var dy = y - lastY; lastY = y;
    vel = lerp(vel, dy, 0.18);

    // imleç
    if (dot && cur.on) {
      cur.rx = lerp(cur.rx, cur.x, 0.2);
      cur.ry = lerp(cur.ry, cur.y, 0.2);
      dot.style.transform = 'translate3d(' + cur.x + 'px,' + cur.y + 'px,0)';
      hand.style.transform = 'translate3d(' + cur.x + 'px,' + cur.y + 'px,0)';
      ring.style.transform = 'translate3d(' + cur.rx.toFixed(1) + 'px,' + cur.ry.toFixed(1) + 'px,0)';
    }

    // nav
    if (nav) {
      nav.classList.toggle('scrolled', y > 40);
      if (!hasPbar && !document.body.classList.contains('mob-open')) {
        if (y > 320 && y - lastNavY > 6) nav.classList.add('nav-hidden');
        else if (lastNavY - y > 6 || y < 320) nav.classList.remove('nav-hidden');
      }
      if (Math.abs(y - lastNavY) > 6) lastNavY = y;
    }

    // progress
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ')';
    }

    // marquee
    if (mqAnim) {
      if (Math.abs(dy) > 0.5) mqDir = dy > 0 ? 1 : -1;
      var target = mqDir * (1 + Math.min(Math.abs(vel) * 0.35, 6));
      mqRate = lerp(mqRate, target, 0.08);
      mqAnim.playbackRate = mqRate;
    }

    // paralaks (yalnızca görünürken)
    if (!reduced) for (var i = 0; i < px.length; i++) {
      var p = px[i];
      var r = p.el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
      var off = (r.top + r.height / 2 - window.innerHeight / 2) * -p.k;
      p.y = lerp(p.y, off, 0.12);
      p.el.style.setProperty('--py', p.y.toFixed(2) + 'px');
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* Footer wordmark'ı genişliğe sığdır */
  var mark = $('.footer-mark');
  function fitMark() {
    if (!mark) return;
    mark.style.fontSize = '';
    var avail = mark.clientWidth, need = mark.scrollWidth;
    if (need > avail) mark.style.fontSize = (parseFloat(getComputedStyle(mark).fontSize) * avail / need * 0.985).toFixed(1) + 'px';
  }
  if (mark) {
    fitMark();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMark);
    window.addEventListener('resize', fitMark);
  }

  /* ─────────────────────────────────────────
     12 · HERO SHADER (index)
     ───────────────────────────────────────── */
  var cv = $('#hero-gl');
  if (cv) initShader(cv);

  function initShader(canvas) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) { canvas.classList.add('no-gl'); return; }

    var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

    /* İz (trail) shader'ı: fare hızını ve "dağılma" yoğunluğunu düşük çözünürlüklü
       bir dokuda tutar; her karede kendini hafifçe taşır (advection) ve söner. */
    var FS_TRAIL = [
      'precision mediump float;',
      'uniform sampler2D U;uniform vec2 TR;uniform vec2 M;uniform vec2 V;uniform float S;uniform float A;uniform float K;',
      'void main(){',
      ' vec2 uv=gl_FragCoord.xy/TR;',
      ' vec2 v0=texture2D(U,uv).xy*2.-1.;',
      ' vec4 adv=texture2D(U,uv-v0*.018*K);',
      ' vec2 v=adv.xy*2.-1.;',
      ' v=sign(v)*max(abs(v)*pow(.966,K)-.0055,0.);',
      ' float dn=max(adv.z*pow(.981,K)-.004,0.);',
      ' vec2 d=(uv-M)*vec2(A,1.);',
      ' float g=exp(-dot(d,d)/S);',
      ' v=clamp(v+V*g,-1.,1.);',
      ' dn=clamp(dn+g*min(length(V)*2.6,1.),0.,1.);',
      ' gl_FragColor=vec4(v*.5+.5,dn,1.);',
      '}'
    ].join('\n');

    var FS = [
      'precision mediump float;',
      'uniform vec2 R;uniform float T;uniform vec2 F;uniform sampler2D TRL;uniform vec2 TS;',
      'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
      ' return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}',
      'float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(.8,.6,-.6,.8);',
      ' for(int i=0;i<5;i++){v+=a*n(p);p=m*p*2.03;a*=.5;}return v;}',
      'void main(){',
      ' vec2 uv=gl_FragCoord.xy/R; float asp=R.x/R.y;',
      ' vec2 e=2./TS;',
      ' vec4 c0=texture2D(TRL,uv),cx1=texture2D(TRL,uv+vec2(e.x,0.)),cx0=texture2D(TRL,uv-vec2(e.x,0.)),cy1=texture2D(TRL,uv+vec2(0.,e.y)),cy0=texture2D(TRL,uv-vec2(0.,e.y));',
      ' vec4 tr=(c0*2.+cx1+cx0+cy1+cy0)/6.;',          // yumuşatılmış iz
      ' vec2 grad=vec2(cx1.z-cx0.z,cy1.z-cy0.z);',     // izin merkezinden dışarı
      ' vec2 tv=tr.xy*2.-1.; tv=sign(tv)*max(abs(tv)-.012,0.);',
      ' float td=smoothstep(.04,.75,tr.z);',
      ' vec2 p=(uv-.5)*vec2(asp,1.);',
      ' p-=tv*vec2(asp,1.)*.42;',                       // sıvıyı fare yönünde sürükle
      ' p+=grad*vec2(asp,1.)*.5;',                      // ve iki yana it (dağılma)
      ' float t=T*.035;',
      ' vec2 q=vec2(fbm(p*1.3+vec2(0.,t)),fbm(p*1.3+vec2(5.2,1.3)-t));',
      ' vec2 w=vec2(fbm(p*1.1+1.9*q+vec2(1.7,9.2)+t*1.4),fbm(p*1.1+1.9*q+vec2(8.3,2.8)-t));',
      ' w+=tv*1.9;',                                     // girdap
      ' float f=fbm(p*1.05+2.1*w);',
      ' vec2 fp=(F-.5)*vec2(asp,1.);',
      ' float g=exp(-length((p-fp)*vec2(1.,1.25))*2.1);',
      ' g+=.2*exp(-abs(p.y+.55)*3.);',
      ' vec3 bg=vec3(.027,.031,.047);',
      ' vec3 emb=vec3(1.,.42,.04); vec3 gold=vec3(.98,.78,.48); vec3 deep=vec3(.55,.12,.02);',
      ' float heat=smoothstep(.28,.95,f)*g;',
      ' heat*=1.-td*.86;',                               // farenin geçtiği yerde lav dağılır
      ' heat+=clamp(length(grad)*2.4,0.,1.)*(.35+g)*smoothstep(.25,.8,f)*.72;',  // dağılma kenarında sıcak parıltı
      ' vec3 c=bg+deep*heat*.5+emb*pow(heat,1.7)*.62+gold*pow(heat,3.4)*.75;',
      ' float iso=abs(fract(f*9.)-.5);',
      ' float lines=1.-smoothstep(.0,.07,iso);',
      ' c+=mix(vec3(.9,.6,.3),gold,heat)*lines*(.03+.22*g*g)*(1.-td*.8);',
      ' c*=1.-smoothstep(.55,1.15,length((uv-vec2(.62,.5))*vec2(1.,.9)));',
      ' c=mix(c,bg,smoothstep(.25,0.,uv.y));',
      ' c+=(h(gl_FragCoord.xy+T)-.5)*.018;',
      ' gl_FragColor=vec4(c,1.);',
      '}'
    ].join('\n');

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    function prog(fsSrc) {
      var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, fsSrc);
      if (!v || !f) return null;
      var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f);
      gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr);
      return gl.getProgramParameter(pr, gl.LINK_STATUS) ? pr : null;
    }
    var pMain = prog(FS), pTrail = prog(FS_TRAIL);
    if (!pMain || !pTrail) { canvas.classList.add('no-gl'); return; }

    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var u = function (pr, n) { return gl.getUniformLocation(pr, n); };
    var uR = u(pMain, 'R'), uT = u(pMain, 'T'), uF = u(pMain, 'F'), uTRL = u(pMain, 'TRL'), uTS = u(pMain, 'TS');
    var tU = u(pTrail, 'U'), tTR = u(pTrail, 'TR'), tM = u(pTrail, 'M'), tV = u(pTrail, 'V'), tS = u(pTrail, 'S'), tA = u(pTrail, 'A'), tK = u(pTrail, 'K');
    var lastDraw = 0;

    // Ping-pong iz dokuları (RGBA8 – her cihazda desteklenir)
    var trailW = 0, trailH = 0, texA, texB, fbA, fbB;
    function makeTarget(w, h) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var init = new Uint8Array(w * h * 4);
      for (var k = 0; k < init.length; k += 4) { init[k] = 128; init[k + 1] = 128; init[k + 2] = 0; init[k + 3] = 255; }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, init);
      var fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return ok ? { t: t, fb: fb } : null;
    }
    function setupTrail() {
      var aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      var w = 240, h = Math.max(60, Math.round(240 / aspect));
      if (w === trailW && h === trailH) return true;
      var a = makeTarget(w, h), b = makeTarget(w, h);
      if (!a || !b) return false;
      texA = a.t; fbA = a.fb; texB = b.t; fbB = b.fb; trailW = w; trailH = h;
      return true;
    }

    var scale = window.innerWidth < 768 ? 0.5 : 0.65;
    var focus = [0.74, 0.52];
    var trailOK = true;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr * scale));
      var h = Math.max(1, Math.round(canvas.clientHeight * dpr * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      focus = window.innerWidth < 1024 ? [0.5, 0.32] : [0.74, 0.52];
      trailOK = setupTrail();
    }
    resize();
    window.addEventListener('resize', resize);

    // Fare / dokunma: konum + hız (canvas uv uzayında)
    var ptr = { x: -1, y: -1, px: -1, py: -1, vx: 0, vy: 0, active: false };
    window.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      if (e.clientY > r.bottom + 40) return;
      var x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
      if (!ptr.active) { ptr.px = x; ptr.py = y; ptr.active = true; }
      ptr.x = x; ptr.y = y;
      kick();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { ptr.active = false; });

    var visible = true, running = false, start = performance.now(), tOff = 8;
    function draw(now) {
      // 1) iz geçişi
      if (trailOK) {
        var vx = 0, vy = 0;
        if (ptr.active) {
          vx = (ptr.x - ptr.px) * 9; vy = (ptr.y - ptr.py) * 9;
          var m = Math.sqrt(vx * vx + vy * vy); if (m > 1.2) { vx *= 1.2 / m; vy *= 1.2 / m; }
          ptr.px = lerp(ptr.px, ptr.x, 0.55); ptr.py = lerp(ptr.py, ptr.y, 0.55);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbB);
        gl.viewport(0, 0, trailW, trailH);
        gl.useProgram(pTrail);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA);
        gl.uniform1i(tU, 0);
        gl.uniform2f(tTR, trailW, trailH);
        gl.uniform2f(tM, ptr.active ? ptr.x : -9, ptr.active ? ptr.y : -9);
        gl.uniform2f(tV, vx, vy);
        gl.uniform1f(tS, window.innerWidth < 768 ? 0.016 : 0.0105);
        gl.uniform1f(tA, canvas.clientWidth / Math.max(1, canvas.clientHeight));
        gl.uniform1f(tK, lastDraw ? clamp((now - lastDraw) / 16.67, 0.5, 3) : 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        var tt = texA; texA = texB; texB = tt; var tf = fbA; fbA = fbB; fbB = tf;
      }
      lastDraw = now;
      // 2) lav
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(pMain);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA);
      gl.uniform1i(uTRL, 0);
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, tOff + (now - start) / 1000);
      gl.uniform2f(uF, focus[0], focus[1]);
      gl.uniform2f(uTS, trailW || 1, trailH || 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // Uyarlanabilir kalite: zayıf GPU'da çözünürlüğü düşür, gerekirse sabit kareye geç
    var samples = 0, acc = 0, prev = 0, tier = 0, frozen = false;
    function loop(now) {
      if (!visible || document.hidden || frozen) { running = false; return; }
      draw(now);
      if (prev) {
        acc += now - prev; samples++;
        if (samples === 40) {
          if (acc / samples > 24) {
            tier++;
            if (tier >= 3) {
              // Sabit kareye geçmeden önce izi temizle ki ekranda "delik" kalmasın
              frozen = true; running = false; ptr.active = false;
              trailW = 0; trailOK = setupTrail(); draw(now);
              return;
            }
            scale *= 0.65; resize();
          }
          samples = 0; acc = 0;
        }
      }
      prev = now;
      requestAnimationFrame(loop);
    }
    function kick() { if (!running && visible && !document.hidden && !reduced && !frozen) { running = true; prev = 0; requestAnimationFrame(loop); } }
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; kick(); }).observe(canvas);
    document.addEventListener('visibilitychange', kick);
    draw(performance.now());
    canvas.classList.add('gl-on');
    kick();
  }
})();
