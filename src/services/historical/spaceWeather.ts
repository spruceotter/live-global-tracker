import { unavailableFact, type ContextFact, type HistoricalQuery } from './types';

/**
 * NOAA Space Weather Prediction Center planetary K-index archive.
 * Covers the last ~30 days of 3-hour Kp samples; photos older than 30 days
 * return "unavailable" (we'd need a longer archive feed otherwise).
 */

const KP_ARCHIVE_WINDOW_MS = 30 * 86_400_000;

function kpLabel(kp: number): { storm: string; visibility: string } {
  if (kp < 3) return { storm: 'Quiet', visibility: 'Aurora unlikely' };
  if (kp < 5) return { storm: 'Unsettled', visibility: 'Aurora at high latitudes' };
  if (kp < 6) return { storm: 'G1 minor storm', visibility: 'Aurora down to ~60° lat' };
  if (kp < 7) return { storm: 'G2 moderate storm', visibility: 'Aurora down to ~55° lat' };
  if (kp < 8) return { storm: 'G3 strong storm', visibility: 'Aurora down to ~50° lat' };
  if (kp < 9) return { storm: 'G4 severe storm', visibility: 'Aurora down to ~45° lat' };
  return { storm: 'G5 extreme storm', visibility: 'Aurora possibly mid-latitudes' };
}

export async function getSpaceWeather(q: HistoricalQuery): Promise<ContextFact> {
  const ageMs = Date.now() - q.time.getTime();
  if (ageMs < 0) return unavailableFact('spaceweather', 'NOAA SWPC', 'future date');
  if (ageMs > KP_ARCHIVE_WINDOW_MS) {
    return unavailableFact('spaceweather', 'NOAA SWPC', 'beyond 30-day archive window');
  }

  let resp: Response;
  try {
    resp = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
  } catch (err) {
    return unavailableFact('spaceweather', 'NOAA SWPC', (err as Error).message);
  }
  if (!resp.ok) return unavailableFact('spaceweather', 'NOAA SWPC', `HTTP ${resp.status}`);

  // NOAA SWPC moved from [[headers], [row], ...] to a plain array-of-objects
  // with keys { time_tag, Kp, a_running, station_count }. Handle both shapes
  // defensively — the rollback would break us if we only handled one.
  const raw = (await resp.json()) as unknown;
  if (!Array.isArray(raw) || raw.length === 0) {
    return unavailableFact('spaceweather', 'NOAA SWPC', 'empty response');
  }

  const samples: Array<{ ts: string; kp: number }> = [];
  if (typeof raw[0] === 'object' && raw[0] !== null && 'time_tag' in raw[0]) {
    for (const row of raw as Array<{ time_tag: string; Kp: number | string }>) {
      const kp = typeof row.Kp === 'number' ? row.Kp : parseFloat(row.Kp);
      if (!isNaN(kp)) samples.push({ ts: row.time_tag, kp });
    }
  } else {
    // Legacy: [[headers], [ts, kp, ...], ...]
    for (let i = 1; i < raw.length; i++) {
      const cols = raw[i] as unknown[];
      if (!Array.isArray(cols) || cols.length < 2) continue;
      const kp = parseFloat(String(cols[1]));
      if (!isNaN(kp)) samples.push({ ts: String(cols[0]), kp });
    }
  }

  const targetMs = q.time.getTime();
  let best: { kp: number; deltaMs: number } | null = null;
  for (const s of samples) {
    const ms = Date.parse(s.ts.replace(' ', 'T') + (s.ts.endsWith('Z') ? '' : 'Z'));
    if (isNaN(ms)) continue;
    const delta = Math.abs(ms - targetMs);
    if (!best || delta < best.deltaMs) best = { kp: s.kp, deltaMs: delta };
  }
  if (!best) return unavailableFact('spaceweather', 'NOAA SWPC', 'no matching sample');

  const { storm, visibility } = kpLabel(best.kp);
  return {
    kind: 'spaceweather',
    headline: `${storm} · Kp ${best.kp.toFixed(1)}`,
    detail: visibility,
    sourceLabel: 'NOAA SWPC',
    available: true,
  };
}
