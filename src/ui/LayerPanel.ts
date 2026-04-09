import type { IDataLayer } from '../core/types';
import type { LayerManager } from '../core/LayerManager';

const ICONS: Record<string, string> = {
  sat: '\u{1F6F0}',
  aircraft: '\u2708',
  quake: '\u{1F534}',
  fire: '\u{1F525}',
  weather: '\u2601',
};

const LAYER_COLORS: Record<string, string> = {
  satellites: '#a78bfa',
  aircraft: '#60a5fa',
  earthquakes: '#ef4444',
  fires: '#f97316',
  weather: '#94a3b8',
};

export class LayerPanel {
  private container: HTMLElement;

  constructor(manager: LayerManager) {
    this.container = document.createElement('div');
    this.container.className = 'layer-panel glass';
    document.body.appendChild(this.container);

    for (const layer of manager.getAll()) {
      this.container.appendChild(this.createLayerItem(layer, manager));
    }
  }

  private createLayerItem(layer: IDataLayer, manager: LayerManager): HTMLElement {
    const item = document.createElement('div');
    item.className = 'layer-item';

    const color = LAYER_COLORS[layer.manifest.id] ?? '#60a5fa';
    const isActive = layer.manifest.defaultEnabled;
    const maxEntities = layer.getMaxEntities();
    const showSlider = maxEntities > 0 && layer.manifest.rendering.strategy !== 'imagery';

    // Toggle button
    const btn = document.createElement('button');
    btn.className = `layer-toggle${isActive ? ' active' : ''}`;
    btn.title = layer.manifest.name;
    this.applyToggleColor(btn, color, isActive);

    const icon = document.createElement('span');
    icon.className = 'layer-icon';
    icon.textContent = ICONS[layer.manifest.icon] ?? '?';

    const label = document.createElement('span');
    label.className = 'layer-label';
    label.textContent = layer.manifest.name;

    btn.appendChild(icon);
    btn.appendChild(label);
    item.appendChild(btn);

    // Density slider (controls how many entities load)
    let sliderRow: HTMLElement | null = null;
    if (showSlider) {
      sliderRow = document.createElement('div');
      sliderRow.className = 'layer-slider-row';
      sliderRow.style.display = isActive ? 'flex' : 'none';

      const sliderLabel = document.createElement('span');
      sliderLabel.className = 'layer-slider-label';
      sliderLabel.textContent = 'Density';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'layer-slider';
      slider.min = String(Math.min(100, maxEntities));
      slider.max = String(maxEntities);
      slider.value = String(maxEntities);
      slider.step = String(Math.max(1, Math.round(maxEntities / 100)));

      const countLabel = document.createElement('span');
      countLabel.className = 'layer-slider-value';
      countLabel.textContent = this.formatCount(maxEntities);

      slider.addEventListener('input', () => {
        const limit = parseInt(slider.value, 10);
        layer.setDisplayLimit(limit);
        countLabel.textContent = this.formatCount(limit);
      });

      sliderRow.appendChild(sliderLabel);
      sliderRow.appendChild(slider);
      sliderRow.appendChild(countLabel);
      item.appendChild(sliderRow);
    }

    // Toggle click
    btn.addEventListener('click', async () => {
      await manager.toggleLayer(layer.manifest.id);
      const active = layer.isVisible();
      btn.classList.toggle('active', active);
      this.applyToggleColor(btn, color, active);
      if (sliderRow) sliderRow.style.display = active ? 'flex' : 'none';
    });

    return item;
  }

  private applyToggleColor(btn: HTMLElement, color: string, active: boolean): void {
    if (active) {
      btn.style.borderColor = `${color}66`;
      btn.style.color = color;
      btn.style.background = `${color}1a`;
    } else {
      btn.style.borderColor = 'transparent';
      btn.style.color = '';
      btn.style.background = 'transparent';
    }
  }

  private formatCount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  destroy(): void {
    this.container.remove();
  }
}
