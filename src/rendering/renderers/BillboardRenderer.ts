import * as Cesium from 'cesium';
import type { NormalizedFeature, StyleRule } from '../../core/types';
import type { IRenderer } from '../RendererRegistry';

export class BillboardRenderer implements IRenderer {
  private collection: Cesium.BillboardCollection;
  private viewer: Cesium.Viewer;
  private featureIds: string[] = [];
  private imageCache = new Map<string, string>();

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.collection = new Cesium.BillboardCollection({ scene: viewer.scene });
    viewer.scene.primitives.add(this.collection);
  }

  render(features: NormalizedFeature[], style: StyleRule): void {
    const diff = features.length - this.collection.length;
    if (diff > 0) {
      for (let i = this.collection.length; i < features.length; i++) {
        this.collection.add({
          position: Cesium.Cartesian3.ZERO,
          image: this.getArrowCanvas('#ffffff', 24),
          scale: 1,
          rotation: 0,
          alignedAxis: Cesium.Cartesian3.UNIT_Z,
          id: '',
        });
      }
    }
    if (diff < 0) {
      for (let i = this.collection.length - 1; i >= features.length; i--) {
        this.collection.remove(this.collection.get(i));
      }
    }

    this.featureIds = [];
    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      const bb = this.collection.get(i);
      bb.position = Cesium.Cartesian3.fromDegrees(f.lon, f.lat, f.alt ?? 0);

      const resolved = this.resolveStyle(f, style);
      bb.image = this.getArrowCanvas(resolved.color, resolved.size);

      // Rotation from heading property
      const heading = f.properties.heading;
      if (typeof heading === 'number' && !isNaN(heading)) {
        bb.rotation = -(heading * Math.PI) / 180; // CW degrees -> CCW radians
      }

      bb.id = f.id;
      this.featureIds.push(f.id);
    }
  }

  private getArrowCanvas(color: string, size: number): string {
    const key = `${color}-${size}`;
    const cached = this.imageCache.get(key);
    if (cached) return cached;

    const s = Math.max(16, size * 3);
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d')!;

    ctx.translate(s / 2, s / 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;

    // Arrow pointing UP (north = 0 heading)
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.4);
    ctx.lineTo(s * 0.22, s * 0.3);
    ctx.lineTo(0, s * 0.15);
    ctx.lineTo(-s * 0.22, s * 0.3);
    ctx.closePath();
    ctx.fill();

    // Subtle center highlight
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.25);
    ctx.lineTo(s * 0.08, s * 0.1);
    ctx.lineTo(-s * 0.08, s * 0.1);
    ctx.closePath();
    ctx.fill();

    const dataUrl = canvas.toDataURL();
    this.imageCache.set(key, dataUrl);
    return dataUrl;
  }

  updatePosition(index: number, lat: number, lon: number, alt: number): void {
    if (index >= 0 && index < this.collection.length) {
      this.collection.get(index).position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    }
  }

  setVisible(visible: boolean): void {
    this.collection.show = visible;
  }

  setOpacity(opacity: number): void {
    for (let i = 0; i < this.collection.length; i++) {
      this.collection.get(i).color = Cesium.Color.WHITE.withAlpha(opacity);
    }
  }

  ownsPickedObject(picked: Record<string, unknown>): { featureId: string } | null {
    if (picked.collection === this.collection) {
      const id = (picked.primitive as { id?: string })?.id;
      if (typeof id === 'string' && id) {
        return { featureId: id };
      }
    }
    return null;
  }

  getCollection(): Cesium.BillboardCollection {
    return this.collection;
  }

  destroy(): void {
    this.viewer.scene.primitives.remove(this.collection);
    this.imageCache.clear();
  }

  private resolveStyle(
    feature: NormalizedFeature,
    style: StyleRule,
  ): { color: string; size: number } {
    for (const stop of style.stops) {
      if (stop.value === feature.category) {
        return { color: stop.color, size: stop.size ?? style.defaultSize };
      }
    }
    return { color: style.defaultColor, size: style.defaultSize };
  }
}
