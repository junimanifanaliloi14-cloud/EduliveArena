'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface Bank { id: string; name: string; subject: string; questionCount: number; }

export default function HostHome() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selected, setSelected] = useState('');
  const [hostName, setHostName] = useState('Bu Guru');
  const [timeLimit, setTimeLimit] = useState(20);
  const [autoReveal, setAutoReveal] = useState(true);
  const [teamMode, setTeamMode] = useState(false);
  const [eliminationMode, setEliminationMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [isImporting, setIsImporting] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchBanks(); }, []);

  function fetchBanks() {
    fetch('/api/banks').then(r => r.json()).then(d => {
      setBanks(d.banks);
      if (d.banks.length > 0 && !selected) setSelected(d.banks[0].id);
    });
  }

  async function createSession() {
    if (!selected) return;
    setLoading(true);
    const res = await fetch('/api/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankId: selected, hostName, timeLimitSec: timeLimit, autoReveal, teamMode, eliminationMode }),
    });
    const data = await res.json();
    if (data.session) router.push('/host/session/' + data.session.id);
    else setLoading(false);
  }

  function processQuestions(rawData: any[]) {
    const questions = rawData.map((row: any, index: number) => {
      const normalizedRow: any = {};
      Object.keys(row).forEach(k => { normalizedRow[k.toLowerCase().replace(/\s+/g, '_')] = row[k]; });
      const answerStr = (normalizedRow.jawaban || 'A').toString().toUpperCase();
      const correctMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      return {
        id: 'q_' + (index + 1),
        text: normalizedRow.soal || 'Soal tanpa teks',
        options: [normalizedRow.opsi_a || '-', normalizedRow.opsi_b || '-', normalizedRow.opsi_c || '-', normalizedRow.opsi_d || '-'],
        correctIndex: correctMap[answerStr] !== undefined ? correctMap[answerStr] : 0,
        timeLimitSec: 20
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
          <h2 className="font-semibold text-lg mb-2">Import Soal (Excel / CSV)</h2>
          <p className="text-xs text-slate-400 mb-4">Format kolom: <code>soal, opsi_a, opsi_b, opsi_c, opsi_d, jawaban</code> (A/B/C/D).</p>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} ref={fileInputRef}
            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600 mb-4" />
          {parsedQuestions.length > 0 && (
            <div className="space-y-3">
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
            <label className="block text-sm text-slate-400 mb-2">Durasi Menjawab per Soal</label>
            <select value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:border-brand-500 [&>option]:bg-slate-800">
              <option value={10}>10 Detik (Cepat)</option>
              <option value={15}>15 Detik</option>
              <option value={20}>20 Detik (Standar)</option>
              <option value={30}>30 Detik</option>
              <option value={60}>60 Detik (Hitung Manual)</option>
            </select>
          </div>
          <div className="flex flex-col gap-3 pt-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={autoReveal} onChange={e => setAutoReveal(e.target.checked)} className="h-5 w-5 rounded bg-white/10 border-white/20 text-brand-500 focus:ring-brand-500 cursor-pointer" />
              <div><div className="font-medium text-sm">Buka Jawaban Otomatis</div></div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={teamMode} onChange={e => setTeamMode(e.target.checked)} className="h-5 w-5 rounded bg-white/10 border-white/20 text-brand-500 focus:ring-brand-500 cursor-pointer" />
              <div><div className="font-medium text-sm">Aktifkan Mode Tim (Merah vs Biru)</div></div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={eliminationMode} onChange={e => setEliminationMode(e.target.checked)} className="h-5 w-5 rounded bg-white/10 border-white/20 text-brand-500 focus:ring-brand-500 cursor-pointer" />
              <div><div className="font-medium text-sm text-rose-300">Mode Eliminasi (Gugur jika salah)</div></div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Pilih bank soal</label>
          <div className="grid gap-2">
            {banks.length === 0 && <div className="text-slate-500 text-sm">Belum ada bank soal.</div>}
            {banks.map(b => (
              <button key={b.id} onClick={() => setSelected(b.id)} className={'flex items-center justify-between rounded-xl px-4 py-3 border transition ' + (selected === b.id ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10')}>
                <div className="text-left"><div className="font-semibold">{b.name}</div><div className="text-xs text-slate-400">{b.subject} - {b.questionCount} soal</div></div>
                {selected === b.id && <span className="text-brand-500">✓</span>}
              </button>
            ))}
          </div>
        </div>
        <button onClick={createSession} disabled={loading || !selected} className="btn-primary w-full">{loading ? 'Membuat sesi...' : 'Mulai Sesi Baru →'}</button>
      </div>
    </main>
  );
}
