import { useState, useEffect, useRef } from 'react';
import { X, Loader2, ImagePlus, Video } from 'lucide-react';
import { scanImageFile, CameraScanner } from '@/lib/scanner';

export function EquipmentScannerModal({
  onClose,
  onScan,
}: {
  onClose: () => void;
  onScan: (text: string) => void;
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const cameraScannerRef = useRef<CameraScanner | null>(null);
  const cameraStartTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileScan = async (file: File) => {
    setScanning(true);
    setScanError(null);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    try {
      const result = await scanImageFile(file);
      if (result?.text) {
        onScan(result.text);
      } else {
        setScanError("Nessun codice rilevato nell'immagine.");
      }
    } finally {
      setScanning(false);
    }
  };

  const startCamera = async () => {
    setScanError(null);
    setCameraActive(true);
    cameraStartTimerRef.current = window.setTimeout(async () => {
      cameraStartTimerRef.current = null;
      const scanner = new CameraScanner('equipment-qr-reader');
      cameraScannerRef.current = scanner;
      try {
        await scanner.start((text) => {
          onScan(text);
          stopCamera();
        });
      } catch (err) {
        console.error('Camera start error:', err);
        setScanError('Impossibile accedere alla fotocamera. Verifica i permessi del browser.');
        setCameraActive(false);
      }
    }, 200);
  };

  const stopCamera = () => {
    if (cameraStartTimerRef.current !== null) {
      window.clearTimeout(cameraStartTimerRef.current);
      cameraStartTimerRef.current = null;
    }
    cameraScannerRef.current?.stop();
    cameraScannerRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Scansiona Codice</h3>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1 text-slate-400 hover:text-slate-900 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning || cameraActive}
              className="flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-5 rounded-2xl transition-all shadow-sm hover:shadow-md"
            >
              {scanning ? <Loader2 className="animate-spin" size={28} /> : <ImagePlus size={28} />}
              <span className="text-sm">{scanning ? 'Scansione...' : 'Scansiona da Foto'}</span>
            </button>
            <button
              onClick={cameraActive ? stopCamera : startCamera}
              disabled={scanning}
              className={`flex flex-col items-center justify-center gap-2 font-semibold py-5 rounded-2xl transition-all shadow-sm hover:shadow-md ${
                cameraActive
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <Video size={28} />
              <span className="text-sm">{cameraActive ? 'Ferma Camera' : 'Camera Live'}</span>
            </button>
          </div>

          {previewUrl && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img src={previewUrl} alt="Anteprima scansione" className="w-full max-h-48 object-cover" />
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg">
                Foto scansionata
              </div>
            </div>
          )}

          <div
            className="rounded-xl overflow-hidden border-2 border-blue-900"
            style={{ display: cameraActive ? 'block' : 'none' }}
          >
            <div id="equipment-qr-reader" className="w-full" style={{ minHeight: '300px' }} />
            {cameraActive && (
              <div className="bg-blue-900 text-white text-xs text-center py-1.5">
                Inquadra il QR code con la fotocamera
              </div>
            )}
          </div>

          {scanError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">!</span>
              <span>{scanError}</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileScan(file);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );
}
