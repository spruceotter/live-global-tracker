import * as Cesium from 'cesium';
import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { satelliteManifest } from './manifest';
import { parseTleText } from '../../pipeline/parsers/TleParser';
import { PointCloudRenderer } from '../../rendering/renderers/PointCloudRenderer';
import {
  createSatRecord,
  propagate,
  classifyGroup,
  type SatRecord,
} from './propagator';
import { OrbitPathRenderer } from './orbit';
import { config } from '../../config';
import { loadSatcat, getSatcatRecord, describeSatcat, countryBucket } from './satcat';

const SAT_COLORS: Record<string, string> = {
  iss: '#fbbf24',
  starlink: '#c4b5fd',
  gps: '#34d399',
  weather: '#38bdf8',
  other: '#a78bfa',
};

export class SatelliteLayer extends LayerBase {
  readonly manifest = satelliteManifest;

  private renderer!: PointCloudRenderer;
  private orbitRenderer!: OrbitPathRenderer;
  private satRecords: SatRecord[] = [];
  private activeSatRecords: SatRecord[] = [];
  private propagationTimer: ReturnType<typeof setInterval> | null = null;

  protected setupRenderer(): void {
    this.renderer = new PointCloudRenderer(this.viewer);
    this.orbitRenderer = new OrbitPathRenderer(this.viewer);
  }

  /** Expose the loaded satellite records so the historical-context service
   * can reuse them for "satellites overhead at this photo timestamp" queries
   * without an extra network fetch. */
  getSatRecords(): SatRecord[] {
    return this.satRecords;
  }

  showOrbit(featureId: string): void {
    const idx = this.features.findIndex((f) => f.id === featureId);
    if (idx < 0 || idx >= this.activeSatRecords.length) {
      this.orbitRenderer.clear();
      return;
    }
    const rec = this.activeSatRecords[idx];
    const cat = this.features[idx].category;
    const color = SAT_COLORS[cat] ?? '#a78bfa';
    this.orbitRenderer.show(rec, color);
  }

  clearOrbit(): void {
    this.orbitRenderer.clear();
  }

  protected async fetchData(): Promise<string> {
    // Kick SATCAT load in parallel with TLEs. loadSatcat() is idempotent —
    // subsequent refreshes read from the in-memory cache. We await it before
    // returning so normalize() can enrich synchronously via getSatcatRecord().
    const satcatPromise = loadSatcat();

    const results = await Promise.all(
      config.satelliteGroups.map((group) =>
        fetch(`/api/celestrak/${group}`)
          .then((r) => {
            if (!r.ok) throw new Error(`CelesTrak ${group}: ${r.status}`);
            return r.text();
          })
          .catch((err) => {
            console.warn(`[satellites] Failed to fetch ${group}:`, err);
            return '';
          })
      )
    );
    await satcatPromise;
    const combined = results.join('\n');
    // If all groups failed (empty result), throw so layer enters error state with retry
    if (combined.trim().length === 0) {
      throw new Error('CelesTrak unavailable — all groups returned empty (may be rate-limited)');
    }
    return combined;
  }

  protected normalize(raw: unknown): NormalizedFeature[] {
    const text = raw as string;
    const tleRecords = parseTleText(text);

    // Build satrec objects
    this.satRecords = [];
    for (const rec of tleRecords) {
      // Determine group from TLE source
      const group = this.inferGroup(rec.name);
      const satRec = createSatRecord(rec.name, rec.line1, rec.line2, group);
      if (satRec) this.satRecords.push(satRec);
    }

    // Propagate to current time
    const now = new Date();
    const features: NormalizedFeature[] = [];
    this.activeSatRecords = [];

    for (const rec of this.satRecords) {
      if (features.length >= this.manifest.rendering.maxEntities) break;
      const pos = propagate(rec, now);
      if (!pos) continue;

      const cat = classifyGroup(rec.name, rec.group);
      const satcatRec = getSatcatRecord(pos.noradId);
      const derived = describeSatcat(satcatRec);
      // Push to both arrays in lockstep so indices stay aligned
      this.activeSatRecords.push(rec);
      features.push({
        id: pos.noradId,
        lat: pos.lat,
        lon: pos.lon,
        alt: pos.altKm * 1000, // km -> meters for Cesium
        category: cat,
        label: pos.name,
        properties: {
          noradId: pos.noradId,
          altKm: Math.round(pos.altKm * 10) / 10,
          velocityKmS: Math.round(pos.velocityKmS * 1000) / 1000,
          group: rec.group,
          country: derived.country,
          countryBucket: satcatRec ? countryBucket(satcatRec.owner) : 'other',
          purpose: derived.purpose,
          status: derived.status,
          launchDate: derived.launchDate,
          objectType: satcatRec?.objectType ?? 'UNKNOWN',
        },
      });
    }

    return features;
  }

  protected render(features: NormalizedFeature[]): void {
    this.renderer.render(features, this.manifest.rendering.style);
    this.startPropagation();
  }

  protected clearRenderer(): void {
    this.stopPropagation();
    this.orbitRenderer.destroy();
    this.renderer?.destroy();
  }

  protected applyVisibility(visible: boolean): void {
    this.renderer?.setVisible(visible);
    if (visible) {
      this.startPropagation();
    } else {
      this.stopPropagation();
    }
  }

  private startPropagation(): void {
    if (this.propagationTimer) return;

    this.propagationTimer = setInterval(() => {
      const now = new Date();
      for (let i = 0; i < this.activeSatRecords.length && i < this.features.length; i++) {
        const pos = propagate(this.activeSatRecords[i], now);
        if (pos) {
          this.features[i].lat = pos.lat;
          this.features[i].lon = pos.lon;
          this.features[i].alt = pos.altKm * 1000;
          this.features[i].properties.altKm = Math.round(pos.altKm * 10) / 10;
          this.features[i].properties.velocityKmS =
            Math.round(pos.velocityKmS * 1000) / 1000;
          this.renderer.updatePosition(i, pos.lat, pos.lon, pos.altKm * 1000);
        }
      }
      this.viewer.scene.requestRender();
    }, config.satellitePropagateMs);
  }

  private stopPropagation(): void {
    if (this.propagationTimer) {
      clearInterval(this.propagationTimer);
      this.propagationTimer = null;
    }
  }

  private inferGroup(name: string): string {
    const upper = name.toUpperCase();
    if (upper.includes('STARLINK')) return 'starlink';
    if (upper.includes('NAVSTAR') || upper.includes('GPS')) return 'gps-ops';
    if (
      upper.includes('NOAA') ||
      upper.includes('GOES') ||
      upper.includes('METEOSAT') ||
      upper.includes('METEOR')
    )
      return 'weather';
    return 'stations';
  }

  destroy(): void {
    this.stopPropagation();
    super.destroy();
  }
}
