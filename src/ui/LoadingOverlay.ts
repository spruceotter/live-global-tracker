import type { LayerManager } from '../core/LayerManager';

const GLOBE_SVG = '<svg viewBox="0 0 200 200" fill="none" class="loading-globe-svg"><circle cx="100" cy="100" r="70" stroke="url(#lg)" stroke-width="1.5" opacity="0.6"/><ellipse cx="100" cy="100" rx="35" ry="70" stroke="url(#lg)" stroke-width="1" opacity="0.3"/><ellipse cx="100" cy="100" rx="60" ry="70" stroke="url(#lg)" stroke-width="0.8" opacity="0.2"/><ellipse cx="100" cy="80" rx="65" ry="12" stroke="url(#lg)" stroke-width="0.8" opacity="0.2"/><ellipse cx="100" cy="120" rx="62" ry="11" stroke="url(#lg)" stroke-width="0.8" opacity="0.2"/><ellipse cx="100" cy="100" rx="95" ry="35" transform="rotate(-25 100 100)" stroke="url(#lg2)" stroke-width="1.2" opacity="0.4"/><circle cx="130" cy="75" r="3" fill="#60a5fa" opacity="0.8"><animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite"/></circle><circle cx="70" cy="125" r="2.5" fill="#a78bfa" opacity="0.6"><animate attributeName="r" values="1.5;3.5;1.5" dur="3s" repeatCount="indefinite"/></circle><defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient><linearGradient id="lg2" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs></svg>';

const LAYER_COLORS: Record<string, string> = {
  satellites: '#a78bfa', aircraft: '#60a5fa', earthquakes: '#ef4444',
  fires: '#f97316', weather: '#94a3b8', nightlights: '#fbbf24',
  volcanoes: '#dc2626', weatheralerts: '#f59e0b', gdacs: '#ec4899',
};

export class LoadingOverlay {
  private overlay: HTMLElement;
  private itemsContainer: HTMLElement;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'loading-overlay';

    const box = document.createElement('div');
    box.className = 'loading-box';

    // Animated globe wireframe (static SVG, no user input)
    const globeWrap = document.createElement('div');
    globeWrap.className = 'loading-globe';
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(GLOBE_SVG, 'image/svg+xml');
    const svgEl = svgDoc.documentElement;
    globeWrap.appendChild(document.importNode(svgEl, true));

    const title = document.createElement('div');
    title.className = 'loading-title';
    title.textContent = 'Live Global Tracker';

    const tagline = document.createElement('div');
    tagline.className = 'loading-tagline';
    tagline.textContent = 'Watch Earth breathe';

    this.itemsContainer = document.createElement('div');
    this.itemsContainer.className = 'loading-items';

    box.appendChild(globeWrap);
    box.appendChild(title);
    box.appendChild(tagline);
    box.appendChild(this.itemsContainer);
    this.overlay.appendChild(box);
    document.body.appendChild(this.overlay);
  }

  track(manager: LayerManager): void {
    const layers = manager.getAll().filter((l) => l.manifest.defaultEnabled);
    const itemEls = new Map<string, HTMLElement>();

    for (const layer of layers) {
      const item = document.createElement('div');
      item.className = 'loading-item';

      const color = LAYER_COLORS[layer.manifest.id] ?? '#60a5fa';

      const dot = document.createElement('span');
      dot.className = 'loading-dot';
      dot.style.background = color;

      const name = document.createElement('span');
      name.className = 'loading-name';
      name.textContent = layer.manifest.name;

      const status = document.createElement('span');
      status.className = 'loading-status';
      status.textContent = 'connecting...';

      const progressTrack = document.createElement('div');
      progressTrack.className = 'loading-progress-track';
      const progressFill = document.createElement('div');
      progressFill.className = 'loading-progress-fill';
      progressFill.style.background = color;
      progressTrack.appendChild(progressFill);

      item.appendChild(dot);
      item.appendChild(name);
      item.appendChild(progressTrack);
      item.appendChild(status);
      this.itemsContainer.appendChild(item);
      itemEls.set(layer.manifest.id, item);
    }

    this.pollTimer = setInterval(() => {
      let allDone = true;

      for (const layer of layers) {
        const el = itemEls.get(layer.manifest.id);
        if (!el) continue;

        const s = layer.getStatus();
        const statusEl = el.querySelector('.loading-status') as HTMLElement;
        const fillEl = el.querySelector('.loading-progress-fill') as HTMLElement;

        if (s === 'loaded') {
          el.classList.add('done');
          statusEl.textContent = `${layer.getFeatureCount().toLocaleString()} loaded`;
          fillEl.style.width = '100%';
        } else if (s === 'error') {
          el.classList.add('error');
          statusEl.textContent = layer.getError() ?? 'failed';
          fillEl.style.width = '100%';
          fillEl.style.background = 'var(--accent-danger)';
        } else {
          allDone = false;
        }
      }

      if (allDone) {
        this.dismiss();
      }
    }, 200);
  }

  private dismiss(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.overlay.classList.add('fade-out');
    setTimeout(() => this.overlay.remove(), 800);
  }

  destroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.overlay.remove();
  }
}
