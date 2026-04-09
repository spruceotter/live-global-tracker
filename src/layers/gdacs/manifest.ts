import type { LayerManifest } from '../../core/types';

export const gdacsManifest: LayerManifest = {
  id: 'gdacs',
  name: 'Global Disasters',
  category: 'hazards',
  icon: 'storm',
  description: 'UN GDACS global disaster alerts — earthquakes, cyclones, floods, volcanoes',

  source: {
    url: 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL,VO&fromDate=2026-03-01&toDate=2026-12-31&alertlevel=Green;Orange;Red',
    format: 'geojson',
    proxied: false,
    auth: { kind: 'none' },
  },

  rendering: {
    strategy: 'point-cloud',
    maxEntities: 500,
    style: {
      attribute: 'category',
      stops: [
        { value: 'red', color: '#ef4444', size: 8 },
        { value: 'orange', color: '#f97316', size: 6 },
        { value: 'green', color: '#22c55e', size: 4 },
      ],
      defaultColor: '#fbbf24',
      defaultSize: 5,
    },
    lod: {},
  },

  refresh: { kind: 'poll', intervalMs: 600_000 },
  cache: { ttlMs: 600_000, staleWhileRevalidate: true },

  interaction: {
    detailFields: [
      { label: 'Event', path: 'label', format: 'text' },
      { label: 'Type', path: 'properties.eventtype', format: 'text' },
      { label: 'Alert Level', path: 'properties.alertlevel', format: 'text' },
      { label: 'Country', path: 'properties.country', format: 'text' },
      { label: 'Date', path: 'properties.fromdate', format: 'text' },
    ],
  },

  requiredKeys: [],
  defaultEnabled: false,
  order: 9,
};
