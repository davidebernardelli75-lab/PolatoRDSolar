import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface ScanResult {
  text: string;
}

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
  'qr_code',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'itf',
  'data_matrix',
] as const;

type BarcodeDetectorClass = new (opts?: { formats?: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

function getBarcodeDetector(): BarcodeDetectorClass | null {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.BarcodeDetector === 'function') {
    return g.BarcodeDetector as BarcodeDetectorClass;
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    ),
  ]);
}

export async function scanImageFile(file: File): Promise<ScanResult | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const Detector = getBarcodeDetector();

    if (Detector) {
      try {
        const detector = new Detector({ formats: [...NATIVE_FORMATS] });
        const results = await withTimeout(detector.detect(bitmap), 10000);
        if (results.length > 0 && results[0].rawValue) {
          bitmap.close?.();
          return { text: results[0].rawValue };
        }
      } catch {
        // fall through to html5-qrcode
      }
    }

    // Fallback: html5-qrcode
    const result = await scanFileWithHtml5Qrcode(file);
    bitmap.close?.();
    return result;
  } catch (err) {
    console.error('scanImageFile error:', err);
    return null;
  }
}

function ensureFileScannerElement(): string {
  const id = 'barcode-reader-file-scan';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = '300px';
    el.style.height = '300px';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '-1';
    document.body.appendChild(el);
  }
  return id;
}

let fileScannerInstance: Html5Qrcode | null = null;

async function scanFileWithHtml5Qrcode(file: File): Promise<ScanResult | null> {
  const elementId = ensureFileScannerElement();

  try {
    if (fileScannerInstance) {
      await fileScannerInstance.clear().catch(() => {});
      fileScannerInstance = null;
    }

    fileScannerInstance = new Html5Qrcode(elementId, {
      formatsToSupport: FORMATS,
      verbose: false,
    });

    const decodedText = await withTimeout(
      fileScannerInstance.scanFile(file, false),
      15000
    );

    await fileScannerInstance.clear();
    fileScannerInstance = null;

    if (decodedText) {
      return { text: decodedText };
    }
    return null;
  } catch (err) {
    if (fileScannerInstance) {
      await fileScannerInstance.clear().catch(() => {});
      fileScannerInstance = null;
    }
    console.error('html5-qrcode scanFile error:', err);
    return null;
  }
}

export class CameraScanner {
  private html5Qrcode: Html5Qrcode | null = null;
  private elementId: string;

  constructor(elementId: string) {
    this.elementId = elementId;
  }

  async start(onDetected: (text: string) => void): Promise<void> {
    const el = document.getElementById(this.elementId);
    if (!el) {
      throw new Error(`Element #${this.elementId} not found in DOM`);
    }

    this.html5Qrcode = new Html5Qrcode(this.elementId, {
      formatsToSupport: FORMATS,
      verbose: false,
    });

    const config = {
      fps: 15,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const boxSize = Math.floor(minEdge * 0.7);
        return { width: Math.max(100, boxSize), height: Math.max(100, boxSize) };
      },
      aspectRatio: 1.0,
      disableFlip: true,
    };

    await this.html5Qrcode.start(
      { facingMode: 'environment' },
      config,
      (decodedText: string) => {
        onDetected(decodedText);
      },
      () => {}
    );
  }

  async stop(): Promise<void> {
    if (this.html5Qrcode) {
      try {
        const state = this.html5Qrcode.getState?.();
        if (state && state !== 'STOPPED' && state !== 'NOT_STARTED') {
          await this.html5Qrcode.stop();
        }
        this.html5Qrcode.clear();
      } catch {
        // ignore
      }
      this.html5Qrcode = null;
    }
  }
}
