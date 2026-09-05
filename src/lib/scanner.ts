import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { BarcodeDetectorPolyfill } from '@undecaf/barcode-detector-polyfill';

// ZBar/WASM garantisce la lettura dei Code 128 anche sui browser iOS.

export interface ScanResult { text: string }

const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

const NATIVE_FORMATS = [
  'qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128',
  'code_39', 'code_93', 'codabar', 'itf', 'data_matrix',
] as const;

const ZBAR_FORMATS = [
  'code_128', 'code_39', 'code_93', 'codabar', 'itf',
  'ean_8', 'ean_13', 'upc_a', 'upc_e', 'qr_code',
];

let zbarDetector: BarcodeDetectorPolyfill | null = null;

function getZbarDetector(): BarcodeDetectorPolyfill {
  if (!zbarDetector) {
    zbarDetector = new BarcodeDetectorPolyfill({
      formats: ZBAR_FORMATS,
      zbar: { enableCache: true },
    });
  }
  return zbarDetector;
}

async function scanZbar(source: unknown): Promise<ScanResult | null> {
  try {
    const results = await withTimeout(
      getZbarDetector().detect(source as never),
      10000
    );
    const best = [...results].sort((a, b) => b.quality - a.quality)[0];
    return best?.rawValue ? { text: best.rawValue.trim() } : null;
  } catch {
    return null;
  }
}

const SCANNER_OPTIONS = {
  formatsToSupport: FORMATS,
  experimentalFeatures: { useBarCodeDetectorIfSupported: true },
  verbose: false,
};

