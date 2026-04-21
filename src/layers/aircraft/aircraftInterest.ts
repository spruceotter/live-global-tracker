/**
 * Aircraft "interestingness" scoring.
 *
 * Pitch's "flights that matter" — we tag flights that are visually or
 * narratively distinctive so the user's eye lands on the cool stuff
 * (military, long-haul cruise, anomalous climbs/descents). The score is a
 * recall-biased heuristic: false positives are fine; missing an obvious
 * cool flight is the real cost.
 *
 * Inputs are limited to what OpenSky's free state vector provides — no
 * flight-plan database, no aircraft-type registry. Tagging is best-effort.
 */

/** Common military callsign prefixes (US, UK, NATO-aligned, plus a few notables). */
const MILITARY_CALLSIGN = /^(RCH|CNV|PAT|AF\d|VV|HKY|SHELL|BISON|MAGMA|BRUSH|NIGHT|DUKE|REACH|ENVY|PLUTO|MASS|SCAR|SLAM|TWISTER|HORNET|RAVEN|OPEC|JOSA|FORTE|SPAR|CASA|BORDR|TRENT|JAKE|GRIM|RAGE|HOUND|HAWK|RAGE|REBEL)/i;
/** Patterns that strongly suggest research / government / VIP transport. */
const SPECIAL_CALLSIGN = /^(NASA|NOAA|GULF\d|JANET|LIFEGUARD|AIR ?FORCE|MARINE|NAVY|ARMY|SAM\d|EXEC1|EXEC2|VENUS|SVF\d)/i;

export type InterestReason =
  | 'military'
  | 'special'
  | 'long-haul'
  | 'rapid-climb'
  | 'rapid-descent';

export interface InterestScore {
  interesting: boolean;
  reason?: InterestReason;
  detail?: string;
}

/**
 * Score a single aircraft state.
 *
 * - callsign:      raw callsign string (may be empty)
 * - altKm:         altitude in km
 * - velocityMs:    ground speed m/s
 * - verticalRate:  m/s (positive = climbing)
 */
export function scoreAircraft(
  callsign: string,
  altKm: number,
  velocityMs: number,
  verticalRate: number | null
): InterestScore {
  const cs = callsign.trim();
  if (cs && MILITARY_CALLSIGN.test(cs)) {
    return { interesting: true, reason: 'military', detail: 'Military callsign' };
  }
  if (cs && SPECIAL_CALLSIGN.test(cs)) {
    return { interesting: true, reason: 'special', detail: 'Government / research / VIP' };
  }
  // Long-haul cruise proxy: very high altitude AND very fast → likely transcontinental
  // (commercial widebodies cruise ~11–12km at 850–950 km/h)
  if (altKm > 10.5 && velocityMs > 240) {
    return { interesting: true, reason: 'long-haul', detail: 'High-altitude high-speed cruise' };
  }
  // Anomalous vertical rate: climb >15 m/s or descent <-15 m/s flags steep maneuvers
  if (verticalRate != null && Math.abs(verticalRate) > 15) {
    const reason: InterestReason = verticalRate > 0 ? 'rapid-climb' : 'rapid-descent';
    const detail = verticalRate > 0 ? 'Steep climb' : 'Steep descent';
    return { interesting: true, reason, detail };
  }
  return { interesting: false };
}
