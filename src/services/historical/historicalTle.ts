import { unavailableFact, type ContextFact, type HistoricalQuery } from './types';
import { propagate, type SatRecord } from '../../layers/satellites/propagator';

/**
 * "Satellites overhead at this (lat, lon, time)" fact provider.
 *
 * Reuses the TLE records the SatelliteLayer already loaded for the live
 * display — no extra network fetch. A main.ts wiring call injects the
 * provider callback after the layer initializes.
 *
 * SGP4 propagation accuracy for current TLEs degrades outside ±14 days of
 * the TLE epoch. Per the user decision, we cap the allowed time offset at
 * 30 days in either direction and report "unavailable" beyond that so the
 * card never lies.
 */

const ELEVATION_MIN_DEG = 10;
const MAX_OFFSET_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let satRecordsProvider: (() => SatRecord[]) | null = null;

export function setSatRecordsProvider(fn: () => SatRecord[]): void {
  satRecordsProvider = fn;
}

/** Elevation angle in degrees for a satellite at (satLat, satLon, altKm) seen from (obsLat, obsLon) at sea level. */
function elevationAngleDeg(obsLat: number, obsLon: number, satLat: number, satLon: number, altKm: number): number {
  const R = 6371.0; // Earth mean radius, km
  const toRad = Math.PI / 180;
  const dφ = (satLat - obsLat) * toRad;
  const dλ = (satLon - obsLon) * toRad;
  const φ1 = obsLat * toRad;
  const φ2 = satLat * toRad;
  // Central angle between observer and sat ground track (Haversine)
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  const central = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rRatio = R / (R + altKm);
  // Elevation = atan2(cos(central) - R/(R+h), sin(central))
  const elev = Math.atan2(Math.cos(central) - rRatio, Math.sin(central));
  return (elev * 180) / Math.PI;
}

function pickHighlight(overhead: Array<{ rec: SatRecord; altKm: number; elev: number; name: string }>):
  { rec: SatRecord; altKm: number; elev: number; name: string } | null {
  if (overhead.length === 0) return null;
  // Prefer the ISS if overhead
  const iss = overhead.find((s) => /ISS|ZARYA/i.test(s.name));
  if (iss) return iss;
  // Otherwise highest elevation (closest to zenith)
  return [...overhead].sort((a, b) => b.elev - a.elev)[0];
}

export async function getSatellitesOverhead(q: HistoricalQuery): Promise<ContextFact> {
  const offsetMs = Math.abs(q.time.getTime() - Date.now());
  if (offsetMs > MAX_OFFSET_MS) {
    return unavailableFact('satellites', 'CelesTrak', 'beyond 30-day accuracy window');
  }
  const records = satRecordsProvider?.();
  if (!records || records.length === 0) {
    return unavailableFact('satellites', 'CelesTrak', 'satellite data still loading');
  }

  const overhead: Array<{ rec: SatRecord; altKm: number; elev: number; name: string }> = [];
  for (const rec of records) {
    const pos = propagate(rec, q.time);
    if (!pos) continue;
    const elev = elevationAngleDeg(q.lat, q.lon, pos.lat, pos.lon, pos.altKm);
    if (elev >= ELEVATION_MIN_DEG) {
      overhead.push({ rec, altKm: pos.altKm, elev, name: rec.name });
    }
  }

  if (overhead.length === 0) {
    return {
      kind: 'satellites',
      headline: 'No satellites directly overhead',
      detail: 'None above 10° elevation at that moment',
      sourceLabel: 'CelesTrak',
      available: true,
    };
  }

  const highlight = pickHighlight(overhead);
  const name = highlight?.name.trim() ?? 'a satellite';
  const alt = highlight ? `${Math.round(highlight.altKm)} km up` : '';
  const plural = overhead.length === 1 ? '1 satellite' : `${overhead.length} satellites`;
  return {
    kind: 'satellites',
    headline: `${plural} overhead`,
    detail: `including ${name}${alt ? `, ${alt}` : ''}`,
    sourceLabel: 'CelesTrak',
    available: true,
  };
}
