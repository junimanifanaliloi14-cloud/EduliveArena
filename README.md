# EduLive Arena - MVP

Live quiz engine untuk guru edukasi Indonesia. Guru streaming di TikTok/YouTube,
murid join lewat chat (mock) atau web app, skor live di overlay OBS.

## Jalankan

npm install
npm run dev
# buka http://localhost:3000

## Alur Demo

1. Buka /host -> pilih bank soal "Matematika Dasar" -> Mulai Sesi Baru
2. Panel kontrol tampil. Salin PIN & link murid.
3. Buka /play/[PIN] di tab baru (simulasi murid), masukkan nama -> join.
4. Di panel kontrol: Mulai Sesi -> Tampilkan Soal 1
5. Murid klik jawaban. Leaderboard update realtime.
6. Buka Jawaban -> Soal Berikutnya -> ... -> Akhiri Sesi
7. Laporan akhir muncul di panel kontrol.
8. Overlay OBS: buka /overlay/[sessionId] sebagai Browser Source di OBS

## Simulasi TikTok chat

curl -X POST http://localhost:3000/api/mock/tiktok \
  -H 'Content-Type: application/json' \
  -d '{"pin":"123456","username":"@budi","message":"B"}'

## Sistem Skor

- Base benar: 1000 poin
- Speed bonus: hingga +500
- Streak bonus: 100 x streak (max 500)
- Salah -> 0 poin, streak reset

## Struktur

- server.mjs - custom server + Socket.IO
- src/lib/store.mjs - state & scoring engine (in-memory)
- /host/session/[id] - panel kontrol guru
- /overlay/[id] - tampilan OBS
- /play/[pin] - companion web app murid
- /api/mock/tiktok - mock connector chat live
