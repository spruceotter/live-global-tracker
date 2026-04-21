import type { LayerManifest } from '../../core/types';

export const weatherManifest: LayerManifest = {
  id: 'weather',
  name: 'Precipitation',
  category: 'weather',
  icon: 'weather',
  description: 'OpenWeatherMap precipitation tiles. For the cloud-cover story, enable Cloud imagery instead.',

  source: {
    url: '',
    format: 'tiles',
    proxied: false,
    auth: { kind: 'api-key-query', paramName: 'appid', envVar: 'VITE_OWM_API_KEY' },
  },

  rendering: {
    strategy: 'imagery',
    maxEntities: 0,
    style: {
      attribute: '',
      stops: [],
      defaultColor: '#3b82f6',
      defaultSize: 0,
    },
    lod: {},
  },

  refresh: { kind: 'one-shot' },
  cache: { ttlMs: 600_000, staleWhileRevalidate: false },

  interaction: {
    detailFields: [],
  },

  requiredKeys: ['VITE_OWM_API_KEY'],
  defaultEnabled: false,
  order: 5,
};
