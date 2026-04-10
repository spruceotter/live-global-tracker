import type { CatalogRegistry } from '../core/CatalogRegistry';
import type { DataSourceStore, CatalogEntry } from '../core/DataSourceStore';
import type { LayerManager } from '../core/LayerManager';
import { testConnection } from '../core/ConnectionTester';
import { getStoredKey, setStoredKey } from '../config';

const STATUS_COLORS: Record<string, string> = {
  connected: '#34d399',
  disconnected: '#4a5568',
  error: '#ef4444',
  'rate-limited': '#fbbf24',
  unconfigured: '#94a3b8',
};

export class ConnectionManager {
  private overlay: HTMLElement;
  private sidebar: HTMLElement;
  private detail: HTMLElement;
  private sourceList: HTMLElement;
  private visible = false;
  private selectedId: string | null = null;

  constructor(
    private manager: LayerManager,
    private catalog: CatalogRegistry,
    private store: DataSourceStore
  ) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'cm-overlay';

    const modal = document.createElement('div');
    modal.className = 'cm-modal glass';

    // Header
    const header = document.createElement('div');
    header.className = 'cm-header';

    const title = document.createElement('h2');
    title.className = 'cm-title';
    title.textContent = 'Data Sources';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'cm-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Body
    const body = document.createElement('div');
    body.className = 'cm-body';

    // Sidebar
    this.sidebar = document.createElement('div');
    this.sidebar.className = 'cm-sidebar';

    const searchInput = document.createElement('input');
    searchInput.className = 'cm-search';
    searchInput.type = 'text';
    searchInput.placeholder = 'Search sources...';
    searchInput.addEventListener('input', () => this.renderSourceList(searchInput.value));

    this.sourceList = document.createElement('div');
    this.sourceList.className = 'cm-source-list';

    // Platform settings button
    const platformBtn = document.createElement('button');
    platformBtn.className = 'cm-source-item';
    platformBtn.style.marginBottom = '8px';
    platformBtn.style.borderBottom = '1px solid rgba(255,255,255,0.06)';

    const platformDot = document.createElement('span');
    platformDot.className = 'cm-source-dot';
    platformDot.style.background = getStoredKey('cesiumIonToken') ? '#34d399' : '#f59e0b';

    const platformInfo = document.createElement('span');
    platformInfo.className = 'cm-source-info';
    const platformName = document.createElement('span');
    platformName.className = 'cm-source-name';
    platformName.textContent = 'Platform Settings';
    const platformMeta = document.createElement('span');
    platformMeta.className = 'cm-source-meta';
    platformMeta.textContent = 'Cesium Ion token';
    platformInfo.appendChild(platformName);
    platformInfo.appendChild(platformMeta);
    platformBtn.appendChild(platformDot);
    platformBtn.appendChild(platformInfo);
    platformBtn.addEventListener('click', () => this.renderPlatformSettings());

    this.sidebar.appendChild(searchInput);
    this.sidebar.appendChild(platformBtn);
    this.sidebar.appendChild(this.sourceList);

    // Detail panel
    this.detail = document.createElement('div');
    this.detail.className = 'cm-detail';

    body.appendChild(this.sidebar);
    body.appendChild(this.detail);

