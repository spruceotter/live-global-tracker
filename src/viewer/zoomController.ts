import * as Cesium from 'cesium';
import type { LayerManager } from '../core/LayerManager';
import { set3DBuildingsVisible, is3DBuildingsAvailable } from './buildings3d';

export type ZoomLevel = 'orbital' | 'continental' | 'regional' | 'local';

const THRESHOLDS = {
  orbital: 8_000_000,
  continental: 1_000_000,
  regional: 100_000,
};

const LAYER_HIDE_ABOVE: Record<string, number> = {};

const LAYER_HIDE_BELOW: Record<string, number> = {
  satellites: 200_000,
};

const BUILDINGS_THRESHOLD = 50_000; // Show 3D buildings below 50km

export function setupZoomController(
  viewer: Cesium.Viewer,
  manager: LayerManager
): void {
  let currentLevel: ZoomLevel = 'orbital';

  const update = () => {
    const height = viewer.camera.positionCartographic.height;

    let newLevel: ZoomLevel;
    if (height > THRESHOLDS.orbital) newLevel = 'orbital';
    else if (height > THRESHOLDS.continental) newLevel = 'continental';
    else if (height > THRESHOLDS.regional) newLevel = 'regional';
    else newLevel = 'local';

    if (newLevel === currentLevel) return;
    currentLevel = newLevel;

    // Data layer visibility
    for (const layer of manager.getAll()) {
      const id = layer.manifest.id;
      const hideAbove = LAYER_HIDE_ABOVE[id];
      const hideBelow = LAYER_HIDE_BELOW[id];

      if (hideAbove && height > hideAbove) {
        layer.setVisible(false);
      } else if (hideBelow && height < hideBelow) {
        layer.setVisible(false);
      } else if (layer.getLastUpdated() !== null) {
        layer.setVisible(true);
      }
    }

    // 3D buildings at local zoom
    if (is3DBuildingsAvailable()) {
      set3DBuildingsVisible(height < BUILDINGS_THRESHOLD);
    }
  };

  viewer.camera.changed.addEventListener(update);
  viewer.camera.percentageChanged = 0.1;
}
