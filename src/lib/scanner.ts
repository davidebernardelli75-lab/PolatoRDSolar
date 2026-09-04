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

export async function scanImageFile(file: File): Promise<ScanResult | null> {
  try {
    const html5Qrcode = new Html5Qrcode('barcode-reader-image-only', {
      formatsToSupport: FORMATS,
      verbose: false,
    });
    const decodedText = await html5Qrcode.scanFile(file, false);
    await html5Qrcode.clear();
    if (decodedText) {
      return { text: decodedText };
    }
    return null;
  } catch {
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
