import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Keyboard, Loader2, ScanLine, X } from 'lucide-react';
import { CameraScanner, scanImageFile } from '@/lib/scanner';

export function MaterialScannerModal({
  onClose,
  onScan,
}: {
  onClose: () => void;
  onScan: (code: string) => void;
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [externalCode, setExternalCode] = useState('');
  const cameraScannerRef = useRef<CameraScanner | null>(null);
  const cameraStartTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const externalInputRef = useRef<HTMLInputElement>(null);

  const submitCode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;
    onScan(code);
  };

  const stopCamera = () => {
    if (cameraStartTimerRef.current !== null) {
      window.clearTimeout(cameraStartTimerRef.current);
      cameraStartTimerRef.current = null;
    }
    void cameraScannerRef.current?.stop();
    cameraScannerRef.current = null;
    setCameraActive(false);
  };

  const startCamera = () => {
    setScanError(null);
    setCameraActive(true);
    cameraStartTimerRef.current = window.setTimeout(async () => {
      cameraStartTimerRef.current = null;
      const scanner = new CameraScanner('work-report-material-reader', 'all');
      cameraScannerRef.current = scanner;
      try {
        await scanner.start((code) => {
          stopCamera();
          submitCode(code);
        });
      } catch (err) {
        console.error('Material scanner camera error:', err);
        setScanError('Impossibile accedere alla fotocamera. Verifica i permessi del browser.');
        setCameraActive(false);
      }
    }, 150);
  };

  const scanImage = async (file: File) => {
    setScanningImage(true);
    setScanError(null);
    try {
      const result = await scanImageFile(file, 'all');
      if (result?.text) {
        submitCode(result.text);
      } else {
        setScanError('Nessun barcode o QR code rilevato nell’immagine.');
      }
    } finally {
      setScanningImage(false);
    }
  };

  useEffect(() => {
    window.setTimeout(() => externalInputRef.current?.focus(), 50);
    return () => stopCamera();
  }, []);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="inline-flex items-center gap-2 font-semibold text-slate-900">
              <ScanLine size={18} /> Scansiona materiale
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Usa la fotocamera oppure un lettore barcode/QR USB o Bluetooth.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Chiudi scanner"
          >
            <X size={20} />
          </button>
        </div>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Keyboard size={16} /> Lettore USB / Bluetooth
          </div>
          <p className="mb-2 text-[11px] text-slate-500">
            Lascia il cursore nel campo e scansiona. I lettori che funzionano come tastiera vengono acquisiti premendo automaticamente Invio.
          </p>
          <div className="flex gap-2">
            <input
              ref={externalInputRef}
              value={externalCode}
              onChange={(e) => setExternalCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                submitCode(externalCode);
              }}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              placeholder="Codice barcode / QR"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => submitCode(externalCode)}
              disabled={!externalCode.trim()}
              className="rounded-xl bg-blue-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Usa codice
            </button>
          </div>
        </section>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={cameraActive ? stopCamera : startCamera}
            disabled={scanningImage}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white transition ${cameraActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            <Camera size={25} />
            <span className="text-xs">{cameraActive ? 'Ferma camera' : 'Camera live'}</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={cameraActive || scanningImage}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {scanningImage ? <Loader2 size={25} className="animate-spin" /> : <ImagePlus size={25} />}
            <span className="text-xs">{scanningImage ? 'Scansione…' : 'Foto / immagine'}</span>
          </button>
        </div>

        <div
          className="mt-3 overflow-hidden rounded-xl border-2 border-blue-900 bg-black"
          style={{ display: cameraActive ? 'block' : 'none' }}
        >
          <div id="work-report-material-reader" className="w-full" style={{ minHeight: '300px' }} />
          {cameraActive && (
            <div className="bg-blue-900 px-3 py-2 text-center text-xs text-white">
              Inquadra il barcode o il QR code e attendi il riconoscimento.
            </div>
          )}
        </div>

        {scanError && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {scanError}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            if (file) void scanImage(file);
          }}
        />
      </div>
    </div>
  );
}
