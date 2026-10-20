// Simulator tiktok-live-connector: POST chat message -> dianggap jawaban murid.
// Body: { pin, username, message }  -> message seperti "A", "B", "C", atau "D"
import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

const CHOICE_MAP: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };

export async function POST(req: Request) {
  const { pin, username, message } = await req.json();
  const session = store.getSessionByPin(pin);
  if (!session) return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 });

  const choice = CHOICE_MAP[(message || '').trim()];
  if (choice === undefined) return NextResponse.json({ error: 'Jawaban tidak valid (A/B/C/D)' }, { status: 400 });

  // Auto-register sebagai player berdasarkan username (lazy registration)
  let player = Array.from(session.players.values()).find((p: any) => p.name === username);
  if (!player) player = store.joinSession(session.id, username);

  try {
    const result = store.submitAnswer(session.id, player.id, choice);
    const io = (globalThis as any).__IO__;
    if (io) io.to('session:' + session.id).emit('session:state', store.getPublicState(session.id));
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
