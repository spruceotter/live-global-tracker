/**
 * Sprint 1 spike — verify Blitzortung WS connectivity + payload format.
 * Connects to the public lightning detection WS, waits for first strikes,
 * logs payload shape, disconnects. Not meant to run in production.
 *
 * Usage: npx tsx scripts/blitzortung-spike.ts
 */

import WebSocket from 'ws';

const ENDPOINTS = [
  'wss://ws1.blitzortung.org/',
  'wss://ws7.blitzortung.org/',
  'wss://ws8.blitzortung.org/',
];

function tryEndpoint(url: string, timeoutMs: number): Promise<{ url: string; firstMsg: string; msgCount: number; durationMs: number } | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    let firstMsg = '';
    let msgCount = 0;
    const ws = new WebSocket(url);

    const cleanup = () => {
      try { ws.close(); } catch { /* ignore */ }
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(msgCount > 0 ? { url, firstMsg, msgCount, durationMs: Date.now() - start } : null);
    }, timeoutMs);

    ws.on('open', () => {
      // Blitzortung public protocol: client sends "{"a":111}" to subscribe to world
      ws.send(JSON.stringify({ a: 111 }));
    });

    ws.on('message', (data) => {
      msgCount++;
      const raw = data.toString();
      if (!firstMsg) firstMsg = raw.slice(0, 400);
      if (msgCount >= 5) {
        clearTimeout(timeout);
        cleanup();
        resolve({ url, firstMsg, msgCount, durationMs: Date.now() - start });
      }
    });

    ws.on('error', (err) => {
      console.error(`[${url}] error:`, (err as Error).message);
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    });
  });
}

(async () => {
  for (const url of ENDPOINTS) {
    console.log(`[spike] trying ${url}...`);
    const result = await tryEndpoint(url, 15000);
    if (result) {
      console.log(`[spike] ✅ ${result.url} — ${result.msgCount} messages in ${result.durationMs}ms`);
      console.log(`[spike] first message sample (decoded if possible):`);
      // Blitzortung wraps payloads in a light obfuscation — try JSON parse first
      try {
        const parsed = JSON.parse(result.firstMsg);
        console.log(`[spike] JSON parsed:`, parsed);
      } catch {
        console.log(`[spike] raw (first 400 chars):`, result.firstMsg);
      }
      return;
    } else {
      console.log(`[spike] ❌ ${url} — no strikes or failed`);
    }
  }
  console.log('[spike] ❌ all endpoints failed');
  process.exit(1);
})();
