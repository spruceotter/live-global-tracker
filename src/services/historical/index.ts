/**
 * Historical-context facade for the "Your Layer" context ribbon.
 *
 * Fans out one (lat, lon, time) query to all six providers in parallel via
 * Promise.allSettled. A failing provider must NOT block the ribbon — it
 * returns an "unavailable" fact so the other cards still render.
 *
 * Providers are STUBS as of Sprint 1; real implementations land in Sprint 2.
 */

import type { ContextFact, ContextFactKind, HistoricalQuery } from './types';
import { unavailableFact } from './types';
import { getSatellitesOverhead } from './historicalTle';
import { getNearestQuake } from './historicalQuakes';
import { getHistoricalWeather } from './historicalWeather';
import { getAstronomy } from './astronomy';
import { getHistoricalFires } from './historicalFires';
import { getSpaceWeather } from './spaceWeather';

export type { ContextFact, ContextFactKind, HistoricalQuery } from './types';

const PROVIDER_ORDER: Array<{ kind: ContextFactKind; sourceLabel: string; fn: (q: HistoricalQuery) => Promise<ContextFact> }> = [
  { kind: 'satellites',   sourceLabel: 'CelesTrak',              fn: getSatellitesOverhead },
  { kind: 'quakes',       sourceLabel: 'USGS',                   fn: getNearestQuake },
  { kind: 'weather',      sourceLabel: 'Open-Meteo Historical',  fn: getHistoricalWeather },
  { kind: 'astronomy',    sourceLabel: 'SunCalc',                fn: getAstronomy },
  { kind: 'fires',        sourceLabel: 'NASA FIRMS',             fn: getHistoricalFires },
  { kind: 'spaceweather', sourceLabel: 'NOAA SWPC',              fn: getSpaceWeather },
];

export async function getHistoricalContext(q: HistoricalQuery): Promise<ContextFact[]> {
  const results = await Promise.allSettled(PROVIDER_ORDER.map(({ fn }) => fn(q)));
  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const { kind, sourceLabel } = PROVIDER_ORDER[i];
    return unavailableFact(kind, sourceLabel, r.reason?.message ?? 'error');
  });
}
