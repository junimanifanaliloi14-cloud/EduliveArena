'use client';
import { useEffect, useRef, useState } from 'react';
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
  const sockRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const socket = getSocket();
    sockRef.current = socket;

    const onConnect = () => { setConnected(true); socket.emit('host:subscribe', { sessionId }); };
    const onState = (s: PublicState) => { if (s?.session?.id === sessionId) setState(s); };

    socket.on('connect', onConnect);
    socket.on('session:state', onState);
    if (socket.connected) onConnect();

    return () => { socket.off('connect', onConnect); socket.off('session:state', onState); };
  }, [sessionId]);

  return { state, connected, socket: sockRef.current };
}
