import type { LayerManifest } from '../../core/types';

export const nightLightsManifest: LayerManifest = {
  id: 'nightlights',
  name: 'Night Lights',
  category: 'environment',
  icon: 'nightlights',
  description: 'NASA Black Marble VIIRS nighttime lights — civilization mapped in luminance',

  source: {
    url: '',
    format: 'tiles',
    proxied: false,
    auth: { kind: 'none' },
  },

  rendering: {
    strategy: 'imagery',
    maxEntities: 0,
    style: {
      attribute: '',
      stops: [],
      defaultColor: '#fbbf24',
      defaultSize: 0,
    },
    lod: {},
  },

  refresh: { kind: 'one-shot' },
  cache: { ttlMs: 86_400_000, staleWhileRevalidate: false },

  interaction: { detailFields: [] },

  requiredKeys: [],
  defaultEnabled: false,
  order: 6,
};
