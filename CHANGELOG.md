# Changelog

All notable changes to the **MyShelf** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0]

### Added (v1.2.0)

- **Pengaturan Khusus PDF**: Deteksi otomatis pengaturan reader sesuai format (PDF/EPUB), pilihan warna latar halaman PDF (terang, gelap, sepia, otomatis), dan preset zoom.
- **Pemilihan Folder Ekspor**: Dialog pemilihan folder native di Desktop dan integrasi Android Storage Access Framework (SAF) tanpa share sheet.
- **Katalog & Branding**: Ikon baru sumber katalog (Project Gutenberg, Standard Ebooks, Open Library) dan logo aplikasi transparan.

### Fixed (v1.2.0)

- **Navigasi Drawer Reader**: Memperbaiki tombol "Cari Teks" yang keliru membuka Daftar Isi serta menambahkan autofocus input pencarian.
- **Seleksi Teks & Selection Bar**: Memperbaiki kemunculan floating toolbar di Android WebView dan Linux desktop saat teks diblok.
- **Anotasi & Catatan**: Memperbaiki kegagalan simpan catatan dan duplikasi sorotan / highlight.
- **Text-to-Speech (TTS)**: Dukungan native speech synthesis di Android dan perbaikan error pemutaran audio di Desktop.
- **UI Responsif Mobile**: Memperbaiki posisi toast notifikasi agar tidak menimpa navigasi bawah dan dropdown menu buku agar tidak terpotong.

---

## [1.1.0] - 2026-10-15

### Added (v1.1.0)

- **Sistem Auto Updater (Desktop & Android)**:
  - Pengecekan pembaruan otomatis di latar belakang saat startup.
  - Integrasi Tauri v2 Updater di Desktop dan GitHub Releases APK updater di Android.
  - Pengaturan toggle pembaruan otomatis dan tombol periksa pembaruan manual.
  - Dialog pembaruan dengan catatan rilis dan progress bar unduhan.

### Fixed (v1.1.0)

- **Navigasi Mobile**: Menonaktifkan klik samping pada layar sentuh agar fokus pada swipe gesture dan seleksi teks.
- **Cover Buku Linux**: Memperbaiki pemuatan cover thumbnail pada WebKitGTK.
- **Bottom Sheet**: Menstabilkan tinggi panel agar tidak bouncing saat keyboard virtual terbuka.
- **Anotasi & Catatan**: Memperbaiki pemuatan catatan tersimpan dan warna highlight saat diedit.
- **TTS**: Memperbaiki kegagalan pemutaran audio.

---

## [1.0.0] - 2026-10-15

- Initial release.

[1.2.0]: https://github.com/dhaniaffa/myshelf_epub_reader/releases#release-v1.2.0
[1.1.0]: https://github.com/dhaniaffa/myshelf_epub_reader/releases#release-v1.1.0
[1.0.0]: https://github.com/dhaniaffa/myshelf_epub_reader/releases#release-v1.0.0
