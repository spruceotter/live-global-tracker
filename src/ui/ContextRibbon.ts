/**
 * Context ribbon — the payload of "Your Layer."
 *
 * Given an EphemeralPin, renders six cards at the bottom of the viewport,
 * each showing one historical fact about that (lat, lon, time) moment.
 * Providers resolve in parallel via Promise.allSettled — a failing provider
 * yields an "unavailable" card, never blocks the rest.
 */

import type { ContextFact, ContextFactKind } from '../services/historical/types';
import { getHistoricalContext } from '../services/historical';
import type { EphemeralPin, EphemeralPinStore } from '../core/EphemeralPin';

const CARD_ORDER: ContextFactKind[] = ['satellites', 'quakes', 'weather', 'astronomy', 'fires', 'spaceweather'];
const CARD_ICON: Record<ContextFactKind, string> = {
  satellites: '🛰',
  quakes: '🔴',
  weather: '☁',
  astronomy: '🌙',
  fires: '🔥',
  spaceweather: '🌌',
};
const CARD_LABEL: Record<ContextFactKind, string> = {
  satellites: 'Satellites',
  quakes: 'Earthquakes',
  weather: 'Weather',
  astronomy: 'Sky',
  fires: 'Fires',
  spaceweather: 'Space weather',
};

export class ContextRibbon {
  private root: HTMLElement;
  private header: HTMLElement;
  private cardsRow: HTMLElement;
  private dismissBtn: HTMLButtonElement;
  private currentPin: EphemeralPin | null = null;
  private store: EphemeralPinStore;
  private cardEls = new Map<ContextFactKind, { card: HTMLElement; head: HTMLElement; body: HTMLElement }>();

  constructor(store: EphemeralPinStore) {
    this.store = store;

    this.root = document.createElement('div');
    this.root.className = 'context-ribbon';
    this.root.setAttribute('role', 'complementary');
    this.root.setAttribute('aria-label', 'Historical context for pinned photo');

    // Header row: title + dismiss
    this.header = document.createElement('div');
    this.header.className = 'context-ribbon-head';

    const title = document.createElement('div');
    title.className = 'context-ribbon-title';
    title.textContent = 'What was happening here';
    this.header.appendChild(title);

    this.dismissBtn = document.createElement('button');
    this.dismissBtn.type = 'button';
    this.dismissBtn.className = 'context-ribbon-dismiss';
    this.dismissBtn.setAttribute('aria-label', 'Close context ribbon');
    this.dismissBtn.textContent = '×';
    this.dismissBtn.addEventListener('click', () => this.hide());
    this.header.appendChild(this.dismissBtn);

    this.root.appendChild(this.header);

    // Cards row
    this.cardsRow = document.createElement('div');
    this.cardsRow.className = 'context-ribbon-cards';
    for (const kind of CARD_ORDER) {
      const card = document.createElement('div');
      card.className = `context-card context-card-${kind} context-card-loading`;

      const head = document.createElement('div');
      head.className = 'context-card-head';
      const icon = document.createElement('span');
      icon.className = 'context-card-icon';
      icon.textContent = CARD_ICON[kind];
      const label = document.createElement('span');
      label.className = 'context-card-label';
      label.textContent = CARD_LABEL[kind];
      head.appendChild(icon);
      head.appendChild(label);

      const body = document.createElement('div');
      body.className = 'context-card-body';
      body.textContent = 'Loading…';

      card.appendChild(head);
      card.appendChild(body);
      this.cardsRow.appendChild(card);
      this.cardEls.set(kind, { card, head, body });
    }
    this.root.appendChild(this.cardsRow);

    document.body.appendChild(this.root);
  }

  async showFor(pin: EphemeralPin): Promise<void> {
    this.currentPin = pin;

    // Reset all cards to loading
    for (const kind of CARD_ORDER) {
      const slot = this.cardEls.get(kind)!;
      slot.card.className = `context-card context-card-${kind} context-card-loading`;
      slot.body.textContent = 'Loading…';
      slot.body.title = '';
    }

    // Update title with photo metadata (location + time, not name — privacy)
    const titleEl = this.header.querySelector('.context-ribbon-title') as HTMLElement;
    if (titleEl) {
      const when = new Date(pin.timestamp);
      const dateStr = when.toISOString().slice(0, 16).replace('T', ' ');
      titleEl.textContent = `What was happening · ${pin.lat.toFixed(2)}°, ${pin.lon.toFixed(2)}° · ${dateStr} UTC`;
    }

    this.root.classList.add('visible');

    const facts = await getHistoricalContext({
      lat: pin.lat,
      lon: pin.lon,
      time: new Date(pin.timestamp),
    });

    // Only render if the ribbon is still showing this pin
    if (this.currentPin?.id !== pin.id) return;
    this.applyFacts(facts);
    this.store.update(pin.id, { facts });
  }

  private applyFacts(facts: ContextFact[]): void {
    for (const fact of facts) {
      const slot = this.cardEls.get(fact.kind);
      if (!slot) continue;
      slot.card.classList.remove('context-card-loading');
      slot.card.classList.toggle('context-card-unavailable', !fact.available);

      // Use safe DOM: headline + optional detail line
      slot.body.textContent = '';
      const headline = document.createElement('div');
      headline.className = 'context-card-headline';
      headline.textContent = fact.headline;
      slot.body.appendChild(headline);
      if (fact.detail) {
        const detail = document.createElement('div');
        detail.className = 'context-card-detail';
        detail.textContent = fact.detail;
        slot.body.appendChild(detail);
      }
      slot.body.title = `Source: ${fact.sourceLabel}`;
    }
  }

  hide(): void {
    this.root.classList.remove('visible');
    this.currentPin = null;
  }

  destroy(): void {
    this.root.remove();
  }
}
