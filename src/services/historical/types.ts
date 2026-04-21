/**
 * Shared types for the historical-context services (Your Layer).
 *
 * Each provider resolves a (lat, lon, time) query into a single ContextFact
 * that the ContextRibbon UI renders as a card. Providers must not throw —
 * they should resolve to an "unavailable" fact on failure so the ribbon
 * stays intact when one source is down.
 */

export type ContextFactKind =
  | 'satellites'
  | 'quakes'
  | 'weather'
  | 'astronomy'
  | 'fires'
  | 'spaceweather';

export interface ContextFact {
  kind: ContextFactKind;
  /** One-line human-readable fact for the card face. */
  headline: string;
  /** Optional secondary detail for the card body. */
  detail?: string;
  /** Upstream data source label, for the tooltip / attribution. */
  sourceLabel: string;
  /** False when the provider couldn't resolve the query. */
  available: boolean;
}

export interface HistoricalQuery {
  lat: number;
  lon: number;
  time: Date;
}

export function unavailableFact(kind: ContextFactKind, sourceLabel: string, reason = 'unavailable'): ContextFact {
  return { kind, headline: '—', detail: reason, sourceLabel, available: false };
}
