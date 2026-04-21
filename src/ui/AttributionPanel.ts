/**
 * Attribution panel — required credits for upstream data providers.
 * Compact pill at the bottom-left; click to expand into a full credits modal.
 *
 * Some providers (NASA GIBS, NOAA SWPC, Blitzortung) require visible
 * attribution as a condition of use. This satisfies that and keeps the
 * provenance transparent for users who want to verify.
 */

interface CreditEntry {
  source: string;
  description: string;
  url: string;
}

const CREDITS: CreditEntry[] = [
  { source: 'CelesTrak',                description: 'TLE orbital elements + SATCAT metadata',                          url: 'https://celestrak.org' },
  { source: 'OpenSky Network',          description: 'ADS-B aircraft state vectors',                                    url: 'https://opensky-network.org' },
  { source: 'USGS',                     description: 'Real-time + historical earthquake feed',                          url: 'https://earthquake.usgs.gov' },
  { source: 'NASA FIRMS',               description: 'VIIRS active fire hotspots',                                      url: 'https://firms.modaps.eosdis.nasa.gov' },
  { source: 'NASA GIBS',                description: 'GOES / Himawari / Meteosat near-real-time imagery + Black Marble', url: 'https://gibs.earthdata.nasa.gov' },
  { source: 'NOAA SWPC',                description: 'Planetary K-index space-weather archive',                         url: 'https://www.swpc.noaa.gov' },
  { source: 'NOAA NWS',                 description: 'Severe weather alert polygons',                                   url: 'https://www.weather.gov' },
  { source: 'Blitzortung.org',          description: 'Crowdsourced lightning detection network',                        url: 'https://www.blitzortung.org' },
  { source: 'Open-Meteo',               description: 'Historical weather archive',                                      url: 'https://open-meteo.com' },
  { source: 'Smithsonian GVP',          description: 'Global Volcanism Program activity feed',                          url: 'https://volcano.si.edu' },
  { source: 'GDACS',                    description: 'Global Disaster Alert and Coordination System',                   url: 'https://www.gdacs.org' },
  { source: 'The Space Devs / LL2',     description: 'Upcoming launch schedule',                                        url: 'https://thespacedevs.com' },
  { source: 'OpenWeatherMap',           description: 'Precipitation tile overlay',                                      url: 'https://openweathermap.org' },
  { source: 'Windy',                    description: 'Public live webcams aggregator + embedded players',              url: 'https://www.windy.com/webcams' },
  { source: 'Cesium ion',               description: '3D globe terrain + base imagery',                                 url: 'https://cesium.com' },
];

export class AttributionPanel {
  private pill: HTMLElement;
  private modal: HTMLElement;
  private backdrop: HTMLElement;

  constructor() {
    this.pill = document.createElement('button');
    this.pill.classList.add('attribution-pill');
    (this.pill as HTMLButtonElement).type = 'button';
    this.pill.textContent = 'Sources';
    this.pill.setAttribute('aria-label', 'View data source attributions');
    this.pill.addEventListener('click', () => this.toggle());
    document.body.appendChild(this.pill);

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'attribution-modal-backdrop';
    this.backdrop.addEventListener('click', () => this.close());
    document.body.appendChild(this.backdrop);

    this.modal = document.createElement('div');
    this.modal.className = 'attribution-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-label', 'Data source attributions');

    const title = document.createElement('h2');
    title.textContent = 'Data sources';
    title.className = 'attribution-modal-title';
    this.modal.appendChild(title);

    const intro = document.createElement('p');
    intro.className = 'attribution-modal-intro';
    intro.textContent =
      'Live Global Tracker fuses public, freely-available data feeds. Every entity you see comes from one of the following:';
    this.modal.appendChild(intro);

    const list = document.createElement('ul');
    list.className = 'attribution-modal-list';
    for (const c of CREDITS) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = c.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = c.source;
      const span = document.createElement('span');
      span.textContent = ` — ${c.description}`;
      li.appendChild(a);
      li.appendChild(span);
      list.appendChild(li);
    }
    this.modal.appendChild(list);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'attribution-modal-close';
    (closeBtn as HTMLButtonElement).type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => this.close());
    this.modal.appendChild(closeBtn);

    document.body.appendChild(this.modal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('visible')) this.close();
    });
  }

  toggle(): void {
    this.modal.classList.contains('visible') ? this.close() : this.open();
  }

  open(): void {
    this.backdrop.classList.add('visible');
    this.modal.classList.add('visible');
  }

  close(): void {
    this.backdrop.classList.remove('visible');
    this.modal.classList.remove('visible');
  }
}
