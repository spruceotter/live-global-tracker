# Live Global Tracker

Real-time 3D globe that visualizes satellites, aircraft, earthquakes, wildfires, and weather on an interactive CesiumJS globe. Built with TypeScript, Vite, and a lightweight Express proxy.

![Live Global Tracker](https://img.shields.io/badge/status-alpha-blue) ![License: MIT](https://img.shields.io/badge/license-MIT-green)

## Features

- **14,000+ satellites** tracked in real-time via CelesTrak TLEs + SGP4 propagation
- **8,000 aircraft** from OpenSky Network ADS-B data, color-coded by altitude
- **Earthquake monitoring** from USGS, sized by magnitude, colored by depth
- **Wildfire hotspots** from NASA FIRMS VIIRS satellite data
- **Weather overlay** from OpenWeatherMap precipitation tiles
- Cinematic camera intro, dynamic sun lighting, bloom post-processing
- Click any entity for detailed information
- Glassmorphism dark UI with Inter + JetBrains Mono typography
- Plugin architecture: add new data layers in 2 files

## Quick Start

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/live-global-tracker.git
cd live-global-tracker
npm install

# Set up API keys (see below)
cp .env.example .env
# Edit .env with your keys

# Run (starts both Express proxy on :3001 and Vite dev server on :5173)
npm start
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## API Keys

| Key | Required? | Where to get it | Free tier |
|-----|-----------|----------------|-----------|
| **Cesium ion** | Yes (globe imagery) | [ion.cesium.com](https://ion.cesium.com/signup) | Free for <$50K revenue |
| **OpenWeatherMap** | Optional (weather) | [openweathermap.org](https://home.openweathermap.org/users/sign_up) | 60 req/min |
| **NASA FIRMS** | Optional (fires) | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/api/area/) | Unlimited |

No keys needed for: CelesTrak (satellites), OpenSky (aircraft), USGS (earthquakes).

## Architecture

```
live-global-tracker/
├── server/                    # Express proxy (port 3001)
│   ├── index.ts               # Server entry
│   ├── proxyRegistry.ts       # Config-driven route builder
│   ├── sources.config.ts      # Declarative proxy definitions
│   └── cache/CacheManager.ts  # In-memory TTL cache
├── src/
│   ├── core/                  # Type system + layer framework
│   │   ├── types.ts           # LayerManifest, NormalizedFeature interfaces
│   │   ├── LayerBase.ts       # Abstract base class for all layers
│   │   └── LayerManager.ts    # Registry + lifecycle
│   ├── layers/                # Data source plugins
│   │   ├── satellites/        # CelesTrak + satellite.js SGP4
│   │   ├── aircraft/          # OpenSky Network
│   │   ├── earthquakes/       # USGS GeoJSON
│   │   ├── fires/             # NASA FIRMS CSV
│   │   ├── weather/           # OpenWeatherMap tiles
│   │   └── _template/         # Copy this to add a new layer
│   ├── rendering/renderers/   # Cesium rendering abstractions
│   ├── viewer/                # Cesium viewer, camera, click handling
│   ├── ui/                    # Header, layer panel, stats bar, info card
│   └── styles/                # CSS design system
└── package.json
```

### Data Flow

```
Browser (Vite :5173)
  ├── Direct (CORS-safe): USGS, NASA FIRMS, OpenWeatherMap
  └── Via Express proxy (:3001): OpenSky, CelesTrak (no CORS headers)
```

## Adding a New Data Layer

The plugin architecture lets you add a new data source in **2 files**. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

1. Create `src/layers/yourdata/manifest.ts` -- pure data describing the source, rendering, and interaction
2. Create `src/layers/yourdata/YourDataLayer.ts` -- extends `LayerBase`, implements `normalize()` to map raw API data to `NormalizedFeature`
3. Register in `src/main.ts`: `manager.register(new YourDataLayer())`

If the API needs a backend proxy (CORS-blocked), add one object to `server/sources.config.ts`.

### Available Data Sources to Integrate

We maintain a [catalog of 97 geospatial data sources](data_sources.md) ready for integration, including:

- Ships/AIS (MarineTraffic, AISHub)
- Volcanoes (Smithsonian)
- Air quality (OpenAQ)
- Storm tracks (NOAA)
- Night lights (NASA Black Marble)
- Ocean currents, population density, traffic, and many more

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| [CesiumJS](https://cesium.com) | 3D globe rendering |
| [satellite.js](https://github.com/shashwatak/satellite-js) | SGP4/SDP4 orbital propagation |
| [TypeScript](https://www.typescriptlang.org) + [Vite](https://vite.dev) | Frontend build |
| [Express](https://expressjs.com) | Backend proxy for CORS-blocked APIs |

## Scripts

```bash
npm start          # Run both servers (dev)
npm run dev        # Same as npm start
npm run dev:client # Vite dev server only
npm run dev:server # Express proxy only
npm run build      # Production build
npm run preview    # Preview production build
```

## Performance

- Satellites: 10,000-25,000 points via GPU-instanced `PointPrimitiveCollection`
- Aircraft: up to 8,000 points, positions mutated in-place on refresh
- Fires: up to 15,000 points
- SGP4 propagation: 10K satellites in ~5ms every 2 seconds
- Production bundle: ~48KB JS + ~30KB CSS (excludes Cesium assets)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding new layers, fixing bugs, and submitting PRs.

## License

[MIT](LICENSE)
