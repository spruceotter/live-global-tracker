import * as Cesium from 'cesium';
import type { LayerManager } from '../core/LayerManager';
import { parseCsv } from '../pipeline/parsers/CsvParser';

export class FileDropZone {
  private overlay: HTMLElement;
  private viewer: Cesium.Viewer;
  private manager: LayerManager;

  constructor(viewer: Cesium.Viewer, manager: LayerManager) {
    this.viewer = viewer;
    this.manager = manager;

    this.overlay = document.createElement('div');
    this.overlay.className = 'drop-overlay';

    const label = document.createElement('div');
    label.className = 'drop-label';
    label.textContent = 'Drop file to visualize on globe';

    const hint = document.createElement('div');
    hint.className = 'drop-hint';
    hint.textContent = 'KML, GeoJSON, or CSV with lat/lon columns';

    this.overlay.appendChild(label);
    this.overlay.appendChild(hint);
    document.body.appendChild(this.overlay);

    // Drag events on document
    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      this.overlay.classList.add('visible');
    });

    this.overlay.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    });

    this.overlay.addEventListener('dragleave', (e) => {
      if (e.target === this.overlay) {
        this.overlay.classList.remove('visible');
      }
    });

    this.overlay.addEventListener('drop', (e) => {
      e.preventDefault();
      this.overlay.classList.remove('visible');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleFile(files[0]);
      }
    });
  }

  private async handleFile(file: File): Promise<void> {
    const name = file.name.toLowerCase();
    const text = await file.text();

    try {
      if (name.endsWith('.kml') || name.endsWith('.kmz')) {
        await this.loadKml(file.name, text);
      } else if (name.endsWith('.geojson') || name.endsWith('.json')) {
        await this.loadGeoJson(file.name, text);
      } else if (name.endsWith('.csv')) {
        this.loadCsv(file.name, text);
      } else {
        // Try to auto-detect
        const trimmed = text.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          await this.loadGeoJson(file.name, text);
        } else if (trimmed.startsWith('<')) {
          await this.loadKml(file.name, text);
        } else {
          this.loadCsv(file.name, text);
        }
      }
      console.log(`[FileImport] Loaded ${file.name}`);
    } catch (err) {
      console.error(`[FileImport] Failed to load ${file.name}:`, err);
    }
  }

  private async loadKml(fileName: string, content: string): Promise<void> {
    const blob = new Blob([content], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const ds = await Cesium.KmlDataSource.load(url, {
      camera: this.viewer.scene.camera,
      canvas: this.viewer.scene.canvas,
    });
    ds.name = fileName;
    this.viewer.dataSources.add(ds);
    this.viewer.flyTo(ds);
    URL.revokeObjectURL(url);
  }

  private async loadGeoJson(fileName: string, content: string): Promise<void> {
    const json = JSON.parse(content);
    const ds = await Cesium.GeoJsonDataSource.load(json, {
      stroke: Cesium.Color.fromCssColorString('#60a5fa'),
      fill: Cesium.Color.fromCssColorString('#60a5fa').withAlpha(0.3),
      strokeWidth: 2,
      markerColor: Cesium.Color.fromCssColorString('#a78bfa'),
    });
    ds.name = fileName;
    this.viewer.dataSources.add(ds);
    this.viewer.flyTo(ds);
  }

  private loadCsv(fileName: string, content: string): void {
    const records = parseCsv(content);
    if (records.length === 0) return;

    // Auto-detect lat/lon columns
    const headers = Object.keys(records[0]);
    const latCol = headers.find((h) => /^(lat|latitude)$/i.test(h));
    const lonCol = headers.find((h) => /^(lon|lng|longitude)$/i.test(h));

    if (!latCol || !lonCol) {
      console.warn('[FileImport] Could not detect lat/lon columns in CSV:', headers);
      return;
    }

    // Create a ManifestLayer-style point cloud
    const ds = new Cesium.CustomDataSource(fileName);
    let count = 0;

    for (const rec of records) {
      const lat = parseFloat(rec[latCol]);
      const lon = parseFloat(rec[lonCol]);
      if (isNaN(lat) || isNaN(lon)) continue;
      if (count >= 50_000) break;

      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat),
        point: {
          pixelSize: 4,
          color: Cesium.Color.fromCssColorString('#60a5fa'),
        },
        properties: new Cesium.PropertyBag(rec),
      });
      count++;
    }

    this.viewer.dataSources.add(ds);
    if (count > 0) this.viewer.flyTo(ds);
    console.log(`[FileImport] CSV: ${count} points from ${fileName}`);
  }

  destroy(): void {
    this.overlay.remove();
  }
}