type BarcodeDetectorClass = new (opts?: { formats?: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

type ImageVariant = { file: File; bitmap: ImageBitmap; cleanup: () => void };

function getBarcodeDetector(): BarcodeDetectorClass | null {
  const scope = globalThis as Record<string, unknown>;
  return typeof scope.BarcodeDetector === 'function'
    ? scope.BarcodeDetector as BarcodeDetectorClass
    : null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

function ensureFileScannerElement(): string {
  const id = 'barcode-reader-file-scan';
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement('div');
    element.id = id;
    Object.assign(element.style, {
      position: 'fixed', top: '0', left: '0', width: '300px', height: '300px',
      opacity: '0', pointerEvents: 'none', zIndex: '-1',
    });
    document.body.appendChild(element);
  }
  return id;
}

async function createImageVariants(file: File): Promise<ImageVariant[]> {
  if (typeof createImageBitmap !== 'function') return [];
  const source = await createImageBitmap(file);
  const scale = Math.min(1, 2200 / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const variants: ImageVariant[] = [];

  const render = async (name: string, rotation: 0 | 90 | -90) => {
    const rotated = rotation !== 0;
    const canvas = document.createElement('canvas');
    canvas.width = rotated ? height : width;
    canvas.height = rotated ? width : height;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.save();
    if (rotation === 90) {
      context.translate(canvas.width, 0);
      context.rotate(Math.PI / 2);
    } else if (rotation === -90) {
      context.translate(0, canvas.height);
      context.rotate(-Math.PI / 2);
    }
    context.filter = 'grayscale(1) contrast(1.65)';
    context.drawImage(source, 0, 0, width, height);
    context.restore();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.94)
    );
    if (!blob) return;
    const variantFile = new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
    const bitmap = await createImageBitmap(variantFile);
    variants.push({
      file: variantFile,
      bitmap,
      cleanup: () => { bitmap.close(); canvas.width = 1; canvas.height = 1; },
    });
  };

  try {
    await render('barcode-enhanced', 0);
    await render('barcode-right', 90);
    await render('barcode-left', -90);
    return variants;
  } finally {
    source.close();
  }
}

async function scanNative(sources: ImageBitmapSource[]): Promise<ScanResult | null> {
  const Detector = getBarcodeDetector();
  if (!Detector) return null;
  try {
    const detector = new Detector({ formats: [...NATIVE_FORMATS] });
    for (const source of sources) {
      const results = await withTimeout(detector.detect(source), 5000);
      if (results[0]?.rawValue) return { text: results[0].rawValue.trim() };
    }
  } catch {
    // Il fallback multipiattaforma viene eseguito subito dopo.
  }
  return null;
}

async function scanWithHtml5Qrcode(files: File[]): Promise<ScanResult | null> {
  const elementId = ensureFileScannerElement();
  for (const file of files) {
    const scanner = new Html5Qrcode(elementId, SCANNER_OPTIONS);
    try {
      try {
        const text = await withTimeout(scanner.scanFile(file, false), 10000);
        if (text) return { text: text.trim() };
      } catch {
        // Prova la variante successiva senza chiedere un nuovo caricamento.
      }
    } finally {
      try { scanner.clear(); } catch { /* scanner già rilasciato */ }
    }
  }
  return null;
}

export async function scanImageFile(file: File): Promise<ScanResult | null> {
  const original = typeof createImageBitmap === 'function'
    ? await createImageBitmap(file).catch(() => null)
    : null;
  let variants: ImageVariant[] = [];
  try {
    const zbarOriginal = await scanZbar(file);
    if (zbarOriginal) return zbarOriginal;

    variants = await createImageVariants(file).catch(() => []);
    for (const variant of variants) {
      const zbarVariant = await scanZbar(variant.file);
      if (zbarVariant) return zbarVariant;
    }
    const nativeResult = await scanNative([
      ...(original ? [original] : []),
      ...variants.map((variant) => variant.bitmap),
    ]);
    if (nativeResult) return nativeResult;
    return await scanWithHtml5Qrcode([file, ...variants.map((variant) => variant.file)]);
  } catch (error) {
    console.error('scanImageFile error:', error);
    return null;
  } finally {
    original?.close();
    variants.forEach((variant) => variant.cleanup());
  }
}

export class CameraScanner {
  private html5Qrcode: Html5Qrcode | null = null;
  private detected = false;
  private zbarTimer: number | null = null;
  private zbarBusy = false;

  constructor(private elementId: string) {}

  async start(onDetected: (text: string) => void): Promise<void> {
    if (!document.getElementById(this.elementId)) {
      throw new Error(`Element #${this.elementId} not found in DOM`);
    }
    this.detected = false;
    this.html5Qrcode = new Html5Qrcode(this.elementId, SCANNER_OPTIONS);

    await this.html5Qrcode.start(
      { facingMode: 'environment' },
      {
        fps: 12,
        aspectRatio: 16 / 9,
        disableFlip: false,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => ({
          width: Math.max(180, Math.floor(Math.min(viewfinderWidth * 0.92, 640))),
          height: Math.max(100, Math.floor(Math.min(viewfinderHeight * 0.42, 260))),
        }),
      },
      (decodedText: string) => {
        if (this.detected) return;
        this.detected = true;
        onDetected(decodedText.trim());
      },
      () => {}
    );

    const video = document.querySelector<HTMLVideoElement>(`#${this.elementId} video`);
    if (video) {
      this.zbarTimer = window.setInterval(async () => {
        if (this.detected || this.zbarBusy || video.readyState < 2) return;
        this.zbarBusy = true;
        try {
          const result = await scanZbar(video);
          if (result?.text && !this.detected) {
            this.detected = true;
            onDetected(result.text);
          }
        } finally {
          this.zbarBusy = false;
        }
      }, 180);
    }
  }

  async stop(): Promise<void> {
    if (this.zbarTimer !== null) {
      window.clearInterval(this.zbarTimer);
      this.zbarTimer = null;
    }
    if (!this.html5Qrcode) return;
    try {
      await this.html5Qrcode.stop();
      await this.html5Qrcode.clear();
    } catch {
      // Lo scanner può essere già fermo dopo una lettura valida.
    }
    this.html5Qrcode = null;
    this.detected = false;
    this.zbarBusy = false;
  }
}
