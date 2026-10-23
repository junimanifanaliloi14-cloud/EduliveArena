import fs from 'fs';
import path from 'path';

function nid(len = 8) {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let o = '';
  for (let i = 0; i < len; i++) o += c[Math.floor(Math.random() * c.length)];
  return o;
}

const SEED_BANK = {
  id: 'bank_demo_1', name: 'Matematika Dasar - Operasi Bilangan', subject: 'Matematika', createdAt: Date.now(),
  questions: [
    { id: 'q1', text: 'Berapakah hasil dari 7 x 8?', options: ['54', '56', '58', '64'], correctIndex: 1, timeLimitSec: 20, imageUrl: null },
    { id: 'q2', text: 'Hasil dari 144 / 12 adalah...', options: ['10', '11', '12', '14'], correctIndex: 2, timeLimitSec: 20, imageUrl: null },
    { id: 'q3', text: 'Manakah bilangan prima?', options: ['21', '27', '29', '33'], correctIndex: 2, timeLimitSec: 20, imageUrl: null },
    { id: 'q4', text: 'Hasil dari 15 + 27 - 8 =', options: ['32', '34', '36', '38'], correctIndex: 1, timeLimitSec: 20, imageUrl: null },
    { id: 'q5', text: 'FPB dari 12 dan 18 adalah...', options: ['2', '3', '6', '9'], correctIndex: 2, timeLimitSec: 25, imageUrl: null },
  ],
};

const DATA_DIR = path.join(process.cwd(), 'data');
const BANKS_FILE = path.join(DATA_DIR, 'banks.json');
const PRACTICE_FILE = path.join(DATA_DIR, 'practice.json');

function ensureDataDir() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }
  catch (e) { console.error('[Persistence] Failed to create data dir:', e); }
}

function loadBanksFromDisk() {
  try {
    ensureDataDir();
    if (fs.existsSync(BANKS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(BANKS_FILE, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) { console.log(`[Persistence] Loaded ${parsed.length} bank(s)`); return parsed; }
    }
  } catch (e) { console.error('[Persistence] Failed to load banks:', e); }
  return null;
}

function saveBanksToDisk(banksMap) {
  try {
    ensureDataDir();
    const tmpFile = BANKS_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(Array.from(banksMap.values()), null, 2));
    fs.renameSync(tmpFile, BANKS_FILE);
  } catch (e) { console.error('[Persistence] Failed to save banks:', e); }
}

function loadPracticeFromDisk() {
  try {
    ensureDataDir();
    if (fs.existsSync(PRACTICE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PRACTICE_FILE, 'utf-8'));
      if (parsed && Array.isArray(parsed.codes)) return parsed.codes;
    }
  } catch (e) { console.error('[Persistence] Failed to load practice:', e); }
  return [];
}

function savePracticeToDisk(codesMap) {
  try {
    ensureDataDir();
    fs.writeFileSync(PRACTICE_FILE, JSON.stringify({ codes: Array.from(codesMap.values()) }, null, 2));
  } catch (e) { console.error('[Persistence] Failed to save practice:', e); }
}

class Store {
  constructor() {
    this.banks = new Map();
    this.sessions = new Map();
    this.sessionsByPin = new Map();
    this.timers = new Map();
    this.practiceCodes = new Map();

    const savedBanks = loadBanksFromDisk();
    if (savedBanks && savedBanks.length > 0) {
      for (const bank of savedBanks) this.banks.set(bank.id, bank);
    } else {
      this.banks.set(SEED_BANK.id, SEED_BANK);
      saveBanksToDisk(this.banks);
    }

    const savedPractice = loadPracticeFromDisk();
    for (const c of savedPractice) this.practiceCodes.set(c.code, c);
  }

  _save() { saveBanksToDisk(this.banks); }
  _savePractice() { savePracticeToDisk(this.practiceCodes); }

