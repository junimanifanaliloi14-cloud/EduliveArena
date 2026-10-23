'use client';
import { forwardRef } from 'react';

const LEVEL_STYLES: Record<number, { bg: string; accent: string; border: string; label: string; icon: string }> = {
  1: { bg: 'from-slate-700 to-slate-900', accent: 'text-slate-300', border: 'border-slate-400/40', label: 'Pemula', icon: '🥚' },
  2: { bg: 'from-emerald-700 to-emerald-950', accent: 'text-emerald-300', border: 'border-emerald-400/40', label: 'Pelajar', icon: '🎓' },
  3: { bg: 'from-cyan-700 to-indigo-950', accent: 'text-cyan-300', border: 'border-cyan-400/40', label: 'Ahli', icon: '🎯' },
  4: { bg: 'from-amber-600 to-orange-950', accent: 'text-amber-300', border: 'border-amber-400/40', label: 'Master', icon: '🏆' },
  5: { bg: 'from-purple-700 to-fuchsia-950', accent: 'text-purple-300', border: 'border-purple-400/40', label: 'Legenda', icon: '👑' },
};

interface ProfileCardProps {
  student: any;
}

export const StudentProfileCard = forwardRef<HTMLDivElement, ProfileCardProps>(({ student }, ref) => {
  if (!student) return null;
  const style = LEVEL_STYLES[student.level] || LEVEL_STYLES[1];

  return (
    <div
      ref={ref}
      style={{ width: '540px', height: '720px' }}
      className={`bg-gradient-to-br ${style.bg} relative overflow-hidden flex flex-col`}
    >
      {/* Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Top Bar: Branding */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-6 pb-4">
        <div className="text-xs font-bold tracking-widest text-white/70 uppercase">EduLive Arena</div>
        <div className="text-xs font-bold tracking-widest text-white/70 uppercase">Student Card</div>
      </div>

      {/* Level Icon Big */}
      <div className="relative z-10 flex flex-col items-center mt-4">
        <div className={`w-32 h-32 rounded-full border-4 ${style.border} bg-black/30 backdrop-blur flex items-center justify-center text-7xl shadow-2xl`}>
          {style.icon}
        </div>
        <div className={`mt-4 px-4 py-1.5 rounded-full ${style.accent} bg-black/40 border ${style.border} font-bold text-sm uppercase tracking-widest`}>
          {style.label}
        </div>
      </div>

      {/* Name */}
      <div className="relative z-10 text-center mt-6 px-6">
        <div className="text-5xl font-black text-white drop-shadow-lg truncate">{student.studentName}</div>
        <div className={`text-sm mt-2 ${style.accent} font-semibold tracking-widest uppercase`}>
          Rank #{student.rank} dari {student.totalStudents} siswa
        </div>
      </div>

      {/* Stats Grid */}
      <div className="relative z-10 grid grid-cols-3 gap-3 px-8 mt-8">
        <div className="bg-black/30 backdrop-blur rounded-xl p-3 border border-white/10 text-center">
          <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Total Skor</div>
          <div className={`text-2xl font-black font-mono ${style.accent}`}>{student.totalScore.toLocaleString('id-ID')}</div>
        </div>
        <div className="bg-black/30 backdrop-blur rounded-xl p-3 border border-white/10 text-center">
          <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Sesi</div>
          <div className="text-2xl font-black font-mono text-white">{student.totalSessions}</div>
        </div>
        <div className="bg-black/30 backdrop-blur rounded-xl p-3 border border-white/10 text-center">
          <div className="text-xs text-white/60 uppercase tracking-wider mb-1">Akurasi</div>
          <div className="text-2xl font-black font-mono text-white">{student.accuracy}%</div>
        </div>
      </div>

      {/* Badges */}
      {student.badges && student.badges.length > 0 && (
        <div className="relative z-10 px-8 mt-6">
          <div className="text-xs text-white/60 uppercase tracking-widest font-bold mb-2 text-center">Pencapaian</div>
          <div className="flex flex-wrap justify-center gap-2">
            {student.badges.slice(0, 6).map((b: string, i: number) => (
              <div key={i} className="bg-black/40 backdrop-blur px-3 py-1.5 rounded-full border border-white/20 text-xs font-semibold text-white whitespace-nowrap">
                {b}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="relative z-10 mt-auto px-8 pb-6 flex items-end justify-between">
        <div>
          <div className="text-xs text-white/50">Best Score</div>
          <div className="text-lg font-black text-white font-mono">{student.bestScore?.toLocaleString('id-ID') || 0}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/50">Level</div>
          <div className={`text-lg font-black ${style.accent}`}>{student.level}/5</div>
        </div>
      </div>
    </div>
  );
});

StudentProfileCard.displayName = 'StudentProfileCard';
