import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ codes: store.listPracticeCodes() });
}

export async function POST(req: Request) {
  try {
    const { bankId } = await req.json();
    if (!bankId) return NextResponse.json({ error: 'bankId diperlukan' }, { status: 400 });
    
    // Validasi: pastikan bank ada di Supabase atau lokal
    const bank = await store.getBank(bankId);
    if (!bank) return NextResponse.json({ error: 'Bank tidak ditemukan' }, { status: 404 });

    const entry = store.generatePracticeCode(bankId);
    return NextResponse.json({ code: entry });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
