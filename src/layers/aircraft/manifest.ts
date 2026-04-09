import type { LayerManifest } from '../../core/types';

export const aircraftManifest: LayerManifest = {
  id: 'aircraft',
  name: 'Aircraft',
  category: 'tracking',
  icon: 'aircraft',
  description: 'Live aircraft positions from OpenSky Network ADS-B data',

  source: {
    url: '/api/opensky',
    format: 'json',
    proxied: true,
    auth: { kind: 'none' },
  },

  rendering: {
    strategy: 'billboard',
    maxEntities: 8_000,
    style: {
      attribute: 'category',
      stops: [
        { value: 'high', color: '#60a5fa', size: 6 },
        { value: 'mid', color: '#38bdf8', size: 6 },
        { value: 'low', color: '#22d3ee', size: 6 },
      ],
      defaultColor: '#60a5fa',
      defaultSize: 6,
      visual: {
        point: {
          shape: 'directional-arrow',
          rotation: { attr: 'heading' },
        },
      },
    },
    lod: {},
  },

  refresh: { kind: 'poll', intervalMs: 12_000 },
  cache: { ttlMs: 10_000, staleWhileRevalidate: true },

  interaction: {
    detailFields: [
      { label: 'Callsign', path: 'label', format: 'text' },
      { label: 'ICAO24', path: 'id', format: 'text' },
      { label: 'Country', path: 'properties.country', format: 'text' },
      { label: 'Altitude', path: 'properties.altitude', format: 'text' },
      { label: 'Velocity', path: 'properties.velocity', format: 'text' },
      { label: 'Heading', path: 'properties.heading', format: 'number' },
      { label: 'Vertical Rate', path: 'properties.verticalRate', format: 'number' },
    ],
  },

  requiredKeys: [],
  defaultEnabled: false,
  order: 2,
};
