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

let fileScanner: Html5Qrcode | null = null;

function ensureFileScannerElement(): string {
  const id = 'barcode-reader-file-scan';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.style.position = 'fixed';
    el.style.top = '-9999px';
    el.style.left = '-9999px';
    el.style.width = '1px';
    el.style.height = '1px';
    el.style.overflow = 'hidden';
    el.style.opacity = '0';
    document.body.appendChild(el);
  }
  return id;
}

export async function scanImageFile(file: File): Promise<ScanResult | null> {
  const elementId = ensureFileScannerElement();
  try {
    if (fileScanner) {
      await fileScanner.clear().catch(() => {});
      fileScanner = null;
    }
    fileScanner = new Html5Qrcode(elementId, {
      formatsToSupport: FORMATS,
      verbose: false,
    });
    const decodedText = await fileScanner.scanFile(file, false);
    await fileScanner.clear();
    fileScanner = null;
    if (decodedText) {
      return { text: decodedText };
    }
    return null;
  } catch (err) {
    if (fileScanner) {
      await fileScanner.clear().catch(() => {});
      fileScanner = null;
    }
    console.error('scanImageFile error:', err);
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

    await this.html5Qrcode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText: string) => {
        onDetected(decodedText);
      },
      () => {}
    );
  }

  async stop(): Promise<void> {
    if (this.html5Qrcode) {
      try {
        await this.html5Qrcode.stop();
        this.html5Qrcode.clear();
      } catch {
        // ignore
      }
      this.html5Qrcode = null;
    }
  }
}