  listBanks() {
    return Array.from(this.banks.values()).map(b => ({
      id: b.id, name: b.name, subject: b.subject, questionCount: b.questions.length, createdAt: b.createdAt, questions: b.questions
    }));
  }
  getBank(id) { return this.banks.get(id); }
  createBank({ name, subject, questions = [] }) {
    const bank = { id: 'bank_' + nid(), name: name || 'Bank Baru', subject: subject || 'Umum', questions, createdAt: Date.now() };
    this.banks.set(bank.id, bank); this._save(); return bank;
  }
  updateBank(id, { name, subject, questions }) {
    const bank = this.banks.get(id); if (!bank) throw new Error('Bank tidak ditemukan');
    if (name !== undefined) bank.name = name;
    if (subject !== undefined) bank.subject = subject;
    if (questions !== undefined) bank.questions = questions;
    this._save(); return bank;
  }
  deleteBank(id) {
    this.banks.delete(id);
    for (const [code, entry] of this.practiceCodes.entries()) {
      if (entry.bankId === id) this.practiceCodes.delete(code);
    }
    this._save();
    this._savePractice();
  }

  exportAllBanks() { return Array.from(this.banks.values()); }
  importAllBanks(banksArray) {
    if (!Array.isArray(banksArray)) throw new Error('Format data tidak valid');
    this.banks.clear(); this.sessions.clear(); this.sessionsByPin.clear(); this.practiceCodes.clear();
    for (const bank of banksArray) {
      if (bank.id && Array.isArray(bank.questions)) this.banks.set(bank.id, bank);
    }
    this._save();
    this._savePractice();
    return this.banks.size;
  }

