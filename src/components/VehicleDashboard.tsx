import { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Truck,
  Plus,
  X,
  Trash2,
  FileText,
  Loader2,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Wrench,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import type { Vehicle, VehicleInsert, VehicleType } from '@/lib/types';
import { fetchVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/lib/api';

const VEHICLE_TYPES: VehicleType[] = ['Auto', 'Furgone'];

const VEHICLE_BRANDS = [
  'FIAT', 'VOLKSWAGEN', 'FORD', 'RENAULT', 'CITROEN', 'PEUGEOT',
  'OPEL', 'MERCEDES', 'BMW', 'AUDI', 'TOYOTA', 'HYUNDAI',
  'KIA', 'NISSAN', 'SKODA', 'SEAT', 'IVECO', 'FORD TRANSIT',
] as const;

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/D';
  return dateStr.slice(0, 10);
}

interface VehicleAlert {
  level: 'ok' | 'warning' | 'danger';
  label: string;
}

function getVehicleAlerts(v: Vehicle): VehicleAlert[] {
  const alerts: VehicleAlert[] = [];
  const insDays = daysUntil(v.insurance_expiry);
  const inspDays = daysUntil(v.inspection_expiry);
  const kmSinceService = v.mileage_km - v.last_service_km;
  const kmUntilService = v.service_interval_km - kmSinceService;

  if (insDays !== null) {
    if (insDays < 0) alerts.push({ level: 'danger', label: 'Assicurazione scaduta' });
    else if (insDays <= 30) alerts.push({ level: 'warning', label: `Assicurazione in ${insDays}g` });
  }
  if (inspDays !== null) {
    if (inspDays < 0) alerts.push({ level: 'danger', label: 'Revisione scaduta' });
    else if (inspDays <= 30) alerts.push({ level: 'warning', label: `Revisione in ${inspDays}g` });
  }
  if (kmUntilService !== null && kmUntilService <= 0) {
    alerts.push({ level: 'danger', label: 'Tagliando necessario' });
  } else if (kmUntilService !== null && kmUntilService <= 2000) {
    alerts.push({ level: 'warning', label: `Tagliando tra ${kmUntilService} km` });
  }
  return alerts;
}

function getOverallStatus(v: Vehicle): 'ok' | 'warning' | 'danger' {
  const alerts = getVehicleAlerts(v);
  if (alerts.some((a) => a.level === 'danger')) return 'danger';
  if (alerts.some((a) => a.level === 'warning')) return 'warning';
  return 'ok';
}

export function VehicleDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVehicles();
      setVehicles(data);
    } catch {
      // skip
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const alertCount = vehicles.filter((v) => getOverallStatus(v) !== 'ok').length;

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-24">
      <div className="bg-blue-900 text-white rounded-2xl p-5 lg:p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-500/20 text-red-300">
                PARCO AUTOMEZZI
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold mb-1">Gestione Automezzi</h1>
            <div className="text-slate-400 text-sm">
              {vehicles.length} veicoli registrati
              {alertCount > 0 && (
                <span className="text-amber-400 ml-2">
                  - {alertCount} con interventi da fare
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-500 rounded-xl">
              <Car className="text-white" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900">Veicoli</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Aggiungi Veicolo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <Car className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-slate-500 text-sm">Nessun veicolo registrato.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              expanded={expandedId === v.id}
              onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
              onUpdate={async (input) => {
                await updateVehicle(v.id, input);
                loadVehicles();
              }}
              onDelete={async () => {
                await deleteVehicle(v.id);
                loadVehicles();
              }}
            />
          ))}
        </div>
      )}

      {showForm && (
        <VehicleFormModal
          onClose={() => setShowForm(false)}
          onSave={async (input) => {
            await createVehicle(input);
            loadVehicles();
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function VehicleCard({
  vehicle,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
}: {
  vehicle: Vehicle;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (input: Partial<VehicleInsert>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const status = getOverallStatus(vehicle);
  const alerts = getVehicleAlerts(vehicle);
  const Icon = vehicle.type === 'Furgone' ? Truck : Car;

  const statusConfig = {
    ok: { dot: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    warning: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    danger: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  };
  const cfg = statusConfig[status];

  if (editing) {
    return (
      <VehicleEditCard
        vehicle={vehicle}
        onCancel={() => setEditing(false)}
        onSave={async (input) => {
          await onUpdate(input);
          setEditing(false);
        }}
      />
    );
  }

  if (confirmDel) {
    return (
      <div className="bg-white rounded-2xl border border-red-400 p-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-700">Eliminare {vehicle.plate || 'questo veicolo'}?</span>
        <div className="flex gap-2">
          <button
            onClick={async () => { await onDelete(); }}
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

  return (
    <div className={`bg-white rounded-2xl border ${cfg.border} p-4`}>
      <div className="flex items-center gap-3">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
          vehicle.type === 'Furgone' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
        }`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm uppercase tracking-wide">
              {vehicle.plate || 'SENZA TARGA'}
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} flex-shrink-0`} title={status === 'ok' ? 'Tutto a posto' : 'Interventi necessari'} />
          </div>
          <div className="text-xs text-slate-500 truncate">
            {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'N/D'}
            {' - '}
            {vehicle.mileage_km.toLocaleString('it-IT')} km
          </div>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <AlertTriangle size={16} className={cfg.text} />
            <span className={`text-xs font-medium ${cfg.text}`}>{alerts.length}</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
        >
          <ChevronDown size={18} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {alerts.map((a, i) => (
            <span
              key={i}
              className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                a.level === 'danger'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {a.label}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailItem icon={Wrench} label="Tagliando" value={
              vehicle.last_service_km > 0
                ? `${(vehicle.mileage_km - vehicle.last_service_km).toLocaleString('it-IT')} km fa`
                : 'Mai fatto'
            } />
            <DetailItem icon={Calendar} label="Ultimo tagliando" value={formatDate(vehicle.last_service_date)} />
            <DetailItem icon={Shield} label="Scad. assicurazione" value={formatDate(vehicle.insurance_expiry)} />
            <DetailItem icon={Calendar} label="Scad. revisione" value={formatDate(vehicle.inspection_expiry)} />
            <DetailItem icon={Wrench} label="Intervallo tagliando" value={`${vehicle.service_interval_km.toLocaleString('it-IT')} km`} />
            <DetailItem icon={Car} label="Tipo" value={vehicle.type} />
          </div>
          {vehicle.notes && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
              {vehicle.notes}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              <FileText size={16} />
              Modifica
            </button>
            <button
              onClick={() => setConfirmDel(true)}
              className="flex items-center justify-center gap-1.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium py-2 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              Elimina
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
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

function VehicleEditCard({
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
    inspection_expiry: vehicle.inspection_expiry ?? '',
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
        inspection_expiry: form.inspection_expiry || null,
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Annulla
        </button>
      </div>
    </div>
  );
}

function VehicleFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: VehicleInsert) => Promise<void>;
}) {
  const [form, setForm] = useState<VehicleInsert>({
    type: 'Auto',
    plate: '',
    brand: '',
    model: '',
    mileage_km: 0,
    service_interval_km: 20000,
    last_service_km: 0,
    last_service_date: '',
    insurance_expiry: '',
    inspection_expiry: '',
    notes: '',
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
        inspection_expiry: form.inspection_expiry || null,
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
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
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
              const Icon = t === 'Furgone' ? Truck : Car;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => update('type', t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.type === t
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={16} />
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Targa</label>
          <input
            value={form.plate}
            onChange={(e) => update('plate', e.target.value.toUpperCase())}
            placeholder="es. AB123CD"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Marca</label>
          <select
            value={form.brand}
            onChange={(e) => update('brand', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="">— Seleziona —</option>
            {VEHICLE_BRANDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
            <option value="__custom">Altro...</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Modello</label>
          <input
            value={form.model}
            onChange={(e) => update('model', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
      </div>
      {form.brand === '__custom' && (
        <input
          value=""
          onChange={(e) => update('brand', e.target.value.toUpperCase())}
          placeholder="Inserisci marca"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Chilometri Attuali</label>
          <input
            type="number"
            min="0"
            value={form.mileage_km}
            onChange={(e) => update('mileage_km', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Intervallo Tagliando (km)</label>
          <input
            type="number"
            min="1000"
            step="1000"
            value={form.service_interval_km}
            onChange={(e) => update('service_interval_km', parseInt(e.target.value) || 20000)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Km Ultimo Tagliando</label>
          <input
            type="number"
            min="0"
            value={form.last_service_km}
            onChange={(e) => update('last_service_km', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Data Ultimo Tagliando</label>
          <input
            type="date"
            value={form.last_service_date ?? ''}
            onChange={(e) => update('last_service_date', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Scadenza Assicurazione</label>
          <input
            type="date"
            value={form.insurance_expiry ?? ''}
            onChange={(e) => update('insurance_expiry', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Scadenza Revisione</label>
          <input
            type="date"
            value={form.inspection_expiry ?? ''}
            onChange={(e) => update('inspection_expiry', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Note</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => update('notes', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
      </div>
    </>
  );
}
