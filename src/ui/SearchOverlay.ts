import * as Cesium from 'cesium';
import type { LayerManager } from '../core/LayerManager';

interface SearchResult {
  layerId: string;
  layerName: string;
  id: string;
  label: string;
  lat: number;
  lon: number;
  alt?: number;
}

export class SearchOverlay {
  private overlay: HTMLElement;
  private input: HTMLInputElement;
  private resultsList: HTMLElement;
  private viewer: Cesium.Viewer;
  private manager: LayerManager;
  private visible = false;

  constructor(viewer: Cesium.Viewer, manager: LayerManager) {
    this.viewer = viewer;
    this.manager = manager;

    // Overlay backdrop
    this.overlay = document.createElement('div');
    this.overlay.className = 'search-overlay';

    // Search box container
    const box = document.createElement('div');
    box.className = 'search-box glass';

    // Input row
    const inputRow = document.createElement('div');
    inputRow.className = 'search-input-row';

    const searchIcon = document.createElement('span');
    searchIcon.className = 'search-icon';
    searchIcon.textContent = '\u{1F50D}';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'search-input';
    this.input.placeholder = 'Search satellites, aircraft, earthquakes, volcanoes...';

    const hint = document.createElement('span');
    hint.className = 'search-hint';
    hint.textContent = 'ESC';

    inputRow.appendChild(searchIcon);
    inputRow.appendChild(this.input);
    inputRow.appendChild(hint);

    // Results
    this.resultsList = document.createElement('div');
    this.resultsList.className = 'search-results';

    box.appendChild(inputRow);
    box.appendChild(this.resultsList);
    this.overlay.appendChild(box);
    document.body.appendChild(this.overlay);

    // Events
    this.input.addEventListener('input', () => this.onSearch());

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === 'Escape' && this.visible) {
        this.close();
      }
    });
  }

  toggle(): void {
    this.visible ? this.close() : this.open();
  }

  open(): void {
    this.visible = true;
    this.overlay.classList.add('open');
    this.input.value = '';
    this.resultsList.replaceChildren();
    setTimeout(() => this.input.focus(), 50);
  }

  close(): void {
    this.visible = false;
    this.overlay.classList.remove('open');
  }

  private onSearch(): void {
    const query = this.input.value.trim();
    if (query.length < 2) {
      this.resultsList.replaceChildren();
      return;
    }

    // Check for raw coordinates first (e.g., "37.77,-122.42")
    const coordMatch = query.match(/^(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        this.renderResults([{
          layerId: '_geo',
          layerName: 'Coordinates',
          id: 'coords',
          label: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
          lat, lon,
        }]);
        return;
      }
    }

    // Entity search across all layers
    const results: SearchResult[] = [];
    for (const layer of this.manager.getAll()) {
      if (!layer.isVisible()) continue;
      const matches = layer.search(query);
      for (const m of matches) {
        results.push({
          layerId: layer.manifest.id,
          layerName: layer.manifest.name,
          ...m,
        });
      }
      if (results.length >= 15) break;
    }

    this.renderResults(results);

    // Geocode place names via Nominatim (debounced)
    if (query.length >= 3) {
      this.geocode(query, results);
    }
  }

  private geocodeTimer: ReturnType<typeof setTimeout> | null = null;

  private geocode(query: string, existingResults: SearchResult[]): void {
    if (this.geocodeTimer) clearTimeout(this.geocodeTimer);
    this.geocodeTimer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
          { headers: { 'User-Agent': 'LiveGlobalTracker/0.4' } }
        );
        if (!response.ok) return;
        const places = await response.json() as Array<{ display_name: string; lat: string; lon: string; type: string }>;

        const geoResults: SearchResult[] = places.map((p) => ({
          layerId: '_geo',
          layerName: 'Place',
          id: `geo-${p.lat}-${p.lon}`,
          label: p.display_name,
          lat: parseFloat(p.lat),
          lon: parseFloat(p.lon),
        }));

        // Merge with existing entity results
        const merged = [...existingResults, ...geoResults].slice(0, 20);
        this.renderResults(merged);
      } catch {
        // Geocoding failed silently — entity results still shown
      }
    }, 300);
  }

  private renderResults(results: SearchResult[]): void {
    this.resultsList.replaceChildren();

    if (results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-empty';
      empty.textContent = 'No results found';
      this.resultsList.appendChild(empty);
      return;
    }

    for (const r of results) {
      const row = document.createElement('button');
      row.className = 'search-result';

      const tag = document.createElement('span');
      tag.className = 'search-result-tag';
      tag.textContent = r.layerName;

      const label = document.createElement('span');
      label.className = 'search-result-label';
      label.textContent = r.label;

      row.appendChild(tag);
      row.appendChild(label);

      row.addEventListener('click', () => {
        this.flyTo(r);
        this.close();
      });

      this.resultsList.appendChild(row);
    }
  }

  private flyTo(result: SearchResult): void {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        result.lon,
        result.lat,
        (result.alt ?? 0) + 500_000
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration: 2,
    });
  }

  destroy(): void {
    this.overlay.remove();
  }
}
