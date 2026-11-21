# VibeTune Music

Web App/PWA musik online & offline tanpa iklan (PRD v1.0), plus proyek Android untuk membuat APK.

## Menjalankan Web App
```
cd www
python3 -m http.server 8080      # lalu buka http://localhost:8080
```
Service worker/PWA butuh `localhost` atau HTTPS. Di Chrome Android: menu ⋮ → "Pasang aplikasi".

## Membuat APK (Tahap 2)
**Cara 1 — GitHub Actions (tanpa install apa pun):**
1. Upload isi folder ini ke repo GitHub (root repo = folder ini).
2. Tab *Actions* → *Build VibeTune APK* → *Run workflow*.
3. Unduh artifact `VibeTune-release-apk` (APK sudah ditandatangani).

**Cara 2 — Android Studio:** buka folder `android/`, tunggu sync, lalu *Build → Build APK(s)*.
Command line: `cd android && gradle assembleRelease` (butuh JDK 17 + Android SDK 34).

Penandatanganan: set env `VT_KEYSTORE`, `VT_KEYSTORE_PASSWORD`, `VT_KEY_ALIAS`, `VT_KEY_PASSWORD`.
Tanpa itu, workflow membuat keystore baru sekali pakai (untuk update APK yang bisa menimpa versi lama,
simpan keystore sendiri sebagai GitHub Secret `VT_KEYSTORE_B64` dll). **Simpan keystore dengan aman, jangan di-commit.**

## Struktur
- `www/` Web App (HTML/CSS/JS), `catalog.json`, 8 lagu orisinal (`audio/`), ikon, manifest, service worker
- `android/` pembungkus WebView (aset `www/` dipaket lokal; HTTP Range didukung agar seek audio jalan)
- `docs/` screenshot dari aplikasi yang benar-benar dijalankan + `e2e-test.js` + `LAPORAN-PENGUJIAN.md`

## Sumber musik & lisensi
Semua lagu adalah musik orisinal hasil sintesis untuk proyek ini. Lagu "Hujan Sore" sengaja ditandai
*hanya streaming* untuk menguji aturan PRD (tombol download disembunyikan). Ganti/tambah lagu lewat
`www/catalog.json` (isi `license_note`, `streaming_allowed`, `download_allowed`).
