import type { IDataLayer } from '../core/types';
import type { LayerManager } from '../core/LayerManager';

const LAYER_SVGS: Record<string, string> = {
  sat: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="10" cy="10" rx="8" ry="3" transform="rotate(-30 10 10)"/><circle cx="10" cy="10" r="2" fill="currentColor" stroke="none"/></svg>',
  aircraft: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2l2 6h5l-4 3 1.5 5L10 13l-4.5 3L7 11 3 8h5z"/></svg>',
  quake: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="3"/><circle cx="10" cy="10" r="6" opacity="0.5"/><circle cx="10" cy="10" r="8.5" opacity="0.25"/></svg>',
  fire: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2c0 3-3 5-3 8a3 3 0 006 0c0-1-.5-2-1-3 0 2-2 3-2 1s1-4 0-6z"/></svg>',
  weather: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 14a4 4 0 01-.5-7.97A5.5 5.5 0 0115 7a3.5 3.5 0 01.5 6.97H6z"/></svg>',
  nightlights: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 105.3 14A6 6 0 0110 2z"/></svg>',
  volcano: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 3l-1 3h2l-1-3zm-4 5l-4 9h16l-4-9h-2l1 3h-6l1-3z"/></svg>',
  airquality: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3" fill="currentColor" stroke="none" opacity="0.5"/></svg>',
  storm: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M12 2l-5 9h4l-3 7 8-10h-4z"/></svg>',
  ship: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 14l2-8h10l2 8-7-2z"/><rect x="9" y="3" width="2" height="5"/></svg>',
  gdacs: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/><path d="M10 3v4M10 13v4M3 10h4M13 10h4" stroke-linecap="round"/></svg>',
};

const LAYER_COLORS: Record<string, [string, string]> = {
  satellites: ['#a78bfa', 'rgba(167,139,250,0.25)'],
  aircraft: ['#60a5fa', 'rgba(96,165,250,0.25)'],
  earthquakes: ['#ef4444', 'rgba(239,68,68,0.25)'],
  fires: ['#f97316', 'rgba(249,115,22,0.25)'],
  weather: ['#94a3b8', 'rgba(148,163,184,0.25)'],
  nightlights: ['#fbbf24', 'rgba(251,191,36,0.25)'],
  volcanoes: ['#dc2626', 'rgba(220,38,38,0.25)'],
  weatheralerts: ['#f59e0b', 'rgba(245,158,11,0.25)'],
  gdacs: ['#ec4899', 'rgba(236,72,153,0.25)'],
};

export class LayerPanel {
  private container: HTMLElement;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private layerEls = new Map<string, { countEl: HTMLElement; statusEl: HTMLElement; tile: HTMLElement; sliderTray: HTMLElement }>();

  constructor(manager: LayerManager) {
    this.container = document.createElement('div');
    this.container.className = 'arc-console';
    document.body.appendChild(this.container);

    // Group layers by category
    const groups = new Map<string, IDataLayer[]>();
    const groupOrder = ['tracking', 'hazards', 'weather', 'environment', 'infrastructure'];
    const groupLabels: Record<string, string> = {
      tracking: 'Tracking', hazards: 'Hazards', weather: 'Weather',
      environment: 'Environment', infrastructure: 'Infrastructure',
    };

    for (const layer of manager.getAll()) {
      const cat = layer.manifest.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(layer);
    }

    for (const cat of groupOrder) {
      const layers = groups.get(cat);
      if (!layers || layers.length === 0) continue;

      const groupHeader = document.createElement('div');
      groupHeader.className = 'arc-group-header';
      groupHeader.textContent = groupLabels[cat] ?? cat;
      this.container.appendChild(groupHeader);

      for (const layer of layers) {
        this.container.appendChild(this.createLayerTile(layer, manager));
      }
    }

    this.pollTimer = setInterval(() => this.updateAll(manager), 500);
  }

