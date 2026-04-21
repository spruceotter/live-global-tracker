/**
 * CelesTrak SATCAT (Satellite Catalog) metadata loader.
 *
 * Enriches satellite TLE records with ownership, launch date, and operational
 * status so the detail card shows "Starlink-1547 — SpaceX (US), launched
 * 2019-11-11, operational" instead of "NORAD 44737 — 550 km".
 *
 * Source: https://celestrak.org/pub/satcat.csv (proxied at /api/celestrak/satcat)
 * Refreshed once per day by the server proxy; loaded once per client session.
 */

export interface SatcatRecord {
  noradId: string;
  objectName: string;
  objectType: string;     // PAYLOAD, R/B (rocket body), DEB (debris), UNKNOWN
  opsStatus: string;      // + - P B S X D ?  (see SATCAT_OPS_STATUS)
  owner: string;          // ISO-ish source code (US, CIS, PRC, etc.)
  launchDate: string;     // YYYY-MM-DD (blank if unknown)
  launchSite: string;
  decayDate: string;      // YYYY-MM-DD or blank
}

/** Map from raw SATCAT OWNER code to human-readable country/operator name. */
const OWNER_NAMES: Record<string, string> = {
  AB: 'UAE',
  ARGN: 'Argentina',
  ASRA: 'Austria',
  AUS: 'Australia',
  BEL: 'Belgium',
  BELA: 'Belarus',
  BGD: 'Bangladesh',
  BOL: 'Bolivia',
  BRAZ: 'Brazil',
  BUL: 'Bulgaria',
  CA: 'Canada',
  CHBZ: 'China/Brazil',
  CHLE: 'Chile',
  CIS: 'Russia',
  COL: 'Colombia',
  CZCH: 'Czech Republic',
  DEN: 'Denmark',
  ECU: 'Ecuador',
  EGYP: 'Egypt',
  ESA: 'ESA',
  ESRO: 'ESRO',
  EST: 'Estonia',
  EUME: 'EUMETSAT',
  EUTE: 'EUTELSAT',
  FGER: 'France/Germany',
  FIN: 'Finland',
  FR: 'France',
  FRIT: 'France/Italy',
  GER: 'Germany',
  GHA: 'Ghana',
  GLOB: 'Globalstar',
  GREC: 'Greece',
  HUN: 'Hungary',
  IM: 'INMARSAT',
  IND: 'India',
  INDO: 'Indonesia',
  IRAN: 'Iran',
  IRAQ: 'Iraq',
  IRID: 'Iridium',
  ISRA: 'Israel',
  ISS: 'ISS',
  IT: 'Italy',
  ITSO: 'INTELSAT',
  JPN: 'Japan',
  KAZ: 'Kazakhstan',
  LAOS: 'Laos',
  LTU: 'Lithuania',
  LUXE: 'Luxembourg',
  MALA: 'Malaysia',
  MEX: 'Mexico',
  NATO: 'NATO',
  NETH: 'Netherlands',
  NICO: 'Nicaragua',
  NIG: 'Nigeria',
  NKOR: 'North Korea',
  NOR: 'Norway',
  NZ: 'New Zealand',
  O3B: 'O3b Networks',
  ORB: 'ORBCOMM',
  PAKI: 'Pakistan',
  PERU: 'Peru',
  POL: 'Poland',
  POR: 'Portugal',
  PRC: 'China',
  PRES: 'Taiwan',
  RASC: 'RascomStar',
  ROC: 'Taiwan',
  ROM: 'Romania',
  RP: 'Philippines',
  SAFR: 'South Africa',
  SAUD: 'Saudi Arabia',
  SEAL: 'Sea Launch',
  SES: 'SES',
  SING: 'Singapore',
  SKOR: 'South Korea',
  SPN: 'Spain',
  STCT: 'Singapore/Taiwan',
  SVN: 'Slovenia',
  SWED: 'Sweden',
  SWTZ: 'Switzerland',
  TBD: 'Unknown',
  THAI: 'Thailand',
  TMMC: 'Turkmenistan/Monaco',
  TURK: 'Turkey',
  UK: 'United Kingdom',
  UKR: 'Ukraine',
  UNK: 'Unknown',
  US: 'United States',
  USBZ: 'US/Brazil',
  VENZ: 'Venezuela',
  VTNM: 'Vietnam',
};

