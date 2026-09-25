import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Sun, Zap, Battery, PlugZap, Gauge, ChevronDown, Plus, Trash2, Download, FileText, Loader2 } from 'lucide-react';
import type { Plant, Panel, PanelPhoto, PlantInverter, PlantStorage, PlantCharger, PlantPowerMeter } from '@/lib/types';
import {
  fetchPlant, fetchPanels, fetchPhotos, createPanel, updatePanel, deletePanel,
  deletePhoto, getPhotoUrl, deletePlant,
  fetchInverters, createInverter, updateInverter, deleteInverter,
  fetchStorages, createStorage, updateStorage, deleteStorage,
  fetchChargers, createCharger, updateCharger, deleteCharger,
  fetchPowerMeters, createPowerMeter, updatePowerMeter, deletePowerMeter,
} from '@/lib/api';
import { useEquipmentOptions } from '@/lib/use-equipment-options';
import { CHARGER_BRANDS, CHARGER_MODELS, POWER_METER_BRANDS, POWER_METER_MODELS } from '@/lib/equipment-presets';
import { exportPlantArchive } from '@/lib/export';
import { generatePlantPdf } from '@/lib/pdf';
import { saveAs } from 'file-saver';
import { Roadmap } from '@/components/Roadmap';
import { PlantHeader, PlantTechnicalDetails } from './plant-detail/PlantHeader';
import { EquipmentSection } from './plant-detail/EquipmentSection';
import { PanelRow } from './plant-detail/PanelRow';
import { PanelFormModal } from './plant-detail/PanelFormModal';
import { PhotoGrid } from './plant-detail/PhotoGrid';

interface PlantDetailProps { plantId: string; onBack: () => void; onDeleted: () => void; }

