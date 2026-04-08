interface CacheEntry {
  data: unknown;
  expiresAt: number;
  setAt: number;
}

export class CacheManager {
  private store = new Map<string, CacheEntry>();

  get(key: string): unknown | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) return null;
    return entry.data;
  }

  getStale(key: string): unknown | null {
    return this.store.get(key)?.data ?? null;
  }

  set(key: string, data: unknown, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      setAt: Date.now(),
    });
  }

  startEvictionLoop(intervalMs = 60_000, maxAgeMs = 86_400_000): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (now - entry.setAt > maxAgeMs) this.store.delete(key);
      }
    }, intervalMs);
  }
}
