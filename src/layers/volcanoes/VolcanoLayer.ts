import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { volcanoManifest } from './manifest';
import { PointCloudRenderer } from '../../rendering/renderers/PointCloudRenderer';

interface SmithsonianVolcano {
  vnum: string;
  vName: string;
  country: string;
  subregion: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  obsAbbr: string;
  webpage?: string;
}

export class VolcanoLayer extends LayerBase {
  readonly manifest = volcanoManifest;
  private renderer!: PointCloudRenderer;

  protected setupRenderer(): void {
    this.renderer = new PointCloudRenderer(this.viewer);
  }

  protected async fetchData(): Promise<unknown> {
    const response = await fetch(this.manifest.source.url as string);
    if (!response.ok) throw new Error(`Smithsonian GVP: ${response.status}`);
    return response.json();
  }

  protected normalize(raw: unknown): NormalizedFeature[] {
    const volcanoes = raw as SmithsonianVolcano[];
    return volcanoes
      .filter((v) => v.latitude && v.longitude)
      .slice(0, this.manifest.rendering.maxEntities)
      .map((v) => ({
        id: v.vnum,
        lat: v.latitude,
        lon: v.longitude,
        alt: v.elevation_m > 0 ? v.elevation_m : undefined,
        category: 'normal', // GVP doesn't give live eruption status in this endpoint
        label: v.vName,
        properties: {
          country: v.country,
          subregion: v.subregion,
          elevation_m: v.elevation_m,
          observatory: v.obsAbbr,
          webpage: v.webpage,
        },
      }));
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
