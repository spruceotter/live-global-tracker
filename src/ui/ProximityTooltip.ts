import * as Cesium from 'cesium';
import type { LayerManager } from '../core/LayerManager';
import type { IRenderer } from '../rendering/RendererRegistry';

export class ProximityTooltip {
  private el: HTMLElement;
  private viewer: Cesium.Viewer;
  private manager: LayerManager;
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
            label = this.formatLabel(layerId, feature);
          }
        }
      }
    }

    // Generic renderer pick (PointCloud, Billboard, etc.)
    if (!label) {
      for (const layer of this.manager.getAll()) {
        const renderer = (layer as unknown as { renderer?: IRenderer }).renderer;
        if (renderer?.ownsPickedObject) {
          const match = renderer.ownsPickedObject(picked as unknown as Record<string, unknown>);
          if (match) {
            const feature = layer.getFeatureById(match.featureId);
            if (feature) {
              label = this.formatLabel(layer.manifest.id, feature);
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

  private formatLabel(layerId: string, feature: { label?: string; id: string; properties: Record<string, unknown> }): string {
    if (layerId === 'satellites') {
      return `${feature.label} \u2014 ${feature.properties.altKm} km`;
    }
    if (layerId === 'aircraft') {
      return `${feature.label} \u2014 ${feature.properties.altitude}`;
    }
    if (layerId === 'earthquakes') {
      return `${feature.label} \u2014 M${feature.properties.mag}, ${feature.properties.depth}km`;
    }
    if (layerId === 'fires') {
      return `Fire \u2014 FRP ${feature.properties.frp} MW`;
    }
    if (layerId === 'volcanoes') {
      return `${feature.label} \u2014 ${feature.properties.elevation_m}m, ${feature.properties.country}`;
    }
    if (layerId === 'weatheralerts') {
      return `${feature.label}`;
    }
    if (layerId === 'gdacs') {
      return `${feature.label} \u2014 ${feature.properties.alertlevel}`;
    }
    return feature.label ?? feature.id;
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
    this.el.remove();
  }
}
