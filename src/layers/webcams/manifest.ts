import type { LayerManifest } from '../../core/types';

/**
 * Live public webcams from Windy's aggregator. Each pin is a consented,
 * operator-registered cam — scenic overlooks, cities, beaches, volcanoes,
 * traffic, transportation hubs. Click a pin → embedded live player.
 *
 * Requires a free Windy API key (https://api.windy.com/). 500 req/day on
 * the free tier is plenty — we fetch once per session and cache 24h.
 */
export const webcamsManifest: LayerManifest = {
  id: 'webcams',
  name: 'Live webcams',
  category: 'infrastructure',
  icon: 'camera',
  description: 'Public live webcams from around the world. Click a pin to watch live video.',

  source: {
    // URL is built dynamically inside the layer (pagination + include params)
    url: 'https://api.windy.com/webcams/api/v3/webcams',
    format: 'json',
    proxied: false,
    auth: { kind: 'api-key-header', headerName: 'x-windy-api-key', envVar: 'VITE_WINDY_API_KEY' },
  },

  rendering: {
    strategy: 'entity',
    maxEntities: 2000,
    style: {
      attribute: 'category',
      stops: [
        { value: 'landscape', color: '#60a5fa', size: 7 },
        { value: 'city',      color: '#a78bfa', size: 7 },
        { value: 'traffic',   color: '#fbbf24', size: 6 },
        { value: 'weather',   color: '#38bdf8', size: 6 },
        { value: 'beach',     color: '#34d399', size: 7 },
        { value: 'volcano',   color: '#ef4444', size: 8 },
        { value: 'other',     color: '#c4b5fd', size: 6 },
      ],
      defaultColor: '#c4b5fd',
      defaultSize: 6,
    },
    lod: {},
  },

  refresh: { kind: 'poll', intervalMs: 86_400_000 }, // 24h — webcam locations are stable
  cache: { ttlMs: 86_400_000, staleWhileRevalidate: true },

  interaction: {
    detailFields: [
      { label: 'Name', path: 'label', format: 'text' },
      { label: 'Location', path: 'properties.locationLabel', format: 'text' },
      { label: 'Category', path: 'properties.categoryLabel', format: 'text' },
      { label: 'Views', path: 'properties.viewCount', format: 'number' },
      { label: 'Status', path: 'properties.status', format: 'text' },
    ],
  },

  requiredKeys: ['VITE_WINDY_API_KEY'],
  defaultEnabled: false,
  order: 11,
};
