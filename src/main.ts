import './styles/tokens.css';
import './styles/reset.css';
import './styles/layout.css';
import './styles/glass.css';
import './styles/panels.css';
import './styles/search.css';
import './styles/settings.css';
import './styles/loading.css';
import './styles/hud.css';
import './styles/connection-manager.css';
import './styles/timeline.css';
import './styles/measure.css';
import './styles/extras.css';
import './styles/responsive.css';
import './styles/cesium-overrides.css';

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
import { AppHeader } from './ui/AppHeader';
import { LayerPanel } from './ui/LayerPanel';
import { InfoCard } from './ui/InfoCard';
import { SearchOverlay } from './ui/SearchOverlay';
import { SettingsDrawer } from './ui/SettingsDrawer';
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
import { ExportTools } from './ui/ExportTools';
import { KeyboardShortcuts } from './ui/KeyboardShortcuts';
import { Bookmarks } from './ui/Bookmarks';

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

  manager.register(new SatelliteLayer());
  manager.register(new AircraftLayer());
  manager.register(new EarthquakeLayer());
  manager.register(new FireLayer());
  manager.register(new WeatherLayer());
  manager.register(new NightLightsLayer());
  manager.register(new VolcanoLayer());
  manager.register(new WeatherAlertsLayer());
  manager.register(new GdacsLayer());

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

  // Data Source Manager
  const catalog = new CatalogRegistry();
  const dsStore = new DataSourceStore();
  for (const entry of BUILT_IN_CATALOG) {
    catalog.registerEntry(entry);
  }
  for (const custom of dsStore.getCustomSources()) {
    catalog.registerEntry(custom);
  }

  // HUD UI
  const connectionManager = new ConnectionManager(manager, catalog, dsStore);
  const settingsDrawer = new SettingsDrawer();
  const appHeader = new AppHeader(settingsDrawer, connectionManager);
  const infoCard = new InfoCard();
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

  new KeyboardShortcuts(
    manager,
    exportTools,
    () => searchOverlay.open(),
    () => connectionManager.toggle(),
    () => document.querySelector('.measure-toolbar')?.classList.toggle('visible')
  );

  // Viewport ring
  const ring = document.createElement('div');
  ring.className = 'viewport-ring active';
  document.body.appendChild(ring);

  console.log(
    `Live Global Tracker initialized with ${manager.getAll().reduce((s, l) => s + l.getFeatureCount(), 0).toLocaleString()} entities`
  );
}

main().catch(console.error);
