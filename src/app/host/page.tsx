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

const AVATAR_OPTIONS = ['👩‍🏫', '👨‍🏫', '🦸‍♀️', '🦸‍♂️', '🧙‍♂️', '🧙‍♀️', '🐯', '🦊', '🤖', '👽'];

export default function HostHome() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selected, setSelected] = useState('');
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  
  // State Pengaturan
  const [hostName, setHostName] = useState('Bu Guru');
  const [hostAvatar, setHostAvatar] = useState('👩‍🏫');
  const [hostLogo, setHostLogo] = useState('');
  const [timeLimit, setTimeLimit] = useState(20);
  const [autoReveal, setAutoReveal] = useState(true);
  const [groupMode, setGroupMode] = useState(false);
  const [groupCount, setGroupCount] = useState(2);
  const [groupNames, setGroupNames] = useState(['Merah', 'Biru', 'Hijau', 'Kuning']);
  const [eliminationMode, setEliminationMode] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [bossQuestions, setBossQuestions] = useState<number[]>([]);

  // State Turnamen
  const [tournamentMode, setTournamentMode] = useState(false);
  const [namesInput, setNamesInput] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<{name: string, code: string}[]>([]);

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [isImporting, setIsImporting] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('edulive_teacher_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.hostName) setHostName(parsed.hostName);
        if (parsed.hostAvatar) setHostAvatar(parsed.hostAvatar);
        if (parsed.hostLogo !== undefined) setHostLogo(parsed.hostLogo);
        if (parsed.timeLimit) setTimeLimit(parsed.timeLimit);
        if (parsed.autoReveal !== undefined) setAutoReveal(parsed.autoReveal);
        if (parsed.groupMode !== undefined) setGroupMode(parsed.groupMode);
        if (parsed.groupCount !== undefined) setGroupCount(parsed.groupCount);
        if (parsed.groupNames !== undefined) setGroupNames(parsed.groupNames);
        if (parsed.eliminationMode !== undefined) setEliminationMode(parsed.eliminationMode);
        if (parsed.shuffleOptions !== undefined) setShuffleOptions(parsed.shuffleOptions);
        if (parsed.tournamentMode !== undefined) setTournamentMode(parsed.tournamentMode);
      } catch (e) { console.error(e); }
    }
    fetchBanks();
  }, []);

  useEffect(() => {
    const settings = { hostName, hostAvatar, hostLogo, timeLimit, autoReveal, groupMode, groupCount, groupNames, eliminationMode, shuffleOptions, tournamentMode };
    localStorage.setItem('edulive_teacher_settings', JSON.stringify(settings));
  }, [hostName, hostAvatar, hostLogo, timeLimit, autoReveal, groupMode, groupCount, groupNames, eliminationMode, shuffleOptions, tournamentMode]);

  function fetchBanks() {
    fetch('/api/banks').then(r => r.json()).then(d => {
      setBanks(d.banks);
      if (d.banks.length > 0 && !d.banks.find((b: Bank) => b.id === selected)) {
        setSelected(d.banks[0].id);
      }
    });
  }

  function generateCodes() {
    const names = namesInput.split('\n').map(n => n.trim()).filter(n => n);
    if (names.length === 0) { alert('Masukkan minimal 1 nama.'); return; }
    
    const codes = names.map(name => {
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      return { name, code: `${name.split(' ')[0].toUpperCase()}-${randomStr}` };
    });
    setGeneratedCodes(codes);
  }

  async function createSession() {
    if (!selected) return;
    if (tournamentMode && generatedCodes.length === 0) {
      alert('Silakan klik "Generate Kode Undangan" terlebih dahulu.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        bankId: selected, hostName, hostAvatar, hostLogo, timeLimitSec: timeLimit, autoReveal, 
        groupMode, groupCount, groupNames, eliminationMode, bossQuestions, shuffleOptions,
        tournamentMode, expectedPlayers: generatedCodes.length, invitationCodes: generatedCodes 
      }),
    });
    const data = await res.json();
    if (data.session) {
      if (tournamentMode) {
        const origin = window.location.origin;
        const exportData = generatedCodes.map((c, i) => {
          const magicLink = `${origin}/play/${data.session.pin}?name=${encodeURIComponent(c.name)}&code=${c.code}`;
          const waText = `Halo ${c.name}, selamat datang di turnamen kuis! Silakan klik link ini untuk masuk: ${magicLink}`;
          return {
            No: i + 1,
            Nama: c.name,
            'Kode Undangan': c.code,
            'Magic Link': magicLink,
            'Link WhatsApp': `https://wa.me/?text=${encodeURIComponent(waText)}`
          };
        });
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Peserta_Turnamen");
        XLSX.writeFile(wb, `Turnamen_${hostName}_PIN_${data.session.pin}.xlsx`);
      }
      router.push('/host/session/' + data.session.id);
    }
    else setLoading(false);
  }

  async function deleteBank(bankId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Hapus bank soal ini?')) return;
    const res = await fetch('/api/banks/' + bankId, { method: 'DELETE' });
    if (res.ok) fetchBanks();
  }

  function toggleBossQuestion(index: number) {
    setBossQuestions(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  }

  function downloadTemplate() {
    const templateData = [{ soal: 'Berapakah hasil 2+2?', opsi_a: '3', opsi_b: '4', opsi_c: '5', opsi_d: '6', jawaban: 'B', gambar_url: '', waktu: 20 }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Soal");
    XLSX.writeFile(wb, "Template_Import_Soal.xlsx");
  }

  function processQuestions(rawData: any[]) {
    const questions = rawData.map((row: any, index: number) => {
      const normalizedRow: any = {};
      Object.keys(row).forEach(k => { normalizedRow[k.toLowerCase().replace(/\s+/g, '_')] = row[k]; });
      const answerStr = (normalizedRow.jawaban || 'A').toString().toUpperCase();
      const correctMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      const questionTime = parseInt(normalizedRow.waktu) || 20;
      return {
        id: 'q_' + (index + 1), text: normalizedRow.soal || 'Soal tanpa teks',
        options: [normalizedRow.opsi_a || '-', normalizedRow.opsi_b || '-', normalizedRow.opsi_c || '-', normalizedRow.opsi_d || '-'],
        correctIndex: correctMap[answerStr] !== undefined ? correctMap[answerStr] : 0,
        timeLimitSec: questionTime, imageUrl: normalizedRow.gambar_url || normalizedRow.gambar || null 
      };
    }).filter(q => q.text !== 'Soal tanpa teks');
    if (questions.length === 0) { alert('File kosong.'); return; }
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
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        processQuestions(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
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
      fetchBanks(); alert('Bank soal tersimpan!');
    } else alert('Gagal menyimpan.');
    setLoading(false);
  }

  function updateGroupName(index: number, value: string) {
    const newNames = [...groupNames];
    newNames[index] = value;
    setGroupNames(newNames);
  }

  const selectedBank = banks.find(b => b.id === selected);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition">← Kembali ke Beranda</Link>
        <button onClick={() => setIsImporting(!isImporting)} className="text-sm text-brand-500 hover:text-brand-400 font-semibold">
          {isImporting ? 'Batal Import' : '+ Import Soal'}
        </button>
      </div>

      <h1 className="text-3xl font-bold">Dashboard Guru</h1>
      <p className="text-slate-400 mt-1">Pilih bank soal dan atur durasi kuis live.</p>

      {isImporting && (
        <div className="card mt-6 border-brand-500/50 bg-brand-500/5 animate-slide-up">
          <div className="flex justify-between items-start mb-2">
            <h2 className="font-semibold text-lg">Import Soal</h2>
            <button onClick={downloadTemplate} className="text-xs font-semibold bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30">⬇️ Template</button>
          </div>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} ref={fileInputRef} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-white mb-4" />
          {parsedQuestions.length > 0 && (
            <div className="space-y-3 mt-4 pt-4 border-t border-white/10">
              <div className="text-sm text-emerald-400">✓ {parsedQuestions.length} soal dibaca.</div>
              <input value={newBankName} onChange={e => setNewBankName(e.target.value)} placeholder="Nama Bank Soal" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 outline-none focus:border-brand-500" />
              <button onClick={saveImportedBank} disabled={loading} className="btn-primary w-full">{loading ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          )}
        </div>
      )}

      <div className="card mt-8 space-y-5">
        
        {/* BRANDING GURU */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-white/10">
          <h3 className="font-semibold text-brand-400 mb-3 text-sm">Identitas Guru & Sekolah</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Nama tampilan guru</label>
              <input value={hostName} onChange={e => setHostName(e.target.value)} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">URL Logo Sekolah/Komunitas (Opsional)</label>
              <input value={hostLogo} onChange={e => setHostLogo(e.target.value)} placeholder="https://..." className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:border-brand-500 text-sm" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm text-slate-400 mb-2">Pilih Avatar Guru</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => setHostAvatar(emoji)}
                  className={`text-3xl p-2 rounded-xl transition-all ${hostAvatar === emoji ? 'bg-brand-500/30 border-2 border-brand-500 scale-110' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Durasi Default</label>
            <select value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:border-brand-500 [&>option]:bg-slate-800">
              <option value={10}>10 Detik</option><option value={15}>15 Detik</option><option value={20}>20 Detik</option><option value={30}>30 Detik</option><option value={60}>60 Detik</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={autoReveal} onChange={e => setAutoReveal(e.target.checked)} className="h-5 w-5 rounded bg-white/10 border-white/20 text-brand-500 cursor-pointer" />
              <div><div className="font-medium text-sm">Buka Jawaban Otomatis</div></div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={shuffleOptions} onChange={e => setShuffleOptions(e.target.checked)} className="h-5 w-5 rounded bg-white/10 border-white/20 text-brand-500 cursor-pointer" />
              <div><div className="font-medium text-sm">Acak Opsi Jawaban</div></div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={eliminationMode} onChange={e => setEliminationMode(e.target.checked)} className="h-5 w-5 rounded bg-white/10 border-white/20 text-rose-500 cursor-pointer" />
              <div><div className="font-medium text-sm text-rose-300">Mode Eliminasi</div></div>
            </label>
          </div>
        </div>

        {/* MODE GRUP */}
        <div className="border-t border-white/10 pt-4">
          <label className="flex items-center gap-3 cursor-pointer mb-2">
            <input type="checkbox" checked={groupMode} onChange={e => setGroupMode(e.target.checked)} className="h-5 w-5 rounded bg-emerald-500/20 border-emerald-500/50 text-emerald-500 focus:ring-emerald-500 cursor-pointer" />
            <div><div className="font-bold text-emerald-400">Mode Multi-Grup (Perkelompok)</div></div>
          </label>
          
          {groupMode && (
            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3 mt-3 animate-slide-up">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Jumlah Grup</label>
                <select value={groupCount} onChange={e => setGroupCount(Number(e.target.value))} className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2 outline-none focus:border-emerald-500">
                  <option value={2}>2 Grup</option>
                  <option value={3}>3 Grup</option>
                  <option value={4}>4 Grup</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Array.from({ length: groupCount }).map((_, i) => (
                  <div key={i}>
                    <label className="block text-xs text-slate-400 mb-1">Nama Grup {i + 1}</label>
                    <input value={groupNames[i]} onChange={e => updateGroupName(i, e.target.value)} className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm outline-none focus:border-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODE TURNAMEN */}
        <div className="border-t border-white/10 pt-4">
          <label className="flex items-center gap-3 cursor-pointer mb-2">
            <input type="checkbox" checked={tournamentMode} onChange={e => setTournamentMode(e.target.checked)} className="h-5 w-5 rounded bg-amber-500/20 border-amber-500/50 text-amber-500 focus:ring-amber-500 cursor-pointer" />
            <div><div className="font-bold text-amber-400">Mode Turnamen (Kuota & Kode Undangan)</div></div>
          </label>
          
          {tournamentMode && (
            <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3 mt-3 animate-slide-up">
              <p className="text-xs text-slate-400">Masukkan nama peserta (satu per baris). Sistem akan membuatkan Link Ajaib otomatis.</p>
              <textarea 
                value={namesInput} onChange={e => setNamesInput(e.target.value)}
                placeholder="Budi Santoso&#10;Siti Aminah&#10;Andi Wijaya"
                className="w-full h-32 rounded-xl bg-white/5 border border-white/10 px-4 py-2 outline-none focus:border-amber-500 font-mono text-sm"
              />
              <button onClick={generateCodes} className="btn-ghost bg-amber-500/20 text-amber-300 border border-amber-500/30 text-sm w-full">
                🔄 Generate Kode Undangan & Link
              </button>
              
              {generatedCodes.length > 0 && (
                <div className="text-sm text-emerald-400 mt-2">
                  ✓ {generatedCodes.length} Kode berhasil dibuat. File Excel akan otomatis terunduh saat Anda menekan "Mulai Sesi".
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Pilih bank soal</label>
          <div className="grid gap-2">
            {banks.length === 0 && <div className="text-slate-500 text-sm">Belum ada bank soal.</div>}
            {banks.map(b => (
              <div key={b.id} className={'rounded-xl border transition overflow-hidden ' + (selected === b.id ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-white/5')}>
                <div onClick={() => setSelected(b.id)} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition">
                  <div className="text-left flex-1">
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-xs text-slate-400">{b.subject} - {b.questionCount} soal</div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setExpandedBank(expandedBank === b.id ? null : b.id)} className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition">👁️</button>
                    <button onClick={(e) => deleteBank(b.id, e)} className="p-2 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition">🗑️</button>
                    {selected === b.id && <span className="text-brand-500 ml-1 font-bold">✓</span>}
                  </div>
                </div>
                {expandedBank === b.id && b.questions && (
                  <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-black/20">
                    <ol className="text-sm space-y-1.5 text-slate-300">
                      {b.questions.map((q, i) => (<li key={q.id} className="flex gap-2"><span className="text-brand-500 font-mono">{i + 1}.</span><span className="line-clamp-2">{q.text}</span></li>))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedBank && selectedBank.questions && (
          <div className="border-t border-white/10 pt-4 mt-2">
            <label className="block text-sm text-slate-400 mb-2">Pilih Soal Boss Battle (Poin 3x)</label>
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
