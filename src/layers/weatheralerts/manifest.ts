import type { LayerManifest } from '../../core/types';

export const weatherAlertsManifest: LayerManifest = {
  id: 'weatheralerts',
  name: 'Weather Alerts',
  category: 'hazards',
  icon: 'storm',
  description: 'NOAA/NWS active severe weather alerts (tornado, hurricane, flood warnings)',

  source: {
    url: 'https://api.weather.gov/alerts/active?status=actual',
    format: 'geojson',
    proxied: false,
    auth: { kind: 'none' },
  },

  rendering: {
    strategy: 'polygon',
    maxEntities: 500,
    style: {
      attribute: 'category',
      stops: [
        { value: 'warning', color: '#ef4444', size: 2 },
        { value: 'watch', color: '#f97316', size: 2 },
        { value: 'advisory', color: '#fbbf24', size: 2 },
      ],
      defaultColor: '#fbbf24',
      defaultSize: 2,
    },
    lod: {},
  },

  refresh: { kind: 'poll', intervalMs: 300_000 },
  cache: { ttlMs: 300_000, staleWhileRevalidate: true },

  interaction: {
    detailFields: [
      { label: 'Event', path: 'properties.event', format: 'text' },
      { label: 'Headline', path: 'label', format: 'text' },
      { label: 'Severity', path: 'properties.severity', format: 'text' },
      { label: 'Certainty', path: 'properties.certainty', format: 'text' },
      { label: 'Areas', path: 'properties.areaDesc', format: 'text' },
      { label: 'Effective', path: 'properties.effective', format: 'text' },
      { label: 'Expires', path: 'properties.expires', format: 'text' },
    ],
  },

  requiredKeys: [],
  defaultEnabled: false,
  order: 8,
};
