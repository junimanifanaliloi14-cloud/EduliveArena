import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const bank = store.getBankQuestionsForPractice(code, 10);
    return NextResponse.json({ bank });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    store.deletePracticeCode(code);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
