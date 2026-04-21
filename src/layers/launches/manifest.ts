import type { LayerManifest } from '../../core/types';

/**
 * Upcoming rocket launches from the Launch Library 2 API.
 * CORS-safe, no key, generous free tier — we refresh every 15 min.
 */
export const launchesManifest: LayerManifest = {
  id: 'launches',
  name: 'Rocket launches',
  category: 'infrastructure',
  icon: 'rocket',
  description: 'Upcoming orbital launches from SpaceX, ULA, Roscosmos, CNSA, ISRO, and others',

  source: {
    url: 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=50&mode=detailed',
    format: 'json',
    proxied: false,
    auth: { kind: 'none' },
  },

  rendering: {
    strategy: 'entity',
    maxEntities: 60,
    style: {
      attribute: 'category',
      stops: [
        { value: 'imminent', color: '#fbbf24', size: 12 }, // < 24h
        { value: 'upcoming', color: '#a78bfa', size: 8 },
      ],
      defaultColor: '#a78bfa',
      defaultSize: 8,
    },
    lod: {},
  },

  refresh: { kind: 'poll', intervalMs: 900_000 }, // 15 min
  cache: { ttlMs: 900_000, staleWhileRevalidate: true },

  interaction: {
    detailFields: [
      { label: 'Name', path: 'label', format: 'text' },
      { label: 'Provider', path: 'properties.provider', format: 'text' },
      { label: 'Rocket', path: 'properties.rocket', format: 'text' },
      { label: 'Pad', path: 'properties.pad', format: 'text' },
      { label: 'Launch time (UTC)', path: 'properties.netISO', format: 'text' },
      { label: 'Countdown', path: 'properties.countdown', format: 'text' },
      { label: 'Status', path: 'properties.status', format: 'text' },
    ],
  },

  requiredKeys: [],
  defaultEnabled: false,
  order: 7,
};
