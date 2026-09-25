import { useState } from 'react';
import { Car, Truck, Bike, X, CalendarDays, ClipboardCheck, Gauge, ReceiptText, ShieldCheck, Tag, Wrench, StickyNote, Building2, Flame, type LucideIcon } from 'lucide-react';
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
    gas_cylinders_inspection_expiry: vehicle.gas_cylinders_inspection_expiry ?? '',
    methane_inspection_expiry: vehicle.methane_inspection_expiry ?? '',
    tax_expiry: vehicle.tax_expiry ?? '',
    vehicle_category: vehicle.vehicle_category ?? '',
    notes: vehicle.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof VehicleInsert>(key: K, value: VehicleInsert[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...form,
        last_service_date: form.last_service_date || null,
        insurance_expiry: form.insurance_expiry || null,
        insurance_company: form.insurance_company || null,
        inspection_expiry: form.inspection_expiry || null,
        gas_cylinders_inspection_expiry: form.gas_cylinders_inspection_expiry || null,
        methane_inspection_expiry: form.methane_inspection_expiry || null,
        tax_expiry: form.tax_expiry || null,
        vehicle_category: form.vehicle_category || null,
        notes: form.notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio');
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
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2 rounded-lg transition-colors">
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
        <button type="button" onClick={onCancel}
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
    gas_cylinders_inspection_expiry: '', methane_inspection_expiry: '',
    tax_expiry: '', vehicle_category: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof VehicleInsert>(key: K, value: VehicleInsert[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...form,
        last_service_date: form.last_service_date || null,
        insurance_expiry: form.insurance_expiry || null,
        insurance_company: form.insurance_company || null,
        inspection_expiry: form.inspection_expiry || null,
        gas_cylinders_inspection_expiry: form.gas_cylinders_inspection_expiry || null,
        methane_inspection_expiry: form.methane_inspection_expiry || null,
        tax_expiry: form.tax_expiry || null,
        vehicle_category: form.vehicle_category || null,
        notes: form.notes || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio');
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
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</div>}
          <button type="button" onClick={handleSave} disabled={saving}
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
  const [customBrand, setCustomBrand] = useState(false);
  const [customInsurance, setCustomInsurance] = useState(false);
  const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100';
  const selectClass = `${inputClass} uppercase`;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Car size={14} className="text-blue-900" /> Identificazione veicolo
        </div>
        <div className="grid grid-cols-3 gap-2">
          {VEHICLE_TYPES.map((t) => {
            const Icon = t === 'Furgone' ? Truck : t === 'Motoveicolo' ? Bike : Car;
            return (
              <button key={t} type="button" onClick={() => update('type', t)}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors sm:flex-row sm:gap-1.5 sm:py-2.5 sm:text-sm ${
                  form.type === t ? 'border-blue-900 bg-blue-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                }`}>
                <Icon size={16} /> <span className="truncate">{t}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Targa" icon={Tag}>
            <input value={form.plate} onChange={(e) => update('plate', e.target.value.toUpperCase())} placeholder="AB123CD" className={selectClass} />
          </Field>
          <Field label="Marca" icon={Building2}>
            {customBrand ? (
              <div className="flex gap-1">
                <input autoFocus value={form.brand} onChange={(e) => update('brand', e.target.value.toUpperCase())} placeholder="Inserisci marca" className={selectClass} />
                <button type="button" onClick={() => { setCustomBrand(false); update('brand', ''); }} className="flex items-center justify-center px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <select value={form.brand} onChange={(e) => { const val = e.target.value.toUpperCase(); if (val === '__CUSTOM') { setCustomBrand(true); update('brand', ''); } else update('brand', val); }} className={selectClass}>
                <option value="">Marca</option>
                {VEHICLE_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                <option value="__custom">Altro...</option>
              </select>
            )}
          </Field>
          <Field label="Modello" icon={Car}>
            <input value={form.model} onChange={(e) => update('model', e.target.value.toUpperCase())} placeholder="Modello" className={selectClass} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Gauge size={14} className="text-blue-900" /> Manutenzione
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Chilometri attuali" icon={Gauge}>
            <input type="text" inputMode="numeric" value={form.mileage_km} onChange={(e) => update('mileage_km', parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0)} className={inputClass} />
          </Field>
          <Field label="Intervallo tagliando (km)" icon={Wrench}>
            <input type="text" inputMode="numeric" value={form.service_interval_km} onChange={(e) => update('service_interval_km', parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 20000)} className={inputClass} />
          </Field>
          <Field label="Km ultimo tagliando" icon={Wrench}>
            <input type="text" inputMode="numeric" value={form.last_service_km} onChange={(e) => update('last_service_km', parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0)} className={inputClass} />
          </Field>
          <Field label="Data ultimo tagliando" icon={CalendarDays}>
            <input type="date" value={form.last_service_date ?? ''} onChange={(e) => update('last_service_date', e.target.value)} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <ShieldCheck size={14} className="text-blue-900" /> Documenti e scadenze
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Scadenza assicurazione" icon={ShieldCheck}>
            <input type="date" value={form.insurance_expiry ?? ''} onChange={(e) => update('insurance_expiry', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Compagnia assicurativa" icon={ShieldCheck}>
            {customInsurance ? (
              <div className="flex gap-1">
                <input autoFocus value={form.insurance_company ?? ''} onChange={(e) => update('insurance_company', e.target.value.toUpperCase())} placeholder="Inserisci compagnia" className={selectClass} />
                <button type="button" onClick={() => { setCustomInsurance(false); update('insurance_company', ''); }} className="flex items-center justify-center px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <select value={form.insurance_company ?? ''} onChange={(e) => { const val = e.target.value; if (val === '__custom') { setCustomInsurance(true); update('insurance_company', ''); } else update('insurance_company', val); }} className={selectClass}>
                <option value="">Compagnia</option>
                {INSURANCE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__custom">Altro...</option>
              </select>
            )}
          </Field>
          <Field label="Scadenza bollo" icon={ReceiptText}>
            <input type="date" value={form.tax_expiry ?? ''} onChange={(e) => update('tax_expiry', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Scadenza revisione" icon={ClipboardCheck}>
            <input type="date" value={form.inspection_expiry ?? ''} onChange={(e) => update('inspection_expiry', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Revisione bombole gas (10 anni)" icon={Flame}>
            <input type="date" value={form.gas_cylinders_inspection_expiry ?? ''} onChange={(e) => update('gas_cylinders_inspection_expiry', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Revisione metano" icon={Flame}>
            <input type="date" value={form.methane_inspection_expiry ?? ''} onChange={(e) => update('methane_inspection_expiry', e.target.value)} className={inputClass} />
          </Field>
        </div>
      </section>

      <Field label="Note" icon={StickyNote}>
        <textarea value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} rows={2} placeholder="Aggiungi una nota..." className={`${inputClass} resize-none`} />
      </Field>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <Icon size={13} className="text-slate-400" /> {label}
      </span>
      {children}
    </label>
  );
}
