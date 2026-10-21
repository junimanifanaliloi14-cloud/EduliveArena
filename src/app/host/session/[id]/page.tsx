'use client';
import { useSessionSocket } from '@/lib/useSocket';
import { use, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function ControlPanel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, connected } = useSessionSocket(id);
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);

  async function action(a: 'start' | 'next' | 'reveal' | 'end') {
    setBusy(a);
    const res = await fetch('/api/sessions/' + id + '/control', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: a }),
    });
    const data = await res.json();
    if (a === 'end' && data.ok) {
      const r = await fetch('/api/sessions/' + id).then(r => r.json());
      setReport(r.report);
    }
    setBusy(null);
  }

  async function kickPlayer(playerId: string, playerName: string) {
    if (!confirm(`Tendang ${playerName} dari sesi ini?`)) return;
    setBusy('kick_' + playerId);
    await fetch(`/api/sessions/${id}/kick`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
    setBusy(null);
  }

  function downloadCSV() {
    if (!report) return;
    const headers = ['Peringkat', 'Nama', 'Tim', 'Skor', 'Jawaban Benar', 'Total Jawaban', 'Akurasi (%)', 'Pencapaian'];
    const rows = report.players.map((p: any, i: number) => {
      const badgeStr = p.badges.map((b: any) => `${b.icon} ${b.label}`).join(' | ');
      const teamStr = p.team ? (p.team === 'A' ? 'Merah' : 'Biru') : '-';
      return [ i + 1, `"${p.name}"`, `"${teamStr}"`, p.score, p.correct, p.total, p.accuracy, `"${badgeStr}"` ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Kuis_${report.bankName.replace(/\s+/g, '_')}_PIN_${report.pin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (!state) return <div className="p-10 text-slate-400">Memuat sesi...</div>;
  const s = state.session;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const playUrl = origin + '/play/' + s.pin;
  const overlayUrl = origin + '/overlay/' + s.id;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div>
        <Link href="/host" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
          <span>←</span> Kembali ke Dashboard
        </Link>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={'h-2.5 w-2.5 rounded-full ' + (connected ? 'bg-emerald-400' : 'bg-red-500')} />
            <span className="text-xs uppercase tracking-wider text-slate-400">{s.status} - {s.questionState}</span>
            {s.teamMode && <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">Mode Tim</span>}
          </div>
          <h1 className="text-2xl font-bold mt-1">{s.bankName}</h1>
          <p className="text-slate-400 text-sm">{s.hostName} - {state.playerCount} murid</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">PIN</div>
          <div className="text-3xl font-mono font-bold text-brand-500 tracking-widest">{s.pin}</div>
        </div>
      </header>

      {s.teamMode && s.teamScores && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card border-red-500/30 bg-red-500/5 flex items-center justify-between">
            <span className="font-bold text-red-400">TIM MERAH</span>
            <span className="font-mono text-3xl font-bold">{s.teamScores.A}</span>
          </div>
          <div className="card border-blue-500/30 bg-blue-500/5 flex items-center justify-between">
            <span className="font-bold text-blue-400">TIM BIRU</span>
            <span className="font-mono text-3xl font-bold">{s.teamScores.B}</span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="text-sm text-slate-400 mb-1">Link murid</div>
            <a href={playUrl} target="_blank" className="text-brand-500 break-all text-sm hover:underline">{playUrl}</a>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-sm text-slate-400 mb-1">Overlay OBS (Browser Source)</div>
            <a href={overlayUrl} target="_blank" className="text-brand-500 break-all text-sm hover:underline">{overlayUrl}</a>
          </div>
        </div>

        <div className="card flex flex-col items-center justify-center text-center">
          <div className="text-sm text-slate-400 mb-3">Scan untuk Join</div>
          <div className="bg-white p-2 rounded-xl">
            <QRCodeSVG value={playUrl} size={120} />
          </div>
        </div>
      </div>

      <section className="card">
        <h2 className="font-semibold mb-3">Kontrol</h2>
        <div className="flex flex-wrap gap-2">
          {s.status === 'lobby' && (
            <button onClick={() => action('start')} disabled={!!busy} className="btn-primary">
              {busy === 'start' ? 'Memulai...' : 'Mulai Sesi'}
            </button>
          )}
          {(s.status === 'live' || s.status === 'lobby') && s.questionState === 'idle' && (
            <button onClick={() => action('next')} disabled={!!busy} className="btn-primary">
              {busy === 'next' ? '...' : s.currentQuestionIndex < 0 ? 'Tampilkan Soal 1' : 'Soal Berikutnya ->'}
            </button>
          )}
          {s.questionState === 'showing' && (
            <button onClick={() => action('reveal')} disabled={!!busy} className="btn-ghost">
              {busy === 'reveal' ? '...' : 'Buka Jawaban'}
            </button>
          )}
          {s.questionState === 'revealed' && s.currentQuestionIndex + 1 < s.totalQuestions && (
            <button onClick={() => action('next')} disabled={!!busy} className="btn-primary">
              {busy === 'next' ? '...' : 'Soal Berikutnya ->'}
            </button>
          )}
          {s.questionState === 'revealed' && s.currentQuestionIndex + 1 >= s.totalQuestions && s.status !== 'ended' && (
            <button onClick={() => action('end')} disabled={!!busy} className="btn-danger">
              {busy === 'end' ? '...' : 'Akhiri Sesi'}
            </button>
          )}
        </div>
      </section>

      {state.question && (
        <section className="card">
          <div className="text-xs text-slate-400">
            Soal {s.currentQuestionIndex + 1} / {s.totalQuestions} - {state.question.timeLimitSec} detik
          </div>
          <h3 className="text-xl font-semibold mt-2">{state.question.text}</h3>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {state.question.options.map((o, i) => (
              <div key={i} className={'rounded-xl px-4 py-2 border text-sm ' + (state.question!.correctIndex === i && s.questionState === 'revealed' ? 'border-emerald-500 bg-emerald-500/15' : 'border-white/10 bg-white/5')}>
                <span className="font-mono text-brand-500 mr-2">{String.fromCharCode(65 + i)}</span>{o}
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-slate-400">
            Jawaban terkumpul: <span className="text-white">{state.answerStats.total}</span> - benar:{' '}
            <span className="text-emerald-400">{state.answerStats.correct}</span>
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card">
          <h2 className="font-semibold mb-3">Leaderboard</h2>
          <LeaderboardMini rows={state.leaderboard} teamMode={s.teamMode} />
        </section>

        <section className="card">
          <h2 className="font-semibold mb-3 flex items-center justify-between">
            <span>Daftar Murid</span>
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{state.allPlayers.length}</span>
          </h2>
          <div className="space-y-1 max-h-60 overflow-y-auto pr-2">
            {state.allPlayers.length === 0 && <div className="text-slate-500 text-sm">Belum ada murid.</div>}
            {state.allPlayers.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-white/5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${p.online ? 'bg-emerald-500' : 'bg-slate-600'}`} title={p.online ? 'Online' : 'Offline'} />
                  <span className="font-medium text-sm">{p.name}</span>
                  {s.teamMode && p.team && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.team === 'A' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {p.team === 'A' ? 'Merah' : 'Biru'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => kickPlayer(p.id, p.name)}
                  disabled={busy === 'kick_' + p.id}
                  className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                  title="Tendang murid"
                >
                  {busy === 'kick_' + p.id ? '...' : '🗑️'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {report && (
        <section className="card animate-pop">
          <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
            <div>
              <h2 className="font-semibold text-lg">Laporan Akhir</h2>
              <div className="text-sm text-slate-400">PIN {report.pin} - {report.totalQuestions} soal - {report.players.length} murid</div>
              {report.teamMode && report.teamScores && (
                <div className="text-sm mt-1 font-semibold">
                  <span className="text-red-400">Merah: {report.teamScores.A}</span> vs <span className="text-blue-400">Biru: {report.teamScores.B}</span>
                </div>
              )}
            </div>
            <button onClick={downloadCSV} className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-sm px-4">
              ⬇️ Download CSV (Excel)
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 border-b border-white/10">
                <tr>
                  <th className="text-left py-2">#</th>
                  <th className="text-left">Nama</th>
                  {report.teamMode && <th className="text-left">Tim</th>}
                  <th className="text-left">Pencapaian</th>
                  <th className="text-right">Skor</th>
                  <th className="text-right">Akurasi</th>
                </tr>
              </thead>
              <tbody>
                {report.players.map((p: any, i: number) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-3">{i + 1}</td>
                    <td>{p.name}</td>
                    {report.teamMode && (
                      <td>
                        <span className={`text-xs px-2 py-1 rounded-full ${p.team === 'A' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {p.team === 'A' ? 'Merah' : 'Biru'}
                        </span>
                      </td>
                    )}
                    <td>
                      <div className="flex gap-1">
                        {p.badges.map((b: any, idx: number) => (
                          <span key={idx} title={b.label} className="cursor-help text-lg">{b.icon}</span>
                        ))}
                        {p.badges.length === 0 && <span className="text-slate-600 text-xs italic">-</span>}
                      </div>
                    </td>
                    <td className="text-right font-mono">{p.score}</td>
                    <td className="text-right">{p.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function LeaderboardMini({ rows, teamMode }: { rows: any[], teamMode?: boolean }) {
  if (!rows.length) return <div className="text-slate-500 text-sm">Belum ada pemain.</div>;
  return (
    <motion.ol className="flex flex-col gap-1 relative">
      <AnimatePresence>
        {rows.map(r => (
          <motion.li 
            layout
            key={r.id} 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={'flex items-center justify-between rounded-lg px-3 py-2 ' + (r.rank === 1 ? 'bg-brand-500/15 border border-brand-500/30' : 'bg-white/5')}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 text-center font-mono font-bold text-brand-500">{r.rank}</span>
              <span className="font-medium">{r.name}</span>
              {teamMode && (
                <span className={`text-[10px] font-bold ${r.team === 'A' ? 'text-red-400' : 'text-blue-400'}`}>
                  {r.team === 'A' ? 'Merah' : 'Biru'}
                </span>
              )}
              {r.streak >= 2 && <span className="text-xs text-amber-400">🔥{r.streak}</span>}
            </div>
            <span className="font-mono text-slate-300">{r.score}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ol>
  );
}
