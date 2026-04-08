import * as Cesium from 'cesium';
import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { earthquakeManifest } from './manifest';

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

    const now = Date.now();
    for (const f of features) {
      const mag = (f.properties.mag as number) ?? 1;
      const depth = (f.properties.depth as number) ?? 0;
      const age = f.timestamp ? now - f.timestamp : Infinity;
      const isRecent = age < 3600_000; // less than 1 hour

      const radius = Math.max(mag * mag * 2000, 5000);
      const color = this.depthColor(depth);
      const alpha = isRecent ? 0.7 : 0.4;

      this.dataSource.entities.add({
        position: Cesium.Cartesian3.fromDegrees(f.lon, f.lat),
        ellipse: {
          semiMajorAxis: radius,
          semiMinorAxis: radius,
          material: color.withAlpha(alpha),
          outline: true,
          outlineColor: color.withAlpha(alpha + 0.15),
          outlineWidth: 1,
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
