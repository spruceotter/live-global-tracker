/**
 * Your Layer photo drop zone.
 *
 * Drag a JPEG / HEIC / PNG onto the globe → exifr extracts GPS + timestamp
 * client-side → an EphemeralPin drops at those coordinates → the camera flies
 * in → the ContextRibbon resolves six historical facts for that spot and
 * moment.
 *
 * Nothing about the photo itself leaves the browser. We only ever persist
 * the tiny tuple (lat, lon, time, name) to sessionStorage, never bytes.
 */

import * as Cesium from 'cesium';
import { parse as exifrParse } from 'exifr';
import { EphemeralPinStore, makePinId } from '../core/EphemeralPin';
import type { ContextRibbon } from './ContextRibbon';

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/heic', 'image/heif', 'image/png', 'image/tiff'];

interface ExifData {
  latitude?: number;
  longitude?: number;
  DateTimeOriginal?: Date;
  CreateDate?: Date;
  ModifyDate?: Date;
}

export class PhotoDropZone {
  private overlay: HTMLElement;
  private pill: HTMLElement;
  private status: HTMLElement;
  private viewer: Cesium.Viewer;
  private store: EphemeralPinStore;
  private ribbon: ContextRibbon;
  private dragCounter = 0;

  constructor(viewer: Cesium.Viewer, store: EphemeralPinStore, ribbon: ContextRibbon) {
    this.viewer = viewer;
    this.store = store;
    this.ribbon = ribbon;

    this.overlay = document.createElement('div');
    this.overlay.className = 'photo-drop-overlay';

    const inner = document.createElement('div');
    inner.className = 'photo-drop-inner';

    const title = document.createElement('div');
    title.className = 'photo-drop-title';
    title.textContent = 'Drop a photo to see what was happening there';

    const subtitle = document.createElement('div');
    subtitle.className = 'photo-drop-subtitle';
    subtitle.textContent = 'JPEG, HEIC, or PNG with GPS — photos never leave this browser';

    inner.appendChild(title);
    inner.appendChild(subtitle);
    this.overlay.appendChild(inner);
    document.body.appendChild(this.overlay);

    // Persistent privacy pill shown after first drop (and on hover for awareness)
    const pillBtn = document.createElement('button');
    pillBtn.type = 'button';
    this.pill = pillBtn;
    this.pill.className = 'privacy-pill';
    this.pill.textContent = '🔒 Photos never leave your browser';
    this.pill.setAttribute('aria-label', 'Privacy: your photos are not uploaded anywhere');
    this.pill.addEventListener('click', () => this.showPrivacyExplainer());
    document.body.appendChild(this.pill);

    // Transient status line for drop errors / success
    this.status = document.createElement('div');
    this.status.className = 'photo-drop-status';
    document.body.appendChild(this.status);

    // Only react to dragged files that LOOK like images. The existing
    // FileDropZone handles KML/GeoJSON/CSV; if the user drops a .csv we
    // don't want this overlay to fight for it.
    document.addEventListener('dragenter', (e) => {
      if (!this.hasImageItem(e)) return;
      this.dragCounter++;
      this.overlay.classList.add('visible');
    });

    document.addEventListener('dragover', (e) => {
      if (this.hasImageItem(e)) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      }
    });

    document.addEventListener('dragleave', () => {
      this.dragCounter = Math.max(0, this.dragCounter - 1);
      if (this.dragCounter === 0) this.overlay.classList.remove('visible');
    });

    document.addEventListener('drop', (e) => {
      const files = e.dataTransfer?.files;
      this.dragCounter = 0;
      this.overlay.classList.remove('visible');
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!this.isImage(file)) return;
      e.preventDefault();
      void this.handleFile(file);
    });
  }

  private hasImageItem(e: DragEvent): boolean {
    const items = e.dataTransfer?.items;
    if (!items) return false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && items[i].type.startsWith('image/')) return true;
    }
    return false;
  }

  private isImage(file: File): boolean {
    if (file.type && ALLOWED_MIME.includes(file.type.toLowerCase())) return true;
    // Some HEIC files arrive with empty MIME — fall back to extension
    return /\.(jpe?g|png|heic|heif|tif|tiff)$/i.test(file.name);
  }

  private async handleFile(file: File): Promise<void> {
    this.showStatus(`Reading EXIF from ${file.name}…`);
    let exif: ExifData;
    try {
      exif = (await exifrParse(file, { gps: true, exif: true })) ?? {};
    } catch (err) {
      this.showStatus(`Couldn't read EXIF: ${(err as Error).message}`, true);
      return;
    }

    const lat = exif.latitude;
    const lon = exif.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      this.showStatus(`${file.name} has no GPS location — try a photo taken with location on`, true);
      return;
    }

    const captureDate = exif.DateTimeOriginal ?? exif.CreateDate ?? exif.ModifyDate;
    const timestamp = captureDate instanceof Date ? captureDate.getTime() : Date.now();

    const pin = {
      id: makePinId(),
      lat,
      lon,
      timestamp,
      photoName: file.name,
      facts: null,
    };
    this.store.add(pin);
    this.pill.classList.add('visible');
    this.showStatus(`Pinned ${file.name}`);

    // Fly camera to the pin
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, 500_000),
      duration: 2.0,
    });

    // Kick off the context ribbon — it'll populate as providers resolve
    this.ribbon.showFor(pin);
  }

  private showStatus(msg: string, isError = false): void {
    this.status.textContent = msg;
    this.status.classList.toggle('error', isError);
    this.status.classList.add('visible');
    setTimeout(() => this.status.classList.remove('visible'), 4000);
  }

  private showPrivacyExplainer(): void {
    // Delegated to PrivacyModal — wired in main.ts
    document.dispatchEvent(new CustomEvent('privacy-modal:open'));
  }

  destroy(): void {
    this.overlay.remove();
    this.pill.remove();
    this.status.remove();
  }
}
