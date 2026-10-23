import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

// Wajib: mencegah Next.js cache respons dinamis
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ success: false, error: 'Kode tidak valid' }, { status: 400 });
    }
    const bank = store.getBankQuestionsForPractice(code, 10);
    if (!bank || !bank.questions || bank.questions.length === 0) {
      return NextResponse.json({ success: false, error: 'Soal latihan tidak tersedia' }, { status: 404 });
    }
    return NextResponse.json({ success: true, bank });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 404 });
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
