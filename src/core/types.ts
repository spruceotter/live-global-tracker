import type * as Cesium from 'cesium';

// --- Data Formats & Rendering ---

export type DataFormat = 'json' | 'csv' | 'geojson' | 'tle' | 'tiles';

export type RenderStrategy =
  | 'point-cloud'
  | 'billboard'
  | 'polyline'
  | 'polygon'
  | 'heatmap'
  | 'entity'
  | 'imagery';

// --- Geometry ---

export interface LinestringGeometry {
  type: 'linestring';
  coordinates: Array<[number, number, number?]>; // [lon, lat, alt?]
}

export interface PolygonGeometry {
  type: 'polygon';
  coordinates: Array<Array<[number, number]>>; // outer ring, optional holes
}

export type FeatureGeometry = LinestringGeometry | PolygonGeometry;

// --- Visual Presets ---

export type PointShape = 'dot' | 'circle' | 'glow' | 'pulse' | 'directional-arrow' | 'icon';

export interface PointVisualConfig {
  shape: PointShape;
  rotation?: { attr: string; offset?: number };
  icon?: string;
}

export type LineShape = 'solid' | 'dashed' | 'glow' | 'animated-flow';

export interface LineVisualConfig {
  shape: LineShape;
  width?: number;
  glowPower?: number;
}

export interface VisualPresetConfig {
  point?: PointVisualConfig;
  line?: LineVisualConfig;
}

// --- Styling ---

export interface StyleStop {
  value: number | string;
  color: string;
  size?: number;
}

export interface StyleRule {
  attribute: string;
  stops: StyleStop[];
  defaultColor: string;
  defaultSize: number;
  visual?: VisualPresetConfig;
}

// --- Interaction ---

export interface DetailField {
  label: string;
  path: string;
  format?: 'number' | 'date' | 'latlon' | 'text';
}

// --- Normalized Data ---

export interface NormalizedFeature {
  id: string;
  lat: number;
  lon: number;
  alt?: number;
  timestamp?: number;
  category: string;
  label?: string;
  properties: Record<string, unknown>;
  geometry?: FeatureGeometry;
}

// --- Layer Manifest ---

export interface LayerManifest {
  id: string;
  name: string;
  category: 'tracking' | 'hazards' | 'weather' | 'environment' | 'infrastructure';
  icon: string;
  description: string;

  source: {
    url: string | ((config: Record<string, string>) => string);
    format: DataFormat;
    proxied: boolean;
    auth:
      | { kind: 'none' }
      | { kind: 'api-key-query'; paramName: string; envVar: string }
      | { kind: 'api-key-header'; headerName: string; envVar: string }
      | { kind: 'bearer'; envVar: string };
  };

  rendering: {
    strategy: RenderStrategy;
    maxEntities: number;
    style: StyleRule;
    lod: {
      hideAbove?: number;
      showBelow?: number;
    };
  };

  refresh: { kind: 'poll'; intervalMs: number } | { kind: 'one-shot' };

  cache: {
    ttlMs: number;
    staleWhileRevalidate: boolean;
  };

  interaction: {
    detailFields: DetailField[];
  };

  requiredKeys: string[];
  defaultEnabled: boolean;
  order: number;
}

// --- Layer Status ---

export type LayerStatus = 'idle' | 'loading' | 'loaded' | 'error';

// --- Layer Interface ---

export interface IDataLayer {
  readonly manifest: LayerManifest;

  initialize(viewer: Cesium.Viewer): Promise<void>;
  update(): Promise<void>;
  destroy(): void;
  retry(): Promise<void>;

  setVisible(visible: boolean): void;
  isVisible(): boolean;
  getFeatureCount(): number;
  getLastUpdated(): Date | null;
  getStatus(): LayerStatus;
  getError(): string | null;

  setDisplayLimit(limit: number): void;
  getMaxEntities(): number;
  getTotalAvailable(): number;

  getFeatureById(id: string): NormalizedFeature | null;
  search(query: string): Array<{ id: string; label: string; lat: number; lon: number; alt?: number }>;
}
