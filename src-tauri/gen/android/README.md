# Dokumentasi Android Proyek MyShelf (Tauri v2)

Direktori ini (`src-tauri/gen/android`) merupakan proyek Android native yang dibuat dan dikelola secara terintegrasi oleh **Tauri v2**. Proyek ini menggunakan **Gradle (Kotlin DSL)**, **Kotlin**, **Rust NDK bridge**, dan **Android WebView**.

Dokumentasi ini mencakup panduan lengkap untuk developer yang menggunakan sistem operasi **Linux** maupun **Windows**.

---

## Daftar Isi
1. [Struktur Direktori](#1-struktur-direktori)
2. [Prasyarat Lingkungan (Environment Setup)](#2-prasyarat-lingkungan-environment-setup)
   - [A. Pengguna Linux](#a-pengguna-linux)
   - [B. Pengguna Windows](#b-pengguna-windows)
   - [Target Rust (Lintas Platform)](#target-rust-lintas-platform)
3. [Membuat Keystore Rilis Baru (Generate Key)](#3-membuat-keystore-rilis-baru-generate-key)
   - [A. Generate Key di Linux](#a-generate-key-di-linux)
   - [B. Generate Key di Windows](#b-generate-key-di-windows)
   - [Penjelasan Parameter `keytool`](#penjelasan-parameter-keytool)
   - [Panduan Pengisian Data Interaktif](#panduan-pengisian-data-interaktif)
   - [Prinsip Keamanan Keystore](#prinsip-keamanan-keystore)
4. [Konfigurasi Signing Otomatis (Keystore)](#4-konfigurasi-signing-otomatis-keystore)
   - [Format Penulisan Path (Linux vs Windows)](#format-penulisan-path-linux-vs-windows)
5. [Perintah Build & Kompilasi](#5-perintah-build--kompilasi)
   - [Opsi A: Menggunakan Tauri CLI](#opsi-a-menggunakan-tauri-cli-direkomendasikan)
   - [Opsi B: Menggunakan Gradle CLI Langsung](#opsi-b-menggunakan-gradle-cli-langsung)
6. [Lokasi Berkas Output](#6-lokasi-berkas-output)
7. [Verifikasi Sertifikat APK](#7-verifikasi-sertifikat-apk)
8. [Troubleshooting Khusus Windows & Tips Tambahan](#8-troubleshooting-khusus-windows--tips-tambahan)

---

## 1. Struktur Direktori

```text
src-tauri/gen/android/
├── app/                        # Modul aplikasi Android utama
│   ├── build.gradle.kts        # Konfigurasi modul app (SDK, Signing, Dependencies)
│   ├── proguard-rules.pro      # Aturan ProGuard / R8 untuk rilis produksi
│   └── src/                    # Source code Kotlin native dan Android Manifest
├── buildSrc/                   # Plugin Gradle internal untuk integrasi Tauri & Rust
├── gradle/                     # Gradle wrapper
├── gradlew                     # Skrip eksekusi Gradle Wrapper (Linux / macOS)
├── gradlew.bat                 # Skrip eksekusi Gradle Wrapper (Windows)
├── keystore.properties         # Kredensial signing lokal (RAHASIA - diabaikan Git)
├── keystore.properties.example # Template contoh konfigurasi keystore
├── settings.gradle             # Pengaturan project root Gradle
└── README.md                   # Dokumentasi ini
```

---

## 2. Prasyarat Lingkungan (Environment Setup)

Sebelum menjalankan build Android, pastikan variabel lingkungan berikut telah dikonfigurasi.

### A. Pengguna Linux

Tambahkan ke berkas `~/.bashrc` (atau `~/.zshrc`):

```bash
# Java OpenJDK 21
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# Android SDK & NDK
export ANDROID_HOME=$HOME/Android/Sdk
export NDK_HOME=$ANDROID_HOME/ndk/28.2.13676358

# Build Tools
export BUILD_TOOLS=$ANDROID_HOME/build-tools/35.0.0

# PATH
export PATH=$PATH:$ANDROID_HOME/platform-tools:$BUILD_TOOLS
```

Muat ulang konfigurasi terminal:
```bash
source ~/.bashrc
```

---

### B. Pengguna Windows

Pada Windows, Anda dapat menyetel Environment Variables melalui **GUI System Properties** atau menggunakan **PowerShell** (jalankan sebagai Administrator jika ingin set ke tingkat System, atau set ke tingkat User):

#### 1. Lokasi Default SDK & JDK di Windows:
* **JDK 21:** Biasanya berada di `C:\Program Files\Eclipse Adoptium\jdk-21.x.x-hotspot\` atau Java bawaan Android Studio di `C:\Program Files\Android\Android Studio\jbr`.
* **Android SDK:** Default berada di `C:\Users\<Username>\AppData\Local\Android\Sdk`.
* **NDK:** Berada di `C:\Users\<Username>\AppData\Local\Android\Sdk\ndk\28.2.13676358`.

#### 2. Perintah PowerShell untuk Menyetel Environment Variables:
```powershell
# Ganti <Username> dan versi JDK sesuai instalasi Anda
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
[System.Environment]::SetEnvironmentVariable("NDK_HOME", "$env:LOCALAPPDATA\Android\Sdk\ndk\28.2.13676358", "User")

# Menambahkan ke PATH Pengguna
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$newPaths = "$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:LOCALAPPDATA\Android\Sdk\build-tools\35.0.0"
[System.Environment]::SetEnvironmentVariable("Path", "$currentPath;$newPaths", "User")
```

> **Catatan:** Setelah menjalankan perintah di atas, tutup dan buka kembali jendela PowerShell / Command Prompt Anda agar variabel baru terbaca.

---

### Target Rust (Lintas Platform)

Baik di Linux maupun Windows, jalankan perintah ini di terminal satu kali saja untuk memasang compiler Rust Android:

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

---

## 3. Membuat Keystore Rilis Baru (Generate Key)

Jika Anda belum memiliki berkas keystore produksi (`.jks`), buat satu kali menggunakan perkakas bawaan Java SDK yaitu `keytool`.

> [!IMPORTANT]
> Selalu buat dan simpan file keystore di **luar direktori repositori proyek** (misalnya di folder `~/.android-keys/` atau `%USERPROFILE%\.android-keys\`) agar tidak sengaja ter-commit ke Git.

### A. Generate Key di Linux

Jalankan perintah berikut di terminal:

```bash
# 1. Buat direktori aman di folder home
mkdir -p ~/.android-keys
cd ~/.android-keys

# 2. Buat keystore baru dengan masa berlaku 10.000 hari (~27 tahun)
keytool -genkey -v \
  -keystore myshelf-release-key.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias myshelf-key
```

---

### B. Generate Key di Windows

#### Menggunakan PowerShell:
```powershell
# 1. Buat direktori aman di folder User Profile
New-Item -ItemType Directory -Force -Path "$HOME\.android-keys"
Set-Location "$HOME\.android-keys"

# 2. Buat keystore baru
& "$env:JAVA_HOME\bin\keytool.exe" -genkey -v `
  -keystore myshelf-release-key.jks `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -alias myshelf-key
```

#### Menggunakan Command Prompt (CMD):
```cmd
REM 1. Buat direktori aman
mkdir "%USERPROFILE%\.android-keys"
cd /d "%USERPROFILE%\.android-keys"

REM 2. Buat keystore baru
"%JAVA_HOME%\bin\keytool.exe" -genkey -v -keystore myshelf-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias myshelf-key
```

---

### Penjelasan Parameter `keytool`

| Parameter | Fungsi |
| :--- | :--- |
| `-genkey` atau `-genkeypair` | Memerintahkan `keytool` membuat pasangan kunci kriptografi (public & private key) dan sertifikat self-signed. |
| `-v` | Mode *verbose* (menampilkan detail log selama pembuatan kunci). |
| `-keystore myshelf-release-key.jks` | Nama berkas container keystore yang akan diciptakan. |
| `-keyalg RSA` | Algoritma enkripsi yang digunakan. Standar resmi Android adalah `RSA`. |
| `-keysize 2048` | Panjang bit kunci kriptografi (2048 bit adalah standar minimum keamanan Android). |
| `-validity 10000` | Masa aktif sertifikat dalam satuan hari ($10.000\text{ hari} \approx 27+\text{ tahun}$). Google Play mewajibkan sertifikat valid minimal sampai tanggal 22 Oktober 2033 atau 25+ tahun. |
| `-alias myshelf-key` | Nama label (*alias*) unik untuk kunci aplikasi MyShelf di dalam keystore. |

---

### Panduan Pengisian Data Interaktif

Saat perintah `keytool` dijalankan, Anda akan diminta mengisi serangkaian pertanyaan:

1. **`Enter keystore password:`**
   Ketikkan kata sandi yang kuat untuk mengunci keystore. *(Karakter tidak akan terlihat di layar saat diketik, ini normal)*. Tekan `Enter`.
2. **`Re-enter new password:`**
   Ketik ulang kata sandi yang sama untuk konfirmasi.
3. **Identitas Pengembang (Distinguished Name / DN):**
   * *What is your first and last name?* $\rightarrow$ Isi nama Anda atau nama tim.
   * *What is the name of your organizational unit?* $\rightarrow$ Misal: `Mobile Dev` (atau kosongkan dengan tekan `Enter`).
   * *What is the name of your organization?* $\rightarrow$ Misal: `MyShelf` (atau nama perusahaan/pribadi).
   * *What is the name of your City or Locality?* $\rightarrow$ Kota domisili Anda.
   * *What is the name of your State or Province?* $\rightarrow$ Provinsi domisili Anda.
   * *What is the two-letter country code for this unit?* $\rightarrow$ Kode negara 2 huruf (contoh: `ID` untuk Indonesia).
4. **Konfirmasi:**
   Terminal akan menampilkan ringkasan data dan bertanya:
   `Is CN=..., OU=..., O=... correct? [no]:` $\rightarrow$ Ketik **`yes`** lalu tekan `Enter`.
5. **Kata Sandi Kunci Alias:**
   `Enter key password for <myshelf-key> (RETURN if same as keystore password):`
   $\rightarrow$ Tekan **`Enter`** untuk menyamakan password kunci alias dengan password keystore.

---

### Prinsip Keamanan Keystore

> [!CAUTION]
> **ATURAN MUTLAK KEAMANAN KEYSTORE:**
> 1. **JANGAN PERNAH MENG-COMMIT FILE `.jks` KE GITHUB / GIT REPOSITORY.**
> 2. **JANGAN SAMPAI FILE INI HILANG!**
>    Android dan Google Play Store mengidentifikasi update aplikasi berdasarkan sertifikat penandatanganan ini. Jika file `.jks` hilang atau password terlupakan, **Anda tidak akan pernah bisa mengirim update aplikasi ke pengguna yang sudah menginstall MyShelf**.
> 3. **Cadangkan (*Backup*) dengan Aman:**
>    Simpan salinan cadangan file `.jks` beserta password dan aliasnya di Password Manager (Bitwarden, 1Password, KeePass) atau media penyimpanan terenkripsi yang aman.

---

## 4. Konfigurasi Signing Otomatis (Keystore)

Proyek ini telah dikonfigurasi agar Gradle menandatangani APK / AAB rilis secara otomatis menggunakan file `keystore.properties`.

Buat berkas `keystore.properties` pada root direktori ini (`src-tauri/gen/android/keystore.properties`).

### Format Penulisan Path (Linux vs Windows)

> [!IMPORTANT]
> Pada format file `.properties` Java, karakter backslash `\` berfungsi sebagai karakter escape. Khusus developer Windows, **Gunakan forward slash (`/`)** atau **double backslash (`\\`)** pada nilai `storeFile`.

#### Contoh untuk Linux:
```properties
storeFile=/path/to/release-key/.android-keys/release-key.jks
storePassword=password_keystore
keyAlias=app-alias-key
keyPassword=password_alias
```

#### Contoh untuk Windows:
```properties
# Opsi 1 (Sangat disarankan - gunakan forward slash):
storeFile=C:/Users/<username>/.android-keys/release-key.jks
storePassword=password_keystore
keyAlias=app-alias-key
keyPassword=password_alias

# Opsi 2 (Menggunakan double backslash):
# storeFile=C:\\Users\\Username\\.android-keys\\release-key.jks
```

### Penjelasan Parameter:
| Parameter | Keterangan |
| :--- | :--- |
| `storeFile` | Path absolut menuju berkas `.jks` di komputer Anda (simpan di luar repo). |
| `storePassword` | Kata sandi utama untuk membuka berkas keystore `.jks`. |
| `keyAlias` | Nama alias kunci yang ditetapkan saat pembuatan dengan `keytool` (misal `myshelf-key`). |
| `keyPassword` | Kata sandi privat untuk alias kunci tersebut. |

> [!CAUTION]
> Berkas `keystore.properties` berisi kata sandi rahasia dalam bentuk teks biasa. Berkas ini **sudah dimasukkan ke dalam `.gitignore`** dan **TIDAK BOLEH** diunggah ke repositori publik.

---

## 5. Perintah Build & Kompilasi

### Opsi A: Menggunakan Tauri CLI (Direkomendasikan)
Jalankan dari root direktori proyek (`epub_reader`):

1. **Build APK Universal (Semua arsitektur CPU - untuk instalasi langsung / Sideloading):**
   ```bash
   npm run tauri android build -- --apk
   ```

2. **Build APK Cepat Khusus Arsitektur Tertentu (misal ARM64 untuk HP modern):**
   ```bash
   npm run tauri android build -- --apk --target aarch64
   ```

3. **Build AAB (Android App Bundle - untuk Google Play Store):**
   ```bash
   npm run tauri android build
   ```

---

### Opsi B: Menggunakan Gradle CLI Langsung
Jika Anda berada di dalam folder `src-tauri/gen/android`:

* **Di Linux:**
  ```bash
  # Build APK Rilis
  ./gradlew assembleUniversalRelease

  # Build AAB Rilis
  ./gradlew bundleUniversalRelease
  ```

* **Di Windows (CMD / PowerShell):**
  ```cmd
  REM Build APK Rilis
  gradlew.bat assembleUniversalRelease

  REM Build AAB Rilis
  gradlew.bat bundleUniversalRelease
  ```

---

## 6. Lokasi Berkas Output

Setelah proses build selesai, berkas rilis yang **sudah ditandatangani secara otomatis** dapat ditemukan pada lokasi:

* **APK Universal Release:**
  * Linux: `app/build/outputs/apk/universal/release/app-universal-release.apk`
  * Windows: `app\build\outputs\apk\universal\release\app-universal-release.apk`
* **APK ARM64 Release (Jika menggunakan `--target aarch64`):**
  * Linux: `app/build/outputs/apk/arm64-v8a/release/app-arm64-v8a-release.apk`
  * Windows: `app\build\outputs\apk\arm64-v8a\release\app-arm64-v8a-release.apk`
* **AAB Release (Play Store Bundle):**
  * Linux: `app/build/outputs/bundle/universalRelease/app-universal-release.aab`
  * Windows: `app\build\outputs\bundle\universalRelease\app-universal-release.aab`

---

## 7. Verifikasi Sertifikat APK

Untuk memastikan APK rilis benar-benar telah ditandatangani dengan sertifikat resmi Anda (bukan sertifikat `Android Debug` bawaan), periksa sertifikatnya:

### Di Linux:
```bash
$BUILD_TOOLS/apksigner verify --print-certs app/build/outputs/apk/universal/release/app-universal-release.apk
```

### Di Windows (Command Prompt / PowerShell):
* **Command Prompt:**
  ```cmd
  "%ANDROID_HOME%\build-tools\35.0.0\apksigner.bat" verify --print-certs app\build\outputs\apk\universal\release\app-universal-release.apk
  ```
* **PowerShell:**
  ```powershell
  & "$env:ANDROID_HOME\build-tools\35.0.0\apksigner.bat" verify --print-certs app\build\outputs\apk\universal\release\app-universal-release.apk
  ```

**Ciri-ciri APK yang berhasil ditandatangani resmi:**
* Pada baris `Signer #1 certificate DN` tercantum identitas pengembang/organisasi Anda.
* Skema verifikasi **v1, v2, v3** bernilai `true`.

---

## 8. Troubleshooting Khusus Windows & Tips Tambahan

1. **Error Path Terlalu Panjang (*Filename too long* / *Long Paths*):**
   * Di Windows, path file build native Rust/Android terkadang melebihi batas 260 karakter.
   * **Solusi:** Aktifkan *Long Paths* di Git dengan menjalankan:
     ```cmd
     git config --system core.longpaths true
     ```
   * Pastikan juga meletakkan folder proyek di path yang tidak terlalu dalam (misalnya `C:\dev\epub_reader` bukan di dalam nested folder yang panjang).

2. **File Terkunci oleh Gradle Daemon (*The process cannot access the file because it is being used by another process*):**
   * Di Windows, proses Gradle Daemon terkadang menahan kunci file binary/DLL setelah kompilasi gagal.
   * **Solusi:** Hentikan seluruh daemon Gradle yang aktif dengan perintah:
     ```cmd
     gradlew.bat --stop
     ```

3. **Membersihkan Cache Build:**
   * Linux: `./gradlew clean`
   * Windows: `gradlew.bat clean`

4. **Perhatian Terhadap Regenerasi Tauri:**
   Sebagian besar file dalam folder `gen/android` digenerate oleh Tauri. Jika di masa depan Anda menjalankan `tauri android init` ulang, pastikan konfigurasi kustom pada [app/build.gradle.kts](./app/build.gradle.kts) (seperti blok `keystoreProperties` dan `signingConfigs`) tetap dipertahankan.
