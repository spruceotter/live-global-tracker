import type * as Cesium from 'cesium';
import type { NormalizedFeature, StyleRule } from '../core/types';

export interface IRenderer {
  render(features: NormalizedFeature[], style: StyleRule): void;
  setVisible(visible: boolean): void;
  setOpacity?(opacity: number): void;
  destroy(): void;

  /** For click/hover interaction: check if this renderer owns the picked object */
  ownsPickedObject?(picked: Record<string, unknown>): { featureId: string } | null;
}

export type RendererFactory = (viewer: Cesium.Viewer) => IRenderer;

const registry = new Map<string, RendererFactory>();

export function registerRenderer(strategy: string, factory: RendererFactory): void {
  registry.set(strategy, factory);
}

export function createRenderer(strategy: string, viewer: Cesium.Viewer): IRenderer {
  const factory = registry.get(strategy);
  if (!factory) {
    throw new Error(
      `No renderer for strategy "${strategy}". Available: ${[...registry.keys()].join(', ')}`
    );
  }
  return factory(viewer);
}

export function hasRenderer(strategy: string): boolean {
  return registry.has(strategy);
}
