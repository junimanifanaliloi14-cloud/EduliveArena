// In-memory store + scoring engine (MVP). Produksi: swap ke PostgreSQL+Redis.
function nid(len = 8) {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let o = '';
  for (let i = 0; i < len; i++) o += c[Math.floor(Math.random() * c.length)];
  return o;
}

const SEED_BANK = {
  id: 'bank_demo_1',
  name: 'Matematika Dasar - Operasi Bilangan',
  subject: 'Matematika',
  createdAt: Date.now(),
  questions: [
    { id: 'q1', text: 'Berapakah hasil dari 7 x 8?', options: ['54', '56', '58', '64'], correctIndex: 1, timeLimitSec: 20 },
    { id: 'q2', text: 'Hasil dari 144 / 12 adalah...', options: ['10', '11', '12', '14'], correctIndex: 2, timeLimitSec: 20 },
    { id: 'q3', text: 'Manakah bilangan prima?', options: ['21', '27', '29', '33'], correctIndex: 2, timeLimitSec: 20 },
    { id: 'q4', text: 'Hasil dari 15 + 27 - 8 =', options: ['32', '34', '36', '38'], correctIndex: 1, timeLimitSec: 20 },
    { id: 'q5', text: 'FPB dari 12 dan 18 adalah...', options: ['2', '3', '6', '9'], correctIndex: 2, timeLimitSec: 25 },
  ],
};

class Store {
  constructor() {
    this.banks = new Map();
    this.sessions = new Map();
    this.sessionsByPin = new Map();
    this.timers = new Map();
    this.banks.set(SEED_BANK.id, SEED_BANK);
  }

  listBanks() {
    // Kembalikan data bank beserta soal-soalnya untuk keperluan UI Guru
    return Array.from(this.banks.values()).map(b => ({
      id: b.id, name: b.name, subject: b.subject, questionCount: b.questions.length, createdAt: b.createdAt,
      questions: b.questions.map(q => ({ id: q.id, text: q.text })) 
    }));
  }
  getBank(id) { return this.banks.get(id); }
  createBank({ name, subject, questions = [] }) {
    const bank = { id: 'bank_' + nid(), name: name || 'Bank Baru', subject: subject || 'Umum', questions, createdAt: Date.now() };
    this.banks.set(bank.id, bank);
    return bank;
  }

  createSession({ bankId, hostName, timeLimitSec, autoReveal = true, teamMode = false, eliminationMode = false, bossQuestions = [] }) {
    const bank = this.banks.get(bankId);
    if (!bank) throw new Error('Bank tidak ditemukan');
    const session = {
      id: 'sess_' + nid(), pin: this._genPin(), bankId,
      hostName: hostName || 'Guru', status: 'lobby',
      timeLimitSec: timeLimitSec || 20,
      autoReveal: autoReveal,
      teamMode: teamMode,
      eliminationMode: eliminationMode,
      bossQuestions: bossQuestions, // Array indeks soal Boss Battle
      currentQuestionIndex: -1, questionState: 'idle',
      questionStartAt: null, questionEndAt: null,
      isPaused: false, pauseStartAt: null,
      players: new Map(), currentAnswers: new Map(),
      questionStats: [],
      createdAt: Date.now(), endedAt: null,
    };
    this.sessions.set(session.id, session);
    this.sessionsByPin.set(session.pin, session.id);
    return session;
  }
  _genPin() {
    for (let i = 0; i < 100; i++) {
      const pin = String(Math.floor(100000 + Math.random() * 900000));
      if (!this.sessionsByPin.has(pin)) return pin;
    }
    throw new Error('Gagal generate PIN');
  }
  getSession(id) { return this.sessions.get(id); }
  getSessionByPin(pin) { const id = this.sessionsByPin.get(pin); return id ? this.sessions.get(id) : null; }

  startSession(id) {
    const s = this.sessions.get(id);
    if (!s) throw new Error('Sesi tidak ditemukan');
    if (s.status === 'lobby') s.status = 'live';
    return s;
  }
  nextQuestion(id) {
    const s = this.sessions.get(id);
    if (!s) throw new Error('Sesi tidak ditemukan');
    const bank = this.banks.get(s.bankId);
    if (s.currentQuestionIndex + 1 >= bank.questions.length) return { ...s, done: true };
    
    this._clearTimer(id);

    s.currentQuestionIndex++;
    s.questionState = 'showing';
    s.isPaused = false;
    s.pauseStartAt = null;
    const q = bank.questions[s.currentQuestionIndex];
    const timeLimit = s.timeLimitSec || q.timeLimitSec || 20;
    
    s.questionStartAt = Date.now() + 3000; 
    s.questionEndAt = s.questionStartAt + (timeLimit * 1000);
    s.currentAnswers.clear();

    if (s.autoReveal) {
      const delay = (s.questionEndAt - Date.now()) + 500;
      const timer = setTimeout(() => this._autoReveal(id), delay);
      this.timers.set(id, timer);
    }

    return s;
  }
  
