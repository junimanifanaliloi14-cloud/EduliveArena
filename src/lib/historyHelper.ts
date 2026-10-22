export interface SavedSession {
  id: string;
  pin: string;
  bankName: string;
  hostName: string;
  hostAvatar: string;
  hostLogo: string | null;
  createdAt: number;
  endedAt: number;
  totalQuestions: number;
  playerCount: number;
  topScore: number;
  groupMode: boolean;
  groupScores: any;
  players: any[];
  hardestQuestions: any[];
}

const STORAGE_KEY = 'edulive_session_history';
const MAX_SESSIONS = 50;

export function saveSessionToHistory(report: any, hostAvatar: string, hostLogo: string | null) {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadHistory();
    // Hapus sesi dengan PIN yang sama (overwrite)
    const filtered = existing.filter(s => s.pin !== report.pin);
    
    const newEntry: SavedSession = {
      id: report.sessionId,
      pin: report.pin,
      bankName: report.bankName,
      hostName: report.hostName,
      hostAvatar: hostAvatar || '👩‍🏫',
      hostLogo: hostLogo || null,
      createdAt: report.startedAt,
      endedAt: report.endedAt || Date.now(),
      totalQuestions: report.totalQuestions,
      playerCount: report.players.length,
      topScore: report.players[0]?.score || 0,
      groupMode: report.groupMode || false,
      groupScores: report.groupScores || null,
      players: report.players,
      hardestQuestions: report.hardestQuestions || [],
    };
    
    const updated = [newEntry, ...filtered].slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Gagal menyimpan riwayat sesi:', e);
  }
}

export function loadHistory(): SavedSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedSession[];
  } catch {
    return [];
  }
}

export function deleteHistorySession(pin: string) {
  if (typeof window === 'undefined') return;
  const existing = loadHistory();
  const filtered = existing.filter(s => s.pin !== pin);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearAllHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getHistorySession(pin: string): SavedSession | null {
  const list = loadHistory();
  return list.find(s => s.pin === pin) || null;
}
