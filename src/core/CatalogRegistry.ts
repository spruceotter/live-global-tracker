import type { LayerManifest } from './types';
import type { CatalogEntry, SourceOrigin } from './DataSourceStore';

export class CatalogRegistry {
  private entries = new Map<string, CatalogEntry>();

  register(
    manifest: LayerManifest,
    meta: {
      origin: SourceOrigin;
      isFree: boolean;
      updateFrequencyLabel: string;
      dataFormatLabel: string;
      requiresKey: boolean;
      keyUrl: string;
      keyLabel: string;
    }
  ): void {
    this.entries.set(manifest.id, { manifest, ...meta });
  }

  registerEntry(entry: CatalogEntry): void {
    this.entries.set(entry.manifest.id, entry);
  }

  unregister(sourceId: string): void {
    this.entries.delete(sourceId);
  }

  getAll(): CatalogEntry[] {
    return [...this.entries.values()];
  }

  getByCategory(category: string): CatalogEntry[] {
    if (category === 'all') return this.getAll();
    return this.getAll().filter((e) => e.manifest.category === category);
  }

  getById(sourceId: string): CatalogEntry | undefined {
    return this.entries.get(sourceId);
  }

  search(query: string): CatalogEntry[] {
    const q = query.toLowerCase();
    return this.getAll().filter(
      (e) =>
        e.manifest.name.toLowerCase().includes(q) ||
        e.manifest.description.toLowerCase().includes(q) ||
        e.manifest.id.toLowerCase().includes(q)
    );
  }

  getCategories(): Array<{ id: string; label: string; count: number }> {
    const counts = new Map<string, number>();
    for (const entry of this.entries.values()) {
      const cat = entry.manifest.category;
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    const labels: Record<string, string> = {
      tracking: 'Tracking',
      hazards: 'Hazards',
      weather: 'Weather',
      environment: 'Environment',
      infrastructure: 'Infrastructure',
    };
    return [
      { id: 'all', label: 'All Sources', count: this.entries.size },
      ...Array.from(counts.entries()).map(([id, count]) => ({
        id,
        label: labels[id] ?? id,
        count,
      })),
    ];
  }
}