  private createLayerTile(layer: IDataLayer, manager: LayerManager): HTMLElement {
    const [color, colorAlpha] = LAYER_COLORS[layer.manifest.id] ?? ['#60a5fa', 'rgba(96,165,250,0.25)'];
    const isActive = layer.manifest.defaultEnabled;
    const maxEntities = layer.getMaxEntities();
    const showSlider = maxEntities > 0 && layer.manifest.rendering.strategy !== 'imagery';

    const tile = document.createElement('div');
    tile.className = `arc-layer${isActive ? ' active' : ''}${layer.manifest.refresh.kind === 'poll' ? ' streaming' : ''}`;
    tile.style.setProperty('--layer-color', color);
    tile.style.setProperty('--layer-color-alpha', colorAlpha);

    // Main row: gutter + toggle
    const row = document.createElement('div');
    row.className = 'arc-row';

    const gutter = document.createElement('div');
    gutter.className = 'arc-gutter';

    const toggle = document.createElement('button');
    toggle.className = 'arc-toggle';

    const iconEl = document.createElement('span');
    iconEl.className = 'arc-icon';
    const svgKey = layer.manifest.icon;
    if (LAYER_SVGS[svgKey]) {
      iconEl.innerHTML = LAYER_SVGS[svgKey];
    } else {
      iconEl.textContent = '?';
    }

    const info = document.createElement('span');
    info.className = 'arc-info';

    const name = document.createElement('span');
    name.className = 'arc-name';
    name.textContent = layer.manifest.name;

    const countEl = document.createElement('span');
    countEl.className = 'arc-count';
    countEl.textContent = isActive ? '...' : 'off';

    info.appendChild(name);
    info.appendChild(countEl);

    const statusEl = document.createElement('span');
    statusEl.className = 'arc-status';

    toggle.appendChild(iconEl);
    toggle.appendChild(info);
    toggle.appendChild(statusEl);

    row.appendChild(gutter);
    row.appendChild(toggle);
    tile.appendChild(row);

    // Density slider tray
    const sliderTray = document.createElement('div');
    sliderTray.className = `arc-slider-tray${showSlider ? ' has-slider' : ''}`;

    if (showSlider) {
      const sliderLabel = document.createElement('label');
      sliderLabel.textContent = 'Density';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(Math.min(100, maxEntities));
      slider.max = String(maxEntities);
      slider.value = String(maxEntities);
      slider.step = String(Math.max(1, Math.round(maxEntities / 100)));

      slider.addEventListener('input', () => {
        layer.setDisplayLimit(parseInt(slider.value, 10));
      });

      sliderTray.appendChild(sliderLabel);
      sliderTray.appendChild(slider);
    }
    tile.appendChild(sliderTray);

    this.layerEls.set(layer.manifest.id, { countEl, statusEl, tile, sliderTray });

    // Toggle click
    toggle.addEventListener('click', async () => {
      await manager.toggleLayer(layer.manifest.id);
      const active = layer.isVisible();
      tile.classList.toggle('active', active);
      tile.classList.toggle('streaming', active && layer.manifest.refresh.kind === 'poll');
    });

    return tile;
  }

  private updateAll(manager: LayerManager): void {
    for (const layer of manager.getAll()) {
      const els = this.layerEls.get(layer.manifest.id);
      if (!els) continue;

      const status = layer.getStatus();
      const count = layer.getFeatureCount();
      const active = layer.isVisible();

      // Status dot
      els.statusEl.className = `arc-status ${status}`;

      // Count text with freshness
      if (active && status === 'loaded') {
        const ageMs = layer.getDataAgeMs();
        const ageText = this.formatAge(ageMs);
        const stale = layer.isDataStale();
        els.countEl.textContent = `${this.formatCount(count)} \u00B7 ${ageText}`;
        els.tile.classList.toggle('stale', stale);
      } else if (status === 'loading') {
        els.countEl.textContent = '...';
        els.tile.classList.remove('stale');
      } else if (status === 'error') {
        els.countEl.textContent = `err \u00B7 retry...`;
        els.tile.classList.remove('stale');
      } else if (!active) {
        els.countEl.textContent = 'off';
        els.tile.classList.remove('stale');
      }
    }
  }

  private formatCount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  private formatAge(ms: number): string {
    if (!isFinite(ms) || ms < 0) return 'never';
    if (ms < 5000) return 'now';
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  }

  destroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.container.remove();
  }
}
