'use client';
import { useEffect, useRef, useState, use } from 'react';
import { io, Socket } from 'socket.io-client';
import type { PublicState } from '@/lib/types';
import { initAudio, playCorrect, playWrong, playTick } from '@/lib/sound';
import confetti from 'canvas-confetti';
import { getOptimizedImageUrl } from '@/lib/imageHelper';
import { useSearchParams } from 'next/navigation';
import { callAI } from '@/lib/aiHelper';

export default function PlayPage({ params }: { params: Promise<{ pin: string }> }) {
  const { pin } = use(params);
  const searchParams = useSearchParams();
  
  const socketRef = useRef<Socket | null>(null);
  
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [joined, setJoined] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState<PublicState | null>(null);
  const [myPlayer, setMyPlayer] = useState<any>(null);
  const [myAnswer, setMyAnswer] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [lastEmojiTime, setLastEmojiTime] = useState(0);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);

  // FITUR BARU: Review Mode States
  const [reviewData, setReviewData] = useState<any>(null);
  const [showReview, setShowReview] = useState(false);
  const [explanations, setExplanations] = useState<Record<number, { loading: boolean; text: string; error?: string }>>({});

  const [now, setNow] = useState(Date.now());
  const [timeOffset, setTimeOffset] = useState(0);
  const lastPlayedStateRef = useRef<string>('');
  const lastTickedRef = useRef<number>(-1);

  useEffect(() => {
    const urlName = searchParams.get('name');
    const urlCode = searchParams.get('code');
    if (urlName) setName(urlName);
    if (urlCode) setInviteCode(urlCode);
  }, [searchParams]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (state?.session.currentQuestionIndex !== undefined) {
      setMyAnswer(null); setHiddenOptions([]); lastPlayedStateRef.current = ''; lastTickedRef.current = -1;
      setImgError(false); setImgLoading(true);
    }
  }, [state?.session.currentQuestionIndex]);

  useEffect(() => {
    if (state?.session?.serverNow) setTimeOffset(Date.now() - state.session.serverNow);
  }, [state?.session?.serverNow]);

  useEffect(() => {
    if (state?.session.questionState === 'revealed' && myAnswer) {
      const stateId = `${state.session.currentQuestionIndex}-${myAnswer.choice}`;
      if (lastPlayedStateRef.current !== stateId) {
        lastPlayedStateRef.current = stateId;
        if (isMuted) return;
        if (myAnswer.correct) playCorrect(); else playWrong();
      }
    }
  }, [state?.session.questionState, myAnswer, isMuted, state?.session.currentQuestionIndex]);

  const estimatedServerNow = state?.session.isPaused ? state.session.pauseStartAt : (now - timeOffset);
  const prepareEndAt = (state?.session.questionStartAt || 0);
  const questionEndAt = (state?.session.questionEndAt || 0);
  
  const prepareLeft = Math.max(0, Math.ceil((prepareEndAt - (now - timeOffset)) / 1000));
  const answerLeft = Math.max(0, Math.ceil((questionEndAt - estimatedServerNow) / 1000));
  const isPreparing = prepareLeft > 0;
  const isTimeUp = answerLeft === 0;

  useEffect(() => {
    if (state?.session.questionState === 'showing' && !isPreparing && !state?.session.isPaused && !isMuted) {
      if (answerLeft > 0 && answerLeft <= 5 && lastTickedRef.current !== answerLeft) {
        lastTickedRef.current = answerLeft;
        playTick();
      }
    }
  }, [answerLeft, state?.session.questionState, isPreparing, state?.session.isPaused, isMuted]);

  useEffect(() => {
    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    
    socket.on('connect', () => {
      setConnected(true);
      const savedSession = sessionStorage.getItem('edulive_session');
      const savedPlayer = sessionStorage.getItem('edulive_player');
      if (savedSession && savedPlayer) {
        socket.emit('player:reconnect', { sessionId: savedSession, playerId: savedPlayer }, (res: any) => {
          if (res.ok) setJoined(true);
          else { setJoined(false); sessionStorage.removeItem('edulive_session'); sessionStorage.removeItem('edulive_player'); }
        });
      }
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('session:state', (s: PublicState) => setState(s));
    
    socket.on('session:ended', (report: any) => {
      setFinalReport(report);
      sessionStorage.removeItem('edulive_session'); sessionStorage.removeItem('edulive_player');
      const myData = report.players.find((p: any) => p.id === myPlayer?.id);
      const isWinner = myData?.badges.some((b: any) => ['🥇', '🥈', '🥉'].includes(b.icon));
      if (isWinner) {
        const end = Date.now() + 3000;
        const frame = () => {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#f97316', '#eab308', '#3b82f6'] });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#f97316', '#eab308', '#3b82f6'] });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      }
    });

    // FITUR BARU: Tangkap data review
    socket.on('player:review', (data: any) => {
      setReviewData(data);
    });

    socket.on('player:state', (ps: any) => {
      if (!ps) return;
      setMyPlayer(ps.player);
      if (ps.myAnswer) setMyAnswer(ps.myAnswer);
    });
    
    socket.on('player:kicked', () => {
      setKicked(true); sessionStorage.removeItem('edulive_session'); sessionStorage.removeItem('edulive_player'); socket.disconnect();
    });

    return () => { socket.disconnect(); };
  }, [myPlayer?.id]);

  async function join() {
    if (!name.trim() || !socketRef.current) return;
    if (state?.session.tournamentMode && !inviteCode.trim()) { setError('Kode Undangan wajib diisi untuk turnamen!'); return; }
    if (state?.session.tournamentMode && !agreedToRules) { setError('Anda harus menyetujui peraturan turnamen!'); return; }
    initAudio(); setError('');
    socketRef.current.emit('player:join', { pin, name, code: inviteCode }, (res: any) => {
      if (res?.ok) { 
        setJoined(true); setMyPlayer(res.player); 
        sessionStorage.setItem('edulive_session', res.sessionId); sessionStorage.setItem('edulive_player', res.player.id);
      } else setError(res?.error || 'Gagal join');
    });
  }

  function toggleReady() { if (socketRef.current) socketRef.current.emit('player:ready'); }

  function answer(choice: number) {
    if (!socketRef.current || submitting || myAnswer) return;
    setSubmitting(true);
    socketRef.current.emit('player:answer', { choice }, (res: any) => {
      setSubmitting(false);
      if (!res?.ok) setError(res?.error || 'Gagal menjawab');
      else socketRef.current?.emit('player:refresh');
    });
  }

  function sendEmoji(emoji: string) {
    if (!socketRef.current) return;
    if (Date.now() - lastEmojiTime < 2000) return;
    setLastEmojiTime(Date.now()); socketRef.current.emit('player:emoji', { emoji });
  }

  function useFiftyFifty() {
    if (!socketRef.current || !myPlayer?.powerups || myPlayer.powerups.fifty <= 0) return;
    socketRef.current.emit('player:powerup', { type: 'fifty' }, (res: any) => { if (res.ok) setHiddenOptions(res.hidden); else setError(res.error); });
  }

  function useDoublePoints() {
    if (!socketRef.current || !myPlayer?.powerups || myPlayer.powerups.double <= 0) return;
    socketRef.current.emit('player:powerup', { type: 'double' }, (res: any) => { if (!res.ok) setError(res.error); });
  }

  // FITUR BARU: Request AI Explanation
  async function explainWithAI(questionIndex: number) {
    if (!reviewData || !reviewData.aiConfig) {
      alert('Fitur AI Explanation tidak tersedia untuk sesi ini.');
      return;
    }
    const item = reviewData.history[questionIndex];
    if (!item) return;

    setExplanations(prev => ({ ...prev, [questionIndex]: { loading: true, text: '' } }));

    try {
      const userChoiceText = item.playerChoice !== null ? `Pilihan ${String.fromCharCode(65 + item.playerChoice)}: ${item.options[item.playerChoice]}` : 'Tidak menjawab';
      const correctChoiceText = `Pilihan ${String.fromCharCode(65 + item.correctIndex)}: ${item.options[item.correctIndex]}`;
      
      const prompt = `Anda adalah guru yang ramah dan sabar. Seorang siswa menjawab salah pada soal pilihan ganda berikut.

SOAL: ${item.questionText}
PILIHAN:
A. ${item.options[0]}
B. ${item.options[1]}
C. ${item.options[2]}
D. ${item.options[3]}

JAWABAN SISWA (SALAH): ${userChoiceText}
JAWABAN BENAR: ${correctChoiceText}

Tugas Anda:
1. Jelaskan dengan bahasa sederhana MENGAPA jawaban siswa salah.
2. Jelaskan MENGAPA jawaban yang benar itu benar.
3. Berikan 1 tips/cara mudah mengingat konsep ini.

Gunakan Bahasa Indonesia yang hangat, memotivasi, dan mudah dipahami siswa (maksimal 150 kata). Jangan pakai format markdown, cukup teks biasa dengan paragraf.`;

      const result = await callAI(prompt, reviewData.aiConfig);
      setExplanations(prev => ({ ...prev, [questionIndex]: { loading: false, text: result } }));
    } catch (e: any) {
      setExplanations(prev => ({ ...prev, [questionIndex]: { loading: false, text: '', error: e.message } }));
    }
  }

  if (kicked) {
    return (
      <main className="min-h-screen grid place-items-center px-6 bg-red-950/20">
        <div className="w-full max-w-sm card border-red-500/50 text-center animate-pop">
          <div className="text-6xl">🚫</div>
          <h1 className="text-2xl font-bold text-red-400 mt-4">Anda Dikeluarkan</h1>
          <button onClick={() => window.location.reload()} className="btn-ghost w-full mt-6">Kembali ke Awal</button>
        </div>
      </main>
    );
  }

  if (!joined) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="w-full max-w-sm card">
          <div className="text-center text-5xl">🎮</div>
          <h1 className="text-2xl font-bold text-center mt-3">{state?.session.tournamentMode ? 'Turnamen Resmi' : 'Masuk Kuis'}</h1>
          <p className="text-center text-slate-400 text-sm mt-1">PIN <span className="font-mono text-brand-500">{pin}</span></p>
          
          {state?.session.tournamentMode ? (
            <div className="mt-5 space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200">
                <b>Peraturan Turnamen:</b><br/>1. Dilarang menyontek atau mencari jawaban di Google.<br/>2. Jawab dengan jujur dan sportif.<br/>3. Peserta yang melanggar akan didiskualifikasi.
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedToRules} onChange={e => setAgreedToRules(e.target.checked)} className="mt-1 h-4 w-4 rounded bg-slate-800 border-white/20 text-amber-500 cursor-pointer" />
                <span className="text-sm text-slate-300">Saya setuju dan siap bertanding dengan jujur.</span>
              </label>
            </div>
          ) : null}

          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama kamu" maxLength={24} disabled={!!searchParams.get('name')} className="mt-5 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-brand-500 disabled:opacity-50" />
          
          {state?.session.tournamentMode && !searchParams.get('code') && (
            <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Kode Undangan" className="mt-3 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-500 text-center font-mono" />
          )}

          {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
          
          <button onClick={join} disabled={!connected || (state?.session.tournamentMode && !agreedToRules)} className="btn-primary w-full mt-4 disabled:opacity-50">
            {connected ? (state?.session.tournamentMode ? 'Masuk Arena Turnamen →' : 'Masuk →') : 'Menghubungkan...'}
          </button>
        </div>
      </main>
    );
  }

  if (state?.session.status === 'lobby' && state?.session.tournamentMode) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm card text-center animate-pop border-amber-500/30">
          <div className="text-6xl mb-4">{myPlayer?.isReady ? '✅' : '⏳'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{myPlayer?.isReady ? 'Anda Siap!' : 'Bersiap-siap...'}</h2>
          <p className="text-slate-400 text-sm mb-6">{myPlayer?.isReady ? 'Menunggu peserta lain dan instruksi dari guru.' : 'Tekan tombol di bawah jika Anda sudah siap bertanding.'}</p>
          <button onClick={toggleReady} className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${myPlayer?.isReady ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30' : 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:bg-amber-600 animate-pulse'}`}>
            {myPlayer?.isReady ? 'Batalkan Siap' : 'SAYA SIAP! 👊'}
          </button>
        </div>
      </main>
    );
  }

  const q = state?.question;
  const isShowing = state?.session.questionState === 'showing' && q;
  
  const myFinalData = finalReport?.players?.find((p: any) => p.id === myPlayer?.id);
  const myGroup = myPlayer?.group;
  const isGroupMode = state?.session.groupMode;
  const isEliminated = myPlayer?.isEliminated;
  const isBossBattle = state?.session.isBossBattle;
  const isTournament = state?.session.tournamentMode;

  if (isEliminated && state?.session.status !== 'ended') {
    return (
      <main className="min-h-screen px-4 py-6 max-w-md mx-auto relative pb-24 flex flex-col items-center justify-center">
        <div className="card text-center border-red-500/30 bg-red-950/20 w-full animate-pop">
          <div className="text-6xl mb-4">💀</div>
          <h2 className="text-2xl font-bold text-red-400">Anda Tereliminasi</h2>
          <p className="text-slate-300 text-sm mt-2">Sayang sekali, Anda menjawab salah atau kehabisan waktu.</p>
        </div>
        <div className="card mt-4 w-full">
          <div className="text-xs uppercase text-slate-400 mb-2">Top 5</div>
          <ol className="space-y-1">
            {state.leaderboard.slice(0, 5).map(r => (
              <li key={r.id} className={`flex justify-between text-sm px-2 py-1.5 rounded ${r.id === myPlayer?.id ? 'bg-brand-500/15' : ''}`}>
                <span><span className="text-brand-500 font-mono w-5 inline-block">{r.rank}</span> {r.name} {isGroupMode && <span className="text-[10px] text-slate-500">({r.group})</span>}</span>
                <span className="font-mono">{r.score}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-900/90 backdrop-blur border-t border-white/10 flex justify-center gap-4 z-50">
          {['👏', '😂', '😮', '🔥', '💯'].map(emoji => (
            <button key={emoji} onClick={() => sendEmoji(emoji)} className="text-3xl hover:scale-125 transition-transform active:scale-90">{emoji}</button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 max-w-md mx-auto relative pb-24">
      <header className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-slate-400">{isTournament ? <span className="text-amber-400 font-bold">🏆 TURNAMEN</span> : 'Halo,'}</div>
          <div className="font-semibold flex items-center gap-2">
            {myPlayer?.name}
            {isGroupMode && myGroup && (<span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-white/10 text-white`}>{myGroup}</span>)}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMuted(!isMuted)} className="text-2xl" title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}>{isMuted ? '🔇' : '🔊'}</button>
          <div className="text-right">
            <div className="text-xs text-slate-400">Skor</div>
            <div className="text-2xl font-mono font-bold text-brand-500">{myPlayer?.score ?? 0}</div>
          </div>
        </div>
      </header>

      {state?.session.status === 'ended' && (
        <div className="card text-center animate-pop">
          <div className="text-4xl">🏁</div>
          <h2 className="text-xl font-semibold mt-2">Sesi selesai</h2>
          <p className="text-slate-400 text-sm mt-1 mb-4">Skor akhir: <span className="text-brand-500 font-mono font-bold text-lg">{myPlayer?.score}</span></p>
          
          {/* FITUR BARU: Tombol Review */}
          {reviewData && reviewData.history.length > 0 && (
            <button onClick={() => setShowReview(true)} className="btn-primary w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 mb-4">
              📖 Review Soal {reviewData.aiConfig ? '+ AI Explanation' : ''}
            </button>
          )}
          
          {myFinalData && myFinalData.badges.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4 mt-4">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-3">Pencapaianmu</div>
              <div className="flex flex-wrap justify-center gap-3">
                {myFinalData.badges.map((b: any, i: number) => (
                  <div key={i} className="flex flex-col items-center bg-white/10 px-3 py-2 rounded-lg min-w-[70px]">
                    <span className="text-3xl mb-1">{b.icon}</span>
                    <span className="text-[10px] text-center leading-tight">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {state?.session.status !== 'ended' && !isShowing && state?.session.questionState !== 'revealed' && (
        <div className="card text-center">
          <div className="text-4xl animate-pulse">⏳</div>
          <p className="mt-3 text-slate-300">Menunggu guru memulai soal...</p>
        </div>
      )}

      {isShowing && q && (
        <div className="space-y-3 animate-slide-up relative">
          {state.session.isPaused && (
            <div className="absolute inset-0 z-40 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border border-amber-500/50 animate-pop">
              <div className="text-5xl mb-2">⏸️</div>
              <div className="text-xl font-bold text-amber-400">Kuis Dijeda</div>
            </div>
          )}

          <div className="card">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Soal {state!.session.currentQuestionIndex + 1}/{state!.session.totalQuestions}</span>
              {!isPreparing && (<span className={`font-mono text-lg font-bold ${answerLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-brand-500'}`}>{answerLeft}s</span>)}
            </div>
            
            {isBossBattle && (
              <div className="mt-2 text-center animate-pulse">
                <span className="inline-block bg-gradient-to-r from-red-600 to-amber-600 text-white font-black px-4 py-1 rounded-full text-sm uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                  🔥 BOSS BATTLE - 3x Poin! 🔥
                </span>
              </div>
            )}
            
            <h2 className="text-lg font-semibold mt-2">{q.text}</h2>
            
            {q.imageUrl && (
              <div className="mt-4 rounded-xl overflow-hidden border border-white/10 flex flex-col items-center justify-center bg-black/20 p-2 min-h-[100px] relative">
                {imgLoading && !imgError && (<div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div></div>)}
                {imgError ? (<div className="text-slate-500 text-sm text-center py-4"><span className="text-2xl block mb-1">🖼️</span>Gambar gagal dimuat.</div>) : (<img src={getOptimizedImageUrl(q.imageUrl) || ''} alt="Ilustrasi Soal" className={`max-h-64 object-contain transition-opacity duration-300 ${imgLoading ? 'opacity-0' : 'opacity-100'}`} loading="lazy" onLoad={() => setImgLoading(false)} onError={() => { setImgLoading(false); setImgError(true); }} />)}
              </div>
            )}
          </div>

          {isPreparing ? (
            <div className="text-center py-8">
              <div className="text-5xl font-bold text-white animate-pop">{prepareLeft}</div>
              <div className="text-slate-400 mt-2">Bersiap untuk menjawab...</div>
            </div>
          ) : (
            <>
              {!myAnswer && !isTimeUp && !state.session.isPaused && (
                <div className="flex gap-2 justify-center py-2">
                  <button onClick={useFiftyFifty} disabled={myPlayer?.powerups?.fifty <= 0} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-semibold transition ${myPlayer?.powerups?.fifty > 0 ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/30' : 'bg-white/5 border-white/10 text-slate-600 grayscale'}`}>⚖️ 50:50 ({myPlayer?.powerups?.fifty || 0})</button>
                  <button onClick={useDoublePoints} disabled={myPlayer?.powerups?.double <= 0 || myPlayer?.activeDouble} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-semibold transition ${myPlayer?.powerups?.double > 0 && !myPlayer?.activeDouble ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30' : 'bg-white/5 border-white/10 text-slate-600 grayscale'}`}>✨ 2x Poin ({myPlayer?.activeDouble ? 'Aktif' : (myPlayer?.powerups?.double || 0)})</button>
                </div>
              )}

              {q.options.map((o, i) => {
                if (hiddenOptions.includes(i)) return null;
                const isMine = myAnswer?.choice === i;
                const disabled = !!myAnswer || submitting || isTimeUp || state.session.isPaused;
                return (
                  <button key={i} disabled={disabled} onClick={() => answer(i)} className={`option-tile ${isMine ? 'border-brand-500 bg-brand-500/20' : ''} ${disabled && !isMine ? 'opacity-50' : ''}`}>
                    <span className="h-9 w-9 grid place-items-center rounded-lg bg-brand-500/30 font-mono font-bold">{String.fromCharCode(65 + i)}</span>
                    <span>{o}</span>
                    {isMine && <span className="ml-auto text-brand-500">✓</span>}
                  </button>
                );
              })}
            </>
          )}

          {myAnswer && !isPreparing && (<div className="text-center text-sm text-slate-400 mt-2">Jawaban terkirim — menunggu hasil...</div>)}
          {error && <div className="text-red-400 text-sm text-center">{error}</div>}
        </div>
      )}

      {state?.session.questionState === 'revealed' && q && (
        <div className="card mt-3 animate-pop">
          <div className="text-xs text-slate-400">Jawaban benar</div>
          <div className="text-lg font-semibold text-emerald-400 mt-1">{q.options[q.correctIndex!]}</div>
          <div className="mt-3 text-sm">
            {myAnswer?.correct ? (<span className="text-emerald-400">✓ Benar! +{myAnswer.points} poin</span>) : myAnswer ? (<span className="text-red-400">✗ Belum tepat</span>) : (<span className="text-slate-400">Tidak menjawab</span>)}
          </div>
          {myPlayer && myPlayer.streak >= 2 && (<div className="mt-2 text-amber-400 text-sm">🔥 Streak {myPlayer.streak}</div>)}
        </div>
      )}

      {state && state.leaderboard.length > 0 && state.session.status !== 'ended' && (
        <div className="card mt-4">
          <div className="text-xs uppercase text-slate-400 mb-2">Top 5</div>
          <ol className="space-y-1">
            {state.leaderboard.slice(0, 5).map(r => (
              <li key={r.id} className={`flex justify-between text-sm px-2 py-1.5 rounded ${r.id === myPlayer?.id ? 'bg-brand-500/15' : ''}`}>
                <span><span className="text-brand-500 font-mono w-5 inline-block">{r.rank}</span> {r.name} {isGroupMode && <span className="text-[10px] text-slate-500">({r.group})</span>}</span>
                <span className="font-mono">{r.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {state?.session.status !== 'ended' && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-900/90 backdrop-blur border-t border-white/10 flex justify-center gap-4 z-50">
          {['👏', '😂', '😮', '🔥', '💯'].map(emoji => (
            <button key={emoji} onClick={() => sendEmoji(emoji)} className="text-3xl hover:scale-125 transition-transform active:scale-90">{emoji}</button>
          ))}
        </div>
      )}

      {/* ================= MODAL REVIEW MODE ================= */}
      {showReview && reviewData && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border border-purple-500/30 rounded-2xl p-4 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-purple-400">📖 Review Soal</h2>
                <p className="text-xs text-slate-400">{reviewData.bankName} · {reviewData.hostName}</p>
              </div>
              <button onClick={() => setShowReview(false)} className="text-slate-400 hover:text-white text-2xl">✕</button>
            </div>

            {/* List Soal */}
            <div className="space-y-4">
              {reviewData.history.map((item: any, idx: number) => {
                const isWrong = !item.correct;
                return (
                  <div key={idx} className={`card border-2 ${item.correct ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-rose-500/30 bg-rose-950/10'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-slate-300">Soal {idx + 1}</div>
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {item.correct ? `✓ +${item.points} poin` : '✗ Salah'}
                      </div>
                    </div>
                    <div className="text-base font-medium text-white mb-3">{item.questionText}</div>
                    {item.imageUrl && (
                      <img src={getOptimizedImageUrl(item.imageUrl) || ''} alt="Soal" className="max-h-40 object-contain rounded-lg mb-3 bg-black/20 p-1" />
                    )}
                    <div className="space-y-2 mb-3">
                      {item.options.map((opt: string, oi: number) => {
                        const isCorrectAnswer = oi === item.correctIndex;
                        const isPlayerChoice = oi === item.playerChoice;
                        let bg = 'bg-white/5 border-white/10';
                        let label = '';
                        if (isCorrectAnswer) { bg = 'bg-emerald-500/20 border-emerald-500/50'; label = '✓ Jawaban Benar'; }
                        else if (isPlayerChoice) { bg = 'bg-rose-500/20 border-rose-500/50'; label = '✗ Jawabanmu'; }
                        return (
                          <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bg} text-sm`}>
                            <span className="font-mono font-bold text-brand-400">{String.fromCharCode(65 + oi)}.</span>
                            <span className="flex-1">{opt}</span>
                            {label && <span className="text-[10px] font-bold whitespace-nowrap">{label}</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* AI Explanation Button (Hanya untuk soal salah) */}
                    {isWrong && reviewData.aiConfig && (
                      <div className="border-t border-white/10 pt-3">
                        {!explanations[idx] ? (
                          <button 
                            onClick={() => explainWithAI(idx)}
                            className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-sm transition"
                          >
                            🤖 Jelaskan Kenapa Saya Salah
                          </button>
                        ) : explanations[idx].loading ? (
                          <div className="text-center py-3">
                            <div className="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="text-xs text-slate-400 mt-1">AI sedang menganalisis...</div>
                          </div>
                        ) : explanations[idx].error ? (
                          <div className="text-sm text-rose-400 bg-rose-950/30 p-3 rounded-lg">
                            ⚠️ {explanations[idx].error}
                            <button onClick={() => explainWithAI(idx)} className="block text-xs mt-2 underline">Coba lagi</button>
                          </div>
                        ) : (
                          <div className="bg-purple-950/30 border border-purple-500/30 rounded-lg p-3">
                            <div className="text-xs font-bold text-purple-300 mb-2">🤖 Penjelasan AI:</div>
                            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{explanations[idx].text}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 mb-8 text-center">
              <button onClick={() => setShowReview(false)} className="btn-ghost px-6">Tutup Review</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
