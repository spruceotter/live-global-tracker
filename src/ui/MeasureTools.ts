import * as Cesium from 'cesium';

type MeasureMode = 'none' | 'distance' | 'area';

export class MeasureTools {
  private viewer: Cesium.Viewer;
  private mode: MeasureMode = 'none';
  private handler: Cesium.ScreenSpaceEventHandler;
  private points: Cesium.Cartesian3[] = [];
  private dataSource: Cesium.CustomDataSource;
  private resultEl: HTMLElement;
  private toolbar: HTMLElement;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.dataSource = new Cesium.CustomDataSource('measurements');
    viewer.dataSources.add(this.dataSource);
    this.handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    // Result HUD
    this.resultEl = document.createElement('div');
    this.resultEl.className = 'measure-result';
    document.body.appendChild(this.resultEl);

    // Toolbar
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'measure-toolbar';

    const distBtn = this.createBtn('Distance', 'distance');
    const areaBtn = this.createBtn('Area', 'area');
    const clearBtn = document.createElement('button');
    clearBtn.className = 'measure-btn';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => this.clear());

    this.toolbar.appendChild(distBtn);
    this.toolbar.appendChild(areaBtn);
    this.toolbar.appendChild(clearBtn);
    document.body.appendChild(this.toolbar);

    // Keyboard: M to toggle
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'm' || e.key === 'M') {
        this.toolbar.classList.toggle('visible');
      }
    });
  }

  private createBtn(label: string, mode: MeasureMode): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'measure-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => this.setMode(mode));
    return btn;
  }

  private setMode(mode: MeasureMode): void {
    this.mode = mode;
    this.points = [];
    this.dataSource.entities.removeAll();
    this.resultEl.classList.remove('visible');

    if (mode === 'none') {
      this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
      this.handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
      return;
    }

    this.handler.setInputAction(
      (click: { position: Cesium.Cartesian2 }) => this.onClick(click.position),
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    this.handler.setInputAction(
      () => this.finishMeasurement(),
      Cesium.ScreenSpaceEventType.RIGHT_CLICK
    );
  }

  private onClick(screenPos: Cesium.Cartesian2): void {
    const ray = this.viewer.camera.getPickRay(screenPos);
    if (!ray) return;
    const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
    if (!cartesian) return;

    this.points.push(cartesian);

    // Add marker
    this.dataSource.entities.add({
      position: cartesian,
      point: {
        pixelSize: 6,
        color: Cesium.Color.fromCssColorString('#60a5fa'),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
      },
    });

    // Draw line between last two points
    if (this.points.length >= 2) {
      this.dataSource.entities.add({
        polyline: {
          positions: [this.points[this.points.length - 2], this.points[this.points.length - 1]],
          width: 2,
          material: Cesium.Color.fromCssColorString('#60a5fa').withAlpha(0.7),
          clampToGround: true,
        },
      });

      this.updateResult();
    }

    if (this.mode === 'distance' && this.points.length === 2) {
      this.finishMeasurement();
    }
  }

  private finishMeasurement(): void {
    if (this.mode === 'area' && this.points.length >= 3) {
      // Close the polygon
      this.dataSource.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(this.points),
          material: Cesium.Color.fromCssColorString('#60a5fa').withAlpha(0.15),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#60a5fa').withAlpha(0.5),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });
    }
    this.updateResult();
    this.setMode('none');
  }

  private updateResult(): void {
    if (this.mode === 'distance' && this.points.length >= 2) {
      let total = 0;
      for (let i = 1; i < this.points.length; i++) {
        const geo1 = Cesium.Cartographic.fromCartesian(this.points[i - 1]);
        const geo2 = Cesium.Cartographic.fromCartesian(this.points[i]);
        const geodesic = new Cesium.EllipsoidGeodesic(geo1, geo2);
        total += geodesic.surfaceDistance;
      }
      this.showResult(this.formatDistance(total));
    } else if (this.mode === 'area' && this.points.length >= 3) {
      // Approximate area using spherical excess
      const area = this.computeArea();
      this.showResult(this.formatArea(area));
    }
  }

  private computeArea(): number {
    // Simple spherical polygon area using Cartographic positions
    const cartos = this.points.map((p) => Cesium.Cartographic.fromCartesian(p));
    let area = 0;
    const n = cartos.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += cartos[i].longitude * cartos[j].latitude;
      area -= cartos[j].longitude * cartos[i].latitude;
    }
    area = Math.abs(area) / 2;
    // Convert from radians² to m² (approximate)
    const R = 6371000;
    return area * R * R;
  }

  private formatDistance(meters: number): string {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${Math.round(meters)} m`;
  }

  private formatArea(sqMeters: number): string {
    if (sqMeters >= 1_000_000) return `${(sqMeters / 1_000_000).toFixed(2)} km\u00B2`;
    return `${Math.round(sqMeters)} m\u00B2`;
  }

  private showResult(text: string): void {
    this.resultEl.textContent = text;
    this.resultEl.classList.add('visible');
  }

  private clear(): void {
    this.points = [];
    this.dataSource.entities.removeAll();
    this.resultEl.classList.remove('visible');
    this.setMode('none');
  }

  destroy(): void {
    this.handler.destroy();
    this.viewer.dataSources.remove(this.dataSource, true);
    this.resultEl.remove();
    this.toolbar.remove();
  }
}
