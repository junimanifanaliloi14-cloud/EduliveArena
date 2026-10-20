import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { store } from './src/lib/store.mjs';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => handle(req, res, parse(req.url, true)));
const io = new Server(server, { cors: { origin: '*' }, path: '/socket.io' });
globalThis.__IO__ = io;

io.on('connection', (socket) => {
  socket.on('host:subscribe', ({ sessionId }) => { 
    if (sessionId) {
      socket.join(`session:${sessionId}`);
      const state = store.getPublicState(sessionId);
      if (state) socket.emit('session:state', state);
    } 
  });

  socket.on('player:join', ({ pin, name }, ack) => {
    try {
      const session = store.getSessionByPin(pin);
      if (!session) return ack?.({ ok: false, error: 'PIN tidak valid' });
      if (session.status === 'ended') return ack?.({ ok: false, error: 'Sesi telah berakhir' });
      const player = store.joinSession(session.id, name);
      socket.join(`session:${session.id}`);
      socket.join(`player:${player.id}`); // Room pribadi untuk menerima pesan kick
      socket.data.sessionId = session.id;
      socket.data.playerId = player.id;
      io.to(`session:${session.id}`).emit('session:state', store.getPublicState(session.id));
      socket.emit('player:state', store.getPlayerState(session.id, player.id));
      ack?.({ ok: true, player, sessionId: session.id });
    } catch (e) { ack?.({ ok: false, error: e.message }); }
  });

  socket.on('player:answer', ({ choice }, ack) => {
    const { sessionId, playerId } = socket.data;
    if (!sessionId || !playerId) return ack?.({ ok: false, error: 'Belum join' });
    try {
      const result = store.submitAnswer(sessionId, playerId, choice);
      io.to(`session:${sessionId}`).emit('session:state', store.getPublicState(sessionId));
      socket.emit('player:state', store.getPlayerState(sessionId, playerId));
      ack?.({ ok: true, ...result });
    } catch (e) { ack?.({ ok: false, error: e.message }); }
  });

  socket.on('player:refresh', () => {
    const { sessionId, playerId } = socket.data;
    if (sessionId && playerId) socket.emit('player:state', store.getPlayerState(sessionId, playerId));
  });

  socket.on('disconnect', () => {
    const { sessionId, playerId } = socket.data;
    if (sessionId && playerId) {
      store.setPlayerOnline(sessionId, playerId, false);
      io.to(`session:${sessionId}`).emit('session:state', store.getPublicState(sessionId));
    }
  });
});

server.listen(port, () => console.log(`> EduLive Arena ready on http://${hostname}:${port}`));
