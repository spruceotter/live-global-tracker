import * as Cesium from 'cesium';
import type { NormalizedFeature, StyleRule } from '../../core/types';

export class PointCloudRenderer {
  private collection: Cesium.PointPrimitiveCollection;
  private viewer: Cesium.Viewer;
  private featureIds: string[] = [];

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.collection = new Cesium.PointPrimitiveCollection();
    viewer.scene.primitives.add(this.collection);
  }

  render(features: NormalizedFeature[], style: StyleRule): void {
    const diff = features.length - this.collection.length;

    // Add new points if needed
    if (diff > 0) {
      for (let i = this.collection.length; i < features.length; i++) {
        this.collection.add({
          position: Cesium.Cartesian3.ZERO,
          pixelSize: 1,
          color: Cesium.Color.WHITE,
        });
      }
    }

    // Remove excess points from end
    if (diff < 0) {
      for (let i = this.collection.length - 1; i >= features.length; i--) {
        this.collection.remove(this.collection.get(i));
      }
    }

    // Update all positions and styles
    this.featureIds = [];
    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const p = this.collection.get(i);
      p.position = Cesium.Cartesian3.fromDegrees(f.lon, f.lat, f.alt ?? 0);

      const resolved = this.resolveStyle(f, style);
      p.color = Cesium.Color.fromCssColorString(resolved.color);
      p.pixelSize = resolved.size;

      this.featureIds.push(f.id);
    }
  }

  updatePosition(index: number, lat: number, lon: number, alt: number): void {
    if (index >= 0 && index < this.collection.length) {
      this.collection.get(index).position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    }
  }

  setVisible(visible: boolean): void {
    this.collection.show = visible;
  }

  getFeatureIdAtIndex(index: number): string | undefined {
    return this.featureIds[index];
  }

  getCollection(): Cesium.PointPrimitiveCollection {
    return this.collection;
  }

  destroy(): void {
    this.viewer.scene.primitives.remove(this.collection);
  }

  private resolveStyle(
    feature: NormalizedFeature,
    style: StyleRule
  ): { color: string; size: number } {
    const attrValue = feature.category;

    for (const stop of style.stops) {
      if (stop.value === attrValue) {
        return {
          color: stop.color,
          size: stop.size ?? style.defaultSize,
        };
      }
    }

    // Numeric attribute matching
    const numericAttr = feature.properties[style.attribute];
    if (typeof numericAttr === 'number') {
      for (let i = style.stops.length - 1; i >= 0; i--) {
        const stop = style.stops[i];
        if (typeof stop.value === 'number' && numericAttr >= stop.value) {
          return {
            color: stop.color,
            size: stop.size ?? style.defaultSize,
          };
        }
      }
    }

    return { color: style.defaultColor, size: style.defaultSize };
  }
}
