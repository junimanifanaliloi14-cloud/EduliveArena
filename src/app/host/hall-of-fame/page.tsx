'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { loadHallOfFame, deleteHallOfFameEntry, clearAllHallOfFame, getLevel, getOverallStats, HallOfFameEntry } from '@/lib/hallOfFame';

export default function HallOfFamePage() {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<number>(0);
  const [stats, setStats] = useState(getOverallStats());

  function refresh() {
    setEntries(loadHallOfFame());
    setStats(getOverallStats());
  }

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const matchSearch = e.studentName.toLowerCase().includes(search.toLowerCase());
      const matchLevel = filterLevel === 0 || e.level === filterLevel;
      return matchSearch && matchLevel;
    });
  }, [entries, search, filterLevel]);

  function handleDelete(name: string) {
    if (!confirm(`Hapus "${name}" dari Hall of Fame? Semua riwayat poinnya akan hilang.`)) return;
    deleteHallOfFameEntry(name);
    refresh();
  }

  function handleClearAll() {
    if (!confirm('⚠️ Hapus SEMUA data Hall of Fame? Tindakan ini TIDAK bisa dibatalkan.')) return;
    clearAllHallOfFame();
    refresh();
  }

  const top3 = entries.slice(0, 3);
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6">
        <Link href="/host" className="text-sm text-slate-400 hover:text-white transition">← Kembali ke Dashboard</Link>
      </div>

      <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black flex items-center gap-3">
            <span className="text-5xl">🏆</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600">
              Hall of Fame
            </span>
          </h1>
          <p className="text-slate-400 mt-1">Klasemen sepanjang masa. Nama-nama terbaik yang pernah bertanding.</p>
        </div>
        {entries.length > 0 && (
          <button onClick={handleClearAll} className="text-xs text-rose-400 hover:text-rose-300 font-semibold border border-rose-500/30 px-3 py-1.5 rounded-lg hover:bg-rose-500/10">
            🗑️ Reset Semua
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">🏛️</div>
          <h2 className="text-xl font-semibold mb-2">Hall of Fame masih kosong</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Selesaikan sesi kuis pertama Anda. Setiap siswa yang ikut akan otomatis masuk ke papan kehormatan ini berdasarkan akumulasi skor mereka.
          </p>
          <Link href="/host" className="btn-primary">Mulai Sesi Baru →</Link>
        </div>
      ) : (
        <>
          {/* Statistik Keseluruhan */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="card bg-gradient-to-br from-brand-500/10 to-brand-500/5 border-brand-500/20 text-center py-4">
              <div className="text-3xl mb-1">👥</div>
              <div className="text-2xl font-black text-brand-400">{stats.totalStudents}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Total Siswa</div>
            </div>
            <div className="card bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-center py-4">
              <div className="text-3xl mb-1">🎮</div>
              <div className="text-2xl font-black text-emerald-400">{stats.totalSessions}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Sesi Dimainkan</div>
            </div>
            <div className="card bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 text-center py-4">
              <div className="text-3xl mb-1">⭐</div>
              <div className="text-2xl font-black text-amber-400">{(stats.totalScore / 1000).toFixed(1)}K</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Total Poin</div>
            </div>
            <div className="card bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-center py-4">
              <div className="text-3xl mb-1">📊</div>
              <div className="text-2xl font-black text-cyan-400">{(stats.avgScore / 1000).toFixed(1)}K</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Rata-rata Poin</div>
            </div>
          </div>

          {/* Podium Top 3 */}
          {entries.length >= 1 && (
            <div className="mb-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 border border-white/10 shadow-2xl">
              <h2 className="text-center text-sm uppercase tracking-widest text-slate-400 font-bold mb-6">🌟 Top 3 Sepanjang Masa 🌟</h2>
              <div className="flex justify-center items-end gap-4">
                {/* Juara 2 */}
                {second && (
                  <div className="w-40 flex flex-col items-center">
                    <div className="text-5xl mb-2">🥈</div>
                    <div className="font-bold text-lg text-slate-200 mb-1 truncate w-full text-center px-1">{second.studentName}</div>
                    <div className="text-brand-400 font-mono font-bold text-sm mb-2">{(second.totalScore / 1000).toFixed(1)}K</div>
                    <div className="w-full h-24 bg-gradient-to-t from-slate-700 to-slate-500 rounded-t-lg border-t-4 border-slate-300 flex items-center justify-center">
                      <span className="text-slate-900 font-black opacity-40 text-2xl">2</span>
                    </div>
                  </div>
                )}
                {/* Juara 1 */}
                {first && (
                  <div className="w-48 flex flex-col items-center relative">
                    <div className="absolute -top-10 text-6xl animate-bounce">👑</div>
                    <div className="text-6xl mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]">🥇</div>
                    <div className="font-black text-xl text-amber-400 mb-1 truncate w-full text-center px-1">{first.studentName}</div>
                    <div className="text-amber-300 font-mono font-black text-lg mb-2">{(first.totalScore / 1000).toFixed(1)}K</div>
                    <div className="w-full h-32 bg-gradient-to-t from-amber-700 to-amber-400 rounded-t-lg border-t-4 border-amber-200 flex items-center justify-center">
                      <span className="text-amber-900 font-black opacity-40 text-4xl">1</span>
                    </div>
                  </div>
                )}
                {/* Juara 3 */}
                {third && (
                  <div className="w-40 flex flex-col items-center">
                    <div className="text-5xl mb-2">🥉</div>
                    <div className="font-bold text-lg text-slate-200 mb-1 truncate w-full text-center px-1">{third.studentName}</div>
                    <div className="text-brand-400 font-mono font-bold text-sm mb-2">{(third.totalScore / 1000).toFixed(1)}K</div>
                    <div className="w-full h-16 bg-gradient-to-t from-orange-800 to-orange-600 rounded-t-lg border-t-4 border-orange-400 flex items-center justify-center">
                      <span className="text-orange-900 font-black opacity-40 text-2xl">3</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filter & Search */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Cari nama siswa..."
              className="flex-1 min-w-[200px] rounded-xl bg-white/5 border border-white/10 px-4 py-2 outline-none focus:border-brand-500 text-sm"
            />
            <select value={filterLevel} onChange={e => setFilterLevel(Number(e.target.value))} className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 outline-none focus:border-brand-500 text-sm [&>option]:bg-slate-800">
              <option value={0}>Semua Level</option>
              <option value={1}>🥚 Pemula</option>
              <option value={2}>🎓 Pelajar</option>
              <option value={3}>🎯 Ahli</option>
              <option value={4}>🏆 Master</option>
              <option value={5}>👑 Legenda</option>
            </select>
          </div>

          {/* Tabel Klasemen */}
          <div className="card overflow-hidden">
            <div className="text-xs text-slate-400 mb-3">Menampilkan {filtered.length} dari {entries.length} siswa</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="text-left py-3 px-2">#</th>
                    <th className="text-left">Nama</th>
                    <th className="text-left">Level</th>
                    <th className="text-left hidden md:table-cell">Badge</th>
                    <th className="text-right">Total Poin</th>
                    <th className="text-right hidden md:table-cell">Sesi</th>
                    <th className="text-right hidden lg:table-cell">Best Score</th>
                    <th className="text-right hidden lg:table-cell">Terakhir Main</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry, index) => {
                    const lvl = getLevel(entry.totalScore);
                    const actualRank = entries.indexOf(entry) + 1;
                    return (
                      <tr key={entry.studentName} className={'border-b border-white/5 ' + (actualRank <= 3 ? 'bg-gradient-to-r from-amber-500/5 to-transparent' : '')}>
                        <td className="py-3 px-2">
                          <span className={`font-mono font-bold ${actualRank === 1 ? 'text-amber-400' : actualRank === 2 ? 'text-slate-300' : actualRank === 3 ? 'text-orange-400' : 'text-slate-500'}`}>
                            {actualRank <= 3 && '🏅 '}#{actualRank}
                          </span>
                        </td>
                        <td className="font-semibold">{entry.studentName}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${lvl.bg} ${lvl.color}`}>
                            {lvl.icon} {lvl.label}
                          </span>
                        </td>
                        <td className="hidden md:table-cell">
                          <div className="flex gap-1 flex-wrap">
                            {entry.badges.length > 0 ? entry.badges.map((b, i) => (
                              <span key={i} className="text-sm" title={b}>{b.split(' ')[0]}</span>
                            )) : <span className="text-xs text-slate-600 italic">-</span>}
                          </div>
                        </td>
                        <td className="text-right font-mono font-bold text-brand-400">{entry.totalScore.toLocaleString('id-ID')}</td>
                        <td className="text-right hidden md:table-cell">{entry.totalSessions}x</td>
                        <td className="text-right hidden lg:table-cell font-mono text-xs text-slate-400">{entry.bestScore.toLocaleString('id-ID')}</td>
                        <td className="text-right hidden lg:table-cell text-xs text-slate-500">{formatDate(entry.lastPlayed)}</td>
                        <td className="text-center">
                          <button onClick={() => handleDelete(entry.studentName)} className="p-1.5 rounded-md hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition" title="Hapus">🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">Tidak ada siswa yang cocok dengan filter.</div>
              )}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            💾 Data tersimpan di browser Anda. Level: 🥚 Pemula (0) → 🎓 Pelajar (5K) → 🎯 Ahli (15K) → 🏆 Master (30K) → 👑 Legenda (50K+)
          </div>
        </>
      )}
    </main>
  );
}
