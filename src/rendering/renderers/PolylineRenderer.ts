import * as Cesium from 'cesium';
import type { NormalizedFeature, StyleRule } from '../../core/types';
import type { IRenderer } from '../RendererRegistry';

export class PolylineRenderer implements IRenderer {
  private viewer: Cesium.Viewer;
  private dataSource: Cesium.CustomDataSource;
  private featureIds: string[] = [];

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.dataSource = new Cesium.CustomDataSource('polylines');
    viewer.dataSources.add(this.dataSource);
  }

  render(features: NormalizedFeature[], style: StyleRule): void {
    this.dataSource.entities.removeAll();
    this.featureIds = [];

    for (const f of features) {
      const geom = f.geometry;
      if (!geom || geom.type !== 'linestring') continue;

      const positions = geom.coordinates.map((c) =>
        Cesium.Cartesian3.fromDegrees(c[0], c[1], c[2] ?? 0)
      );

      if (positions.length < 2) continue;

      const resolved = this.resolveStyle(f, style);
      const color = Cesium.Color.fromCssColorString(resolved.color);
      const useGlow = style.visual?.line?.shape === 'glow';

      this.dataSource.entities.add({
        polyline: {
          positions,
          width: style.visual?.line?.width ?? resolved.size,
          material: useGlow
            ? new Cesium.PolylineGlowMaterialProperty({
                glowPower: style.visual?.line?.glowPower ?? 0.25,
                color: color.withAlpha(0.7),
              })
            : color,
          clampToGround: false,
        },
        properties: new Cesium.PropertyBag({
          layerId: 'polyline',
          featureId: f.id,
        }),
      });

      this.featureIds.push(f.id);
    }
  }

  setVisible(visible: boolean): void {
    this.dataSource.show = visible;
  }

  ownsPickedObject(picked: Record<string, unknown>): { featureId: string } | null {
    if (picked.id && (picked.id as Cesium.Entity).entityCollection === this.dataSource.entities) {
      const entity = picked.id as Cesium.Entity;
      const fid = entity.properties?.featureId?.getValue(Cesium.JulianDate.now());
      if (typeof fid === 'string') return { featureId: fid };
    }
    return null;
  }

  destroy(): void {
    this.viewer.dataSources.remove(this.dataSource, true);
  }

  private resolveStyle(feature: NormalizedFeature, style: StyleRule): { color: string; size: number } {
    for (const stop of style.stops) {
      if (stop.value === feature.category) {
        return { color: stop.color, size: stop.size ?? style.defaultSize };
      }
    }
    return { color: style.defaultColor, size: style.defaultSize };
  }
}
