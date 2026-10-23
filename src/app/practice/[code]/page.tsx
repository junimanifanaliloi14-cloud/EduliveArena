'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { savePracticeAttempt } from '@/lib/practiceHistory';
import { playCorrect, playWrong } from '@/lib/sound';

export default function PracticeSession({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'not_found' | 'generic'>('generic');
  const [bank, setBank] = useState<any>(null);
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ correct: boolean; choice: number }[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [savedAttempt, setSavedAttempt] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setBank(null);

    fetch('/api/practice/' + encodeURIComponent(code.toUpperCase()), { cache: 'no-store' })
      .then(async r => {
        const data = await r.json().catch(() => ({ success: false, error: 'Respons tidak valid' }));
        if (!r.ok || !data.success || !data.bank) {
          const msg = data.error || 'Kode latihan tidak valid atau sudah tidak aktif.';
          const err = new Error(msg) as any;
          err.isNotFound = r.status === 404 || /tidak valid|tidak aktif|tidak tersedia/i.test(msg);
          throw err;
        }
        return data.bank;
      })
      .then(bankData => {
        if (cancelled) return;
        setBank(bankData);
      })
      .catch(e => {
        if (cancelled) return;
        setError(e.message || 'Gagal memuat latihan');
        setErrorType(e.isNotFound ? 'not_found' : 'generic');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    if (!started || finished) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [started, finished, startTime]);

  function startPractice() {
    setStartTime(Date.now());
    setStarted(true);
  }

  function selectAnswer(idx: number) {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    const q = bank.questions[currentIdx];
    const isCorrect = idx === q.correctIndex;
    if (isCorrect) playCorrect(); else playWrong();
    setAnswers(prev => [...prev, { correct: isCorrect, choice: idx }]);
  }

  function nextQuestion() {
    if (currentIdx + 1 >= bank.questions.length) {
      finishPractice();
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelectedIdx(null);
    }
  }

  function finishPractice() {
    const total = bank.questions.length;
    const correct = answers.filter(a => a.correct).length;
    const score = correct * 100;
    const accuracy = Math.round((correct / total) * 100);
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const attempt = savePracticeAttempt({ code: bank.code, bankName: bank.bankName, score, correct, total, accuracy, durationSec: duration });
    setSavedAttempt(attempt);
    setFinished(true);
  }

  function restart() {
    setStarted(false); setCurrentIdx(0); setSelectedIdx(null);
    setAnswers([]); setFinished(false); setElapsed(0); setSavedAttempt(null);
    setLoading(true); setError('');
    fetch('/api/practice/' + encodeURIComponent(code.toUpperCase()), { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.success && d.bank) setBank(d.bank); else setError(d.error || 'Gagal'); })
      .catch(() => setError('Gagal memuat ulang'))
      .finally(() => setLoading(false));
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ============= LOADING =============
  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Memuat latihan...</p>
        </div>
      </main>
    );
  }

  // ============= ERROR / KODE DIHAPUS =============
  if (error || !bank) {
    const isNotFound = errorType === 'not_found' || !bank;
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="card max-w-md text-center animate-pop border-rose-500/30">
          <div className="text-6xl mb-4">{isNotFound ? '🔒' : '⚠️'}</div>
          <h2 className="text-xl font-bold mb-2">
            {isNotFound ? 'Kode Latihan Tidak Tersedia' : 'Terjadi Kesalahan'}
          </h2>
          <p className="text-slate-400 text-sm mb-2">
            {isNotFound 
              ? (error || 'Kode ini mungkin sudah dihapus oleh guru, sudah kadaluarsa, atau tidak pernah ada.')
              : (error || 'Gagal memuat latihan. Silakan coba lagi.')}
          </p>
          {isNotFound && (
            <div className="text-xs text-slate-500 bg-white/5 p-3 rounded-lg my-4 text-left space-y-1">
              <div className="font-semibold text-slate-400 mb-1">💡 Apa yang bisa Anda lakukan?</div>
              <div>• Minta kode baru kepada guru Anda</div>
              <div>• Periksa apakah kode yang Anda ketik sudah benar</div>
              <div>• Hubungi guru jika masih bermasalah</div>
            </div>
          )}
          <Link href="/practice" className="btn-primary mt-4 block">← Coba Kode Lain</Link>
        </div>
      </main>
    );
  }

  // ============= PRE-START =============
  if (!started) {
    return (
      <main className="min-h-screen px-4 py-8 max-w-md mx-auto">
        <Link href="/practice" className="text-sm text-slate-400 hover:text-white">← Beranda Latihan</Link>
        <div className="card mt-6 text-center animate-pop border-indigo-500/30">
          <div className="text-6xl mb-3">📝</div>
          <div className="text-xs text-indigo-400 uppercase tracking-wider font-bold mb-2">Latihan Mandiri</div>
          <h1 className="text-2xl font-bold mb-2">{bank.bankName}</h1>
          <p className="text-sm text-slate-400 mb-2">{bank.subject}</p>
          <div className="flex justify-center gap-4 text-sm mt-4 mb-6">
            <div><span className="text-indigo-400 font-bold">{bank.questions.length}</span> soal</div>
            <div>·</div>
            <div>Tanpa batas waktu</div>
          </div>
          <button onClick={startPractice} className="btn-primary w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-lg py-3">🚀 Mulai Latihan</button>
          <p className="text-xs text-slate-500 mt-3">Semua soal pilihan ganda. Jawab dengan tenang tanpa tekanan waktu.</p>
        </div>
      </main>
    );
  }

  // ============= FINISHED =============
  if (finished) {
    const total = bank.questions.length;
    const correct = answers.filter(a => a.correct).length;
    const accuracy = Math.round((correct / total) * 100);
    const grade = accuracy >= 90 ? { label: 'Sempurna! 🏆', color: 'text-emerald-400' }
      : accuracy >= 75 ? { label: 'Bagus Sekali! 🎉', color: 'text-blue-400' }
      : accuracy >= 60 ? { label: 'Cukup Baik 💪', color: 'text-amber-400' }
      : { label: 'Ayo Latihan Lagi 📚', color: 'text-rose-400' };

    return (
      <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
        <Link href="/practice" className="text-sm text-slate-400 hover:text-white">← Beranda Latihan</Link>
        <div className="card mt-6 text-center animate-pop border-indigo-500/30">
          <div className="text-6xl mb-2">{accuracy >= 90 ? '🏆' : accuracy >= 75 ? '🎉' : accuracy >= 60 ? '💪' : '📚'}</div>
          <h1 className={`text-3xl font-black mb-1 ${grade.color}`}>{grade.label}</h1>
          <p className="text-slate-400 text-sm mb-4">{bank.bankName}</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white/5 rounded-xl p-3"><div className="text-2xl font-black text-indigo-400">{savedAttempt?.score || 0}</div><div className="text-xs text-slate-400 uppercase">Skor</div></div>
            <div className="bg-white/5 rounded-xl p-3"><div className="text-2xl font-black text-emerald-400">{correct}/{total}</div><div className="text-xs text-slate-400 uppercase">Benar</div></div>
            <div className="bg-white/5 rounded-xl p-3"><div className="text-2xl font-black text-amber-400">{formatTime(elapsed)}</div><div className="text-xs text-slate-400 uppercase">Waktu</div></div>
          </div>
          <div className="flex gap-2">
            <button onClick={restart} className="btn-primary flex-1 bg-gradient-to-r from-indigo-500 to-purple-600">🔄 Latihan Lagi</button>
            <Link href="/practice" className="btn-ghost flex-1 text-center">🏠 Beranda</Link>
          </div>
        </div>
        <div className="card mt-4">
          <h2 className="font-semibold mb-3">📖 Review Jawaban</h2>
          <div className="space-y-3">
            {bank.questions.map((q: any, i: number) => {
              const ans = answers[i];
              return (
                <div key={i} className={`border-2 rounded-xl p-4 ${ans?.correct ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-400 font-semibold">Soal {i + 1}</div>
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${ans?.correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{ans?.correct ? '✓ Benar' : '✗ Salah'}</div>
                  </div>
                  <div className="font-medium mb-3">{q.text}</div>
                  <div className="space-y-1.5">
                    {q.options.map((opt: string, oi: number) => {
                      const isCorrect = oi === q.correctIndex;
                      const isChosen = oi === ans?.choice;
                      let cls = 'bg-white/5 border-white/10';
                      if (isCorrect) cls = 'bg-emerald-500/20 border-emerald-500/50';
                      else if (isChosen) cls = 'bg-rose-500/20 border-rose-500/50';
                      return (<div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${cls}`}><span className="font-mono font-bold w-6">{String.fromCharCode(65 + oi)}</span><span className="flex-1">{opt}</span>{isCorrect && <span className="text-[10px] text-emerald-400 font-bold">✓ BENAR</span>}{isChosen && !isCorrect && <span className="text-[10px] text-rose-400 font-bold">PILIHANMU</span>}</div>);
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // ============= QUESTION =============
  const q = bank.questions[currentIdx];
  if (!q) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="card max-w-md text-center border-amber-500/30">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Soal Hilang</h2>
          <p className="text-slate-400 text-sm mb-4">Data soal tidak ditemukan. Kode mungkin sudah dihapus oleh guru.</p>
          <Link href="/practice" className="btn-primary">← Kembali ke Beranda</Link>
        </div>
      </main>
    );
  }

  const progress = ((currentIdx + 1) / bank.questions.length) * 100;
  const answered = selectedIdx !== null;
  const isCorrect = answered && selectedIdx === q.correctIndex;

  return (
    <main className="min-h-screen px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div><div className="text-xs text-slate-400">Latihan Mandiri</div><div className="text-sm font-semibold truncate">{bank.bankName}</div></div>
        <div className="text-right"><div className="text-xs text-slate-400">Waktu</div><div className="font-mono font-bold text-indigo-400">{formatTime(elapsed)}</div></div>
      </div>
      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-4"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" style={{ width: progress + '%' }} /></div>
      <div className="text-xs text-slate-400 mb-2 text-center">Soal {currentIdx + 1} dari {bank.questions.length}</div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">{q.text}</h2>
        {q.imageUrl && (<img src={q.imageUrl} alt="Soal" className="max-h-48 object-contain mx-auto mb-4 rounded-lg" />)}
        <div className="space-y-2">
          {q.options.map((opt: string, oi: number) => {
            const chosen = selectedIdx === oi;
            const correct = oi === q.correctIndex;
            let cls = 'bg-white/5 border-white/10 hover:bg-white/10';
            if (answered) {
              if (correct) cls = 'bg-emerald-500/20 border-emerald-500/50';
              else if (chosen) cls = 'bg-rose-500/20 border-rose-500/50';
              else cls = 'bg-white/5 border-white/10 opacity-50';
            }
            return (<button key={oi} onClick={() => selectAnswer(oi)} disabled={answered} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition ${cls}`}><span className="h-8 w-8 grid place-items-center rounded-lg bg-indigo-500/20 font-mono font-bold text-indigo-400 text-sm flex-shrink-0">{String.fromCharCode(65 + oi)}</span><span className="text-left flex-1">{opt}</span>{answered && correct && <span className="text-emerald-400">✓</span>}{answered && chosen && !correct && <span className="text-rose-400">✗</span>}</button>);
          })}
        </div>
        {answered && (<div className={`mt-4 p-3 rounded-lg text-sm text-center font-semibold ${isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{isCorrect ? '✓ Jawaban Benar!' : `✗ Jawaban Salah. Yang benar: ${String.fromCharCode(65 + q.correctIndex)}`}</div>)}
        {answered && (<button onClick={nextQuestion} className="btn-primary w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-600">{currentIdx + 1 >= bank.questions.length ? '🏁 Selesai' : 'Soal Berikutnya →'}</button>)}
      </div>
    </main>
  );
}
