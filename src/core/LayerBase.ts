import * as Cesium from 'cesium';
import type { IDataLayer, LayerManifest, LayerStatus, NormalizedFeature } from './types';

// Retry backoff schedule (ms)
const RETRY_DELAYS = [2000, 10000, 60000, 300000]; // 2s, 10s, 1min, 5min

export abstract class LayerBase implements IDataLayer {
  abstract readonly manifest: LayerManifest;

  protected viewer!: Cesium.Viewer;
  protected features: NormalizedFeature[] = [];
  protected allFeatures: NormalizedFeature[] = [];
  protected visible = true;
  protected lastUpdated: Date | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private _displayLimit: number = Infinity;
  private _status: LayerStatus = 'idle';
  private _error: string | null = null;
  private _filters: Array<{ attr: string; min?: number; max?: number; values?: string[] }> = [];
  private _fetchInProgress = false;
  private _consecutiveErrors = 0;
  private _retryTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastFetchDurationMs = 0;
  private _refreshCount = 0;

  async initialize(viewer: Cesium.Viewer): Promise<void> {
    this.viewer = viewer;
    this.setupRenderer();
    await this.update();
    this.startRefresh();
  }

  async update(): Promise<void> {
    // Concurrent fetch guard — skip if a fetch is already in progress
    if (this._fetchInProgress) return;
    this._fetchInProgress = true;

    this._status = 'loading';
    this._error = null;
    const fetchStart = performance.now();

    try {
      const raw = await this.fetchData();
      this._lastFetchDurationMs = Math.round(performance.now() - fetchStart);
      this.allFeatures = this.normalize(raw);
      this.applyFiltersAndLimit();
      this.lastUpdated = new Date();
      this._status = 'loaded';
      this._consecutiveErrors = 0; // Reset on success
      this._refreshCount++;
    } catch (err) {
      this._lastFetchDurationMs = Math.round(performance.now() - fetchStart);
      this._status = 'error';
      this._error = (err as Error).message ?? 'Unknown error';
      this._consecutiveErrors++;
      console.error(`[${this.manifest.id}] Update failed (attempt ${this._consecutiveErrors}):`, err);

      // Auto-retry with exponential backoff
      this.scheduleRetry();
    } finally {
      this._fetchInProgress = false;
    }
  }

  private scheduleRetry(): void {
    if (this._retryTimer) return; // Already scheduled
    const delayIndex = Math.min(this._consecutiveErrors - 1, RETRY_DELAYS.length - 1);
    const delay = RETRY_DELAYS[delayIndex];
    console.log(`[${this.manifest.id}] Retrying in ${delay / 1000}s (attempt ${this._consecutiveErrors + 1})`);
    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      this.update();
    }, delay);
  }

  getStatus(): LayerStatus {
    return this._status;
  }

  getError(): string | null {
    return this._error;
  }

  async retry(): Promise<void> {
    this._consecutiveErrors = 0; // Manual retry resets backoff
    await this.update();
  }

  getLastFetchDurationMs(): number {
    return this._lastFetchDurationMs;
  }

  getRefreshCount(): number {
    return this._refreshCount;
  }

  getDataAgeMs(): number {
    if (!this.lastUpdated) return Infinity;
    return Date.now() - this.lastUpdated.getTime();
  }

  isDataStale(): boolean {
    if (!this.lastUpdated) return true;
    if (this.manifest.refresh.kind === 'one-shot') return false;
    // Stale if data is older than 3x the refresh interval
    const interval = this.manifest.refresh.intervalMs;
    return this.getDataAgeMs() > interval * 3;
  }

  setDisplayLimit(limit: number): void {
    this._displayLimit = limit;
    this.applyFiltersAndLimit();
  }

  setFilter(attr: string, min?: number, max?: number, values?: string[]): void {
    const idx = this._filters.findIndex((f) => f.attr === attr);
    if (idx >= 0) this._filters[idx] = { attr, min, max, values };
    else this._filters.push({ attr, min, max, values });
    this.applyFiltersAndLimit();
  }

  clearFilters(): void {
    this._filters = [];
    this.applyFiltersAndLimit();
  }

  private applyFiltersAndLimit(): void {
    let filtered = this.allFeatures;

    for (const f of this._filters) {
      filtered = filtered.filter((feat) => {
        const val = feat.properties[f.attr];
        if (f.values && f.values.length > 0) {
          return f.values.includes(String(val));
        }
        if (typeof val === 'number') {
          if (f.min !== undefined && val < f.min) return false;
          if (f.max !== undefined && val > f.max) return false;
        }
        return true;
      });
    }

    this.features = this._displayLimit < filtered.length
      ? filtered.slice(0, this._displayLimit)
      : filtered;
    this.render(this.features);
  }

  getMaxEntities(): number {
    return this.manifest.rendering.maxEntities;
  }

  getTotalAvailable(): number {
    return this.allFeatures.length;
  }

  destroy(): void {
    this.stopRefresh();
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    this.clearRenderer();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.applyVisibility(visible);
  }

  isVisible(): boolean {
    return this.visible;
  }

  getFeatureCount(): number {
    return this.features.length;
  }

  getLastUpdated(): Date | null {
    return this.lastUpdated;
  }

  getFeatureById(id: string): NormalizedFeature | null {
    return this.features.find((f) => f.id === id) ?? null;
  }

  search(query: string): Array<{ id: string; label: string; lat: number; lon: number; alt?: number }> {
    const q = query.toLowerCase();
    return this.features
      .filter((f) => {
        const label = (f.label ?? '').toLowerCase();
        const id = f.id.toLowerCase();
        return label.includes(q) || id.includes(q);
      })
      .slice(0, 20)
      .map((f) => ({
        id: f.id,
        label: f.label ?? f.id,
        lat: f.lat,
        lon: f.lon,
        alt: f.alt,
      }));
  }

  protected abstract setupRenderer(): void;
  protected abstract fetchData(): Promise<unknown>;
  protected abstract normalize(raw: unknown): NormalizedFeature[];
  protected abstract render(features: NormalizedFeature[]): void;
  protected abstract clearRenderer(): void;
  protected abstract applyVisibility(visible: boolean): void;

  private startRefresh(): void {
    if (this.manifest.refresh.kind === 'poll') {
      this.refreshTimer = setInterval(
        () => this.update(),
        this.manifest.refresh.intervalMs
      );
    }
  }

  private stopRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
