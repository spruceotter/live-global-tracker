import * as Cesium from 'cesium';
import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature, FeatureGeometry } from '../../core/types';
import { weatherAlertsManifest } from './manifest';
import { PolygonRenderer } from '../../rendering/renderers/PolygonRenderer';

interface NWSAlert {
  id: string;
  type: string;
  geometry: { type: string; coordinates: unknown } | null;
  properties: {
    event: string;
    headline: string;
    severity: string;
    certainty: string;
    areaDesc: string;
    effective: string;
    expires: string;
  };
}

export class WeatherAlertsLayer extends LayerBase {
  readonly manifest = weatherAlertsManifest;
  private renderer!: PolygonRenderer;

  protected setupRenderer(): void {
    this.renderer = new PolygonRenderer(this.viewer, 'weatheralerts');
  }

  protected async fetchData(): Promise<unknown> {
    const response = await fetch(this.manifest.source.url as string, {
      headers: { 'User-Agent': 'LiveGlobalTracker/0.3' },
    });
    if (!response.ok) throw new Error(`NWS: ${response.status}`);
    return response.json();
  }

  protected normalize(raw: unknown): NormalizedFeature[] {
    const data = raw as { features: NWSAlert[] };
    const features: NormalizedFeature[] = [];

    for (const alert of data.features) {
      if (features.length >= this.manifest.rendering.maxEntities) break;
      if (!alert.geometry || alert.geometry.type !== 'Polygon') continue;

      const coords = alert.geometry.coordinates as Array<Array<[number, number]>>;
      const ring = coords[0];
      if (!ring || ring.length < 3) continue;

      const centLon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
      const centLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;

      const severity = alert.properties.severity?.toLowerCase() ?? '';
      let category = 'advisory';
      if (severity === 'extreme' || severity === 'severe') category = 'warning';
      else if (severity === 'moderate') category = 'watch';

      const geometry: FeatureGeometry = {
        type: 'polygon',
        coordinates: coords,
      };

      features.push({
        id: alert.id ?? `alert-${features.length}`,
        lat: centLat,
        lon: centLon,
        category,
        label: alert.properties.headline ?? alert.properties.event ?? 'Weather Alert',
        properties: {
          event: alert.properties.event,
          severity: alert.properties.severity,
          certainty: alert.properties.certainty,
          areaDesc: alert.properties.areaDesc,
          effective: alert.properties.effective,
          expires: alert.properties.expires,
        },
        geometry,
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
