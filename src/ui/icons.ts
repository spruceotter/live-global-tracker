/**
 * Cohesive SVG icon system for Live Global Tracker.
 * All icons: 20x20 viewBox, 1.5px stroke weight, currentColor.
 * Designed to be recognizable at 16px and beautiful at 24px.
 */

export const ICONS: Record<string, string> = {
  // Tracking
  satellite:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><ellipse cx="10" cy="10" rx="8" ry="3" transform="rotate(-30 10 10)"/><circle cx="10" cy="10" r="2.5" fill="currentColor" stroke="none"/></svg>',
  aircraft:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 3v14M6 8l4-2 4 2M5 13l5-1.5 5 1.5"/></svg>',
  ship:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 14c2 2 5 2 7 0s5-2 7 0M5 14V7l5-3 5 3v7"/><line x1="10" y1="4" x2="10" y2="10"/></svg>',

  // Hazards
  earthquake:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="3"/><circle cx="10" cy="10" r="6" opacity="0.5"/><circle cx="10" cy="10" r="8.5" opacity="0.25"/></svg>',
  volcano:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l4-9 3 3 3-3 4 9H3z"/><path d="M9 5l1-3 1 3" opacity="0.6"/></svg>',
  fire:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 2c0 3-4 5-4 9a4 4 0 008 0c0-2-1-3-2-4 0 2-2 3-2 1s1-4 0-6z"/></svg>',
  storm:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L7 11h5l-4 7"/></svg>',
  gdacs:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/><path d="M10 3v3M10 14v3M3 10h3M14 10h3" stroke-linecap="round"/></svg>',

  // Weather
  weather:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 15a4 4 0 01-.3-8A5.5 5.5 0 0115 8a3.5 3.5 0 01.3 7H6z"/></svg>',
  weatheralert:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2l8 14H2L10 2z"/><line x1="10" y1="8" x2="10" y2="11"/><circle cx="10" cy="13.5" r="0.5" fill="currentColor" stroke="none"/></svg>',

  // Environment
  nightlights:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2a8 8 0 105 14A6.5 6.5 0 0110 2z"/></svg>',
  deforestation:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 2l-5 6h3l-4 5h3l-4 5h14l-4-5h3l-4-5h3L10 2z"/></svg>',
  airquality:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3.5" opacity="0.5"/><circle cx="10" cy="10" r="1" fill="currentColor" stroke="none"/></svg>',
  ocean:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 10c2-2 4-2 6 0s4 2 6 0s4-2 6 0M2 14c2-2 4-2 6 0s4 2 6 0"/></svg>',

  // Infrastructure
  traffic:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="7" y="2" width="6" height="16" rx="3"/><circle cx="10" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="10" cy="10" r="1.5" opacity="0.5" fill="currentColor" stroke="none"/><circle cx="10" cy="14" r="1.5" opacity="0.3" fill="currentColor" stroke="none"/></svg>',
  transit:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="5" y="3" width="10" height="11" rx="2"/><line x1="5" y1="8" x2="15" y2="8"/><circle cx="7.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="12" r="1" fill="currentColor" stroke="none"/><line x1="7" y1="16" x2="5" y2="18"/><line x1="13" y1="16" x2="15" y2="18"/></svg>',
};

// Map manifest icon keys to icon system keys
export const ICON_MAP: Record<string, string> = {
  sat: 'satellite',
  aircraft: 'aircraft',
  quake: 'earthquake',
  fire: 'fire',
  weather: 'weather',
  nightlights: 'nightlights',
  volcano: 'volcano',
  storm: 'weatheralert',
  gdacs: 'gdacs',
  ship: 'ship',
  airquality: 'airquality',
};

export function getLayerIcon(manifestIcon: string): string {
  const key = ICON_MAP[manifestIcon] ?? manifestIcon;
  return ICONS[key] ?? ICONS.earthquake; // fallback
}
