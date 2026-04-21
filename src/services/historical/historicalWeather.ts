import { unavailableFact, type ContextFact, type HistoricalQuery } from './types';

/**
 * Historical weather at (lat, lon, time) via Open-Meteo Archive API.
 * CORS-safe, no API key required. Backfilled from 1940 to ~5 days ago.
 */

const WEATHER_CODE_LABEL: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Freezing fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getHistoricalWeather(q: HistoricalQuery): Promise<ContextFact> {
  const date = isoDate(q.time);
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', q.lat.toFixed(4));
  url.searchParams.set('longitude', q.lon.toFixed(4));
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date', date);
  url.searchParams.set('hourly', 'temperature_2m,weathercode');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('timezone', 'UTC');

  let resp: Response;
  try {
    resp = await fetch(url.toString());
  } catch (err) {
    return unavailableFact('weather', 'Open-Meteo Historical', (err as Error).message);
  }
  if (!resp.ok) return unavailableFact('weather', 'Open-Meteo Historical', `HTTP ${resp.status}`);

  const json = (await resp.json()) as {
    hourly?: { time: string[]; temperature_2m: number[]; weathercode: number[] };
    reason?: string;
  };
  if (!json.hourly || !json.hourly.time?.length) {
    return unavailableFact('weather', 'Open-Meteo Historical', json.reason ?? 'no data');
  }

  const targetHour = q.time.getUTCHours();
  // Pick the sample closest to the target UTC hour
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < json.hourly.time.length; i++) {
    const t = new Date(json.hourly.time[i] + 'Z');
    const diff = Math.abs(t.getUTCHours() - targetHour);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  const tempC = json.hourly.temperature_2m[bestIdx];
  const code = json.hourly.weathercode[bestIdx];
  const description = WEATHER_CODE_LABEL[code] ?? 'Unknown conditions';
  const tempF = Math.round((tempC * 9) / 5 + 32);
  return {
    kind: 'weather',
    headline: `${description}, ${Math.round(tempC)}°C`,
    detail: `${tempF}°F at ${String(targetHour).padStart(2, '0')}:00 UTC`,
    sourceLabel: 'Open-Meteo Historical',
    available: true,
  };
}
