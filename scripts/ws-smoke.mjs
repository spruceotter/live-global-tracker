import WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:3001/ws/lightning');
let count = 0;
ws.on('open', () => console.log('[smoke] WS opened'));
ws.on('message', (data) => {
  count++;
  if (count <= 3) console.log('[smoke] msg:', data.toString().slice(0, 100));
  if (count >= 5) { console.log(`[smoke] ✅ got ${count} strikes`); ws.close(); process.exit(0); }
});
ws.on('error', (e) => { console.log('[smoke] error:', e.message); process.exit(1); });
setTimeout(() => { console.log(`[smoke] timeout — ${count} strikes in 20s`); ws.close(); process.exit(count > 0 ? 0 : 2); }, 20000);
