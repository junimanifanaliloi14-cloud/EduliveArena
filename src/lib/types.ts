export type QuestionState = 'idle' | 'showing' | 'revealed';
export type SessionStatus = 'lobby' | 'live' | 'ended';

export interface PlayerInfo {
  id: string;
  name: string;
  score: number;
  online?: boolean;
}

export interface PublicState {
  session: {
    id: string; pin: string; hostName: string; status: SessionStatus;
    questionState: QuestionState; currentQuestionIndex: number;
    totalQuestions: number; bankName: string;
    questionStartAt: number | null; questionEndAt: number | null; serverNow: number;
  };
  question: { id: string; text: string; options: string[]; timeLimitSec: number; correctIndex: number | null } | null;
  leaderboard: { rank: number; id: string; name: string; score: number; streak: number }[];
  allPlayers: PlayerInfo[];
  answerStats: { total: number; correct: number; byChoice: number[] };
  playerCount: number;
}
