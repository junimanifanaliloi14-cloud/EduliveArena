'use client';
import { forwardRef } from 'react';
import { getOptimizedImageUrl } from '@/lib/imageHelper';

interface CertificateProps {
  playerName: string;
  score: number;
  rank: number;
  totalPlayers: number;
  bankName: string;
  hostName: string;
  hostAvatar: string;
  hostLogo?: string | null;
  date: string;
}

export const Certificate = forwardRef<HTMLDivElement, CertificateProps>((props, ref) => {
  const { playerName, score, rank, totalPlayers, bankName, hostName, hostAvatar, hostLogo, date } = props;

  const getRankTitle = () => {
    if (rank === 1) return 'JUARA 1';
    if (rank === 2) return 'JUARA 2';
    if (rank === 3) return 'JUARA 3';
    return 'PESERTA';
  };

  const getRankColor = () => {
    if (rank === 1) return 'from-amber-400 to-yellow-600 text-amber-900';
    if (rank === 2) return 'from-slate-300 to-slate-500 text-slate-900';
    if (rank === 3) return 'from-orange-400 to-orange-700 text-orange-900';
    return 'from-brand-400 to-brand-600 text-white';
  };

  const optimizedLogo = hostLogo ? getOptimizedImageUrl(hostLogo) : null;

  return (
    <div 
      ref={ref} 
      style={{ width: '800px', height: '560px' }} 
      className="bg-slate-900 relative overflow-hidden flex flex-col items-center justify-center p-8"
    >
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="absolute inset-4 border-4 border-amber-500/50 rounded-2xl pointer-events-none" />
      <div className="absolute inset-6 border border-amber-500/30 rounded-xl pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col items-center text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          {optimizedLogo && <img src={optimizedLogo} alt="Logo" className="h-12 object-contain" crossOrigin="anonymous" />}
          <div className="text-5xl bg-white/10 p-2 rounded-full border-2 border-white/20">{hostAvatar}</div>
        </div>

        <h1 className="text-2xl font-bold text-slate-400 uppercase tracking-[0.3em] mb-2">Sertifikat Penghargaan</h1>
        
        <div className={`px-6 py-1 rounded-full bg-gradient-to-r ${getRankColor()} font-black text-lg tracking-widest uppercase shadow-lg mb-6`}>
          {getRankTitle()}
        </div>

        <p className="text-slate-400 text-sm mb-1">Diberikan kepada:</p>
        <h2 className="text-5xl font-black text-white mb-2 drop-shadow-md">{playerName}</h2>
        
        <p className="text-slate-300 text-sm max-w-md mb-6">
          Atas partisipasi dan pencapaian luar biasa dalam kuis <br/>
          <span className="font-bold text-brand-400 text-lg">"{bankName}"</span>
        </p>

        <div className="flex gap-8 mb-8">
          <div className="text-center">
            <div className="text-3xl font-mono font-black text-amber-400">{score}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Total Skor</div>
          </div>
          <div className="w-px bg-white/20" />
          <div className="text-center">
            <div className="text-3xl font-mono font-black text-white">#{rank}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Peringkat dari {totalPlayers}</div>
          </div>
        </div>

        <div className="w-full flex justify-between items-end mt-auto px-12">
          <div className="text-left">
            <div className="text-sm text-slate-400 mb-1">Tanggal:</div>
            <div className="font-semibold text-white">{date}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400 mb-1">Guru Pengampu:</div>
            <div className="font-semibold text-white text-lg">{hostName}</div>
            <div className="w-32 h-px bg-white/30 mt-2 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
});

Certificate.displayName = 'Certificate';
