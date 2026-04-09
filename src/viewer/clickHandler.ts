import * as Cesium from 'cesium';
import type { LayerManager } from '../core/LayerManager';
import type { InfoCard } from '../ui/InfoCard';
import type { IRenderer } from '../rendering/RendererRegistry';
import type { SatelliteLayer } from '../layers/satellites/SatelliteLayer';

export function setupClickHandler(
  viewer: Cesium.Viewer,
  manager: LayerManager,
  infoCard: InfoCard
): void {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
    const picked = viewer.scene.pick(movement.position);

    // Clear satellite orbit on any click
    const satLayer = manager.getById('satellites');
    if (satLayer && 'clearOrbit' in satLayer) {
      (satLayer as SatelliteLayer).clearOrbit();
    }

    if (!picked) {
      infoCard.close();
      return;
    }

    // Check Entity (earthquakes use CustomDataSource entities)
    if (picked.id && picked.id instanceof Cesium.Entity) {
      const entity = picked.id;
      const props = entity.properties;
      if (props) {
        const layerId = props.layerId?.getValue(viewer.clock.currentTime);
        const featureId = props.featureId?.getValue(viewer.clock.currentTime);
        if (layerId && featureId) {
          const layer = manager.getById(layerId);
          if (layer) {
            const feature = layer.getFeatureById(featureId);
            if (feature) {
              infoCard.show(feature, layer.manifest.interaction.detailFields, layer.manifest.id);
              if (layer.manifest.id === 'satellites' && 'showOrbit' in layer) {
                (layer as unknown as SatelliteLayer).showOrbit(featureId);
              }
              return;
            }
          }
        }
      }
    }

    // Generic renderer pick protocol (PointCloud, Billboard, Polyline, etc.)
    for (const layer of manager.getAll()) {
      const renderer = (layer as unknown as { renderer?: IRenderer }).renderer;
      if (renderer?.ownsPickedObject) {
        const match = renderer.ownsPickedObject(picked as unknown as Record<string, unknown>);
        if (match) {
          const feature = layer.getFeatureById(match.featureId);
          if (feature) {
            infoCard.show(feature, layer.manifest.interaction.detailFields, layer.manifest.id);
            if (layer.manifest.id === 'satellites' && 'showOrbit' in layer) {
              (layer as unknown as SatelliteLayer).showOrbit(match.featureId);
            }
            return;
          }
        }
      }
    }

    infoCard.close();
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}
