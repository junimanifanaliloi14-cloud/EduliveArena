import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json();
  try {
    if (action === 'start') store.startSession(id);
    else if (action === 'next') store.nextQuestion(id);
    else if (action === 'reveal') store.revealAnswer(id);
    else if (action === 'end') store.endSession(id);
    else if (action === 'pause') store.pauseTimer(id);
    else if (action === 'resume') store.resumeTimer(id);
    else return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    const io = (globalThis as any).__IO__;
    if (io) {
      io.to('session:' + id).emit('session:state', store.getPublicState(id));
      
      if (action === 'end') {
        const report = store.getReport(id);
        io.to('session:' + id).emit('session:ended', report);
      } else if (action === 'reveal' || action === 'pause' || action === 'resume') {
        const session = store.getSession(id);
        if (session) {
          for (const pid of session.players.keys()) {
            io.to('player:' + pid).emit('player:state', store.getPlayerState(id, pid));
          }
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
