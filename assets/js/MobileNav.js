/**
 * ═══════════════════════════════════════════════════════════════
 *  mobile-nav.js  —  Metehan Tabak Portfolio · Mobil Menü
 * ═══════════════════════════════════════════════════════════════
 *
 *  KURULUM
 *  -------
 *  </body> kapanış etiketinden önce ekle:
 *    <script src="mobile-nav.js"></script>
 *
 *  GEREKLI HTML ELEMANLARI (ID'ler sabit kalmalı)
 *  -----------------------------------------------
 *    id="hamburger"    → Menüyü açan buton (navbar içinde)
 *    id="mobile-nav"   → Sağdan kayan panel
 *    id="mobile-close" → Panel içindeki kapat butonu
 *    id="mob-overlay"  → Arka plan karartma katmanı
 *    .mobile-link      → Paneldeki her nav linki (tıklayınca kapanır)
 *
 *  KLAVYE
 *  ------
 *    Escape → Menüyü kapatır
 *
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /* ── Element referansları ── */
  const hamburger  = document.getElementById('hamburger');
  const mobileNav  = document.getElementById('mobile-nav');
  const closeBtn   = document.getElementById('mobile-close');
  const overlay    = document.getElementById('mob-overlay');

  /* Herhangi bir element eksikse script sessizce durur */
  if (!hamburger || !mobileNav || !closeBtn || !overlay) {
    console.warn('[mobile-nav.js] Gerekli HTML elemanları bulunamadı.');
    return;
  }

  /* ── Aç ── */
  function openNav() {
    mobileNav.classList.add('open');
    overlay.classList.add('open');
    hamburger.classList.add('active');
    document.body.classList.add('mob-open');
    document.body.style.overflow = 'hidden';   /* Arka plan scroll kilitlenir */
    hamburger.setAttribute('aria-expanded', 'true');
  }

  /* ── Kapat ── */
  function closeNav() {
    mobileNav.classList.remove('open');
    overlay.classList.remove('open');
    hamburger.classList.remove('active');
    document.body.classList.remove('mob-open');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
  }

  /* ── Toggle (hamburger tekrar tıklanınca) ── */
  function toggleNav() {
    mobileNav.classList.contains('open') ? closeNav() : openNav();
  }

  /* ── Olay dinleyicileri ── */
  hamburger.addEventListener('click', toggleNav);
  closeBtn.addEventListener('click', closeNav);
  overlay.addEventListener('click', closeNav);

  /* Paneldeki linklere tıklanınca kapat */
  document.querySelectorAll('.mobile-link').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  /* Escape tuşu */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

})();