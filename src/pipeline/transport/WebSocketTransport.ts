/**
 * Generic push-based transport for layers that receive continuous updates
 * over a WebSocket instead of polling a REST endpoint.
 *
 * Blitzortung lightning is the only consumer today; the shape is kept small
 * so future push layers (e.g., live aircraft, GDELT events) can reuse it.
 * Reconnect backoff is exponential with jitter to stay polite to upstreams.
 */

const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export interface WebSocketTransportOptions<T> {
  url: string;
  parse: (raw: string) => T | null;
  onMessage: (msg: T) => void;
  onStatusChange?: (status: 'open' | 'closed' | 'connecting') => void;
}

export class WebSocketTransport<T> {
  private ws: WebSocket | null = null;
  private reconnectDelay = RECONNECT_MIN_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private readonly opts: WebSocketTransportOptions<T>;
  private messageCount = 0;
  private lastMessageAt = 0;

  constructor(opts: WebSocketTransportOptions<T>) {
    this.opts = opts;
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
  }

  getMessageCount(): number {
    return this.messageCount;
  }

  getLastMessageTime(): number {
    return this.lastMessageAt;
  }

  private connect(): void {
    this.opts.onStatusChange?.('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.opts.url);
    } catch (err) {
      console.warn(`[ws-transport] connect error for ${this.opts.url}:`, err);
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = RECONNECT_MIN_MS;
      this.opts.onStatusChange?.('open');
    };

    ws.onmessage = (event) => {
      const raw = typeof event.data === 'string' ? event.data : '';
      const parsed = this.opts.parse(raw);
      if (parsed !== null) {
        this.messageCount++;
        this.lastMessageAt = Date.now();
        this.opts.onMessage(parsed);
      }
    };

    ws.onerror = () => {
      // Browser WS errors carry no detail — close handler does the actual work
    };

    ws.onclose = () => {
      this.opts.onStatusChange?.('closed');
      this.ws = null;
      if (!this.stopped) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    const delay = this.reconnectDelay + Math.floor(Math.random() * 500);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.stopped) this.connect();
    }, delay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
  }
}
