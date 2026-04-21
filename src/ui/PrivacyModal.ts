/**
 * Privacy explainer modal for Your Layer.
 *
 * Opened when the user clicks the "🔒 Photos never leave your browser" pill.
 * Frames the technical guarantee in plain language + points to DevTools as
 * a way to verify independently.
 */

export class PrivacyModal {
  private root: HTMLElement;
  private backdrop: HTMLElement;

  constructor() {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'privacy-modal-backdrop';
    this.backdrop.addEventListener('click', () => this.close());

    this.root = document.createElement('div');
    this.root.className = 'privacy-modal';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Privacy explainer');

    const title = document.createElement('h2');
    title.className = 'privacy-modal-title';
    title.textContent = 'Your photos never leave your browser';

    const body = document.createElement('div');
    body.className = 'privacy-modal-body';

    const p1 = document.createElement('p');
    p1.textContent =
      'When you drop a photo on the globe, we read the EXIF header with a client-side JavaScript library. The only thing we pull out is the GPS coordinate and the timestamp. The image bytes never touch a network socket.';
    body.appendChild(p1);

    const p2 = document.createElement('p');
    p2.textContent =
      'The context cards you see are populated by looking up that timestamp and coordinate against public APIs (USGS, Open-Meteo, NOAA, NASA FIRMS, CelesTrak). Those requests carry only a lat/lon/time — no identifier, no photo, no account.';
    body.appendChild(p2);

    const p3 = document.createElement('p');
    p3.className = 'privacy-modal-verify';
    p3.textContent =
      'Want to verify? Open your browser DevTools, switch to the Network tab, and drop a photo. You will see requests to earthquake.usgs.gov, archive-api.open-meteo.com, and a few others — never an upload of your photo.';
    body.appendChild(p3);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'privacy-modal-close';
    closeBtn.textContent = 'Got it';
    closeBtn.addEventListener('click', () => this.close());

    this.root.appendChild(title);
    this.root.appendChild(body);
    this.root.appendChild(closeBtn);

    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.root);

    document.addEventListener('privacy-modal:open', () => this.open());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.root.classList.contains('visible')) this.close();
    });
  }

  open(): void {
    this.backdrop.classList.add('visible');
    this.root.classList.add('visible');
  }

  close(): void {
    this.backdrop.classList.remove('visible');
    this.root.classList.remove('visible');
  }

  destroy(): void {
    this.backdrop.remove();
    this.root.remove();
  }
}
