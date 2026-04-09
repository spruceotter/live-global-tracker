import type { LayerManifest } from './types';

const CONFIG_PREFIX = 'lgt_dsconfig_';
const CUSTOM_SOURCES_KEY = 'lgt_custom_sources';

export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'rate-limited' | 'unconfigured';
export type SourceOrigin = 'built-in' | 'community' | 'custom';

export interface DataSourceConfig {
  sourceId: string;
  apiKey: string;
  useProxy: boolean;
  refreshIntervalOverride: number;
  maxEntitiesOverride: number;
  enabled: boolean;
  origin: SourceOrigin;
}

export interface CatalogEntry {
  manifest: LayerManifest;
  origin: SourceOrigin;
  isFree: boolean;
  updateFrequencyLabel: string;
  dataFormatLabel: string;
  requiresKey: boolean;
  keyUrl: string;
  keyLabel: string;
}

export class DataSourceStore {
  getConfig(sourceId: string): DataSourceConfig | null {
    const raw = localStorage.getItem(`${CONFIG_PREFIX}${sourceId}`);
    return raw ? JSON.parse(raw) : null;
  }

  saveConfig(config: DataSourceConfig): void {
    localStorage.setItem(`${CONFIG_PREFIX}${config.sourceId}`, JSON.stringify(config));
  }

  getAllConfigs(): DataSourceConfig[] {
    const configs: DataSourceConfig[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CONFIG_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) configs.push(JSON.parse(raw));
      }
    }
    return configs;
  }

  deleteConfig(sourceId: string): void {
    localStorage.removeItem(`${CONFIG_PREFIX}${sourceId}`);
  }

  getCustomSources(): CatalogEntry[] {
    const raw = localStorage.getItem(CUSTOM_SOURCES_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  saveCustomSource(entry: CatalogEntry): void {
    const sources = this.getCustomSources();
    const idx = sources.findIndex((s) => s.manifest.id === entry.manifest.id);
    if (idx >= 0) {
      sources[idx] = entry;
    } else {
      sources.push(entry);
    }
    localStorage.setItem(CUSTOM_SOURCES_KEY, JSON.stringify(sources));
  }

  deleteCustomSource(sourceId: string): void {
    const sources = this.getCustomSources().filter((s) => s.manifest.id !== sourceId);
    localStorage.setItem(CUSTOM_SOURCES_KEY, JSON.stringify(sources));
    this.deleteConfig(sourceId);
  }
}
