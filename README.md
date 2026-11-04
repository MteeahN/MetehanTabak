# metehantabak.github.io
## Premium katman (2026-11)

Tüm sayfalar ortak iki dosyayı kullanır; sayfa içi stiller korunur, bu dosyalar onların üstüne yazar:

- `assets/css/premium.css` — self-host Syne + DM Sans (Türkçe karakter destekli), imleç, preloader / sayfa geçişi, grain, spotlight kartlar, magnetic butonlar, başlık maskeleri, footer wordmark, focus ve reduced-motion.
- `assets/js/premium.js` — Lenis smooth scroll, imleç, magnetic/spotlight/tilt, kelime maskeli başlıklar, görsel açılışları, nav pill + scrollspy, scroll hızına tepki veren marquee, index hero WebGL shader'ı (zayıf GPU'da kaliteyi kendisi düşürür).
- `assets/css/home.css` — yalnızca `index.html`'e özel hero, marquee, hakkımda, proje ve iletişim düzenlemeleri.

Hero'daki lav fareyle dağılır (düşük çözünürlüklü bir iz dokusu fare hızını tutar, lav bu izin iki yanına itilir ve ~2.5 sn'de toparlanır). Taç ve preloader tacı gömülü SVG'dir; site dosyadan (`file://`) açılsa da görünür. Proje kartlarının üzerinde imleç özel bir işaret eline dönüşür (`data-cursor="hand"`).

Proje sayfalarının hero'sunda logo binlerce parçacıktan oluşur: açılışta toplanır, fare yaklaşınca savrulur ve yerine döner; arkada logonun renklerinde bir toz bulutu ve iki ışık hâlesi vardır. Renkler `<section id="hero" style="--p1:R,G,B;--p2:R,G,B">` ile ayarlanır. Site dosyadan (`file://`) açılırsa tarayıcı görseli parçacığa çevirmeye izin vermez; o durumda normal logo görünür.

Görseller `assets/img/*.webp` olarak optimize edildi (~15.8 MB → ~1 MB); kullanılmayan eski `.png` dosyaları kaldırıldı.

Yeni bir sayfa eklerken `</style>` sonrasına `premium.css`'i, `</body>` öncesine `assets/vendor/lenis/lenis.min.js` ve `assets/js/premium.js` (ikisi de `defer`) eklemen yeterli.

Proje sayfalarındaki "Görsel Sergi" bölümü `gx-*` sınıflarını kullanır: masaüstü + taşan telefon sahnesi, dizüstü ve ekran listesi. Herhangi bir ekrana (`data-lb`) tıklanınca tam ekran görüntüleyici açılır (oklar, kaydırma, Esc).