  // ====== PRACTICE MODE ======
  generatePracticeCode(bankId) {
    const bank = this.banks.get(bankId);
    if (!bank) throw new Error('Bank tidak ditemukan');
    const existing = Array.from(this.practiceCodes.values()).find(c => c.bankId === bankId);
    if (existing) return existing;
    let code;
    for (let i = 0; i < 100; i++) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      if (!this.practiceCodes.has(code)) break;
    }
    const entry = { code, bankId, bankName: bank.name, subject: bank.subject, questionCount: bank.questions.length, createdAt: Date.now() };
    this.practiceCodes.set(code, entry);
    this._savePractice();
    return entry;
  }
  listPracticeCodes() { return Array.from(this.practiceCodes.values()).sort((a, b) => b.createdAt - a.createdAt); }
  deletePracticeCode(code) { this.practiceCodes.delete(code.toUpperCase()); this._savePractice(); }
  getBankQuestionsForPractice(code, limit = 10) {
    const entry = this.practiceCodes.get(code.toUpperCase());
    if (!entry) throw new Error('Kode latihan tidak valid atau sudah tidak aktif');
    const bank = this.banks.get(entry.bankId);
    if (!bank) throw new Error('Bank soal sudah tidak tersedia');
    if (bank.questions.length === 0) throw new Error('Bank soal ini masih kosong');
    const shuffled = [...bank.questions].sort(() => Math.random() - 0.5).slice(0, Math.min(limit, bank.questions.length));
    const questions = shuffled.map(q => {
      const owi = q.options.map((opt, idx) => ({ opt, isCorrect: idx === q.correctIndex }));
      owi.sort(() => Math.random() - 0.5);
      return { id: q.id, text: q.text, options: owi.map(o => o.opt), correctIndex: owi.findIndex(o => o.isCorrect), imageUrl: q.imageUrl };
    });
    return { code: entry.code, bankName: bank.name, subject: bank.subject, questions };
  }

  // ====== SESSION (tidak diubah) ======
  createSession({ bankId, hostName, hostAvatar, hostLogo, theme = 'classic', timeLimitSec, autoReveal = true, ttsEnabled = false, ttsSpeed = 1, groupMode = false, groupCount = 2, groupNames = ['Merah', 'Biru', 'Hijau', 'Kuning'], eliminationMode = false, bossQuestions = [], shuffleOptions = false, tournamentMode = false, expectedPlayers = 0, invitationCodes = [], aiConfig = null, autoPlay = false, autoPlayDelaySec = 5 }) {
    const bank = this.banks.get(bankId);
    if (!bank) throw new Error('Bank tidak ditemukan');
    const session = {
      id: 'sess_' + nid(), pin: this._genPin(), bankId,
      hostName: hostName || 'Guru', hostAvatar: hostAvatar || '👩‍🏫', hostLogo: hostLogo || null, theme,
      status: 'lobby', timeLimitSec: timeLimitSec || 20, autoReveal, ttsEnabled, ttsSpeed,
      groupMode, groupCount, groupNames, eliminationMode, bossQuestions, shuffleOptions,
      tournamentMode, expectedPlayers, invitationCodes, aiConfig,
      autoPlay, autoPlayDelaySec, isAutoPlaying: false,
      currentQuestionIndex: -1, questionState: 'idle', currentQ: null,
      questionStartAt: null, questionEndAt: null, isPaused: false, pauseStartAt: null,
      players: new Map(), currentAnswers: new Map(), questionStats: [],
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
    const s = this.sessions.get(id); if (!s) throw new Error('Sesi tidak ditemukan');
    if (s.status === 'lobby') { s.status = 'live'; if (s.autoPlay) { s.isAutoPlaying = true; this._autoPlayTick(id); } }
    return s;
  }
  stopAutoPlay(id) { const s = this.sessions.get(id); if (s) s.isAutoPlaying = false; return s; }
  _autoPlayTick(id) {
    const s = this.sessions.get(id); if (!s || !s.isAutoPlaying) return;
    if (s.isPaused) { setTimeout(() => this._autoPlayTick(id), 500); return; }
    if (s.status === 'ended') { s.isAutoPlaying = false; return; }
    const bank = this.banks.get(s.bankId);
    if (s.currentQuestionIndex + 1 >= bank.questions.length && s.questionState === 'revealed') {
      setTimeout(() => { const s2 = this.sessions.get(id); if (!s2 || !s2.isAutoPlaying) return; this.endSession(id); s2.isAutoPlaying = false; this._emitState(id); }, s.autoPlayDelaySec * 1000);
      return;
    }
    if (s.questionState === 'idle' || s.questionState === 'revealed') {
      const waitTime = s.questionState === 'revealed' ? s.autoPlayDelaySec * 1000 : 1500;
      setTimeout(() => { const s2 = this.sessions.get(id); if (!s2 || !s2.isAutoPlaying) return; if (s2.isPaused) { this._autoPlayTick(id); return; } this.nextQuestion(id); this._emitState(id); this._autoPlayTick(id); }, waitTime);
      return;
    }
    if (s.questionState === 'showing') {
      const waitMs = Math.max(0, s.questionEndAt - Date.now() + 500);
      setTimeout(() => { const s2 = this.sessions.get(id); if (!s2 || !s2.isAutoPlaying) return; if (s2.isPaused) { this._autoPlayTick(id); return; } if (s2.questionState === 'showing') { this.revealAnswer(id); this._emitState(id); } this._autoPlayTick(id); }, waitMs);
    }
  }
  _emitState(id) {
    if (globalThis.__IO__) {
      const s = this.sessions.get(id); if (!s) return;
      globalThis.__IO__.to('session:' + id).emit('session:state', this.getPublicState(id));
      for (const pid of s.players.keys()) globalThis.__IO__.to('player:' + pid).emit('player:state', this.getPlayerState(id, pid));
    }
  }
  nextQuestion(id) {
    const s = this.sessions.get(id); if (!s) throw new Error('Sesi tidak ditemukan');
    const bank = this.banks.get(s.bankId);
    if (s.currentQuestionIndex + 1 >= bank.questions.length) return { ...s, done: true };
    this._clearTimer(id);
    s.currentQuestionIndex++; s.questionState = 'showing'; s.isPaused = false; s.pauseStartAt = null;
    const rawQ = bank.questions[s.currentQuestionIndex];
    const timeLimit = rawQ.timeLimitSec || s.timeLimitSec || 20;
    if (s.shuffleOptions) {
      const owi = rawQ.options.map((opt, idx) => ({ opt, isCorrect: idx === rawQ.correctIndex }));
      owi.sort(() => Math.random() - 0.5);
      s.currentQ = { ...rawQ, options: owi.map(o => o.opt), correctIndex: owi.findIndex(o => o.isCorrect), timeLimitSec: timeLimit };
    } else { s.currentQ = { ...rawQ, timeLimitSec: timeLimit }; }
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
      for (const pid of s.players.keys()) globalThis.__IO__.to('player:' + pid).emit('player:state', this.getPlayerState(id, pid));
    }
  }
  _clearTimer(id) { if (this.timers.has(id)) { clearTimeout(this.timers.get(id)); this.timers.delete(id); } }
  pauseTimer(id) { const s = this.sessions.get(id); if (!s || s.questionState !== 'showing' || s.isPaused) return s; s.isPaused = true; s.pauseStartAt = Date.now(); this._clearTimer(id); return s; }
  resumeTimer(id) {
    const s = this.sessions.get(id); if (!s || !s.isPaused) return s;
    const pd = Date.now() - s.pauseStartAt;
    s.questionStartAt += pd; s.questionEndAt += pd; s.isPaused = false; s.pauseStartAt = null;
    if (s.autoReveal) { const delay = (s.questionEndAt - Date.now()) + 500; if (delay > 0) { const timer = setTimeout(() => this._autoReveal(id), delay); this.timers.set(id, timer); } }
    return s;
  }
  revealAnswer(id) {
    const s = this.sessions.get(id); if (!s) throw new Error('Sesi tidak ditemukan');
    this._clearTimer(id); if (s.questionState === 'revealed') return s;
    s.questionState = 'revealed'; s.isPaused = false;
    let correctCount = 0; const totalPlayers = s.players.size;
    for (const [pid, p] of s.players) {
      const ans = s.currentAnswers.get(pid);
      if (ans) {
        p.score += ans.points; p.streak = ans.newStreak;
        p.maxStreak = Math.max(p.maxStreak || 0, p.streak);
        p.totalAnswers++;
        if (ans.correct) { p.correctCount++; correctCount++; }
        else if (s.eliminationMode && !p.isEliminated) p.isEliminated = true;
      } else {
        s.currentAnswers.set(pid, { playerId: pid, choice: null, correct: false, points: 0, noAnswer: true });
        p.streak = 0; p.totalAnswers++;
        if (s.eliminationMode && !p.isEliminated) p.isEliminated = true;
      }
      if (!p.history) p.history = [];
      const fa = s.currentAnswers.get(pid);
      p.history.push({ questionIndex: s.currentQuestionIndex, questionText: s.currentQ.text, options: s.currentQ.options, correctIndex: s.currentQ.correctIndex, playerChoice: fa.choice, correct: fa.correct || false, points: fa.points || 0, imageUrl: s.currentQ.imageUrl || null });
      p.activeDouble = false;
    }
    const wrongCount = totalPlayers - correctCount;
    s.questionStats[s.currentQuestionIndex] = { index: s.currentQuestionIndex, text: s.currentQ.text, total: totalPlayers, correct: correctCount, wrong: wrongCount, accuracy: totalPlayers > 0 ? Math.round((correctCount / totalPlayers) * 100) : 0 };
    return s;
  }
  endSession(id) { const s = this.sessions.get(id); if (!s) throw new Error('Sesi tidak ditemukan'); this._clearTimer(id); s.isAutoPlaying = false; s.status = 'ended'; s.endedAt = Date.now(); return s; }
  joinSession(sessionId, name, code) {
    const s = this.sessions.get(sessionId); if (!s) throw new Error('Sesi tidak ditemukan');
    if (s.status === 'ended') throw new Error('Sesi telah berakhir');
    if (s.tournamentMode) {
      const invite = s.invitationCodes.find(p => p.name.toLowerCase() === name.trim().toLowerCase() && p.code === code);
      if (!invite) throw new Error('Nama atau Kode Undangan tidak valid!');
      if (Array.from(s.players.values()).some(p => p.name.toLowerCase() === name.trim().toLowerCase())) throw new Error('Nama ini sudah digunakan!');
    }
    let group = null;
    if (s.groupMode) {
      const counts = {}; s.groupNames.slice(0, s.groupCount).forEach(g => counts[g] = 0);
      Array.from(s.players.values()).forEach(p => { if (p.group) counts[p.group]++; });
      let mg = s.groupNames[0], mc = Infinity;
      Object.keys(counts).forEach(g => { if (counts[g] < mc) { mc = counts[g]; mg = g; } });
      group = mg;
    }
    const player = { id: 'p_' + nid(), name: (name || 'Anonim').trim().slice(0, 24) || 'Anonim', score: 0, streak: 0, maxStreak: 0, correctCount: 0, totalAnswers: 0, joinedAt: Date.now(), online: true, group, powerups: { fifty: 1, double: 1 }, activeDouble: false, isEliminated: false, isReady: false, history: [] };
    s.players.set(player.id, player); return player;
  }
  setPlayerOnline(sessionId, playerId, online) { const s = this.sessions.get(sessionId); if (s && s.players.get(playerId)) s.players.get(playerId).online = online; }
  toggleReady(sessionId, playerId) { const s = this.sessions.get(sessionId); if (s && s.players.has(playerId)) { s.players.get(playerId).isReady = !s.players.get(playerId).isReady; return s; } return null; }
  kickPlayer(sessionId, playerId) { const s = this.sessions.get(sessionId); if (!s) throw new Error('Sesi tidak ditemukan'); s.players.delete(playerId); s.currentAnswers.delete(playerId); return s; }
  usePowerup(sessionId, playerId, type) {
    const s = this.sessions.get(sessionId); if (!s) throw new Error('Sesi tidak ditemukan');
    const p = s.players.get(playerId); if (!p || p.isEliminated) throw new Error('Pemain tidak ditemukan atau sudah tereliminasi');
    if (type === 'fifty') { if (p.powerups.fifty <= 0) throw new Error('Kuota 50:50 habis'); p.powerups.fifty--; const w = [0,1,2,3].filter(i => i !== s.currentQ.correctIndex); w.sort(() => Math.random() - 0.5); return { ok: true, hidden: w.slice(0, 2) }; }
    if (type === 'double') { if (p.powerups.double <= 0) throw new Error('Kuota Poin Ganda habis'); p.powerups.double--; p.activeDouble = true; return { ok: true }; }
    throw new Error('Tipe power-up tidak valid');
  }
  submitAnswer(sessionId, playerId, choice) {
    const s = this.sessions.get(sessionId); if (!s) throw new Error('Sesi tidak ditemukan');
    if (s.questionState !== 'showing') throw new Error('Soal tidak aktif');
    if (s.isPaused) throw new Error('Kuis sedang dijeda');
    if (Date.now() < s.questionStartAt) throw new Error('Soal belum dimulai');
    if (Date.now() > s.questionEndAt) throw new Error('Waktu habis');
    const p = s.players.get(playerId); if (!p) throw new Error('Pemain tidak ditemukan');
    if (p.isEliminated) throw new Error('Anda sudah tereliminasi');
    if (s.currentAnswers.has(playerId)) throw new Error('Sudah menjawab');
    const correct = Number(choice) === s.currentQ.correctIndex;
    const tu = Date.now() - s.questionStartAt;
    const tl = s.questionEndAt - s.questionStartAt;
    const r = this._score({ correct, timeUsed: tu, timeLimit: tl, streak: p.streak });
    let fp = r.points;
    const isBB = s.bossQuestions.includes(s.currentQuestionIndex);
    if (correct && isBB) fp = fp * 3;
    if (p.activeDouble) fp = fp * 2;
    s.currentAnswers.set(playerId, { playerId, choice, submittedAt: Date.now(), correct, points: fp, newStreak: r.newStreak });
    return { correct, points: fp, newStreak: r.newStreak, totalScore: p.score };
  }
  _score({ correct, timeUsed, timeLimit, streak }) {
    if (!correct) return { points: 0, newStreak: 0 };
    const sb = Math.round(500 * Math.max(0, 1 - timeUsed / timeLimit));
    const stb = Math.min(500, streak * 100);
    return { points: 1000 + sb + stb, newStreak: streak + 1 };
  }
  getPublicState(sessionId) {
    const s = this.sessions.get(sessionId); if (!s) return null;
    const bank = this.banks.get(s.bankId); const q = s.currentQ;
    const isBB = s.bossQuestions.includes(s.currentQuestionIndex);
    const lb = Array.from(s.players.values()).sort((a, b) => b.score - a.score).slice(0, 20).map((p, i) => ({ rank: i + 1, id: p.id, name: p.name, score: p.score, streak: p.streak, group: p.group, isEliminated: p.isEliminated }));
    const ap = Array.from(s.players.values()).map(p => ({ id: p.id, name: p.name, score: p.score, online: p.online, group: p.group, isEliminated: p.isEliminated, isReady: p.isReady }));
    const as = { total: 0, correct: 0, byChoice: [0, 0, 0, 0] };
    if (s.questionState !== 'idle') { for (const a of s.currentAnswers.values()) { as.total++; if (a.correct) as.correct++; if (typeof a.choice === 'number' && a.choice >= 0 && a.choice < 4) as.byChoice[a.choice]++; } }
    const rc = s.questionState === 'revealed' && q ? q.correctIndex : null;
    let gs = {};
    if (s.groupMode) { s.groupNames.slice(0, s.groupCount).forEach(g => gs[g] = 0); for (const p of s.players.values()) { if (p.group && gs[p.group] !== undefined) gs[p.group] += p.score; } }
    return {
      session: { id: s.id, pin: s.pin, hostName: s.hostName, hostAvatar: s.hostAvatar, hostLogo: s.hostLogo, theme: s.theme, status: s.status, questionState: s.questionState, currentQuestionIndex: s.currentQuestionIndex, totalQuestions: bank.questions.length, bankName: bank.name, autoReveal: s.autoReveal, ttsEnabled: s.ttsEnabled, ttsSpeed: s.ttsSpeed, autoPlay: s.autoPlay, isAutoPlaying: s.isAutoPlaying, autoPlayDelaySec: s.autoPlayDelaySec, groupMode: s.groupMode, groupCount: s.groupCount, groupNames: s.groupNames, groupScores: s.groupMode ? gs : null, eliminationMode: s.eliminationMode, tournamentMode: s.tournamentMode, expectedPlayers: s.expectedPlayers, isPaused: s.isPaused, pauseStartAt: s.pauseStartAt, isBossBattle: isBB, hasAiReview: !!s.aiConfig, questionStartAt: s.questionStartAt, questionEndAt: s.questionEndAt, serverNow: Date.now() },
      question: q ? { id: q.id, text: q.text, options: q.options, timeLimitSec: q.timeLimitSec, correctIndex: rc, imageUrl: q.imageUrl } : null,
      leaderboard: lb, allPlayers: ap, answerStats: as, playerCount: s.players.size,
    };
  }
  getPlayerState(sessionId, playerId) {
    const s = this.sessions.get(sessionId); if (!s) return null;
    const p = s.players.get(playerId); if (!p) return null;
    return { player: { id: p.id, name: p.name, score: p.score, streak: p.streak, group: p.group, powerups: p.powerups, activeDouble: p.activeDouble, isEliminated: p.isEliminated, isReady: p.isReady }, myAnswer: s.currentAnswers.get(playerId) || null };
  }
  getPlayerReview(sessionId, playerId) {
    const s = this.sessions.get(sessionId); if (!s) return null;
    const p = s.players.get(playerId); if (!p) return null;
    return { history: p.history || [], aiConfig: s.aiConfig, bankName: this.banks.get(s.bankId)?.name, hostName: s.hostName, hostAvatar: s.hostAvatar };
  }
  getReport(sessionId) {
    const s = this.sessions.get(sessionId); if (!s) return null;
    const bank = this.banks.get(s.bankId);
    const sp = Array.from(s.players.values()).sort((a, b) => b.score - a.score);
    const pwb = sp.map((p, index) => {
      const b = [];
      if (index === 0) b.push({ icon: '🥇', label: 'Juara 1' }); else if (index === 1) b.push({ icon: '🥈', label: 'Juara 2' }); else if (index === 2) b.push({ icon: '🥉', label: 'Juara 3' });
      if (p.totalAnswers > 0 && p.correctCount === p.totalAnswers) b.push({ icon: '🎯', label: 'Sniper (100%)' });
      if (p.maxStreak >= 3) b.push({ icon: '🔥', label: `Streak ${p.maxStreak}x` });
      return { id: p.id, name: p.name, score: p.score, correct: p.correctCount, total: p.totalAnswers, accuracy: p.totalAnswers ? Math.round((p.correctCount / p.totalAnswers) * 100) : 0, group: p.group, badges: b, isEliminated: p.isEliminated };
    });
    let gs = {};
    if (s.groupMode) { s.groupNames.slice(0, s.groupCount).forEach(g => gs[g] = 0); for (const p of sp) { if (p.group && gs[p.group] !== undefined) gs[p.group] += p.score; } }
    const vs = s.questionStats.filter(Boolean);
    const hq = [...vs].sort((a, b) => b.wrong - a.wrong).slice(0, 3).filter(q => q.wrong > 0);
    return { sessionId: s.id, pin: s.pin, hostName: s.hostName, bankName: bank.name, totalQuestions: bank.questions.length, startedAt: s.createdAt, endedAt: s.endedAt, groupMode: s.groupMode, groupScores: s.groupMode ? gs : null, players: pwb, hardestQuestions: hq };
  }
}

if (!globalThis.__STORE__) globalThis.__STORE__ = new Store();
export const store = globalThis.__STORE__;
export default store;
