import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { gdacsManifest } from './manifest';
import { PointCloudRenderer } from '../../rendering/renderers/PointCloudRenderer';

interface GdacsEvent {
  geometry: { type: string; coordinates: [number, number] };
  properties: {
    eventtype: string;
    name: string;
    description: string;
    alertlevel: string;
    alertscore: number;
    country: string;
    fromdate: string;
    todate: string;
    eventid: number;
  };
}

const EVENT_TYPES: Record<string, string> = {
  EQ: 'Earthquake',
  TC: 'Tropical Cyclone',
  FL: 'Flood',
  VO: 'Volcano',
};

export class GdacsLayer extends LayerBase {
  readonly manifest = gdacsManifest;
  private renderer!: PointCloudRenderer;

  protected setupRenderer(): void {
    this.renderer = new PointCloudRenderer(this.viewer);
  }

  protected async fetchData(): Promise<unknown> {
    // Build dynamic date range (last 30 days to today)
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const url = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL,VO&fromDate=${from}&toDate=${to}&alertlevel=Green;Orange;Red`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GDACS: ${response.status}`);
    return response.json();
  }

  protected normalize(raw: unknown): NormalizedFeature[] {
    const data = raw as { features: GdacsEvent[] };
    return (data.features ?? [])
      .slice(0, this.manifest.rendering.maxEntities)
      .map((e, i) => {
        const [lon, lat] = e.geometry.coordinates;
        const level = (e.properties.alertlevel ?? '').toLowerCase();
        const category = level === 'red' ? 'red' : level === 'orange' ? 'orange' : 'green';
        const typeLabel = EVENT_TYPES[e.properties.eventtype] ?? e.properties.eventtype;

        return {
          id: `gdacs-${e.properties.eventid ?? i}`,
          lat,
          lon,
          category,
          label: e.properties.name || `${typeLabel} - ${e.properties.country ?? 'Unknown'}`,
          properties: {
            eventtype: typeLabel,
            alertlevel: e.properties.alertlevel,
            country: e.properties.country,
            fromdate: e.properties.fromdate,
            description: e.properties.description,
          },
        };
      });
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
