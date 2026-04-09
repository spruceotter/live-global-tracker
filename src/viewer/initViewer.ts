import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { config } from '../config';

export async function initViewer(containerId: string): Promise<Cesium.Viewer> {
  // Token MUST be set before any Cesium ion calls
  Cesium.Ion.defaultAccessToken = config.cesiumIonToken;

  let viewer: Cesium.Viewer;

  try {
    viewer = new Cesium.Viewer(containerId, {
      // CRITICAL: explicit baseLayer prevents black globe
      baseLayer: Cesium.ImageryLayer.fromWorldImagery({}),
      terrain: Cesium.Terrain.fromWorldTerrain(),

      // Disable all default UI widgets
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
    });
  } catch {
    // Fallback to OpenStreetMap if ion token is invalid
    viewer = new Cesium.Viewer(containerId, {
      baseLayer: new Cesium.ImageryLayer(
        new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
        })
      ),
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
    });
  }

  // Terrain exaggeration for dramatic mountain relief
  viewer.scene.verticalExaggeration = 1.5;
  viewer.scene.verticalExaggerationRelativeHeight = 0;

  // Cinematic atmosphere
  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.dynamicAtmosphereLighting = true;
  viewer.scene.globe.dynamicAtmosphereLightingFromSun = true;
  viewer.scene.globe.showGroundAtmosphere = true;

  // Atmosphere tuning
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.hueShift = 0.0;
    viewer.scene.skyAtmosphere.saturationShift = 0.1;
    viewer.scene.skyAtmosphere.brightnessShift = -0.1;
  }

  // Bloom post-processing -- makes data points luminous
  const bloom = viewer.scene.postProcessStages.bloom;
  bloom.enabled = true;
  bloom.uniforms.contrast = 128;
  bloom.uniforms.brightness = -0.3;
  bloom.uniforms.glowOnly = false;
  bloom.uniforms.delta = 1.0;
  bloom.uniforms.sigma = 1.5;
  bloom.uniforms.stepSize = 1.0;

  // Anti-aliasing
  viewer.scene.postProcessStages.fxaa.enabled = true;

  // Stars, sun, moon
  if (viewer.scene.sun) viewer.scene.sun.show = true;
  if (viewer.scene.moon) viewer.scene.moon.show = true;

  // Initial camera: high above Atlantic, max landmass visible
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-30, 20, 40_000_000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
  });

  return viewer;
}
