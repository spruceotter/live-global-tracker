import type { LayerManifest } from '../../core/types';

/**
 * Lightning layer manifest. Push-based — data flows over a WebSocket instead
 * of the usual poll cycle. The manifest marks refresh as 'one-shot' so the
 * layer manager doesn't start a polling timer; the LightningLayer's own
 * WebSocketTransport is the source of truth for freshness.
 */
export const lightningManifest: LayerManifest = {
  id: 'lightning',
  name: 'Lightning',
  category: 'hazards',
  icon: 'bolt',
  description: 'Real-time strike detections from the Blitzortung.org community network',

  source: {
    url: '/ws/lightning',
    format: 'json',
    proxied: true,
    auth: { kind: 'none' },
  },

  rendering: {
    strategy: 'entity',
    maxEntities: 500,
    style: {
      attribute: 'category',
      stops: [{ value: 'strike', color: '#fde047', size: 6 }],
      defaultColor: '#fde047',
      defaultSize: 6,
    },
    lod: {},
  },

  refresh: { kind: 'one-shot' },
  cache: { ttlMs: 0, staleWhileRevalidate: false },

  interaction: {
    detailFields: [
      { label: 'Time', path: 'properties.time', format: 'date' },
      { label: 'Latitude', path: 'lat', format: 'latlon' },
      { label: 'Longitude', path: 'lon', format: 'latlon' },
    ],
  },

  requiredKeys: [],
  defaultEnabled: false,
  order: 8,
};
