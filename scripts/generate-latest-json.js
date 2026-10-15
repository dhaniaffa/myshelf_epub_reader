#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TAURI_CONF_PATH = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
const BUNDLE_DIR = path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle');
const REPO_URL = 'https://github.com/dhaniaffa/myshelf_epub_reader';

function main() {
  if (!fs.existsSync(TAURI_CONF_PATH)) {
    console.error('Error: tauri.conf.json tidak ditemukan.');
    process.exit(1);
  }

  const tauriConf = JSON.parse(fs.readFileSync(TAURI_CONF_PATH, 'utf-8'));
  const version = tauriConf.version || '1.0.0';
  const tag = `v${version}`;

  if (!fs.existsSync(BUNDLE_DIR)) {
    console.error(`Error: Folder bundle tidak ditemukan di ${BUNDLE_DIR}.`);
    console.error('Jalankan "npm run tauri build" terlebih dahulu.');
    process.exit(1);
  }

  // Cari semua file .sig di dalam bundle directory
  function findFiles(dir, ext) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(findFiles(fullPath, ext));
      } else if (entry.name.endsWith(ext)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const sigFiles = findFiles(BUNDLE_DIR, '.sig');

  if (sigFiles.length === 0) {
    console.error('Peringatan: Tidak ditemukan file .sig di dalam folder bundle.');
    console.error('Pastikan Anda mengekspor TAURI_SIGNING_PRIVATE_KEY saat menjalankan build:');
    console.error('  export TAURI_SIGNING_PRIVATE_KEY="$HOME/.tauri/myshelf.key"');
    console.error('  npm run tauri build');
    process.exit(1);
  }

  const platforms = {};

  for (const sigPath of sigFiles) {
    const signature = fs.readFileSync(sigPath, 'utf-8').trim();
    const assetPath = sigPath.slice(0, -4); // Buang .sig
    const assetName = path.basename(assetPath);

    // Deteksi target platform berdasarkan nama file
    let platformKey = null;

    if (assetName.endsWith('.AppImage') || assetName.endsWith('.AppImage.tar.gz')) {
      platformKey = assetName.includes('aarch64') || assetName.includes('arm64')
        ? 'linux-aarch64'
        : 'linux-x86_64';
    } else if (assetName.endsWith('.nsis.zip') || assetName.endsWith('.msi.zip') || assetName.endsWith('.exe')) {
      platformKey = 'windows-x86_64';
    } else if (assetName.endsWith('.app.tar.gz')) {
      platformKey = assetName.includes('aarch64') || assetName.includes('arm64')
        ? 'darwin-aarch64'
        : 'darwin-x86_64';
    }

    if (platformKey) {
      platforms[platformKey] = {
        signature,
        url: `${REPO_URL}/releases/download/${tag}/${assetName}`,
      };
      console.log(`✓ Terdeteksi platform [${platformKey}]: ${assetName}`);
    }
  }

  const latestJson = {
    version,
    notes: `Pembaruan MyShelf versi ${version}`,
    pub_date: new Date().toISOString(),
    platforms,
  };

  const outputPath = path.join(rootDir, 'latest.json');
  fs.writeFileSync(outputPath, JSON.stringify(latestJson, null, 2) + '\n', 'utf-8');

  console.log(`\n🎉 Berhasil menghasilkan latest.json!`);
  console.log(`📁 Lokasi berkas: ${outputPath}`);
  console.log(`\nIsi latest.json:`);
  console.log(JSON.stringify(latestJson, null, 2));
}

main();
