import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ entries: store.getHallOfFameList() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!Array.isArray(body.players)) return NextResponse.json({ error: 'Format tidak valid' }, { status: 400 });
    const updated = store.mergeHallOfFame(body.players);
    return NextResponse.json({ ok: true, updated: updated.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
