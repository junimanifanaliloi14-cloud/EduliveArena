import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const banks = await store.listBanks();
  return NextResponse.json({ banks });
}

export async function POST(req: Request) {
  const body = await req.json();
  const bank = store.createBank(body);
  return NextResponse.json({ bank });
}
