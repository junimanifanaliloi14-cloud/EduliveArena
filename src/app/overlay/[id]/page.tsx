'use client';
import { useSessionSocket } from '@/lib/useSocket';
import { useEffect, useState, useRef, use } from 'react';
import { initAudio, playCorrect } from '@/lib/sound';
import { motion, AnimatePresence } from 'framer-motion';

export default function Overlay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state } = useSessionSocket(id);
  
  const [now, setNow] = useState(Date.now());
  const [timeOffset, setTimeOffset] = useState(0);
  const lastQuestionRef = useRef<string>('');

  useEffect(() => {
    const unlockAudio = () => initAudio();
    window.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (state?.session?.serverNow) {
      setTimeOffset(Date.now() - state.session.serverNow);
    }
  }, [state?.session?.serverNow]);

  useEffect(() => {
    if (state?.session.questionState === 'revealed') {
      const qIndex = state.session.currentQuestionIndex;
      if (lastQuestionRef.current !== String(qIndex)) {
        lastQuestionRef.current = String(qIndex);
        playCorrect();
      }
    }
  }, [state?.session.questionState, state?.session.currentQuestionIndex]);

  if (!state) return null;
  const s = state.session;
  const q = state.question;

  const estimatedServerNow = now - timeOffset;
  const prepareEndAt = s.questionStartAt || 0;
  const questionEndAt = s.questionEndAt || 0;

  const prepareLeft = Math.max(0, Math.ceil((prepareEndAt - estimatedServerNow) / 1000));
  const answerLeft = Math.max(0, Math.ceil((questionEndAt - estimatedServerNow) / 1000));
  const isPreparing = prepareLeft > 0;

  return (
    <div className="min-h-screen p-6 bg-transparent">
      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-5">
        <div className="col-span-2 card min-h-[380px] flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider">
            <span>{s.bankName}</span>
            <span>Soal {s.currentQuestionIndex + 1} / {s.totalQuestions}</span>
          </div>
          
          {q ? (
            <>
              {/* TAMPILAN SAAT PERSIAPAN: Sembunyikan Soal, Tampilkan Countdown Raksasa */}
              {isPreparing ? (
                <div className="flex-1 flex flex-col items-center justify-center animate-pop">
                  <div className="text-9xl font-bold text-white drop-shadow-lg">{prepareLeft}</div>
                  <div className="text-2xl text-slate-400 mt-4 tracking-widest uppercase">Bersiap...</div>
                </div>
              ) : (
                /* TAMPILAN SAAT SOAL AKTIF */
                <div className="flex-1 flex flex-col animate-slide-up">
                  <div className="text-center mt-4 flex-1 flex items-center justify-center">
                    <h1 className="text-4xl font-bold leading-tight">{q.text}</h1>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    {q.options.map((o, i) => {
                      const revealed = s.questionState === 'revealed';
                      const isCorrect = revealed && q.correctIndex === i;
                      const stat = state.answerStats.byChoice[i];
                      const pct = state.answerStats.total ? Math.round((stat / state.answerStats.total) * 100) : 0;
                      return (
                        <div key={i} className={'relative rounded-2xl border px-4 py-3 overflow-hidden ' + (isCorrect ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/15 bg-white/5')}>
                          <div className="absolute inset-y-0 left-0 bg-brand-500/20" style={{ width: revealed ? pct + '%' : '0%', transition: 'width .4s' }} />
                          <div className="relative flex items-center gap-3">
                            <span className="h-8 w-8 grid place-items-center rounded-lg bg-brand-500/30 font-mono font-bold">{String.fromCharCode(65 + i)}</span>
                            <span className="text-lg">{o}</span>
                            {revealed && <span className="ml-auto text-sm text-slate-300">{stat}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TIMER BAWAH (Hanya muncul saat soal aktif) */}
              <div className="mt-6 h-10 flex items-center justify-center">
                {s.questionState === 'showing' && !isPreparing && (
                  <div className="flex items-center gap-3 animate-pop">
                    <div className={`h-3 w-3 rounded-full animate-pulse ${answerLeft <= 5 ? 'bg-red-500' : 'bg-brand-500'}`} />
                    <span className={`text-3xl font-mono font-bold ${answerLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{answerLeft}s</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-slate-400">
              <div className="text-center">
                <div className="text-6xl mb-3">🎓</div>
                <p className="text-xl">Menunggu soal berikutnya...</p>
              </div>
            </div>
          )}
        </div>

        <div className="card flex flex-col">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">Leaderboard</div>
          
          <motion.ol className="flex flex-col gap-1.5 relative">
            <AnimatePresence>
              {state.leaderboard.slice(0, 10).map(r => (
                <motion.li 
                  layout
                  key={r.id} 
                  initial={{ opacity: 0, scale: 0.8, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={'flex items-center justify-between rounded-lg px-3 py-2 text-sm ' + (r.rank === 1 ? 'bg-brand-500/20 border border-brand-500/40' : 'bg-white/5')}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-center font-mono font-bold text-brand-500">{r.rank}</span>
                    <span className="font-medium">{r.name}</span>
                    {r.rank === 1 && <span className="text-amber-400">👑</span>}
                  </span>
                  <span className="font-mono text-slate-200">{r.score}</span>
                </motion.li>
              ))}
            </AnimatePresence>
            {!state.leaderboard.length && <li className="text-slate-500 text-sm">Belum ada pemain...</li>}
          </motion.ol>

          <div className="mt-auto pt-4 border-t border-white/10 text-xs text-slate-400">
            PIN: <span className="font-mono text-brand-500">{s.pin}</span> - {state.playerCount} murid
          </div>
        </div>
      </div>
    </div>
  );
}
