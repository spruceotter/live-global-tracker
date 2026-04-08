import * as Cesium from 'cesium';
import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { weatherManifest } from './manifest';
import { config } from '../../config';

export class WeatherLayer extends LayerBase {
  readonly manifest = weatherManifest;
  private imageryLayer: Cesium.ImageryLayer | null = null;

  protected setupRenderer(): void {
    const apiKey = config.owmApiKey;
    if (!apiKey) {
      console.warn('[weather] No OpenWeatherMap API key — weather layer disabled');
      return;
    }

    const provider = new Cesium.UrlTemplateImageryProvider({
      url: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`,
      credit: new Cesium.Credit('OpenWeatherMap'),
    });

    this.imageryLayer = this.viewer.imageryLayers.addImageryProvider(provider);
    this.imageryLayer.alpha = 0.5;
  }

  protected async fetchData(): Promise<unknown> {
    // Tile-based layer: ImageryProvider handles tile loading internally
    return null;
  }

  protected normalize(): NormalizedFeature[] {
    return [];
  }

  protected render(): void {
    // No-op: imagery provider was created once in setupRenderer()
  }

  protected clearRenderer(): void {
    if (this.imageryLayer) {
      this.viewer.imageryLayers.remove(this.imageryLayer, true);
      this.imageryLayer = null;
    }
  }

  protected applyVisibility(visible: boolean): void {
    if (this.imageryLayer) {
      this.imageryLayer.show = visible;
    }
  }

  getFeatureCount(): number {
    return this.imageryLayer ? 1 : 0;
  }
}
