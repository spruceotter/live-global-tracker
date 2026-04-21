import * as Cesium from 'cesium';
import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { goesManifest } from './manifest';

/**
 * Real-time satellite cloud imagery layer. Stitches together the three
 * geostationary IR feeds covering Americas / Asia-Pacific / EMEA so the
 * user gets cloud cover globally.
 *
 * Each tile URL embeds a "most-recent" timestamp computed at load time and
 * refreshed on the manifest's 10-minute poll — GIBS serves a ~15 min behind
 * wall-clock near-real-time feed, so we truncate to 10-minute boundaries.
 */

type Basin = 'americas' | 'asia-pacific' | 'emea';

interface BasinConfig {
  id: string;
  tileSet: string;
  label: string;
  /** Approximate footprint of the geostationary view (in degrees lon/lat). */
  rectangle: { west: number; south: number; east: number; north: number };
}

const BASIN_LAYERS: Record<Basin, BasinConfig> = {
  americas: {
    id: 'GOES-East_ABI_Band13_Clean_Infrared',
    tileSet: '2km',
    label: 'GOES-East IR',
    rectangle: { west: -156, south: -81, east:  6, north: 81 },
  },
  'asia-pacific': {
    id: 'Himawari_AHI_Band13_Clean_Infrared',
    tileSet: '2km',
    label: 'Himawari IR',
    rectangle: { west: 60, south: -81, east: 180, north: 81 },
  },
  emea: {
    id: 'MSG_SEVIRI_Band_10_8_Clean_Infrared',
    tileSet: '3km',
    label: 'Meteosat IR',
    rectangle: { west: -76, south: -81, east: 76, north: 81 },
  },
};

// GIBS WMTS levels per tile-matrix-set ID. Restricted to the levels GIBS
// actually publishes for these geostationary IR layers — going beyond
// breaks Cesium's tile rectangle math (semiMajorAxis assertion).
const TILE_MATRIX_LABELS: Record<string, string[]> = {
  '2km': ['0', '1', '2', '3', '4', '5'],
  '3km': ['0', '1', '2', '3', '4'],
};

/** Round wall-clock to the last 10-minute boundary in UTC so Cesium caches the same URL across ticks. */
function currentTimestamp(): string {
  const d = new Date();
  d.setUTCSeconds(0, 0);
  const minutes = Math.floor(d.getUTCMinutes() / 10) * 10;
  d.setUTCMinutes(minutes);
  return d.toISOString().replace(/\.\d+Z$/, 'Z');
}

export class GoesLayer extends LayerBase {
  readonly manifest = goesManifest;
  private imageryLayers = new Map<Basin, Cesium.ImageryLayer>();
  private timestamp = currentTimestamp();

  protected setupRenderer(): void {
    // Add all three basins at once — they tile across the globe. Alpha tuned
    // so the stack reads as "clouds over the planet" without overpowering
    // underlying imagery.
    for (const basin of Object.keys(BASIN_LAYERS) as Basin[]) {
      this.addBasinLayer(basin);
    }
  }

  private addBasinLayer(basin: Basin): void {
    const meta = BASIN_LAYERS[basin];
    const url = `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${meta.id}/default/${this.timestamp}/${meta.tileSet}/{TileMatrix}/{TileRow}/{TileCol}.png`;
    // GIBS tile matrix sets use a non-power-of-2 subdivision (2→3→5→10→20→40),
    // which is incompatible with Cesium's default GeographicTilingScheme.
    // Match NightLightsLayer's working pattern: no custom rectangle, accept
    // the transparent pixels outside the basin's footprint.
    const provider = new Cesium.WebMapTileServiceImageryProvider({
      url,
      layer: meta.id,
      style: 'default',
      tileMatrixSetID: meta.tileSet,
      format: 'image/png',
      tileMatrixLabels: TILE_MATRIX_LABELS[meta.tileSet],
      tilingScheme: new Cesium.GeographicTilingScheme(),
      tileWidth: 512,
      tileHeight: 512,
      credit: new Cesium.Credit('NASA GIBS / NOAA / JMA / EUMETSAT'),
    });
    const layer = this.viewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = 0.55;
    layer.brightness = 1.25;
    this.imageryLayers.set(basin, layer);
  }

  protected async fetchData(): Promise<unknown> {
    // Poll hook: refresh the timestamp so Cesium loads new tiles on the next tick.
    const next = currentTimestamp();
    if (next !== this.timestamp) {
      this.timestamp = next;
      // Rebuild the providers with the new timestamp
      for (const [basin, layer] of this.imageryLayers) {
        this.viewer.imageryLayers.remove(layer, true);
        this.imageryLayers.delete(basin);
      }
      for (const basin of Object.keys(BASIN_LAYERS) as Basin[]) {
        this.addBasinLayer(basin);
      }
    }
    return null;
  }

  protected normalize(): NormalizedFeature[] {
    return [];
  }

  protected render(): void {
    // Imagery providers handle tile rendering
  }

  protected clearRenderer(): void {
    for (const layer of this.imageryLayers.values()) {
      this.viewer.imageryLayers.remove(layer, true);
    }
    this.imageryLayers.clear();
  }

  protected applyVisibility(visible: boolean): void {
    for (const layer of this.imageryLayers.values()) {
      layer.show = visible;
    }
  }

  getFeatureCount(): number {
    return this.imageryLayers.size;
  }

  /** Used by the UI to show the "imagery time" badge so users don't wonder why clouds aren't real-time. */
  getImageryTimestamp(): string {
    return this.timestamp;
  }
}
