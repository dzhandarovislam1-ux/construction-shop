import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';

// Встроенный в браузер распознаватель кодов (есть в Chrome на Android).
declare const BarcodeDetector: {
  new (opts?: { formats: string[] }): {
    detect(src: CanvasImageSource): Promise<{ rawValue: string }[]>;
  };
};

/** Сканер QR и штрихкодов камерой устройства. */
@Component({
  selector: 'app-scanner',
  template: `
    <div class="backdrop">
      <div class="modal scanner">
        <h2>Наведите камеру на код</h2>
        @if (error()) {
          <p class="alert">{{ error() }}</p>
        } @else {
          <div class="frame"><video #video playsinline muted></video></div>
          @if (qrOnly()) {
            <p class="muted">На этом устройстве камера читает только QR-коды, без штрихкодов.</p>
          }
        }
        <button type="button" class="btn" (click)="closed.emit()">Закрыть</button>
      </div>
    </div>
  `,
  styles: `
    .scanner { max-width: 420px; text-align: center; }
    .frame { border-radius: 14px; overflow: hidden; border: 2px solid var(--accent); background: #000; aspect-ratio: 1; }
    video { width: 100%; height: 100%; object-fit: cover; display: block; }
  `,
})
export class Scanner implements AfterViewInit, OnDestroy {
  readonly scanned = output<string>();
  readonly closed = output<void>();

  protected readonly error = signal('');
  protected readonly qrOnly = signal(false);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private stream?: MediaStream;
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;

  async ngAfterViewInit() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.error.set('Камера недоступна. Сайт должен быть открыт по https или на localhost.');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
    } catch {
      this.error.set('Нет доступа к камере. Разрешите её в настройках браузера.');
      return;
    }
    if (this.stopped) return this.stop();

    const video = this.video()!.nativeElement;
    video.srcObject = this.stream;
    await video.play().catch(() => undefined);

    const read = await this.reader(video);
    const tick = async () => {
      if (this.stopped) return;
      const text = video.readyState >= 2 ? await read().catch(() => '') : '';
      if (this.stopped) return;
      if (text) this.scanned.emit(text);
      else this.timer = setTimeout(tick, 150);
    };
    tick();
  }

  /** Возвращает функцию, читающую код с текущего кадра. */
  private async reader(video: HTMLVideoElement): Promise<() => Promise<string>> {
    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({
        formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'upc_a'],
      });
      return async () => (await detector.detect(video))[0]?.rawValue ?? '';
    }
    this.qrOnly.set(true);
    const { default: jsQR } = await import('jsqr');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    return async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (!canvas.width) return '';
      ctx.drawImage(video, 0, 0);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return jsQR(img.data, img.width, img.height)?.data ?? '';
    };
  }

  private stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
  }

  ngOnDestroy() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.stop();
  }
}
