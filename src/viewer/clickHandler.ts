import * as Cesium from 'cesium';
import type { LayerManager } from '../core/LayerManager';
import type { InfoCard } from '../ui/InfoCard';
import type { PointCloudRenderer } from '../rendering/renderers/PointCloudRenderer';

export function setupClickHandler(
  viewer: Cesium.Viewer,
  manager: LayerManager,
  infoCard: InfoCard
): void {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction((movement: { position: Cesium.Cartesian2 }) => {
    const picked = viewer.scene.pick(movement.position);
    if (!picked) {
      infoCard.close();
      return;
    }

    // Check if it's an Entity (earthquakes use CustomDataSource entities)
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
              infoCard.show(feature, layer.manifest.interaction.detailFields);
              return;
            }
          }
        }
      }
    }

    // Check if it's a PointPrimitive (satellites, aircraft, fires)
    // scene.pick() returns { primitive: PointPrimitive, collection: PointPrimitiveCollection }
    if (picked.collection instanceof Cesium.PointPrimitiveCollection) {
      const collection = picked.collection;
      // The picked primitive is the individual PointPrimitive; get its index
      const point = picked.primitive;
      const pointIndex = (point as unknown as { _index: number })._index ?? -1;
      if (pointIndex < 0) {
        infoCard.close();
        return;
      }

      // Find which layer owns this collection
      for (const layer of manager.getAll()) {
        const layerAny = layer as unknown as { renderer?: PointCloudRenderer };
        if (
          layerAny.renderer &&
          typeof layerAny.renderer.getCollection === 'function' &&
          layerAny.renderer.getCollection() === collection
        ) {
          const featureId = layerAny.renderer.getFeatureIdAtIndex(pointIndex);
          if (featureId) {
            const feature = layer.getFeatureById(featureId);
            if (feature) {
              infoCard.show(feature, layer.manifest.interaction.detailFields);
              return;
            }
          }
        }
      }
    }

    infoCard.close();
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}
