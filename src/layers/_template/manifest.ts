import type { LayerManifest } from '../../core/types';

/**
 * TEMPLATE: Copy this directory to src/layers/yourdata/
 * and fill in the fields below.
 */
export const templateManifest: LayerManifest = {
  id: 'template',
  name: 'Template',
  category: 'environment',
  icon: 'quake',
  description: 'Template layer -- copy and modify',

  source: {
    url: 'https://api.example.com/data.json',
    format: 'json',
    proxied: false,
    auth: { kind: 'none' },
  },

  rendering: {
    strategy: 'point-cloud',
    maxEntities: 10_000,
    style: {
      attribute: 'category',
      stops: [
        { value: 'high', color: '#ef4444', size: 5 },
        { value: 'medium', color: '#f97316', size: 4 },
        { value: 'low', color: '#22d3ee', size: 3 },
      ],
      defaultColor: '#60a5fa',
      defaultSize: 3,
    },
    lod: {},
  },

  refresh: { kind: 'poll', intervalMs: 60_000 },
  cache: { ttlMs: 60_000, staleWhileRevalidate: true },

  interaction: {
    detailFields: [
      { label: 'Name', path: 'label', format: 'text' },
      { label: 'Value', path: 'properties.value', format: 'number' },
    ],
  },

  requiredKeys: [],
  defaultEnabled: false,
  order: 99,
};
