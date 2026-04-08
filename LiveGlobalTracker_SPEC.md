# Live Global Tracker — Full Project Spec

## For: Claude Code / Coding Agent Handoff

---

## 1. Project Summary

Build a **real-time 3D globe application** that visualizes satellites, aircraft, ships, earthquakes, wildfires, and weather overlays on an interactive CesiumJS globe. The app should be a proper **TypeScript + Vite** web application (not a single HTML file) with a lightweight **Express backend proxy** to handle CORS-restricted APIs.

### Why a backend proxy is required

During prototyping, we discovered that several critical APIs **do not send CORS headers**:

- **OpenSky Network** (`opensky-network.org/api`) — confirmed no `Access-Control-Allow-Origin` header ([GitHub issue #34](https://github.com/openskynetwork/opensky-api/issues/34))
- **CelesTrak** (`celestrak.org`) — inconsistent CORS support, fails from `file://` and many origins

Public CORS proxies (`corsproxy.io`, `allorigins.win`) are unreliable for production. A thin Express server that proxies these requests solves this cleanly.

Other APIs (USGS, NASA FIRMS, OpenWeatherMap) **do** support CORS and can be called directly from the browser.

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend framework** | TypeScript + Vite | Fast HMR, tree-shaking, proper module system |
| **3D Globe** | CesiumJS (npm: `cesium`) | True 3D globe with time-dynamic entities, orbital mechanics support, 3D Tiles |
| **Satellite math** | `satellite.js` | SGP4/SDP4 propagation: TLE → lat/lon/alt at any timestamp |
| **Backend proxy** | Express.js (TypeScript) | Proxies CORS-blocked APIs (OpenSky, CelesTrak), caches responses |
| **Styling** | CSS (no framework needed) | Dark theme UI, glassmorphism panels |
| **Optional: Desktop** | Electron (stretch goal) | Wrap the web app for native desktop distribution |

### Package dependencies

```json
{
  "dependencies": {
    "cesium": "^1.119",
    "satellite.js": "^5.0.0",
    "express": "^4.18",
    "node-fetch": "^3.3"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "vite": "^5.4",
    "vite-plugin-cesium": "^1.2",
    "@types/express": "^4.17"
  }
}
```

---

## 3. Architecture

```
live-global-tracker/
├── server/
│   ├── index.ts                 # Express server entry
│   ├── proxy.ts                 # API proxy routes with caching
│   └── cache.ts                 # In-memory TTL cache
├── src/
│   ├── main.ts                  # App entry, Cesium viewer init
│   ├── config.ts                # API keys, endpoints, refresh intervals
│   ├── viewer/
│   │   ├── initViewer.ts        # Cesium Viewer setup with imagery + terrain
│   │   └── clickHandler.ts      # Entity picking + detail panel
│   ├── layers/
│   │   ├── LayerBase.ts         # Abstract base class for all data layers
│   │   ├── SatelliteLayer.ts    # CelesTrak TLE + satellite.js propagation
│   │   ├── AircraftLayer.ts     # OpenSky Network live positions
│   │   ├── EarthquakeLayer.ts   # USGS GeoJSON feed
│   │   ├── FireLayer.ts         # NASA FIRMS VIIRS hotspots
│   │   ├── WeatherLayer.ts      # OpenWeatherMap tile overlay
│   │   └── ShipLayer.ts         # (future) AIS data
│   ├── ui/
│   │   ├── SetupPage.ts         # API key entry + validation + localStorage
│   │   ├── LayerToggles.ts      # Header toggle buttons
│   │   ├── DetailPanel.ts       # Slide-in entity info card
│   │   └── StatsBar.ts          # Live entity counters
│   └── utils/
│       ├── tleParser.ts         # TLE text → satellite.js records
│       └── formatters.ts        # Unit conversions, number formatting
├── public/
│   └── assets/                  # Icons for aircraft, ships, satellites
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Data flow

```
Browser (Vite dev server, port 5173)
  │
  ├── Direct fetch (CORS-safe APIs):
  │   ├── USGS Earthquakes → earthquake.usgs.gov
  │   ├── NASA FIRMS → firms.modaps.eosdis.nasa.gov
  │   └── OpenWeatherMap tiles → tile.openweathermap.org
  │
  └── Via Express proxy (CORS-blocked APIs):
      │  http://localhost:3001/api/...
      ├── /api/opensky → opensky-network.org/api/states/all
      ├── /api/celestrak/:group → celestrak.org/NORAD/elements/...
      └── (cached with TTL per endpoint)
```

---

## 4. Cesium Viewer Initialization

**CRITICAL**: This was the main bug in the prototype. The globe rendered as a black sphere because CesiumJS 1.119 does not automatically add a base imagery layer when `baseLayerPicker: false`.

### Correct initialization pattern

```typescript
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// Token MUST be set before any Cesium ion calls
Cesium.Ion.defaultAccessToken = config.cesiumIonToken;

const viewer = new Cesium.Viewer('cesiumContainer', {
  // IMPORTANT: Explicitly create the base imagery layer
  baseLayer: Cesium.ImageryLayer.fromWorldImagery(),
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
```

### Fallback strategy if Cesium ion token is invalid

```typescript
// If ion imagery fails, fall back to OpenStreetMap
try {
  const viewer = new Cesium.Viewer('cesiumContainer', {
    baseLayer: Cesium.ImageryLayer.fromWorldImagery(),
    terrain: Cesium.Terrain.fromWorldTerrain(),
    // ...
  });
} catch (e) {
  const viewer = new Cesium.Viewer('cesiumContainer', {
    baseLayer: new Cesium.ImageryLayer(
      new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/'
      })
    ),
    // ...
  });
}
```

### Vite + Cesium integration

Use `vite-plugin-cesium` to handle Cesium's static assets (Workers, Assets, Widgets):

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [cesium()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'  // Proxy API requests to Express
    }
  }
});
```

---

## 5. Backend Proxy Server

### `server/index.ts`

```typescript
import express from 'express';
import { createProxyRoutes } from './proxy';

const app = express();
app.use('/api', createProxyRoutes());
app.listen(3001, () => console.log('Proxy server on :3001'));
```

### `server/proxy.ts` — Proxy routes with caching

```typescript
import { Router } from 'express';
import fetch from 'node-fetch';

const cache = new Map<string, { data: any; expires: number }>();

function cached(key: string, ttlMs: number, fetcher: () => Promise<any>) {
  return async (req, res) => {
    const entry = cache.get(key);
    if (entry && Date.now() < entry.expires) {
      return res.json(entry.data);
    }
    try {
      const data = await fetcher();
      cache.set(key, { data, expires: Date.now() + ttlMs });
      res.json(data);
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  };
}

export function createProxyRoutes() {
  const router = Router();

  // OpenSky — cache 10 seconds
  router.get('/opensky', cached('opensky', 10000, async () => {
    const resp = await fetch('https://opensky-network.org/api/states/all');
    return resp.json();
  }));

  // CelesTrak TLE — cache 2 hours (TLEs are valid for days)
  router.get('/celestrak/:group', async (req, res) => {
    const group = req.params.group;
    const key = `celestrak_${group}`;
    const entry = cache.get(key);
    if (entry && Date.now() < entry.expires) {
      return res.type('text/plain').send(entry.data);
    }
    const resp = await fetch(
      `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`
    );
    const text = await resp.text();
    cache.set(key, { data: text, expires: Date.now() + 7200000 });
    res.type('text/plain').send(text);
  });

  return router;
}
```

---

## 6. Data Layers — Detailed Specs

### 6.1 Satellites (CelesTrak + satellite.js)

| Field | Value |
|-------|-------|
| **Source** | CelesTrak via backend proxy: `/api/celestrak/{group}` |
| **Groups to fetch** | `stations`, `starlink`, `gps-ops`, `weather` |
| **Refresh** | Every 2 hours (TLEs valid for days; client-side propagation handles real-time) |
| **Client-side math** | `satellite.js` SGP4 propagation: TLE → ECI → geodetic (lat/lon/alt) |
| **Rendering** | `Cesium.PointPrimitiveCollection` (GPU-instanced) for 10,000+ points |
| **Animation** | Propagate all satellites every 2 seconds via `setInterval` |
| **Interaction** | Click → show orbit path (next 90 min) + detail panel |
| **Detail fields** | Name, NORAD ID, altitude (km), lat/lon, velocity (km/s) |
| **Color coding** | ISS=gold `#fbbf24`, Starlink=purple `#c4b5fd`, GPS=green `#34d399`, other=violet `#a78bfa` |
| **Point size** | ISS=8px, all others=3px |

### 6.2 Aircraft (OpenSky Network)

| Field | Value |
|-------|-------|
| **Source** | OpenSky via backend proxy: `/api/opensky` |
| **Refresh** | Every 10-15 seconds |
| **Data format** | JSON: `{ states: [[icao24, callsign, origin, ...], ...] }` |
| **State vector indices** | `[0]=icao24, [1]=callsign, [2]=origin_country, [5]=lon, [6]=lat, [7]=baro_alt, [8]=on_ground, [9]=velocity, [10]=heading, [11]=vertical_rate` |
| **Filter** | Exclude `on_ground=true`, require valid lat/lon, cap at 8,000 entities |
| **Rendering** | `Cesium.PointPrimitiveCollection` or `BillboardCollection` with aircraft icons |
| **Color by altitude** | >10km=blue `#60a5fa`, >3km=sky `#38bdf8`, <3km=cyan `#22d3ee` |
| **Detail fields** | Callsign, ICAO24, origin country, altitude (m + ft), velocity (km/h + kt), heading, vertical rate |

### 6.3 Earthquakes (USGS)

| Field | Value |
|-------|-------|
| **Source** | Direct fetch (CORS OK): `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson` |
| **Refresh** | Every 60 seconds |
| **Data format** | GeoJSON FeatureCollection |
| **Rendering** | `Cesium.CustomDataSource` with ellipse entities |
| **Size** | `radius = max(mag² × 2000, 5000)` meters |
| **Color by depth** | <30km=red `#ef4444`, <100km=orange `#f97316`, >100km=yellow `#eab308` |
| **Alpha** | Recent (<1 hour)=0.7, older=0.4 |
| **Detail fields** | Magnitude, depth (km), location name, time (UTC), felt reports count |

### 6.4 Active Fires (NASA FIRMS)

| Field | Value |
|-------|-------|
| **Source** | Direct fetch (CORS OK): `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{API_KEY}/VIIRS_SNPP_NRT/world/1` |
| **Auth** | Free API key (required) |
| **Refresh** | Every 10 minutes |
| **Data format** | CSV with columns: latitude, longitude, bright_ti4, frp, confidence, acq_date, acq_time |
| **Rendering** | `Cesium.PointPrimitiveCollection`, cap at 15,000 points |
| **Size** | `2 + (frp/100) × 4` pixels |
| **Color by intensity** | High FRP=red `#ef4444`, medium=orange `#f97316`, low=yellow `#fbbf24` |
| **Detail fields** | Lat/lon, FRP (MW), brightness temp (K), confidence, acquisition datetime, source satellite |

### 6.5 Weather Overlay (OpenWeatherMap)

| Field | Value |
|-------|-------|
| **Source** | Direct tile fetch (CORS OK): `https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={KEY}` |
| **Auth** | Free API key (required) |
| **Layers** | `precipitation_new`, `clouds_new`, `temp_new`, `wind_new` |
| **Rendering** | `Cesium.ImageryLayer` with `UrlTemplateImageryProvider` |
| **Alpha** | 0.5 |
| **Refresh** | Tiles auto-refresh; data updates ~every 10 min |

### 6.6 Ships / AIS (future)

| Field | Value |
|-------|-------|
| **Source** | AISHub (reciprocal) or MarineTraffic API |
| **Note** | Requires own AIS receiver for AISHub, or paid API for MarineTraffic. Defer to Phase 2. |

---

## 7. API Keys & Configuration

### Required keys

| Key | Where to get it | Free tier |
|-----|----------------|-----------|
| **Cesium ion token** | [ion.cesium.com/signup](https://ion.cesium.com/signup) | Free for <$50K revenue |
| **OpenWeatherMap** | [openweathermap.org](https://home.openweathermap.org/users/sign_up) | 60 req/min |
| **NASA FIRMS** | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/api/area/) | Unlimited |

### No key needed

- CelesTrak (via proxy)
- OpenSky Network (via proxy)
- USGS Earthquakes

### User's keys

Store API keys in a `.env` file (gitignored). See `.env.example` for the required format:

```env
VITE_CESIUM_ION_TOKEN=your_token_here
VITE_OWM_API_KEY=your_key_here
VITE_FIRMS_API_KEY=your_key_here
```

### Setup page

The app should include a setup/config page (shown on first launch) where users can enter their own keys. Keys should persist in `localStorage`. A gear icon in the app header allows returning to the setup page.

---

## 8. UI Specification

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ LIVE GLOBAL TRACKER    [🛰Sats][✈Aircraft][🔴Quakes][🔥Fires][☁Weather]  ⚙ │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                    CesiumJS 3D Globe                     │
│                    (full viewport)                        │
│                                                          │
│                                         ┌──────────┐    │
│                                         │ Detail    │    │
│                                         │ Panel     │    │
│                                         │ (click    │    │
│                                         │  entity)  │    │
│                                         └──────────┘    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Sats: 10,242  │  Aircraft: 5,381  │  Quakes: 272  │  Fires: 15,000  │
└──────────────────────────────────────────────────────────┘
```

### Theme

- Background: `#0a0e17` (near-black navy)
- Text primary: `#e0e6f0`
- Text secondary: `#718096`
- Accent: `#60a5fa` (blue) + `#a78bfa` (purple gradient)
- Panels: `rgba(15,20,35,0.92)` with `backdrop-filter: blur(16px)` and `border: 1px solid rgba(255,255,255,0.1)`
- Active layer buttons: `background: rgba(96,165,250,0.2); border-color: #60a5fa; color: #60a5fa`
- Disabled layer buttons: `opacity: 0.35; cursor: default`

### Interactions

- **Layer toggles**: Chip-style buttons in header. Active = filled blue, inactive = outline. Disabled (no API key) = dimmed.
- **Entity click**: `ScreenSpaceEventHandler` on `LEFT_CLICK`. Pick → show detail panel slide-in from right.
- **Satellite click**: Show orbit path as glowing polyline for next 90 minutes.
- **Close detail**: X button or click empty space.
- **Stats bar**: Live counters update on each data refresh.
- **Settings gear**: Top-right button, returns to setup page.

---

## 9. Performance Requirements

| Challenge | Strategy |
|-----------|----------|
| 10,000+ satellites | `PointPrimitiveCollection` (GPU-instanced), NOT individual Entities. Only create full Entity for selected satellite's orbit path. |
| 5,000-8,000 aircraft | `PointPrimitiveCollection`. Mutate positions in-place on refresh, don't recreate. |
| 15,000 fire hotspots | `PointPrimitiveCollection`. |
| SGP4 propagation | Run every 2s for all sats. satellite.js can propagate 10K sats in ~5ms. Consider Web Worker if needed. |
| API rate limits | OpenSky: 10-15s poll. USGS: 60s. FIRMS: 10min. Backend proxy cache enforces these. |
| Memory | Cap entities per layer. Use `requestRenderMode: true` + `viewer.scene.requestRender()` to skip idle frames (stretch goal). |

---

## 10. Known Issues from Prototype

These are bugs we discovered during prototyping that the production app MUST address:

1. **Cesium globe renders black if `baseLayer` is not explicitly set** when `baseLayerPicker: false`. Always pass `baseLayer: Cesium.ImageryLayer.fromWorldImagery()` to the Viewer constructor.

2. **OpenSky Network has no CORS headers.** Fetching from the browser fails silently. MUST use backend proxy.

3. **CelesTrak has inconsistent CORS support.** Works from some origins, fails from others (especially `file://`). Use backend proxy for reliability.

4. **OpenSky full `states/all` response is 2-4MB.** Backend proxy should cache this and serve it quickly. Alternatively, use bounding-box queries to reduce payload: `?lamin=35&lomin=-15&lamax=60&lomax=40`.

5. **`Cesium.Terrain.fromWorldTerrain()` is async.** The Viewer constructor handles it, but wrap in try/catch and fall back to ellipsoid terrain if the ion token is invalid.

6. **NASA FIRMS returns CSV, not JSON.** Parse on the client side (split lines, split commas, match header indices).

---

## 11. Development Roadmap

### Phase 1 — Core App (target: working in 1-2 sessions)

- [ ] Vite + TypeScript project scaffold with CesiumJS integration
- [ ] Express backend proxy with caching for OpenSky + CelesTrak
- [ ] Cesium Viewer with proper imagery + terrain initialization
- [ ] Satellite layer (CelesTrak → satellite.js → PointPrimitives)
- [ ] Aircraft layer (OpenSky → PointPrimitives)
- [ ] Earthquake layer (USGS GeoJSON → Entities)
- [ ] Layer toggle UI + stats bar
- [ ] Click handler with detail panel
- [ ] Setup page for API keys (with localStorage persistence)

### Phase 2 — Polish

- [ ] Fire layer (NASA FIRMS CSV)
- [ ] Weather tile overlay (OpenWeatherMap)
- [ ] Satellite orbit visualization on click
- [ ] Satellite search (by name/NORAD ID)
- [ ] Aircraft search (by callsign)
- [ ] Mobile responsive layout

### Phase 3 — Scale

- [ ] Ship/AIS layer
- [ ] NOAA storm tracks
- [ ] Historical playback (Cesium timeline for earthquakes + satellites)
- [ ] Shareable URLs (camera position + active layers in hash)
- [ ] Electron wrapper for desktop app
- [ ] WebSocket upgrade for aircraft (sub-second updates)

---

## 12. Reference: Existing Prototype

The file `LiveGlobalTracker.html` in this directory is the single-file prototype built during design. It contains:

- Working CelesTrak satellite tracking with satellite.js (via CORS proxy)
- USGS earthquake feed rendering
- NASA FIRMS fire hotspot rendering
- OpenWeatherMap tile layer stub
- Setup page UI with key management
- Click handler with detail panel
- Layer toggle UI
- Stats bar

The prototype's main limitations (all addressed in this spec):
- No build system — everything in one HTML file
- CORS issues with OpenSky and CelesTrak (public proxy workaround is unreliable)
- Cesium globe imagery fails to render (baseLayer initialization bug)
- No backend — can't reliably proxy API requests

Use the prototype as a **UI/UX reference** for the look and feel, but rebuild the data layer and Cesium initialization from scratch following this spec.