  _autoReveal(id) {
    const s = this.sessions.get(id);
    if (!s || s.questionState !== 'showing' || s.isPaused) return;
    this.revealAnswer(id);
    if (globalThis.__IO__) {
      globalThis.__IO__.to('session:' + id).emit('session:state', this.getPublicState(id));
      for (const pid of s.players.keys()) {
        globalThis.__IO__.to('player:' + pid).emit('player:state', this.getPlayerState(id, pid));
      }
    }
  }

  _clearTimer(id) {
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
  }

  pauseTimer(id) {
    const s = this.sessions.get(id);
    if (!s || s.questionState !== 'showing' || s.isPaused) return s;
    s.isPaused = true;
    s.pauseStartAt = Date.now();
    this._clearTimer(id);
    return s;
  }

  resumeTimer(id) {
    const s = this.sessions.get(id);
    if (!s || !s.isPaused) return s;
    const pauseDuration = Date.now() - s.pauseStartAt;
    s.questionStartAt += pauseDuration;
    s.questionEndAt += pauseDuration;
    s.isPaused = false;
    s.pauseStartAt = null;

    if (s.autoReveal) {
      const delay = (s.questionEndAt - Date.now()) + 500;
      if (delay > 0) {
        const timer = setTimeout(() => this._autoReveal(id), delay);
        this.timers.set(id, timer);
      }
    }
    return s;
  }

  revealAnswer(id) {
    const s = this.sessions.get(id);
    if (!s) throw new Error('Sesi tidak ditemukan');
    this._clearTimer(id);
    if (s.questionState === 'revealed') return s;

    s.questionState = 'revealed';
    s.isPaused = false;
    
    let correctCount = 0;
    const totalPlayers = s.players.size;

    for (const [pid, p] of s.players) {
      const ans = s.currentAnswers.get(pid);
      if (ans) {
        p.score += ans.points;
        p.streak = ans.newStreak;
        p.maxStreak = Math.max(p.maxStreak || 0, p.streak);
        p.totalAnswers++;
        if (ans.correct) {
          p.correctCount++;
          correctCount++;
        } else if (s.eliminationMode && !p.isEliminated) {
          p.isEliminated = true;
        }
      } else {
        s.currentAnswers.set(pid, { playerId: pid, choice: null, correct: false, points: 0, noAnswer: true });
        p.streak = 0;
        p.totalAnswers++;
        if (s.eliminationMode && !p.isEliminated) {
          p.isEliminated = true;
        }
      }
      p.activeDouble = false;
    }

    const bank = this.banks.get(s.bankId);
    const q = bank.questions[s.currentQuestionIndex];
    const wrongCount = totalPlayers - correctCount;
    s.questionStats[s.currentQuestionIndex] = {
      index: s.currentQuestionIndex,
      text: q.text,
      total: totalPlayers,
      correct: correctCount,
      wrong: wrongCount,
      accuracy: totalPlayers > 0 ? Math.round((correctCount / totalPlayers) * 100) : 0
    };

    return s;
  }
  endSession(id) {
    const s = this.sessions.get(id);
    if (!s) throw new Error('Sesi tidak ditemukan');
    this._clearTimer(id);
    s.status = 'ended';
    s.endedAt = Date.now();
    return s;
  }

  joinSession(sessionId, name) {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('Sesi tidak ditemukan');
    if (s.status === 'ended') throw new Error('Sesi telah berakhir');
    
    let team = null;
    if (s.teamMode) {
      const countA = Array.from(s.players.values()).filter(p => p.team === 'A').length;
      const countB = Array.from(s.players.values()).filter(p => p.team === 'B').length;
      team = countA <= countB ? 'A' : 'B';
    }

    const player = {
      id: 'p_' + nid(), name: (name || 'Anonim').trim().slice(0, 24) || 'Anonim',
      score: 0, streak: 0, maxStreak: 0, correctCount: 0, totalAnswers: 0, joinedAt: Date.now(),
      online: true, team,
      powerups: { fifty: 1, double: 1 },
      activeDouble: false,
      isEliminated: false
    };
    s.players.set(player.id, player);
    return player;
  }
  setPlayerOnline(sessionId, playerId, online) {
    const s = this.sessions.get(sessionId);
    if (s && s.players.get(playerId)) s.players.get(playerId).online = online;
  }

