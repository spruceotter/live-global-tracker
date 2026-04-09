import * as Cesium from 'cesium';
import { propagate, type SatRecord } from './propagator';

const ORBIT_DURATION_MINUTES = 90;
const SAMPLE_INTERVAL_SECONDS = 30;

export class OrbitPathRenderer {
  private viewer: Cesium.Viewer;
  private orbitEntity: Cesium.Entity | null = null;
  private dataSource: Cesium.CustomDataSource;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.dataSource = new Cesium.CustomDataSource('orbit-paths');
    viewer.dataSources.add(this.dataSource);
  }

  show(satRecord: SatRecord, color: string): void {
    this.clear();

    const now = new Date();
    const positions: Cesium.Cartesian3[] = [];
    const totalSamples = (ORBIT_DURATION_MINUTES * 60) / SAMPLE_INTERVAL_SECONDS;

    for (let i = 0; i <= totalSamples; i++) {
      const futureDate = new Date(now.getTime() + i * SAMPLE_INTERVAL_SECONDS * 1000);
      const pos = propagate(satRecord, futureDate);
      if (pos) {
        positions.push(
          Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.altKm * 1000)
        );
      }
    }

    if (positions.length < 2) return;

    const cesiumColor = Cesium.Color.fromCssColorString(color);

    this.orbitEntity = this.dataSource.entities.add({
      polyline: {
        positions,
        width: 2,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.25,
          taperPower: 0.5,
          color: cesiumColor.withAlpha(0.7),
        }),
      },
    });

    // Ground track (projected path on surface)
    const groundPositions = positions.map((p) => {
      const carto = Cesium.Cartographic.fromCartesian(p);
      return Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, 0);
    });

    this.dataSource.entities.add({
      polyline: {
        positions: groundPositions,
        width: 1,
        material: cesiumColor.withAlpha(0.15),
        clampToGround: true,
      },
    });
  }

  clear(): void {
    this.dataSource.entities.removeAll();
    this.orbitEntity = null;
  }

  isShowing(): boolean {
    return this.orbitEntity !== null;
  }

  destroy(): void {
    this.viewer.dataSources.remove(this.dataSource, true);
  }
}
