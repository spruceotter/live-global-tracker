import type { LayerManifest } from '../../core/types';

export const fireManifest: LayerManifest = {
  id: 'fires',
  name: 'Fires',
  category: 'hazards',
  icon: 'fire',
  description: 'Active fire hotspots from NASA FIRMS VIIRS satellite data',

  source: {
    url: (cfg) =>
      `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${cfg.firmsApiKey}/VIIRS_SNPP_NRT/world/1`,
    format: 'csv',
    proxied: false,
    auth: { kind: 'api-key-query', paramName: 'key', envVar: 'VITE_FIRMS_API_KEY' },
  },

  rendering: {
    strategy: 'point-cloud',
    maxEntities: 15_000,
    style: {
      attribute: 'category',
      stops: [
        { value: 'high', color: '#ef4444', size: 5 },
        { value: 'medium', color: '#f97316', size: 4 },
        { value: 'low', color: '#fbbf24', size: 3 },
      ],
      defaultColor: '#fbbf24',
      defaultSize: 3,
    },
    lod: {},
  },

  refresh: { kind: 'poll', intervalMs: 600_000 },
  cache: { ttlMs: 600_000, staleWhileRevalidate: true },

  interaction: {
    detailFields: [
      { label: 'Latitude', path: 'lat', format: 'latlon' },
      { label: 'Longitude', path: 'lon', format: 'latlon' },
      { label: 'FRP (MW)', path: 'properties.frp', format: 'number' },
      { label: 'Brightness (K)', path: 'properties.brightness', format: 'number' },
      { label: 'Confidence', path: 'properties.confidence', format: 'text' },
      { label: 'Acquired', path: 'properties.acqDateTime', format: 'text' },
    ],
  },

  requiredKeys: ['VITE_FIRMS_API_KEY'],
  defaultEnabled: false,
  order: 4,
};
