import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export async function GET() {
  try {
    const banks = store.exportAllBanks();
    return NextResponse.json({
      version: '1.0',
      type: 'edulive-backup',
      exportedAt: Date.now(),
      bankCount: banks.length,
      banks,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !Array.isArray(body.banks)) {
      return NextResponse.json({ error: 'Format file backup tidak valid' }, { status: 400 });
    }
    const count = store.importAllBanks(body.banks);
    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
