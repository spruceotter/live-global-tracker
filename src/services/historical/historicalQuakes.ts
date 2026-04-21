import { unavailableFact, type ContextFact, type HistoricalQuery } from './types';

/**
 * "Nearest earthquake within 500km in the 7 days before this photo" fact.
 * USGS fdsnws /event/1/query supports CORS, no auth, no rate limit beyond
 * the usual "be reasonable."
 */

interface UsgsFeature {
  id: string;
  properties: { mag: number; place: string; time: number };
  geometry: { coordinates: [number, number, number] };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = Math.PI / 180;
  const dφ = (lat2 - lat1) * toRad;
  const dλ = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getNearestQuake(q: HistoricalQuery): Promise<ContextFact> {
  const endTime = q.time;
  const startTime = new Date(endTime.getTime() - 7 * 86_400_000);
  const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
  url.searchParams.set('format', 'geojson');
  url.searchParams.set('latitude', String(q.lat));
  url.searchParams.set('longitude', String(q.lon));
  url.searchParams.set('maxradiuskm', '500');
  url.searchParams.set('starttime', isoDate(startTime));
  url.searchParams.set('endtime', isoDate(endTime));
  url.searchParams.set('minmagnitude', '2.5');
  url.searchParams.set('orderby', 'magnitude');
  url.searchParams.set('limit', '10');

  let resp: Response;
  try {
    resp = await fetch(url.toString());
  } catch (err) {
    return unavailableFact('quakes', 'USGS', (err as Error).message);
  }
  if (!resp.ok) return unavailableFact('quakes', 'USGS', `HTTP ${resp.status}`);

  const json = (await resp.json()) as { features: UsgsFeature[] };
  if (!json.features || json.features.length === 0) {
    return {
      kind: 'quakes',
      headline: 'No nearby quakes',
      detail: 'No M≥2.5 events within 500km in the week before',
      sourceLabel: 'USGS',
      available: true,
    };
  }

  // Rank by magnitude; pick the strongest
  const top = json.features
    .map((f) => ({
      mag: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      distanceKm: haversineKm(q.lat, q.lon, f.geometry.coordinates[1], f.geometry.coordinates[0]),
    }))
    .sort((a, b) => b.mag - a.mag)[0];

  const daysBefore = Math.max(0, Math.round((q.time.getTime() - top.time) / 86_400_000));
  const when = daysBefore === 0 ? 'that day' : daysBefore === 1 ? '1 day before' : `${daysBefore} days before`;
  return {
    kind: 'quakes',
    headline: `M${top.mag.toFixed(1)} quake ${when}`,
    detail: `${Math.round(top.distanceKm)}km away — ${top.place}`,
    sourceLabel: 'USGS',
    available: true,
  };
}
