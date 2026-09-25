import { useState, useEffect, useCallback } from 'react';
import { Car, Truck, Bike, Plus, Trash2, FileText, Loader2, ChevronDown, AlertTriangle, Calendar, Wrench, Shield, Receipt, Flame, FileDown } from 'lucide-react';
import type { Vehicle, VehicleInsert } from '@/lib/types';
import { fetchVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/lib/api';
import { DetailItem, VehicleEditCard, VehicleFormModal, formatMonthYear } from './vehicle-forms';
import { generateVehiclePdf } from '@/lib/pdf';
import { saveAs } from 'file-saver';

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
  const taxDays = daysUntil(v.tax_expiry);
  const kmSinceService = v.mileage_km - v.last_service_km;
  const kmUntilService = v.service_interval_km - kmSinceService;

  if (insDays !== null) {
    if (insDays < 0) alerts.push({ level: 'danger', label: 'Assicurazione scaduta' });
    else if (insDays <= 30) alerts.push({ level: 'warning', label: `Assicurazione in ${insDays}g` });
  }
  if (taxDays !== null) {
    if (taxDays < 0) alerts.push({ level: 'danger', label: 'Bollo scaduto' });
    else if (taxDays <= 30) alerts.push({ level: 'warning', label: `Bollo in ${taxDays}g` });
  }
  if (inspDays !== null) {
    if (inspDays < 0) alerts.push({ level: 'danger', label: 'Revisione scaduta' });
    else if (inspDays <= 30) alerts.push({ level: 'warning', label: `Revisione in ${inspDays}g` });
  }
  const gasDays = daysUntil(v.gas_cylinders_inspection_expiry);
  if (gasDays !== null) {
    if (gasDays < 0) alerts.push({ level: 'danger', label: 'Revisione bombole gas scaduta' });
    else if (gasDays <= 30) alerts.push({ level: 'warning', label: `Bombole gas in ${gasDays}g` });
  }
  const methaneDays = daysUntil(v.methane_inspection_expiry);
  if (methaneDays !== null) {
    if (methaneDays < 0) alerts.push({ level: 'danger', label: 'Revisione metano scaduta' });
    else if (methaneDays <= 30) alerts.push({ level: 'warning', label: `Metano in ${methaneDays}g` });
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
    try { const data = await fetchVehicles(); setVehicles(data); }
    catch { /* skip */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  const alertCount = vehicles.filter((v) => getOverallStatus(v) !== 'ok').length;

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto pb-24">
      <div className="bg-blue-900 text-white rounded-2xl p-5 lg:p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-500/20 text-red-300">PARCO AUTOMEZZI</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold mb-1">Gestione Automezzi</h1>
            <div className="text-slate-400 text-sm">
              {vehicles.length} veicoli registrati
              {alertCount > 0 && <span className="text-amber-400 ml-2">- {alertCount} con interventi da fare</span>}
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
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Aggiungi Veicolo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <Car className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-slate-500 text-sm">Nessun veicolo registrato.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} expanded={expandedId === v.id}
              onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
              onUpdate={async (input) => { await updateVehicle(v.id, input); loadVehicles(); }}
              onDelete={async () => { await deleteVehicle(v.id); loadVehicles(); }}
            />
          ))}
        </div>
      )}

      {showForm && (
        <VehicleFormModal onClose={() => setShowForm(false)}
          onSave={async (input) => { await createVehicle(input); loadVehicles(); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function VehicleCard({
  vehicle, expanded, onToggle, onUpdate, onDelete,
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
  const Icon = vehicle.type === 'Furgone' ? Truck : vehicle.type === 'Motoveicolo' ? Bike : Car;

  const statusConfig = {
    ok: { dot: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    warning: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    danger: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  };
  const cfg = statusConfig[status];

  if (editing) {
    return <VehicleEditCard vehicle={vehicle} onCancel={() => setEditing(false)}
      onSave={async (input) => { await onUpdate(input); setEditing(false); }} />;
  }

  if (confirmDel) {
    return (
      <div className="bg-white rounded-2xl border border-red-400 p-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-700">Eliminare {vehicle.plate || 'questo veicolo'}?</span>
        <div className="flex gap-2">
          <button onClick={async () => { await onDelete(); }}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Elimina</button>
          <button onClick={() => setConfirmDel(false)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">Annulla</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border ${cfg.border} p-4`}>
      <div className="flex items-center gap-3">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
          vehicle.type === 'Furgone' ? 'bg-blue-100 text-blue-700' : vehicle.type === 'Motoveicolo' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
        }`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm uppercase tracking-wide">{vehicle.plate || 'SENZA TARGA'}</span>
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} flex-shrink-0`} title={status === 'ok' ? 'Tutto a posto' : 'Interventi necessari'} />
          </div>
          <div className="text-xs text-slate-500 truncate">
            {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'N/D'} - {vehicle.mileage_km.toLocaleString('it-IT')} km
          </div>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <AlertTriangle size={16} className={cfg.text} />
            <span className={`text-xs font-medium ${cfg.text}`}>{alerts.length}</span>
          </div>
        )}
        <button onClick={onToggle}
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
          <ChevronDown size={18} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {alerts.map((a, i) => (
            <span key={i} className={`text-[10px] font-medium px-2 py-1 rounded-full ${
              a.level === 'danger' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>{a.label}</span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailItem icon={Wrench} label="Tagliando" value={
              vehicle.last_service_km > 0 ? `${(vehicle.mileage_km - vehicle.last_service_km).toLocaleString('it-IT')} km fa` : 'Mai fatto'
            } />
            <DetailItem icon={Calendar} label="Ultimo tagliando" value={formatDate(vehicle.last_service_date)} />
            <DetailItem icon={Shield} label="Assicurazione" value={formatDate(vehicle.insurance_expiry)} />
            <DetailItem icon={Receipt} label="Bollo" value={formatMonthYear(vehicle.tax_expiry)} />
            <DetailItem icon={Calendar} label="Scad. revisione" value={formatDate(vehicle.inspection_expiry)} />
            <DetailItem icon={Flame} label="Revisione bombole gas" value={formatDate(vehicle.gas_cylinders_inspection_expiry)} />
            <DetailItem icon={Flame} label="Revisione metano" value={formatDate(vehicle.methane_inspection_expiry)} />
            <DetailItem icon={Shield} label="Compagnia" value={vehicle.insurance_company || 'N/D'} />
            <DetailItem icon={Shield} label="Premio assicurativo" value={vehicle.insurance_premium != null ? `€ ${vehicle.insurance_premium.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : 'N/D'} />
            <DetailItem icon={Wrench} label="Intervallo tagliando" value={`${vehicle.service_interval_km.toLocaleString('it-IT')} km`} />
            <DetailItem icon={Car} label="Tipo" value={vehicle.type} />
          </div>
          {vehicle.notes && <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">{vehicle.notes}</div>}
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2 rounded-lg transition-colors">
              <FileText size={16} /> Modifica
            </button>
            <button onClick={async () => {
              try {
                const blob = await generateVehiclePdf(vehicle);
                saveAs(blob, `Veicolo_${vehicle.plate || 'senza_targa'}.pdf`);
              } catch { /* skip */ }
            }}
              className="flex items-center justify-center gap-1.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium py-2 rounded-lg transition-colors">
              <FileDown size={16} /> PDF
            </button>
            <button onClick={() => setConfirmDel(true)}
              className="flex items-center justify-center gap-1.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium py-2 rounded-lg transition-colors">
              <Trash2 size={16} /> Elimina
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
