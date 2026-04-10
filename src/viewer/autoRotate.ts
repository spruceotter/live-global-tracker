import * as Cesium from 'cesium';
import { isFollowing } from './followCam';

export function setupAutoRotate(viewer: Cesium.Viewer): void {
  let rotating = true;

  viewer.clock.onTick.addEventListener(() => {
    if (rotating && !isFollowing()) {
      viewer.camera.rotateRight(Cesium.Math.toRadians(0.03));
    }
  });

  const stopRotation = () => {
    rotating = false;
  };

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(stopRotation, Cesium.ScreenSpaceEventType.LEFT_DOWN);
  handler.setInputAction(stopRotation, Cesium.ScreenSpaceEventType.WHEEL);
  handler.setInputAction(stopRotation, Cesium.ScreenSpaceEventType.PINCH_START);
}
