/**
 * Ephemeral user pins — the "Your Layer" marquee feature.
 *
 * A pin is a user artifact, not a data feed: it lives outside the polling
 * lifecycle of LayerBase. Pins are rendered via a dedicated CustomDataSource
 * kept alongside `viewer.dataSources`, and their metadata is persisted to
 * sessionStorage so they survive intra-session navigation. Nothing about
 * the photo itself leaves the browser — we only store the GPS + timestamp
 * that was read client-side via EXIF.
 */

import type { ContextFact } from '../services/historical/types';

export interface EphemeralPin {
  id: string;
  lat: number;
  lon: number;
  /** Photo capture time (from EXIF DateTimeOriginal). */
  timestamp: number;
  /** Original file name, sanitized for display. */
  photoName: string;
  /** Context ribbon facts, filled in async after the pin drops. */
  facts: ContextFact[] | null;
}

const STORAGE_KEY = 'yourLayer.pins.v1';

type Listener = (pins: EphemeralPin[]) => void;

export class EphemeralPinStore {
  private pins = new Map<string, EphemeralPin>();
  private listeners = new Set<Listener>();

  constructor() {
    this.loadFromStorage();
  }

  add(pin: EphemeralPin): void {
    this.pins.set(pin.id, pin);
    this.persist();
    this.emit();
  }

  update(id: string, patch: Partial<EphemeralPin>): void {
    const current = this.pins.get(id);
    if (!current) return;
    this.pins.set(id, { ...current, ...patch });
    this.persist();
    this.emit();
  }

  remove(id: string): void {
    if (this.pins.delete(id)) {
      this.persist();
      this.emit();
    }
  }

  clear(): void {
    this.pins.clear();
    sessionStorage.removeItem(STORAGE_KEY);
    this.emit();
  }

  get(id: string): EphemeralPin | undefined {
    return this.pins.get(id);
  }

  list(): EphemeralPin[] {
    return [...this.pins.values()].sort((a, b) => a.timestamp - b.timestamp);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const snapshot = this.list();
    for (const fn of this.listeners) fn(snapshot);
  }

  private persist(): void {
    try {
      // Never store facts — they're ephemeral and contain URLs/labels that would
      // grow stale. Facts are recomputed on session restore.
      const minimal = [...this.pins.values()].map(({ id, lat, lon, timestamp, photoName }) => ({
        id, lat, lon, timestamp, photoName,
      }));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      // sessionStorage may be disabled or full — non-fatal, pins still live in memory
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw) as Array<Omit<EphemeralPin, 'facts'>>;
      for (const p of arr) {
        this.pins.set(p.id, { ...p, facts: null });
      }
    } catch {
      // bad JSON or storage disabled — start fresh
    }
  }
}

export function makePinId(): string {
  // Short random id; UUID would be fine too but this avoids a dep
  return `pin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
