import './styles/tokens.css';
import './styles/reset.css';
import './styles/layout.css';
import './styles/glass.css';
import './styles/panels.css';
import './styles/search.css';
import './styles/onboarding.css';
import './styles/loading.css';
import './styles/hud.css';
import './styles/connection-manager.css';
import './styles/timeline.css';
import './styles/measure.css';
import './styles/extras.css';
import './styles/responsive.css';
import './styles/cesium-overrides.css';
import './styles/your-layer.css';

import * as Cesium from 'cesium';
import { registerBuiltinRenderers } from './rendering/registerBuiltins';
import { initViewer } from './viewer/initViewer';
import { playCameraIntro } from './viewer/cameraSequence';
import { setupAutoRotate } from './viewer/autoRotate';
import { setupClickHandler } from './viewer/clickHandler';
import { setupZoomController } from './viewer/zoomController';
import { setup3DBuildings } from './viewer/buildings3d';
import { setupUrlState } from './viewer/urlState';
import { LayerManager } from './core/LayerManager';
import { SatelliteLayer } from './layers/satellites/SatelliteLayer';
import { AircraftLayer } from './layers/aircraft/AircraftLayer';
import { EarthquakeLayer } from './layers/earthquakes/EarthquakeLayer';
import { FireLayer } from './layers/fires/FireLayer';
import { WeatherLayer } from './layers/weather/WeatherLayer';
import { NightLightsLayer } from './layers/nightlights/NightLightsLayer';
import { VolcanoLayer } from './layers/volcanoes/VolcanoLayer';
import { WeatherAlertsLayer } from './layers/weatheralerts/WeatherAlertsLayer';
import { GdacsLayer } from './layers/gdacs/GdacsLayer';
import { LightningLayer } from './layers/lightning/LightningLayer';
import { GoesLayer } from './layers/goes/GoesLayer';
import { LaunchesLayer } from './layers/launches/LaunchesLayer';
import { WebcamsLayer } from './layers/webcams/WebcamsLayer';
import { WebcamPlayer } from './ui/WebcamPlayer';
import { AppHeader } from './ui/AppHeader';
import { LayerPanel } from './ui/LayerPanel';
import { InfoCard } from './ui/InfoCard';
import { SearchOverlay } from './ui/SearchOverlay';
import { ConnectionManager } from './ui/ConnectionManager';
import { CatalogRegistry } from './core/CatalogRegistry';
import { DataSourceStore } from './core/DataSourceStore';
import { BUILT_IN_CATALOG } from './core/catalogEntries';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { ProximityTooltip } from './ui/ProximityTooltip';
import { SystemStrip } from './ui/SystemStrip';
import { TimelineBar } from './ui/TimelineBar';
import { FileDropZone } from './ui/FileDropZone';
import { MeasureTools } from './ui/MeasureTools';
import { startFollowCam, stopFollowCam, isFollowing } from './viewer/followCam';
import { Onboarding } from './ui/Onboarding';
import { ExportTools } from './ui/ExportTools';
import { KeyboardShortcuts } from './ui/KeyboardShortcuts';
import { Bookmarks } from './ui/Bookmarks';
import { CustomSourceWizard } from './ui/CustomSourceWizard';
import { EphemeralPinStore, type EphemeralPin } from './core/EphemeralPin';
import { ContextRibbon } from './ui/ContextRibbon';
import { PhotoDropZone } from './ui/PhotoDropZone';
import { PrivacyModal } from './ui/PrivacyModal';
import { setSatRecordsProvider } from './services/historical/historicalTle';
import { AttributionPanel } from './ui/AttributionPanel';

function showWebGLError(): void {
  const container = document.getElementById('cesiumContainer');
  if (!container) return;
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';

  const msg = document.createElement('div');
  msg.style.cssText =
    'max-width:480px;padding:32px;background:rgba(15,20,35,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:16px;text-align:center;font-family:var(--font-ui);color:var(--text-primary);';

  const title = document.createElement('h2');
  title.textContent = 'WebGL Required';
  title.style.cssText = 'margin:0 0 12px;font-weight:400;font-size:20px;';

  const body = document.createElement('p');
  body.textContent =
    'Live Global Tracker requires a browser with WebGL support to render the 3D globe. Please try Chrome, Firefox, or Safari with hardware acceleration enabled.';
  body.style.cssText = 'margin:0;color:rgba(255,255,255,0.6);line-height:1.6;font-size:14px;';

  msg.appendChild(title);
  msg.appendChild(body);
  container.appendChild(msg);
}

