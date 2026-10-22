export interface HallOfFameEntry {
  studentName: string;
  totalScore: number;
  totalSessions: number;
  totalCorrect: number;
  totalAnswers: number;
  bestScore: number;
  lastPlayed: number;
  level: number;
  badges: string[];
}

const STORAGE_KEY = 'edulive_hall_of_fame';

export function getLevel(score: number) {
  if (score >= 50000) return { level: 5, label: 'Legenda', icon: '👑', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/40', next: null };
  if (score >= 30000) return { level: 4, label: 'Master', icon: '🏆', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40', next: 50000 };
  if (score >= 15000) return { level: 3, label: 'Ahli', icon: '🎯', color: 'text-cyan-400', bg: 'bg-cyan-500/20 border-cyan-500/40', next: 30000 };
  if (score >= 5000) return { level: 2, label: 'Pelajar', icon: '🎓', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40', next: 15000 };
  return { level: 1, label: 'Pemula', icon: '🥚', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/40', next: 5000 };
}

export function loadHallOfFame(): HallOfFameEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HallOfFameEntry[];
  } catch {
    return [];
  }
}

export function addSessionToHallOfFame(players: any[]): { added: number; updated: number } {
  if (typeof window === 'undefined') return { added: 0, updated: 0 };
  
  const existing = loadHallOfFame();
  const map = new Map<string, HallOfFameEntry>();
  existing.forEach(e => map.set(e.studentName.toLowerCase(), e));

  let added = 0;
  let updated = 0;

  players.forEach(p => {
    if (!p.name || p.name === 'Anonim') return;
    const key = p.name.toLowerCase().trim();
    const current = map.get(key);
    const score = p.score || 0;
    const correct = p.correct || 0;
    const total = p.total || 0;

    if (current) {
      current.totalScore += score;
      current.totalSessions += 1;
      current.totalCorrect += correct;
      current.totalAnswers += total;
      current.bestScore = Math.max(current.bestScore, score);
      current.lastPlayed = Date.now();
      current.level = getLevel(current.totalScore).level;
      updated++;
    } else {
      map.set(key, {
        studentName: p.name.trim(),
        totalScore: score,
        totalSessions: 1,
        totalCorrect: correct,
        totalAnswers: total,
        bestScore: score,
        lastPlayed: Date.now(),
        level: getLevel(score).level,
        badges: []
      });
      added++;
    }
  });

  map.forEach(entry => {
    entry.badges = [];
    if (entry.totalSessions >= 10) entry.badges.push('🎖️ Veteran');
    if (entry.totalSessions >= 25) entry.badges.push('⭐ Setia');
    if (entry.bestScore >= 5000) entry.badges.push('💯 High Scorer');
    if (entry.totalScore >= 50000) entry.badges.push('👑 Legend');
    if (entry.totalCorrect >= 100) entry.badges.push('✅ 100 Benar');
  });

  const updatedList = Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  return { added, updated };
}

export function deleteHallOfFameEntry(studentName: string) {
  const existing = loadHallOfFame();
  const filtered = existing.filter(e => e.studentName.toLowerCase() !== studentName.toLowerCase());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearAllHallOfFame() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getOverallStats() {
  const list = loadHallOfFame();
  const totalStudents = list.length;
  const totalSessions = list.reduce((a, b) => a + b.totalSessions, 0);
  const totalScore = list.reduce((a, b) => a + b.totalScore, 0);
  const avgScore = totalStudents > 0 ? Math.round(totalScore / totalStudents) : 0;
  
  const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  list.forEach(e => { if (levelCounts[e.level as keyof typeof levelCounts] !== undefined) levelCounts[e.level as keyof typeof levelCounts]++; });
  
  return { totalStudents, totalSessions, totalScore, avgScore, levelCounts };
}
