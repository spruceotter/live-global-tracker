import * as Cesium from 'cesium';
import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { nightLightsManifest } from './manifest';

// NASA GIBS WMTS endpoint for VIIRS Black Marble nighttime lights
const GIBS_NIGHT_LIGHTS_URL =
  'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_Black_Marble/default/2024-01-01/500m/{TileMatrix}/{TileRow}/{TileCol}.png';

export class NightLightsLayer extends LayerBase {
  readonly manifest = nightLightsManifest;
  private imageryLayer: Cesium.ImageryLayer | null = null;

  protected setupRenderer(): void {
    const provider = new Cesium.WebMapTileServiceImageryProvider({
      url: GIBS_NIGHT_LIGHTS_URL,
      layer: 'VIIRS_Black_Marble',
      style: 'default',
      tileMatrixSetID: '500m',
      format: 'image/png',
      tileMatrixLabels: [
        '0', '1', '2', '3', '4', '5', '6', '7', '8',
      ],
      tilingScheme: new Cesium.GeographicTilingScheme(),
      tileWidth: 512,
      tileHeight: 512,
      credit: new Cesium.Credit('NASA Black Marble'),
    });

    this.imageryLayer = this.viewer.imageryLayers.addImageryProvider(provider);
    this.imageryLayer.alpha = 0.85;
    this.imageryLayer.brightness = 1.5;
  }

  protected async fetchData(): Promise<unknown> {
    return null;
  }

  protected normalize(): NormalizedFeature[] {
    return [];
  }

  protected render(): void {
    // Imagery provider handles tile loading
  }

  protected clearRenderer(): void {
    if (this.imageryLayer) {
      this.viewer.imageryLayers.remove(this.imageryLayer, true);
      this.imageryLayer = null;
    }
  }

  protected applyVisibility(visible: boolean): void {
    if (this.imageryLayer) this.imageryLayer.show = visible;
  }

  getFeatureCount(): number {
    return this.imageryLayer ? 1 : 0;
  }
}
