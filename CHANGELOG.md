# Changelog

All notable changes to the **MyShelf** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-10-15

### Added

- **Sistem Auto Updater Lintas Platform (Desktop & Android)**:
  - Pengecekan pembaruan otomatis di latar belakang saat aplikasi pertama kali dibuka (_startup_).
  - Integrasi resmi Tauri v2 Updater untuk Desktop (Linux, Windows, macOS) dengan verifikasi kriptografi Ed25519 dan auto-relaunch.
  - Integrasi GitHub Releases API updater dan auto installer APK via Android Intent/Opener.
  - Pengaturan toggle **Pembaruan Otomatis** (_On / Off_) dengan penyimpanan persisten di menu Pengaturan.
  - Tombol manual **"Periksa Pembaruan Sekarang"** di halaman Pengaturan dengan indikator status.
  - Dialog modal pembaruan (`UpdateDialog`) dengan catatan rilis, progress bar pengunduhan (0% - 100%), dan aksi 1-klik pasang pembaruan.
  - Konfigurasi izin `REQUEST_INSTALL_PACKAGES` dan pembaruan `FileProvider` paths untuk Android.

### Fixed

- **Reader (Touch & Mobile)**: Menonaktifkan zona klik navigasi samping pada perangkat sentuh agar seleksi dan penyalinan teks tidak memicu perpindahan halaman yang tidak disengaja. Navigasi mobile kini mengandalkan _swipe gesture_.
- **Library (Cover Thumbnails di Linux/WebKitGTK)**: Menggunakan helper `useCoverUrl` untuk menormalisasi data Buffer/Blob dan mencegah race condition pencabutan Object URL prematur pada React 19 serta fallback ekstraksi arsip EPUB langsung.
- **UI (Bottom Sheet)**: Menstabilkan tinggi panel lembar bawah (_bottom sheet_) ke `82vh` untuk mencegah lompatan tinggi (_bouncing_) pada pencarian Daftar Isi dan mencegah form pencarian tertutup keyboard virtual Android.
- **Anotasi & Catatan Pribadi**: Memperbaiki pemuatan teks catatan tersimpan dan warna highlight saat diedit melalui `NoteDialogInner` dengan dynamic key serta menambahkan dukungan `background-color` pada CSS highlight.
- **Text To Speech (TTS)**: Memperbaiki bug dimana TTS tidak dapat diputar.

---

## [1.0.0] - 2026-10-15

- Initial release.

[1.1.0]: https://github.com/dhaniaffa/myshelf_epub_reader/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/dhaniaffa/myshelf_epub_reader/releases/tag/v1.0.0
