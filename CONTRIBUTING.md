# Contributing to Live Global Tracker

Thanks for your interest in contributing! The easiest and most impactful way to contribute is **adding a new data layer**.

## Adding a New Data Layer

The plugin architecture is designed so that adding a new geospatial data source requires just **2 files** and one line in `main.ts`.

### Step 1: Create the manifest

Copy `src/layers/_template/manifest.ts` to `src/layers/yourdata/manifest.ts` and fill in the fields:

```typescript
import type { LayerManifest } from '../../core/types';

export const yourDataManifest: LayerManifest = {
  id: 'your-data',              // unique kebab-case ID
  name: 'Your Data',            // display name in UI
  category: 'hazards',          // tracking | hazards | weather | environment | infrastructure
  icon: 'quake',                // sat | aircraft | quake | fire | weather (or add a new one)
  description: 'Description for tooltips',

  source: {
    url: 'https://api.example.com/data.json',  // or a function: (cfg) => `url/${cfg.key}`
    format: 'json',             // json | csv | geojson | tle | tiles
    proxied: false,             // true if the API needs the Express backend proxy (no CORS headers)
    auth: { kind: 'none' },     // or { kind: 'api-key-query', paramName: 'key', envVar: 'VITE_YOUR_KEY' }
  },

  rendering: {
    strategy: 'point-cloud',    // point-cloud (10K+ points) | entity (<1000 with geometry) | imagery (tiles)
    maxEntities: 10_000,
    style: {
      attribute: 'category',    // which NormalizedFeature field drives color/size
      stops: [
        { value: 'high', color: '#ef4444', size: 5 },
        { value: 'low', color: '#22d3ee', size: 3 },
      ],
      defaultColor: '#60a5fa',
      defaultSize: 3,
    },
    lod: {},                    // optional: { hideAbove: 8_000_000 } to hide at high altitude
  },

  refresh: { kind: 'poll', intervalMs: 60_000 },  // or { kind: 'one-shot' }
  cache: { ttlMs: 60_000, staleWhileRevalidate: true },

  interaction: {
    detailFields: [
      { label: 'Name', path: 'label', format: 'text' },
      { label: 'Value', path: 'properties.value', format: 'number' },
    ],
  },

  requiredKeys: [],             // e.g. ['VITE_YOUR_KEY'] if API key needed
  defaultEnabled: false,        // start disabled, let user toggle on
  order: 10,                    // display order in layer panel
};
```

### Step 2: Create the layer class

Copy `src/layers/_template/TemplateLayer.ts` to `src/layers/yourdata/YourDataLayer.ts`:

```typescript
import { LayerBase } from '../../core/LayerBase';
import type { NormalizedFeature } from '../../core/types';
import { yourDataManifest } from './manifest';
import { PointCloudRenderer } from '../../rendering/renderers/PointCloudRenderer';

export class YourDataLayer extends LayerBase {
  readonly manifest = yourDataManifest;
  private renderer!: PointCloudRenderer;

  protected setupRenderer(): void {
    this.renderer = new PointCloudRenderer(this.viewer);
  }

  protected async fetchData(): Promise<unknown> {
    const response = await fetch(this.manifest.source.url as string);
    if (!response.ok) throw new Error(`YourData: ${response.status}`);
    return response.json();
  }

  // This is the key method: map raw API data to NormalizedFeature[]
  protected normalize(raw: unknown): NormalizedFeature[] {
    const data = raw as YourApiResponse;
    return data.items.map(item => ({
      id: item.id,
      lat: item.latitude,
      lon: item.longitude,
      alt: item.altitude,           // optional, meters
      category: item.type,          // maps to style.stops
      label: item.name,             // shown in info card title
      properties: {                 // shown in info card fields
        value: item.value,
      },
    }));
  }

  protected render(features: NormalizedFeature[]): void {
    this.renderer.render(features, this.manifest.rendering.style);
  }

  protected clearRenderer(): void { this.renderer.destroy(); }
  protected applyVisibility(visible: boolean): void { this.renderer.setVisible(visible); }
}
```

### Step 3: Register in main.ts

```typescript
import { YourDataLayer } from './layers/yourdata/YourDataLayer';

// In the main() function:
manager.register(new YourDataLayer());
```

### Step 4 (if needed): Add proxy route

If the API doesn't support CORS, add an entry to `server/sources.config.ts`:

```typescript
{
  route: 'yourdata',
  upstream: 'https://api.example.com/data',
  contentType: 'json',
  cacheTtlMs: 60_000,
},
```

Then set `source.url` in your manifest to `'/api/yourdata'` and `source.proxied` to `true`.

## Rendering Strategies

| Strategy | Cesium Type | When to Use |
|----------|-------------|-------------|
| `point-cloud` | `PointPrimitiveCollection` | 1,000+ homogeneous points (satellites, aircraft, fires) |
| `entity` | `CustomDataSource` + `Entity` | <1,000 items needing geometry (earthquake circles, polygons) |
| `imagery` | `ImageryLayer` | Tile-based overlays (weather, night lights, base maps) |

## Data Source Ideas

Check [data_sources.md](data_sources.md) for a catalog of 97 geospatial data sources ready for integration.

High-impact, low-complexity sources we'd love PRs for:

- **Ships/AIS** (AISHub -- free reciprocal data)
- **Volcanoes** (Smithsonian Global Volcanism Program -- free REST/JSON)
- **Air quality** (OpenAQ -- free, no key, CORS OK)
- **Storm tracks** (NOAA SPC -- free GeoJSON)
- **Night lights** (NASA Black Marble -- free GIBS tiles)

## Code Style

- TypeScript strict mode
- No UI framework (vanilla TS + DOM APIs)
- No `innerHTML` -- use safe DOM methods (`createElement`, `textContent`, `appendChild`)
- `PointPrimitiveCollection` for bulk data, never individual `Entity` objects
- Mutate point positions in-place on refresh, don't recreate collections

## Pull Request Process

1. Fork the repo and create a feature branch
2. Add your layer following the template above
3. Run `npx tsc --noEmit` -- must pass with zero errors
4. Run `npx vite build` -- must build cleanly
5. Test in a browser: globe loads, your layer renders, toggle works, click shows info card
6. Open a PR with a screenshot of your layer on the globe
