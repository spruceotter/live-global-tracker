import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { aircraftManifest } from './manifest';
import { PointCloudRenderer } from '../../rendering/renderers/PointCloudRenderer';
import { config } from '../../config';

// OpenSky state vector indices
const ICAO24 = 0;
const CALLSIGN = 1;
const ORIGIN_COUNTRY = 2;
const LON = 5;
const LAT = 6;
const BARO_ALT = 7;
const ON_GROUND = 8;
const VELOCITY = 9;
const HEADING = 10;
const VERTICAL_RATE = 11;

export class AircraftLayer extends LayerBase {
  readonly manifest = aircraftManifest;
  private renderer!: PointCloudRenderer;

  protected setupRenderer(): void {
    this.renderer = new PointCloudRenderer(this.viewer);
  }

  protected async fetchData(): Promise<unknown> {
    const response = await fetch('/api/opensky');
    if (!response.ok) throw new Error(`OpenSky: ${response.status}`);
    return response.json();
  }

  protected normalize(raw: unknown): NormalizedFeature[] {
    const data = raw as { states: unknown[][] | null };
    if (!data.states) return [];

    const features: NormalizedFeature[] = [];
    for (const s of data.states) {
      if (features.length >= config.maxAircraft) break;

      // Filter: must have position, not on ground
      if (s[ON_GROUND] === true) continue;
      const lat = s[LAT] as number | null;
      const lon = s[LON] as number | null;
      if (lat == null || lon == null) continue;

      const altM = (s[BARO_ALT] as number | null) ?? 0;
      const altKm = altM / 1000;
      const velocityMs = (s[VELOCITY] as number | null) ?? 0;
      const callsign = ((s[CALLSIGN] as string) ?? '').trim();

      const category = altKm > 10 ? 'high' : altKm > 3 ? 'mid' : 'low';

      const altFt = Math.round(altM * 3.28084);
      const velocityKmH = Math.round(velocityMs * 3.6);
      const velocityKt = Math.round(velocityMs * 1.94384);

      features.push({
        id: s[ICAO24] as string,
        lat,
        lon,
        alt: altM,
        category,
        label: callsign || (s[ICAO24] as string),
        properties: {
          country: s[ORIGIN_COUNTRY] as string,
          altitude: `${Math.round(altM).toLocaleString()} m (${altFt.toLocaleString()} ft)`,
          velocity: `${velocityKmH} km/h (${velocityKt} kt)`,
          heading: s[HEADING] as number,
          verticalRate: s[VERTICAL_RATE] as number,
        },
      });
    }

    return features;
  }

  protected render(features: NormalizedFeature[]): void {
    this.renderer.render(features, this.manifest.rendering.style);
  }

  protected clearRenderer(): void {
    this.renderer.destroy();
  }

  protected applyVisibility(visible: boolean): void {
    this.renderer.setVisible(visible);
  }
}
