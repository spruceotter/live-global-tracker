import type { IDataLayer } from '../core/types';

const LAYER_COLORS: Record<string, string> = {
  satellites: '#a78bfa',
  aircraft: '#60a5fa',
  earthquakes: '#ef4444',
  fires: '#f97316',
  weather: '#94a3b8',
};

export class StatsBar {
  private container: HTMLElement;
  private layers: IDataLayer[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private items = new Map<string, HTMLElement>();

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'stats-bar';
    document.body.appendChild(this.container);
  }

  setLayers(layers: IDataLayer[]): void {
    this.layers = layers;
    this.buildItems();
    this.update();
    this.timer = setInterval(() => this.update(), 1000);
  }

  private buildItems(): void {
    this.container.replaceChildren();
    this.items.clear();

    for (const layer of this.layers) {
      const item = document.createElement('div');
      item.className = 'stat-item';

      const dot = document.createElement('span');
      dot.className = 'stat-dot';
      dot.style.background = LAYER_COLORS[layer.manifest.id] ?? '#60a5fa';

      const label = document.createElement('span');
      label.className = 'stat-label';
      label.textContent = layer.manifest.name;

      const value = document.createElement('span');
      value.className = 'stat-value';
      value.textContent = '--';

      item.appendChild(dot);
      item.appendChild(label);
      item.appendChild(value);
      this.container.appendChild(item);
      this.items.set(layer.manifest.id, value);
    }
  }

  private update(): void {
    for (const layer of this.layers) {
      const el = this.items.get(layer.manifest.id);
      if (el) {
        el.textContent = layer.isVisible()
          ? layer.getFeatureCount().toLocaleString()
          : '--';
      }
    }
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.container.remove();
  }
}
