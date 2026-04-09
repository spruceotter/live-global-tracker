import { registerRenderer } from './RendererRegistry';
import { PointCloudRenderer } from './renderers/PointCloudRenderer';
import { BillboardRenderer } from './renderers/BillboardRenderer';
import { PolylineRenderer } from './renderers/PolylineRenderer';
import { PolygonRenderer } from './renderers/PolygonRenderer';
import { HeatmapRenderer } from './renderers/HeatmapRenderer';

export function registerBuiltinRenderers(): void {
  registerRenderer('point-cloud', (viewer) => new PointCloudRenderer(viewer));
  registerRenderer('billboard', (viewer) => new BillboardRenderer(viewer));
  registerRenderer('polyline', (viewer) => new PolylineRenderer(viewer));
  registerRenderer('polygon', (viewer) => new PolygonRenderer(viewer));
  registerRenderer('heatmap', (viewer) => new HeatmapRenderer(viewer));
}
