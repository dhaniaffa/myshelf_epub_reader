# 📚 MyShelf — Offline Library & Reader

<div align="center">

![MyShelf Banner](public/icons/icon-192.png)

## Modern and Elegant EPUB Reader

[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2-FFC131?style=for-the-badge&logo=tauri&logoColor=black)](https://v2.tauri.app/)
[![IndexedDB](<https://img.shields.io/badge/Database-IndexedDB_(Dexie)-8A2BE2?style=for-the-badge>)](https://dexie.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

---

</div>

## 📑 Daftar Isi

- [🚀 Panduan Pengembangan & Build](#-panduan-pengembangan--build)
  - [1. 🌐 Website & PWA](#1--website--pwa-web-browser)
  - [2. 💻 Aplikasi Desktop (Tauri v2)](#2--aplikasi-desktop-tauri-v2)
  - [3. 📱 Aplikasi Mobile Android](#3--aplikasi-mobile-android-tauri-v2-mobile)
  - [4. 🧹 Pembersihan Cache Build](#4--tips-pemeliharaan--ukuran-penyimpanan-disk)
- [🗄️ Struktur Database & Penyimpanan](#️-struktur-database--penyimpanan)

---

## 🚀 Panduan Pengembangan & Build

### 1. 🌐 Website & PWA (Web Browser)

#### Prasyarat

- **Node.js ≥ 20** (Direkomendasikan Node.js 22 atau 24).
- Pengelola paket **NPM**.

#### Perintah Pengembangan

```bash
# 1. Pasang dependensi
npm install

# 2. Jalankan server lokal (Vite HMR)
npm run dev
# Akses di: http://localhost:5173

# 3. Pengecekan tipe TypeScript
npm run typecheck
```

#### Membangun Versi Produksi Website & PWA

```bash
# Kompilasi aplikasi web ke direktori dist/
npm run build

# Uji jalankan preview produksi (Service Worker PWA aktif)
npm run preview
# Akses di: http://localhost:4173
```

#### Menjalankan Menggunakan Docker

```bash
# Mode Produksi (Nginx Alpine): http://localhost:8080
docker compose up -d --build

# Mode Pengembangan Interaktif (Vite HMR): http://localhost:5173
docker compose --profile dev up dev
```

---

### 2. 💻 Aplikasi Desktop (Tauri v2)

MyShelf dikompilasi menjadi aplikasi desktop native menggunakan **Tauri v2**.

#### A. Prasyarat Sistem Desktop

- **Rust Toolchain**: Pasang via [rustup.rs](https://rustup.rs/):

  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  source "$HOME/.cargo/env"
  ```

- **Dependensi Sistem Linux (Ubuntu / Debian)**:

  ```bash
  sudo apt update && sudo apt install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl wget file \
    libxdo-dev libssl-dev \
    libayatana-appindicator3-dev librsvg2-dev
  ```

- **Windows**: Pasang [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) dan **WebView2**.
- **macOS**: Jalankan `xcode-select --install`.

#### B. Menjalankan Mode Pengembangan Desktop

```bash
npm run tauri dev
```

> [!TIP]
> **Khusus Pengguna Linux (VS Code via Snap):**
> Jika Anda mengalami kendala bentrok glibc (`undefined symbol: __libc_pthread_init`) saat menjalankan terminal bawaan VS Code Snap, bersihkan variabel `LD_LIBRARY_PATH` dengan perintah:
>
> ```bash
> LD_LIBRARY_PATH="" npm run tauri dev
> ```

#### C. Membangun Paket Installer Desktop

```bash
npm run tauri build
```

Paket installer mandiri akan otomatis dihasilkan di direktori `src-tauri/target/release/bundle/`:

- **Linux**: `.deb` (Debian/Ubuntu) dan `.AppImage` (portabel siap pakai).
- **Windows**: `.exe` / `.msi`.
- **macOS**: `.dmg` / `.app`.

---

### 3. 📱 Aplikasi Mobile Android (Tauri v2 Mobile)

Dukungan mobile native Android tanpa memerlukan penulisan ulang kode antarmuka.

#### A. Prasyarat Sistem Android

1. **Java Development Kit (JDK 17 atau 21)**:

   ```bash
   sudo apt install -y openjdk-17-jdk
   ```

2. **Android Studio & SDK**:
   Buka Android Studio → **SDK Manager**:
   - **SDK Platforms**: Pasang **Android 14 (API 34)** atau **Android 15 (API 35)**.
   - **SDK Tools**: Pasang **Android SDK Build-Tools**, **Command-line Tools**, **Platform-Tools**, **NDK (Side by side)**, dan **CMake**.
3. **Environment Variables** (Tambahkan ke `~/.bashrc` lalu `source ~/.bashrc`):

   ```bash
   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
   export ANDROID_HOME=$HOME/Android/Sdk
   export NDK_HOME=$ANDROID_HOME/ndk/$(ls $ANDROID_HOME/ndk 2>/dev/null | tail -n 1)
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin
   ```

4. **Rust Target untuk Prosesor Ponsel**:

   ```bash
   rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
   ```

#### B. Inisialisasi Android (Hanya Sekali)

```bash
npx tauri android init
```

#### C. Menjalankan di Ponsel Android (Live Reload)

1. Hubungkan ponsel fisik Anda menggunakan kabel USB dan aktifkan **USB Debugging** pada _Developer Options_ HP Anda.
2. Jalankan:

   ```bash
   npm run tauri android dev
   ```

   _Vite otomatis mengekspos dev server ke jaringan lokal (`0.0.0.0`), mengompilasi APK debug, dan langsung meluncurkannya di layar HP._

#### D. Membangun Berkas APK / AAB

- **Membangun Debug APK (Langsung Pasang ke HP)**:

  ```bash
  npm run tauri android build -- --debug
  ```

  _Lokasi berkas hasil:_  
  `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`

- **Membangun Release AAB / APK (Siap Publikasi Google Play)**:

  ```bash
  npm run tauri android build
  ```

---

### 4. 🧹 Tips Pemeliharaan & Ukuran Penyimpanan Disk

```bash
cd src-tauri && cargo clean && cd ..
```

---

## 🗄️ Struktur Database & Penyimpanan

MyShelf mengadopsi arsitektur _local-first_ dengan **Dexie.js** di atas IndexedDB:

| Nama Tabel     | Peran & Deskripsi Data                                                              |
| :------------- | :---------------------------------------------------------------------------------- |
| `books`        | Metadata utama buku (SHA-256 ID, judul, penulis, ukuran, progres baca, Blob sampul) |
| `files`        | Berkas mentah buku (EPUB/PDF ArrayBuffer) yang disimpan terpisah demi performa      |
| `locations`    | Indeks cache pagination lokasi baca agar persentase baca instan dan presisi         |
| `bookmarks`    | Penanda halaman buku berdasarkan CFI atau indeks halaman PDF                        |
| `annotations`  | Sorotan teks, warna sorotan, dan catatan pribadi pengguna                           |
| `reading_logs` | Catatan durasi membaca untuk statistik harian, mingguan, dan rekor _reading streak_ |
| `localStorage` | Preferensi pengguna (tema warna visual, preferensi tipografi, mode tampilan rak)    |

---
