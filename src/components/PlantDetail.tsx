import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Sun,
  MapPin,
  Zap,
  Calendar,
  Phone,
  Mail,
  FileText,
  Plus,
  ScanLine,
  Camera,
  Upload,
  Trash2,
  Download,
  Hash,
  X,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  ImagePlus,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type { Plant, Panel, PanelPhoto } from '@/lib/types';
import {
  fetchPlant,
  fetchPanels,
  fetchPhotos,
  createPanel,
  updatePanel,
  deletePanel,
  uploadPhoto,
  deletePhoto,
  getPhotoUrl,
  deletePlant,
} from '@/lib/api';
import { scanImageFile, CameraScanner } from '@/lib/scanner';
import { exportPlantArchive } from '@/lib/export';
import { generatePlantPdf } from '@/lib/pdf';
import { saveAs } from 'file-saver';

interface PlantDetailProps {
  plantId: string;
  onBack: () => void;
  onDeleted: () => void;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Senza_Nome';
}

export function PlantDetail({ plantId, onBack, onDeleted }: PlantDetailProps) {
  const [plant, setPlant] = useState<Plant | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [photos, setPhotos] = useState<PanelPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showPanelForm, setShowPanelForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, pnl, pho] = await Promise.all([
        fetchPlant(plantId),
        fetchPanels(plantId),
        fetchPhotos(plantId),
      ]);
      setPlant(p);
      setPanels(pnl);
      setPhotos(pho);

      const urlMap: Record<string, string> = {};
      await Promise.all(
        pho.map(async (photo) => {
          try {
            const url = await getPhotoUrl(photo.storage_path);
            urlMap[photo.id] = url;
          } catch {
            // skip
          }
        })
      );
      setPhotoUrls(urlMap);
    } catch {
      // skip
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleExport = async () => {
    if (!plant) return;
    setExporting(true);
    try {
      await exportPlantArchive(plant, panels, photos);
    } catch {
      // skip
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (!plant) return;
    setExportingPdf(true);
    try {
      const blob = generatePlantPdf(plant, panels);
      const fileName = `${sanitizeFileName(plant.owner_name)}_${sanitizeFileName(plant.address)}.pdf`;
      saveAs(blob, fileName);
    } catch {
      // skip
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDeletePlant = async () => {
    if (!plant) return;
    try {
      await deletePlant(plant.id);
      onDeleted();
    } catch {
      // skip
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Impianto non trovato.</p>
        <button onClick={onBack} className="mt-4 text-lime-600 font-medium text-sm">
          Torna alla dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-24">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Dashboard
      </button>

      {/* Plant header */}
      <div className="bg-blue-900 text-white rounded-2xl p-5 lg:p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                plant.owner_type === 'Azienda'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-blue-800 text-blue-100'
              }`}>
                {plant.owner_type}
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold mb-1 truncate">{plant.owner_name}</h1>
            <div className="flex items-center gap-1 text-slate-400 text-sm">
              <MapPin size={14} />
              <span className="truncate">{plant.address}</span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-500 rounded-xl">
              <Sun className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-blue-800">
          {plant.total_power_kw != null && (
            <InfoChip icon={Zap} label="Potenza" value={`${plant.total_power_kw} kW`} />
          )}
          {plant.installation_date && (
            <InfoChip icon={Calendar} label="Installazione" value={plant.installation_date.slice(0, 10)} />
          )}
          {plant.phone && <InfoChip icon={Phone} label="Telefono" value={plant.phone} />}
          {plant.email && <InfoChip icon={Mail} label="Email" value={plant.email} truncate />}
        </div>
      </div>

      {/* Technical details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Dettagli Tecnici</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <DetailRow label="Codice Fiscale / P.IVA" value={plant.fiscal_or_vat} />
          <DetailRow label="Potenza Totale" value={plant.total_power_kw != null ? `${plant.total_power_kw} kW` : null} />
          <DetailRow label="Pannelli" value={plant.panel_brand_model} />
          <DetailRow label="Inverter" value={plant.inverter_brand_model} />
          <DetailRow label="Data Installazione" value={plant.installation_date ? plant.installation_date.slice(0, 10) : null} />
          <DetailRow label="Note" value={plant.notes} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-4 py-3 rounded-xl transition-colors shadow-sm"
        >
          {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
          {exporting ? 'Generazione archivio...' : 'Scarica Archivio ZIP'}
        </button>
        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold px-4 py-3 rounded-xl transition-colors shadow-sm"
        >
          {exportingPdf ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
          {exportingPdf ? 'Generazione PDF...' : 'Genera Report PDF'}
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium px-4 py-3 rounded-xl transition-colors"
        >
          <Trash2 size={18} />
          Elimina
        </button>
      </div>

      {/* Panels section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Hash size={18} />
            Pannelli ({panels.length})
          </h2>
          <button
            onClick={() => setShowPanelForm(true)}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Aggiungi
          </button>
        </div>

        {panels.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <Hash className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="text-slate-500 text-sm">Nessun pannello registrato.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {panels.map((panel, index) => (
              <PanelRow
                key={panel.id}
                panel={panel}
                index={index}
                onUpdate={(serial, positionLabel, notes) =>
                  updatePanel(panel.id, { serial_number: serial, position_label: positionLabel, notes }).then(() => undefined)
                }
                onDelete={() => deletePanel(panel.id).then(loadAll)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Photos section */}
      <PhotoGrid
        plantId={plantId}
        panels={panels}
        photos={photos}
        photoUrls={photoUrls}
        onUploaded={loadAll}
        onDeletePhoto={async (photo) => {
          await deletePhoto(photo);
          loadAll();
        }}
      />

      {/* Panel form modal */}
      {showPanelForm && (
        <PanelFormModal
          onClose={() => setShowPanelForm(false)}
          onSave={async (serial, positionLabel, notes) => {
            await createPanel({ plant_id: plantId, serial_number: serial, position_label: positionLabel, notes });
            setShowPanelForm(false);
            loadAll();
          }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-slate-900 mb-2">Eliminare l{"'"}impianto?</h3>
            <p className="text-slate-500 text-sm mb-5">
              Questa operazione cancellerà tutti i pannelli e le foto associate. Non è reversibile.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeletePlant}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                Elimina
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
  truncate,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">
        <Icon size={11} />
        {label}
      </div>
      <div className={`text-sm font-medium text-white ${truncate ? 'truncate' : ''}`}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-slate-400 text-xs mb-0.5">{label}</div>
      <div className="text-slate-900 font-medium">{value || 'N/D'}</div>
    </div>
  );
}

function PanelRow({
  panel,
  index,
  onUpdate,
  onDelete,
}: {
  panel: Panel;
  index: number;
  onUpdate: (serial: string, positionLabel: string | null, notes: string | null) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [serial, setSerial] = useState(panel.serial_number);
  const [position, setPosition] = useState(panel.position_label ?? '');
  const [notes, setNotes] = useState(panel.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(serial, position || null, notes || null);
      setEditing(false);
    } catch {
      // skip
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-red-400 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="font-medium">Pannello {index + 1}</span>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Matricola / Barcode</label>
          <input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Posizione</label>
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="es. Tetto Nord, Fila 2"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Note</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
      <div className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg text-slate-500 text-sm font-semibold flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm font-medium text-slate-900 break-all">
          {panel.serial_number}
        </div>
        {panel.position_label && (
          <div className="text-xs text-slate-500 mt-0.5">{panel.position_label}</div>
        )}
        {panel.notes && <div className="text-xs text-slate-400 mt-0.5">{panel.notes}</div>}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <FileText size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function PanelFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (serial: string, positionLabel: string | null, notes: string | null) => Promise<void>;
}) {
  const [serial, setSerial] = useState('');
  const [position, setPosition] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const cameraScannerRef = useRef<CameraScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileScan = async (file: File) => {
    setScanning(true);
    setScanError(null);
    setScanSuccess(false);
    setPreviewUrl(URL.createObjectURL(file));
    const result = await scanImageFile(file);
    setScanning(false);
    if (result?.text) {
      setSerial(result.text);
      setScanSuccess(true);
    } else {
      setScanError("Nessun codice rilevato nell'immagine. Inserisci la matricola manualmente.");
    }
  };

  const startCamera = async () => {
    setScanError(null);
    setScanSuccess(false);
    setCameraActive(true);
    setTimeout(async () => {
      const scanner = new CameraScanner('barcode-reader-camera');
      cameraScannerRef.current = scanner;
      try {
        await scanner.start((text) => {
          setSerial(text);
          setScanSuccess(true);
          stopCamera();
        });
      } catch {
        setScanError('Impossibile accedere alla fotocamera. Verifica i permessi del browser.');
        setCameraActive(false);
      }
    }, 100);
  };

  const stopCamera = () => {
    cameraScannerRef.current?.stop();
    cameraScannerRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const handleSave = async () => {
    if (!serial.trim()) return;
    setSaving(true);
    try {
      await onSave(serial.trim(), position || null, notes || null);
    } catch {
      // skip
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Nuovo Pannello</h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-slate-900 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Dual-option scan buttons */}
          <div className="relative z-50 grid grid-cols-2 gap-3">
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

          {/* Image preview */}
          {previewUrl && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img src={previewUrl} alt="Anteprima scansione" className="w-full max-h-48 object-cover" />
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg">
                Foto scansionata
              </div>
              {scanSuccess && (
                <div className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Codice estratto
                </div>
              )}
            </div>
          )}

          {/* Camera viewfinder */}
          {cameraActive && (
            <div className="rounded-xl overflow-hidden border-2 border-blue-900">
              <div id="barcode-reader-camera" className="w-full" />
              <div className="bg-blue-900 text-white text-xs text-center py-1.5">
                Inquadra il barcode con la fotocamera
              </div>
            </div>
          )}

          {/* Scan error */}
          {scanError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              <span>{scanError}</span>
            </div>
          )}

          {/* Serial number field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Matricola / Barcode <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                value={serial}
                onChange={(e) => { setSerial(e.target.value); setScanSuccess(false); }}
                placeholder="Scansiona o inserisci manualmente"
                className={`w-full pl-3 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                  scanSuccess
                    ? 'border-green-400 focus:ring-green-400'
                    : 'border-slate-200 focus:ring-red-400'
                }`}
              />
              {scanSuccess && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={18} />
              )}
            </div>
            {scanSuccess && (
              <div className="flex items-center gap-1.5 mt-1.5 text-green-600 text-xs">
                <CheckCircle2 size={14} />
                Codice rilevato con successo
              </div>
            )}
          </div>

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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Posizione</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="es. Tetto Nord, Fila 2"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Note</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !serial.trim()}
            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            <ScanLine size={18} />
            {saving ? 'Salvataggio...' : 'Salva Pannello'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoGrid({
  plantId,
  panels,
  photos,
  photoUrls,
  onUploaded,
  onDeletePhoto,
}: {
  plantId: string;
  panels: Panel[];
  photos: PanelPhoto[];
  photoUrls: Record<string, string>;
  onUploaded: () => void;
  onDeletePhoto: (photo: PanelPhoto) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    const panelId = selectedPanel || null;
    try {
      for (const file of Array.from(files)) {
        await uploadPhoto(plantId, file, panelId);
      }
      onUploaded();
    } catch {
      // skip
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <ImageIcon size={18} />
          Foto ({photos.length})
        </h2>
      </div>

      {/* Upload controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 space-y-3">
        {panels.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Associa foto al pannello (opzionale)
            </label>
            <select
              value={selectedPanel}
              onChange={(e) => setSelectedPanel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="">Nessun pannello specifico</option>
              {panels.map((p, i) => (
                <option key={p.id} value={p.id}>
                  Pannello {i + 1} - {p.serial_number}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
          {uploading ? 'Caricamento...' : 'Carica Foto'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleUpload(e.target.files);
            }
          }}
        />
      </div>

      {photos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <ImageIcon className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-slate-500 text-sm">Nessuna foto caricata.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => {
            const url = photoUrls[photo.id];
            const panel = photo.panel_id ? panels.find((p) => p.id === photo.panel_id) : null;
            return (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
              >
                {url ? (
                  <img src={url} alt={photo.file_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="animate-spin text-slate-400" size={20} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2">
                  <button
                    onClick={() => onDeletePhoto(photo)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg ml-auto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {panel && (
                  <div className="absolute top-2 left-2 bg-blue-900/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {panel.serial_number.slice(0, 12)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
