'use client';
import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toPng } from 'html-to-image';
import { StudentProfileCard } from '@/components/StudentProfileCard';

const LEVEL_META: Record<number, { label: string; icon: string; color: string; nextLevel: number; nextLabel: string }> = {
  1: { label: 'Pemula', icon: '🥚', color: 'text-slate-300', nextLevel: 5000, nextLabel: 'Pelajar' },
  2: { label: 'Pelajar', icon: '🎓', color: 'text-emerald-300', nextLevel: 15000, nextLabel: 'Ahli' },
  3: { label: 'Ahli', icon: '🎯', color: 'text-cyan-300', nextLevel: 30000, nextLabel: 'Master' },
  4: { label: 'Master', icon: '🏆', color: 'text-amber-300', nextLevel: 50000, nextLabel: 'Legenda' },
  5: { label: 'Legenda', icon: '👑', color: 'text-purple-300', nextLevel: 0, nextLabel: 'MAX' },
};

export default function ProfileDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [shareModal, setShareModal] = useState<{ dataUrl: string; message: string } | null>(null);

  const decodedName = decodeURIComponent(name);

  useEffect(() => {
    fetch('/api/hall-of-fame/' + encodeURIComponent(decodedName), { cache: 'no-store' })
      .then(async r => {
        const data = await r.json();
        if (!r.ok || !data.student) throw new Error(data.error || 'Profil tidak ditemukan');
        return data.student;
      })
      .then(setStudent)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [decodedName]);

  async function captureCard(): Promise<string> {
    if (!cardRef.current) throw new Error('Card belum siap');
    return await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2, skipFonts: true });
  }

  async function downloadCard() {
    setDownloading(true);
    try {
      const dataUrl = await captureCard();
      const link = document.createElement('a');
      link.download = `Kartu_Profil_${student.studentName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e: any) { alert('Gagal download: ' + e.message); }
    setDownloading(false);
  }

  async function shareCard() {
    if (!student) return;
    setDownloading(true);
    try {
      const dataUrl = await captureCard();
      const fileName = `Kartu_Profil_${student.studentName.replace(/\s+/g, '_')}.png`;
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/png' });

      const message = `🏆 Lihat kartu profil ${student.studentName} di EduLive Arena!\n\n⭐ Level: ${student.levelLabel} ${student.levelIcon}\n💯 Total Skor: ${student.totalScore.toLocaleString('id-ID')}\n🎯 Akurasi: ${student.accuracy}%\n🏅 Peringkat: #${student.rank} dari ${student.totalStudents} siswa\n\n_Ayo belajar sambil bermain di EduLive Arena!_ 🎓`;

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Kartu Profil ${student.studentName}`, text: message });
      } else {
        setShareModal({ dataUrl, message });
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') alert('Gagal share: ' + e.message);
    }
    setDownloading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Memuat profil...</p>
        </div>
      </main>
    );
  }

  if (error || !student) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="card max-w-md text-center border-rose-500/30">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold mb-2">Profil Tidak Ditemukan</h2>
          <p className="text-slate-400 text-sm mb-4">{error || 'Nama ini belum pernah tercatat di Hall of Fame.'}</p>
          <div className="text-xs text-slate-500 bg-white/5 p-3 rounded-lg mb-4 text-left space-y-1">
            <div className="font-semibold text-slate-400 mb-1">💡 Kemungkinan penyebab:</div>
            <div>• Nama Anda berbeda dengan saat mengikuti kuis</div>
            <div>• Anda belum pernah mengikuti kuis sama sekali</div>
            <div>• Guru belum menyelesaikan sesi kuis</div>
          </div>
          <Link href="/profile" className="btn-primary">← Coba Nama Lain</Link>
        </div>
      </main>
    );
  }

  const meta = LEVEL_META[student.level] || LEVEL_META[1];
  const progressPercent = meta.nextLevel > 0 ? Math.min(100, Math.round((student.totalScore / meta.nextLevel) * 100)) : 100;
  const toNext = meta.nextLevel > 0 ? meta.nextLevel - student.totalScore : 0;

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/profile" className="text-sm text-slate-400 hover:text-white transition">← Profil Lain</Link>
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition">Beranda →</Link>
      </div>

      {/* Hidden Card for Rendering */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}>
        <StudentProfileCard ref={cardRef} student={student} />
      </div>

      {/* Visible Card Preview */}
      <div className="flex justify-center mb-6">
        <div className="shadow-2xl rounded-3xl overflow-hidden">
          <StudentProfileCard student={student} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-6">
        <button onClick={downloadCard} disabled={downloading} className="flex-1 btn-primary bg-gradient-to-r from-indigo-500 to-blue-600 disabled:opacity-50">
          {downloading ? '⏳' : '📥'} Download Kartu
        </button>
        <button onClick={shareCard} disabled={downloading} className="flex-1 btn-primary bg-gradient-to-r from-emerald-500 to-green-600 disabled:opacity-50">
          {downloading ? '⏳' : '📱'} Share ke WA
        </button>
      </div>

      {/* Level Progress */}
      {meta.nextLevel > 0 && (
        <div className="card mb-4 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold text-slate-300">Progres ke Level {meta.nextLabel}</div>
            <div className="text-xs text-amber-400 font-mono">{student.totalScore.toLocaleString('id-ID')} / {meta.nextLevel.toLocaleString('id-ID')}</div>
          </div>
          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all" style={{ width: progressPercent + '%' }} />
          </div>
          <div className="text-xs text-slate-400 mt-2">
            🎯 <b className="text-amber-400">{(toNext).toLocaleString('id-ID')} poin lagi</b> untuk naik ke level {meta.nextLabel}!
          </div>
        </div>
      )}

      {meta.nextLevel === 0 && (
        <div className="card mb-4 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 text-center">
          <div className="text-4xl mb-2">👑</div>
          <div className="font-bold text-purple-300">Anda sudah mencapai LEVEL MAKSIMAL!</div>
          <div className="text-xs text-slate-400 mt-1">Anda adalah Legenda EduLive Arena</div>
        </div>
      )}

      {/* Stats Breakdown */}
      <div className="card mb-4">
        <h2 className="font-bold mb-3">📊 Statistik Lengkap</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-slate-400 uppercase">Total Skor</div>
            <div className="text-xl font-mono font-bold text-amber-400">{student.totalScore.toLocaleString('id-ID')}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-slate-400 uppercase">Skor Terbaik</div>
            <div className="text-xl font-mono font-bold text-emerald-400">{student.bestScore?.toLocaleString('id-ID') || 0}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-slate-400 uppercase">Sesi Dimainkan</div>
            <div className="text-xl font-mono font-bold text-indigo-400">{student.totalSessions}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-slate-400 uppercase">Akurasi</div>
            <div className="text-xl font-mono font-bold text-cyan-400">{student.accuracy}%</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-slate-400 uppercase">Jawaban Benar</div>
            <div className="text-xl font-mono font-bold text-emerald-400">{student.totalCorrect}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-slate-400 uppercase">Total Jawaban</div>
            <div className="text-xl font-mono font-bold text-slate-300">{student.totalAnswers}</div>
          </div>
        </div>
      </div>

      {/* Badges */}
      {student.badges && student.badges.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-bold mb-3">🏅 Badge Koleksi</h2>
          <div className="flex flex-wrap gap-2">
            {student.badges.map((b: string, i: number) => (
              <div key={i} className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-3 py-2 rounded-lg text-sm font-semibold text-amber-200">
                {b}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Modal (Desktop) */}
      {shareModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-emerald-500/30 max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">📱 Share Kartu Profil</h3>
            </div>
            <div className="p-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
                <div className="text-xs text-emerald-300 font-semibold mb-1">📋 Preview Pesan:</div>
                <div className="text-sm text-slate-200 whitespace-pre-wrap text-xs leading-relaxed max-h-40 overflow-y-auto">{shareModal.message}</div>
              </div>
              <div className="space-y-2">
                <button onClick={() => { const link = document.createElement('a'); link.href = shareModal.dataUrl; link.download = `Kartu_Profil_${student.studentName.replace(/\s+/g, '_')}.png`; link.click(); }} className="w-full btn-primary bg-indigo-600 hover:bg-indigo-700">📥 1. Download Kartu</button>
                <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareModal.message)}`, '_blank')} className="w-full btn-primary bg-emerald-600 hover:bg-emerald-700">📱 2. Buka WhatsApp</button>
              </div>
              <button onClick={() => setShareModal(null)} className="w-full mt-3 text-sm text-slate-400 hover:text-white">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
