import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    // Pastikan bank soal ada (bisa dari Supabase atau lokal)
    const bank = await store.getBank(data.bankId);
    if (!bank) throw new Error('Bank soal tidak ditemukan');
    
    const session = store.createSession(data);
    return NextResponse.json({ session: { id: session.id, pin: session.pin } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
