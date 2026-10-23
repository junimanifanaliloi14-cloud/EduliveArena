import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DATA_FILE = path.join(process.cwd(), 'data', 'banks.json');
const MIGRATION_FILE = path.join(process.cwd(), 'migrations', 'banks-source.json');

console.log('🔄 Menyiapkan sinkronisasi data ke GitHub Actions...');

if (!fs.existsSync(DATA_FILE)) {
  console.error('❌ File data/banks.json tidak ditemukan. Pastikan Anda sudah membuat minimal 1 bank soal di aplikasi.');
  process.exit(1);
}

try {
  // 1. Salin file lokal ke folder migrasi
  fs.copyFileSync(DATA_FILE, MIGRATION_FILE);
  console.log('✅ Data lokal disalin ke migrations/banks-source.json');

  // 2. Git Add, Commit, Push
  console.log('🚀 Mengirim ke GitHub...');
  execSync('git add migrations/banks-source.json', { stdio: 'inherit' });
  
  // Cek apakah ada perubahan
  try {
    execSync('git commit -m "chore: auto-sync banks to supabase"', { stdio: 'inherit' });
  } catch (e) {
    // Jika tidak ada perubahan, git commit akan error. Abaikan saja.
    console.log('ℹ️ Tidak ada perubahan data baru untuk di-commit.');
  }

  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('\n🎉 Selesai! GitHub Actions sekarang sedang memproses data Anda ke Supabase.');
  console.log('   Buka tab "Actions" di GitHub untuk melihat statusnya.');
} catch (error) {
  console.error('❌ Terjadi kesalahan saat sinkronisasi:', error.message);
}
