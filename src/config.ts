export const config = {
  cesiumIonToken: import.meta.env.VITE_CESIUM_ION_TOKEN ?? '',
  owmApiKey: import.meta.env.VITE_OWM_API_KEY ?? '',
  firmsApiKey: import.meta.env.VITE_FIRMS_API_KEY ?? '',
  windyApiKey: import.meta.env.VITE_WINDY_API_KEY ?? '',

  // Refresh intervals (ms)
  satelliteTleFetchMs: 7_200_000,   // 2 hours
  satellitePropagateMs: 2_000,       // 2 seconds
  aircraftRefreshMs: 12_000,         // 12 seconds
  earthquakeRefreshMs: 60_000,       // 60 seconds
  fireRefreshMs: 600_000,            // 10 minutes

  // Entity caps
  maxAircraft: 8_000,
  maxFires: 15_000,

  // Satellite groups to fetch from CelesTrak
  // 'stations' = ISS+crewed (~31), 'starlink' = SpaceX (~6000)
  // 'gps-ops' = GPS (~31), 'active' = full catalog (~8000+)
  satelliteGroups: ['stations', 'starlink', 'gps-ops'],
} as const;

export function getStoredKey(name: string): string {
  return localStorage.getItem(`lgt_key_${name}`) ?? '';
}

export function setStoredKey(name: string, value: string): void {
  localStorage.setItem(`lgt_key_${name}`, value);
}

export function getEffectiveKey(envKey: string, storageName: string): string {
  return getStoredKey(storageName) || (config as Record<string, unknown>)[envKey] as string || '';
}
