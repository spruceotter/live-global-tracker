import { describe, it, expect } from 'vitest';
import { parseCsv } from '../src/pipeline/parsers/CsvParser';

describe('parseCsv', () => {
  it('parses standard CSV with headers', () => {
    const csv = `latitude,longitude,frp,confidence
34.05,-118.25,42.5,high
40.71,-74.01,18.3,medium`;

    const records = parseCsv(csv);
    expect(records).toHaveLength(2);
    expect(records[0].latitude).toBe('34.05');
    expect(records[0].longitude).toBe('-118.25');
    expect(records[0].frp).toBe('42.5');
    expect(records[0].confidence).toBe('high');
  });

  it('returns empty array for empty input', () => {
    expect(parseCsv('')).toHaveLength(0);
  });

  it('returns empty array for header-only input', () => {
    expect(parseCsv('a,b,c')).toHaveLength(0);
  });

  it('trims whitespace from headers and values', () => {
    const csv = ` name , value \n foo , bar `;
    const records = parseCsv(csv);
    expect(records[0].name).toBe('foo');
    expect(records[0].value).toBe('bar');
  });

  it('handles missing trailing values', () => {
    const csv = `a,b,c\n1,2`;
    const records = parseCsv(csv);
    expect(records[0].a).toBe('1');
    expect(records[0].b).toBe('2');
    expect(records[0].c).toBe('');
  });
});
