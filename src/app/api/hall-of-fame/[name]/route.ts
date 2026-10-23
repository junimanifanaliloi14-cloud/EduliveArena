import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    const student = store.getHallOfFameByName(decodedName);
    if (!student) return NextResponse.json({ error: 'Siswa tidak ditemukan', notFound: true }, { status: 404 });
    return NextResponse.json({ student });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
