'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function BackupPage() {
  const [stats, setStats] = useState({ banks: 0, history: 0, hallOfFame: 0, settings: false });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadStats(); }, []);

  function loadStats() {
    const history = localStorage.getItem('edulive_session_history');
    const hof = localStorage.getItem('edulive_hall_of_fame');
    const settings = localStorage.getItem('edulive_teacher_settings');
    const historyCount = history ? JSON.parse(history).length : 0;
    const hofCount = hof ? JSON.parse(hof).length : 0;
    fetch('/api/banks').then(r => r.json()).then(d => {
      setStats({ banks: d.banks?.length || 0, history: historyCount, hallOfFame: hofCount, settings: !!settings });
    });
  }

  async function exportAll() {
    setIsExporting(true);
    try {
      const res = await fetch('/api/backup');
      const serverData = await res.json();
      const history = localStorage.getItem('edulive_session_history');
      const hof = localStorage.getItem('edulive_hall_of_fame');
      const settings = localStorage.getItem('edulive_teacher_settings');
      
      const backup = {
        version: '1.0',
        type: 'edulive-backup',
        exportedAt: Date.now(),
        banks: serverData.banks || [],
        history: history ? JSON.parse(history) : [],
        hallOfFame: hof ? JSON.parse(hof) : [],
        settings: settings ? JSON.parse(settings) : null,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `edulive-backup-${date}.edulive`;
      link.click();
      URL.revokeObjectURL(url);
      setImportStatus({ type: 'success', message: `✅ Backup berhasil diunduh (${backup.banks.length} bank, ${backup.history.length} riwayat, ${backup.hallOfFame.length} siswa)` });
    } catch (e: any) {
      setImportStatus({ type: 'error', message: '❌ Gagal export: ' + e.message });
    }
    setIsExporting(false);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('⚠️ IMPORT akan MENGGANTI semua data yang ada sekarang.\n\nSemua bank soal, riwayat, dan Hall of Fame Anda akan ditimpa dengan data dari file backup.\n\nLanjutkan?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setIsImporting(true);
    setImportStatus(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup || backup.type !== 'edulive-backup' || !Array.isArray(backup.banks)) {
        throw new Error('File bukan format backup EduLive yang valid.');
      }

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banks: backup.banks }),
      });
      if (!res.ok) throw new Error('Server gagal memproses import.');
      const data = await res.json();

      if (backup.history) localStorage.setItem('edulive_session_history', JSON.stringify(backup.history));
      if (backup.hallOfFame) localStorage.setItem('edulive_hall_of_fame', JSON.stringify(backup.hallOfFame));
      if (backup.settings) localStorage.setItem('edulive_teacher_settings', JSON.stringify(backup.settings));

      setImportStatus({ type: 'success', message: `✅ Berhasil restore: ${data.count} bank soal, ${backup.history?.length || 0} riwayat, ${backup.hallOfFame?.length || 0} siswa. Refresh halaman dashboard untuk melihat.` });
      loadStats();
    } catch (err: any) {
      setImportStatus({ type: 'error', message: '❌ Gagal import: ' + err.message });
    }
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function clearAllData() {
    if (!confirm('🚨 HAPUS SEMUA DATA?\n\nIni akan menghapus:\n- Semua bank soal di server\n- Semua riwayat sesi\n- Hall of Fame\n- Pengaturan guru\n\nTindakan ini TIDAK BISA DIBATALKAN. Yakin?')) return;
    if (!confirm('Konfirmasi terakhir: Semua data akan dihapus permanen. Lanjutkan?')) return;
    
    localStorage.removeItem('edulive_session_history');
    localStorage.removeItem('edulive_hall_of_fame');
    localStorage.removeItem('edulive_teacher_settings');
    fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ banks: [] }) })
      .then(() => { setImportStatus({ type: 'success', message: '✅ Semua data berhasil dihapus.' }); loadStats(); });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6"><Link href="/host" className="text-sm text-slate-400 hover:text-white transition">← Kembali ke Dashboard</Link></div>

      <h1 className="text-3xl font-bold flex items-center gap-3"><span className="text-4xl">🛡️</span> Data Safety Suite</h1>
      <p className="text-slate-400 mt-1">Lindungi data Anda. Backup dan restore semua bank soal, riwayat, dan Hall of Fame.</p>

      {/* Status Data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
        <div className="card bg-gradient-to-br from-brand-500/10 to-brand-500/5 border-brand-500/20 text-center py-4">
          <div className="text-3xl mb-1">📚</div><div className="text-2xl font-black text-brand-400">{stats.banks}</div><div className="text-xs text-slate-400 uppercase mt-1">Bank Soal</div>
        </div>
        <div className="card bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-center py-4">
          <div className="text-3xl mb-1">📊</div><div className="text-2xl font-black text-indigo-400">{stats.history}</div><div className="text-xs text-slate-400 uppercase mt-1">Riwayat Sesi</div>
        </div>
        <div className="card bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 text-center py-4">
          <div className="text-3xl mb-1">🏆</div><div className="text-2xl font-black text-amber-400">{stats.hallOfFame}</div><div className="text-xs text-slate-400 uppercase mt-1">Siswa (HoF)</div>
        </div>
        <div className="card bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-center py-4">
          <div className="text-3xl mb-1">{stats.settings ? '✅' : '⚪'}</div><div className="text-2xl font-black text-emerald-400">{stats.settings ? 'Ada' : '—'}</div><div className="text-xs text-slate-400 uppercase mt-1">Pengaturan</div>
        </div>
      </div>

      {/* Info Auto-Save */}
      <div className="card mt-6 bg-emerald-500/5 border-emerald-500/30">
        <div className="flex items-start gap-3">
          <div className="text-3xl">💾</div>
          <div>
            <h3 className="font-bold text-emerald-400">Auto-Save Aktif</h3>
            <p className="text-sm text-slate-300 mt-1">
              Semua bank soal otomatis tersimpan ke disk server setiap kali Anda membuat/edit/hapus. Bahkan jika server restart atau mati, data Anda aman.
            </p>
          </div>
        </div>
      </div>

      {/* Tombol Export */}
      <div className="card mt-6">
        <h2 className="font-semibold text-lg mb-2">📤 Export Backup</h2>
        <p className="text-sm text-slate-400 mb-4">Unduh file <code className="bg-white/10 px-1.5 py-0.5 rounded">.edulive</code> berisi semua data. Simpan file ini di Google Drive atau tempat aman sebagai cadangan.</p>
        <button onClick={exportAll} disabled={isExporting} className="btn-primary w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50">
          {isExporting ? '📦 Membuat Backup...' : '📥 Download Backup (.edulive)'}
        </button>
      </div>

      {/* Tombol Import */}
      <div className="card mt-4">
        <h2 className="font-semibold text-lg mb-2">📥 Restore dari Backup</h2>
        <p className="text-sm text-slate-400 mb-4">Upload file <code className="bg-white/10 px-1.5 py-0.5 rounded">.edulive</code> untuk mengembalikan semua data. <span className="text-rose-300 font-semibold">⚠️ Ini akan menimpa data saat ini.</span></p>
        <input type="file" accept=".edulive,application/json" ref={fileInputRef} onChange={handleImport} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="btn-ghost w-full bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50">
          {isImporting ? '📦 Memproses Import...' : '📤 Pilih File Backup (.edulive)'}
        </button>
      </div>

      {/* Status Message */}
      {importStatus && (
        <div className={`card mt-4 ${importStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
          <div className={`text-sm font-medium ${importStatus.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>{importStatus.message}</div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="card mt-8 border-rose-500/30 bg-rose-500/5">
        <h2 className="font-semibold text-lg mb-2 text-rose-400">🚨 Danger Zone</h2>
        <p className="text-sm text-slate-400 mb-4">Hapus SEMUA data secara permanen. Gunakan hanya jika ingin memulai dari nol.</p>
        <button onClick={clearAllData} className="btn-danger w-full">Hapus Semua Data</button>
      </div>

      <div className="mt-8 text-center text-xs text-slate-500">
        💡 Tip: Backup secara rutin (misal setiap minggu) dan simpan di Google Drive atau flashdisk.
      </div>
    </main>
  );
}
