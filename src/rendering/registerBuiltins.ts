import { registerRenderer } from './RendererRegistry';
import { PointCloudRenderer } from './renderers/PointCloudRenderer';
import { BillboardRenderer } from './renderers/BillboardRenderer';

export function registerBuiltinRenderers(): void {
  registerRenderer('point-cloud', (viewer) => new PointCloudRenderer(viewer));
  registerRenderer('billboard', (viewer) => new BillboardRenderer(viewer));
  // Future: polyline, polygon, heatmap
}
