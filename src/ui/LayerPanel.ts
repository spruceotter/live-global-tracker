import type { IDataLayer, LayerStatus } from '../core/types';
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
  private statusElements = new Map<string, { badge: HTMLElement; countEl: HTMLElement; errorEl: HTMLElement; sliderRow: HTMLElement }>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(manager: LayerManager) {
    this.container = document.createElement('div');
    this.container.className = 'layer-panel glass';
    document.body.appendChild(this.container);

    for (const layer of manager.getAll()) {
      this.container.appendChild(this.createLayerItem(layer, manager));
    }

    // Poll status every 500ms to update badges
    this.pollTimer = setInterval(() => this.updateStatuses(manager), 500);
  }

  private createLayerItem(layer: IDataLayer, manager: LayerManager): HTMLElement {
    const item = document.createElement('div');
    item.className = 'layer-item';

    const color = LAYER_COLORS[layer.manifest.id] ?? '#60a5fa';
    const isActive = layer.manifest.defaultEnabled;
    const maxEntities = layer.getMaxEntities();
    const showSlider = maxEntities > 0 && layer.manifest.rendering.strategy !== 'imagery';

    // Toggle button row
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

    // Status badge (spinner / count / error)
    const badge = document.createElement('span');
    badge.className = 'layer-badge';

    const countEl = document.createElement('span');
    countEl.className = 'layer-count';

    btn.appendChild(icon);
    btn.appendChild(label);
    btn.appendChild(badge);
    btn.appendChild(countEl);
    item.appendChild(btn);

    // Error message row (hidden by default)
    const errorEl = document.createElement('div');
    errorEl.className = 'layer-error';
    errorEl.style.display = 'none';
    item.appendChild(errorEl);

    // Density slider
    let sliderRow = document.createElement('div');
    sliderRow.className = 'layer-slider-row';
    sliderRow.style.display = 'none';

    if (showSlider) {
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

      const valLabel = document.createElement('span');
      valLabel.className = 'layer-slider-value';
      valLabel.textContent = this.formatCount(maxEntities);

      slider.addEventListener('input', () => {
        const limit = parseInt(slider.value, 10);
        layer.setDisplayLimit(limit);
        valLabel.textContent = this.formatCount(limit);
      });

      sliderRow.appendChild(sliderLabel);
      sliderRow.appendChild(slider);
      sliderRow.appendChild(valLabel);
      item.appendChild(sliderRow);
    }

    // Store refs for status polling
    this.statusElements.set(layer.manifest.id, { badge, countEl, errorEl, sliderRow });

    // Toggle click
    btn.addEventListener('click', async () => {
      await manager.toggleLayer(layer.manifest.id);
      const active = layer.isVisible();
      btn.classList.toggle('active', active);
      this.applyToggleColor(btn, color, active);
      sliderRow.style.display = active && showSlider ? 'flex' : 'none';
    });

    return item;
  }

  private updateStatuses(manager: LayerManager): void {
    for (const layer of manager.getAll()) {
      const els = this.statusElements.get(layer.manifest.id);
      if (!els) continue;

      const status = layer.getStatus();
      const count = layer.getFeatureCount();

      // Badge: spinner for loading, dot for loaded, X for error
      els.badge.className = `layer-badge layer-badge--${status}`;
      els.badge.textContent = status === 'error' ? '!' : '';

      // Count
      if (status === 'loaded' && layer.isVisible()) {
        els.countEl.textContent = this.formatCount(count);
        els.countEl.style.display = '';
      } else {
        els.countEl.style.display = 'none';
      }

      // Error
      if (status === 'error') {
        const err = layer.getError() ?? 'Failed to load';
        els.errorEl.textContent = err;
        els.errorEl.style.display = '';
      } else {
        els.errorEl.style.display = 'none';
      }

      // Show slider when loaded and active
      if (status === 'loaded' && layer.isVisible() && layer.getMaxEntities() > 0 && layer.manifest.rendering.strategy !== 'imagery') {
        els.sliderRow.style.display = 'flex';
      }
    }
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
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.container.remove();
  }
}
