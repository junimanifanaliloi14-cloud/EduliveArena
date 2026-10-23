'use client';
import { useEffect, useState } from 'react';

interface PracticeCode {
  code: string;
  bankId: string;
  bankName: string;
  subject: string;
  questionCount: number;
  createdAt: number;
}

interface Bank { id: string; name: string; subject: string; questionCount: number; }

export function PracticeCodeManager() {
  const [codes, setCodes] = useState<PracticeCode[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    fetchCodes();
    fetch('/api/banks').then(r => r.json()).then(d => {
      setBanks(d.banks || []);
      if (d.banks?.length > 0) setSelectedBankId(d.banks[0].id);
    });
  }, []);

  function fetchCodes() {
    fetch('/api/practice').then(r => r.json()).then(d => setCodes(d.codes || []));
  }

  async function generateCode() {
    if (!selectedBankId) return;
    setLoading(true);
    const res = await fetch('/api/practice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bankId: selectedBankId }) });
    if (res.ok) fetchCodes();
    else alert('Gagal membuat kode latihan.');
    setLoading(false);
  }

  async function deleteCode(code: string, bankName: string) {
    if (!confirm(`Hapus kode latihan untuk "${bankName}"?\nSiswa tidak akan bisa lagi menggunakan kode ${code}.`)) return;
    const res = await fetch('/api/practice/' + code, { method: 'DELETE' });
    if (res.ok) fetchCodes();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Toast kecil
      const el = document.createElement('div');
      el.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-2xl z-[300] animate-slide-up text-sm font-semibold';
      el.textContent = '✓ Berhasil disalin!';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    });
  }

  const availableBanks = banks.filter(b => !codes.find(c => c.bankId === b.id));

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">📝 Kode Latihan Mandiri</h2>
          <p className="text-xs text-slate-400 mt-1">Buat kode untuk siswa berlatih sendiri tanpa perlu menunggu sesi live.</p>
        </div>
      </div>

      {availableBanks.length > 0 ? (
        <div className="flex gap-2 mb-4 flex-wrap">
          <select
            value={selectedBankId}
            onChange={e => setSelectedBankId(e.target.value)}
            className="flex-1 min-w-[200px] rounded-xl bg-white/5 border border-white/10 px-4 py-2 outline-none focus:border-brand-500 text-sm [&>option]:bg-slate-800"
          >
            {availableBanks.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.questionCount} soal)</option>
            ))}
          </select>
          <button onClick={generateCode} disabled={loading || !selectedBankId} className="btn-primary text-sm px-4 disabled:opacity-50">
            {loading ? 'Membuat...' : '➕ Buat Kode'}
          </button>
        </div>
      ) : (
        <div className="text-sm text-slate-500 bg-white/5 p-3 rounded-lg mb-4">
          ✓ Semua bank soal sudah memiliki kode latihan.
        </div>
      )}

      {codes.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          Belum ada kode latihan. Buat kode pertama untuk siswa Anda!
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map(c => {
            const practiceUrl = origin + '/practice/' + c.code;
            return (
              <div key={c.code} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[150px]">
                    <div className="font-semibold text-sm">{c.bankName}</div>
                    <div className="text-xs text-slate-400">{c.subject} · {c.questionCount} soal</div>
                  </div>
                  <button onClick={() => deleteCode(c.code, c.bankName)} className="p-1.5 rounded-md hover:bg-rose-500/20 text-slate-400 hover:text-rose-400" title="Hapus kode">🗑️</button>
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-slate-400">Kode:</span>
                    <span className="font-mono font-bold text-brand-400 text-lg tracking-wider">{c.code}</span>
                  </div>
                  <button onClick={() => copyToClipboard(c.code)} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md">📋 Salin Kode</button>
                  <button onClick={() => copyToClipboard(practiceUrl)} className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md">🔗 Salin Link</button>
                </div>

                <div className="mt-2 text-xs text-slate-500 break-all">
                  {practiceUrl}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 text-xs text-slate-500 bg-cyan-500/5 border border-cyan-500/20 p-3 rounded-lg">
        💡 <b>Cara pakai:</b> Bagikan kode ke siswa (via WA atau papan tulis). Siswa membuka <span className="font-mono text-cyan-400">{origin}/practice</span>, memasukkan kode, dan mulai latihan.
      </div>
    </section>
  );
}
