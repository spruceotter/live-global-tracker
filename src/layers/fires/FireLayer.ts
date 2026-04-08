import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { fireManifest } from './manifest';
import { PointCloudRenderer } from '../../rendering/renderers/PointCloudRenderer';
import { parseCsv } from '../../pipeline/parsers/CsvParser';
import { config } from '../../config';

export class FireLayer extends LayerBase {
  readonly manifest = fireManifest;
  private renderer!: PointCloudRenderer;

  protected setupRenderer(): void {
    this.renderer = new PointCloudRenderer(this.viewer);
  }

  protected async fetchData(): Promise<unknown> {
    const apiKey = config.firmsApiKey;
    if (!apiKey) throw new Error('NASA FIRMS API key required');

    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/world/1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`FIRMS: ${response.status}`);
    return response.text();
  }

  protected normalize(raw: unknown): NormalizedFeature[] {
    const text = raw as string;
    const records = parseCsv(text);

    const features: NormalizedFeature[] = [];
    for (const rec of records) {
      if (features.length >= config.maxFires) break;

      const lat = parseFloat(rec.latitude);
      const lon = parseFloat(rec.longitude);
      if (isNaN(lat) || isNaN(lon)) continue;

      const frp = parseFloat(rec.frp) || 0;
      const category = frp > 100 ? 'high' : frp > 30 ? 'medium' : 'low';

      features.push({
        id: `fire-${lat}-${lon}-${rec.acq_date}`,
        lat,
        lon,
        category,
        label: `Fire at ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        properties: {
          frp,
          brightness: parseFloat(rec.bright_ti4) || 0,
          confidence: rec.confidence ?? 'unknown',
          acqDateTime: `${rec.acq_date} ${rec.acq_time}`,
          satellite: rec.satellite ?? 'N/A',
        },
      });
    }

    return features;
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
}
