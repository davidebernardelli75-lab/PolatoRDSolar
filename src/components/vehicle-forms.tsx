import { useState } from 'react';
import { Car, Truck, Bike, X, type LucideIcon } from 'lucide-react';
import type { Vehicle, VehicleInsert, VehicleType } from '@/lib/types';
import { INSURANCE_COMPANIES } from '@/lib/insurance-presets';

export const VEHICLE_TYPES: VehicleType[] = ['Auto', 'Furgone', 'Motoveicolo'];

export const VEHICLE_BRANDS = [
  'FIAT', 'VOLKSWAGEN', 'FORD', 'RENAULT', 'CITROEN', 'PEUGEOT',
  'OPEL', 'MERCEDES', 'BMW', 'AUDI', 'TOYOTA', 'HYUNDAI',
  'KIA', 'NISSAN', 'SKODA', 'SEAT', 'IVECO', 'FORD TRANSIT',
] as const;

export function DetailItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-slate-400 text-xs mb-0.5">
        <Icon size={11} />
        {label}
      </div>
      <div className="text-slate-900 font-medium text-sm">{value}</div>
    </div>
  );
}

export function VehicleEditCard({
  vehicle,
  onCancel,
  onSave,
}: {
  vehicle: Vehicle;
  onCancel: () => void;
  onSave: (input: Partial<VehicleInsert>) => Promise<void>;
}) {
  const [form, setForm] = useState<VehicleInsert>({
    type: vehicle.type,
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    mileage_km: vehicle.mileage_km,
    service_interval_km: vehicle.service_interval_km,
    last_service_km: vehicle.last_service_km,
    last_service_date: vehicle.last_service_date ?? '',
    insurance_expiry: vehicle.insurance_expiry ?? '',
    insurance_company: vehicle.insurance_company ?? '',
    inspection_expiry: vehicle.inspection_expiry ?? '',
    tax_expiry: vehicle.tax_expiry ?? '',
    vehicle_category: vehicle.vehicle_category ?? '',
    notes: vehicle.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof VehicleInsert>(key: K, value: VehicleInsert[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        last_service_date: form.last_service_date || null,
        insurance_expiry: form.insurance_expiry || null,
        insurance_company: form.insurance_company || null,
        inspection_expiry: form.inspection_expiry || null,
        tax_expiry: form.tax_expiry || null,
        vehicle_category: form.vehicle_category || null,
        notes: form.notes || null,
      });
    } catch {
      // skip
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-red-400 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">Modifica veicolo</span>
        <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg">
          <X size={18} />
        </button>
      </div>
      <VehicleFormFields form={form} update={update} />
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2 rounded-lg transition-colors">
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
        <button onClick={onCancel}
          className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 rounded-lg transition-colors">
          Annulla
        </button>
      </div>
    </div>
  );
}

export function VehicleFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: VehicleInsert) => Promise<void>;
}) {
  const [form, setForm] = useState<VehicleInsert>({
    type: 'Auto', plate: '', brand: '', model: '', mileage_km: 0,
    service_interval_km: 20000, last_service_km: 0, last_service_date: '',
    insurance_expiry: '', insurance_company: '', inspection_expiry: '',
    tax_expiry: '', vehicle_category: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof VehicleInsert>(key: K, value: VehicleInsert[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        last_service_date: form.last_service_date || null,
        insurance_expiry: form.insurance_expiry || null,
        insurance_company: form.insurance_company || null,
        inspection_expiry: form.inspection_expiry || null,
        tax_expiry: form.tax_expiry || null,
        vehicle_category: form.vehicle_category || null,
        notes: form.notes || null,
      });
    } catch {
      // skip
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Nuovo Veicolo</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <VehicleFormFields form={form} update={update} />
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
            {saving ? 'Salvataggio...' : 'Salva Veicolo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function VehicleFormFields({
  form,
  update,
}: {
  form: VehicleInsert;
  update: <K extends keyof VehicleInsert>(key: K, value: VehicleInsert[K]) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo Veicolo</label>
          <div className="flex gap-2">
            {VEHICLE_TYPES.map((t) => {
              const Icon = t === 'Furgone' ? Truck : t === 'Motoveicolo' ? Bike : Car;
              return (
                <button key={t} type="button" onClick={() => update('type', t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.type === t ? 'bg-blue-900 text-white border-blue-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}>
                  <Icon size={16} /> {t}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Targa</label>
          <input value={form.plate} onChange={(e) => update('plate', e.target.value.toUpperCase())}
            placeholder="es. AB123CD"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Marca</label>
          <select value={form.brand} onChange={(e) => update('brand', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400">
            <option value="">— Seleziona —</option>
            {VEHICLE_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            <option value="__custom">Altro...</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Modello</label>
          <input value={form.model} onChange={(e) => update('model', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
      </div>
      {form.brand === '__custom' && (
        <input value="" onChange={(e) => update('brand', e.target.value.toUpperCase())}
          placeholder="Inserisci marca"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400" />
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Chilometri Attuali</label>
          <input type="number" min="0" value={form.mileage_km}
            onChange={(e) => update('mileage_km', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Intervallo Tagliando (km)</label>
          <input type="number" min="1000" step="1000" value={form.service_interval_km}
            onChange={(e) => update('service_interval_km', parseInt(e.target.value) || 20000)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Km Ultimo Tagliando</label>
          <input type="number" min="0" value={form.last_service_km}
            onChange={(e) => update('last_service_km', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Data Ultimo Tagliando</label>
          <input type="date" value={form.last_service_date ?? ''}
            onChange={(e) => update('last_service_date', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Scadenza Assicurazione</label>
          <input type="date" value={form.insurance_expiry ?? ''}
            onChange={(e) => update('insurance_expiry', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Compagnia Assicurativa</label>
          <select value={form.insurance_company ?? ''} onChange={(e) => update('insurance_company', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400">
            <option value="">— Seleziona —</option>
            {INSURANCE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__custom">Altro...</option>
          </select>
        </div>
      </div>
      {form.insurance_company === '__custom' && (
        <input value="" onChange={(e) => update('insurance_company', e.target.value.toUpperCase())}
          placeholder="Inserisci compagnia"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400" />
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Scadenza Bollo</label>
          <input type="date" value={form.tax_expiry ?? ''}
            onChange={(e) => update('tax_expiry', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Scadenza Revisione</label>
          <input type="date" value={form.inspection_expiry ?? ''}
            onChange={(e) => update('inspection_expiry', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Note</label>
        <textarea value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} rows={2}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
      </div>
    </>
  );
}
