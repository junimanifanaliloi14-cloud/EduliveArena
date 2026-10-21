import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export async function POST(req: Request) {
  try {
    const { pin, username, giftName } = await req.json();
    
    const session = store.getSessionByPin(pin);
    if (!session) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });

    const io = (globalThis as any).__IO__;
    if (io) {
      // Kirim event ke seluruh room sesi (Overlay OBS akan mendengarkan ini)
      io.to('session:' + session.id).emit('gift:received', { 
        username: username || 'Penonton', 
        giftName: giftName || 'Hadiah Spesial' 
      });
    }
    
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
