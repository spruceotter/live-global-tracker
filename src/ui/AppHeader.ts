import type { ConnectionManager } from './ConnectionManager';

export class AppHeader {
  private container: HTMLElement;
  private rightGroup: HTMLElement;
  private helpBtn: HTMLElement | null = null;

  constructor(connectionManager?: ConnectionManager) {
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

    // Help button
    const helpBtn = document.createElement('button');
    helpBtn.className = 'header-btn';
    helpBtn.title = 'Keyboard shortcuts (?)';
    helpBtn.textContent = '?';
    helpBtn.style.fontSize = '14px';
    helpBtn.style.fontWeight = '600';
    this.helpBtn = helpBtn;

    // Settings / Data Sources (unified)
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'header-btn';
    settingsBtn.title = 'Settings & Data Sources';
    settingsBtn.textContent = '\u2699';
    settingsBtn.addEventListener('click', () => connectionManager?.toggle());

    this.rightGroup.appendChild(searchHint);
    this.rightGroup.appendChild(helpBtn);
    this.rightGroup.appendChild(settingsBtn);

    this.container.appendChild(title);
    this.container.appendChild(this.rightGroup);
    document.body.appendChild(this.container);
  }

  setHelpAction(action: () => void): void {
    this.helpBtn?.addEventListener('click', action);
  }

  addButton(label: string, title: string, onClick: () => void): void {
    const btn = document.createElement('button');
    btn.className = 'header-btn';
    btn.title = title;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    this.rightGroup.insertBefore(btn, this.rightGroup.lastChild);
  }

  destroy(): void {
    this.container.remove();
  }
}