function sanitizeFileName(name: string): string { return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Senza_Nome'; }

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
  const [powerMeters, setPowerMeters] = useState<PlantPowerMeter[]>([]);
  const [invertersExpanded, setInvertersExpanded] = useState(false);
  const [storagesExpanded, setStoragesExpanded] = useState(false);
  const [chargersExpanded, setChargersExpanded] = useState(false);
  const [powerMetersExpanded, setPowerMetersExpanded] = useState(false);
  const inverterOpts = useEquipmentOptions('inverter');
  const storageOpts = useEquipmentOptions('storage');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, pnl, pho, inv, sto, chg, pm] = await Promise.all([
        fetchPlant(plantId), fetchPanels(plantId), fetchPhotos(plantId),
        fetchInverters(plantId), fetchStorages(plantId), fetchChargers(plantId),
        fetchPowerMeters(plantId),
      ]);
      setPlant(p); setPanels(pnl); setPhotos(pho);
      setInverters(inv); setStorages(sto); setChargers(chg); setPowerMeters(pm);
      const urlMap: Record<string, string> = {};
      await Promise.all(pho.map(async (photo) => { try { urlMap[photo.id] = await getPhotoUrl(photo.storage_path); } catch { /* skip */ } }));
      setPhotoUrls(urlMap);
    } catch { /* skip */ } finally { setLoading(false); }
  }, [plantId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleExport = async () => { if (!plant) return; setExporting(true); try { await exportPlantArchive(plant, panels, photos, inverters, storages, chargers); } catch { /* skip */ } finally { setExporting(false); } };
  const handleExportPdf = async () => { if (!plant) return; setExportingPdf(true); try { const blob = await generatePlantPdf(plant, panels, photos, undefined, inverters, storages, chargers); saveAs(blob, `${sanitizeFileName(plant.owner_name)}_${sanitizeFileName(plant.address)}.pdf`); } catch { /* skip */ } finally { setExportingPdf(false); } };
  const handleDeletePlant = async () => { if (!plant) return; try { await deletePlant(plant.id); onDeleted(); } catch { /* skip */ } };

  if (loading) { return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400" size={32} /></div>; }
  if (!plant) { return (<div className="p-8 text-center"><p className="text-slate-500">Impianto non trovato.</p><button onClick={onBack} className="mt-4 text-lime-600 font-medium text-sm">Torna alla dashboard</button></div>); }

  const fieldKeys = ['brand', 'model', 'code'] as const;
  const chargerBrandOpts = CHARGER_BRANDS;
  const chargerModelOpts = (b: string) => CHARGER_MODELS[b] ?? [];
  const pmBrandOpts = POWER_METER_BRANDS;
  const pmModelOpts = (b: string) => POWER_METER_MODELS[b] ?? [];

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors"><ArrowLeft size={18} /> Dashboard</button>
      <PlantHeader plant={plant} /><PlantTechnicalDetails plant={plant} />
      <div className="mb-6"><Roadmap plantId={plantId} /></div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button onClick={handleExport} disabled={exporting} className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold px-4 py-3 rounded-xl transition-colors shadow-sm">{exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}{exporting ? 'Generazione archivio...' : 'Scarica Archivio ZIP'}</button>
        <button onClick={handleExportPdf} disabled={exportingPdf} className="flex-1 flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold px-4 py-3 rounded-xl transition-colors shadow-sm">{exportingPdf ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}{exportingPdf ? 'Generazione PDF...' : 'Genera Report PDF'}</button>
        <button onClick={() => setConfirmDelete(true)} className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium px-4 py-3 rounded-xl transition-colors"><Trash2 size={18} /> Elimina</button>
      </div>

      <EquipmentSection title="Inverter" icon={Zap} items={inverters} expanded={invertersExpanded} onToggle={() => setInvertersExpanded((v) => !v)}
        onAdd={() => setInverters((prev) => [...prev, { id: '', plant_id: plantId, brand: '', model: '', code: '', sort_order: prev.length, created_at: '', updated_at: '' }])}
        emptyLabel="Nessun inverter registrato."
        renderItem={(inv, index) => ({
          fields: [{ label: 'Marca', value: inv.brand }, { label: 'Modello', value: inv.model }, { label: 'Codice', value: inv.code }],
          brandOptions: inverterOpts.brands, modelOptionsFor: inverterOpts.modelsFor, onEnsureBrand: inverterOpts.ensureBrand, onEnsureModel: inverterOpts.ensureModel,
          onChange: (fi, val) => setInverters((prev) => prev.map((it, i) => i !== index ? it : { ...it, [fieldKeys[fi]]: val })),
          onSave: async () => { if (!inv.brand && !inv.model && !inv.code) return; if (inv.id) { await updateInverter(inv.id, { brand: inv.brand, model: inv.model, code: inv.code }); } else { const c = await createInverter({ plant_id: plantId, brand: inv.brand, model: inv.model, code: inv.code, sort_order: index }); setInverters((prev) => prev.map((it, i) => i === index ? c : it)); } },
          onDelete: async () => { if (inv.id) await deleteInverter(inv.id); setInverters((prev) => prev.filter((_, i) => i !== index)); },
        })}
      />

      <EquipmentSection title="Accumuli" icon={Battery} items={storages} expanded={storagesExpanded} onToggle={() => setStoragesExpanded((v) => !v)}
        onAdd={() => setStorages((prev) => [...prev, { id: '', plant_id: plantId, brand: '', model: '', code: '', power_kw: null, sort_order: prev.length, created_at: '', updated_at: '' }])}
        emptyLabel="Nessun accumulo registrato."
        renderItem={(sto, index) => ({
          fields: [{ label: 'Marca', value: sto.brand }, { label: 'Modello', value: sto.model }, { label: 'Codice', value: sto.code }],
          extraField: { label: 'Potenza (kWh)', value: sto.power_kw != null ? String(sto.power_kw) : '' },
          brandOptions: storageOpts.brands, modelOptionsFor: storageOpts.modelsFor, onEnsureBrand: storageOpts.ensureBrand, onEnsureModel: storageOpts.ensureModel,
          onChange: (fi, val) => setStorages((prev) => prev.map((it, i) => i !== index ? it : { ...it, [fieldKeys[fi]]: val })),
          onChangeExtra: (val) => setStorages((prev) => prev.map((it, i) => i === index ? { ...it, power_kw: val === '' ? null : parseFloat(val) } : it)),
          onSave: async () => { if (!sto.brand && !sto.model && !sto.code && sto.power_kw == null) return; if (sto.id) { await updateStorage(sto.id, { brand: sto.brand, model: sto.model, code: sto.code, power_kw: sto.power_kw }); } else { const c = await createStorage({ plant_id: plantId, brand: sto.brand, model: sto.model, code: sto.code, power_kw: sto.power_kw, sort_order: index }); setStorages((prev) => prev.map((it, i) => i === index ? c : it)); } },
          onDelete: async () => { if (sto.id) await deleteStorage(sto.id); setStorages((prev) => prev.filter((_, i) => i !== index)); },
        })}
      />

      <EquipmentSection title="Colonnine" icon={PlugZap} items={chargers} expanded={chargersExpanded} onToggle={() => setChargersExpanded((v) => !v)}
        onAdd={() => setChargers((prev) => [...prev, { id: '', plant_id: plantId, brand: '', model: '', code: '', sort_order: prev.length, created_at: '', updated_at: '' }])}
        emptyLabel="Nessuna colonnina registrata."
        renderItem={(chg, index) => ({
          fields: [{ label: 'Marca', value: chg.brand }, { label: 'Modello', value: chg.model }, { label: 'Codice', value: chg.code }],
          brandOptions: chargerBrandOpts, modelOptionsFor: chargerModelOpts,
          onChange: (fi, val) => setChargers((prev) => prev.map((it, i) => i !== index ? it : { ...it, [fieldKeys[fi]]: val })),
          onSave: async () => { if (!chg.brand && !chg.model && !chg.code) return; if (chg.id) { await updateCharger(chg.id, { brand: chg.brand, model: chg.model, code: chg.code }); } else { const c = await createCharger({ plant_id: plantId, brand: chg.brand, model: chg.model, code: chg.code, sort_order: index }); setChargers((prev) => prev.map((it, i) => i === index ? c : it)); } },
          onDelete: async () => { if (chg.id) await deleteCharger(chg.id); setChargers((prev) => prev.filter((_, i) => i !== index)); },
        })}
      />

      <EquipmentSection title="Power Meter" icon={Gauge} items={powerMeters} expanded={powerMetersExpanded} onToggle={() => setPowerMetersExpanded((v) => !v)}
        onAdd={() => setPowerMeters((prev) => [...prev, { id: '', plant_id: plantId, brand: '', model: '', sort_order: prev.length, created_at: '', updated_at: '' }])}
        emptyLabel="Nessun power meter registrato."
        renderItem={(pm, index) => ({
          fields: [{ label: 'Marca', value: pm.brand }, { label: 'Modello', value: pm.model }],
          brandOptions: pmBrandOpts, modelOptionsFor: pmModelOpts,
          onChange: (fi, val) => setPowerMeters((prev) => prev.map((it, i) => i !== index ? it : { ...it, [fieldKeys[fi]]: val })),
          onSave: async () => { if (!pm.brand && !pm.model) return; if (pm.id) { await updatePowerMeter(pm.id, { brand: pm.brand, model: pm.model }); } else { const c = await createPowerMeter({ plant_id: plantId, brand: pm.brand, model: pm.model, sort_order: index }); setPowerMeters((prev) => prev.map((it, i) => i === index ? c : it)); } },
          onDelete: async () => { if (pm.id) await deletePowerMeter(pm.id); setPowerMeters((prev) => prev.filter((_, i) => i !== index)); },
        })}
      />

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setPanelsExpanded((v) => !v)} className="flex items-center gap-2 font-semibold text-slate-900 hover:text-blue-900 transition-colors">
            <Sun size={18} /> Pannelli ({panels.length})<ChevronDown size={18} className={`transition-transform ${panelsExpanded ? '' : '-rotate-90'}`} />
          </button>
          <button onClick={() => setShowPanelForm(true)} className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"><Plus size={16} /> Aggiungi</button>
        </div>
        {panelsExpanded && (panels.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center"><p className="text-slate-500 text-sm mt-2">Nessun pannello registrato.</p></div>
        ) : (
          <div className="space-y-3">
            {panels.map((panel, index) => (
              <PanelRow key={panel.id} panel={panel} index={index}
                onUpdate={(data) => updatePanel(panel.id, { serial_number: data.serial, notes: data.notes, brand: data.brand, power_wp: data.power_wp }).then(() => undefined)}
                onDelete={() => deletePanel(panel.id).then(loadAll)}
              />
            ))}
          </div>
        ))}
      </div>

      <PhotoGrid plantId={plantId} panels={panels} photos={photos} photoUrls={photoUrls} onUploaded={loadAll}
        onDeletePhoto={async (photo) => { await deletePhoto(photo); loadAll(); }} />

      {showPanelForm && (
        <PanelFormModal onClose={() => setShowPanelForm(false)}
          onSave={async (data) => {
            const created = await createPanel({ plant_id: plantId, serial_number: data.serial, position_label: null, notes: data.notes, brand: data.brand, power_wp: data.power_wp });
            setPanels((current) => [...current, created]);
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-slate-900 mb-2">Eliminare l{"'"}impianto?</h3>
            <p className="text-slate-500 text-sm mb-5">Questa operazione cancellerà tutti i pannelli e le foto associate. Non è reversibile.</p>
            <div className="flex gap-3">
              <button onClick={handleDeletePlant} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-xl transition-colors">Elimina</button>
              <button onClick={() => setConfirmDelete(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
