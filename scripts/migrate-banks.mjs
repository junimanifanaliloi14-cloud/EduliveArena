import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws'; //Tambahkan ini

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan.');
  console.error('   Pastikan file .env.migration sudah ada (untuk local) atau GitHub Secrets sudah diisi.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }, // <-- Paksa gunakan 'ws' package
});

const SOURCE_PATH = path.join(process.cwd(), 'migrations', 'banks-source.json');

async function migrate() {
  console.log('🚀 Memulai migrasi bank soal ke Supabase...');
  console.log(`📂 Source: ${SOURCE_PATH}`);

  if (!fs.existsSync(SOURCE_PATH)) {
    console.error('❌ File migrations/banks-source.json tidak ditemukan.');
    console.error('   Jalankan: cp data/banks.json migrations/banks-source.json');
    process.exit(1);
  }

  let banks;
  try {
    banks = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf-8'));
  } catch (e) {
    console.error('❌ Gagal parse JSON:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(banks) || banks.length === 0) {
    console.error('❌ File banks-source.json tidak berisi array bank soal yang valid.');
    process.exit(1);
  }

  console.log(`📦 Ditemukan ${banks.length} bank soal.\n`);

  let successBanks = 0;
  let failedBanks = 0;
  let totalQuestions = 0;

  for (let idx = 0; idx < banks.length; idx++) {
    const bank = banks[idx];
    const prefix = `[${idx + 1}/${banks.length}]`;

    if (!bank.id || !bank.name || !Array.isArray(bank.questions)) {
      console.warn(`${prefix} ⚠️  Skip: format bank tidak valid (${bank.id || 'no-id'})`);
      failedBanks++;
      continue;
    }

    // 1. Upsert bank
    const { error: bankError } = await supabase
      .from('question_banks')
      .upsert({
        id: bank.id,
        name: bank.name,
        subject: bank.subject || 'Umum',
        created_at: new Date(bank.createdAt || Date.now()).toISOString(),
      }, { onConflict: 'id' });

    if (bankError) {
      console.error(`${prefix} ❌ Gagal simpan bank "${bank.name}":`, bankError.message);
      failedBanks++;
      continue;
    }

    // 2. Upsert soal dalam batch
    const questionsToInsert = bank.questions.map(q => ({
      id: q.id,
      bank_id: bank.id,
      text: q.text,
      options: q.options,
      correct_index: q.correctIndex,
      time_limit_sec: q.timeLimitSec || 20,
      image_url: q.imageUrl || null,
    }));

    const BATCH_SIZE = 100;
    let bankQuestionsSuccess = 0;
    let bankQuestionsFailed = 0;

    for (let i = 0; i < questionsToInsert.length; i += BATCH_SIZE) {
      const batch = questionsToInsert.slice(i, i + BATCH_SIZE);
      const { error: qError } = await supabase
        .from('questions')
        .upsert(batch, { onConflict: 'id' });

      if (qError) {
        console.error(`${prefix} ❌ Gagal simpan batch soal (${i}–${i + batch.length}):`, qError.message);
        bankQuestionsFailed += batch.length;
      } else {
        bankQuestionsSuccess += batch.length;
        totalQuestions += batch.length;
      }
    }

    if (bankQuestionsFailed === 0) {
      successBanks++;
      console.log(`${prefix} ✅ "${bank.name}" (${bankQuestionsSuccess} soal)`);
    } else {
      failedBanks++;
      console.warn(`${prefix} ⚠️  "${bank.name}" sebagian gagal: ${bankQuestionsSuccess} sukses, ${bankQuestionsFailed} gagal`);
    }
  }

  console.log('\n═══════════════════════════════════');
  console.log('🎉 Migrasi selesai!');
  console.log(`📊 Bank soal: ${successBanks} sukses, ${failedBanks} gagal`);
  console.log(`📝 Soal     : ${totalQuestions} berhasil di-upsert`);
  console.log('═══════════════════════════════════\n');

  if (failedBanks > 0) process.exit(1);
}

migrate().catch(e => {
  console.error('💥 Fatal error:', e.message);
  process.exit(1);
});
