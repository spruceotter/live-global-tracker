import * as Cesium from 'cesium';
import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { lightningManifest } from './manifest';
import { WebSocketTransport } from '../../pipeline/transport/WebSocketTransport';

/**
 * Real-time lightning strike layer.
 *
 * Push-based: an Express WebSocket fan-out (server/wsProxy.ts) multiplexes
 * a single upstream Blitzortung connection to many browser clients. Each
 * strike flashes for ~1.2s as an expanding ring, then the entity is removed.
 *
 * Capped at `maxEntities` concurrent flashes — the Blitzortung global stream
 * is ~40–100 strikes/sec worldwide, and the globe-wide storm season can
 * easily overwhelm the renderer without this cap.
 */

const FLASH_DURATION_MS = 1200;

interface Strike {
  t: number;
  lat: number;
  lon: number;
}

export class LightningLayer extends LayerBase {
  readonly manifest = lightningManifest;

  private dataSource!: Cesium.CustomDataSource;
  private transport: WebSocketTransport<Strike> | null = null;
  private lastStrikeAt: Date | null = null;
  private strikeCount = 0;
  private activeEntities: Array<{ entity: Cesium.Entity; expiresAt: number }> = [];
  private sweepTimer: ReturnType<typeof setInterval> | null = null;
  private connectionStatus: 'closed' | 'connecting' | 'open' = 'closed';

  protected setupRenderer(): void {
    this.dataSource = new Cesium.CustomDataSource('lightning');
    this.viewer.dataSources.add(this.dataSource);
  }

  protected async fetchData(): Promise<unknown> {
    // Push-based — start the WS on first update, then stay out of the polling loop
    if (!this.transport) this.startTransport();
    return null;
  }

  protected normalize(): NormalizedFeature[] {
    return [];
  }

  protected render(): void {
    // No-op — render is driven by onStrike() instead of the fetch cycle
  }

  protected clearRenderer(): void {
    this.stopTransport();
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    if (this.dataSource) {
      this.viewer.dataSources.remove(this.dataSource, true);
    }
  }

  protected applyVisibility(visible: boolean): void {
    if (this.dataSource) this.dataSource.show = visible;
    if (visible && !this.transport) this.startTransport();
    else if (!visible && this.transport) this.stopTransport();
  }

  /** Number of strikes currently flashing on the globe. */
  getFeatureCount(): number {
    return this.activeEntities.length;
  }

  getLastUpdated(): Date | null {
    return this.lastStrikeAt;
  }

  /** Exposed for UI chips / debug overlays. */
  getConnectionStatus(): 'closed' | 'connecting' | 'open' {
    return this.connectionStatus;
  }

  getStrikeCount(): number {
    return this.strikeCount;
  }

  private startTransport(): void {
    const wsUrl = this.resolveWsUrl();
    this.transport = new WebSocketTransport<Strike>({
      url: wsUrl,
      parse: (raw) => {
        try {
          const obj = JSON.parse(raw) as Strike;
          if (typeof obj.lat === 'number' && typeof obj.lon === 'number' && typeof obj.t === 'number') {
            return obj;
          }
          return null;
        } catch {
          return null;
        }
      },
      onMessage: (strike) => this.onStrike(strike),
      onStatusChange: (status) => {
        this.connectionStatus = status;
      },
    });
    this.transport.start();
    // Sweep expired flashes every 200ms
    this.sweepTimer = setInterval(() => this.sweepExpired(), 200);
  }

  private stopTransport(): void {
    this.transport?.stop();
    this.transport = null;
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  private resolveWsUrl(): string {
    // In dev, Vite proxies http requests to Express on :3001 but NOT WebSockets.
    // Point directly at the Express host so it works in both dev and prod when
    // Express serves the static frontend.
    const { protocol, hostname } = window.location;
    const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
    // Dev: Express on :3001. Prod (single server): same host.
    const port = window.location.port === '5173' ? '3001' : window.location.port;
    const portSuffix = port ? `:${port}` : '';
    return `${wsProto}//${hostname}${portSuffix}/ws/lightning`;
  }

  private onStrike(strike: Strike): void {
    this.strikeCount++;
    this.lastStrikeAt = new Date(strike.t);

    // Enforce the cap — evict oldest flash if at limit
    if (this.activeEntities.length >= this.manifest.rendering.maxEntities) {
      const oldest = this.activeEntities.shift();
      if (oldest) this.dataSource.entities.remove(oldest.entity);
    }

    const now = Date.now();
    const expiresAt = now + FLASH_DURATION_MS;
    // Screen-space flash: a pixel-sized point with expanding-size + fading alpha.
    // Screen-space avoids Cesium's ellipse semiMajor/semiMinor geometry checks
    // which can fail when two CallbackProperty evaluations drift by µs.
    const PEAK_SIZE = 28;
    const BASE_SIZE = 6;

    const pixelSize = new Cesium.CallbackProperty(() => {
      const t = Math.min(1, (Date.now() - now) / FLASH_DURATION_MS);
      return BASE_SIZE + (PEAK_SIZE - BASE_SIZE) * t;
    }, false);

    const pointColor = new Cesium.CallbackProperty(() => {
      const t = Math.min(1, (Date.now() - now) / FLASH_DURATION_MS);
      const alpha = Math.max(0, 1 - t);
      return Cesium.Color.fromCssColorString('#fde047').withAlpha(alpha);
    }, false);

    const outlineColorProp = new Cesium.CallbackProperty(() => {
      const t = Math.min(1, (Date.now() - now) / FLASH_DURATION_MS);
      const alpha = Math.max(0, 0.9 * (1 - t));
      return Cesium.Color.fromCssColorString('#fef08a').withAlpha(alpha);
    }, false);

    const entity = this.dataSource.entities.add({
      position: Cesium.Cartesian3.fromDegrees(strike.lon, strike.lat, 0),
      point: {
        pixelSize,
        color: pointColor,
        outlineColor: outlineColorProp,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      properties: new Cesium.PropertyBag({
        layerId: 'lightning',
        featureId: `strike_${strike.t}_${strike.lat.toFixed(2)}_${strike.lon.toFixed(2)}`,
        time: new Date(strike.t).toISOString(),
      }),
    });

    this.activeEntities.push({ entity, expiresAt });
  }

  private sweepExpired(): void {
    const now = Date.now();
    while (this.activeEntities.length > 0 && this.activeEntities[0].expiresAt <= now) {
      const { entity } = this.activeEntities.shift()!;
      this.dataSource.entities.remove(entity);
    }
    if (this.activeEntities.length === 0) this.viewer.scene.requestRender();
  }
}
