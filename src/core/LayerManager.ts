import type * as Cesium from 'cesium';
import type { IDataLayer } from './types';

export class LayerManager {
  private layers: IDataLayer[] = [];
  private viewer: Cesium.Viewer | null = null;

  setViewer(viewer: Cesium.Viewer): void {
    this.viewer = viewer;
  }

  register(layer: IDataLayer): void {
    this.layers.push(layer);
  }

  async initializeAll(): Promise<void> {
    if (!this.viewer) throw new Error('Viewer not set');
    const promises = this.layers
      .filter((l) => l.manifest.defaultEnabled)
      .map((l) => l.initialize(this.viewer!).catch((err) => {
        console.error(`[${l.manifest.id}] Init failed:`, err);
      }));
    await Promise.all(promises);
  }

  getAll(): IDataLayer[] {
    return this.layers;
  }

  getById(id: string): IDataLayer | undefined {
    return this.layers.find((l) => l.manifest.id === id);
  }

  async toggleLayer(id: string): Promise<void> {
    const layer = this.getById(id);
    if (!layer) return;

    if (layer.isVisible()) {
      layer.setVisible(false);
    } else {
      if (layer.getLastUpdated() === null && this.viewer) {
        await layer.initialize(this.viewer);
      }
      layer.setVisible(true);
    }
  }

  destroyAll(): void {
    this.layers.forEach((l) => l.destroy());
    this.layers = [];
  }
}
