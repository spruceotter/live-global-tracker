import * as Cesium from 'cesium';
import type { LayerManager } from '../core/LayerManager';
import type { ExportTools } from './ExportTools';

interface ShortcutDef {
  key: string;
  label: string;
  group: string;
  action: () => void;
}

export class KeyboardShortcuts {
  private overlay: HTMLElement;
  private visible = false;
  private shortcuts: ShortcutDef[] = [];

  constructor(
    viewer: Cesium.Viewer,
    manager: LayerManager,
    exportTools: ExportTools,
    openSearch: () => void,
    openSources: () => void,
    toggleMeasure: () => void
  ) {
    // Register all shortcuts
    this.shortcuts = [
      { key: '\u2318K', label: 'Search', group: 'Navigation', action: openSearch },
      { key: 'R', label: 'Reset camera', group: 'Navigation', action: () => {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(-30, 20, 25_000_000),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
          duration: 2,
        });
      }},
      { key: 'D', label: 'Data sources', group: 'Panels', action: openSources },
      { key: 'M', label: 'Measure tools', group: 'Panels', action: toggleMeasure },
      { key: 'Space', label: 'Play / pause timeline', group: 'Playback', action: () => {} },
      { key: '\u2190\u2192', label: 'Step timeline', group: 'Playback', action: () => {} },
      { key: 'S', label: 'Screenshot', group: 'Export', action: () => exportTools.screenshot() },
      { key: 'L', label: 'Copy link', group: 'Export', action: () => exportTools.copyLink() },
      { key: 'Esc', label: 'Close panel', group: 'General', action: () => {} },
      { key: '?', label: 'Show shortcuts', group: 'General', action: () => this.toggle() },
    ];

    // Add layer toggles
    const layers = manager.getAll();
    layers.forEach((layer, i) => {
      if (i < 9) {
        this.shortcuts.push({
          key: String(i + 1),
          label: `Toggle ${layer.manifest.name}`,
          group: 'Layers',
          action: () => manager.toggleLayer(layer.manifest.id),
        });
      }
    });

    // Build overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'shortcuts-overlay';

    const modal = document.createElement('div');
    modal.className = 'shortcuts-modal glass';

    const title = document.createElement('h2');
    title.className = 'shortcuts-title';
    title.textContent = 'Keyboard Shortcuts';
    modal.appendChild(title);

    // Group shortcuts
    const groups = new Map<string, ShortcutDef[]>();
    for (const s of this.shortcuts) {
      if (!groups.has(s.group)) groups.set(s.group, []);
      groups.get(s.group)!.push(s);
    }

    for (const [group, items] of groups) {
      const groupEl = document.createElement('div');
      groupEl.className = 'shortcuts-group';

      const groupTitle = document.createElement('div');
      groupTitle.className = 'shortcuts-group-title';
      groupTitle.textContent = group;
      groupEl.appendChild(groupTitle);

      for (const item of items) {
        const row = document.createElement('div');
        row.className = 'shortcuts-row';

        const keyEl = document.createElement('span');
        keyEl.className = 'shortcuts-key';
        keyEl.textContent = item.key;

        const labelEl = document.createElement('span');
        labelEl.className = 'shortcuts-label';
        labelEl.textContent = item.label;

        row.appendChild(labelEl);
        row.appendChild(keyEl);
        groupEl.appendChild(row);
      }

      modal.appendChild(groupEl);
    }

    this.overlay.appendChild(modal);
    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Global keyboard listener
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '?' || (e.key === '/' && !e.shiftKey)) {
        e.preventDefault();
        this.toggle();
        return;
      }

      if (e.key === 's' && !e.metaKey && !e.ctrlKey) {
        exportTools.screenshot();
        return;
      }

      if (e.key === 'l' && !e.metaKey && !e.ctrlKey) {
        exportTools.copyLink();
        return;
      }

      if (e.key === 'd') {
        openSources();
        return;
      }

      // Number keys for layer toggles
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const layers = manager.getAll();
        if (num - 1 < layers.length) {
          manager.toggleLayer(layers[num - 1].manifest.id);
        }
      }
    });
  }

  toggle(): void {
    this.visible ? this.close() : this.open();
  }

  open(): void {
    this.visible = true;
    this.overlay.classList.add('open');
  }

  close(): void {
    this.visible = false;
    this.overlay.classList.remove('open');
  }

  destroy(): void {
    this.overlay.remove();
  }
}
