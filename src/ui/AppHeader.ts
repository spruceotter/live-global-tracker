import type { SettingsDrawer } from './SettingsDrawer';
import type { ConnectionManager } from './ConnectionManager';

export class AppHeader {
  private container: HTMLElement;

  constructor(settingsDrawer?: SettingsDrawer, connectionManager?: ConnectionManager) {
    this.container = document.createElement('header');
    this.container.className = 'app-header';

    const title = document.createElement('div');
    title.className = 'app-title';
    title.textContent = 'Live Global Tracker';

    const rightGroup = document.createElement('div');
    rightGroup.style.display = 'flex';
    rightGroup.style.gap = '8px';
    rightGroup.style.alignItems = 'center';

    const searchHint = document.createElement('div');
    searchHint.className = 'header-search-hint';
    searchHint.textContent = '\u2318K to search';

    const sourcesBtn = document.createElement('button');
    sourcesBtn.className = 'header-btn';
    sourcesBtn.title = 'Data Sources';
    sourcesBtn.textContent = '\u{1F4E1}';
    sourcesBtn.addEventListener('click', () => connectionManager?.toggle());

    const gear = document.createElement('button');
    gear.className = 'header-btn';
    gear.title = 'Settings';
    gear.textContent = '\u2699';
    gear.addEventListener('click', () => settingsDrawer?.toggle());

    rightGroup.appendChild(searchHint);
    rightGroup.appendChild(sourcesBtn);
    rightGroup.appendChild(gear);

    this.container.appendChild(title);
    this.container.appendChild(rightGroup);
    document.body.appendChild(this.container);
  }

  destroy(): void {
    this.container.remove();
  }
}
