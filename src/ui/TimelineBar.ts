import * as Cesium from 'cesium';

export class TimelineBar {
  private container: HTMLElement;
  private scrubber: HTMLInputElement;
  private timeLabel: HTMLElement;
  private playBtn: HTMLElement;
  private speedLabel: HTMLElement;
  private liveBtn: HTMLElement;
  private viewer: Cesium.Viewer;
  private playing = false;
  private speedIndex = 0;
  private speeds = [1, 10, 100, 300];
  private isLive = true;
  private rangeStartMs: number;
  private rangeEndMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;

    // Default range: past 24 hours
    this.rangeEndMs = Date.now();
    this.rangeStartMs = this.rangeEndMs - 24 * 3600_000;

    this.container = document.createElement('div');
    this.container.className = 'timeline-bar';

    // Play/pause
    this.playBtn = document.createElement('button');
    this.playBtn.className = 'tl-btn tl-play';
    this.playBtn.textContent = '\u25B6';
    this.playBtn.title = 'Play (Space)';
    this.playBtn.addEventListener('click', () => this.togglePlay());

    // Speed
    this.speedLabel = document.createElement('button');
    this.speedLabel.className = 'tl-btn tl-speed';
    this.speedLabel.textContent = '1x';
    this.speedLabel.title = 'Playback speed';
    this.speedLabel.addEventListener('click', () => this.cycleSpeed());

    // Scrubber
    const scrubberWrap = document.createElement('div');
    scrubberWrap.className = 'tl-scrubber-wrap';

    this.scrubber = document.createElement('input');
    this.scrubber.type = 'range';
    this.scrubber.className = 'tl-scrubber';
    this.scrubber.min = '0';
    this.scrubber.max = '1000';
    this.scrubber.value = '1000';
    this.scrubber.addEventListener('input', () => this.onScrub());

    scrubberWrap.appendChild(this.scrubber);

    // Time label
    this.timeLabel = document.createElement('span');
    this.timeLabel.className = 'tl-time';
    this.timeLabel.textContent = 'LIVE';

    // Live button
    this.liveBtn = document.createElement('button');
    this.liveBtn.className = 'tl-btn tl-live active';
    this.liveBtn.textContent = 'LIVE';
    this.liveBtn.title = 'Return to real-time';
    this.liveBtn.addEventListener('click', () => this.goLive());

    this.container.appendChild(this.playBtn);
    this.container.appendChild(this.speedLabel);
    this.container.appendChild(scrubberWrap);
    this.container.appendChild(this.timeLabel);
    this.container.appendChild(this.liveBtn);
    document.body.appendChild(this.container);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
      if (e.code === 'ArrowRight') { e.preventDefault(); this.step(1); }
      if (e.code === 'ArrowLeft') { e.preventDefault(); this.step(-1); }
    });

    // Update time label periodically
    this.timer = setInterval(() => this.updateTimeLabel(), 1000);
  }

  private togglePlay(): void {
    this.playing = !this.playing;
    this.playBtn.textContent = this.playing ? '\u23F8' : '\u25B6';

    if (this.playing) {
      this.isLive = false;
      this.liveBtn.classList.remove('active');
      this.viewer.clock.shouldAnimate = true;
      this.viewer.clock.multiplier = this.speeds[this.speedIndex];
    } else {
      this.viewer.clock.shouldAnimate = false;
    }
  }

  private cycleSpeed(): void {
    this.speedIndex = (this.speedIndex + 1) % this.speeds.length;
    const speed = this.speeds[this.speedIndex];
    this.speedLabel.textContent = `${speed}x`;
    if (this.playing) {
      this.viewer.clock.multiplier = speed;
    }
  }

  private onScrub(): void {
    const t = parseInt(this.scrubber.value, 10) / 1000;
    const targetMs = this.rangeStartMs + t * (this.rangeEndMs - this.rangeStartMs);
    const julianDate = Cesium.JulianDate.fromDate(new Date(targetMs));

    this.viewer.clock.currentTime = julianDate;
    this.isLive = t >= 0.999;
    this.liveBtn.classList.toggle('active', this.isLive);
    this.updateTimeLabel();
  }

  private step(direction: number): void {
    const stepMs = 3600_000; // 1 hour per step
    const current = Cesium.JulianDate.toDate(this.viewer.clock.currentTime).getTime();
    const next = current + direction * stepMs;
    this.viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date(next));
    this.isLive = false;
    this.liveBtn.classList.remove('active');
    this.updateScrubberPosition();
    this.updateTimeLabel();
  }

  private goLive(): void {
    this.isLive = true;
    this.playing = false;
    this.playBtn.textContent = '\u25B6';
    this.viewer.clock.shouldAnimate = false;
    this.viewer.clock.currentTime = Cesium.JulianDate.now();
    this.liveBtn.classList.add('active');
    this.scrubber.value = '1000';
    this.timeLabel.textContent = 'LIVE';
  }

  private updateTimeLabel(): void {
    if (this.isLive) {
      this.timeLabel.textContent = 'LIVE';
      return;
    }
    const date = Cesium.JulianDate.toDate(this.viewer.clock.currentTime);
    const h = date.getUTCHours().toString().padStart(2, '0');
    const m = date.getUTCMinutes().toString().padStart(2, '0');
    const mo = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const d = date.getUTCDate().toString().padStart(2, '0');
    this.timeLabel.textContent = `${mo}/${d} ${h}:${m} UTC`;

    if (this.playing) {
      this.updateScrubberPosition();
    }
  }

  private updateScrubberPosition(): void {
    const currentMs = Cesium.JulianDate.toDate(this.viewer.clock.currentTime).getTime();
    const t = (currentMs - this.rangeStartMs) / (this.rangeEndMs - this.rangeStartMs);
    this.scrubber.value = String(Math.round(Math.max(0, Math.min(1, t)) * 1000));
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.container.remove();
  }
}
