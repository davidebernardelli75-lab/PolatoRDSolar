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

let fileScannerInstance: Html5Qrcode | null = null;

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

export async function scanImageFile(file: File): Promise<ScanResult | null> {
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

    const decodedText = await fileScannerInstance.scanFile(file, false);

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
    console.error('Barcode scan error:', err);
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
