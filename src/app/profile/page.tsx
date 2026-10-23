'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfileSearchPage() {
  const [name, setName] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) { setError('Masukkan nama Anda.'); return; }
    setSearching(true);
    setError('');
    try {
      const res = await fetch('/api/hall-of-fame/' + encodeURIComponent(cleanName), { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.student) {
        throw new Error(data.error || 'Nama tidak ditemukan. Pastikan Anda sudah pernah ikut kuis.');
      }
      router.push('/profile/' + encodeURIComponent(cleanName));
    } catch (e: any) {
      setError(e.message);
      setSearching(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition">← Beranda</Link>
      </div>

      <div className="text-center mb-8">
        <div className="inline-block text-6xl mb-4">🎴</div>
        <h1 className="text-3xl md:text-4xl font-black">
          Kartu <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Profil Siswa</span>
        </h1>
        <p className="text-slate-400 mt-2 text-sm max-w-md mx-auto">
          Lihat pencapaian, level, dan badge Anda. Download kartu profil Anda dan tunjukkan ke teman-teman!
        </p>
      </div>

      <form onSubmit={handleSearch} className="card border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
        <label className="block text-sm text-slate-300 mb-2 font-semibold">Masukkan Nama Anda</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Contoh: Budi Santoso"
          maxLength={24}
          className="w-full text-center text-2xl font-semibold rounded-xl bg-black/30 border-2 border-amber-500/30 px-4 py-4 outline-none focus:border-amber-500"
        />
        {error && <div className="text-rose-400 text-sm mt-2 text-center">{error}</div>}
        <button type="submit" disabled={searching} className="btn-primary w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-lg py-3">
          {searching ? 'Mencari...' : '🔍 Lihat Profil Saya'}
        </button>
        <p className="text-xs text-slate-500 mt-3 text-center">
          Gunakan nama yang sama seperti saat Anda mengikuti kuis.
        </p>
      </form>

      <div className="mt-8 card bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-white/10">
        <h2 className="font-bold text-sm text-slate-300 mb-3">💡 Tentang Kartu Profil</h2>
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex gap-2"><span>🎯</span><span><b className="text-slate-300">Level</b> naik sesuai total skor dari semua kuis yang pernah Anda ikuti.</span></div>
          <div className="flex gap-2"><span>🏅</span><span><b className="text-slate-300">Badge</b> diberikan otomatis saat Anda mencapai milestone tertentu.</span></div>
          <div className="flex gap-2"><span>📤</span><span><b className="text-slate-300">Share</b> kartu profil Anda ke WhatsApp untuk tunjukkan ke teman atau orang tua.</span></div>
        </div>
      </div>
    </main>
  );
}
