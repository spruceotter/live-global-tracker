import type { LayerManager } from '../core/LayerManager';

export class SystemStrip {
  private container: HTMLElement;
  private timeEl: HTMLElement;
  private totalEl: HTMLElement;
  private manager: LayerManager;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(manager: LayerManager) {
    this.manager = manager;

    this.container = document.createElement('div');
    this.container.className = 'system-strip';

    this.timeEl = document.createElement('span');
    this.timeEl.className = 'strip-time';

    const div1 = document.createElement('span');
    div1.className = 'strip-divider';

    this.totalEl = document.createElement('span');
    this.totalEl.className = 'strip-total';

    const div2 = document.createElement('span');
    div2.className = 'strip-divider';

    const pulse = document.createElement('span');
    pulse.className = 'strip-pulse';

    this.container.appendChild(this.timeEl);
    this.container.appendChild(div1);
    this.container.appendChild(this.totalEl);
    this.container.appendChild(div2);
    this.container.appendChild(pulse);

    document.body.appendChild(this.container);

    this.update();
    this.timer = setInterval(() => this.update(), 1000);
  }

  private update(): void {
    const now = new Date();
    this.timeEl.textContent = `${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}:${now.getUTCSeconds().toString().padStart(2, '0')} UTC`;

    const total = this.manager.getAll()
      .filter((l) => l.isVisible())
      .reduce((sum, l) => sum + l.getFeatureCount(), 0);

    this.totalEl.textContent = `${total.toLocaleString()} entities tracked`;
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.container.remove();
  }
}
