import fs from 'fs';
import path from 'path';
import { supabase } from './supabaseClient.mjs';

function nid(len = 8) {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let o = '';
  for (let i = 0; i < len; i++) o += c[Math.floor(Math.random() * c.length)];
  return o;
}

// ... (Fungsi getLevel dan SEED_BANK tetap sama)
function getLevel(score) {
  if (score >= 50000) return { level: 5, label: 'Legenda', icon: '👑' };
  if (score >= 30000) return { level: 4, label: 'Master', icon: '🏆' };
  if (score >= 15000) return { level: 3, label: 'Ahli', icon: '🎯' };
  if (score >= 5000) return { level: 2, label: 'Pelajar', icon: '🎓' };
  return { level: 1, label: 'Pemula', icon: '🥚' };
}

const SEED_BANK = { /* ... isi SEED_BANK tetap sama ... */ };

const DATA_DIR = path.join(process.cwd(), 'data');
const BANKS_FILE = path.join(DATA_DIR, 'banks.json');
const PRACTICE_FILE = path.join(DATA_DIR, 'practice.json');
const HOF_FILE = path.join(DATA_DIR, 'hall-of-fame.json');

function ensureDataDir() { try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {} }
function loadJSON(file, fallback) { try { ensureDataDir(); if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch (e) {} return fallback; }
function saveJSON(file, data) { try { ensureDataDir(); const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(data, null, 2)); fs.renameSync(tmp, file); } catch (e) {} }

class Store {
  constructor() {
    this.banks = new Map();
    this.sessions = new Map();
    this.sessionsByPin = new Map();
    this.timers = new Map();
    this.practiceCodes = new Map();
    this.hallOfFame = new Map();

    const savedBanks = loadJSON(BANKS_FILE, null);
    if (savedBanks && savedBanks.length > 0) { for (const b of savedBanks) this.banks.set(b.id, b); }
    else { this.banks.set('bank_demo_1', SEED_BANK); this._saveBanks(); }

    const savedPractice = loadJSON(PRACTICE_FILE, null);
    if (savedPractice && Array.isArray(savedPractice.codes)) { for (const c of savedPractice.codes) this.practiceCodes.set(c.code, c); }

    const savedHof = loadJSON(HOF_FILE, null);
    if (savedHof && Array.isArray(savedHof.entries)) { for (const e of savedHof.entries) this.hallOfFame.set(e.studentName.toLowerCase(), e); }
  }

  _saveBanks() { saveJSON(BANKS_FILE, Array.from(this.banks.values())); }
  _savePractice() { saveJSON(PRACTICE_FILE, { codes: Array.from(this.practiceCodes.values()) }); }
  _saveHof() { saveJSON(HOF_FILE, { entries: Array.from(this.hallOfFame.values()) }); }

  // ===== HYBRID READ: Ambil dari Supabase dulu, jika gagal baru dari lokal =====
  async listBanks() {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('question_banks').select('*, questions(*)');
        if (!error && data && data.length > 0) {
          return data.map(b => ({
            id: b.id, name: b.name, subject: b.subject, createdAt: new Date(b.created_at).getTime(),
            questionCount: b.questions.length,
            questions: b.questions.map(q => ({
              id: q.id, text: q.text, options: q.options, correctIndex: q.correct_index, timeLimitSec: q.time_limit_sec, imageUrl: q.image_url
            }))
          }));
        }
      } catch (e) {
        console.warn('[Supabase] Gagal ambil data, menggunakan fallback lokal:', e.message);
      }
    }
    // Fallback ke lokal
    return Array.from(this.banks.values()).map(b => ({
      id: b.id, name: b.name, subject: b.subject, questionCount: b.questions.length, createdAt: b.createdAt, questions: b.questions
    }));
  }

  async getBank(id) {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('question_banks').select('*, questions(*)').eq('id', id).single();
        if (!error && data) {
          return {
            id: data.id, name: data.name, subject: data.subject, createdAt: new Date(data.created_at).getTime(),
            questions: data.questions.map(q => ({ id: q.id, text: q.text, options: q.options, correctIndex: q.correct_index, timeLimitSec: q.time_limit_sec, imageUrl: q.image_url }))
          };
        }
      } catch (e) {}
    }
    return this.banks.get(id);
  }

  // ===== WRITE: Tetap simpan ke lokal (nanti disinkron via GitHub Actions) =====
  createBank({ name, subject, questions = [] }) {
    const bank = { id: 'bank_' + nid(), name: name || 'Bank Baru', subject: subject || 'Umum', questions, createdAt: Date.now() };
    this.banks.set(bank.id, bank); this._saveBanks(); return bank;
  }
  updateBank(id, { name, subject, questions }) {
    const bank = this.banks.get(id); if (!bank) throw new Error('Bank tidak ditemukan');
    if (name !== undefined) bank.name = name;
    if (subject !== undefined) bank.subject = subject;
    if (questions !== undefined) bank.questions = questions;
    this._saveBanks(); return bank;
  }
  deleteBank(id) {
    this.banks.delete(id);
    for (const [code, entry] of this.practiceCodes.entries()) { if (entry.bankId === id) this.practiceCodes.delete(code); }
    this._saveBanks(); this._savePractice();
  }
  
  // ... (Sisa fungsi lainnya seperti exportAllBanks, importAllBanks, sessions, practice, hallOfFame tetap sama seperti versi sebelumnya) ...
  // CATATAN: Untuk menghemat tempat, saya tidak menulis ulang semua fungsi session/practice/hof di sini. 
  // Anda cukup MENYALIN isi file store.mjs Anda sebelumnya, lalu menimpa bagian listBanks, getBank, createBank, updateBank, deleteBank di atas.
}
