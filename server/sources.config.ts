export interface SourceProxyConfig {
  route: string;
  upstream: string | ((params: Record<string, string>) => string);
  contentType: 'json' | 'text';
  cacheTtlMs: number;
  /** Optional validator: return true if the response is valid and should be cached */
  validate?: (data: unknown) => boolean;
}

function isValidTle(data: unknown): boolean {
  if (typeof data !== 'string') return false;
  // Valid TLE data contains lines starting with "1 " and "2 "
  return data.includes('\n1 ') && data.includes('\n2 ');
}

function isValidSatcat(data: unknown): boolean {
  if (typeof data !== 'string') return false;
  // SATCAT header row starts with OBJECT_NAME
  return data.startsWith('OBJECT_NAME,') && data.length > 1000;
}

export const sources: SourceProxyConfig[] = [
  {
    route: 'opensky',
    upstream: 'https://opensky-network.org/api/states/all',
    contentType: 'json',
    cacheTtlMs: 10_000,
  },
  // NOTE: celestrak/satcat must come BEFORE celestrak/:group — Express matches routes
  // in registration order and a :group param would otherwise swallow "satcat".
  {
    route: 'celestrak/satcat',
    upstream: 'https://celestrak.org/pub/satcat.csv',
    contentType: 'text',
    cacheTtlMs: 86_400_000, // 24h — SATCAT changes slowly
    validate: isValidSatcat,
  },
  {
    route: 'celestrak/:group',
    upstream: (params) =>
      `https://celestrak.org/NORAD/elements/gp.php?GROUP=${params.group}&FORMAT=tle`,
    contentType: 'text',
    cacheTtlMs: 7_200_000,
    validate: isValidTle,
  },
];
