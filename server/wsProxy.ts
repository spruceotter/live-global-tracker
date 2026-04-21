/**
 * Blitzortung lightning fan-out WebSocket proxy.
 *
 * Blitzortung's public WS is an unofficial community feed with a polite
 * one-connection-per-IP expectation. We hold a single upstream connection,
 * decompress each strike payload on the server, and broadcast the tiny
 * normalized JSON to every connected browser client.
 *
 * Browser clients connect to ws://host/ws/lightning. Messages arrive as
 * `{"t": unixMs, "lat": number, "lon": number}` — everything the client
 * needs to flash a strike on the globe.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';

const UPSTREAM_ENDPOINTS = [
  'wss://ws1.blitzortung.org/',
  'wss://ws7.blitzortung.org/',
  'wss://ws8.blitzortung.org/',
];

const RECONNECT_MIN_MS = 2_000;
const RECONNECT_MAX_MS = 60_000;
const SUBSCRIBE_MSG = JSON.stringify({ a: 111 });

/** LZW decoder from the Blitzortung community — payloads are compressed to shave bandwidth. */
function decompress(raw: string): string {
  const dict: Record<number, string> = {};
  const chars = raw.split('');
  let prev: string = chars[0];
  let first: string = prev;
  const out: string[] = [prev];
  for (let i = 1; i < chars.length; i++) {
    const code = chars[i].charCodeAt(0);
    let entry: string;
    if (code < 256) {
      entry = chars[i];
    } else {
      entry = dict[code] ?? first + prev.charAt(0);
    }
    out.push(entry);
    prev = entry.charAt(0);
    dict[i + 255] = first + prev;
    first = entry;
  }
  return out.join('');
}

interface StrikeMessage {
  t: number;   // unix ms
  lat: number;
  lon: number;
}

function parseStrike(raw: string): StrikeMessage | null {
  try {
    const decoded = decompress(raw);
    const obj = JSON.parse(decoded) as { time?: number; lat?: number; lon?: number };
    // Blitzortung emits time in nanoseconds since epoch
    if (typeof obj.time !== 'number' || typeof obj.lat !== 'number' || typeof obj.lon !== 'number') {
      return null;
    }
    return {
      t: Math.floor(obj.time / 1_000_000),
      lat: obj.lat,
      lon: obj.lon,
    };
  } catch {
    return null;
  }
}

export class BlitzortungFanout {
  private wss: WebSocketServer;
  private upstream: WebSocket | null = null;
  private upstreamIdx = 0;
  private reconnectDelay = RECONNECT_MIN_MS;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private clientCount = 0;
  private strikesForwarded = 0;

  constructor(httpServer: HttpServer) {
    this.wss = new WebSocketServer({ server: httpServer, path: '/ws/lightning' });
    this.wss.on('connection', (socket) => {
      this.clientCount++;
      // Open upstream only when we have browser clients
      if (!this.upstream) this.connectUpstream();
      socket.on('close', () => {
        this.clientCount = Math.max(0, this.clientCount - 1);
        if (this.clientCount === 0) this.closeUpstream();
      });
      socket.on('error', () => { /* client errors are transient */ });
    });
  }

  private connectUpstream(): void {
    const url = UPSTREAM_ENDPOINTS[this.upstreamIdx % UPSTREAM_ENDPOINTS.length];
    console.log(`[ws-proxy] opening upstream ${url}`);
    const ws = new WebSocket(url);
    this.upstream = ws;

    ws.on('open', () => {
      this.reconnectDelay = RECONNECT_MIN_MS;
      ws.send(SUBSCRIBE_MSG);
      console.log(`[ws-proxy] upstream ${url} subscribed`);
    });

    ws.on('message', (data) => {
      const strike = parseStrike(data.toString());
      if (!strike) return;
      this.strikesForwarded++;
      const payload = JSON.stringify(strike);
      // Broadcast to all open browser clients
      for (const client of this.wss.clients) {
        if (client.readyState === WebSocket.OPEN) client.send(payload);
      }
    });

    ws.on('close', () => {
      console.warn(`[ws-proxy] upstream ${url} closed; strikes forwarded: ${this.strikesForwarded}`);
      this.upstream = null;
      // Cycle to next endpoint on reconnect — resilience if one instance rate-limits us
      this.upstreamIdx++;
      if (this.clientCount > 0) this.scheduleReconnect();
    });

    ws.on('error', (err) => {
      console.warn(`[ws-proxy] upstream ${url} error:`, (err as Error).message);
      try { ws.close(); } catch { /* ignore */ }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = this.reconnectDelay + Math.floor(Math.random() * 500);
    console.log(`[ws-proxy] reconnecting in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.clientCount > 0) this.connectUpstream();
    }, delay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
  }

  private closeUpstream(): void {
    if (this.upstream) {
      try { this.upstream.close(); } catch { /* ignore */ }
      this.upstream = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
