import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export async function POST(req: Request) {
  try {
    const { bankId, hostName, timeLimitSec, autoReveal, teamMode } = await req.json();
    const session = store.createSession({ bankId, hostName, timeLimitSec, autoReveal, teamMode });
    return NextResponse.json({ session: { id: session.id, pin: session.pin } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
