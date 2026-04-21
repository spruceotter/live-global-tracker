const STORAGE_KEY = 'lgt_onboarded';

interface Step {
  title: string;
  description: string;
  highlight?: string; // CSS selector to spotlight
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Live Global Tracker',
    description: 'A real-time 3D globe showing satellites, aircraft, earthquakes, wildfires, and more — all updating live.',
  },
  {
    title: 'Data Layers',
    description: 'Hover over the panel on the left to see all available data layers. Toggle them on and off, adjust density.',
    highlight: '.arc-console',
  },
  {
    title: 'Search Anywhere',
    description: 'Press \u2318K to search for places, satellites, aircraft, earthquakes — or type coordinates directly.',
    highlight: '.header-search-hint',
  },
  {
    title: 'Your Layer',
    description: 'Drop a geotagged photo on the globe. We read the EXIF locally and show you what was happening there: who was overhead, what the weather was, the moon phase. Photos never leave your browser.',
  },
  {
    title: 'Lightning, live',
    description: 'Toggle the Lightning layer to see real-time strike detections from the Blitzortung community network. Each flash is a real bolt within the last second.',
  },
  {
    title: 'Data Sources',
    description: 'Click the gear icon to manage data sources, add API keys, or connect your own custom data. Click "Sources" at the bottom-left to see attributions.',
    highlight: '.app-header',
  },
  {
    title: 'Keyboard Shortcuts',
    description: 'Press ? anytime to see all shortcuts. S for screenshot, M for measurement, Space for timeline.',
  },
];

export class Onboarding {
  private overlay!: HTMLElement;
  private currentStep = 0;
  private spotlightEl: HTMLElement | null = null;

  constructor() {
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'onboarding-overlay';

    this.renderStep();
    document.body.appendChild(this.overlay);
  }

  private renderStep(): void {
    if (!this.overlay) return;
    this.overlay.replaceChildren();
    this.clearSpotlight();

    const step = STEPS[this.currentStep];
    if (!step) {
      this.dismiss();
      return;
    }

    // Spotlight target element
    if (step.highlight) {
      const target = document.querySelector(step.highlight) as HTMLElement;
      if (target) {
        this.spotlightEl = document.createElement('div');
        this.spotlightEl.className = 'onboarding-spotlight';
        const rect = target.getBoundingClientRect();
        this.spotlightEl.style.left = `${rect.left - 8}px`;
        this.spotlightEl.style.top = `${rect.top - 8}px`;
        this.spotlightEl.style.width = `${rect.width + 16}px`;
        this.spotlightEl.style.height = `${rect.height + 16}px`;
        document.body.appendChild(this.spotlightEl);
      }
    }

    const card = document.createElement('div');
    card.className = 'onboarding-card glass';

    const title = document.createElement('h3');
    title.className = 'onboarding-title';
    title.textContent = step.title;

    const desc = document.createElement('p');
    desc.className = 'onboarding-desc';
    desc.textContent = step.description;

    const footer = document.createElement('div');
    footer.className = 'onboarding-footer';

    // Step indicator
    const dots = document.createElement('div');
    dots.className = 'onboarding-dots';
    for (let i = 0; i < STEPS.length; i++) {
      const dot = document.createElement('span');
      dot.className = `onboarding-dot${i === this.currentStep ? ' active' : ''}`;
      dots.appendChild(dot);
    }

    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '8px';

    const skipBtn = document.createElement('button');
    skipBtn.className = 'onboarding-btn skip';
    skipBtn.textContent = 'Skip';
    skipBtn.addEventListener('click', () => this.dismiss());

    const nextBtn = document.createElement('button');
    nextBtn.className = 'onboarding-btn next';
    nextBtn.textContent = this.currentStep === STEPS.length - 1 ? 'Get Started' : 'Next';
    nextBtn.addEventListener('click', () => {
      this.currentStep++;
      if (this.currentStep >= STEPS.length) {
        this.dismiss();
      } else {
        this.renderStep();
      }
    });

    btnGroup.appendChild(skipBtn);
    btnGroup.appendChild(nextBtn);

    footer.appendChild(dots);
    footer.appendChild(btnGroup);

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(footer);
    this.overlay.appendChild(card);
  }

  private clearSpotlight(): void {
    if (this.spotlightEl) {
      this.spotlightEl.remove();
      this.spotlightEl = null;
    }
  }

  private dismiss(): void {
    localStorage.setItem(STORAGE_KEY, 'true');
    this.clearSpotlight();
    this.overlay?.remove();
  }
}