async function main() {
  registerBuiltinRenderers();
  let viewer;
  try {
    viewer = await initViewer('cesiumContainer');
  } catch (err) {
    console.error('Failed to initialize Cesium viewer:', err);
    showWebGLError();
    return;
  }

  const manager = new LayerManager();
  manager.setViewer(viewer);

  const satelliteLayer = new SatelliteLayer();
  manager.register(satelliteLayer);
  manager.register(new AircraftLayer());
  manager.register(new EarthquakeLayer());
  manager.register(new FireLayer());
  manager.register(new WeatherLayer());
  manager.register(new NightLightsLayer());
  manager.register(new VolcanoLayer());
  manager.register(new WeatherAlertsLayer());
  manager.register(new GdacsLayer());
  const lightningLayer = new LightningLayer();
  const goesLayer = new GoesLayer();
  manager.register(lightningLayer);
  manager.register(goesLayer);
  manager.register(new LaunchesLayer());
  manager.register(new WebcamsLayer());

  // GOES cloud imagery mutually excludes the OpenWeatherMap "Precipitation"
  // tiles — two translucent overlays stacked muddy up the globe. Whichever
  // the user toggles on wins; the other switches off transparently.
  let mutexBusy = false;
  const weatherLayer = manager.getById('weather');
  if (weatherLayer) {
    const handleToggle = (turnedOn: 'goes-clouds' | 'weather') => {
      if (mutexBusy) return;
      mutexBusy = true;
      try {
        if (turnedOn === 'goes-clouds' && weatherLayer.isVisible()) {
          weatherLayer.setVisible(false);
        } else if (turnedOn === 'weather' && goesLayer.isVisible()) {
          goesLayer.setVisible(false);
        }
      } finally {
        mutexBusy = false;
      }
    };
    // Simple observer: poll visibility flags on the next tick after toggles.
    // LayerManager doesn't expose change events today; a short poll is good
    // enough for a two-way exclusion and avoids invasive refactors.
    let lastGoes = goesLayer.isVisible();
    let lastWeather = weatherLayer.isVisible();
    setInterval(() => {
      const nowGoes = goesLayer.isVisible();
      const nowWeather = weatherLayer.isVisible();
      if (nowGoes && !lastGoes) handleToggle('goes-clouds');
      if (nowWeather && !lastWeather) handleToggle('weather');
      lastGoes = nowGoes;
      lastWeather = nowWeather;
    }, 250);
  }

  // Data Source Manager (initialize before layers so persisted configs are available)
  const catalog = new CatalogRegistry();
  const dsStore = new DataSourceStore();
  for (const entry of BUILT_IN_CATALOG) {
    catalog.registerEntry(entry);
  }
  for (const custom of dsStore.getCustomSources()) {
    catalog.registerEntry(custom);
  }

  // Loading overlay
  const loadingOverlay = new LoadingOverlay();
  loadingOverlay.track(manager);

  // Camera intro + data loading in parallel
  await Promise.all([
    playCameraIntro(viewer),
    manager.initializeAll(),
  ]);

  setupAutoRotate(viewer);
  setupZoomController(viewer, manager);
  setup3DBuildings(viewer);
  setupUrlState(viewer, manager);

  // HUD UI
  const customWizard = new CustomSourceWizard(manager, dsStore, catalog);
  const connectionManager = new ConnectionManager(manager, catalog, dsStore);
  const appHeader = new AppHeader(connectionManager);
  const infoCard = new InfoCard((feature, layerId) => {
    startFollowCam(viewer, feature, layerId);
  });
  setupClickHandler(viewer, manager, infoCard);
  new ProximityTooltip(viewer, manager);
  new LayerPanel(manager);
  new SystemStrip(manager);
  new TimelineBar(viewer);
  new FileDropZone(viewer, manager);
  const measureTools = new MeasureTools(viewer);
  const exportTools = new ExportTools(viewer);
  const searchOverlay = new SearchOverlay(viewer, manager);

  const bookmarks = new Bookmarks(viewer, () =>
    manager.getAll().filter((l) => l.isVisible()).map((l) => l.manifest.id)
  );
  appHeader.addButton('\u2606', 'Bookmarks', () => bookmarks.toggle());
  appHeader.addButton('+', 'Add Custom Source', () => customWizard.open());

  const shortcuts = new KeyboardShortcuts(
    viewer,
    manager,
    exportTools,
    () => searchOverlay.open(),
    () => connectionManager.toggle(),
    () => document.querySelector('.measure-toolbar')?.classList.toggle('visible')
  );
  appHeader.setHelpAction(() => shortcuts.toggle());

  // --- Your Layer ---
  // EXIF photo drop → ephemeral pin → historical context ribbon.
  // Pin rendering lives in a dedicated CustomDataSource so pins survive the
  // layer-manager toggle model (they are user artifacts, not a data feed).
  const pinStore = new EphemeralPinStore();
  new PrivacyModal();
  const ribbon = new ContextRibbon(pinStore);
  new PhotoDropZone(viewer, pinStore, ribbon);

  // Allow the historical-TLE provider to read the already-loaded satRecords
  setSatRecordsProvider(() => satelliteLayer.getSatRecords());

  // Render pins on the globe. Subscribe to store changes and rebuild entities.
  const pinDataSource = new Cesium.CustomDataSource('your-layer-pins');
  viewer.dataSources.add(pinDataSource);
  const renderPins = (pins: EphemeralPin[]) => {
    pinDataSource.entities.removeAll();
    for (const pin of pins) {
      pinDataSource.entities.add({
        id: pin.id,
        position: Cesium.Cartesian3.fromDegrees(pin.lon, pin.lat),
        billboard: {
          image: pinSvgDataUrl(),
          width: 32,
          height: 40,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: pin.photoName,
          font: '12px Inter, sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, -44),
          fillColor: Cesium.Color.fromCssColorString('#e0e6f0'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          scale: 0.85,
        },
        properties: new Cesium.PropertyBag({
          layerId: 'your-layer',
          featureId: pin.id,
        }),
      });
    }
    viewer.scene.requestRender();
  };
  pinStore.subscribe(renderPins);
  renderPins(pinStore.list()); // Initial render for any pins restored from sessionStorage

  // Viewport ring
  const ring = document.createElement('div');
  ring.className = 'viewport-ring active';
  document.body.appendChild(ring);

  // Required upstream credits — keeps NASA / NOAA / Blitzortung ToS happy
  new AttributionPanel();

  // Live webcam player (listens for 'webcam:play' dispatched by click handler)
  new WebcamPlayer();

  // First-time onboarding (after all UI is mounted)
  new Onboarding();

  // Debug exposure — let me test SATCAT enrichment from the browser console
  // without having to synthesize Cesium pick events. Remove before ship.
  (window as unknown as Record<string, unknown>).__lgt = { viewer, manager, infoCard, pinStore, ribbon };

  console.log(
    `Live Global Tracker initialized with ${manager.getAll().reduce((s, l) => s + l.getFeatureCount(), 0).toLocaleString()} entities`
  );
}

/** Inline SVG pin icon so we don't need an asset import. Gradient fill
 * keeps it recognizable as a "Your Layer" artifact vs. any data-layer dot. */
function pinSvgDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#a78bfa"/>
        <stop offset="1" stop-color="#60a5fa"/>
      </linearGradient>
    </defs>
    <path fill="url(#g)" stroke="#0a0e17" stroke-width="2"
      d="M16 2 C 8 2, 2 8, 2 16 C 2 24, 16 38, 16 38 C 16 38, 30 24, 30 16 C 30 8, 24 2, 16 2 Z"/>
    <circle cx="16" cy="15" r="5" fill="#0a0e17"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

main().catch(console.error);
