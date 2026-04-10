import type { LayerManifest } from '../../core/types';

export const earthquakeManifest: LayerManifest = {
  id: 'earthquakes',
  name: 'Earthquakes',
  category: 'hazards',
  icon: 'quake',
  description: 'Real-time earthquake data from USGS',

  source: {
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    format: 'geojson',
    proxied: false,
    auth: { kind: 'none' },
  },

  rendering: {
    strategy: 'entity',
    maxEntities: 1000,
    style: {
      attribute: 'depth',
      stops: [
        { value: 0, color: '#ef4444', size: 5 },     // shallow: red
        { value: 30, color: '#f97316', size: 5 },    // mid: orange
        { value: 100, color: '#eab308', size: 5 },   // deep: yellow
      ],
      defaultColor: '#eab308',
      defaultSize: 5,
    },
    lod: {},
  },

  refresh: { kind: 'poll', intervalMs: 60_000 },
  cache: { ttlMs: 60_000, staleWhileRevalidate: true },

  interaction: {
    detailFields: [
      { label: 'Magnitude', path: 'properties.mag', format: 'number' },
      { label: 'Depth (km)', path: 'properties.depth', format: 'number' },
      { label: 'Location', path: 'label', format: 'text' },
      { label: 'Time', path: 'properties.time', format: 'date' },
      { label: 'Felt Reports', path: 'properties.felt', format: 'number' },
    ],
  },

  filters: [
    { attr: 'mag', label: 'Magnitude', type: 'range', min: 0, max: 9, step: 0.5 },
    { attr: 'depth', label: 'Depth (km)', type: 'range', min: 0, max: 700, step: 10 },
  ],

  requiredKeys: [],
  defaultEnabled: true,
  order: 3,
};
