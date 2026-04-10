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

    // Tabs
    const tabBar = document.createElement('div');
    tabBar.className = 'info-card-tabs';
    const summaryTab = this.createTab('Summary', true);
    const detailsTab = this.createTab('Details', false);
    tabBar.appendChild(summaryTab.btn);
    tabBar.appendChild(detailsTab.btn);
    this.container.appendChild(tabBar);

    // Summary panel (fields + actions)
    const summaryPanel = document.createElement('div');
    summaryPanel.className = 'info-card-tab-panel';

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
      summaryPanel.appendChild(row);
    }

    this.container.appendChild(summaryPanel);

    // Details panel (coordinates + external links)
    const detailsPanel = document.createElement('div');
    detailsPanel.className = 'info-card-tab-panel';
    detailsPanel.style.display = 'none';

    const coordRow = document.createElement('div');
    coordRow.className = 'info-card-field';
    const coordLabel = document.createElement('span');
    coordLabel.className = 'field-label';
    coordLabel.textContent = 'Coordinates';
    const coordValue = document.createElement('span');
    coordValue.className = 'field-value';
    coordValue.textContent = `${feature.lat.toFixed(4)}, ${feature.lon.toFixed(4)}`;
    coordRow.appendChild(coordLabel);
    coordRow.appendChild(coordValue);
    detailsPanel.appendChild(coordRow);

    if (feature.alt) {
      const altRow = document.createElement('div');
      altRow.className = 'info-card-field';
      const altLabel = document.createElement('span');
      altLabel.className = 'field-label';
      altLabel.textContent = 'Altitude';
      const altValue = document.createElement('span');
      altValue.className = 'field-value';
      altValue.textContent = `${Math.round(feature.alt).toLocaleString()} m`;
      altRow.appendChild(altLabel);
      altRow.appendChild(altValue);
      detailsPanel.appendChild(altRow);
    }

    // External links
    const link = this.getExternalLink(layerId, feature);
    if (link) {
      const linkEl = document.createElement('a');
      linkEl.className = 'info-card-link';
      linkEl.href = link.url;
      linkEl.target = '_blank';
      linkEl.rel = 'noopener';
      linkEl.textContent = link.label;
      detailsPanel.appendChild(linkEl);
    }

    this.container.appendChild(detailsPanel);

    // Tab switching
    summaryTab.btn.addEventListener('click', () => {
      summaryTab.btn.classList.add('active');
      detailsTab.btn.classList.remove('active');
      summaryPanel.style.display = '';
      detailsPanel.style.display = 'none';
    });
    detailsTab.btn.addEventListener('click', () => {
      detailsTab.btn.classList.add('active');
      summaryTab.btn.classList.remove('active');
      detailsPanel.style.display = '';
      summaryPanel.style.display = 'none';
    });

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

  private createTab(label: string, active: boolean): { btn: HTMLElement } {
    const btn = document.createElement('button');
    btn.className = `info-card-tab${active ? ' active' : ''}`;
    btn.textContent = label;
    return { btn };
  }

  private getExternalLink(layerId: string | undefined, feature: NormalizedFeature): { url: string; label: string } | null {
    if (layerId === 'earthquakes' && feature.properties.url) {
      return { url: String(feature.properties.url), label: 'View on USGS' };
    }
    if (layerId === 'satellites') {
      return { url: `https://celestrak.org/NORAD/elements/table.php?INTDES=${feature.id}`, label: 'View on CelesTrak' };
    }
    if (layerId === 'volcanoes' && feature.properties.webpage) {
      return { url: String(feature.properties.webpage), label: 'Smithsonian GVP' };
    }
    return null;
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
