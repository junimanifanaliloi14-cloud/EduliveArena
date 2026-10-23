export interface PracticeAttempt {
  id: string;
  code: string;
  bankName: string;
  score: number;
  correct: number;
  total: number;
  accuracy: number;
  durationSec: number;
  timestamp: number;
}

const KEY = 'edulive_practice_history';

export function savePracticeAttempt(attempt: Omit<PracticeAttempt, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return null;
  const history = loadPracticeHistory();
  const newAttempt: PracticeAttempt = {
    ...attempt,
    id: 'pa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
  };
  const updated = [newAttempt, ...history].slice(0, 100);
  try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
  return newAttempt;
}

export function loadPracticeHistory(): PracticeAttempt[] {
  if (typeof window === 'undefined') return [];
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

export function getPracticeStats() {
  const history = loadPracticeHistory();
  const totalSessions = history.length;
  const totalQuestions = history.reduce((a, b) => a + b.total, 0);
  const totalCorrect = history.reduce((a, b) => a + b.correct, 0);
  const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const days = new Set(history.map(h => new Date(h.timestamp).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  const bestScore = history.length > 0 ? Math.max(...history.map(h => h.score)) : 0;
  return { totalSessions, totalQuestions, totalCorrect, avgAccuracy, streak, bestScore };
}

export function clearPracticeHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
