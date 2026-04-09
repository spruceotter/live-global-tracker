import * as Cesium from 'cesium';
import type { NormalizedFeature, StyleRule } from '../../core/types';
import type { IRenderer } from '../RendererRegistry';

const HEATMAP_WIDTH = 2048;
const HEATMAP_HEIGHT = 1024;

// Default color LUT: transparent -> blue -> green -> yellow -> red
const DEFAULT_GRADIENT = [
  { stop: 0.0, color: [0, 0, 0, 0] },
  { stop: 0.2, color: [0, 0, 255, 100] },
  { stop: 0.4, color: [0, 255, 255, 150] },
  { stop: 0.6, color: [0, 255, 0, 180] },
  { stop: 0.8, color: [255, 255, 0, 210] },
  { stop: 1.0, color: [255, 0, 0, 240] },
];

export class HeatmapRenderer implements IRenderer {
  private viewer: Cesium.Viewer;
  private imageryLayer: Cesium.ImageryLayer | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gradientData: Uint8ClampedArray;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.canvas = document.createElement('canvas');
    this.canvas.width = HEATMAP_WIDTH;
    this.canvas.height = HEATMAP_HEIGHT;
    this.ctx = this.canvas.getContext('2d')!;
    this.gradientData = this.buildGradientLUT();
  }

  render(features: NormalizedFeature[], _style: StyleRule): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, HEATMAP_WIDTH, HEATMAP_HEIGHT);

    if (features.length === 0) return;

    // Draw radial gradients for each point (intensity pass)
    this.ctx.globalCompositeOperation = 'lighter';
    const radius = 12; // pixels in equirectangular space

    for (const f of features) {
      const x = ((f.lon + 180) / 360) * HEATMAP_WIDTH;
      const y = ((90 - f.lat) / 180) * HEATMAP_HEIGHT;

      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    // Apply color LUT
    this.ctx.globalCompositeOperation = 'source-over';
    const imageData = this.ctx.getImageData(0, 0, HEATMAP_WIDTH, HEATMAP_HEIGHT);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const intensity = pixels[i]; // white channel = intensity
      if (intensity === 0) continue;

      const lutIndex = Math.min(255, intensity) * 4;
      pixels[i] = this.gradientData[lutIndex];
      pixels[i + 1] = this.gradientData[lutIndex + 1];
      pixels[i + 2] = this.gradientData[lutIndex + 2];
      pixels[i + 3] = this.gradientData[lutIndex + 3];
    }

    this.ctx.putImageData(imageData, 0, 0);

    // Remove old layer
    if (this.imageryLayer) {
      this.viewer.imageryLayers.remove(this.imageryLayer, false);
    }

    // Create new imagery layer from canvas
    const provider = new Cesium.SingleTileImageryProvider({
      url: this.canvas.toDataURL(),
      rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
    });

    this.imageryLayer = this.viewer.imageryLayers.addImageryProvider(provider);
    this.imageryLayer.alpha = 0.7;
  }

  setVisible(visible: boolean): void {
    if (this.imageryLayer) this.imageryLayer.show = visible;
  }

  destroy(): void {
    if (this.imageryLayer) {
      this.viewer.imageryLayers.remove(this.imageryLayer, true);
      this.imageryLayer = null;
    }
  }

  private buildGradientLUT(): Uint8ClampedArray {
    const lut = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let r = 0, g = 0, b = 0, a = 0;

      for (let j = 0; j < DEFAULT_GRADIENT.length - 1; j++) {
        const curr = DEFAULT_GRADIENT[j];
        const next = DEFAULT_GRADIENT[j + 1];
        if (t >= curr.stop && t <= next.stop) {
          const localT = (t - curr.stop) / (next.stop - curr.stop);
          r = curr.color[0] + (next.color[0] - curr.color[0]) * localT;
          g = curr.color[1] + (next.color[1] - curr.color[1]) * localT;
          b = curr.color[2] + (next.color[2] - curr.color[2]) * localT;
          a = curr.color[3] + (next.color[3] - curr.color[3]) * localT;
          break;
        }
      }

      lut[i * 4] = r;
      lut[i * 4 + 1] = g;
      lut[i * 4 + 2] = b;
      lut[i * 4 + 3] = a;
    }
    return lut;
  }
}
