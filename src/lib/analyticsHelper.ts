import { loadHistory } from './historyHelper';
import { loadHallOfFame, getLevel } from './hallOfFame';
import { loadPracticeHistory } from './practiceHistory';

export interface DailyStat {
  date: string;
  label: string;
  sessions: number;
  avgScore: number;
  totalAnswers: number;
}

export interface AnalyticsData {
  totalSessions: number;
  totalStudents: number;
  totalAnswers: number;
  avgAccuracy: number;
  totalPracticeSessions: number;
  dailyStats: DailyStat[];
  topBanks: { name: string; count: number; avgScore: number }[];
  topStudents: { name: string; totalScore: number; sessions: number; level: number; levelLabel: string; levelIcon: string }[];
  levelDistribution: { level: number; label: string; icon: string; count: number; color: string }[];
  heatmap: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[];
}

const LEVEL_CONFIG = [
  { level: 1, label: 'Pemula', icon: '🥚', color: '#94a3b8' },
  { level: 2, label: 'Pelajar', icon: '🎓', color: '#10b981' },
  { level: 3, label: 'Ahli', icon: '🎯', color: '#06b6d4' },
  { level: 4, label: 'Master', icon: '🏆', color: '#f59e0b' },
  { level: 5, label: 'Legenda', icon: '👑', color: '#a855f7' },
];

function dateToISO(d: Date) {
  return d.toISOString().split('T')[0];
}

export function getAnalyticsData(rangeDays: number = 30): AnalyticsData {
  const history = loadHistory();
  const hallOfFame = loadHallOfFame();
  const practiceHistory = loadPracticeHistory();

  const cutoff = rangeDays > 0 ? Date.now() - rangeDays * 24 * 60 * 60 * 1000 : 0;
  const filteredHistory = rangeDays > 0 ? history.filter(h => h.endedAt >= cutoff) : history;
  const filteredPractice = rangeDays > 0 ? practiceHistory.filter(p => p.timestamp >= cutoff) : practiceHistory;

  const totalSessions = filteredHistory.length;
  const totalPracticeSessions = filteredPractice.length;

  // Unique students
  const studentSet = new Set<string>();
  filteredHistory.forEach(s => s.players?.forEach((p: any) => {
    if (p.name) studentSet.add(p.name.toLowerCase().trim());
  }));
  const totalStudents = studentSet.size;

  // Total answers & accuracy
  let totalAnswers = 0;
  let totalCorrect = 0;
  filteredHistory.forEach(s => {
    s.players?.forEach((p: any) => {
      totalAnswers += p.total || 0;
      totalCorrect += p.correct || 0;
    });
  });
  const avgAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  // Daily stats
  const dailyMap = new Map<string, { sessions: number; scores: number[]; answers: number }>();
  filteredHistory.forEach(s => {
    const date = dateToISO(new Date(s.endedAt));
    if (!dailyMap.has(date)) dailyMap.set(date, { sessions: 0, scores: [], answers: 0 });
    const day = dailyMap.get(date)!;
    day.sessions++;
    const topScore = s.players?.[0]?.score || 0;
    if (topScore > 0) day.scores.push(topScore);
    s.players?.forEach((p: any) => { day.answers += p.total || 0; });
  });

  const dailyStats: DailyStat[] = [];
  const chartDays = rangeDays > 0 ? Math.min(rangeDays, 60) : 60;
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = dateToISO(d);
    const day = dailyMap.get(date);
    dailyStats.push({
      date,
      label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      sessions: day?.sessions || 0,
      avgScore: day && day.scores.length > 0 ? Math.round(day.scores.reduce((a, b) => a + b, 0) / day.scores.length) : 0,
      totalAnswers: day?.answers || 0,
    });
  }

  // Top banks
  const bankMap = new Map<string, { count: number; scores: number[] }>();
  filteredHistory.forEach(s => {
    if (!s.bankName) return;
    if (!bankMap.has(s.bankName)) bankMap.set(s.bankName, { count: 0, scores: [] });
    const bank = bankMap.get(s.bankName)!;
    bank.count++;
    const topScore = s.players?.[0]?.score || 0;
    if (topScore > 0) bank.scores.push(topScore);
  });
  const topBanks = Array.from(bankMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top students
  const topStudents = [...hallOfFame]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 10)
    .map(e => {
      const lvl = getLevel(e.totalScore);
      return {
        name: e.studentName,
        totalScore: e.totalScore,
        sessions: e.totalSessions,
        level: e.level,
        levelLabel: lvl.label,
        levelIcon: lvl.icon,
      };
    });

  // Level distribution
  const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  hallOfFame.forEach(e => {
    if (levelCounts[e.level] !== undefined) levelCounts[e.level]++;
  });
  const levelDistribution = LEVEL_CONFIG.map(l => ({
    ...l,
    count: levelCounts[l.level] || 0,
  }));

  // Heatmap (90 days)
  const heatmapMap = new Map<string, number>();
  history.forEach(s => {
    const date = dateToISO(new Date(s.endedAt));
    heatmapMap.set(date, (heatmapMap.get(date) || 0) + 1);
  });
  const heatmap: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = dateToISO(d);
    const count = heatmapMap.get(date) || 0;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count >= 5) level = 4;
    else if (count >= 3) level = 3;
    else if (count >= 2) level = 2;
    else if (count >= 1) level = 1;
    heatmap.push({ date, count, level });
  }

  return {
    totalSessions,
    totalStudents,
    totalAnswers,
    avgAccuracy,
    totalPracticeSessions,
    dailyStats,
    topBanks,
    topStudents,
    levelDistribution,
    heatmap,
  };
}
