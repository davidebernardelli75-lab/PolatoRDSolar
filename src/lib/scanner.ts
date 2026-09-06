import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { getDefaultScanner, scanImageData } from '@undecaf/zbar-wasm';

export interface ScanResult {
  text: string;
}

const SUPPORTED_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.CODABAR,
  BarcodeFormat.ITF,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
];

function createReader(): BrowserMultiFormatReader {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 120,
    delayBetweenScanSuccess: 500,
  });
}

function decodeCanvas(reader: BrowserMultiFormatReader, canvas: HTMLCanvasElement): ScanResult | null {
  try {
    const text = reader.decodeFromCanvas(canvas).getText().trim();
    return text ? { text } : null;
  } catch {
    return null;
  }
}

const zbarScannerPromise = getDefaultScanner();

async function decodeZbarCanvas(canvas: HTMLCanvasElement): Promise<ScanResult | null> {
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context || !canvas.width || !canvas.height) return null;
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const scanner = await zbarScannerPromise;
    const symbols = await scanImageData(imageData, scanner);
    const best = [...symbols].sort((a, b) => b.quality - a.quality)[0];
    const text = best?.decode()?.trim();
    return text ? { text } : null;
  } catch (error) {
    console.error('ZBar scan error:', error);
    return null;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Formato immagine non leggibile'));
    };
    image.src = url;
  });
}

function renderVariant(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  options: { inverted: boolean; rotation?: 0 | 90 | -90; crop?: boolean }
): HTMLCanvasElement {
  const rotation = options.rotation ?? 0;
  const crop = options.crop ?? false;
  const maxSide = crop ? 1800 : 2400;
  const sourceX = crop ? Math.round(sourceWidth * 0.04) : 0;
  const sourceY = crop ? Math.round(sourceHeight * 0.25) : 0;
  const cropWidth = crop ? Math.round(sourceWidth * 0.92) : sourceWidth;
  const cropHeight = crop ? Math.round(sourceHeight * 0.5) : sourceHeight;
  const scale = Math.min(2, maxSide / Math.max(cropWidth, cropHeight));
  const drawWidth = Math.max(1, Math.round(cropWidth * scale));
  const drawHeight = Math.max(1, Math.round(cropHeight * scale));
  const rotated = rotation !== 0;
  const padding = Math.max(24, Math.round(Math.min(drawWidth, drawHeight) * 0.05));
  const canvas = document.createElement('canvas');
  canvas.width = (rotated ? drawHeight : drawWidth) + padding * 2;
  canvas.height = (rotated ? drawWidth : drawHeight) + padding * 2;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return canvas;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(padding, padding);
  if (rotation === 90) {
    context.translate(drawHeight, 0);
    context.rotate(Math.PI / 2);
  } else if (rotation === -90) {
    context.translate(0, drawWidth);
    context.rotate(-Math.PI / 2);
  }
  context.filter = options.inverted
    ? 'grayscale(1) invert(1) contrast(1.7)'
    : 'grayscale(1) contrast(1.35)';
  context.drawImage(
    source,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    drawWidth,
    drawHeight
  );
  context.restore();
  return canvas;
}

export async function scanImageFile(file: File): Promise<ScanResult | null> {
  const reader = createReader();
  try {
    const image = await loadImage(file);
    const variants = [
      renderVariant(image, image.naturalWidth, image.naturalHeight, { inverted: true }),
      renderVariant(image, image.naturalWidth, image.naturalHeight, { inverted: false }),
      renderVariant(image, image.naturalWidth, image.naturalHeight, { inverted: true, crop: true }),
      renderVariant(image, image.naturalWidth, image.naturalHeight, { inverted: true, rotation: 90 }),
      renderVariant(image, image.naturalWidth, image.naturalHeight, { inverted: true, rotation: -90 }),
    ];

    for (const canvas of variants) {
      const result = await decodeZbarCanvas(canvas) ?? decodeCanvas(reader, canvas);
      canvas.width = 1;
      canvas.height = 1;
      if (result) return result;
    }
    return null;
  } catch (error) {
    console.error('scanImageFile error:', error);
    return null;
  } finally {
    // Il reader non mantiene stream o risorse esterne nella scansione da canvas.
  }
}

export class CameraScanner {
  private reader = createReader();
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private timer: number | null = null;
  private scanning = false;
  private detected = false;

  constructor(private elementId: string) {}

  async start(onDetected: (text: string) => void): Promise<void> {
    const container = document.getElementById(this.elementId);
    if (!container) throw new Error(`Element #${this.elementId} non trovato`);
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Fotocamera non supportata dal browser');
    }

    this.detected = false;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.style.width = '100%';
    video.style.display = 'block';
    video.srcObject = this.stream;
    container.replaceChildren(video);
    this.video = video;
    await video.play();

    const track = this.stream.getVideoTracks()[0];
    try {
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & {
        focusMode?: string[];
      };
      if (capabilities?.focusMode?.includes('continuous')) {
        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as never] });
      }
    } catch {
      // Alcuni iPhone non espongono i controlli di messa a fuoco.
    }

    this.canvas = document.createElement('canvas');
    this.scheduleScan(onDetected);
  }

  private scheduleScan(onDetected: (text: string) => void): void {
    if (!this.video || !this.canvas || this.detected) return;
    this.timer = window.setTimeout(async () => {
      await this.scanFrame(onDetected);
      this.scheduleScan(onDetected);
    }, 220);
  }

  private async scanFrame(onDetected: (text: string) => void): Promise<void> {
    const video = this.video;
    const canvas = this.canvas;
    if (!video || !canvas || this.scanning || video.readyState < 2) return;
    this.scanning = true;
    try {
      const frameWidth = video.videoWidth;
      const frameHeight = video.videoHeight;
      if (!frameWidth || !frameHeight) return;
      const scale = Math.min(1, 1280 / frameWidth);
      const width = Math.max(1, Math.round(frameWidth * scale));
      const height = Math.max(1, Math.round(frameHeight * scale));
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;

      context.filter = 'grayscale(1) invert(1) contrast(1.7)';
      context.drawImage(video, 0, 0, width, height);
      let result = await decodeZbarCanvas(canvas) ?? decodeCanvas(this.reader, canvas);

      if (!result) {
        context.filter = 'grayscale(1) contrast(1.35)';
        context.drawImage(video, 0, 0, width, height);
        result = await decodeZbarCanvas(canvas) ?? decodeCanvas(this.reader, canvas);
      }

      if (result?.text && !this.detected) {
        this.detected = true;
        onDetected(result.text);
      }
    } finally {
      this.scanning = false;
    }
  }

  async stop(): Promise<void> {
    this.detected = true;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    if (this.video) this.video.srcObject = null;
    this.stream = null;
    this.video = null;
    if (this.canvas) {
      this.canvas.width = 1;
      this.canvas.height = 1;
    }
    this.canvas = null;
    this.scanning = false;
  }
}
