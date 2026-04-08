export interface TleRecord {
  name: string;
  line1: string;
  line2: string;
}

export function parseTleText(raw: string): TleRecord[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  const records: TleRecord[] = [];
  for (let i = 0; i < lines.length - 2; i += 3) {
    if (lines[i + 1]?.startsWith('1 ') && lines[i + 2]?.startsWith('2 ')) {
      records.push({
        name: lines[i].trim(),
        line1: lines[i + 1],
        line2: lines[i + 2],
      });
    }
  }
  return records;
}
