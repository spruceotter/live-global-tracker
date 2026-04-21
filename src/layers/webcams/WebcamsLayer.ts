import * as Cesium from 'cesium';
import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { webcamsManifest } from './manifest';
import { config } from '../../config';

/**
 * Windy Webcams layer — live public camera pins on the globe.
 *
 * We paginate Windy's API (max 250 per request) across 3 pages sorted by
 * popularity to get broad global coverage without blowing through the free
 * tier. Each pin carries the player URL so the WebcamPlayer modal can embed
 * it in an iframe on click.
 */

interface WindyLocation {
  city?: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

interface WindyPlayer {
  /** Official embeddable live-view URL. Windy designs these to be iframe-safe. */
  live?: string;
  day?: string;
  night?: string;
  month?: string;
  year?: string;
}

interface WindyCategory {
  id: string;
  name: string;
}

interface WindyWebcam {
  webcamId: number;
  status: string;
  title: string;
  viewCount: number;
  lastUpdatedOn?: string;
  categories?: WindyCategory[];
  location: WindyLocation;
  player?: WindyPlayer;
  images?: { current?: { preview?: string; thumbnail?: string } };
}

interface WindyResponse {
  total: number;
  webcams: WindyWebcam[];
}

const PAGE_SIZE = 50;    // Windy v3 caps limit at 50 per request
const MAX_PAGES = 10;    // 500 cams total — good global coverage w/o burning the 500/day quota

/** Map Windy's fine-grained categories onto our palette buckets. */
function coarsenCategory(cats: WindyCategory[] = []): string {
  const ids = cats.map((c) => c.id.toLowerCase());
  if (ids.some((i) => i.includes('volcano'))) return 'volcano';
  if (ids.some((i) => i.includes('beach') || i.includes('coast') || i.includes('sea') || i.includes('ocean') || i.includes('surf'))) return 'beach';
  if (ids.some((i) => i.includes('traffic') || i.includes('road') || i.includes('highway'))) return 'traffic';
  if (ids.some((i) => i.includes('weather') || i.includes('airport'))) return 'weather';
  if (ids.some((i) => i.includes('city') || i.includes('skyline') || i.includes('landmark') || i.includes('urban'))) return 'city';
  if (ids.some((i) => i.includes('mountain') || i.includes('ski') || i.includes('nature') || i.includes('park') || i.includes('lake') || i.includes('river') || i.includes('forest'))) return 'landscape';
  return 'other';
}

function locationLabel(loc: WindyLocation): string {
  return [loc.city, loc.region, loc.country].filter(Boolean).join(', ') || 'Unknown';
}

/**
 * Camera-icon SVG parameterized by category color. Rendered once per category
 * and cached; data URL is reused for every pin of that color so the billboard
 * atlas stays small.
 */
function cameraIconDataUrl(fillColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <circle cx="16" cy="16" r="14" fill="${fillColor}" stroke="#0a0e17" stroke-width="2"/>
    <rect x="8" y="11.5" width="16" height="10" rx="1.5" fill="#0a0e17"/>
    <rect x="12" y="9.5" width="5.5" height="2.5" rx="0.8" fill="#0a0e17"/>
    <circle cx="16" cy="16.5" r="3.2" fill="none" stroke="${fillColor}" stroke-width="1.6"/>
    <circle cx="16" cy="16.5" r="1.2" fill="${fillColor}"/>
    <circle cx="21" cy="13.5" r="0.8" fill="${fillColor}"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export class WebcamsLayer extends LayerBase {
  readonly manifest = webcamsManifest;
  private dataSource!: Cesium.CustomDataSource;
  private iconCache = new Map<string, string>();

  protected setupRenderer(): void {
    this.dataSource = new Cesium.CustomDataSource('webcams');
    this.viewer.dataSources.add(this.dataSource);
  }

  protected async fetchData(): Promise<unknown> {
    const key = config.windyApiKey;
    if (!key) {
      throw new Error('Windy API key required. Add VITE_WINDY_API_KEY to .env (get one free at https://api.windy.com/).');
    }

    // Paginate — Windy caps per-request at 250. Sort=popularity to land on
    // the most-viewed cams first, which gives globally-recognizable coverage
    // (Times Square, Eiffel Tower, volcano observatories, etc.) before we
    // run out of budget.
    const allWebcams: WindyWebcam[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * PAGE_SIZE;
      const url = new URL('https://api.windy.com/webcams/api/v3/webcams');
      url.searchParams.set('limit', String(PAGE_SIZE));
      url.searchParams.set('offset', String(offset));
      // Windy v3 accepts: categories, images, location, player, urls — any other value triggers 400
      url.searchParams.set('include', 'categories,images,location,player,urls');
      url.searchParams.set('lang', 'en');
      const resp = await fetch(url.toString(), {
        headers: { 'x-windy-api-key': key },
      });
      if (!resp.ok) {
        // 401 = bad key; 429 = over quota. Surface a useful message.
        if (resp.status === 401) throw new Error('Windy API key invalid — regenerate at https://api.windy.com/');
        if (resp.status === 429) throw new Error('Windy API quota exceeded — free tier is 500 req/day');
        throw new Error(`Windy API ${resp.status}: ${resp.statusText}`);
      }
      const json = (await resp.json()) as WindyResponse;
      if (!json.webcams?.length) break;
      allWebcams.push(...json.webcams);
      if (allWebcams.length >= json.total) break;
    }
    return { webcams: allWebcams };
  }

  protected normalize(raw: unknown): NormalizedFeature[] {
    const data = raw as { webcams: WindyWebcam[] };
    const features: NormalizedFeature[] = [];
    for (const w of data.webcams) {
      if (!w.location || typeof w.location.latitude !== 'number' || typeof w.location.longitude !== 'number') continue;
      if (w.status !== 'active') continue; // skip broken cams
      const category = coarsenCategory(w.categories);
      features.push({
        id: `webcam_${w.webcamId}`,
        lat: w.location.latitude,
        lon: w.location.longitude,
        category,
        label: w.title || `Webcam ${w.webcamId}`,
        timestamp: w.lastUpdatedOn ? Date.parse(w.lastUpdatedOn) : undefined,
        properties: {
          webcamId: w.webcamId,
          locationLabel: locationLabel(w.location),
          categoryLabel: w.categories?.map((c) => c.name).join(', ') || 'Unknown',
          viewCount: w.viewCount ?? 0,
          status: w.status ?? 'unknown',
          playerLiveUrl: w.player?.live ?? '',
          playerDayUrl: w.player?.day ?? '',
          thumbnailUrl: w.images?.current?.thumbnail ?? w.images?.current?.preview ?? '',
          lastUpdatedOn: w.lastUpdatedOn ?? '',
        },
      });
      if (features.length >= this.manifest.rendering.maxEntities) break;
    }
    return features;
  }

  protected render(features: NormalizedFeature[]): void {
    this.dataSource.entities.removeAll();
    const stops = this.manifest.rendering.style.stops;
    const hexByCategory = new Map<string, string>();
    for (const stop of stops) hexByCategory.set(String(stop.value), stop.color);
    const defaultHex = this.manifest.rendering.style.defaultColor;

    for (const f of features) {
      const hex = hexByCategory.get(f.category) ?? defaultHex;
      let icon = this.iconCache.get(hex);
      if (!icon) {
        icon = cameraIconDataUrl(hex);
        this.iconCache.set(hex, icon);
      }
      this.dataSource.entities.add({
        id: f.id,
        position: Cesium.Cartesian3.fromDegrees(f.lon, f.lat, 0),
        billboard: {
          image: icon,
          width: 24,
          height: 24,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          // No disableDepthTestDistance — we want the globe to occlude pins on
          // the far side. Without this Cesium's default depth testing kicks in
          // and hides icons on the hidden hemisphere.
        },
        properties: new Cesium.PropertyBag({
          layerId: 'webcams',
          featureId: f.id,
        }),
      });
    }
  }

  protected clearRenderer(): void {
    if (this.dataSource) this.viewer.dataSources.remove(this.dataSource, true);
  }

  protected applyVisibility(visible: boolean): void {
    if (this.dataSource) this.dataSource.show = visible;
  }
}
