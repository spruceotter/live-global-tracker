import type { SettingsDrawer } from './SettingsDrawer';
import type { ConnectionManager } from './ConnectionManager';

export class AppHeader {
  private container: HTMLElement;
  private rightGroup: HTMLElement;

  constructor(settingsDrawer?: SettingsDrawer, connectionManager?: ConnectionManager) {
    this.container = document.createElement('header');
    this.container.className = 'app-header';

    const title = document.createElement('div');
    title.className = 'app-title';
    title.textContent = 'Live Global Tracker';

    this.rightGroup = document.createElement('div');
    this.rightGroup.style.display = 'flex';
    this.rightGroup.style.gap = '8px';
    this.rightGroup.style.alignItems = 'center';

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

    this.rightGroup.appendChild(searchHint);
    this.rightGroup.appendChild(sourcesBtn);
    this.rightGroup.appendChild(gear);

    this.container.appendChild(title);
    this.container.appendChild(this.rightGroup);
    document.body.appendChild(this.container);
  }

  addButton(label: string, title: string, onClick: () => void): void {
    const btn = document.createElement('button');
    btn.className = 'header-btn';
    btn.title = title;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    // Insert before the last element (gear)
    this.rightGroup.insertBefore(btn, this.rightGroup.lastChild);
  }

  destroy(): void {
    this.container.remove();
  }
}
