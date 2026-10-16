#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🧹 Memulai pembersihan cache dan hasil build MyShelf...\n');

// Bersihkan Rust build artifacts (target/)
const tauriCargoToml = path.join(rootDir, 'src-tauri', 'Cargo.toml');
const tauriTargetDir = path.join(rootDir, 'src-tauri', 'target');

if (fs.existsSync(tauriCargoToml)) {
  process.stdout.write('📦 Membersihkan cache Rust (src-tauri/target)... ');
  try {
    const cargoResult = spawnSync('cargo', ['clean', '--manifest-path', tauriCargoToml], {
      stdio: 'pipe',
    });
    if (cargoResult.status === 0) {
      console.log('✅ Selesai (via cargo clean)');
    } else {
      throw new Error(cargoResult.stderr?.toString() || 'cargo clean failed');
    }
  } catch {
    // Fallback manual jika cargo tidak ada di PATH
    if (fs.existsSync(tauriTargetDir)) {
      fs.rmSync(tauriTargetDir, { recursive: true, force: true });
      console.log('✅ Selesai (folder target dihapus)');
    } else {
      console.log('⏭️  Sudah bersih');
    }
  }
}

// Daftar direktori cache dan build Android & Frontend yang akan dibersihkan
const dirsToRemove = [
  {
    name: 'Android app build',
    path: path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', 'build'),
  },
  { name: 'Android root build', path: path.join(rootDir, 'src-tauri', 'gen', 'android', 'build') },
  {
    name: 'Android .cxx cache',
    path: path.join(rootDir, 'src-tauri', 'gen', 'android', 'app', '.cxx'),
  },
  {
    name: 'Android Gradle cache',
    path: path.join(rootDir, 'src-tauri', 'gen', 'android', '.gradle'),
  },
  { name: 'Frontend dist', path: path.join(rootDir, 'dist') },
  { name: 'Vite cache', path: path.join(rootDir, 'node_modules', '.vite') },
];

for (const item of dirsToRemove) {
  process.stdout.write(`📁 Membersihkan ${item.name}... `);
  if (fs.existsSync(item.path)) {
    try {
      fs.rmSync(item.path, { recursive: true, force: true });
      console.log('✅ Dihapus');
    } catch (err) {
      console.log(`⚠️ Gagal (${err.message})`);
    }
  } else {
    console.log('⏭️  Sudah bersih');
  }
}

console.log('\n✨ Pembersihan selesai! Ruang penyimpanan telah berhasil dihemat.');
