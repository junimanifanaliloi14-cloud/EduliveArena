import { createClient } from '@supabase/supabase-js';
import ws from 'ws'; // <-- Ini yang sebelumnya hilang

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Kredensial Supabase tidak ditemukan.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }, // <-- Pastikan ini ada
});

async function verify() {
  console.log('🔍 Memverifikasi data di Supabase...\n');

  const { count: bankCount, error: bankErr } = await supabase
    .from('question_banks')
    .select('*', { count: 'exact', head: true });

  if (bankErr) {
    console.error('❌ Gagal hitung banks:', bankErr.message);
    process.exit(1);
  }

  const { count: questionCount, error: qErr } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });

  if (qErr) {
    console.error('❌ Gagal hitung questions:', qErr.message);
    process.exit(1);
  }

  const { data: sample, error: sampleErr } = await supabase
    .from('questions')
    .select('id, bank_id, text, correct_index')
    .limit(3);

  if (sampleErr) {
    console.error('❌ Gagal ambil sample:', sampleErr.message);
  }

  console.log('═══════════════════════════════════');
  console.log(`📚 Total banks    : ${bankCount}`);
  console.log(`📝 Total questions: ${questionCount}`);
  console.log('═══════════════════════════════════\n');

  if (sample && sample.length > 0) {
    console.log('🔎 Sample soal dari Supabase:');
    sample.forEach((q, i) => {
      console.log(`   ${i + 1}. [${q.bank_id}] ${q.text.slice(0, 60)}... (jawaban: ${q.correct_index})`);
    });
  }

  if (bankCount === 0) {
    console.warn('\n⚠️  Tidak ada bank soal di Supabase. Migration mungkin belum dijalankan.');
    process.exit(1);
  }

  console.log('\n✅ Verifikasi selesai. Data valid.');
}

verify().catch(e => {
  console.error('💥 Fatal error:', e.message);
  process.exit(1);
});
