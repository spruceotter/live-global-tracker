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

export const sources: SourceProxyConfig[] = [
  {
    route: 'opensky',
    upstream: 'https://opensky-network.org/api/states/all',
    contentType: 'json',
    cacheTtlMs: 10_000,
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
