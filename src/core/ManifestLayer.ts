import { LayerBase } from './LayerBase';
import type { LayerManifest, NormalizedFeature, FeatureGeometry } from './types';
import type { IRenderer } from '../rendering/RendererRegistry';
import { createRenderer } from '../rendering/RendererRegistry';
import { parseCsv } from '../pipeline/parsers/CsvParser';

/**
 * A generic layer driven entirely by a LayerManifest.
 * No custom TypeScript class needed -- just provide a manifest.
 *
 * Usage:
 *   manager.register(new ManifestLayer(myManifest));
 */
export class ManifestLayer extends LayerBase {
  readonly manifest: LayerManifest;
  private renderer!: IRenderer;

  constructor(manifest: LayerManifest) {
    super();
    this.manifest = manifest;
  }

  protected setupRenderer(): void {
    this.renderer = createRenderer(this.manifest.rendering.strategy, this.viewer);
  }

  protected async fetchData(): Promise<unknown> {
    const url =
      typeof this.manifest.source.url === 'function'
        ? this.manifest.source.url({})
        : this.manifest.source.url;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`${this.manifest.id}: HTTP ${response.status}`);

    if (this.manifest.source.format === 'csv' || this.manifest.source.format === 'tle') {
      return response.text();
    }
    return response.json();
  }

  protected normalize(raw: unknown): NormalizedFeature[] {
    switch (this.manifest.source.format) {
      case 'geojson':
        return this.normalizeGeoJson(raw);
      case 'csv':
        return this.normalizeCsv(raw as string);
      case 'json':
        return this.normalizeJson(raw);
      default:
        return [];
    }
  }

  protected render(features: NormalizedFeature[]): void {
    this.renderer.render(features, this.manifest.rendering.style);
  }

  protected clearRenderer(): void {
    this.renderer.destroy();
  }

  protected applyVisibility(visible: boolean): void {
    this.renderer.setVisible(visible);
  }

  private normalizeGeoJson(raw: unknown): NormalizedFeature[] {
    const geojson = raw as {
      features: Array<{
        id?: string | number;
        geometry: { type: string; coordinates: unknown };
        properties: Record<string, unknown>;
      }>;
    };

    return (geojson.features ?? [])
      .slice(0, this.manifest.rendering.maxEntities)
      .map((f, i) => {
        const coords = f.geometry.coordinates;
        const gtype = f.geometry.type.toLowerCase();

        let lat = 0,
          lon = 0,
          alt: number | undefined;
        let geometry: FeatureGeometry | undefined;

        if (gtype === 'point') {
          const [lo, la, a] = coords as [number, number, number?];
          lon = lo;
          lat = la;
          alt = a;
        } else if (gtype === 'linestring') {
          const line = coords as Array<[number, number, number?]>;
          lon = line[0]?.[0] ?? 0;
          lat = line[0]?.[1] ?? 0;
          geometry = { type: 'linestring', coordinates: line };
        } else if (gtype === 'polygon') {
          const rings = coords as Array<Array<[number, number]>>;
          const ring = rings[0] ?? [];
          lon = ring.reduce((s, c) => s + c[0], 0) / (ring.length || 1);
          lat = ring.reduce((s, c) => s + c[1], 0) / (ring.length || 1);
          geometry = { type: 'polygon', coordinates: rings };
        }

        const attr = this.manifest.rendering.style.attribute;
        const category = String(f.properties[attr] ?? 'default');

        return {
          id: String(f.id ?? `${this.manifest.id}-${i}`),
          lat,
          lon,
          alt,
          category,
          label: String(
            f.properties.name ?? f.properties.title ?? f.properties.place ?? `Feature ${i}`
          ),
          properties: f.properties,
          geometry,
        };
      });
  }

  private normalizeCsv(text: string): NormalizedFeature[] {
    const records = parseCsv(text);
    return records
      .slice(0, this.manifest.rendering.maxEntities)
      .map((rec, i) => {
        const lat = parseFloat(rec.latitude ?? rec.lat ?? '0');
        const lon = parseFloat(rec.longitude ?? rec.lon ?? rec.lng ?? '0');
        if (isNaN(lat) || isNaN(lon)) return null;

        const attr = this.manifest.rendering.style.attribute;
        return {
          id: rec.id ?? `${this.manifest.id}-${i}`,
          lat,
          lon,
          category: rec[attr] ?? 'default',
          label: rec.name ?? rec.label ?? `${this.manifest.name} ${i}`,
          properties: rec,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null) as NormalizedFeature[];
  }

  private normalizeJson(raw: unknown): NormalizedFeature[] {
    // Try common JSON shapes: { data: [...] }, { results: [...] }, { features: [...] }, or raw array
    let items: unknown[];
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(raw)) {
      items = raw;
    } else if (Array.isArray(obj.data)) {
      items = obj.data;
    } else if (Array.isArray(obj.results)) {
      items = obj.results;
    } else if (Array.isArray(obj.features)) {
      items = obj.features;
    } else {
      items = [];
    }

    return items
      .slice(0, this.manifest.rendering.maxEntities)
      .map((item, i) => {
        const rec = item as Record<string, unknown>;
        const lat = Number(rec.lat ?? rec.latitude ?? 0);
        const lon = Number(rec.lon ?? rec.lng ?? rec.longitude ?? 0);
        if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) return null;

        const attr = this.manifest.rendering.style.attribute;
        return {
          id: String(rec.id ?? `${this.manifest.id}-${i}`),
          lat,
          lon,
          alt: rec.altitude ? Number(rec.altitude) : undefined,
          category: String(rec[attr] ?? 'default'),
          label: String(rec.name ?? rec.label ?? rec.title ?? `${this.manifest.name} ${i}`),
          properties: rec,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null) as NormalizedFeature[];
  }
}
