'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [pin, setPin] = useState('');
  const router = useRouter();
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center space-y-6 animate-slide-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          MVP v0.1 - Live Quiz Engine
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          <span className="text-brand-500">EduLive</span> Arena
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
          Belajar sambil live, menang sambil belajar. Guru mengajar interaktif lewat live streaming, murid jawab lewat chat & web.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="card animate-slide-up">
          <div className="text-4xl">Guru</div>
          <h2 className="mt-3 text-xl font-semibold">Masuk sebagai Guru</h2>
          <p className="mt-1 text-slate-400 text-sm">Buat sesi kuis, kontrol soal, lihat leaderboard live.</p>
          <Link href="/host" className="btn-primary mt-5 w-full">Buka Dashboard Guru</Link>
        </div>

        <div className="card animate-slide-up">
          <div className="text-4xl">Murid</div>
          <h2 className="mt-3 text-xl font-semibold">Gabung sebagai Murid</h2>
          <p className="mt-1 text-slate-400 text-sm">Masukkan PIN dari gurumu untuk mulai menjawab.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (pin.trim()) router.push('/play/' + pin.trim()); }} className="mt-4 flex gap-2">
            <input
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="PIN 6 digit"
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:border-brand-500 text-center text-lg tracking-[0.4em] font-mono"
              maxLength={6}
            />
            <button className="btn-primary">Gabung</button>
          </form>
        </div>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-3 text-sm">
        {[
          { t: 'Zero friction', d: 'Murid tidak perlu install - cukup buka link / scan QR.' },
          { t: 'Real-time', d: 'Leaderboard & statistik jawaban update instan via WebSocket.' },
          { t: 'Overlay OBS', d: 'Tampilkan soal + skor di TikTok/YouTube Live tanpa ribet.' },
        ].map(x => (
          <div key={x.t} className="card">
            <div className="font-semibold text-brand-500">{x.t}</div>
            <div className="text-slate-400 mt-1">{x.d}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
