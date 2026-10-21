'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { PublicState } from './types';

let sharedSocket: Socket | null = null;
function getSocket() {
  if (!sharedSocket) sharedSocket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
  return sharedSocket;
}

export function useSessionSocket(sessionId: string | null) {
  const [state, setState] = useState<PublicState | null>(null);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const s = getSocket();
    setSocket(s);

    const onConnect = () => { setConnected(true); s.emit('host:subscribe', { sessionId }); };
    const onState = (pub: PublicState) => { if (pub?.session?.id === sessionId) setState(pub); };

    s.on('connect', onConnect);
    s.on('session:state', onState);
    if (s.connected) onConnect();

    return () => { s.off('connect', onConnect); s.off('session:state', onState); };
  }, [sessionId]);

  return { state, connected, socket };
}
