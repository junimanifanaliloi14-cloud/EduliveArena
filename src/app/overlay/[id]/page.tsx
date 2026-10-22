'use client';
import { useSessionSocket } from '@/lib/useSocket';
import { useEffect, useState, useRef, use } from 'react';
import { initAudio, playCorrect, playTick, playExternalSound } from '@/lib/sound';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { getOptimizedImageUrl } from '@/lib/imageHelper';

interface FloatingEmoji { id: number; emoji: string; x: number; }

export default function Overlay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state, socket } = useSessionSocket(id);
  
  const [now, setNow] = useState(Date.now());
  const [timeOffset, setTimeOffset] = useState(0);
  const lastQuestionRef = useRef<string>('');
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);
  const [activeGift, setActiveGift] = useState<{ username: string; giftName: string } | null>(null);
  const lastTickedRef = useRef<number>(-1);
  const [imgError, setImgError] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [finalReport, setFinalReport] = useState<any>(null);

  const s = state?.session;
  const q = state?.question;

  const estimatedServerNow = s?.isPaused ? s.pauseStartAt : (now - timeOffset);
  const prepareEndAt = s?.questionStartAt || 0;
  const questionEndAt = s?.questionEndAt || 0;

  const prepareLeft = Math.max(0, Math.ceil((prepareEndAt - (now - timeOffset)) / 1000));
  const answerLeft = Math.max(0, Math.ceil((questionEndAt - estimatedServerNow) / 1000));
  const isPreparing = prepareLeft > 0;

  useEffect(() => {
    setImgError(false);
  }, [state?.session.currentQuestionIndex]);

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
    const handleSessionEnded = (report: any) => {
      setFinalReport(report);
      playExternalSound('https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3');
      const duration = 5000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 10, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#f97316', '#eab308', '#3b82f6', '#ef4444', '#22c55e'] });
        confetti({ particleCount: 10, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#f97316', '#eab308', '#3b82f6', '#ef4444', '#22c55e'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    };

    socket.on('session:ended', handleSessionEnded);
    return () => { socket.off('session:ended', handleSessionEnded); };
  }, [socket]);

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

    const handleSound = (url: string) => {
      if (url) playExternalSound(url);
    };

    socket.on('overlay:emoji', handleEmoji);
    socket.on('gift:received', handleGift);
    socket.on('overlay:sound', handleSound);
    
    return () => { 
      socket.off('overlay:emoji', handleEmoji); 
      socket.off('gift:received', handleGift); 
      socket.off('overlay:sound', handleSound);
    };
  }, [socket]);

  useEffect(() => {
    if (!s) return; 
    if (s.questionState === 'showing' && !isPreparing && !s.isPaused && audioUnlocked) {
      if (answerLeft > 0 && answerLeft <= 5 && lastTickedRef.current !== answerLeft) {
        lastTickedRef.current = answerLeft;
        playTick();
      }
    }
    if (s.questionState !== 'showing') lastTickedRef.current = -1;
  }, [answerLeft, s?.questionState, isPreparing, s?.isPaused, audioUnlocked]);

  if (!state || !s) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const playUrl = origin + '/play/' + s.pin;
  const isLobby = s.questionState === 'idle' && s.currentQuestionIndex < 0;

  const allPlayers = finalReport ? finalReport.players : state.leaderboard;
  const podiumData = allPlayers.slice(0, 3);
  const first = podiumData[0];
  const second = podiumData[1];
  const third = podiumData[2];

  const shouldScroll = allPlayers.length > 5;
  const scrollData = shouldScroll ? [...allPlayers, ...allPlayers] : allPlayers;
  const scrollDuration = allPlayers.length * 3;

  let avatarAnim = {};
  if (s.isBossBattle) {
    avatarAnim = { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0], transition: { repeat: Infinity, duration: 1 } }; 
  } else if (s.questionState === 'revealed') {
    avatarAnim = { y: [0, -20, 0], transition: { repeat: Infinity, duration: 0.5 } }; 
  } else if (s.questionState === 'showing' && answerLeft <= 5 && !s.isPaused) {
    avatarAnim = { x: [-2, 2, -2, 2, 0], transition: { repeat: Infinity, duration: 0.2 } }; 
  } else {
    avatarAnim = { y: [0, -5, 0], transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } }; 
  }

  const readyCount = state.allPlayers.filter((p: any) => p.isReady).length;

  return (
    <div className="min-h-screen p-6 bg-transparent relative overflow-hidden">
      
      {!audioUnlocked && (
        <div 
          onClick={() => { initAudio(); setAudioUnlocked(true); }}
          className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-900/90"
        >
          <div className="bg-brand-500 text-white p-8 rounded-full mb-6 animate-bounce shadow-[0_0_50px_rgba(249,115,22,0.5)]">
            <span className="text-6xl">🔊</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">KLIK UNTUK MENGAKTIFKAN SUARA</h1>
        </div>
      )}

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

      {s.status === 'ended' ? (
        <div className="max-w-7xl mx-auto h-[85vh] grid grid-cols-3 gap-8 relative z-10 animate-pop">
          <div className="col-span-2 flex flex-col justify-end pb-10">
            <div className="text-center mb-12">
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 uppercase tracking-widest drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                🏆 HALL OF FAME 🏆
              </h1>
              <p className="text-2xl text-slate-300 mt-2">{s.bankName}</p>
            </div>

            <div className="flex justify-center items-end gap-4 h-64">
              {second && (
                <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, type: 'spring' }} className="w-48 flex flex-col items-center">
                  <div className="text-6xl mb-2">🥈</div>
                  <div className="font-bold text-xl text-slate-200 mb-1 truncate w-full text-center px-2">{second.name}</div>
                  <div className="text-brand-500 font-mono font-bold text-lg mb-2">{second.score}</div>
                  <div className="w-full h-32 bg-gradient-to-t from-slate-700 to-slate-500 rounded-t-lg border-t-4 border-slate-300 shadow-[0_0_20px_rgba(148,163,184,0.4)]" />
                </motion.div>
              )}

              {first && (
                <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="w-56 flex flex-col items-center z-10 relative">
                  <div className="absolute -top-16 text-7xl animate-bounce">👑</div>
                  <div className="text-7xl mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]">🥇</div>
                  <div className="font-black text-2xl text-amber-400 mb-1 truncate w-full text-center px-2">{first.name}</div>
                  <div className="text-amber-300 font-mono font-black text-2xl mb-2">{first.score}</div>
                  <div className="w-full h-44 bg-gradient-to-t from-amber-700 to-amber-400 rounded-t-lg border-t-4 border-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-start justify-center pt-4">
                    <span className="text-amber-900 font-black opacity-30 text-4xl">1st</span>
                  </div>
                </motion.div>
              )}

              {third && (
                <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8, type: 'spring' }} className="w-48 flex flex-col items-center">
                  <div className="text-6xl mb-2">🥉</div>
                  <div className="font-bold text-xl text-slate-200 mb-1 truncate w-full text-center px-2">{third.name}</div>
                  <div className="text-brand-500 font-mono font-bold text-lg mb-2">{third.score}</div>
                  <div className="w-full h-24 bg-gradient-to-t from-orange-800 to-orange-600 rounded-t-lg border-t-4 border-orange-400 shadow-[0_0_20px_rgba(194,65,12,0.4)]" />
                </motion.div>
              )}
            </div>
          </div>

          <div className="col-span-1 h-full flex flex-col justify-center py-8">
            <div className="card bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col h-[65vh] overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <div className="text-center py-3 border-b border-white/10 bg-white/5 text-sm font-bold uppercase tracking-widest text-slate-300 flex-shrink-0">
                Klasemen Lengkap
              </div>
              <div className="flex-1 relative overflow-hidden p-2">
                <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />
                
                <div 
                  className={`flex flex-col gap-1 ${shouldScroll ? 'animate-scroll-slow hover:[animation-play-state:paused]' : ''}`}
                  style={{ animationDuration: `${scrollDuration}s` }}
                >
                  {scrollData.map((p: any, i: number) => {
                    const actualRank = (i % allPlayers.length) + 1;
                    let bgClass = "bg-white/5";
                    let textClass = "text-slate-300";
                    if (actualRank === 1) { bgClass = "bg-amber-500/20 border border-amber-500/30"; textClass = "text-amber-300 font-bold"; }
                    else if (actualRank === 2) { bgClass = "bg-slate-400/20 border border-slate-400/30"; textClass = "text-slate-200 font-bold"; }
                    else if (actualRank === 3) { bgClass = "bg-orange-700/20 border border-orange-700/30"; textClass = "text-orange-300 font-bold"; }
                    else if (p.isEliminated) { bgClass = "bg-red-950/20 opacity-60"; }

                    return (
                      <div key={`${p.id}-${i}`} className={`flex items-center justify-between px-3 py-2 rounded-lg ${bgClass} flex-shrink-0`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-6 text-center font-mono text-sm ${textClass}`}>{actualRank}</span>
                          <span className={`text-sm ${textClass}`}>{p.name} {p.isEliminated && '💀'}</span>
                        </div>
                        <span className="font-mono text-sm text-slate-400">{p.score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : isLobby ? (
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-8 relative z-10 items-center min-h-[80vh] animate-pop">
          <div className="col-span-2 flex flex-col justify-center">
            <div className="text-brand-500 font-bold tracking-widest uppercase text-sm mb-2">{s.tournamentMode ? '🏆 TOURNAMENT MATCH' : 'Live Quiz Session'}</div>
            <h1 className="text-6xl font-black leading-tight mb-4">{s.bankName}</h1>
            <p className="text-2xl text-slate-300 mb-8">
              Bersama: <span className="text-white font-semibold">{s.hostName}</span>
              {s.tournamentMode && <span className="block text-amber-400 font-bold mt-2">Peserta: {state.playerCount} / {s.expectedPlayers}</span>}
            </p>
            
            <div className="flex items-center gap-6">
              <div className="card bg-white/10 border-white/20 p-4 rounded-2xl flex flex-col items-center">
                <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">PIN Kuis</div>
                <div className="text-5xl font-mono font-bold text-brand-500 tracking-widest">{s.pin}</div>
              </div>
              <div className="text-slate-400 text-sm">atau scan QR Code di samping →</div>
            </div>

            {s.tournamentMode && (
              <div className="mt-6 bg-slate-800/50 p-4 rounded-xl border border-white/10">
                <div className="text-sm text-slate-300 mb-2 flex justify-between">
                  <span>Peserta Siap:</span>
                  <span className="font-bold text-emerald-400">{readyCount} / {state.allPlayers.length}</span>
                </div>
                <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${state.allPlayers.length > 0 ? (readyCount / state.allPlayers.length) * 100 : 0}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="col-span-1 flex flex-col items-center">
            <div className="bg-white p-4 rounded-3xl shadow-2xl mb-6">
              <QRCodeSVG value={playUrl} size={200} />
            </div>
            <div className="text-xl font-bold mb-4 text-center">Scan untuk Join</div>
            
            <div className="w-full card bg-white/5">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 text-center">Peserta Bergabung ({state.allPlayers.length})</div>
              <div className="h-40 overflow-y-auto flex flex-wrap gap-2 justify-center content-start">
                <AnimatePresence>
                  {state.allPlayers.map(p => (
                    <motion.div 
                      key={p.id} 
                      initial={{ opacity: 0, scale: 0.5 }} 
                      animate={{ opacity: 1, scale: 1 }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${p.isReady ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 'bg-white/10 text-slate-400'}`}
                    >
                      {p.name} {p.isReady && '✓'}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-5 relative z-10">
          <div className="col-span-2 card min-h-[380px] flex flex-row relative overflow-hidden">
            
            <div className="w-24 flex flex-col items-center justify-start pt-6 border-r border-white/10 pr-4 mr-4 relative">
              
              {/* LOGO SEKOLAH (Jika ada) */}
              {s.hostLogo && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-12 flex items-center justify-center opacity-70">
                  <img src={getOptimizedImageUrl(s.hostLogo) || ''} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
              )}

              <div className="relative mt-8">
                <div className={`absolute -inset-1 rounded-full blur opacity-75 animate-pulse ${s.isBossBattle ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-gradient-to-r from-brand-500 to-amber-500'}`}></div>
                <motion.div animate={avatarAnim} className="relative h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center text-3xl border-2 border-white/20">
                  {s.isBossBattle ? '😈' : (s.hostAvatar || '👩‍🏫')}
                </motion.div>
              </div>
              <div className="text-[10px] text-center text-slate-400 mt-3 uppercase tracking-widest font-bold">{s.isBossBattle ? 'BOSS' : 'Guru'}</div>
            </div>

            <div className="flex-1 flex flex-col">
              {s.groupMode && s.groupScores && (
                <div className="flex gap-2 mb-4 bg-slate-800/80 p-2 rounded-xl border border-white/10 shadow-lg animate-slide-up flex-wrap">
                  {s.groupNames.slice(0, s.groupCount).map((name, i) => {
                    const colors = ['text-red-400 bg-red-500/20 border-red-500/30', 'text-blue-400 bg-blue-500/20 border-blue-500/30', 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30', 'text-amber-400 bg-amber-500/20 border-amber-500/30'];
                    return (
                      <div key={name} className={`flex-1 min-w-[100px] border rounded-lg p-2 flex flex-col items-center ${colors[i % colors.length]}`}>
                        <span className="font-bold text-xs uppercase">{name}</span>
                        <span className="font-mono text-xl font-bold text-white">{s.groupScores[name]}</span>
                      </div>
                    );
                  })}
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
                      
                      {s.isPaused && (
                        <div className="absolute inset-0 z-40 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border-2 border-amber-500/50 animate-pop">
                          <div className="text-6xl mb-4">⏸️</div>
                          <div className="text-3xl font-bold text-amber-400 tracking-widest uppercase">PAUSED</div>
                        </div>
                      )}

                      {s.isBossBattle && (
                        <div className="text-center mb-2 animate-pulse">
                          <span className="inline-block bg-gradient-to-r from-red-600 to-amber-600 text-white font-black px-6 py-1.5 rounded-full text-lg uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.8)] border border-red-400">
                            🔥 BOSS BATTLE - 3x POIN! 🔥
                          </span>
                        </div>
                      )}

                      <div className="text-center mt-2 flex-1 flex flex-col items-center justify-center">
                        <h1 className="text-4xl font-bold leading-tight">{q.text}</h1>
                        {q.imageUrl && (
                          <div className="mt-4 rounded-xl overflow-hidden border border-white/20 shadow-lg bg-black/40 p-2 min-w-[200px] flex items-center justify-center">
                            {imgError ? (
                              <div className="text-slate-400 text-sm py-4 flex flex-col items-center text-center px-4">
                                <span className="text-2xl mb-1">🖼️</span>
                                Gambar gagal dimuat. Periksa kembali link gambar.
                              </div>
                            ) : (
                              <img 
                                src={getOptimizedImageUrl(q.imageUrl) || ''} 
                                alt="Ilustrasi Soal" 
                                className="max-h-48 object-contain" 
                                onError={() => setImgError(true)} 
                              />
                            )}
                          </div>
                        )}
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
                      {s.groupMode && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10`}>{r.group}</span>}
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
      )}
    </div>
  );
}