  kickPlayer(sessionId, playerId) {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('Sesi tidak ditemukan');
    s.players.delete(playerId);
    s.currentAnswers.delete(playerId);
    return s;
  }

  usePowerup(sessionId, playerId, type) {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('Sesi tidak ditemukan');
    const p = s.players.get(playerId);
    if (!p || p.isEliminated) throw new Error('Pemain tidak ditemukan atau sudah tereliminasi');
    
    if (type === 'fifty') {
      if (p.powerups.fifty <= 0) throw new Error('Kuota 50:50 habis');
      p.powerups.fifty--;
      const bank = this.banks.get(s.bankId);
      const q = bank.questions[s.currentQuestionIndex];
      const wrongIndices = [0,1,2,3].filter(i => i !== q.correctIndex);
      wrongIndices.sort(() => Math.random() - 0.5);
      return { ok: true, hidden: wrongIndices.slice(0, 2) };
    } 
    
    if (type === 'double') {
      if (p.powerups.double <= 0) throw new Error('Kuota Poin Ganda habis');
      p.powerups.double--;
      p.activeDouble = true;
      return { ok: true };
    }
    
    throw new Error('Tipe power-up tidak valid');
  }

  submitAnswer(sessionId, playerId, choice) {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('Sesi tidak ditemukan');
    if (s.questionState !== 'showing') throw new Error('Soal tidak aktif');
    if (s.isPaused) throw new Error('Kuis sedang dijeda');
    if (Date.now() < s.questionStartAt) throw new Error('Soal belum dimulai');
    if (Date.now() > s.questionEndAt) throw new Error('Waktu habis');
    
    const p = s.players.get(playerId);
    if (!p) throw new Error('Pemain tidak ditemukan');
    if (p.isEliminated) throw new Error('Anda sudah tereliminasi');
    if (s.currentAnswers.has(playerId)) throw new Error('Sudah menjawab');

    const bank = this.banks.get(s.bankId);
    const q = bank.questions[s.currentQuestionIndex];
    const correct = Number(choice) === q.correctIndex;
    const timeUsed = Date.now() - s.questionStartAt;
    const timeLimit = s.questionEndAt - s.questionStartAt;
    const result = this._score({ correct, timeUsed, timeLimit, streak: p.streak });

    let finalPoints = result.points;
    
    // Boss Battle 3x (Mengecek dari array pilihan guru)
    const isBossBattle = s.bossQuestions.includes(s.currentQuestionIndex);
    if (correct && isBossBattle) {
      finalPoints = finalPoints * 3;
    }

    if (p.activeDouble) {
      finalPoints = finalPoints * 2;
    }

    s.currentAnswers.set(playerId, { 
      playerId, choice, submittedAt: Date.now(), correct, 
      points: finalPoints, newStreak: result.newStreak 
    });

    return { correct, points: finalPoints, newStreak: result.newStreak, totalScore: p.score };
  }
  _score({ correct, timeUsed, timeLimit, streak }) {
    if (!correct) return { points: 0, newStreak: 0 };
    const speedBonus = Math.round(500 * Math.max(0, 1 - timeUsed / timeLimit));
    const streakBonus = Math.min(500, streak * 100);
    return { points: 1000 + speedBonus + streakBonus, newStreak: streak + 1 };
  }

