import type { LayerManifest } from '../../core/types';

/**
 * Real-time satellite cloud imagery via NASA GIBS WMTS.
 *
 * Serves GOES-East Band 13 (Clean IR) by default — covers the Americas with
 * a 15-minute tile cadence. The GoesLayer class selects the appropriate
 * satellite layer ID (GOES/Himawari/Meteosat) based on user selection.
 */
export const goesManifest: LayerManifest = {
  id: 'goes-clouds',
  name: 'Cloud imagery',
  category: 'weather',
  icon: 'cloud',
  description: 'Near-real-time infrared cloud imagery from GOES, Himawari, and Meteosat',

  source: {
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/GOES-East_ABI_Band13_Clean_Infrared',
    format: 'tiles',
    proxied: false,
    auth: { kind: 'none' },
  },

  rendering: {
    strategy: 'imagery',
    maxEntities: 0,
    style: {
      attribute: 'category',
      stops: [],
      defaultColor: '#94a3b8',
      defaultSize: 0,
    },
    lod: {},
  },

  refresh: { kind: 'poll', intervalMs: 600_000 }, // 10 min refresh cadence
  cache: { ttlMs: 600_000, staleWhileRevalidate: true },

  interaction: { detailFields: [] },

  requiredKeys: [],
  defaultEnabled: false,
  order: 9,
};
