import * as satellite from 'satellite.js';

export interface SatPosition {
  name: string;
  noradId: string;
  lat: number;
  lon: number;
  altKm: number;
  velocityKmS: number;
  group: string;
}

export interface SatRecord {
  name: string;
  satrec: satellite.SatRec;
  group: string;
}

export function createSatRecord(
  name: string,
  line1: string,
  line2: string,
  group: string
): SatRecord | null {
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    return { name, satrec, group };
  } catch {
    return null;
  }
}

export function propagate(rec: SatRecord, date: Date): SatPosition | null {
  try {
    const posVel = satellite.propagate(rec.satrec, date);
    if (
      typeof posVel.position === 'boolean' ||
      !posVel.position ||
      typeof posVel.velocity === 'boolean' ||
      !posVel.velocity
    ) {
      return null;
    }

    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(posVel.position, gmst);

    const lat = satellite.degreesLat(geo.latitude);
    const lon = satellite.degreesLong(geo.longitude);
    const altKm = geo.height;

    if (isNaN(lat) || isNaN(lon) || isNaN(altKm)) return null;

    const vel = posVel.velocity as satellite.EciVec3<number>;
    const velocityKmS = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);

    // Extract NORAD ID from satrec
    const noradId = rec.satrec.satnum;

    return { name: rec.name, noradId, lat, lon, altKm, velocityKmS, group: rec.group };
  } catch {
    return null;
  }
}

export function classifyGroup(name: string, group: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('ISS (ZARYA)') || upper === 'ISS') return 'iss';
  if (group === 'starlink' || upper.includes('STARLINK')) return 'starlink';
  if (group === 'gps-ops' || upper.includes('NAVSTAR')) return 'gps';
  if (group === 'weather') return 'weather';
  return 'other';
}