const OPS_STATUS_LABELS: Record<string, string> = {
  '+': 'Operational',
  '-': 'Nonoperational',
  P: 'Partially operational',
  B: 'Backup/standby',
  S: 'Spare',
  X: 'Extended mission',
  D: 'Decayed',
  '?': 'Unknown status',
};

/** Infer a human-readable purpose from name patterns + catalog fields. */
export function inferPurpose(rec: SatcatRecord): string {
  const name = rec.objectName.toUpperCase();
  if (rec.objectType === 'R/B') return 'Rocket body';
  if (rec.objectType === 'DEB') return 'Debris';
  if (name.includes('ISS') || name.includes('ZARYA')) return 'Crewed space station';
  if (name.includes('TIANGONG') || name.includes('CSS')) return 'Crewed space station';
  if (name.includes('STARLINK')) return 'Internet broadband';
  if (name.startsWith('ONEWEB')) return 'Internet broadband';
  if (name.startsWith('IRIDIUM')) return 'Mobile communications';
  if (name.startsWith('GLOBALSTAR')) return 'Mobile communications';
  if (name.includes('NAVSTAR') || name.includes('GPS BIIR') || name.includes('GPS BIIF')) {
    return 'GPS navigation';
  }
  if (name.startsWith('GLONASS')) return 'GLONASS navigation';
  if (name.startsWith('GALILEO')) return 'Galileo navigation';
  if (name.startsWith('BEIDOU')) return 'BeiDou navigation';
  if (name.includes('NOAA') || name.includes('GOES') || name.includes('METEOSAT') || name.includes('METEOR') || name.includes('HIMAWARI') || name.includes('GEOS')) {
    return 'Weather observation';
  }
  if (name.includes('LANDSAT') || name.includes('SENTINEL') || name.includes('WORLDVIEW') || name.includes('PLANET') || name.includes('FLOCK')) {
    return 'Earth observation';
  }
  if (name.startsWith('COSMOS') || name.startsWith('USA ')) return 'Military/classified';
  if (name.includes('INTELSAT') || name.includes('EUTELSAT') || name.includes('ECHOSTAR') || name.includes('DIRECTV') || name.includes('ASTRA')) {
    return 'Broadcast communications';
  }
  if (name.includes('TDRS') || name.includes('TDRSS')) return 'Data relay';
  if (name.includes('HUBBLE') || name.includes('CHANDRA') || name.includes('FERMI') || name.includes('SWIFT') || name.includes('TESS')) {
    return 'Astronomy';
  }
  return 'General payload';
}

export function ownerLabel(ownerCode: string): string {
  return OWNER_NAMES[ownerCode.trim().toUpperCase()] || ownerCode.trim() || 'Unknown';
}

export function opsStatusLabel(code: string): string {
  return OPS_STATUS_LABELS[code.trim()] || 'Unknown status';
}

