import type { CatalogEntry } from './DataSourceStore';
import { satelliteManifest } from '../layers/satellites/manifest';
import { aircraftManifest } from '../layers/aircraft/manifest';
import { earthquakeManifest } from '../layers/earthquakes/manifest';
import { fireManifest } from '../layers/fires/manifest';
import { weatherManifest } from '../layers/weather/manifest';
import { nightLightsManifest } from '../layers/nightlights/manifest';
import { volcanoManifest } from '../layers/volcanoes/manifest';
import { weatherAlertsManifest } from '../layers/weatheralerts/manifest';
import { gdacsManifest } from '../layers/gdacs/manifest';

export const BUILT_IN_CATALOG: CatalogEntry[] = [
  {
    manifest: satelliteManifest,
    origin: 'built-in',
    isFree: true,
    updateFrequencyLabel: 'Real-time (2s propagation)',
    dataFormatLabel: 'TLE text',
    requiresKey: false,
    keyUrl: '',
    keyLabel: '',
  },
  {
    manifest: aircraftManifest,
    origin: 'built-in',
    isFree: true,
    updateFrequencyLabel: 'Every 12 seconds',
    dataFormatLabel: 'JSON API',
    requiresKey: false,
    keyUrl: '',
    keyLabel: '',
  },
  {
    manifest: earthquakeManifest,
    origin: 'built-in',
    isFree: true,
    updateFrequencyLabel: 'Every 60 seconds',
    dataFormatLabel: 'GeoJSON',
    requiresKey: false,
    keyUrl: '',
    keyLabel: '',
  },
  {
    manifest: fireManifest,
    origin: 'built-in',
    isFree: true,
    updateFrequencyLabel: 'Every 10 minutes',
    dataFormatLabel: 'CSV',
    requiresKey: true,
    keyUrl: 'https://firms.modaps.eosdis.nasa.gov/api/area/',
    keyLabel: 'NASA FIRMS Key',
  },
  {
    manifest: weatherManifest,
    origin: 'built-in',
    isFree: true,
    updateFrequencyLabel: 'Tile auto-refresh',
    dataFormatLabel: 'Tile imagery',
    requiresKey: true,
    keyUrl: 'https://home.openweathermap.org/users/sign_up',
    keyLabel: 'OpenWeatherMap Key',
  },
  {
    manifest: nightLightsManifest,
    origin: 'built-in',
    isFree: true,
    updateFrequencyLabel: 'Annual composite',
    dataFormatLabel: 'WMTS tiles',
    requiresKey: false,
    keyUrl: '',
    keyLabel: '',
  },
  {
    manifest: volcanoManifest,
    origin: 'built-in',
    isFree: true,
    updateFrequencyLabel: 'Weekly',
    dataFormatLabel: 'JSON API',
    requiresKey: false,
    keyUrl: '',
    keyLabel: '',
  },
  {
    manifest: weatherAlertsManifest,
    origin: 'built-in',
    isFree: true,
    updateFrequencyLabel: 'Every 5 minutes',
    dataFormatLabel: 'GeoJSON',
    requiresKey: false,
    keyUrl: '',
    keyLabel: '',
  },
  {
    manifest: gdacsManifest,
    origin: 'built-in',
    isFree: true,
    updateFrequencyLabel: 'Every 10 minutes',
    dataFormatLabel: 'GeoJSON',
    requiresKey: false,
    keyUrl: '',
    keyLabel: '',
  },
];
