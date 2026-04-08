import type { NormalizedFeature, DetailField } from '../core/types';

export class InfoCard {
  private container: HTMLElement;
  private visible = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'info-card glass';
    document.body.appendChild(this.container);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  show(feature: NormalizedFeature, fields: DetailField[]): void {
    this.container.replaceChildren();

    // Header with label
    const header = document.createElement('div');
    header.className = 'info-card-header';

    const title = document.createElement('h3');
    title.className = 'info-card-title';
    title.textContent = feature.label ?? feature.id;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'info-card-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    this.container.appendChild(header);

    // Fields
    for (const field of fields) {
      const value = this.resolvePath(feature as unknown as Record<string, unknown>, field.path);
      if (value == null) continue;

      const row = document.createElement('div');
      row.className = 'info-card-field';

      const labelEl = document.createElement('span');
      labelEl.className = 'field-label';
      labelEl.textContent = field.label;

      const valueEl = document.createElement('span');
      valueEl.className = 'field-value';
      valueEl.textContent = this.formatValue(value, field.format);

      row.appendChild(labelEl);
      row.appendChild(valueEl);
      this.container.appendChild(row);
    }

    this.container.classList.add('open');
    this.visible = true;
  }

  close(): void {
    this.container.classList.remove('open');
    this.visible = false;
  }

  isOpen(): boolean {
    return this.visible;
  }

  private resolvePath(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((curr: unknown, key) => {
      if (curr && typeof curr === 'object') return (curr as Record<string, unknown>)[key];
      return undefined;
    }, obj as unknown);
  }

  private formatValue(value: unknown, format?: string): string {
    if (value == null) return '--';
    switch (format) {
      case 'number':
        return typeof value === 'number'
          ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
          : String(value);
      case 'date':
        return typeof value === 'number'
          ? new Date(value).toLocaleString()
          : String(value);
      case 'latlon':
        return typeof value === 'number' ? value.toFixed(4) : String(value);
      default:
        return String(value);
    }
  }

  destroy(): void {
    this.container.remove();
  }
}
