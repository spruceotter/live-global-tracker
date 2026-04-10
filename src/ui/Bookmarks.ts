import * as Cesium from 'cesium';

const STORAGE_KEY = 'lgt_bookmarks';
const MAX_BOOKMARKS = 20;

interface Bookmark {
  id: string;
  name: string;
  lat: number;
  lon: number;
  alt: number;
  heading: number;
  pitch: number;
  layers: string[];
  created: number;
}

export class Bookmarks {
  private viewer: Cesium.Viewer;
  private panel: HTMLElement;
  private listEl: HTMLElement;
  private visible = false;

  constructor(viewer: Cesium.Viewer, getActiveLayers: () => string[]) {
    this.viewer = viewer;

    this.panel = document.createElement('div');
    this.panel.className = 'bookmarks-panel glass';

    const header = document.createElement('div');
    header.className = 'bm-header';

    const title = document.createElement('span');
    title.className = 'bm-title';
    title.textContent = 'Bookmarks';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'bm-save-btn';
    saveBtn.textContent = '+ Save View';
    saveBtn.addEventListener('click', () => {
      const name = `View ${this.getAll().length + 1}`;
      this.save(name, getActiveLayers());
      this.renderList(getActiveLayers);
    });

    header.appendChild(title);
    header.appendChild(saveBtn);

    this.listEl = document.createElement('div');
    this.listEl.className = 'bm-list';

    this.panel.appendChild(header);
    this.panel.appendChild(this.listEl);
    document.body.appendChild(this.panel);

    this.renderList(getActiveLayers);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.panel.classList.toggle('open', this.visible);
  }

  private save(name: string, activeLayers: string[]): void {
    const carto = this.viewer.camera.positionCartographic;
    const bookmark: Bookmark = {
      id: `bm-${Date.now()}`,
      name,
      lat: Cesium.Math.toDegrees(carto.latitude),
      lon: Cesium.Math.toDegrees(carto.longitude),
      alt: carto.height,
      heading: Cesium.Math.toDegrees(this.viewer.camera.heading),
      pitch: Cesium.Math.toDegrees(this.viewer.camera.pitch),
      layers: activeLayers,
      created: Date.now(),
    };

    const all = this.getAll();
    all.push(bookmark);
    if (all.length > MAX_BOOKMARKS) all.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  private getAll(): Bookmark[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private flyTo(bookmark: Bookmark): void {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(bookmark.lon, bookmark.lat, bookmark.alt),
      orientation: {
        heading: Cesium.Math.toRadians(bookmark.heading),
        pitch: Cesium.Math.toRadians(bookmark.pitch),
        roll: 0,
      },
      duration: 2,
    });
  }

  private delete(id: string, getActiveLayers: () => string[]): void {
    const all = this.getAll().filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    this.renderList(getActiveLayers);
  }

  private renderList(getActiveLayers: () => string[]): void {
    this.listEl.replaceChildren();
    const all = this.getAll();

    if (all.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'bm-empty';
      empty.textContent = 'No saved bookmarks yet';
      this.listEl.appendChild(empty);
      return;
    }

    for (const bm of all) {
      const row = document.createElement('div');
      row.className = 'bm-item';

      const nameEl = document.createElement('button');
      nameEl.className = 'bm-name';
      nameEl.textContent = bm.name;
      nameEl.addEventListener('click', () => this.flyTo(bm));

      const delBtn = document.createElement('button');
      delBtn.className = 'bm-delete';
      delBtn.textContent = '\u00D7';
      delBtn.addEventListener('click', () => this.delete(bm.id, getActiveLayers));

      row.appendChild(nameEl);
      row.appendChild(delBtn);
      this.listEl.appendChild(row);
    }
  }

  destroy(): void {
    this.panel.remove();
  }
}
