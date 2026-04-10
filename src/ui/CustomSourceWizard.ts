import type { LayerManager } from '../core/LayerManager';
import type { DataSourceStore } from '../core/DataSourceStore';
import type { CatalogRegistry } from '../core/CatalogRegistry';
import type { LayerManifest, RenderStrategy } from '../core/types';

export class CustomSourceWizard {
  private overlay: HTMLElement;
  private visible = false;
  private manager: LayerManager;
  private store: DataSourceStore;
  private catalog: CatalogRegistry;

  constructor(manager: LayerManager, store: DataSourceStore, catalog: CatalogRegistry) {
    this.manager = manager;
    this.store = store;
    this.catalog = catalog;

    this.overlay = document.createElement('div');
    this.overlay.className = 'wizard-overlay';

    const modal = document.createElement('div');
    modal.className = 'wizard-modal glass';

    const header = document.createElement('div');
    header.className = 'wizard-header';

    const title = document.createElement('h2');
    title.textContent = 'Add Custom Data Source';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'cm-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    const form = document.createElement('div');
    form.className = 'wizard-form';

    // Name
    const nameInput = this.createField(form, 'Name', 'text', 'My Data Source');
    // URL
    const urlInput = this.createField(form, 'Data URL', 'url', 'https://api.example.com/data.json');
    // Format
    const formatSelect = this.createSelect(form, 'Format', ['json', 'geojson', 'csv']);
    // Renderer
    const rendererSelect = this.createSelect(form, 'Visualization', [
      'point-cloud:Points',
      'billboard:Directional Icons',
      'polyline:Lines/Routes',
      'polygon:Filled Regions',
      'heatmap:Density Heatmap',
    ]);
    // Max entities
    const maxInput = this.createField(form, 'Max Entities', 'number', '10000');
    // Refresh interval
    const refreshInput = this.createField(form, 'Refresh (seconds, 0 = once)', 'number', '0');
    // Color
    const colorInput = this.createField(form, 'Point Color', 'text', '#60a5fa');

    // Submit
    const submitBtn = document.createElement('button');
    submitBtn.className = 'cm-btn cm-btn-primary';
    submitBtn.style.width = '100%';
    submitBtn.style.marginTop = '16px';
    submitBtn.textContent = 'Add to Globe';
    submitBtn.addEventListener('click', async () => {
      const name = (nameInput as HTMLInputElement).value.trim() || 'Custom Source';
      const url = (urlInput as HTMLInputElement).value.trim();
      if (!url) return;

      const format = (formatSelect as HTMLSelectElement).value as 'json' | 'csv' | 'geojson';
      const rendererVal = (rendererSelect as HTMLSelectElement).value;
      const strategy = rendererVal.split(':')[0] as RenderStrategy;
      const maxEntities = parseInt((maxInput as HTMLInputElement).value, 10) || 10000;
      const refreshSec = parseInt((refreshInput as HTMLInputElement).value, 10) || 0;
      const color = (colorInput as HTMLInputElement).value.trim() || '#60a5fa';

      const id = `custom-${Date.now()}`;
      const manifest: LayerManifest = {
        id,
        name,
        category: 'environment',
        icon: 'quake',
        description: `Custom data from ${new URL(url).hostname}`,
        source: { url, format, proxied: false, auth: { kind: 'none' } },
        rendering: {
          strategy,
          maxEntities,
          style: {
            attribute: 'category',
            stops: [{ value: 'default', color, size: 4 }],
            defaultColor: color,
            defaultSize: 4,
          },
          lod: {},
        },
        refresh: refreshSec > 0 ? { kind: 'poll', intervalMs: refreshSec * 1000 } : { kind: 'one-shot' },
        cache: { ttlMs: Math.max(refreshSec * 1000, 60000), staleWhileRevalidate: true },
        interaction: { detailFields: [{ label: 'Name', path: 'label', format: 'text' }] },
        requiredKeys: [],
        defaultEnabled: true,
        order: 99,
      };

      submitBtn.textContent = 'Loading...';
      submitBtn.disabled = true;

      try {
        await this.manager.registerDynamic(manifest);
        this.store.saveCustomSource({
          manifest,
          origin: 'custom',
          isFree: true,
          updateFrequencyLabel: refreshSec > 0 ? `Every ${refreshSec}s` : 'One-shot',
          dataFormatLabel: format.toUpperCase(),
          requiresKey: false,
          keyUrl: '',
          keyLabel: '',
        });
        this.catalog.registerEntry({
          manifest,
          origin: 'custom',
          isFree: true,
          updateFrequencyLabel: refreshSec > 0 ? `Every ${refreshSec}s` : 'One-shot',
          dataFormatLabel: format.toUpperCase(),
          requiresKey: false,
          keyUrl: '',
          keyLabel: '',
        });
        this.close();
      } catch (err) {
        submitBtn.textContent = `Error: ${(err as Error).message}`;
        submitBtn.disabled = false;
        setTimeout(() => { submitBtn.textContent = 'Add to Globe'; }, 3000);
      }
    });

    form.appendChild(submitBtn);
    modal.appendChild(header);
    modal.appendChild(form);
    this.overlay.appendChild(modal);
    document.body.appendChild(this.overlay);
  }

  open(): void {
    this.visible = true;
    this.overlay.classList.add('open');
  }

  close(): void {
    this.visible = false;
    this.overlay.classList.remove('open');
  }

  private createField(parent: HTMLElement, label: string, type: string, placeholder: string): HTMLElement {
    const group = document.createElement('div');
    group.className = 'wizard-field';

    const labelEl = document.createElement('label');
    labelEl.className = 'settings-label';
    labelEl.textContent = label;

    const input = document.createElement('input');
    input.type = type;
    input.className = 'cm-key-input';
    input.placeholder = placeholder;

    group.appendChild(labelEl);
    group.appendChild(input);
    parent.appendChild(group);
    return input;
  }

  private createSelect(parent: HTMLElement, label: string, options: string[]): HTMLElement {
    const group = document.createElement('div');
    group.className = 'wizard-field';

    const labelEl = document.createElement('label');
    labelEl.className = 'settings-label';
    labelEl.textContent = label;

    const select = document.createElement('select');
    select.className = 'cm-key-input';
    for (const opt of options) {
      const [value, text] = opt.includes(':') ? opt.split(':') : [opt, opt.toUpperCase()];
      const optEl = document.createElement('option');
      optEl.value = value;
      optEl.textContent = text;
      select.appendChild(optEl);
    }

    group.appendChild(labelEl);
    group.appendChild(select);
    parent.appendChild(group);
    return select;
  }

  destroy(): void {
    this.overlay.remove();
  }
}
