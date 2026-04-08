import type { LayerManifest } from '../../core/types';

export const satelliteManifest: LayerManifest = {
  id: 'satellites',
  name: 'Satellites',
  category: 'tracking',
  icon: 'sat',
  description: 'Live satellite positions from CelesTrak TLE data, propagated with SGP4',

  source: {
    url: '/api/celestrak/stations',
    format: 'tle',
    proxied: true,
    auth: { kind: 'none' },
  },

  rendering: {
    strategy: 'point-cloud',
    maxEntities: 25_000,
    style: {
      attribute: 'category',
      stops: [
        { value: 'iss', color: '#fbbf24', size: 8 },
        { value: 'starlink', color: '#c4b5fd', size: 2 },
        { value: 'gps', color: '#34d399', size: 3 },
        { value: 'weather', color: '#38bdf8', size: 3 },
        { value: 'other', color: '#a78bfa', size: 2 },
      ],
      defaultColor: '#a78bfa',
      defaultSize: 2,
    },
    lod: {},
  },

  refresh: { kind: 'poll', intervalMs: 7_200_000 },
  cache: { ttlMs: 7_200_000, staleWhileRevalidate: true },

  interaction: {
    detailFields: [
      { label: 'Name', path: 'label', format: 'text' },
      { label: 'NORAD ID', path: 'properties.noradId', format: 'text' },
      { label: 'Altitude (km)', path: 'properties.altKm', format: 'number' },
      { label: 'Latitude', path: 'lat', format: 'latlon' },
      { label: 'Longitude', path: 'lon', format: 'latlon' },
      { label: 'Velocity (km/s)', path: 'properties.velocityKmS', format: 'number' },
      { label: 'Group', path: 'properties.group', format: 'text' },
    ],
  },

  requiredKeys: [],
  defaultEnabled: true,
  order: 1,
};
