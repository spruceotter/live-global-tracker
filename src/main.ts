import './styles/tokens.css';
import './styles/reset.css';
import './styles/layout.css';
import './styles/glass.css';
import './styles/panels.css';
import './styles/cesium-overrides.css';

import { initViewer } from './viewer/initViewer';
import { playCameraIntro } from './viewer/cameraSequence';
import { setupAutoRotate } from './viewer/autoRotate';
import { setupClickHandler } from './viewer/clickHandler';
import { LayerManager } from './core/LayerManager';
import { SatelliteLayer } from './layers/satellites/SatelliteLayer';
import { AircraftLayer } from './layers/aircraft/AircraftLayer';
import { EarthquakeLayer } from './layers/earthquakes/EarthquakeLayer';
import { FireLayer } from './layers/fires/FireLayer';
import { WeatherLayer } from './layers/weather/WeatherLayer';
import { AppHeader } from './ui/AppHeader';
import { StatsBar } from './ui/StatsBar';
import { LayerPanel } from './ui/LayerPanel';
import { InfoCard } from './ui/InfoCard';

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

  // Register all layers in display order
  manager.register(new SatelliteLayer());
  manager.register(new AircraftLayer());
  manager.register(new EarthquakeLayer());
  manager.register(new FireLayer());
  manager.register(new WeatherLayer());

  // Start camera intro and data loading in parallel
  await Promise.all([
    playCameraIntro(viewer),
    manager.initializeAll(),
  ]);

  // Start auto-rotation after intro
  setupAutoRotate(viewer);

  // Mount UI
  new AppHeader();
  const infoCard = new InfoCard();
  setupClickHandler(viewer, manager, infoCard);

  const statsBar = new StatsBar();
  statsBar.setLayers(manager.getAll());

  new LayerPanel(manager);

  // Log success
  const totalEntities = manager
    .getAll()
    .reduce((sum, l) => sum + l.getFeatureCount(), 0);
  console.log(
    `Live Global Tracker initialized with ${totalEntities.toLocaleString()} entities`
  );
}

main().catch(console.error);
