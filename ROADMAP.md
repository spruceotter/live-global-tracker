# Roadmap

Live Global Tracker follows [semantic versioning](https://semver.org). This roadmap outlines planned releases, features, and contribution opportunities.

**Current version: `0.1.0` (Alpha)**

---

## v0.1.0 — Foundation (Current Release)

The initial release. Five real-time data layers on a cinematic CesiumJS globe.

### What's Shipped

- **Satellites** — 14,000+ objects from CelesTrak, SGP4 propagation every 2s, color-coded by constellation (ISS gold, Starlink purple, GPS green)
- **Aircraft** — 8,000 from OpenSky Network ADS-B, color-coded by altitude
- **Earthquakes** — USGS GeoJSON feed, sized by magnitude, colored by depth
- **Wildfires** — 15,000 hotspots from NASA FIRMS VIIRS, colored by fire radiative power
- **Weather** — OpenWeatherMap precipitation tile overlay
- **Viewer** — Cinematic camera intro, bloom post-processing, dynamic sun lighting, auto-rotation
- **UI** — Layer toggle panel (color-coded), stats bar with live counts, click-to-inspect info cards, glassmorphism dark theme
- **Backend** — Express proxy for CORS-blocked APIs, config-driven routes, TTL cache with stale-while-revalidate
- **Architecture** — Plugin system: add a new data layer in 2 files (manifest + layer class)

---

## v0.2.0 — Interaction & Polish

*Focus: Make the app feel responsive, searchable, and delightful.*

### Core Features

- [ ] **Cmd+K Search Overlay** — Search across all layers simultaneously (satellites by name/NORAD ID, aircraft by callsign, earthquakes by location). Selecting a result flies the camera to it. `help wanted`
- [ ] **Hover Tooltips** — Proximity tooltip on mouse-near-entity showing one-line summary (e.g., "ISS (ZARYA) — 408 km"). No click required. `help wanted`
- [ ] **Satellite Orbit Paths** — Click a satellite to see a glowing 90-minute orbit arc projected ahead. Gold for ISS, constellation color for others.
- [ ] **Zoom-Level Filtering** — 4 semantic zoom levels (orbital > 8000km, continental, regional, local). Satellites hide when zoomed into a city. Aircraft hide at extreme altitude. Each layer declares its visibility range.
- [ ] **Smooth Aircraft Interpolation** — Lagrange polynomial interpolation between OpenSky position samples (10-15s gaps) for smooth movement instead of teleporting.
- [ ] **Earthquake Ripple Animation** — New earthquakes trigger an expanding, fading circle animation (2s duration) before settling into a static marker.

### UI Improvements

- [ ] **Deep Panel (Tier 3)** — Double-click or expand button opens a full-height right-side panel with extended data, related entities, and external links. `help wanted`
- [ ] **Settings Drawer** — Slide-in panel for entering/updating API keys, persisted to localStorage. Replaces the current console-only settings gear.
- [ ] **Layer Opacity Sliders** — Each layer gets a 0-100% opacity control in the layer panel.
- [ ] **Responsive Layout** — Tablet (<1024px): icon-only layer panel. Mobile (<640px): bottom tab bar, full-screen detail panels, touch-friendly targets.
- [ ] **`prefers-reduced-motion` Support** — Disable bloom, auto-rotation, ripple animations, and camera intro when the user prefers reduced motion.

### Infrastructure

- [ ] **GitHub Actions CI** — TypeScript type-check + ESLint + Vite build on every PR.
- [ ] **ESLint Configuration** — TypeScript-aware linting with recommended rules.
- [ ] **`npm run type-check`** — Add script alias for `tsc --noEmit`.

---

## v0.3.0 — New Data Layers

*Focus: Prove the plugin architecture works by shipping 5+ new layers. Community contributions welcome.*

Each of these is a self-contained PR following the [layer template](CONTRIBUTING.md). All are listed with free API access and documented in [data_sources.md](data_sources.md).

### Tier 1: Tracking & Hazards

- [ ] **Ships / AIS** (AISHub or MarineTraffic) — Vessel positions color-coded by type (cargo, tanker, passenger, fishing). Shipping lanes light up like highways. `good first issue`
- [ ] **Volcanoes** (Smithsonian Global Volcanism Program) — Billboard markers colored by activity level (erupting, elevated, normal). Ring of Fire visible alongside earthquakes. `good first issue`
- [ ] **Storm Tracks** (NOAA Storm Prediction Center) — Hurricane/cyclone trajectory polylines with intensity coloring. GeoJSON, CORS-safe, free. `good first issue`

### Tier 2: Environment & Imagery

- [ ] **Air Quality** (OpenAQ) — PM2.5/AQI readings from 10,000+ global monitoring stations. Colored circles on the surface using AQI breakpoints (green → purple). `good first issue`
- [ ] **Night Lights** (NASA Black Marble / GIBS) — VIIRS nighttime lights as a tile overlay. Toggle between day imagery and night lights base layer. The "show someone and they gasp" feature.
- [ ] **Deforestation Alerts** (Global Forest Watch) — Near real-time tree cover loss alerts. GeoJSON, free.

### Tier 3: Additional Sources

- [ ] **NOAA Weather Alerts** (NWS API) — US severe weather warnings as colored polygons. GeoJSON, no key.
- [ ] **Ocean Temperature** (NOAA CoastWatch / ERDDAP) — Sea surface temperature tile overlay.
- [ ] **Webcams** (Windy.com API) — 100,000+ geotagged webcam locations. Click to open live feed.

### Infrastructure

- [ ] **Vitest Unit Tests** — Tests for TLE parser, CSV parser, formatters, LayerBase lifecycle, PointCloudRenderer mutation logic.
- [ ] **Layer Auto-Discovery** — `LayerManager` scans `src/layers/*/manifest.ts` barrel exports automatically instead of manual registration in `main.ts`.

---

## v0.4.0 — Time & History

*Focus: Add a time dimension. Replay the past, watch patterns emerge.*

- [ ] **Historical Playback** — Cesium timeline scrubber to replay earthquake activity over 24h/7d. Satellites propagate to any timestamp natively via SGP4. Aircraft limited to live data (historical requires paid OpenSky tier).
- [ ] **Shareable URLs** — Camera position + active layers + time encoded in URL hash: `#cam=41.38,2.17,5000km&layers=sat,eq&t=2025-01-15T12:00Z`. Copy-paste to share exact views.
- [ ] **Data Correlation Mode** — When earthquakes + volcanoes are both active, highlight tectonic boundary correlations. When fires + weather are both active, show wind direction overlays indicating fire spread risk.
- [ ] **Staggered Layer Fade-In** — Extend the camera intro: satellites fade in first (like stars switching on), then aircraft, earthquakes, fires — each with a 300ms stagger.
- [ ] **Entity Filters** — UI controls for attribute-based filtering: earthquakes by magnitude range, aircraft by altitude range, fires by confidence level.

### Infrastructure

- [ ] **Playwright E2E Tests** — Globe renders, layer toggles work, click shows info card, search returns results.
- [ ] **Bundle Size Monitoring** — CI check that app JS stays under 100KB gzip.
- [ ] **Docker Compose** — One-command local setup: `docker compose up` runs Express proxy + Vite dev server.

---

## v1.0.0 — Production Release

*The app is feature-complete, stable, polished, and deployable.*

### Features

- [ ] **Data Stories / Guided Tours** — Curated camera sequences: "The Ring of Fire" (Pacific earthquakes + volcanoes), "The Great Circle Routes" (transatlantic aircraft corridors), "Starlink's Shell" (filter to SpaceX constellation). Each tour is a JSON script of camera waypoints + layer filter states + narration text.
- [ ] **Performance Mode** — `requestRenderMode: true` to skip rendering idle frames. Automatic bloom disable on low-FPS devices. Web Worker for SGP4 propagation when entity count exceeds 25K.
- [ ] **Offline Fallback** — IndexedDB cache for TLE data and recent API responses. App works without network after first load (satellite propagation is local math).
- [ ] **Deployment Guide** — Instructions for Vercel (static frontend + serverless proxy), Netlify, Docker, and self-hosted setups.
- [ ] **10+ Data Layers** — At least 10 community-contributed layers beyond the original 5.

### Polish

- [ ] **Full Glassmorphism Design System** — Consistent light/medium/heavy glass variants, animation library (`@keyframes` for ripple, pulse, shimmer, fade), counter roll animation on stats bar updates.
- [ ] **Custom Cesium Attribution** — Properly styled Cesium Ion + data source credits in a minimal footer line, compliant with all API terms of service.
- [ ] **Keyboard Navigation** — Arrow keys to cycle between entities, Enter to open info card, Escape to close panels.
- [ ] **Accessibility** — ARIA labels on all interactive elements, focus indicators, screen reader support for stats bar.

### Infrastructure

- [ ] **Semantic Release** — Automated versioning and changelog from conventional commits.
- [ ] **API Documentation** — TypeDoc-generated reference for `LayerManifest`, `LayerBase`, `NormalizedFeature`, `PointCloudRenderer`.
- [ ] **Performance Benchmarks** — Automated frame-time measurement with 10K/25K/50K entities.
- [ ] **Security Audit** — Verify no API keys leak in bundle, no XSS via entity labels, CSP headers.

---

## v1.x — Ecosystem Growth

*Post-1.0 releases adding major capabilities while maintaining stability.*

### v1.1 — Real-Time Streams
- [ ] **WebSocket Aircraft Feed** — Sub-second aircraft position updates via server-side OpenSky polling pushed over WebSocket. Eliminates 12s polling gap.
- [ ] **ADS-B Exchange Integration** — Unfiltered aircraft feed including military/private jets (controversial but powerful for OSINT).
- [ ] **Server-Sent Events** — Lightweight alternative to WebSocket for earthquake alerts (USGS supports this natively).

### v1.2 — Advanced Visualization
- [ ] **3D Building Tiles** — Google Photorealistic 3D Tiles or OpenStreetMap buildings via Cesium 3D Tiles. Visible at city zoom level.
- [ ] **Wind Particle Layer** — WebGL particle system showing wind flow vectors (inspired by Windy.com). Requires custom Cesium post-processing shader.
- [ ] **Heatmap Renderer** — New rendering strategy for density visualization (population, air quality, fire clusters). Uses Cesium `ImageryLayer` with client-generated canvas tiles.

### v1.3 — Collaboration & Sharing
- [ ] **Screenshot Export** — Capture the current globe view as a high-resolution PNG with UI overlays composited.
- [ ] **Embed Mode** — `?embed=true` URL parameter strips all UI, suitable for `<iframe>` embedding in articles/dashboards.
- [ ] **View Presets** — Save and recall camera positions + layer configurations as named presets (stored in localStorage).

---

## v2.0 — Frontier

*Experimental features that make this application unprecedented. These are moonshots.*

- [ ] **Natural Language Queries** — "Show me all earthquakes above magnitude 5 this week" parses into a filter chain. "What's the highest aircraft right now?" queries live data and flies to it. Structured query parsing (pattern matching, no LLM required for v1).
- [ ] **AI Anomaly Detection** — Background process comparing current data against rolling baselines. Surfaces non-blocking notifications: "Unusual seismic activity near [location] — 14 earthquakes in 2 hours vs. typical 2."
- [ ] **Collaborative Viewing** — WebSocket-powered shared sessions. One user controls the camera; others follow in real-time. Shared cursor system. Use case: educational presentations, operations monitoring.
- [ ] **Generative Timelapse** — Record 24 hours of data into a compressed replay exportable as video. Watch the day/night terminator sweep as aircraft follow the sun westward and satellite constellations precess around the poles.
- [ ] **AR/VR Mode** — WebXR integration for viewing the globe in VR headsets or AR pass-through. Earth floats in your room.

---

## Contributing to the Roadmap

### Good First Issues

Items marked `good first issue` are self-contained, well-documented, and require no deep CesiumJS knowledge. They follow the [layer template](CONTRIBUTING.md) and can be completed in 2-4 hours.

### Help Wanted

Items marked `help wanted` are more substantial features that would benefit from community ownership. They may require CesiumJS API knowledge or UI/UX design skills.

### Proposing New Features

Open a [GitHub Issue](../../issues) with the `feature-request` label. Include:
1. What data source or feature you want to add
2. Link to the API documentation
3. Whether it's CORS-safe or needs a proxy route
4. A rough estimate of entity count (affects rendering strategy)

### Priority Framework

We prioritize features based on:
1. **Visual impact** — Does it make someone say "wow"?
2. **Data availability** — Is the API free, reliable, and well-documented?
3. **Integration cost** — Can it be done in one PR using the layer template?
4. **Community demand** — How many people are asking for it?

---

## Release Schedule

| Version | Target | Theme |
|---------|--------|-------|
| v0.1.0 | **Shipped** | Foundation — 5 layers, core architecture |
| v0.2.0 | +2-3 weeks | Interaction — search, orbit paths, zoom filtering, responsive |
| v0.3.0 | +4-6 weeks | Layers — 5+ community-contributed data sources |
| v0.4.0 | +6-8 weeks | Time — historical playback, shareable URLs, data correlation |
| v1.0.0 | +10-12 weeks | Production — tours, performance, offline, deployment, 10+ layers |
| v1.x | Ongoing | Ecosystem — WebSocket streams, 3D buildings, heatmaps, sharing |
| v2.0 | 6+ months | Frontier — NLQ, AI anomalies, collaboration, timelapse, XR |

Dates are relative to the initial public release and depend on community contribution velocity. The project maintainer will tag releases when milestones are met.

---

*This roadmap is a living document. It will evolve as the community grows and priorities shift. The [data source catalog](data_sources.md) contains 97 potential integrations — we'll never run out of things to build.*
