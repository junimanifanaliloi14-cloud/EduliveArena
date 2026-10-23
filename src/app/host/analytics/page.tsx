'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { getAnalyticsData, AnalyticsData } from '@/lib/analyticsHelper';

type RangeKey = 7 | 30 | 90 | 0;

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setData(getAnalyticsData(range));
    setLoaded(true);
  }, [range]);

  if (!loaded || !data) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="text-center"><div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-slate-400">Menganalisis data...</p></div>
      </main>
    );
  }

  const hasAnyData = data.totalSessions > 0 || data.topStudents.length > 0 || data.totalPracticeSessions > 0;

  if (!hasAnyData) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/host" className="text-sm text-slate-400 hover:text-white">← Kembali ke Dashboard</Link>
        <div className="card text-center py-16 mt-6">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold mb-2">Belum Ada Data</h1>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">Selesaikan sesi kuis pertama Anda untuk mulai melihat insight analitik kelas Anda di sini.</p>
          <Link href="/host" className="btn-primary">Mulai Kuis Pertama →</Link>
        </div>
      </main>
    );
  }

  const totalForPie = data.levelDistribution.reduce((a, b) => a + b.count, 0);
  const pieData = data.levelDistribution.filter(l => l.count > 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex justify-between items-center flex-wrap gap-3 mb-6">
        <div>
          <Link href="/host" className="text-sm text-slate-400 hover:text-white">← Kembali ke Dashboard</Link>
          <h1 className="text-3xl font-bold mt-2 flex items-center gap-3"><span className="text-4xl">📊</span> Analytics Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Insight kelas Anda dalam satu tampilan.</p>
        </div>
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-white/10">
          {([
            { key: 7, label: '7 Hari' },
            { key: 30, label: '30 Hari' },
            { key: 90, label: '90 Hari' },
            { key: 0, label: 'Semua' },
          ] as const).map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key as RangeKey)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${range === r.key ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card bg-gradient-to-br from-brand-500/10 to-brand-500/5 border-brand-500/20">
          <div className="text-3xl mb-2">🎮</div>
          <div className="text-3xl font-black text-brand-400">{data.totalSessions}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Sesi Kuis</div>
        </div>
        <div className="card bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-3xl font-black text-indigo-400">{data.totalStudents}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Siswa Unik</div>
        </div>
        <div className="card bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <div className="text-3xl mb-2">✍️</div>
          <div className="text-3xl font-black text-emerald-400">{data.totalAnswers.toLocaleString('id-ID')}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Jawaban</div>
        </div>
        <div className="card bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <div className="text-3xl mb-2">🎯</div>
          <div className="text-3xl font-black text-amber-400">{data.avgAccuracy}%</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Akurasi Rata-rata</div>
        </div>
      </div>

      {/* TREND CHART */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">📈 Tren Aktivitas</h2>
          <div className="text-xs text-slate-400">Sesi & rata-rata skor tertinggi</div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.dailyStats} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #f97316', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#f97316', fontWeight: 'bold' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="sessions" stroke="#f97316" strokeWidth={2.5} name="Sesi" dot={{ fill: '#f97316', r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={2} name="Skor Tertinggi" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* TOP BANKS + TOP STUDENTS */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="font-bold text-lg mb-4">🔥 Bank Soal Terpopuler</h2>
          {data.topBanks.length === 0 ? (
            <div className="text-center text-slate-500 py-6 text-sm">Belum ada data.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topBanks} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" width={120} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #f97316', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#f97316" radius={[0, 6, 6, 0]} name="Dimainkan" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="font-bold text-lg mb-4">🏆 Top 10 Siswa</h2>
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
            {data.topStudents.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 text-center font-mono font-bold text-sm flex-shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-500'}`}>#{i + 1}</span>
                  <span className="text-lg flex-shrink-0">{s.levelIcon}</span>
                  <span className="font-medium text-sm truncate">{s.name}</span>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="font-mono font-bold text-brand-400 text-sm">{s.totalScore.toLocaleString('id-ID')}</div>
                  <div className="text-[10px] text-slate-500">{s.sessions}x main</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LEVEL DISTRIBUTION + ACTIVITY HEATMAP */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-bold text-lg mb-4">📊 Distribusi Level Siswa</h2>
          {totalForPie === 0 ? (
            <div className="text-center text-slate-500 py-6 text-sm">Belum ada siswa di Hall of Fame.</div>
          ) : (
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #f97316', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {data.levelDistribution.map(l => (
                  <div key={l.level} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span>{l.icon}</span>
                      <span className="text-slate-300">{l.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{l.count}</span>
                      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: totalForPie > 0 ? `${(l.count / totalForPie) * 100}%` : '0%', backgroundColor: l.color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">🔥 Heatmap Aktivitas</h2>
            <div className="text-xs text-slate-400">90 hari terakhir</div>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.heatmap.map((h, i) => {
              const colors = ['bg-slate-800/60', 'bg-emerald-900/60', 'bg-emerald-700/70', 'bg-emerald-500/80', 'bg-emerald-400'];
              return (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-sm ${colors[h.level]} hover:ring-2 hover:ring-brand-400 transition`}
                  title={`${h.date}: ${h.count} sesi`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
            <span>Sedikit</span>
            <div className="flex gap-1">
              {['bg-slate-800/60', 'bg-emerald-900/60', 'bg-emerald-700/70', 'bg-emerald-500/80', 'bg-emerald-400'].map((c, i) => (
                <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
              ))}
            </div>
            <span>Banyak</span>
          </div>
        </div>
      </div>

      {/* PRACTICE STATS */}
      {data.totalPracticeSessions > 0 && (
        <div className="card mt-6 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border-indigo-500/20">
          <div className="flex items-center gap-4">
            <div className="text-5xl">📝</div>
            <div>
              <div className="font-bold text-lg">Latihan Mandiri Siswa</div>
              <p className="text-sm text-slate-400"><span className="text-indigo-400 font-bold text-lg">{data.totalPracticeSessions}</span> sesi latihan mandiri dalam periode ini.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-slate-500">
        💡 Data bersumber dari riwayat sesi, Hall of Fame, dan riwayat latihan di browser ini.
      </div>
    </main>
  );
}
