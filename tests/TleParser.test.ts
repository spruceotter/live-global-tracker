import { describe, it, expect } from 'vitest';
import { parseTleText } from '../src/pipeline/parsers/TleParser';

describe('parseTleText', () => {
  it('parses valid 3-line TLE records', () => {
    const tle = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00006786  00000+0  13195-3 0  9997
2 25544  51.6330 284.8633 0006352 287.8392  72.1903 15.48832031560951
CSS (TIANHE)
1 48274U 21035A   24001.50000000  .00023778  00000+0  26635-3 0  9994
2 48274  41.4683  26.4426 0004214 161.2756 198.8239 15.62120796282276`;

    const records = parseTleText(tle);
    expect(records).toHaveLength(2);
    expect(records[0].name).toBe('ISS (ZARYA)');
    expect(records[0].line1).toMatch(/^1 25544/);
    expect(records[0].line2).toMatch(/^2 25544/);
    expect(records[1].name).toBe('CSS (TIANHE)');
  });

  it('returns empty array for empty input', () => {
    expect(parseTleText('')).toHaveLength(0);
    expect(parseTleText('\n\n')).toHaveLength(0);
  });

  it('handles CRLF line endings', () => {
    const tle = 'ISS (ZARYA)\r\n1 25544U 98067A   24001.50000000  .00006786  00000+0  13195-3 0  9997\r\n2 25544  51.6330 284.8633 0006352 287.8392  72.1903 15.48832031560951\r\n';
    const records = parseTleText(tle);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('ISS (ZARYA)');
  });

  it('skips malformed records without line 1/2 markers', () => {
    const tle = `SOME SAT
this is not a TLE line 1
this is not a TLE line 2
VALID SAT
1 99999U 24001A   24001.50000000  .00000000  00000+0  00000+0 0  9990
2 99999  55.0000 100.0000 0001000  10.0000 350.0000  2.00000000    01`;

    const records = parseTleText(tle);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('VALID SAT');
  });

  it('trims trailing whitespace from names', () => {
    const tle = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00006786  00000+0  13195-3 0  9997
2 25544  51.6330 284.8633 0006352 287.8392  72.1903 15.48832031560951`;

    const records = parseTleText(tle);
    expect(records[0].name).toBe('ISS (ZARYA)');
  });

  it('handles CelesTrak rate-limit message gracefully', () => {
    const msg = 'GP data has not updated since your last successful\ndownload of GROUP=starlink at 2026-04-08 19:31:22 UTC.\nData is updated once every 2 hours.';
    const records = parseTleText(msg);
    expect(records).toHaveLength(0);
  });
});
