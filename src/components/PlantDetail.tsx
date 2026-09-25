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
  Upload,
  Trash2,
  Download,
  X,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  ImagePlus,
  Video,
  ChevronDown,
  Battery,
  PlugZap,
  type LucideIcon,
} from 'lucide-react';
import type { Plant, Panel, PanelPhoto, PlantInverter, PlantStorage, PlantCharger } from '@/lib/types';
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
  fetchInverters,
  createInverter,
  updateInverter,
  deleteInverter,
  fetchStorages,
  createStorage,
  updateStorage,
  deleteStorage,
  fetchChargers,
  createCharger,
  updateCharger,
  deleteCharger,
} from '@/lib/api';
import { useEquipmentOptions } from '@/lib/use-equipment-options';
import type { EquipmentCategory } from '@/lib/types';
import { scanImageFile, CameraScanner } from '@/lib/scanner';
import { exportPlantArchive } from '@/lib/export';
import { generatePlantPdf } from '@/lib/pdf';
import { saveAs } from 'file-saver';
import { Roadmap } from '@/components/Roadmap';

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
  const [panelsExpanded, setPanelsExpanded] = useState(false);
  const [inverters, setInverters] = useState<PlantInverter[]>([]);
  const [storages, setStorages] = useState<PlantStorage[]>([]);
  const [chargers, setChargers] = useState<PlantCharger[]>([]);
  const [invertersExpanded, setInvertersExpanded] = useState(false);
  const [storagesExpanded, setStoragesExpanded] = useState(false);
  const [chargersExpanded, setChargersExpanded] = useState(false);
  const inverterOpts = useEquipmentOptions('inverter');
  const storageOpts = useEquipmentOptions('storage');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, pnl, pho, inv, sto, chg] = await Promise.all([
        fetchPlant(plantId),
        fetchPanels(plantId),
        fetchPhotos(plantId),
        fetchInverters(plantId),
        fetchStorages(plantId),
        fetchChargers(plantId),
      ]);
      setPlant(p);
      setPanels(pnl);
      setPhotos(pho);
      setInverters(inv);
      setStorages(sto);
      setChargers(chg);

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
      await exportPlantArchive(plant, panels, photos, inverters, storages, chargers);
    } catch {
      // skip
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!plant) return;
    setExportingPdf(true);
    try {
      const blob = await generatePlantPdf(plant, panels, photos, undefined, inverters, storages, chargers);
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
              <span className="truncate">
                {[plant.address, plant.city, plant.province].filter(Boolean).join(', ')}
              </span>
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
          <DetailRow label="Città / Paese" value={plant.city} />
          <DetailRow label="Provincia" value={plant.province} />
          <DetailRow label="Regione" value={plant.region} />
          <DetailRow label="POD" value={plant.pod} />
          <DetailRow label="Codice CENSIMP" value={plant.censimp_code} />
          <DetailRow label="Potenza Totale" value={plant.total_power_kw != null ? `${plant.total_power_kw} kW` : null} />
          <DetailRow label="Pannelli" value={plant.panel_brand_model} />
          <DetailRow label="Data Installazione" value={plant.installation_date ? plant.installation_date.slice(0, 10) : null} />
          <DetailRow label="Note" value={plant.notes} />
        </div>
      </div>

      {/* SyncroSolar Roadmap */}
      <div className="mb-6">
        <Roadmap plantId={plantId} />
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

      {/* Inverters section — collapsible */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setInvertersExpanded((v) => !v)}
            className="flex items-center gap-2 font-semibold text-slate-900 hover:text-blue-900 transition-colors"
          >
            <Zap size={18} />
            Inverter ({inverters.length})
            <ChevronDown
              size={18}
              className={`transition-transform ${invertersExpanded ? '' : '-rotate-90'}`}
            />
          </button>
          <button
            onClick={() => setInverters((prev) => [...prev, { id: '', plant_id: plantId, brand: '', model: '', code: '', sort_order: prev.length, created_at: '', updated_at: '' }])}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Aggiungi
          </button>
        </div>
        {invertersExpanded && (
          <div className="space-y-3">
            {inverters.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <Zap className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-500 text-sm">Nessun inverter registrato.</p>
              </div>
            ) : (
              inverters.map((inv, index) => (
                <EquipmentRow
                  key={inv.id || `new-${index}`}
                  index={index}
                  fields={[
                    { label: 'Marca', value: inv.brand },
                    { label: 'Modello', value: inv.model },
                    { label: 'Codice', value: inv.code }]}
                  brandOptions={inverterOpts.brands}
                  modelOptionsFor={inverterOpts.modelsFor}
                  onEnsureBrand={inverterOpts.ensureBrand}
                  onEnsureModel={inverterOpts.ensureModel}
                  onChange={(fieldIndex, value) => {
                    setInverters((prev) => prev.map((it, i) => {
                      if (i !== index) return it;
                      const keys = ['brand', 'model', 'code'] as const;
                      return { ...it, [keys[fieldIndex]]: value };
                    }));
                  }}
                  onSave={async () => {
                    const row = inverters[index];
                    if (!row.brand && !row.model && !row.code) return;
                    if (row.id) {
                      await updateInverter(row.id, { brand: row.brand, model: row.model, code: row.code });
                    } else {
                      const created = await createInverter({ plant_id: plantId, brand: row.brand, model: row.model, code: row.code, sort_order: index });
                      setInverters((prev) => prev.map((it, i) => i === index ? created : it));
                    }
                  }}
                  onDelete={async () => {
                    const row = inverters[index];
                    if (row.id) await deleteInverter(row.id);
                    setInverters((prev) => prev.filter((_, i) => i !== index));
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Storages section — collapsible */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setStoragesExpanded((v) => !v)}
            className="flex items-center gap-2 font-semibold text-slate-900 hover:text-blue-900 transition-colors"
          >
            <Battery size={18} />
            Accumuli ({storages.length})
            <ChevronDown
              size={18}
              className={`transition-transform ${storagesExpanded ? '' : '-rotate-90'}`}
            />
          </button>
          <button
            onClick={() => setStorages((prev) => [...prev, { id: '', plant_id: plantId, brand: '', model: '', code: '', power_kw: null, sort_order: prev.length, created_at: '', updated_at: '' }])}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Aggiungi
          </button>
        </div>
        {storagesExpanded && (
          <div className="space-y-3">
            {storages.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <Battery className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-500 text-sm">Nessun accumulo registrato.</p>
              </div>
            ) : (
              storages.map((sto, index) => (
                <EquipmentRow
                  key={sto.id || `new-${index}`}
                  index={index}
                  fields={[
                    { label: 'Marca', value: sto.brand },
                    { label: 'Modello', value: sto.model },
                    { label: 'Codice', value: sto.code }]}
                  brandOptions={storageOpts.brands}
                  modelOptionsFor={storageOpts.modelsFor}
                  onEnsureBrand={storageOpts.ensureBrand}
                  onEnsureModel={storageOpts.ensureModel}
                  extraField={{ label: 'Potenza (kW)', value: sto.power_kw != null ? String(sto.power_kw) : '' }}
                  onChangeExtra={(value) => {
                    setStorages((prev) => prev.map((it, i) => i === index ? { ...it, power_kw: value === '' ? null : parseFloat(value) } : it));
                  }}
                  onChange={(fieldIndex, value) => {
                    setStorages((prev) => prev.map((it, i) => {
                      if (i !== index) return it;
                      const keys = ['brand', 'model', 'code'] as const;
                      return { ...it, [keys[fieldIndex]]: value };
                    }));
                  }}
                  onSave={async () => {
                    const row = storages[index];
                    if (!row.brand && !row.model && !row.code && row.power_kw == null) return;
                    if (row.id) {
                      await updateStorage(row.id, { brand: row.brand, model: row.model, code: row.code, power_kw: row.power_kw });
                    } else {
                      const created = await createStorage({ plant_id: plantId, brand: row.brand, model: row.model, code: row.code, power_kw: row.power_kw, sort_order: index });
                      setStorages((prev) => prev.map((it, i) => i === index ? created : it));
                    }
                  }}
                  onDelete={async () => {
                    const row = storages[index];
                    if (row.id) await deleteStorage(row.id);
                    setStorages((prev) => prev.filter((_, i) => i !== index));
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Chargers section — collapsible */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setChargersExpanded((v) => !v)}
            className="flex items-center gap-2 font-semibold text-slate-900 hover:text-blue-900 transition-colors"
          >
            <PlugZap size={18} />
            Colonnine ({chargers.length})
            <ChevronDown
              size={18}
              className={`transition-transform ${chargersExpanded ? '' : '-rotate-90'}`}
            />
          </button>
          <button
            onClick={() => setChargers((prev) => [...prev, { id: '', plant_id: plantId, brand: '', model: '', code: '', sort_order: prev.length, created_at: '', updated_at: '' }])}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Aggiungi
          </button>
        </div>
        {chargersExpanded && (
          <div className="space-y-3">
            {chargers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <PlugZap className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-500 text-sm">Nessuna colonnina registrata.</p>
              </div>
            ) : (
              chargers.map((chg, index) => (
                <EquipmentRow
                  key={chg.id || `new-${index}`}
                  index={index}
                  fields={[
                    { label: 'Marca', value: chg.brand },
                    { label: 'Modello', value: chg.model },
                    { label: 'Codice', value: chg.code }]}
                  onChange={(fieldIndex, value) => {
                    setChargers((prev) => prev.map((it, i) => {
                      if (i !== index) return it;
                      const keys = ['brand', 'model', 'code'] as const;
                      return { ...it, [keys[fieldIndex]]: value };
                    }));
                  }}
                  onSave={async () => {
                    const row = chargers[index];
                    if (!row.brand && !row.model && !row.code) return;
                    if (row.id) {
                      await updateCharger(row.id, { brand: row.brand, model: row.model, code: row.code });
                    } else {
                      const created = await createCharger({ plant_id: plantId, brand: row.brand, model: row.model, code: row.code, sort_order: index });
                      setChargers((prev) => prev.map((it, i) => i === index ? created : it));
                    }
                  }}
                  onDelete={async () => {
                    const row = chargers[index];
                    if (row.id) await deleteCharger(row.id);
                    setChargers((prev) => prev.filter((_, i) => i !== index));
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Panels section — collapsible */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setPanelsExpanded((v) => !v)}
            className="flex items-center gap-2 font-semibold text-slate-900 hover:text-blue-900 transition-colors"
          >
            <Sun size={18} />
            Pannelli ({panels.length})
            <ChevronDown
              size={18}
              className={`transition-transform ${panelsExpanded ? '' : '-rotate-90'}`}
            />
          </button>
          <button
            onClick={() => setShowPanelForm(true)}
            className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Aggiungi
          </button>
        </div>

        {panelsExpanded && (
          panels.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-slate-500 text-sm mt-2">Nessun pannello registrato.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {panels.map((panel, index) => (
                <PanelRow
                  key={panel.id}
                  panel={panel}
                  index={index}
                  onUpdate={(serial, notes) =>
                    updatePanel(panel.id, { serial_number: serial, notes }).then(() => undefined)
                  }
                  onDelete={() => deletePanel(panel.id).then(loadAll)}
                />
              ))}
            </div>
          )
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
          onSave={async (serial, notes) => {
            const created = await createPanel({
              plant_id: plantId,
              serial_number: serial,
              position_label: null,
              notes,
            });
            setPanels((current) => [...current, created]);
            setShowPanelForm(false);
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

interface EquipmentField {
  label: string;
  value: string;
}

function EquipmentRow({
  index,
  fields,
  extraField,
  onChange,
  onChangeExtra,
  onSave,
  onDelete,
  brandOptions,
  modelOptionsFor,
  onEnsureBrand,
  onEnsureModel,
}: {
  index: number;
  fields: EquipmentField[];
  extraField?: EquipmentField;
  onChange: (fieldIndex: number, value: string) => void;
  onChangeExtra?: (value: string) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  brandOptions?: readonly string[];
  modelOptionsFor?: (brand: string) => readonly string[];
  onEnsureBrand?: (brand: string) => Promise<void>;
  onEnsureModel?: (brand: string, model: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [customBrand, setCustomBrand] = useState(false);
  const [customModel, setCustomModel] = useState(false);

  const hasData = fields.some((f) => f.value) || (extraField && extraField.value);

  const handleSave = async () => {
    setSaving(true);
    try {
      const brandVal = fields.find((f) => f.label === 'Marca')?.value ?? '';
      const modelVal = fields.find((f) => f.label === 'Modello')?.value ?? '';
      if (onEnsureBrand && brandVal && brandVal !== '__custom') {
        await onEnsureBrand(brandVal);
      }
      if (onEnsureModel && brandVal && modelVal && brandVal !== '__custom' && modelVal !== '__custom') {
        await onEnsureModel(brandVal, modelVal);
      }
      await onSave();
      setCustomBrand(false);
      setCustomModel(false);
      setEditing(false);
    } catch {
      // skip
    } finally {
      setSaving(false);
    }
  };

  if (confirmDel) {
    return (
      <div className="bg-white rounded-2xl border border-red-400 p-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-700">Eliminare questa voce?</span>
        <div className="flex gap-2">
          <button
            onClick={async () => { await onDelete(); setConfirmDel(false); }}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Elimina
          </button>
          <button
            onClick={() => setConfirmDel(false)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-red-400 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">Voce {index + 1}</span>
          <button
            onClick={() => setEditing(false)}
            className="p-1 text-slate-400 hover:text-slate-900 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`grid grid-cols-1 ${extraField ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
          {fields.map((f, i) => {
            const isBrand = f.label === 'Marca' && brandOptions;
            const isModel = f.label === 'Modello' && modelOptionsFor;
            const currentBrand = fields.find((ff) => ff.label === 'Marca')?.value ?? '';
            const models = isModel ? modelOptionsFor!(currentBrand) : [];
            return (
              <div key={f.label}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                {f.label === 'Codice' ? (
                  <div className="flex gap-1">
                    <input
                      value={f.value}
                      onChange={(e) => onChange(i, e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="flex items-center justify-center px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      title="Scansiona QR code"
                    >
                      <ScanLine size={18} />
                    </button>
                  </div>
                ) : isBrand ? (
                  customBrand ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={f.value}
                        onChange={(e) => onChange(i, e.target.value.toUpperCase())}
                        placeholder="Inserisci marca"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                      <button
                        type="button"
                        onClick={() => { onChange(i, ''); setCustomBrand(false); }}
                        className="flex items-center justify-center px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors"
                        title="Torna al menu"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={f.value}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        if (val === '__CUSTOM') { onChange(i, ''); setCustomBrand(true); }
                        else onChange(i, val);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <option value="">— Seleziona —</option>
                      {brandOptions!.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="__custom">Altro...</option>
                    </select>
                  )
                ) : isModel && models.length > 0 ? (
                  customModel ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={f.value}
                        onChange={(e) => onChange(i, e.target.value.toUpperCase())}
                        placeholder="Inserisci modello"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                      <button
                        type="button"
                        onClick={() => { onChange(i, ''); setCustomModel(false); }}
                        className="flex items-center justify-center px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors"
                        title="Torna al menu"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={f.value}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        if (val === '__CUSTOM') { onChange(i, ''); setCustomModel(true); }
                        else onChange(i, val);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <option value="">— Seleziona —</option>
                      {models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value="__custom">Altro...</option>
                    </select>
                  )
                ) : (
                  <input
                    value={f.value}
                    onChange={(e) => onChange(i, e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                )}
              </div>
            );
          })}
          {extraField && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{extraField.label}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={extraField.value}
                onChange={(e) => onChangeExtra?.(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          )}
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
        {showScanner && (
          <EquipmentScannerModal
            onClose={() => setShowScanner(false)}
            onScan={(text) => {
              onChange(fields.findIndex((f) => f.label === 'Codice'), text.toUpperCase());
              setShowScanner(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
      <div className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg text-slate-500 text-sm font-semibold flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        {hasData ? (
          <div className="text-sm text-slate-900">
            {fields.map((f, i) => (
              <span key={f.label}>
                {i > 0 && <span className="text-slate-300 mx-1.5">·</span>}
                {f.value && <span className="font-medium">{f.value}</span>}
              </span>
            ))}
            {extraField && extraField.value && (
              <span className="text-slate-500 ml-1.5">· {extraField.value} kW</span>
            )}
          </div>
        ) : (
          <div className="text-sm text-slate-400 italic">Nuova voce — compila e salva</div>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <FileText size={16} />
        </button>
        <button
          onClick={() => setConfirmDel(true)}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function EquipmentScannerModal({
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

function PanelRow({
  panel,
  index,
  onUpdate,
  onDelete,
}: {
  panel: Panel;
  index: number;
  onUpdate: (serial: string, notes: string | null) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [serial, setSerial] = useState(panel.serial_number);
  const [notes, setNotes] = useState(panel.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(serial, notes || null);
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
            onChange={(e) => setSerial(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Note</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
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
  onSave: (serial: string, notes: string | null) => Promise<void>;
}) {
  const [serial, setSerial] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const cameraScannerRef = useRef<CameraScanner | null>(null);
  const cameraStartTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileScan = async (file: File) => {
    setScanning(true);
    setScanError(null);
    setScanSuccess(false);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    try {
      const result = await scanImageFile(file);
      if (result?.text) {
        setSerial(result.text);
        setScanSuccess(true);
      } else {
        setScanError("Nessun codice rilevato nell'immagine. Inserisci la matricola manualmente.");
      }
    } finally {
      setScanning(false);
    }
  };

  const startCamera = async () => {
    setScanError(null);
    setScanSuccess(false);
    setCameraActive(true);
    cameraStartTimerRef.current = window.setTimeout(async () => {
      cameraStartTimerRef.current = null;
      const scanner = new CameraScanner('barcode-reader-camera');
      cameraScannerRef.current = scanner;
      try {
        await scanner.start((text) => {
          setSerial(text);
          setScanSuccess(true);
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

  const handleSave = async () => {
    if (!serial.trim()) return;
    setSaving(true);
    try {
      await onSave(serial.trim(), notes || null);
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

          {/* Camera viewfinder — always in DOM, visible only when active */}
          <div
            className="rounded-xl overflow-hidden border-2 border-blue-900"
            style={{ display: cameraActive ? 'block' : 'none' }}
          >
            <div id="barcode-reader-camera" className="w-full" style={{ minHeight: '300px' }} />
            {cameraActive && (
              <div className="bg-blue-900 text-white text-xs text-center py-1.5">
                Inquadra il barcode con la fotocamera
              </div>
            )}
          </div>

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
                onChange={(e) => { setSerial(e.target.value.toUpperCase()); setScanSuccess(false); }}
                placeholder="Scansiona o inserisci manualmente"
                className={`w-full pl-3 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Note</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value.toUpperCase())}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
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
