import * as Cesium from 'cesium';

export class ExportTools {
  private viewer: Cesium.Viewer;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  screenshot(): void {
    this.viewer.render();
    const canvas = this.viewer.scene.canvas;
    const dataUrl = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `globe-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    this.showToast('Screenshot saved');
  }

  copyLink(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.showToast('Link copied to clipboard');
    }).catch(() => {
      this.showToast('Failed to copy link');
    });
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'export-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}
