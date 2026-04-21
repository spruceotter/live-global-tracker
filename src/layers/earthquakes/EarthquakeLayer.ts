import * as Cesium from 'cesium';
import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { earthquakeManifest } from './manifest';

const ONE_HOUR_MS = 3_600_000;
const ONE_DAY_MS = 86_400_000;

/**
 * Alpha curve for the "always-on pulse" ripple.
 *   < 1h: sine-pulse between [peak*0.5, peak] every 3s
 *   < 24h: linear fade from peak → tail
 *   > 24h: stays at tail
 */
function rippleAlpha(ageMs: number, peak: number, tail: number): number {
  if (ageMs < 0) return peak;
  if (ageMs < ONE_HOUR_MS) {
    const phase = Math.sin((ageMs / 3000) * Math.PI * 2);
    return peak * (0.75 + 0.25 * phase);
  }
  if (ageMs < ONE_DAY_MS) {
    const t = (ageMs - ONE_HOUR_MS) / (ONE_DAY_MS - ONE_HOUR_MS);
    return peak + (tail - peak) * t;
  }
  return tail;
}

interface USGSFeature {
  properties: {
    mag: number;
    place: string;
    time: number;
    felt: number | null;
    url: string;
  };
  geometry: {
    coordinates: [number, number, number];
  };
  id: string;
}

export class EarthquakeLayer extends LayerBase {
  readonly manifest = earthquakeManifest;
  private dataSource!: Cesium.CustomDataSource;

  protected setupRenderer(): void {
    this.dataSource = new Cesium.CustomDataSource('earthquakes');
    this.viewer.dataSources.add(this.dataSource);
  }

  protected async fetchData(): Promise<unknown> {
    const url = this.manifest.source.url as string;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`USGS: ${response.status}`);
    return response.json();
  }

  protected normalize(raw: unknown): NormalizedFeature[] {
    const geojson = raw as { features: USGSFeature[] };
    return geojson.features
      .slice(0, this.manifest.rendering.maxEntities)
      .map((f) => {
        const [lon, lat, depth] = f.geometry.coordinates;
        return {
          id: f.id,
          lat,
          lon,
          category: depth < 30 ? 'shallow' : depth < 100 ? 'mid' : 'deep',
          label: f.properties.place ?? 'Unknown location',
          timestamp: f.properties.time,
          properties: {
            mag: f.properties.mag,
            depth,
            time: f.properties.time,
            felt: f.properties.felt,
            url: f.properties.url,
          },
        };
      });
  }

  protected render(features: NormalizedFeature[]): void {
    this.dataSource.entities.removeAll();

    for (const f of features) {
      const mag = (f.properties.mag as number) ?? 1;
      const depth = (f.properties.depth as number) ?? 0;
      const timestamp = typeof f.timestamp === 'number' ? f.timestamp : Date.now();

      const baseRadius = Math.max(mag * mag * 2000, 5000);
      const color = this.depthColor(depth);

      // Animated alpha tied to Cesium's clock so quakes pulse for the first
      // hour, then fade out over 24h. Creates the "always-on pulse" the Data
      // Review calls for — globe never looks empty, even during quiet hours.
      const fillAlpha = new Cesium.CallbackProperty((time) => {
        const nowMs = time ? Cesium.JulianDate.toDate(time).getTime() : Date.now();
        return color.withAlpha(rippleAlpha(nowMs - timestamp, 0.35, 0.15));
      }, false);

      const outlineAlpha = new Cesium.CallbackProperty((time) => {
        const nowMs = time ? Cesium.JulianDate.toDate(time).getTime() : Date.now();
        return color.withAlpha(rippleAlpha(nowMs - timestamp, 0.85, 0.25));
      }, false);

      this.dataSource.entities.add({
        position: Cesium.Cartesian3.fromDegrees(f.lon, f.lat),
        ellipse: {
          semiMajorAxis: baseRadius,
          semiMinorAxis: baseRadius,
          material: new Cesium.ColorMaterialProperty(fillAlpha),
          outline: true,
          outlineColor: outlineAlpha,
          outlineWidth: 1.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        properties: new Cesium.PropertyBag({
          layerId: 'earthquakes',
          featureId: f.id,
        }),
      });
    }
  }

  protected clearRenderer(): void {
    this.viewer.dataSources.remove(this.dataSource, true);
  }

  protected applyVisibility(visible: boolean): void {
    this.dataSource.show = visible;
  }

  private depthColor(depth: number): Cesium.Color {
    if (depth < 30) return Cesium.Color.fromCssColorString('#ef4444');
    if (depth < 100) return Cesium.Color.fromCssColorString('#f97316');
    return Cesium.Color.fromCssColorString('#eab308');
  }
}
