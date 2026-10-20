'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Bank { id: string; name: string; subject: string; questionCount: number; }

export default function HostHome() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selected, setSelected] = useState('');
  const [hostName, setHostName] = useState('Bu Guru');
  const [timeLimit, setTimeLimit] = useState(20);
  const [autoReveal, setAutoReveal] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/banks').then(r => r.json()).then(d => {
      setBanks(d.banks);
      if (d.banks[0]) setSelected(d.banks[0].id);
    });
  }, []);

  async function createSession() {
    if (!selected) return;
    setLoading(true);
    const res = await fetch('/api/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankId: selected, hostName, timeLimitSec: timeLimit, autoReveal }),
    });
    const data = await res.json();
    if (data.session) router.push('/host/session/' + data.session.id);
    else setLoading(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6">
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition">
          ← Kembali ke Beranda
        </Link>
      </div>

      <h1 className="text-3xl font-bold">Dashboard Guru</h1>
      <p className="text-slate-400 mt-1">Pilih bank soal dan atur durasi kuis live.</p>

      <div className="card mt-8 space-y-5">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Nama tampilan guru</label>
          <input value={hostName} onChange={e => setHostName(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:border-brand-500" />
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Durasi Menjawab per Soal</label>
            <select value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:border-brand-500 [&>option]:bg-slate-800">
              <option value={10}>10 Detik (Cepat)</option>
              <option value={15}>15 Detik</option>
              <option value={20}>20 Detik (Standar)</option>
              <option value={30}>30 Detik</option>
              <option value={60}>60 Detik (Hitung Manual)</option>
            </select>
          </div>
          <div className="flex flex-col justify-center pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={autoReveal} onChange={e => setAutoReveal(e.target.checked)}
                className="h-5 w-5 rounded bg-white/10 border-white/20 text-brand-500 focus:ring-brand-500 cursor-pointer" />
              <div>
                <div className="font-medium">Buka Jawaban Otomatis</div>
                <div className="text-xs text-slate-400">Tampilkan jawaban benar saat waktu habis</div>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Pilih bank soal</label>
          <div className="grid gap-2">
            {banks.map(b => (
              <button key={b.id} onClick={() => setSelected(b.id)}
                className={'flex items-center justify-between rounded-xl px-4 py-3 border transition ' + (selected === b.id ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10')}>
                <div className="text-left">
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-xs text-slate-400">{b.subject} - {b.questionCount} soal</div>
                </div>
                {selected === b.id && <span className="text-brand-500">✓</span>}
              </button>
            ))}
          </div>
        </div>
        <button onClick={createSession} disabled={loading} className="btn-primary w-full">
          {loading ? 'Membuat sesi...' : 'Mulai Sesi Baru →'}
        </button>
      </div>
    </main>
  );
}
