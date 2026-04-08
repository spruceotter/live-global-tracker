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

    const layers = manager.getAll();
    for (const layer of layers) {
      const btn = this.createToggle(layer, manager);
      this.container.appendChild(btn);
    }
  }

  private createToggle(layer: IDataLayer, manager: LayerManager): HTMLElement {
    const btn = document.createElement('button');
    const isActive = layer.manifest.defaultEnabled;
    btn.className = `layer-toggle${isActive ? ' active' : ''}`;
    btn.title = layer.manifest.name;

    const color = LAYER_COLORS[layer.manifest.id] ?? '#60a5fa';
    if (isActive) {
      btn.style.borderColor = `${color}66`;
      btn.style.color = color;
      btn.style.background = `${color}1a`;
    }

    const icon = document.createElement('span');
    icon.className = 'layer-icon';
    icon.textContent = ICONS[layer.manifest.icon] ?? '?';

    const label = document.createElement('span');
    label.className = 'layer-label';
    label.textContent = layer.manifest.name;

    btn.appendChild(icon);
    btn.appendChild(label);

    btn.addEventListener('click', async () => {
      await manager.toggleLayer(layer.manifest.id);
      const active = layer.isVisible();
      btn.classList.toggle('active', active);
      if (active) {
        btn.style.borderColor = `${color}66`;
        btn.style.color = color;
        btn.style.background = `${color}1a`;
      } else {
        btn.style.borderColor = 'transparent';
        btn.style.color = '';
        btn.style.background = 'transparent';
      }
    });

    return btn;
  }

  destroy(): void {
    this.container.remove();
  }
}
