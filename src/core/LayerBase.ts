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
      this.features = this._displayLimit < this.allFeatures.length
        ? this.allFeatures.slice(0, this._displayLimit)
        : this.allFeatures;
      this.lastUpdated = new Date();
      this.render(this.features);
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
    this.features = this.allFeatures.slice(0, limit);
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
