import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export async function GET() {
  return NextResponse.json({ banks: store.listBanks() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const bank = store.createBank(body);
  return NextResponse.json({ bank });
}
