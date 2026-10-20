import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = store.getPublicState(id);
  const report = store.getReport(id);
  if (!state) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ state, report });
}
