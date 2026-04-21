import SunCalc from 'suncalc';
import type { ContextFact, HistoricalQuery } from './types';

/**
 * Sunrise / sunset / moon phase at (lat, lon, time).
 * Pure astronomical calculation — no network, no rate limits, always available.
 */

const MOON_PHASE_LABEL = (phase: number): string => {
  // SunCalc returns 0..1 where 0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter
  const p = phase;
  if (p < 0.03 || p > 0.97) return 'New moon';
  if (p < 0.22) return 'Waxing crescent';
  if (p < 0.28) return 'First quarter';
  if (p < 0.47) return 'Waxing gibbous';
  if (p < 0.53) return 'Full moon';
  if (p < 0.72) return 'Waning gibbous';
  if (p < 0.78) return 'Last quarter';
  return 'Waning crescent';
};

function fmtTime(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}

export async function getAstronomy(q: HistoricalQuery): Promise<ContextFact> {
  const times = SunCalc.getTimes(q.time, q.lat, q.lon);
  const moonIllum = SunCalc.getMoonIllumination(q.time);
  const sunPos = SunCalc.getPosition(q.time, q.lat, q.lon);
  const moonPhase = MOON_PHASE_LABEL(moonIllum.phase);
  const illumPct = Math.round(moonIllum.fraction * 100);

  const isDaytime = sunPos.altitude > 0;
  const sunlineLabel = isDaytime ? 'Sun up' : 'Sun down';
  const sunEvent = isDaytime ? times.sunset : times.sunrise;
  const eventLabel = isDaytime ? 'sunset' : 'sunrise';

  let headline: string;
  let detail: string;
  if (sunEvent && !isNaN(sunEvent.getTime())) {
    headline = `${moonPhase} (${illumPct}% lit)`;
    detail = `${sunlineLabel} · ${eventLabel} at ${fmtTime(sunEvent)}`;
  } else {
    // Polar day/night — no sunrise or sunset that date
    headline = `${moonPhase} (${illumPct}% lit)`;
    detail = `${sunlineLabel} · polar day/night`;
  }

  return {
    kind: 'astronomy',
    headline,
    detail,
    sourceLabel: 'SunCalc',
    available: true,
  };
}
