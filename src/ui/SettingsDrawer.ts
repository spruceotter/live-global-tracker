import { getStoredKey, setStoredKey } from '../config';

interface KeyConfig {
  name: string;
  storageKey: string;
  label: string;
  url: string;
  required: boolean;
}

const KEYS: KeyConfig[] = [
  {
    name: 'cesiumIon',
    storageKey: 'cesiumIonToken',
    label: 'Cesium Ion Token',
    url: 'https://ion.cesium.com/signup',
    required: true,
  },
  {
    name: 'owm',
    storageKey: 'owmApiKey',
    label: 'OpenWeatherMap Key',
    url: 'https://home.openweathermap.org/users/sign_up',
    required: false,
  },
  {
    name: 'firms',
    storageKey: 'firmsApiKey',
    label: 'NASA FIRMS Key',
    url: 'https://firms.modaps.eosdis.nasa.gov/api/area/',
    required: false,
  },
];

export class SettingsDrawer {
  private drawer: HTMLElement;
  private visible = false;

  constructor() {
    this.drawer = document.createElement('div');
    this.drawer.className = 'settings-drawer glass';

    const header = document.createElement('div');
    header.className = 'settings-header';

    const title = document.createElement('h2');
    title.className = 'settings-title';
    title.textContent = 'Settings';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'settings-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);
    this.drawer.appendChild(header);

    const subtitle = document.createElement('p');
    subtitle.className = 'settings-subtitle';
    subtitle.textContent = 'API keys are stored locally in your browser. They are never sent to our servers.';
    this.drawer.appendChild(subtitle);

    // Key inputs
    for (const key of KEYS) {
      this.drawer.appendChild(this.createKeyInput(key));
    }

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'settings-save';
    saveBtn.textContent = 'Save & Reload';
    saveBtn.addEventListener('click', () => {
      window.location.reload();
    });
    this.drawer.appendChild(saveBtn);

    document.body.appendChild(this.drawer);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) this.close();
    });
  }

  private createKeyInput(key: KeyConfig): HTMLElement {
    const group = document.createElement('div');
    group.className = 'settings-field';

    const labelRow = document.createElement('div');
    labelRow.className = 'settings-label-row';

    const label = document.createElement('label');
    label.className = 'settings-label';
    label.textContent = key.label;
    if (key.required) {
      const badge = document.createElement('span');
      badge.className = 'settings-required';
      badge.textContent = 'required';
      label.appendChild(badge);
    }

    const link = document.createElement('a');
    link.className = 'settings-link';
    link.textContent = 'Get key';
    link.href = key.url;
    link.target = '_blank';
    link.rel = 'noopener';

    labelRow.appendChild(label);
    labelRow.appendChild(link);

    const input = document.createElement('input');
    input.type = 'password';
    input.className = 'settings-input';
    input.placeholder = 'Paste your key here';
    input.value = getStoredKey(key.storageKey);
    input.autocomplete = 'off';

    input.addEventListener('change', () => {
      setStoredKey(key.storageKey, input.value.trim());
    });

    group.appendChild(labelRow);
    group.appendChild(input);
    return group;
  }

  toggle(): void {
    this.visible ? this.close() : this.open();
  }

  open(): void {
    this.visible = true;
    this.drawer.classList.add('open');
  }

  close(): void {
    this.visible = false;
    this.drawer.classList.remove('open');
  }

  destroy(): void {
    this.drawer.remove();
  }
}
