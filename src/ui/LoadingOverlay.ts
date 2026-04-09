import type { LayerManager } from '../core/LayerManager';

export class LoadingOverlay {
  private overlay: HTMLElement;
  private itemsContainer: HTMLElement;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'loading-overlay';

    const box = document.createElement('div');
    box.className = 'loading-box';

    const title = document.createElement('div');
    title.className = 'loading-title';
    title.textContent = 'Live Global Tracker';

    const subtitle = document.createElement('div');
    subtitle.className = 'loading-subtitle';
    subtitle.textContent = 'Loading data sources...';

    this.itemsContainer = document.createElement('div');
    this.itemsContainer.className = 'loading-items';

    box.appendChild(title);
    box.appendChild(subtitle);
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

      const spinner = document.createElement('span');
      spinner.className = 'loading-spinner';

      const name = document.createElement('span');
      name.className = 'loading-name';
      name.textContent = layer.manifest.name;

      const status = document.createElement('span');
      status.className = 'loading-status';
      status.textContent = 'loading...';

      item.appendChild(spinner);
      item.appendChild(name);
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
        const spinnerEl = el.querySelector('.loading-spinner') as HTMLElement;

        if (s === 'loaded') {
          el.classList.add('done');
          spinnerEl.textContent = '\u2713';
          spinnerEl.classList.add('check');
          statusEl.textContent = `${layer.getFeatureCount().toLocaleString()} loaded`;
        } else if (s === 'error') {
          el.classList.add('error');
          spinnerEl.textContent = '\u2717';
          spinnerEl.classList.add('check');
          statusEl.textContent = layer.getError() ?? 'failed';
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
    setTimeout(() => this.overlay.remove(), 600);
  }

  destroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.overlay.remove();
  }
}