    modal.appendChild(header);
    modal.appendChild(body);
    this.overlay.appendChild(modal);
    document.body.appendChild(this.overlay);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) this.close();
    });
  }

  open(): void {
    this.visible = true;
    this.overlay.classList.add('open');
    this.renderSourceList('');
    if (!this.selectedId) {
      const first = this.catalog.getAll()[0];
      if (first) this.selectSource(first.manifest.id);
    }
  }

  close(): void {
    this.visible = false;
    this.overlay.classList.remove('open');
  }

  toggle(): void {
    this.visible ? this.close() : this.open();
  }

  private renderSourceList(search: string): void {
    this.sourceList.replaceChildren();

    const entries = search.length >= 2
      ? this.catalog.search(search)
      : this.catalog.getAll();

    for (const entry of entries) {
      const item = document.createElement('button');
      item.className = `cm-source-item${entry.manifest.id === this.selectedId ? ' selected' : ''}`;

      const layer = this.manager.getById(entry.manifest.id);
      const isActive = layer?.isVisible() ?? false;
      const status = layer?.getStatus() ?? 'idle';

      const dot = document.createElement('span');
      dot.className = 'cm-source-dot';
      dot.style.background = isActive
        ? (status === 'error' ? STATUS_COLORS.error : STATUS_COLORS.connected)
        : STATUS_COLORS.disconnected;

      const info = document.createElement('span');
      info.className = 'cm-source-info';

      const name = document.createElement('span');
      name.className = 'cm-source-name';
      name.textContent = entry.manifest.name;

      const meta = document.createElement('span');
      meta.className = 'cm-source-meta';
      meta.textContent = isActive
        ? `${layer!.getFeatureCount().toLocaleString()} entities`
        : entry.requiresKey ? 'Key required' : 'Available';

      info.appendChild(name);
      info.appendChild(meta);

      item.appendChild(dot);
      item.appendChild(info);

      item.addEventListener('click', () => this.selectSource(entry.manifest.id));
      this.sourceList.appendChild(item);
    }
  }

  private selectSource(sourceId: string): void {
    this.selectedId = sourceId;
    this.renderSourceList('');
    this.renderDetail(sourceId);
  }

  private renderDetail(sourceId: string): void {
    this.detail.replaceChildren();
    const entry = this.catalog.getById(sourceId);
    if (!entry) return;

    const layer = this.manager.getById(sourceId);
    const config = this.store.getConfig(sourceId);

    // Header
    const header = document.createElement('div');
    header.className = 'cm-detail-header';

    const title = document.createElement('h3');
    title.textContent = entry.manifest.name;

    const badge = document.createElement('span');
    badge.className = 'cm-origin-badge';
    badge.textContent = entry.origin;

    header.appendChild(title);
    header.appendChild(badge);
    this.detail.appendChild(header);

    // Description
    const desc = document.createElement('p');
    desc.className = 'cm-detail-desc';
    desc.textContent = entry.manifest.description;
    this.detail.appendChild(desc);

    // Status section
    const statusSection = document.createElement('div');
    statusSection.className = 'cm-section';

    const statusTitle = document.createElement('div');
    statusTitle.className = 'cm-section-title';
    statusTitle.textContent = 'Connection';

    const statusGrid = document.createElement('div');
    statusGrid.className = 'cm-status-grid';

    const addStatusRow = (label: string, value: string) => {
      const l = document.createElement('span');
      l.className = 'cm-status-label';
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'cm-status-value';
      v.textContent = value;
      statusGrid.appendChild(l);
      statusGrid.appendChild(v);
    };

    const isActive = layer?.isVisible() ?? false;
    addStatusRow('Status', isActive ? (layer?.getStatus() ?? 'idle') : 'disabled');
    addStatusRow('Format', entry.dataFormatLabel);
    addStatusRow('Update', entry.updateFrequencyLabel);
    addStatusRow('Free', entry.isFree ? 'Yes' : 'Paid');

    if (layer?.getLastUpdated()) {
      const ago = Math.round((Date.now() - layer.getLastUpdated()!.getTime()) / 1000);
      addStatusRow('Last fetch', ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`);
    }
    if (isActive) {
      addStatusRow('Entities', layer!.getFeatureCount().toLocaleString());
    }

    statusSection.appendChild(statusTitle);
    statusSection.appendChild(statusGrid);
    this.detail.appendChild(statusSection);

    // Configuration section
    if (entry.requiresKey) {
      const configSection = document.createElement('div');
      configSection.className = 'cm-section';

      const configTitle = document.createElement('div');
      configTitle.className = 'cm-section-title';
      configTitle.textContent = 'Configuration';

      const keyRow = document.createElement('div');
      keyRow.className = 'cm-key-row';

      const keyInput = document.createElement('input');
      keyInput.type = 'password';
      keyInput.className = 'cm-key-input';
      keyInput.placeholder = `Enter ${entry.keyLabel}`;
      keyInput.value = config?.apiKey ?? '';

      const keyLink = document.createElement('a');
      keyLink.className = 'cm-key-link';
      keyLink.textContent = 'Get key';
      keyLink.href = entry.keyUrl;
      keyLink.target = '_blank';
      keyLink.rel = 'noopener';

      keyInput.addEventListener('change', () => {
        const c = config ?? this.createDefaultConfig(sourceId, entry);
        c.apiKey = keyInput.value.trim();
        this.store.saveConfig(c);
      });

      keyRow.appendChild(keyInput);
      keyRow.appendChild(keyLink);

      configSection.appendChild(configTitle);
      configSection.appendChild(keyRow);
      this.detail.appendChild(configSection);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'cm-actions';

    // Test button
    const testBtn = document.createElement('button');
    testBtn.className = 'cm-btn cm-btn-secondary';
    testBtn.textContent = 'Test Connection';
    testBtn.addEventListener('click', async () => {
      testBtn.textContent = 'Testing...';
      testBtn.disabled = true;
      const result = await testConnection(entry.manifest, config?.apiKey);
      testBtn.textContent = result.success ? `\u2713 ${result.message}` : `\u2717 ${result.message}`;
      testBtn.disabled = false;
      setTimeout(() => { testBtn.textContent = 'Test Connection'; }, 4000);
    });

    // Enable/disable button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = `cm-btn ${isActive ? 'cm-btn-danger' : 'cm-btn-primary'}`;
    toggleBtn.textContent = isActive ? 'Disable Layer' : 'Enable Layer';
    toggleBtn.addEventListener('click', async () => {
      await this.manager.toggleLayer(sourceId);
      const c = config ?? this.createDefaultConfig(sourceId, entry);
      c.enabled = !isActive;
      this.store.saveConfig(c);
      this.renderDetail(sourceId);
      this.renderSourceList('');
    });

    actions.appendChild(testBtn);
    actions.appendChild(toggleBtn);
    this.detail.appendChild(actions);
  }

  private createDefaultConfig(sourceId: string, entry: CatalogEntry) {
    return {
      sourceId,
      apiKey: '',
      useProxy: entry.manifest.source.proxied,
      refreshIntervalOverride: 0,
      maxEntitiesOverride: 0,
      enabled: false,
      origin: entry.origin,
    };
  }

  private renderPlatformSettings(): void {
    this.selectedId = null;
    this.renderSourceList('');
    this.detail.replaceChildren();

    const header = document.createElement('div');
    header.className = 'cm-detail-header';
    const title = document.createElement('h3');
    title.textContent = 'Platform Settings';
    header.appendChild(title);
    this.detail.appendChild(header);

    const desc = document.createElement('p');
    desc.className = 'cm-detail-desc';
    desc.textContent = 'Configure global platform settings. API keys are stored locally in your browser.';
    this.detail.appendChild(desc);

    // Cesium Ion Token
    const section = document.createElement('div');
    section.className = 'cm-section';
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'cm-section-title';
    sectionTitle.textContent = 'Cesium Ion Token (required for globe imagery)';
    section.appendChild(sectionTitle);

    const keyRow = document.createElement('div');
    keyRow.className = 'cm-key-row';
    const keyInput = document.createElement('input');
    keyInput.type = 'password';
    keyInput.className = 'cm-key-input';
    keyInput.placeholder = 'Paste your Cesium Ion token';
    keyInput.value = getStoredKey('cesiumIonToken');
    keyInput.addEventListener('change', () => {
      setStoredKey('cesiumIonToken', keyInput.value.trim());
    });

    const keyLink = document.createElement('a');
    keyLink.className = 'cm-key-link';
    keyLink.textContent = 'Get token';
    keyLink.href = 'https://ion.cesium.com/signup';
    keyLink.target = '_blank';
    keyLink.rel = 'noopener';

    keyRow.appendChild(keyInput);
    keyRow.appendChild(keyLink);
    section.appendChild(keyRow);
    this.detail.appendChild(section);

    // Save & Reload
    const actions = document.createElement('div');
    actions.className = 'cm-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'cm-btn cm-btn-primary';
    saveBtn.textContent = 'Save & Reload';
    saveBtn.addEventListener('click', () => window.location.reload());
    actions.appendChild(saveBtn);
    this.detail.appendChild(actions);
  }

  destroy(): void {
    this.overlay.remove();
  }
}
