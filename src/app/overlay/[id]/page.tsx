'use client';
import { useSessionSocket } from '@/lib/useSocket';
import { useEffect, useState, useRef, use } from 'react';
import { initAudio, playCorrect } from '@/lib/sound';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface FloatingEmoji { id: number; emoji: string; x: number; }

export default function Overlay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, socket } = useSessionSocket(id);
  
  const [now, setNow] = useState(Date.now());
  const [timeOffset, setTimeOffset] = useState(0);
  const lastQuestionRef = useRef<string>('');
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);
  const [activeGift, setActiveGift] = useState<{ username: string; giftName: string } | null>(null);

  useEffect(() => {
    const unlockAudio = () => initAudio();
    window.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    return () => { window.removeEventListener('click', unlockAudio); document.removeEventListener('keydown', unlockAudio); };
  }, []);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (state?.session?.serverNow) setTimeOffset(Date.now() - state.session.serverNow);
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

  useEffect(() => {
    if (!socket) return;
    const handleEmoji = ({ emoji, id: emojiId }: any) => {
      const xPos = Math.random() * 80 + 10;
      setEmojis(prev => [...prev, { id: emojiId, emoji, x: xPos }]);
      setTimeout(() => { setEmojis(prev => prev.filter(e => e.id !== emojiId)); }, 3000);
    };
    const handleGift = (data: any) => {
      setActiveGift(data);
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ['#f97316', '#eab308', '#3b82f6', '#ef4444', '#22c55e'] });
      setTimeout(() => setActiveGift(null), 5000);
    };
    socket.on('overlay:emoji', handleEmoji);
    socket.on('gift:received', handleGift);
    return () => { socket.off('overlay:emoji', handleEmoji); socket.off('gift:received', handleGift); };
  }, [socket]);

  if (!state) return null;
  const s = state.session;
  const q = state.question;

  const estimatedServerNow = s.isPaused ? s.pauseStartAt : (now - timeOffset);
  const prepareEndAt = s.questionStartAt || 0;
  const questionEndAt = s.questionEndAt || 0;

  const prepareLeft = Math.max(0, Math.ceil((prepareEndAt - (now - timeOffset)) / 1000));
  const answerLeft = Math.max(0, Math.ceil((questionEndAt - estimatedServerNow) / 1000));
  const isPreparing = prepareLeft > 0;

  return (
    <div className="min-h-screen p-6 bg-transparent relative overflow-hidden">
      
      <AnimatePresence>
        {activeGift && (
          <motion.div initial={{ y: -100, opacity: 0, scale: 0.8 }} animate={{ y: 20, opacity: 1, scale: 1 }} exit={{ y: -100, opacity: 0, scale: 0.8 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold px-8 py-4 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center gap-4 border-2 border-amber-300">
            <span className="text-4xl animate-bounce">🎁</span>
            <div>
              <div className="text-sm text-amber-100 uppercase tracking-widest font-semibold">Hadiah Masuk!</div>
              <div className="text-xl"><span className="text-yellow-200">{activeGift.username}</span> mengirim {activeGift.giftName}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {emojis.map(e => (
            <motion.div key={e.id} initial={{ opacity: 1, y: '100vh', scale: 1 }} animate={{ opacity: 0, y: '-10vh', scale: 1.5 }} exit={{ opacity: 0 }} transition={{ duration: 3, ease: 'easeOut' }} className="absolute text-6xl" style={{ left: `${e.x}%` }}>{e.emoji}</motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-5 relative z-10">
        <div className="col-span-2 card min-h-[380px] flex flex-row relative overflow-hidden">
          
          <div className="w-24 flex flex-col items-center justify-start pt-6 border-r border-white/10 pr-4 mr-4">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-amber-500 rounded-full blur opacity-75 animate-pulse"></div>
              <div className="relative h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center text-3xl border-2 border-white/20">👩‍🏫</div>
            </div>
            <div className="text-[10px] text-center text-slate-400 mt-3 uppercase tracking-widest font-bold">Guru</div>
          </div>

          <div className="flex-1 flex flex-col">
            {s.teamMode && s.teamScores && (
              <div className="flex gap-4 mb-4 bg-slate-800/80 p-3 rounded-xl border border-white/10 shadow-lg animate-slide-up">
                <div className="flex-1 bg-red-500/20 border border-red-500/30 rounded-lg p-2 flex items-center justify-between"><span className="font-bold text-red-400 text-lg">TIM MERAH</span><span className="font-mono text-2xl font-bold text-white">{s.teamScores.A}</span></div>
                <div className="flex items-center text-slate-500 font-bold italic">VS</div>
                <div className="flex-1 bg-blue-500/20 border border-blue-500/30 rounded-lg p-2 flex items-center justify-between"><span className="font-bold text-blue-400 text-lg">TIM BIRU</span><span className="font-mono text-2xl font-bold text-white">{s.teamScores.B}</span></div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider">
              <span>{s.bankName}</span>
              <span>Soal {s.currentQuestionIndex + 1} / {s.totalQuestions}</span>
            </div>
            
            {q ? (
              <>
                {isPreparing ? (
                  <div className="flex-1 flex flex-col items-center justify-center animate-pop">
                    <div className="text-9xl font-bold text-white drop-shadow-lg">{prepareLeft}</div>
                    <div className="text-2xl text-slate-400 mt-4 tracking-widest uppercase">Bersiap...</div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col animate-slide-up relative">
                    
                    {/* PAUSE OVERLAY */}
                    {s.isPaused && (
                      <div className="absolute inset-0 z-40 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border-2 border-amber-500/50 animate-pop">
                        <div className="text-6xl mb-4">⏸️</div>
                        <div className="text-3xl font-bold text-amber-400 tracking-widest uppercase">PAUSED</div>
                      </div>
                    )}

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

                <div className="mt-6 h-10 flex items-center justify-center">
                  {s.questionState === 'showing' && !isPreparing && (
                    <div className="flex items-center gap-3 animate-pop">
                      <div className={`h-3 w-3 rounded-full ${s.isPaused ? 'bg-amber-500' : (answerLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-brand-500 animate-pulse')}`} />
                      <span className={`text-3xl font-mono font-bold ${s.isPaused ? 'text-amber-500' : (answerLeft <= 5 ? 'text-red-500' : 'text-white')}`}>{s.isPaused ? 'PAUSED' : `${answerLeft}s`}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 grid place-items-center text-slate-400">
                <div className="text-center"><div className="text-6xl mb-3">🎓</div><p className="text-xl">Menunggu soal berikutnya...</p></div>
              </div>
            )}
          </div>
        </div>

        <div className="card flex flex-col">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">Leaderboard</div>
          
          <motion.ol className="flex flex-col gap-1.5 relative">
            <AnimatePresence>
              {state.leaderboard.slice(0, 10).map(r => (
                <motion.li layout key={r.id} initial={{ opacity: 0, scale: 0.8, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={'flex items-center justify-between rounded-lg px-3 py-2 text-sm ' + (r.isEliminated ? 'bg-red-950/20 opacity-60' : (r.rank === 1 ? 'bg-brand-500/20 border border-brand-500/40' : 'bg-white/5'))}>
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-center font-mono font-bold text-brand-500">{r.rank}</span>
                    <span className="font-medium">{r.name}</span>
                    {r.isEliminated && <span title="Tereliminasi">💀</span>}
                    {s.teamMode && <span className={`text-[10px] font-bold ${r.team === 'A' ? 'text-red-400' : 'text-blue-400'}`}>{r.team === 'A' ? 'M' : 'B'}</span>}
                    {r.rank === 1 && !r.isEliminated && <span className="text-amber-400">👑</span>}
                  </span>
                  <span className="font-mono text-slate-200">{r.score}</span>
                </motion.li>
              ))}
            </AnimatePresence>
            {!state.leaderboard.length && <li className="text-slate-500 text-sm">Belum ada pemain...</li>}
          </motion.ol>

          <div className="mt-auto pt-4 border-t border-white/10 text-xs text-slate-400">PIN: <span className="font-mono text-brand-500">{s.pin}</span> - {state.playerCount} murid</div>
        </div>
      </div>
    </div>
  );
}
