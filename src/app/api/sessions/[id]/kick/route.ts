import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { playerId } = await req.json();
  try {
    store.kickPlayer(id, playerId);
    const io = (globalThis as any).__IO__;
    if (io) {
      // 1. Beritahu murid tersebut bahwa dia ditendang
      io.to('player:' + playerId).emit('player:kicked');
      // 2. Perbarui data semua orang (leaderboard, jumlah pemain)
      io.to('session:' + id).emit('session:state', store.getPublicState(id));
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
