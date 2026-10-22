'use client';
import { forwardRef } from 'react';
import { getOptimizedImageUrl } from '@/lib/imageHelper';

interface ParentReportProps {
  studentName: string;
  score: number;
  rank: number;
  totalPlayers: number;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  badges: { icon: string; label: string }[];
  bankName: string;
  hostName: string;
  hostAvatar: string;
  hostLogo?: string | null;
  groupMode?: boolean;
  groupName?: string;
  date: string;
  // Hardest questions to show as "Area for improvement"
  hardestQuestions?: { text: string; wrong: number; total: number }[];
}

export const ParentReport = forwardRef<HTMLDivElement, ParentReportProps>((props, ref) => {
  const { studentName, score, rank, totalPlayers, accuracy, correctCount, totalQuestions, badges, bankName, hostName, hostAvatar, hostLogo, groupMode, groupName, date, hardestQuestions } = props;
  
  const optimizedLogo = hostLogo ? getOptimizedImageUrl(hostLogo) : null;
  
  const getGrade = () => {
    if (accuracy >= 90) return { grade: 'A', label: 'Sangat Baik', color: 'text-emerald-400' };
    if (accuracy >= 75) return { grade: 'B', label: 'Baik', color: 'text-blue-400' };
    if (accuracy >= 60) return { grade: 'C', label: 'Cukup', color: 'text-amber-400' };
    return { grade: 'D', label: 'Perlu Latihan', color: 'text-rose-400' };
  };
  
  const gradeInfo = getGrade();

  return (
    <div 
      ref={ref} 
      style={{ width: '800px', minHeight: '700px' }} 
      className="bg-white relative overflow-hidden flex flex-col"
    >
      {/* Header Biru */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            {optimizedLogo ? (
              <div className="bg-white p-2 rounded-xl shadow-lg">
                <img src={optimizedLogo} alt="Logo" className="h-12 w-12 object-contain" crossOrigin="anonymous" />
              </div>
            ) : (
              <div className="bg-white/20 p-3 rounded-xl text-3xl">{hostAvatar}</div>
            )}
            <div>
              <div className="text-xs uppercase tracking-widest text-indigo-200 font-semibold">Laporan Hasil Belajar</div>
              <div className="text-2xl font-black">Kuis Edukatif Digital</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-indigo-200">Tanggal</div>
            <div className="font-semibold">{date}</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-8 bg-gradient-to-b from-slate-50 to-white">
        
        {/* Student Identity */}
        <div className="bg-white rounded-2xl p-6 border-2 border-indigo-100 shadow-sm mb-6">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Nama Siswa</div>
          <div className="text-3xl font-black text-slate-800">{studentName}</div>
          {groupMode && groupName && (
            <div className="inline-block mt-2 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
              Kelompok: {groupName}
            </div>
          )}
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border-2 border-slate-100 shadow-sm text-center">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Total Skor</div>
            <div className="text-4xl font-black text-indigo-600">{score}</div>
            <div className="text-xs text-slate-400 mt-1">Poin</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border-2 border-slate-100 shadow-sm text-center">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Peringkat</div>
            <div className="text-4xl font-black text-amber-500">#{rank}</div>
            <div className="text-xs text-slate-400 mt-1">dari {totalPlayers} siswa</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border-2 border-slate-100 shadow-sm text-center">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Predikat</div>
            <div className={`text-4xl font-black ${gradeInfo.color}`}>{gradeInfo.grade}</div>
            <div className="text-xs text-slate-400 mt-1">{gradeInfo.label}</div>
          </div>
        </div>

        {/* Accuracy Bar */}
        <div className="bg-white rounded-2xl p-5 border-2 border-slate-100 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-bold text-slate-700">Akurasi Jawaban</div>
            <div className="text-sm font-bold text-indigo-600">{accuracy}%</div>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${accuracy >= 75 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : accuracy >= 60 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`} 
              style={{ width: `${accuracy}%` }} 
            />
          </div>
          <div className="text-xs text-slate-500 mt-2">{correctCount} jawaban benar dari {totalQuestions} soal</div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border-2 border-amber-100 shadow-sm mb-6">
            <div className="text-sm font-bold text-slate-700 mb-3">🏆 Pencapaian Siswa</div>
            <div className="flex flex-wrap gap-2">
              {badges.map((b, i) => (
                <div key={i} className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 px-3 py-1.5 rounded-full">
                  <span className="text-lg">{b.icon}</span>
                  <span className="text-xs font-bold text-amber-700">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Areas for improvement */}
        {hardestQuestions && hardestQuestions.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border-2 border-rose-100 shadow-sm mb-6">
            <div className="text-sm font-bold text-slate-700 mb-2">📌 Materi yang Perlu Diperkuat</div>
            <div className="space-y-2">
              {hardestQuestions.slice(0, 2).map((q, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <span className="text-rose-500 font-bold">•</span>
                  <span className="line-clamp-2">{q.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teacher Note */}
        <div className="bg-indigo-50 rounded-2xl p-5 border-2 border-indigo-100 mb-6">
          <div className="text-sm font-bold text-indigo-900 mb-2">💬 Catatan Guru:</div>
          <div className="text-sm text-indigo-800 italic">
            "{accuracy >= 75 
              ? `${studentName} menunjukkan pemahaman yang sangat baik. Terus pertahankan semangat belajarnya!` 
              : accuracy >= 60 
              ? `${studentName} sudah berusaha dengan baik. Mari kita latih kembali materi yang masih sulit bersama-sama.` 
              : `${studentName} masih perlu banyak berlatih. Jangan menyerah, setiap usaha pasti membuahkan hasil!`}"
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="bg-slate-100 px-8 py-4 border-t border-slate-200 flex justify-between items-center">
        <div className="text-xs text-slate-500">
          Laporan ini dibuat secara otomatis oleh <span className="font-bold text-indigo-600">EduLive Arena</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Guru Pengampu:</div>
          <div className="font-bold text-slate-800">{hostName}</div>
        </div>
      </div>
    </div>
  );
});

ParentReport.displayName = 'ParentReport';
