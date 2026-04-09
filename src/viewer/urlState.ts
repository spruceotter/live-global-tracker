import * as Cesium from 'cesium';
import type { LayerManager } from '../core/LayerManager';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function setupUrlState(
  viewer: Cesium.Viewer,
  manager: LayerManager
): void {
  // Restore state from URL on load
  restoreFromHash(viewer, manager);

  // Save state to URL on camera/layer changes (debounced)
  viewer.camera.changed.addEventListener(() => saveToHash(viewer, manager));
}

function saveToHash(viewer: Cesium.Viewer, manager: LayerManager): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const carto = viewer.camera.positionCartographic;
    const lat = Cesium.Math.toDegrees(carto.latitude).toFixed(2);
    const lon = Cesium.Math.toDegrees(carto.longitude).toFixed(2);
    const alt = Math.round(carto.height);
    const heading = Math.round(Cesium.Math.toDegrees(viewer.camera.heading));
    const pitch = Math.round(Cesium.Math.toDegrees(viewer.camera.pitch));

    const activeLayers = manager
      .getAll()
      .filter((l) => l.isVisible())
      .map((l) => l.manifest.id)
      .join(',');

    const hash = `#cam=${lat},${lon},${alt},h${heading},p${pitch}&layers=${activeLayers}`;
    history.replaceState(null, '', hash);
  }, 500);
}

function restoreFromHash(viewer: Cesium.Viewer, manager: LayerManager): void {
  const hash = window.location.hash;
  if (!hash || hash.length < 5) return;

  const params = new URLSearchParams(hash.slice(1));
  const cam = params.get('cam');
  const layers = params.get('layers');

  if (cam) {
    const parts = cam.split(',');
    if (parts.length >= 3) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      const alt = parseFloat(parts[2]);
      const heading = parts[3] ? parseFloat(parts[3].replace('h', '')) : 0;
      const pitch = parts[4] ? parseFloat(parts[4].replace('p', '')) : -90;

      if (!isNaN(lat) && !isNaN(lon) && !isNaN(alt)) {
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
          orientation: {
            heading: Cesium.Math.toRadians(heading),
            pitch: Cesium.Math.toRadians(pitch),
            roll: 0,
          },
        });
      }
    }
  }

  if (layers) {
    const activeIds = new Set(layers.split(','));
    for (const layer of manager.getAll()) {
      if (activeIds.has(layer.manifest.id) && !layer.isVisible()) {
        manager.toggleLayer(layer.manifest.id);
      } else if (!activeIds.has(layer.manifest.id) && layer.isVisible()) {
        layer.setVisible(false);
      }
    }
  }
}
