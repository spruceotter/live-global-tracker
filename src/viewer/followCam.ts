import * as Cesium from 'cesium';

let tracking = false;
let trackingFeature: { lat: number; lon: number; alt?: number; properties: Record<string, unknown> } | null = null;
let trackingLayerId: string | null = null;
let preRenderListener: Cesium.Event.RemoveCallback | null = null;
let hudEl: HTMLElement | null = null;

export function startFollowCam(
  viewer: Cesium.Viewer,
  feature: { lat: number; lon: number; alt?: number; label?: string; properties: Record<string, unknown> },
  layerId: string
): void {
  stopFollowCam(viewer);
  tracking = true;
  trackingFeature = feature;
  trackingLayerId = layerId;

  // Create HUD overlay
  hudEl = document.createElement('div');
  hudEl.className = 'follow-hud';
  document.body.appendChild(hudEl);

  // Pre-render listener to update camera each frame
  preRenderListener = viewer.scene.preRender.addEventListener(() => {
    if (!tracking || !trackingFeature) return;

    const pos = Cesium.Cartesian3.fromDegrees(
      trackingFeature.lon,
      trackingFeature.lat,
      (trackingFeature.alt ?? 0) + 500_000
    );

    const heading = typeof trackingFeature.properties.heading === 'number'
      ? Cesium.Math.toRadians(trackingFeature.properties.heading as number)
      : 0;

    viewer.camera.setView({
      destination: pos,
      orientation: {
        heading,
        pitch: Cesium.Math.toRadians(-35),
        roll: 0,
      },
    });

    // Update HUD
    if (hudEl) {
      const alt = trackingFeature.alt ?? 0;
      const speed = trackingFeature.properties.velocity ?? trackingFeature.properties.velocityKmS ?? '';
      const hdg = trackingFeature.properties.heading ?? '';
      const label = (trackingFeature as { label?: string }).label ?? '';
      hudEl.textContent = `TRACKING: ${label}  |  ALT: ${Math.round(alt).toLocaleString()}m  |  HDG: ${hdg}\u00B0  |  SPD: ${speed}`;
    }
  });

  // ESC to exit
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      stopFollowCam(viewer);
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

export function stopFollowCam(viewer: Cesium.Viewer): void {
  tracking = false;
  trackingFeature = null;
  trackingLayerId = null;
  if (preRenderListener) {
    preRenderListener();
    preRenderListener = null;
  }
  if (hudEl) {
    hudEl.remove();
    hudEl = null;
  }
}

export function updateFollowTarget(
  feature: { lat: number; lon: number; alt?: number; properties: Record<string, unknown> }
): void {
  if (tracking) {
    trackingFeature = feature;
  }
}

export function isFollowing(): boolean {
  return tracking;
}

export function getFollowingLayerId(): string | null {
  return trackingLayerId;
}
