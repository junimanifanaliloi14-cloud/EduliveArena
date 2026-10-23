'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loadPracticeHistory, getPracticeStats } from '@/lib/practiceHistory';

export default function PracticeLanding() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    setHistory(loadPracticeHistory().slice(0, 3));
    setStats(getPracticeStats());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) { setError('Masukkan kode latihan.'); return; }
    setChecking(true);
    setError('');
    try {
      const res = await fetch('/api/practice/' + cleanCode);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kode tidak valid');
      }
      router.push('/practice/' + cleanCode);
    } catch (e: any) {
      setError(e.message);
      setChecking(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition">← Beranda</Link>
      </div>

      <div className="text-center mb-8">
        <div className="inline-block text-6xl mb-4">📝</div>
        <h1 className="text-3xl md:text-4xl font-black">
          Latihan <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Mandiri</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm max-w-md mx-auto">
          Belajar kapan saja, di mana saja. Masukkan kode dari gurumu untuk mulai berlatih.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
        <label className="block text-sm text-slate-300 mb-2 font-semibold">Masukkan Kode Latihan</label>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Contoh: A1B2C3"
          maxLength={10}
          className="w-full text-center text-3xl font-mono font-bold tracking-[0.3em] rounded-xl bg-black/30 border-2 border-indigo-500/30 px-4 py-4 outline-none focus:border-indigo-500 uppercase"
        />
        {error && <div className="text-rose-400 text-sm mt-2 text-center">{error}</div>}
        <button type="submit" disabled={checking} className="btn-primary w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-lg py-3">
          {checking ? 'Memeriksa...' : '🚀 Mulai Latihan'}
        </button>
      </form>

      {stats && stats.totalSessions > 0 && (
        <>
          {/* Statistik */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
            <div className="card bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-center py-3">
              <div className="text-2xl mb-1">🔥</div>
              <div className="text-xl font-black text-emerald-400">{stats.streak}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-1">Hari Streak</div>
            </div>
            <div className="card bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-center py-3">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-xl font-black text-indigo-400">{stats.totalSessions}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-1">Sesi Latihan</div>
            </div>
            <div className="card bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 text-center py-3">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-xl font-black text-amber-400">{stats.avgAccuracy}%</div>
              <div className="text-[10px] text-slate-400 uppercase mt-1">Rata Akurasi</div>
            </div>
            <div className="card bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20 text-center py-3">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-xl font-black text-purple-400">{stats.bestScore}</div>
              <div className="text-[10px] text-slate-400 uppercase mt-1">Skor Terbaik</div>
            </div>
          </div>

          {/* Riwayat */}
          <div className="card mt-4">
            <h2 className="text-sm font-bold text-slate-300 mb-3">📚 Latihan Terakhir</h2>
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div>
                    <div className="font-medium text-sm">{h.bankName}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(h.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-brand-400">{h.score}</div>
                    <div className="text-xs text-slate-400">{h.accuracy}% akurasi</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
