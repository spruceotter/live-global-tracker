/**
 * Day/night helpers.
 *
 * Cesium's `scene.globe.enableLighting` already gives us a smooth shaded
 * terminator on the globe itself. The primary win for the pitch is binding
 * imagery layers (NightLightsLayer) to night-only alpha. This module exposes
 * the subsolar-point calculation that drives that binding.
 *
 * Values are derived from a simple solar position model — accurate to ~1°
 * for terminator visualization, which is well inside the "looks right" band
 * even on high-resolution displays.
 */

export interface SubsolarPoint {
  /** Subsolar latitude in degrees (-23.45° to +23.45°). */
  lat: number;
  /** Subsolar longitude in degrees (-180° to +180°). */
  lon: number;
}

/**
 * Compute the subsolar point (the spot on Earth where the sun is at zenith)
 * for a given time. Uses NOAA's low-precision solar position formulas.
 */
export function subsolarPoint(time: Date = new Date()): SubsolarPoint {
  const julianDay = time.getTime() / 86_400_000 + 2440587.5;
  const n = julianDay - 2451545.0;
  // Mean solar longitude, corrected for aberration (degrees)
  const L = (280.460 + 0.9856474 * n) % 360;
  // Mean anomaly (degrees)
  const g = (357.528 + 0.9856003 * n) % 360;
  const gRad = (g * Math.PI) / 180;
  // Ecliptic longitude (degrees)
  const lambda = L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad);
  const lambdaRad = (lambda * Math.PI) / 180;
  // Obliquity of the ecliptic
  const epsilon = 23.439 - 0.0000004 * n;
  const epsRad = (epsilon * Math.PI) / 180;
  // Declination — this IS the subsolar latitude
  const declination = Math.asin(Math.sin(epsRad) * Math.sin(lambdaRad));
  const decDeg = (declination * 180) / Math.PI;
  // Equation of time (minutes) — how far the true sun is ahead/behind mean sun
  const y = Math.tan(epsRad / 2) ** 2;
  const LRad = (L * Math.PI) / 180;
  const eqTime = 4 * (180 / Math.PI) * (
    y * Math.sin(2 * LRad)
    - 2 * 0.0167 * Math.sin(gRad)
    + 4 * 0.0167 * y * Math.sin(gRad) * Math.cos(2 * LRad)
    - 0.5 * y * y * Math.sin(4 * LRad)
    - 1.25 * 0.0167 * 0.0167 * Math.sin(2 * gRad)
  );
  // UTC hours since midnight
  const utcHours = time.getUTCHours() + time.getUTCMinutes() / 60 + time.getUTCSeconds() / 3600;
  // Subsolar longitude: sun crosses 0° meridian at UTC noon minus EoT correction
  let lon = -15 * (utcHours - 12 + eqTime / 60);
  // Wrap to [-180, 180]
  lon = ((lon + 540) % 360) - 180;
  return { lat: decDeg, lon };
}

/** Is (lat, lon) currently on the sunlit side of the earth? */
export function isSunlit(lat: number, lon: number, time: Date = new Date()): boolean {
  const sub = subsolarPoint(time);
  // Angular distance from subsolar point using spherical law of cosines
  const lat1 = (sub.lat * Math.PI) / 180;
  const lat2 = (lat * Math.PI) / 180;
  const dLon = ((lon - sub.lon) * Math.PI) / 180;
  const cosDist = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return cosDist > 0; // sun is above the horizon when the angle is <90°
}
