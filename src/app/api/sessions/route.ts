import { NextResponse } from 'next/server';
import { store } from '@/lib/store.mjs';

export async function POST(req: Request) {
  try {
    const { 
      bankId, hostName, hostAvatar, hostLogo, timeLimitSec, autoReveal, 
      groupMode, groupCount, groupNames, 
      eliminationMode, bossQuestions, shuffleOptions, 
      tournamentMode, expectedPlayers, invitationCodes 
    } = await req.json();
    
    const session = store.createSession({ 
      bankId, hostName, hostAvatar, hostLogo, timeLimitSec, autoReveal, 
      groupMode, groupCount, groupNames, 
      eliminationMode, bossQuestions, shuffleOptions, 
      tournamentMode, expectedPlayers, invitationCodes 
    });
    return NextResponse.json({ session: { id: session.id, pin: session.pin } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
