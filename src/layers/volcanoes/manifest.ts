import type { LayerManifest } from '../../core/types';

export const volcanoManifest: LayerManifest = {
  id: 'volcanoes',
  name: 'Volcanoes',
  category: 'hazards',
  icon: 'quake',
  description: 'Active and Holocene volcanoes from the Smithsonian Global Volcanism Program',

  source: {
    url: 'https://volcanoes.usgs.gov/vsc/api/volcanoApi/volcanoesGVP',
    format: 'json',
    proxied: false,
    auth: { kind: 'none' },
  },

  rendering: {
    strategy: 'point-cloud',
    maxEntities: 2000,
    style: {
      attribute: 'category',
      stops: [
        { value: 'erupting', color: '#ef4444', size: 6 },
        { value: 'elevated', color: '#f97316', size: 5 },
        { value: 'normal', color: '#94a3b8', size: 3 },
      ],
      defaultColor: '#94a3b8',
      defaultSize: 3,
    },
    lod: {},
  },

  refresh: { kind: 'one-shot' },
  cache: { ttlMs: 86_400_000, staleWhileRevalidate: true },

  interaction: {
    detailFields: [
      { label: 'Name', path: 'label', format: 'text' },
      { label: 'Country', path: 'properties.country', format: 'text' },
      { label: 'Region', path: 'properties.subregion', format: 'text' },
      { label: 'Elevation', path: 'properties.elevation_m', format: 'number' },
      { label: 'Latitude', path: 'lat', format: 'latlon' },
      { label: 'Longitude', path: 'lon', format: 'latlon' },
    ],
  },

  requiredKeys: [],
  defaultEnabled: true,
  order: 7,
};
