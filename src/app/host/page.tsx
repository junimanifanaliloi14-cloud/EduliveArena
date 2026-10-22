'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface Bank { 
  id: string; name: string; subject: string; questionCount: number;
  questions?: { id: string; text: string }[];
}

export default function HostHome() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selected, setSelected] = useState('');
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  
  // State Pengaturan
  const [hostName, setHostName] = useState('Bu Guru');
  const [timeLimit, setTimeLimit] = useState(20);
  const [autoReveal, setAutoReveal] = useState(true);
  const [teamMode, setTeamMode] = useState(false);
  const [eliminationMode, setEliminationMode] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [bossQuestions, setBossQuestions] = useState<number[]>([]);
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [isImporting, setIsImporting] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. LOAD PENGATURAN DARI LOCAL STORAGE SAAT PERTAMA KALI DIBUKA
  useEffect(() => {
    const saved = localStorage.getItem('edulive_teacher_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.hostName) setHostName(parsed.hostName);
        if (parsed.timeLimit) setTimeLimit(parsed.timeLimit);
        if (parsed.autoReveal !== undefined) setAutoReveal(parsed.autoReveal);
        if (parsed.teamMode !== undefined) setTeamMode(parsed.teamMode);
        if (parsed.eliminationMode !== undefined) setEliminationMode(parsed.eliminationMode);
        if (parsed.shuffleOptions !== undefined) setShuffleOptions(parsed.shuffleOptions);
      } catch (e) { console.error('Gagal memuat pengaturan', e); }
    }
    fetchBanks();
  }, []);

  // 2. SIMPAN PENGATURAN KE LOCAL STORAGE SETIAP KALI ADA PERUBAHAN
  useEffect(() => {
    const settings = { hostName, timeLimit, autoReveal, teamMode, eliminationMode, shuffleOptions };
    localStorage.setItem('edulive_teacher_settings', JSON.stringify(settings));
  }, [hostName, timeLimit, autoReveal, teamMode, eliminationMode, shuffleOptions]);

  function fetchBanks() {
    fetch('/api/banks').then(r => r.json()).then(d => {
      setBanks(d.banks);
      // Jika bank yang dipilih sebelumnya sudah dihapus, reset pilihan
      if (d.banks.length > 0 && !d.banks.find((b: Bank) => b.id === selected)) {
        setSelected(d.banks[0].id);
      }
    });
  }

  async function createSession() {
    if (!selected) return;
    setLoading(true);
    const res = await fetch('/api/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankId: selected, hostName, timeLimitSec: timeLimit, autoReveal, teamMode, eliminationMode, bossQuestions, shuffleOptions }),
    });
    const data = await res.json();
    if (data.session) router.push('/host/session/' + data.session.id);
    else setLoading(false);
  }

  async function deleteBank(bankId: string, e: React.MouseEvent) {
    e.stopPropagation(); // Mencegah tombol terpilih saat menghapus
    if (!confirm('Apakah Anda yakin ingin menghapus bank soal ini secara permanen?')) return;
    
    try {
      const res = await fetch('/api/banks/' + bankId, { method: 'DELETE' });
      if (res.ok) fetchBanks();
      else alert('Gagal menghapus bank soal.');
    } catch (err) {
      alert('Terjadi kesalahan saat menghapus.');
    }
  }

  function toggleBossQuestion(index: number) {
    setBossQuestions(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  }

  // Fungsi Bantu Ekspor Template
  function downloadTemplate() {
    const templateData = [
      { soal: 'Berapakah hasil dari 5 x 5?', opsi_a: '10', opsi_b: '20', opsi_c: '25', opsi_d: '30', jawaban: 'C', gambar_url: '', waktu: 20 },
      { soal: 'Siapa tokoh pada gambar ini?', opsi_a: 'Ir. Soekarno', opsi_b: 'Moh. Hatta', opsi_c: 'Soeharto', opsi_d: 'BJ Habibie', jawaban: 'A', gambar_url: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Presiden_Sukarno.jpg', waktu: 30 }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Soal");
    XLSX.writeFile(wb, "Template_Import_Soal_EduLive.xlsx");
  }

  function processQuestions(rawData: any[]) {
    const questions = rawData.map((row: any, index: number) => {
      const normalizedRow: any = {};
      Object.keys(row).forEach(k => { normalizedRow[k.toLowerCase().replace(/\s+/g, '_')] = row[k]; });
      
      const answerStr = (normalizedRow.jawaban || 'A').toString().toUpperCase();
      const correctMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      const questionTime = parseInt(normalizedRow.waktu) || 20;

      return {
        id: 'q_' + (index + 1),
        text: normalizedRow.soal || 'Soal tanpa teks',
        options: [normalizedRow.opsi_a || '-', normalizedRow.opsi_b || '-', normalizedRow.opsi_c || '-', normalizedRow.opsi_d || '-'],
        correctIndex: correctMap[answerStr] !== undefined ? correctMap[answerStr] : 0,
        timeLimitSec: questionTime,
        imageUrl: normalizedRow.gambar_url || normalizedRow.gambar || null 
      };
    }).filter(q => q.text !== 'Soal tanpa teks');

    if (questions.length === 0) { alert('File kosong atau format tidak sesuai.'); return; }
    setParsedQuestions(questions);
    if (!newBankName) setNewBankName('Bank Soal Import - ' + new Date().toLocaleDateString());
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        processQuestions(data);
      };
      reader.readAsBinaryString(file);
    } else {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: (r) => processQuestions(r.data), error: (e) => alert(e.message) });
    }
  }

  async function saveImportedBank() {
    if (parsedQuestions.length === 0 || !newBankName.trim()) return;
    setLoading(true);
    const res = await fetch('/api/banks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBankName, subject: 'Umum', questions: parsedQuestions }),
    });
    if (res.ok) {
      setIsImporting(false); setParsedQuestions([]); setNewBankName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchBanks(); alert('Bank soal berhasil disimpan!');
    } else alert('Gagal menyimpan bank soal.');
    setLoading(false);
  }

  const selectedBank = banks.find(b => b.id === selected);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition">← Kembali ke Beranda</Link>
        <button onClick={() => setIsImporting(!isImporting)} className="text-sm text-brand-500 hover:text-brand-400 font-semibold">
          {isImporting ? 'Batal Import' : '+ Import Soal (Excel/CSV)'}
        </button>
      </div>

      <h1 className="text-3xl font-bold">Dashboard Guru</h1>
      <p className="text-slate-400 mt-1">Pilih bank soal dan atur durasi kuis live.</p>

      {isImporting && (
        <div className="card mt-6 border-brand-500/50 bg-brand-500/5 animate-slide-up">
          <div className="flex justify-between items-start mb-2">
            <h2 className="font-semibold text-lg">Import Soal (Excel / CSV)</h2>
            <button onClick={downloadTemplate} className="text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors">
              ⬇️ Download Template Excel
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Format kolom: <code>soal, opsi_a, opsi_b, opsi_c, opsi_d, jawaban</code>.<br/>
            (Opsional) Tambahkan kolom <code>gambar_url</code> dan <code>waktu</code>.
          </p>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} ref={fileInputRef}
            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600 mb-4" />
          {parsedQuestions.length > 0 && (
            <div className="space-y-3 mt-4 pt-4 border-t border-white/10">
              <div className="text-sm text-emerald-400">✓ {parsedQuestions.length} soal berhasil dibaca.</div>
              <input value={newBankName} onChange={e => setNewBankName(e.target.value)} placeholder="Nama Bank Soal Baru" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 outline-none focus:border-brand-500" />
              <button onClick={saveImportedBank} disabled={loading} className="btn-primary w-full">{loading ? 'Menyimpan...' : 'Simpan Bank Soal'}</button>
            </div>
          )}
        </div>
      )}

      <div className="card mt-8 space-y-5">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Nama tampilan guru</label>
          <input value={hostName} onChange={e => setHostName(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:border-brand-500" />
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Durasi Menjawab (Default)</label>
            <select value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:border-brand-500 [&>option]:bg-slate-800">
              <option value={10}>10 Detik</option>
              <option value={15}>15 Detik</option>
              <option value={20}>20 Detik</option>
              <option value={30}>30 Detik</option>
              <option value={60}>60 Detik</option>
            </select>
          </div>
          <div className="flex flex-col gap-3 pt-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={autoReveal} onChange={e => setAutoReveal(e.target.checked)} className="h-5 w-5 rounded bg-white/10 border-white/20 text-brand-500 cursor-pointer" />
              <div><div className="font-medium text-sm">Buka Jawaban Otomatis</div></div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={shuffleOptions} onChange={e => setShuffleOptions(e.target.checked)} className="h-5 w-5 rounded bg-white/10 border-white/20 text-brand-500 cursor-pointer" />
              <div><div className="font-medium text-sm">Acak Opsi Jawaban</div></div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={teamMode} onChange={e => setTeamMode(e.target.checked)} className="h-5 w-5 rounded bg-white/10 border-white/20 text-brand-500 cursor-pointer" />
              <div><div className="font-medium text-sm">Mode Tim</div></div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={eliminationMode} onChange={e => setEliminationMode(e.target.checked)} className="h-5 w-5 rounded bg-white/10 border-white/20 text-brand-500 cursor-pointer" />
              <div><div className="font-medium text-sm text-rose-300">Mode Eliminasi</div></div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Pilih bank soal</label>
          <div className="grid gap-2">
            {banks.length === 0 && <div className="text-slate-500 text-sm">Belum ada bank soal.</div>}
            {banks.map(b => (
              <div key={b.id} className={'rounded-xl border transition overflow-hidden ' + (selected === b.id ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5')}>
                <div 
                  onClick={() => setSelected(b.id)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition"
                >
                  <div className="text-left flex-1">
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-xs text-slate-400">{b.subject} - {b.questionCount} soal</div>
                  </div>
                  
                  {/* TOMBOL PREVIEW & DELETE */}
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => setExpandedBank(expandedBank === b.id ? null : b.id)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition"
                      title="Lihat Soal"
                    >
                      👁️
                    </button>
                    <button 
                      onClick={(e) => deleteBank(b.id, e)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition"
                      title="Hapus Bank Soal"
                    >
                      🗑️
                    </button>
                    {selected === b.id && <span className="text-brand-500 ml-1 font-bold">✓</span>}
                  </div>
                </div>
                
                {/* AREA PREVIEW SOAL */}
                {expandedBank === b.id && b.questions && (
                  <div className="px-4 pb-4 pt-2 border-t border-white/5 animate-slide-up bg-black/20">
                    <div className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Daftar Soal:</div>
                    <ol className="text-sm space-y-1.5 text-slate-300">
                      {b.questions.map((q, i) => (
                        <li key={q.id} className="flex gap-2">
                          <span className="text-brand-500 font-mono">{i + 1}.</span>
                          <span className="line-clamp-2">{q.text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedBank && selectedBank.questions && (
          <div className="border-t border-white/10 pt-4 mt-2">
            <label className="block text-sm text-slate-400 mb-2">Pilih Soal Boss Battle (Poin 3x Lipat)</label>
            <div className="grid gap-2 max-h-60 overflow-y-auto pr-2">
              {selectedBank.questions.map((q, i) => (
                <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${bossQuestions.includes(i) ? 'border-rose-500/50 bg-rose-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                  <input type="checkbox" checked={bossQuestions.includes(i)} onChange={() => toggleBossQuestion(i)} className="mt-1 h-4 w-4 rounded bg-slate-800 border-white/20 text-rose-500 cursor-pointer" />
                  <div><div className="text-xs text-slate-400">Soal {i + 1}</div><div className="text-sm font-medium">{q.text}</div></div>
                </label>
              ))}
            </div>
          </div>
        )}

        <button onClick={createSession} disabled={loading || !selected} className="btn-primary w-full">{loading ? 'Membuat sesi...' : 'Mulai Sesi Baru →'}</button>
      </div>
    </main>
  );
}
