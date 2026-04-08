export class AppHeader {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('header');
    this.container.className = 'app-header';

    const title = document.createElement('div');
    title.className = 'app-title';
    title.textContent = 'Live Global Tracker';

    const spacer = document.createElement('div');
    spacer.style.flex = '1';

    const gear = document.createElement('button');
    gear.className = 'header-btn';
    gear.title = 'Settings';
    gear.textContent = '\u2699';
    gear.addEventListener('click', () => {
      // Settings drawer - future feature
      console.log('Settings clicked');
    });

    this.container.appendChild(title);
    this.container.appendChild(spacer);
    this.container.appendChild(gear);
    document.body.appendChild(this.container);
  }

  destroy(): void {
    this.container.remove();
  }
}
