import * as Cesium from 'cesium';
import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { launchesManifest } from './manifest';

/**
 * Upcoming-launches layer. Pins each launch at its pad coordinate. Launches
 * within the next 24 hours pulse amber to draw the eye; others are a cool
 * violet so the stack reads as "what's coming next."
 */

interface LL2Launch {
  id: string;
  name: string;
  net?: string;
  status?: { abbrev?: string; name?: string };
  launch_service_provider?: { name?: string };
  rocket?: { configuration?: { name?: string; full_name?: string } };
  pad?: {
    name?: string;
    latitude?: string;
    longitude?: string;
    location?: { name?: string };
  };
}

const IMMINENT_MS = 24 * 60 * 60 * 1000;
const PULSE_PERIOD_MS = 1500;

function formatCountdown(netMs: number): string {
  const delta = netMs - Date.now();
  if (delta <= 0) return 'Launching now';
  const s = Math.floor(delta / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `T-${d}d ${h}h`;
  if (h > 0) return `T-${h}h ${m}m`;
  return `T-${m}m`;
}

export class LaunchesLayer extends LayerBase {
  readonly manifest = launchesManifest;
  private dataSource!: Cesium.CustomDataSource;

  protected setupRenderer(): void {
    this.dataSource = new Cesium.CustomDataSource('launches');
    this.viewer.dataSources.add(this.dataSource);
  }

  protected async fetchData(): Promise<unknown> {
    const resp = await fetch(this.manifest.source.url as string);
    if (!resp.ok) throw new Error(`Launch Library 2: ${resp.status}`);
    return resp.json();
  }

  protected normalize(raw: unknown): NormalizedFeature[] {
    const data = raw as { results?: LL2Launch[] };
    const launches = data.results ?? [];
    const out: NormalizedFeature[] = [];
    for (const l of launches) {
      const latStr = l.pad?.latitude;
      const lonStr = l.pad?.longitude;
      if (!latStr || !lonStr) continue;
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (isNaN(lat) || isNaN(lon)) continue;
      const netMs = l.net ? Date.parse(l.net) : NaN;
      if (isNaN(netMs)) continue;
      const deltaMs = netMs - Date.now();
      const imminent = deltaMs > -3_600_000 && deltaMs < IMMINENT_MS; // include live window
      out.push({
        id: `launch_${l.id}`,
        lat,
        lon,
        category: imminent ? 'imminent' : 'upcoming',
        label: l.name ?? 'Launch',
        timestamp: netMs,
        properties: {
          provider: l.launch_service_provider?.name ?? 'Unknown',
          rocket: l.rocket?.configuration?.full_name ?? l.rocket?.configuration?.name ?? '',
          pad: `${l.pad?.name ?? ''}${l.pad?.location?.name ? ` · ${l.pad.location.name}` : ''}`,
          netISO: l.net ?? '',
          netMs,
          countdown: formatCountdown(netMs),
          status: l.status?.name ?? l.status?.abbrev ?? 'TBD',
          imminent,
        },
      });
    }
    // Sort by net ascending
    out.sort((a, b) => (a.properties.netMs as number) - (b.properties.netMs as number));
    return out.slice(0, this.manifest.rendering.maxEntities);
  }

  protected render(features: NormalizedFeature[]): void {
    this.dataSource.entities.removeAll();

    for (const f of features) {
      const imminent = !!f.properties.imminent;
      const baseColor = imminent ? Cesium.Color.fromCssColorString('#fbbf24')
                                 : Cesium.Color.fromCssColorString('#a78bfa');
      const t0 = Date.now();

      const pixelSize = imminent
        ? new Cesium.CallbackProperty(() => {
            const phase = ((Date.now() - t0) % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
            return 10 + 6 * Math.sin(phase * Math.PI * 2);
          }, false)
        : 8;

      const color = imminent
        ? new Cesium.CallbackProperty(() => {
            const phase = ((Date.now() - t0) % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
            return baseColor.withAlpha(0.7 + 0.3 * Math.sin(phase * Math.PI * 2));
          }, false)
        : baseColor;

      this.dataSource.entities.add({
        id: f.id,
        position: Cesium.Cartesian3.fromDegrees(f.lon, f.lat, 500),
        point: {
          pixelSize,
          color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        properties: new Cesium.PropertyBag({
          layerId: 'launches',
          featureId: f.id,
        }),
      });
    }
  }

  protected clearRenderer(): void {
    if (this.dataSource) this.viewer.dataSources.remove(this.dataSource, true);
  }

  protected applyVisibility(visible: boolean): void {
    if (this.dataSource) this.dataSource.show = visible;
  }
}