  getPublicState(sessionId) {
    const s = this.sessions.get(sessionId);
    if (!s) return null;
    const bank = this.banks.get(s.bankId);
    const q = s.currentQuestionIndex >= 0 ? bank.questions[s.currentQuestionIndex] : null;
    const isBossBattle = s.bossQuestions.includes(s.currentQuestionIndex);

    const leaderboard = Array.from(s.players.values())
      .sort((a, b) => b.score - a.score).slice(0, 20)
      .map((p, i) => ({ rank: i + 1, id: p.id, name: p.name, score: p.score, streak: p.streak, team: p.team, isEliminated: p.isEliminated }));

    const allPlayers = Array.from(s.players.values())
      .map(p => ({ id: p.id, name: p.name, score: p.score, online: p.online, team: p.team, isEliminated: p.isEliminated }));

    const answerStats = { total: 0, correct: 0, byChoice: [0, 0, 0, 0] };
    if (s.questionState !== 'idle') {
      for (const a of s.currentAnswers.values()) {
        answerStats.total++;
        if (a.correct) answerStats.correct++;
        if (typeof a.choice === 'number' && a.choice >= 0 && a.choice < 4) answerStats.byChoice[a.choice]++;
      }
    }
    const revealCorrect = s.questionState === 'revealed' && q ? q.correctIndex : null;

    let teamScores = { A: 0, B: 0 };
    if (s.teamMode) {
      for (const p of s.players.values()) {
        if (p.team === 'A') teamScores.A += p.score;
        if (p.team === 'B') teamScores.B += p.score;
      }
    }

    return {
      session: {
        id: s.id, pin: s.pin, hostName: s.hostName, status: s.status,
        questionState: s.questionState, currentQuestionIndex: s.currentQuestionIndex,
        totalQuestions: bank.questions.length, bankName: bank.name, autoReveal: s.autoReveal,
        teamMode: s.teamMode, teamScores: s.teamMode ? teamScores : null,
        eliminationMode: s.eliminationMode,
        isPaused: s.isPaused, pauseStartAt: s.pauseStartAt,
        isBossBattle: isBossBattle,
        questionStartAt: s.questionStartAt, questionEndAt: s.questionEndAt, serverNow: Date.now(),
      },
      question: q ? { id: q.id, text: q.text, options: q.options, timeLimitSec: s.timeLimitSec, correctIndex: revealCorrect } : null,
      leaderboard, allPlayers, answerStats, playerCount: s.players.size,
    };
  }
  getPlayerState(sessionId, playerId) {
    const s = this.sessions.get(sessionId);
    if (!s) return null;
    const p = s.players.get(playerId);
    if (!p) return null;
    return {
      player: { id: p.id, name: p.name, score: p.score, streak: p.streak, team: p.team, powerups: p.powerups, activeDouble: p.activeDouble, isEliminated: p.isEliminated },
      myAnswer: s.currentAnswers.get(playerId) || null,
    };
  }
  getReport(sessionId) {
    const s = this.sessions.get(sessionId);
    if (!s) return null;
    const bank = this.banks.get(s.bankId);
    
    const sortedPlayers = Array.from(s.players.values()).sort((a, b) => b.score - a.score);
    
    const playersWithBadges = sortedPlayers.map((p, index) => {
      const badges = [];
      if (index === 0) badges.push({ icon: '🥇', label: 'Juara 1' });
      else if (index === 1) badges.push({ icon: '🥈', label: 'Juara 2' });
      else if (index === 2) badges.push({ icon: '🥉', label: 'Juara 3' });

      if (p.totalAnswers > 0 && p.correctCount === p.totalAnswers) {
        badges.push({ icon: '🎯', label: 'Sniper (100%)' });
      }
      if (p.maxStreak >= 3) {
        badges.push({ icon: '🔥', label: `Streak ${p.maxStreak}x` });
      }

      return {
        id: p.id, name: p.name, score: p.score, correct: p.correctCount, total: p.totalAnswers,
        accuracy: p.totalAnswers ? Math.round((p.correctCount / p.totalAnswers) * 100) : 0,
        team: p.team, badges, isEliminated: p.isEliminated
      };
    });

    let teamScores = { A: 0, B: 0 };
    if (s.teamMode) {
      for (const p of sortedPlayers) {
        if (p.team === 'A') teamScores.A += p.score;
        if (p.team === 'B') teamScores.B += p.score;
      }
    }

    const validStats = s.questionStats.filter(Boolean);
    const hardestQuestions = [...validStats]
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 3)
      .filter(q => q.wrong > 0);

    return {
      sessionId: s.id, pin: s.pin, hostName: s.hostName, bankName: bank.name,
      totalQuestions: bank.questions.length, startedAt: s.createdAt, endedAt: s.endedAt,
      teamMode: s.teamMode, teamScores: s.teamMode ? teamScores : null,
      players: playersWithBadges, hardestQuestions,
    };
  }
}

if (!globalThis.__STORE__) globalThis.__STORE__ = new Store();
export const store = globalThis.__STORE__;
export default store;
