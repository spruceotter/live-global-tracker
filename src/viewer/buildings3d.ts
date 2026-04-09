import * as Cesium from 'cesium';

let tileset: Cesium.Cesium3DTileset | null = null;
let enabled = false;

export async function setup3DBuildings(viewer: Cesium.Viewer): Promise<void> {
  try {
    // OSM Buildings via Cesium ion (asset 96188, free)
    tileset = await Cesium.Cesium3DTileset.fromIonAssetId(96188);
    tileset.show = false; // hidden by default, shown by zoom controller
    viewer.scene.primitives.add(tileset);
    enabled = true;
  } catch (err) {
    console.warn('[3D Buildings] Failed to load OSM Buildings:', err);
  }
}

export function set3DBuildingsVisible(visible: boolean): void {
  if (tileset && enabled) {
    tileset.show = visible;
  }
}

export function is3DBuildingsAvailable(): boolean {
  return enabled;
}
