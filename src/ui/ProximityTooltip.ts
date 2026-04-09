import * as Cesium from 'cesium';
import type { LayerManager } from '../core/LayerManager';
import type { PointCloudRenderer } from '../rendering/renderers/PointCloudRenderer';

export class ProximityTooltip {
  private el: HTMLElement;
  private viewer: Cesium.Viewer;
  private manager: LayerManager;
  private rafId: number | null = null;
  private lastPickTime = 0;

  constructor(viewer: Cesium.Viewer, manager: LayerManager) {
    this.viewer = viewer;
    this.manager = manager;

    this.el = document.createElement('div');
    this.el.className = 'proximity-tooltip';
    document.body.appendChild(this.el);

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(
      (movement: { endPosition: Cesium.Cartesian2 }) => {
        this.onMouseMove(movement.endPosition);
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );
  }

  private onMouseMove(position: Cesium.Cartesian2): void {
    // Throttle to ~20fps
    const now = performance.now();
    if (now - this.lastPickTime < 50) return;
    this.lastPickTime = now;

    const picked = this.viewer.scene.pick(position);
    if (!picked) {
      this.hide();
      return;
    }

    let label: string | null = null;

    // Entity (earthquakes)
    if (picked.id && picked.id instanceof Cesium.Entity) {
      const props = picked.id.properties;
      if (props) {
        const layerId = props.layerId?.getValue(this.viewer.clock.currentTime);
        const featureId = props.featureId?.getValue(this.viewer.clock.currentTime);
        if (layerId && featureId) {
          const layer = this.manager.getById(layerId);
          const feature = layer?.getFeatureById(featureId);
          if (feature) {
            const mag = feature.properties.mag;
            const depth = feature.properties.depth;
            label = `${feature.label} \u2014 M${mag}, ${depth}km depth`;
          }
        }
      }
    }

    // PointPrimitive (satellites, aircraft, fires)
    if (!label && picked.collection instanceof Cesium.PointPrimitiveCollection) {
      const point = picked.primitive;
      const idx = (point as unknown as { _index: number })._index ?? -1;
      if (idx >= 0) {
        for (const layer of this.manager.getAll()) {
          const layerAny = layer as unknown as { renderer?: PointCloudRenderer };
          if (layerAny.renderer && layerAny.renderer.getCollection?.() === picked.collection) {
            const fid = layerAny.renderer!.getFeatureIdAtIndex(idx);
            const feature = fid ? layer.getFeatureById(fid) : null;
            if (feature) {
              if (layer.manifest.id === 'satellites') {
                const alt = feature.properties.altKm;
                label = `${feature.label} \u2014 ${alt} km`;
              } else if (layer.manifest.id === 'aircraft') {
                label = `${feature.label} \u2014 ${feature.properties.altitude}`;
              } else if (layer.manifest.id === 'fires') {
                const frp = feature.properties.frp;
                label = `Fire \u2014 FRP ${frp} MW`;
              } else {
                label = feature.label ?? feature.id;
              }
            }
            break;
          }
        }
      }
    }

    if (label) {
      this.show(label, position);
    } else {
      this.hide();
    }
  }

  private show(text: string, position: Cesium.Cartesian2): void {
    this.el.textContent = text;
    this.el.classList.add('visible');
    this.el.style.left = `${position.x + 16}px`;
    this.el.style.top = `${position.y}px`;
  }

  private hide(): void {
    this.el.classList.remove('visible');
  }

  destroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.el.remove();
  }
}
