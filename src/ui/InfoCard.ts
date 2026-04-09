import type { NormalizedFeature, DetailField } from '../core/types';

const LAYER_ACCENT: Record<string, string> = {
  satellites: '#a78bfa',
  aircraft: '#60a5fa',
  earthquakes: '#ef4444',
  fires: '#f97316',
  weather: '#94a3b8',
};

export class InfoCard {
  private container: HTMLElement;
  private visible = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'info-card glass';
    document.body.appendChild(this.container);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  show(feature: NormalizedFeature, fields: DetailField[], layerId?: string): void {
    this.container.replaceChildren();

    const accent = LAYER_ACCENT[layerId ?? ''] ?? '#60a5fa';
    this.container.style.setProperty('--card-accent', accent);

    // Top accent bar
    const accentBar = document.createElement('div');
    accentBar.className = 'info-card-accent';
    this.container.appendChild(accentBar);

    // Header
    const header = document.createElement('div');
    header.className = 'info-card-header';

    const title = document.createElement('h3');
    title.className = 'info-card-title';
    title.textContent = feature.label ?? feature.id;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'info-card-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);
    this.container.appendChild(header);

    // Layer-specific mini visualization
    const viz = this.createVisualization(layerId, feature);
    if (viz) this.container.appendChild(viz);

    // Fields
    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'info-card-fields';

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
      fieldsContainer.appendChild(row);
    }

    this.container.appendChild(fieldsContainer);
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

  private createVisualization(layerId: string | undefined, feature: NormalizedFeature): HTMLElement | null {
    if (layerId === 'satellites') {
      return this.createOrbitViz();
    }
    if (layerId === 'earthquakes') {
      const mag = (feature.properties.mag as number) ?? 0;
      return this.createMagnitudeViz(mag);
    }
    if (layerId === 'aircraft') {
      const altM = feature.alt ?? 0;
      return this.createAltitudeViz(altM);
    }
    return null;
  }

  private createOrbitViz(): HTMLElement {
    const viz = document.createElement('div');
    viz.className = 'viz-orbit';

    const ring = document.createElement('span');
    ring.className = 'orbit-ring';

    const dot = document.createElement('span');
    dot.className = 'orbit-dot';

    ring.appendChild(dot);
    viz.appendChild(ring);
    return viz;
  }

  private createMagnitudeViz(mag: number): HTMLElement {
    const viz = document.createElement('div');
    viz.className = 'viz-magnitude';

    const bar = document.createElement('div');
    bar.className = 'mag-bar';

    const fill = document.createElement('div');
    fill.className = 'mag-fill';
    fill.style.width = `${Math.min(100, (mag / 9) * 100)}%`;

    bar.appendChild(fill);

    const value = document.createElement('span');
    value.className = 'mag-value';
    value.textContent = `M${mag.toFixed(1)}`;

    viz.appendChild(bar);
    viz.appendChild(value);
    return viz;
  }

  private createAltitudeViz(altMeters: number): HTMLElement {
    const viz = document.createElement('div');
    viz.className = 'viz-altitude';

    const track = document.createElement('div');
    track.className = 'alt-track';

    const marker = document.createElement('div');
    marker.className = 'alt-marker';
    const pct = Math.min(100, (altMeters / 13000) * 100);
    marker.style.bottom = `calc(${pct}% - 6px)`;

    track.appendChild(marker);

    const value = document.createElement('span');
    value.className = 'alt-value';
    value.textContent = `FL${Math.round(altMeters * 3.28084 / 100)}`;

    viz.appendChild(track);
    viz.appendChild(value);
    return viz;
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
