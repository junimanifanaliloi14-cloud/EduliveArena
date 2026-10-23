export type ThemeId = 'classic' | 'cyberpunk' | 'chalkboard' | 'party' | 'tournament' | 'zen';

export const THEMES: Record<ThemeId, {
  name: string;
  icon: string;
  preview: string;
  cardBg: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  timerBg: string;
  bgOverlay: string;
  glow: string;
  avatarGlow: string;
}> = {
  classic: {
    name: 'Classic', icon: '🎓',
    preview: 'bg-gradient-to-br from-slate-800 to-slate-900 border-orange-500',
    cardBg: 'bg-slate-800/80 border border-white/10',
    accentText: 'text-brand-500',
    accentBg: 'bg-brand-500/20',
    accentBorder: 'border-brand-500/40',
    timerBg: 'bg-brand-500',
    bgOverlay: 'bg-transparent',
    glow: 'shadow-2xl',
    avatarGlow: 'from-brand-500 to-amber-500',
  },
  cyberpunk: {
    name: 'Cyberpunk Neon', icon: '🌌',
    preview: 'bg-gradient-to-br from-purple-900 to-indigo-950 border-pink-400',
    cardBg: 'bg-indigo-950/85 border border-pink-500/30 backdrop-blur',
    accentText: 'text-pink-400',
    accentBg: 'bg-pink-500/20',
    accentBorder: 'border-pink-500/50',
    timerBg: 'bg-pink-500',
    bgOverlay: 'bg-gradient-to-br from-purple-950/40 via-slate-950/30 to-indigo-950/40',
    glow: 'shadow-[0_0_40px_rgba(236,72,153,0.25)]',
    avatarGlow: 'from-pink-500 to-cyan-400',
  },
  chalkboard: {
    name: 'Papan Tulis', icon: '📚',
    preview: 'bg-gradient-to-br from-emerald-900 to-slate-900 border-yellow-500',
    cardBg: 'bg-emerald-950/85 border border-yellow-500/20',
    accentText: 'text-yellow-300',
    accentBg: 'bg-yellow-500/20',
    accentBorder: 'border-yellow-400/50',
    timerBg: 'bg-yellow-400',
    bgOverlay: 'bg-gradient-to-br from-emerald-950/40 via-transparent to-slate-950/40',
    glow: 'shadow-[0_0_30px_rgba(250,204,21,0.15)]',
    avatarGlow: 'from-yellow-400 to-emerald-500',
  },
  party: {
    name: 'Pesta Konfeti', icon: '🎉',
    preview: 'bg-gradient-to-br from-fuchsia-800 to-purple-900 border-yellow-400',
    cardBg: 'bg-fuchsia-950/85 border border-fuchsia-500/30',
    accentText: 'text-fuchsia-400',
    accentBg: 'bg-fuchsia-500/20',
    accentBorder: 'border-fuchsia-500/50',
    timerBg: 'bg-fuchsia-500',
    bgOverlay: 'bg-gradient-to-br from-fuchsia-950/40 via-purple-950/30 to-indigo-950/40',
    glow: 'shadow-[0_0_40px_rgba(232,121,249,0.25)]',
    avatarGlow: 'from-fuchsia-500 to-yellow-400',
  },
  tournament: {
    name: 'Turnamen Emas', icon: '🏆',
    preview: 'bg-gradient-to-br from-red-900 to-amber-900 border-amber-300',
    cardBg: 'bg-red-950/85 border border-amber-500/30',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500/20',
    accentBorder: 'border-amber-500/50',
    timerBg: 'bg-amber-400',
    bgOverlay: 'bg-gradient-to-br from-red-950/50 via-transparent to-amber-950/40',
    glow: 'shadow-[0_0_40px_rgba(245,158,11,0.3)]',
    avatarGlow: 'from-amber-400 to-red-500',
  },
  zen: {
    name: 'Zen Minimalis', icon: '🌿',
    preview: 'bg-gradient-to-br from-teal-900 to-slate-900 border-teal-400',
    cardBg: 'bg-teal-950/85 border border-teal-500/20',
    accentText: 'text-teal-300',
    accentBg: 'bg-teal-500/20',
    accentBorder: 'border-teal-500/40',
    timerBg: 'bg-teal-400',
    bgOverlay: 'bg-gradient-to-br from-teal-950/40 via-transparent to-slate-950/40',
    glow: 'shadow-[0_0_30px_rgba(45,212,191,0.2)]',
    avatarGlow: 'from-teal-400 to-cyan-500',
  },
};
