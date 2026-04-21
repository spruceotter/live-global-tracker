import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { fireManifest } from './manifest';
import { PointCloudRenderer } from '../../rendering/renderers/PointCloudRenderer';
import { parseCsv } from '../../pipeline/parsers/CsvParser';
import { config } from '../../config';
import { clusterHotspots, describeClusterLocation } from './fireCluster';

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

    // Spatial clustering: tag each hotspot that belongs to a cluster with
    // complex-level metadata so the detail card can tell the user "this pixel
    // is part of a 240-hotspot fire complex near X", not just "Fire at 56.8,-122.1".
    const { clusters } = clusterHotspots(features);
    const byId = new Map<string, NormalizedFeature>(features.map((f) => [f.id, f]));
    for (const cluster of clusters) {
      const complexLabel = describeClusterLocation(cluster);
      for (const memberId of cluster.memberIds) {
        const f = byId.get(memberId);
        if (!f) continue;
        f.properties.clusterId = cluster.id;
        f.properties.clusterSize = cluster.hotspotCount;
        f.properties.clusterTotalFrp = Math.round(cluster.totalFrp);
        f.properties.clusterLabel = complexLabel;
      }
    }

    return features;
  }

  protected render(features: NormalizedFeature[]): void {
    this.renderer.render(features, this.manifest.rendering.style);
  }

  protected clearRenderer(): void {
    this.renderer?.destroy();
  }

  protected applyVisibility(visible: boolean): void {
    this.renderer?.setVisible(visible);
  }
}
