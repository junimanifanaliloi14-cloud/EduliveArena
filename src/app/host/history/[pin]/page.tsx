'use client';
import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { Certificate } from '@/components/Certificate';
import { ParentReport } from '@/components/ParentReport';
import { getHistorySession, SavedSession } from '@/lib/historyHelper';

export default function HistoryDetailPage({ params }: { params: Promise<{ pin: string }> }) {
  const { pin } = use(params);
  const [session, setSession] = useState<SavedSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  const certRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [currentRank, setCurrentRank] = useState(1);
  const [downloadingPlayerId, setDownloadingPlayerId] = useState<string | null>(null);
  const [downloadingType, setDownloadingType] = useState<'cert' | 'report' | null>(null);
  const [isDownloadingAllCerts, setIsDownloadingAllCerts] = useState(false);
  const [isDownloadingAllReports, setIsDownloadingAllReports] = useState(false);
  const [certProgress, setCertProgress] = useState(0);
  const [reportProgress, setReportProgress] = useState(0);

  useEffect(() => {
    const s = getHistorySession(pin);
    setSession(s);
    setLoaded(true);
  }, [pin]);

  async function captureElement(ref: React.RefObject<HTMLDivElement>): Promise<string> {
    if (!ref.current) throw new Error('Ref belum siap');
    return await toPng(ref.current, { cacheBust: true, pixelRatio: 2, skipFonts: true });
  }

  async function downloadSingle(player: any, rank: number, type: 'cert' | 'report') {
    if (!session) return;
    setDownloadingPlayerId(player.id);
    setDownloadingType(type);
    setCurrentPlayer(player);
    setCurrentRank(rank);
    try {
      await new Promise(r => setTimeout(r, 350));
      const ref = type === 'cert' ? certRef : reportRef;
      const dataUrl = await captureElement(ref);
      const link = document.createElement('a');
      link.download = `${type === 'cert' ? 'Sertifikat' : 'Rapor'}_${rank}_${player.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) { alert('Gagal: ' + (e as Error).message); }
    setDownloadingPlayerId(null);
    setDownloadingType(null);
  }

  async function downloadAll(type: 'cert' | 'report') {
    if (!session) return;
    if (type === 'cert') { setIsDownloadingAllCerts(true); setCertProgress(0); }
    else { setIsDownloadingAllReports(true); setReportProgress(0); }
    const zip = new JSZip();
    const total = session.players.length;
    try {
      for (let i = 0; i < total; i++) {
        const player = session.players[i];
        setCurrentPlayer(player);
        setCurrentRank(i + 1);
        await new Promise(r => setTimeout(r, 350));
        const ref = type === 'cert' ? certRef : reportRef;
        const dataUrl = await captureElement(ref);
        const base64 = dataUrl.split(',')[1];
        const rankPad = String(i + 1).padStart(2, '0');
        const prefix = type === 'cert' ? 'Sertifikat' : 'Rapor';
        zip.file(`${prefix}_${rankPad}_${player.name.replace(/\s+/g, '_')}.png`, base64, { base64: true });
        if (type === 'cert') setCertProgress(i + 1);
        else setReportProgress(i + 1);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const safeName = session.bankName.replace(/\s+/g, '_');
      const prefix = type === 'cert' ? 'Sertifikat' : 'Rapor';
      link.download = `${prefix}_${safeName}_PIN_${session.pin}.zip`;
      link.click();
    } catch (e) { alert('Gagal membuat ZIP: ' + (e as Error).message); }
    if (type === 'cert') setIsDownloadingAllCerts(false);
    else setIsDownloadingAllReports(false);
    setCurrentPlayer(null);
  }

  function downloadCSV() {
    if (!session) return;
    const headers = ['Peringkat', 'Nama', 'Grup', 'Skor', 'Jawaban Benar', 'Total Jawaban', 'Akurasi (%)', 'Pencapaian', 'Status'];
    const rows = session.players.map((p: any, i: number) => {
      const badgeStr = p.badges.map((b: any) => `${b.icon} ${b.label}`).join(' | ');
      const groupStr = p.group || '-';
      const statusStr = p.isEliminated ? 'Tereliminasi' : 'Bertahan';
      return [ i + 1, `"${p.name}"`, `"${groupStr}"`, p.score, p.correct, p.total, p.accuracy, `"${badgeStr}"`, statusStr ].join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Kuis_${session.bankName.replace(/\s+/g, '_')}_PIN_${session.pin}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  if (!loaded) return <div className="p-10 text-slate-400">Memuat...</div>;
  if (!session) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 text-center">
        <div className="card py-16">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-xl font-semibold mb-2">Riwayat tidak ditemukan</h2>
          <p className="text-slate-400 text-sm mb-6">Sesi ini mungkin sudah dihapus.</p>
          <button onClick={() => router.push('/host/history')} className="btn-primary">Kembali ke Riwayat</button>
        </div>
      </main>
    );
  }

  const dateStr = new Date(session.endedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}>
        {currentPlayer && (
          <>
            <Certificate ref={certRef} playerName={currentPlayer.name} score={currentPlayer.score} rank={currentRank} totalPlayers={session.players.length} bankName={session.bankName} hostName={session.hostName} hostAvatar={session.hostAvatar} hostLogo={session.hostLogo} date={dateStr} />
            <ParentReport ref={reportRef} studentName={currentPlayer.name} score={currentPlayer.score} rank={currentRank} totalPlayers={session.players.length} accuracy={currentPlayer.accuracy} correctCount={currentPlayer.correct} totalQuestions={session.totalQuestions} badges={currentPlayer.badges} bankName={session.bankName} hostName={session.hostName} hostAvatar={session.hostAvatar} hostLogo={session.hostLogo} groupMode={session.groupMode} groupName={currentPlayer.group} date={dateStr} hardestQuestions={session.hardestQuestions} />
          </>
        )}
      </div>

      <div>
        <Link href="/host/history" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"><span>←</span> Kembali ke Riwayat</Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs bg-slate-500/20 text-slate-300 px-2 py-0.5 rounded-full border border-slate-500/30">📚 Arsip</span>
            {session.groupMode && <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">Grup</span>}
          </div>
          <h1 className="text-2xl font-bold mt-1">{session.bankName}</h1>
          <p className="text-slate-400 text-sm">{session.hostName} - {session.playerCount} murid - {session.totalQuestions} soal</p>
          <p className="text-slate-500 text-xs mt-1">📅 {new Date(session.endedAt).toLocaleString('id-ID')}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">PIN</div>
          <div className="text-3xl font-mono font-bold text-brand-500 tracking-widest">{session.pin}</div>
        </div>
      </header>

      {session.groupMode && session.groupScores && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Object.keys(session.groupScores).length}, minmax(0, 1fr))` }}>
          {Object.entries(session.groupScores).map(([name, score]: any) => (
            <div key={name} className="card bg-brand-500/5 border-brand-500/20 flex flex-col items-center justify-center py-4">
              <span className="font-bold text-brand-400 text-lg uppercase tracking-wider">{name}</span>
              <span className="font-mono text-3xl font-bold mt-1">{score}</span>
            </div>
          ))}
        </div>
      )}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <h2 className="font-semibold text-lg">Laporan Lengkap</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadCSV} className="btn-primary bg-slate-600 hover:bg-slate-700 text-sm px-3">⬇️ CSV</button>
            <button onClick={() => downloadAll('report')} disabled={isDownloadingAllReports} className="btn-primary bg-gradient-to-r from-indigo-500 to-blue-600 text-sm px-3 disabled:opacity-50">{isDownloadingAllReports ? `📄 ${reportProgress}/${session.players.length}...` : '📄 Semua Rapor (ZIP)'}</button>
            <button onClick={() => downloadAll('cert')} disabled={isDownloadingAllCerts} className="btn-primary bg-gradient-to-r from-amber-500 to-orange-600 text-sm px-3 disabled:opacity-50">{isDownloadingAllCerts ? `📜 ${certProgress}/${session.players.length}...` : '📜 Semua Sertifikat (ZIP)'}</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-400 border-b border-white/10">
              <tr>
                <th className="text-left py-2">#</th>
                <th className="text-left">Nama</th>
                {session.groupMode && <th className="text-left">Grup</th>}
                <th className="text-left">Pencapaian</th>
                <th className="text-right">Skor</th>
                <th className="text-right">Akurasi</th>
                <th className="text-center">Unduh</th>
              </tr>
            </thead>
            <tbody>
              {session.players.map((p: any, i: number) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-3">{i + 1}</td>
                  <td>{p.name} {p.isEliminated && '💀'}</td>
                  {session.groupMode && <td><span className="text-xs font-bold px-2 py-1 rounded bg-white/10">{p.group || '-'}</span></td>}
                  <td><div className="flex gap-1">{p.badges.map((b: any, idx: number) => (<span key={idx} title={b.label} className="cursor-help text-lg">{b.icon}</span>))}{p.badges.length === 0 && <span className="text-slate-600 text-xs italic">-</span>}</div></td>
                  <td className="text-right font-mono">{p.score}</td>
                  <td className="text-right">{p.accuracy}%</td>
                  <td className="text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => downloadSingle(p, i + 1, 'report')} disabled={downloadingPlayerId === p.id || isDownloadingAllReports || isDownloadingAllCerts} className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition disabled:opacity-50" title="Rapor">{downloadingPlayerId === p.id && downloadingType === 'report' ? '⏳' : '📄'}</button>
                      <button onClick={() => downloadSingle(p, i + 1, 'cert')} disabled={downloadingPlayerId === p.id || isDownloadingAllReports || isDownloadingAllCerts} className="p-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition disabled:opacity-50" title="Sertifikat">{downloadingPlayerId === p.id && downloadingType === 'cert' ? '⏳' : '📜'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {session.hardestQuestions && session.hardestQuestions.length > 0 && (
          <div className="border-t border-white/10 pt-6 mt-6">
            <h3 className="font-semibold text-lg text-rose-400 mb-4 flex items-center gap-2"><span>🚨</span> Analisis Soal Tersulit</h3>
            <div className="space-y-3">
              {session.hardestQuestions.map((q: any, idx: number) => {
                const wrongPct = q.total > 0 ? Math.round((q.wrong / q.total) * 100) : 0;
                return (
                  <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div className="font-medium text-sm text-slate-200">{q.text}</div>
                      <div className="text-xs text-slate-400 whitespace-nowrap">{q.wrong} dari {q.total} salah</div>
                    </div>
                    <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-rose-500" style={{ width: `${wrongPct}%` }} /></div>
                    <div className="text-right text-xs text-rose-400 mt-1 font-mono">{wrongPct}% Salah</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
