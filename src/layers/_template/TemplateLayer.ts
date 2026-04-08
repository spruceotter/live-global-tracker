import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { templateManifest } from './manifest';
import { PointCloudRenderer } from '../../rendering/renderers/PointCloudRenderer';

/**
 * TEMPLATE: Copy this file and modify fetchData() and normalize()
 * to integrate your data source.
 */
export class TemplateLayer extends LayerBase {
  readonly manifest = templateManifest;
  private renderer!: PointCloudRenderer;

  protected setupRenderer(): void {
    this.renderer = new PointCloudRenderer(this.viewer);
  }

  protected async fetchData(): Promise<unknown> {
    // Replace with your API endpoint
    const url = this.manifest.source.url as string;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Template: ${response.status}`);
    return response.json();
  }

  protected normalize(raw: unknown): NormalizedFeature[] {
    // Replace with your data mapping logic
    const data = raw as Array<Record<string, unknown>>;
    return data
      .slice(0, this.manifest.rendering.maxEntities)
      .map((item, i) => ({
        id: String(item.id ?? i),
        lat: Number(item.lat ?? item.latitude ?? 0),
        lon: Number(item.lon ?? item.longitude ?? 0),
        alt: item.altitude ? Number(item.altitude) : undefined,
        category: String(item.type ?? 'default'),
        label: String(item.name ?? `Item ${i}`),
        properties: { ...item },
      }));
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
