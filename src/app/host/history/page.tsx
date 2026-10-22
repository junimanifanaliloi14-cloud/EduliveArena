'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadHistory, deleteHistorySession, clearAllHistory, SavedSession } from '@/lib/historyHelper';

export default function HistoryPage() {
  const [history, setHistory] = useState<SavedSession[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function handleDelete(pin: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm('Hapus riwayat sesi ini?')) return;
    deleteHistorySession(pin);
    setHistory(loadHistory());
  }

  function handleClearAll() {
    if (!confirm('Hapus SEMUA riwayat sesi? Tindakan ini tidak bisa dibatalkan.')) return;
    clearAllHistory();
    setHistory([]);
  }

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6">
        <Link href="/host" className="text-sm text-slate-400 hover:text-white transition">← Kembali ke Dashboard</Link>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">📚 Riwayat Sesi</h1>
          <p className="text-slate-400 mt-1">Semua sesi kuis yang pernah Anda selesaikan tersimpan di sini.</p>
        </div>
        {history.length > 0 && (
          <button onClick={handleClearAll} className="text-xs text-rose-400 hover:text-rose-300 font-semibold border border-rose-500/30 px-3 py-1.5 rounded-lg hover:bg-rose-500/10">
            🗑️ Hapus Semua
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-xl font-semibold mb-2">Belum ada riwayat</h2>
          <p className="text-slate-400 text-sm mb-6">Selesaikan sesi kuis pertama Anda, dan riwayat akan otomatis muncul di sini.</p>
          <Link href="/host" className="btn-primary">Buat Sesi Baru →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(session => (
            <Link
              key={session.pin}
              href={`/host/history/${session.pin}`}
              className="card block hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-lg font-bold truncate">{session.bankName}</h3>
                    {session.groupMode && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Grup</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>👤 {session.hostName}</span>
                    <span>👥 {session.playerCount} murid</span>
                    <span>📝 {session.totalQuestions} soal</span>
                    <span>🔑 PIN {session.pin}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">📅 {formatDate(session.endedAt)}</div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase">Skor Tertinggi</div>
                    <div className="text-xl font-mono font-bold text-amber-400">{session.topScore}</div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(session.pin, e)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition"
                    title="Hapus dari riwayat"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 text-center text-xs text-slate-500">
        💾 Data tersimpan di browser Anda (maksimal 50 sesi terakhir). Tidak tersinkron antar perangkat.
      </div>
    </main>
  );
}
