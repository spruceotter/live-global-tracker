# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time 3D globe application (Live Global Tracker) that visualizes satellites, aircraft, earthquakes, wildfires, and weather overlays on an interactive CesiumJS globe. TypeScript + Vite frontend with a lightweight Express backend proxy for CORS-restricted APIs.

## Build & Run Commands

```bash
# Install dependencies
npm install

# Start Express backend proxy (port 3001)
npm run server

# Start Vite dev server (port 5173) -- proxies /api to backend
npm run dev

# Run both concurrently
npm start

# Build for production
npm run build

# Type-check
npx tsc --noEmit                        # frontend
npx tsc --noEmit -p tsconfig.server.json # server
```

## Architecture

**Frontend** (`src/`): TypeScript + Vite + CesiumJS. Uses `vite-plugin-cesium` to handle Cesium static assets. Vite dev server proxies `/api` requests to Express backend on port 3001.

**Backend** (`server/`): Express server on port 3001. Proxies CORS-blocked APIs (OpenSky Network, CelesTrak) with in-memory TTL caching. Config-driven: add a proxy route by adding one object to `server/sources.config.ts`. CORS-safe APIs (USGS, NASA FIRMS, OpenWeatherMap) are called directly from the browser.

**Layer system** (`src/layers/`): Each data source has a `manifest.ts` (pure-data descriptor) and a layer class extending `LayerBase`. All high-volume layers (satellites, aircraft, fires) use `Cesium.PointPrimitiveCollection` for GPU-instanced rendering -- never individual Entities for bulk data. Positions are mutated in-place on refresh, not recreated. Copy `src/layers/_template/` to create a new layer.

**Core types** (`src/core/types.ts`): `LayerManifest` interface defines a data source declaratively. `NormalizedFeature` is the universal data point shape all layers normalize to. `LayerBase` abstract class handles fetch, cache, render, refresh, toggle, search lifecycle.

**Rendering** (`src/rendering/`): `PointCloudRenderer` wraps `PointPrimitiveCollection` with style resolution and in-place mutation. Used by satellites (14K+), aircraft (8K), and fires (15K).

**Satellite math**: TLEs fetched from CelesTrak (groups: active, starlink, gps-ops), propagated client-side using `satellite.js` SGP4 every 2 seconds. An `activeSatRecords` array stays index-aligned with features to avoid corruption during propagation.

## Critical Implementation Notes

- **Cesium globe renders black** if `baseLayer` is not explicitly passed to the Viewer constructor when `baseLayerPicker: false`. Always use `baseLayer: Cesium.ImageryLayer.fromWorldImagery({})`.
- **OpenSky Network and CelesTrak have no reliable CORS headers** -- all requests to these APIs must go through the Express backend proxy. Never fetch them directly from the browser.
- **CelesTrak rate-limits per IP** -- returns "GP data has not updated" text on repeat downloads within 2 hours. The proxy validates responses contain actual TLE data before caching (`isValidTle` in `sources.config.ts`).
- **NASA FIRMS returns CSV, not JSON** -- parsed client-side via `CsvParser.ts`.
- **`Cesium.Ion.defaultAccessToken`** must be set before any Cesium Ion calls.
- **Click handler for PointPrimitives**: `scene.pick()` returns `{ primitive: PointPrimitive, collection: PointPrimitiveCollection }`. Use `picked.collection` (not `picked.primitive`) to identify the collection, and `point._index` for the point index.
- **No innerHTML** -- use safe DOM methods (`createElement`, `textContent`, `appendChild`) to avoid XSS.
- Fallback to OpenStreetMap imagery if the Cesium Ion token is invalid.

## API Keys

Stored in `.env` (gitignored), loaded via Vite's `import.meta.env`:
- `VITE_CESIUM_ION_TOKEN` -- Cesium Ion (required for globe imagery/terrain)
- `VITE_OWM_API_KEY` -- OpenWeatherMap (weather tiles)
- `VITE_FIRMS_API_KEY` -- NASA FIRMS (fire hotspots)

No keys needed: CelesTrak, OpenSky, USGS earthquakes (all via proxy or direct CORS-safe).

## Performance Constraints

- Satellites: 10,000-25,000 points -- must use `PointPrimitiveCollection`
- Aircraft: cap at 8,000 -- `PointPrimitiveCollection`
- Fires: cap at 15,000 -- `PointPrimitiveCollection`
- Backend cache TTLs: OpenSky 10s, CelesTrak 2h
- SGP4 propagation runs every 2s on main thread (~5ms for 10K sats)

## Adding a New Layer

1. Copy `src/layers/_template/` to `src/layers/yourdata/`
2. Edit `manifest.ts` with your source URL, format, rendering strategy, and style rules
3. Edit `YourDataLayer.ts` -- implement `fetchData()` and `normalize()` to map raw API data to `NormalizedFeature[]`
4. Register in `src/main.ts`: `manager.register(new YourDataLayer())`
5. If API needs proxy: add entry to `server/sources.config.ts`
