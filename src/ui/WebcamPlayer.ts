/**
 * Live webcam player modal.
 *
 * Listens for `webcam:play` CustomEvents dispatched by the click handler and
 * shows the Windy player iframe for the selected cam. Windy's `player.live`
 * URLs are specifically designed to be iframe-embeddable (unlike most webcam
 * sources which set X-Frame-Options: DENY).
 */

import type { NormalizedFeature } from '../core/types';

export interface WebcamPlayEventDetail {
  feature: NormalizedFeature;
}

export class WebcamPlayer {
  private backdrop: HTMLElement;
  private modal: HTMLElement;
  private titleEl: HTMLElement;
  private locationEl: HTMLElement;
  private iframeHolder: HTMLElement;
  private externalLink: HTMLAnchorElement;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'webcam-player-backdrop';
    this.backdrop.addEventListener('click', () => this.close());
    document.body.appendChild(this.backdrop);

    this.modal = document.createElement('div');
    this.modal.className = 'webcam-player-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-label', 'Live webcam player');

    // Header
    const head = document.createElement('div');
    head.className = 'webcam-player-head';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'webcam-player-title-wrap';
    this.titleEl = document.createElement('div');
    this.titleEl.className = 'webcam-player-title';
    this.locationEl = document.createElement('div');
    this.locationEl.className = 'webcam-player-location';
    titleWrap.appendChild(this.titleEl);
    titleWrap.appendChild(this.locationEl);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'webcam-player-close';
    closeBtn.setAttribute('aria-label', 'Close player');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.close());

    head.appendChild(titleWrap);
    head.appendChild(closeBtn);
    this.modal.appendChild(head);

    // Iframe container (iframe is created/destroyed per show so we don't
    // leak network connections when the modal closes)
    this.iframeHolder = document.createElement('div');
    this.iframeHolder.className = 'webcam-player-iframe-holder';
    this.modal.appendChild(this.iframeHolder);

    // Footer: attribution + external link
    const foot = document.createElement('div');
    foot.className = 'webcam-player-foot';
    const credit = document.createElement('span');
    credit.className = 'webcam-player-credit';
    credit.textContent = 'Video courtesy of the camera operator via Windy';
    this.externalLink = document.createElement('a');
    this.externalLink.className = 'webcam-player-external';
    this.externalLink.target = '_blank';
    this.externalLink.rel = 'noopener noreferrer';
    this.externalLink.textContent = 'Open on windy.com ↗';
    foot.appendChild(credit);
    foot.appendChild(this.externalLink);
    this.modal.appendChild(foot);

    document.body.appendChild(this.modal);

    // Wire up event bus + keyboard dismiss
    document.addEventListener('webcam:play', ((e: CustomEvent<WebcamPlayEventDetail>) => {
      this.showFor(e.detail.feature);
    }) as EventListener);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('visible')) this.close();
    });
  }

  showFor(feature: NormalizedFeature): void {
    const props = feature.properties;
    const title = feature.label ?? 'Live webcam';
    const location = (props.locationLabel as string) ?? '';
    const playerUrl = (props.playerLiveUrl as string) || (props.playerDayUrl as string) || '';
    const webcamId = props.webcamId;

    this.titleEl.textContent = title;
    this.locationEl.textContent = location;
    this.externalLink.href = webcamId ? `https://www.windy.com/webcams/${webcamId}` : 'https://www.windy.com/webcams';

    // Wipe any previous iframe before creating a new one
    this.iframeHolder.replaceChildren();

    if (!playerUrl) {
      const fallback = document.createElement('div');
      fallback.className = 'webcam-player-fallback';
      fallback.textContent = 'No embeddable player for this webcam. Use the link below to open on windy.com.';
      this.iframeHolder.appendChild(fallback);
    } else {
      const iframe = document.createElement('iframe');
      iframe.src = playerUrl;
      iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      iframe.title = `Live webcam: ${title}`;
      this.iframeHolder.appendChild(iframe);
    }

    this.backdrop.classList.add('visible');
    this.modal.classList.add('visible');
  }

  close(): void {
    this.backdrop.classList.remove('visible');
    this.modal.classList.remove('visible');
    // Tear down the iframe so the stream stops — prevents bandwidth usage
    // after dismissal, and is the least-surprising default for a modal.
    this.iframeHolder.replaceChildren();
  }
}
