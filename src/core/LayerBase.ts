import * as Cesium from 'cesium';
import type { IDataLayer, LayerManifest, LayerStatus, NormalizedFeature } from './types';

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

  async initialize(viewer: Cesium.Viewer): Promise<void> {
    this.viewer = viewer;
    this.setupRenderer();
    await this.update();
    this.startRefresh();
  }

  async update(): Promise<void> {
    this._status = 'loading';
    this._error = null;
    try {
      const raw = await this.fetchData();
      this.allFeatures = this.normalize(raw);
      this.applyFiltersAndLimit();
      this.lastUpdated = new Date();
      this._status = 'loaded';
    } catch (err) {
      this._status = 'error';
      this._error = (err as Error).message ?? 'Unknown error';
      console.error(`[${this.manifest.id}] Update failed:`, err);
    }
  }

  getStatus(): LayerStatus {
    return this._status;
  }

  getError(): string | null {
    return this._error;
  }

  async retry(): Promise<void> {
    await this.update();
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