/** Parse a single CSV row respecting quoted fields. */
function parseCsvRow(row: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inQuote) {
      if (ch === '"' && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Parse SATCAT CSV into a map keyed by NORAD ID (as string, no padding).
 * Defensive — skips malformed rows rather than throwing.
 */
export function parseSatcat(csv: string): Map<string, SatcatRecord> {
  const map = new Map<string, SatcatRecord>();
  const lines = csv.split(/\r?\n/);
  if (lines.length < 2) return map;

  const header = parseCsvRow(lines[0]);
  const idx = {
    name: header.indexOf('OBJECT_NAME'),
    objectId: header.indexOf('OBJECT_ID'),
    norad: header.indexOf('NORAD_CAT_ID'),
    type: header.indexOf('OBJECT_TYPE'),
    ops: header.indexOf('OPS_STATUS_CODE'),
    owner: header.indexOf('OWNER'),
    launch: header.indexOf('LAUNCH_DATE'),
    launchSite: header.indexOf('LAUNCH_SITE'),
    decay: header.indexOf('DECAY_DATE'),
  };
  if (idx.norad < 0 || idx.name < 0) return map;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = parseCsvRow(line);
    const noradRaw = cols[idx.norad]?.trim();
    if (!noradRaw) continue;
    // Normalize NORAD ID: strip leading zeros to match TLE parsing output
    const norad = String(parseInt(noradRaw, 10));
    if (!Number.isFinite(parseInt(norad, 10))) continue;
    map.set(norad, {
      noradId: norad,
      objectName: cols[idx.name]?.trim() ?? '',
      objectType: cols[idx.type]?.trim() ?? 'UNKNOWN',
      opsStatus: cols[idx.ops]?.trim() ?? '?',
      owner: cols[idx.owner]?.trim() ?? 'UNK',
      launchDate: cols[idx.launch]?.trim() ?? '',
      launchSite: cols[idx.launchSite]?.trim() ?? '',
      decayDate: cols[idx.decay]?.trim() ?? '',
    });
  }
  return map;
}

let cachedSatcat: Map<string, SatcatRecord> | null = null;
let inflightFetch: Promise<Map<string, SatcatRecord>> | null = null;

/**
 * Load SATCAT once per session. Returns the shared Map.
 * Subsequent callers receive the same promise during the first fetch.
 * On fetch failure, returns an empty map (layer degrades gracefully).
 */
export async function loadSatcat(): Promise<Map<string, SatcatRecord>> {
  if (cachedSatcat) return cachedSatcat;
  if (inflightFetch) return inflightFetch;

  inflightFetch = (async () => {
    try {
      const resp = await fetch('/api/celestrak/satcat');
      if (!resp.ok) throw new Error(`SATCAT HTTP ${resp.status}`);
      const csv = await resp.text();
      const map = parseSatcat(csv);
      cachedSatcat = map;
      return map;
    } catch (err) {
      console.warn('[satcat] load failed, satellite detail cards will show basic info only:', err);
      cachedSatcat = new Map();
      return cachedSatcat;
    } finally {
      inflightFetch = null;
    }
  })();
  return inflightFetch;
}

/** Canonical derived fields for display. Call with a SatcatRecord or undefined. */
export function describeSatcat(rec: SatcatRecord | undefined): {
  country: string;
  purpose: string;
  status: string;
  launchDate: string;
} {
  if (!rec) {
    return { country: 'Unknown', purpose: 'Unknown', status: 'Unknown', launchDate: '' };
  }
  return {
    country: ownerLabel(rec.owner),
    purpose: inferPurpose(rec),
    status: opsStatusLabel(rec.opsStatus),
    launchDate: rec.launchDate,
  };
}

/** Synchronous accessor for the cached SATCAT map. Returns undefined before loadSatcat() resolves. */
export function getSatcatRecord(noradId: string): SatcatRecord | undefined {
  return cachedSatcat?.get(String(parseInt(noradId, 10)));
}

/**
 * Coarse country bucket for styling. Collapses 80+ SATCAT owner codes into a
 * handful of buckets that get distinct colors. Unknown/rare owners fall into
 * "other" so the palette stays readable.
 */
export type CountryBucket = 'us' | 'china' | 'russia' | 'europe' | 'japan' | 'india' | 'commercial' | 'other';

export function countryBucket(ownerCode: string): CountryBucket {
  const code = ownerCode.trim().toUpperCase();
  if (code === 'US' || code === 'USBZ') return 'us';
  if (code === 'PRC' || code === 'CHBZ') return 'china';
  if (code === 'CIS' || code === 'UKR' || code === 'BELA' || code === 'KAZ') return 'russia';
  if (['ESA', 'EUME', 'EUTE', 'FR', 'GER', 'UK', 'IT', 'SPN', 'NETH', 'BEL', 'SWED', 'NOR', 'FIN', 'DEN', 'SWTZ', 'POL', 'CZCH', 'GREC', 'POR', 'LUXE', 'ESRO', 'HUN', 'ROM', 'EST', 'LTU', 'SVN', 'FGER', 'FRIT'].includes(code)) {
    return 'europe';
  }
  if (code === 'JPN') return 'japan';
  if (code === 'IND') return 'india';
  if (['IRID', 'GLOB', 'ORB', 'ITSO', 'IM', 'O3B', 'SES', 'RASC', 'SEAL'].includes(code)) return 'commercial';
  return 'other';
}
