import * as Cesium from 'cesium';
import type { NormalizedFeature, StyleRule } from '../../core/types';
import type { IRenderer } from '../RendererRegistry';

export class PolygonRenderer implements IRenderer {
  private viewer: Cesium.Viewer;
  private dataSource: Cesium.CustomDataSource;
  private featureIds: string[] = [];

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.dataSource = new Cesium.CustomDataSource('polygons');
    viewer.dataSources.add(this.dataSource);
  }

  render(features: NormalizedFeature[], style: StyleRule): void {
    this.dataSource.entities.removeAll();
    this.featureIds = [];

    for (const f of features) {
      const geom = f.geometry;
      if (!geom || geom.type !== 'polygon') continue;

      const outerRing = geom.coordinates[0];
      if (!outerRing || outerRing.length < 3) continue;

      const positions = outerRing.map((c) =>
        Cesium.Cartesian3.fromDegrees(c[0], c[1])
      );

      const holes = geom.coordinates.slice(1).map((ring) =>
        new Cesium.PolygonHierarchy(
          ring.map((c) => Cesium.Cartesian3.fromDegrees(c[0], c[1]))
        )
      );

      const resolved = this.resolveStyle(f, style);
      const fillColor = Cesium.Color.fromCssColorString(resolved.color);
      const fillAlpha = style.visual?.line?.glowPower ?? 0.35;

      this.dataSource.entities.add({
        polygon: {
          hierarchy: holes.length > 0
            ? new Cesium.PolygonHierarchy(positions, holes)
            : new Cesium.PolygonHierarchy(positions),
          material: fillColor.withAlpha(fillAlpha),
          outline: true,
          outlineColor: fillColor.withAlpha(0.7),
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        properties: new Cesium.PropertyBag({
          layerId: 'polygon',
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
