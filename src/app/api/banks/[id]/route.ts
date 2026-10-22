import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    store.deleteBank(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const bank = store.updateBank(id, body);
    return NextResponse.json({ bank });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
