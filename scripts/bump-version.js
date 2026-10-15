#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// File paths
const PACKAGE_JSON_PATH = path.join(rootDir, 'package.json');
const PACKAGE_LOCK_PATH = path.join(rootDir, 'package-lock.json');
const CONFIG_TS_PATH = path.join(rootDir, 'src', 'config.ts');
const TAURI_CONF_PATH = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
const CARGO_TOML_PATH = path.join(rootDir, 'src-tauri', 'Cargo.toml');
const CARGO_LOCK_PATH = path.join(rootDir, 'src-tauri', 'Cargo.lock');

function parseSemVer(ver) {
  const match = ver
    .trim()
    .replace(/^v/, '')
    .match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) {
    throw new Error(
      `Format versi "${ver}" tidak valid. Gunakan format SemVer (contoh: 1.0.0 atau 1.0.1-beta.1).`
    );
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  };
}

function calculateNextVersion(currentVer, bumpType) {
  const parsed = parseSemVer(currentVer);
  switch (bumpType.toLowerCase()) {
    case 'patch':
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    case 'minor':
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case 'major':
      return `${parsed.major + 1}.0.0`;
    default: {
      // Jika user memasukkan nomor versi eksplisit (misal: 1.2.0)
      const direct = parseSemVer(bumpType);
      return direct.prerelease
        ? `${direct.major}.${direct.minor}.${direct.patch}-${direct.prerelease}`
        : `${direct.major}.${direct.minor}.${direct.patch}`;
    }
  }
}

function updatePackageJson(newVer) {
  const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8');
  const json = JSON.parse(content);
  json.version = newVer;
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(json, null, 2) + '\n', 'utf-8');
}

function updatePackageLock(newVer) {
  if (!fs.existsSync(PACKAGE_LOCK_PATH)) return false;
  const content = fs.readFileSync(PACKAGE_LOCK_PATH, 'utf-8');
  const json = JSON.parse(content);
  json.version = newVer;
  if (json.packages && json.packages['']) {
    json.packages[''].version = newVer;
  }
  fs.writeFileSync(PACKAGE_LOCK_PATH, JSON.stringify(json, null, 2) + '\n', 'utf-8');
  return true;
}

function updateConfigTs(newVer) {
  const content = fs.readFileSync(CONFIG_TS_PATH, 'utf-8');
  const updated = content.replace(/(version:\s*['"])([^'"]+)(['"])/, `$1${newVer}$3`);
  if (updated === content) {
    throw new Error('Gagal memperbarui version di src/config.ts: pola tidak cocok.');
  }
  fs.writeFileSync(CONFIG_TS_PATH, updated, 'utf-8');
}

function updateTauriConf(newVer) {
  if (!fs.existsSync(TAURI_CONF_PATH)) return false;
  const content = fs.readFileSync(TAURI_CONF_PATH, 'utf-8');
  const json = JSON.parse(content);
  json.version = newVer;
  fs.writeFileSync(TAURI_CONF_PATH, JSON.stringify(json, null, 2) + '\n', 'utf-8');
  return true;
}

function updateCargoToml(newVer) {
  if (!fs.existsSync(CARGO_TOML_PATH)) return false;
  const content = fs.readFileSync(CARGO_TOML_PATH, 'utf-8');
  // Hanya ganti version di bagian [package]
  const packageRegex = /(\[package\][\s\S]*?\nversion\s*=\s*")[^"]+(")/;
  if (!packageRegex.test(content)) {
    throw new Error(
      'Gagal memperbarui version di src-tauri/Cargo.toml: bagian [package] tidak ditemukan.'
    );
  }
  const updated = content.replace(packageRegex, `$1${newVer}$2`);
  fs.writeFileSync(CARGO_TOML_PATH, updated, 'utf-8');
  return true;
}

function updateCargoLock(newVer) {
  if (!fs.existsSync(CARGO_LOCK_PATH)) return false;
  const content = fs.readFileSync(CARGO_LOCK_PATH, 'utf-8');
  // Ganti versi untuk package "MyShelf" atau "app"
  const updated = content.replace(
    /(name\s*=\s*"(?:MyShelf|app)"\s*\nversion\s*=\s*")[^"]+(")/,
    `$1${newVer}$2`
  );
  if (updated !== content) {
    fs.writeFileSync(CARGO_LOCK_PATH, updated, 'utf-8');
    return true;
  }
  return false;
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.log(`
Penggunaan Script Versioning MyShelf:
  npm run bump:patch       -> Naikkan versi patch (1.0.0 -> 1.0.1)
  npm run bump:minor       -> Naikkan versi minor (1.0.0 -> 1.1.0)
  npm run bump:major       -> Naikkan versi major (1.0.0 -> 2.0.0)
  npm run bump -- <versi>  -> Tentukan versi spesifik (contoh: npm run bump -- 1.2.0)
`);
    process.exit(0);
  }

  const pkgContent = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8');
  const currentVersion = JSON.parse(pkgContent).version;
  const nextVersion = calculateNextVersion(currentVersion, arg);

  console.log(`\n📦 Memperbarui versi MyShelf:`);
  console.log(`   Versi Lama : ${currentVersion}`);
  console.log(`   Versi Baru : ${nextVersion}\n`);

  const updatedFiles = [];

  updatePackageJson(nextVersion);
  updatedFiles.push('package.json');

  if (updatePackageLock(nextVersion)) {
    updatedFiles.push('package-lock.json');
  }

  updateConfigTs(nextVersion);
  updatedFiles.push('src/config.ts');

  if (updateTauriConf(nextVersion)) {
    updatedFiles.push('src-tauri/tauri.conf.json');
  }

  if (updateCargoToml(nextVersion)) {
    updatedFiles.push('src-tauri/Cargo.toml');
  }

  if (updateCargoLock(nextVersion)) {
    updatedFiles.push('src-tauri/Cargo.lock');
  }

  console.log('✅ Berhasil menyinkronkan seluruh berkas proyek:');
  for (const file of updatedFiles) {
    console.log(`   • ${file}`);
  }
  console.log(`\n🎉 Selesai! Versi sekarang adalah v${nextVersion}.\n`);
}

main();
