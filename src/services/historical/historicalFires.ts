import { unavailableFact, type ContextFact, type HistoricalQuery } from './types';

/**
 * Active fires within ~100km of (lat, lon) on the photo date.
 * FIRMS area/csv NRT endpoint covers 0-90 days; older photos return
 * "unavailable" since the archive dataset needs a separate pipeline.
 */

const FIRMS_KEY = import.meta.env.VITE_FIRMS_API_KEY as string | undefined;
const NRT_WINDOW_MS = 90 * 86_400_000;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getHistoricalFires(q: HistoricalQuery): Promise<ContextFact> {
  if (!FIRMS_KEY) {
    return unavailableFact('fires', 'NASA FIRMS', 'missing VITE_FIRMS_API_KEY');
  }
  const ageMs = Date.now() - q.time.getTime();
  if (ageMs > NRT_WINDOW_MS) {
    return unavailableFact('fires', 'NASA FIRMS', 'archive (>90d) not wired');
  }
  if (ageMs < 0) {
    return unavailableFact('fires', 'NASA FIRMS', 'future date');
  }

  // ~100km bbox. Longitude scaling by latitude keeps the box closer to square.
  const dLat = 0.9;
  const dLon = 0.9 / Math.max(Math.cos((q.lat * Math.PI) / 180), 0.2);
  const west = q.lon - dLon;
  const east = q.lon + dLon;
  const south = q.lat - dLat;
  const north = q.lat + dLat;
  const date = isoDate(q.time);

  // FIRMS expects bbox as west,south,east,north
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_KEY}/VIIRS_SNPP_NRT/${west.toFixed(3)},${south.toFixed(3)},${east.toFixed(3)},${north.toFixed(3)}/1/${date}`;

  let resp: Response;
  try {
    resp = await fetch(url);
  } catch (err) {
    return unavailableFact('fires', 'NASA FIRMS', (err as Error).message);
  }
  if (!resp.ok) return unavailableFact('fires', 'NASA FIRMS', `HTTP ${resp.status}`);

  const csv = await resp.text();
  const lines = csv.trim().split(/\r?\n/);
  // Header + 0 rows = no fires; header starts with "latitude,longitude,..."
  if (lines.length <= 1) {
    return {
      kind: 'fires',
      headline: 'No active fires nearby',
      detail: 'No hotspots within ~100km that day',
      sourceLabel: 'NASA FIRMS',
      available: true,
    };
  }
  const hotspotCount = lines.length - 1;
  return {
    kind: 'fires',
    headline: `${hotspotCount} active fire hotspot${hotspotCount === 1 ? '' : 's'}`,
    detail: `Within ~100km of you that day`,
    sourceLabel: 'NASA FIRMS',
    available: true,
  };
}
