import type * as Cesium from 'cesium';

// --- Data Formats & Rendering ---

export type DataFormat = 'json' | 'csv' | 'geojson' | 'tle' | 'tiles';

export type RenderStrategy = 'point-cloud' | 'entity' | 'imagery';

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
      | { kind: 'api-key-query'; paramName: string; envVar: string };
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

// --- Layer Interface ---

export interface IDataLayer {
  readonly manifest: LayerManifest;

  initialize(viewer: Cesium.Viewer): Promise<void>;
  update(): Promise<void>;
  destroy(): void;

  setVisible(visible: boolean): void;
  isVisible(): boolean;
  getFeatureCount(): number;
  getLastUpdated(): Date | null;

  getFeatureById(id: string): NormalizedFeature | null;
  search(query: string): Array<{ id: string; label: string; lat: number; lon: number; alt?: number }>;
}
