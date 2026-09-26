import { useState, useEffect, useCallback } from 'react';
import { Car, Truck, Bike, Plus, Trash2, FileText, Loader2, ChevronDown, AlertTriangle, Calendar, Wrench, Shield, Receipt, Flame, FileDown, User, Building2, RefreshCw, StickyNote } from 'lucide-react';
import type { Vehicle, VehicleInsert } from '@/lib/types';
import { fetchVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/lib/api';
import { DetailItem, VehicleEditCard, VehicleFormModal, formatMonthYear } from './vehicle-forms';
import { generateVehiclePdf } from '@/lib/pdf';
import { saveAs } from 'file-saver';
import { calculateVehicleCosts, calculateRegisteredVehicleCosts } from '@/lib/vehicle-cost-summary';

function daysUntil(dateStr: string | null, monthOnly = false): number | null {
  if (!dateStr) return null;
  const target = monthOnly ? new Date(Number(dateStr.slice(0, 4)), Number(dateStr.slice(5, 7)), 0) : new Date(`${dateStr}T00:00:00`);
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
  const inspDays = daysUntil(v.inspection_expiry, true);
  const taxDays = daysUntil(v.tax_expiry, true);
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
  const gasDays = daysUntil(v.gas_cylinders_inspection_expiry, true);
  if (gasDays !== null) {
    if (gasDays < 0) alerts.push({ level: 'danger', label: 'Revisione bombole gas scaduta' });
    else if (gasDays <= 30) alerts.push({ level: 'warning', label: `Bombole gas in ${gasDays}g` });
  }
  const methaneDays = daysUntil(v.methane_inspection_expiry, true);
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const report = calculateVehicleCosts(vehicles, reportYear);
  const registered = calculateRegisteredVehicleCosts(vehicles);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVehicles();
      setVehicles(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Impossibile aggiornare gli automezzi.');
    } finally {
      setLoading(false);
    }
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

      {loadError && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Errore caricamento automezzi: {loadError}
          <button type="button" onClick={() => { void loadVehicles(); }}
            className="ml-3 underline">Riprova</button>
        </div>
      )}

      <section aria-label="Totale spese automezzi registrate" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-slate-900">Spese di gestione registrate</h2>
            <p className="text-xs text-slate-600">Ultimi importi inseriti nelle anagrafiche: si aggiornano al salvataggio, indipendentemente dalle scadenze.</p>
          </div>
          <button type="button" onClick={() => { void loadVehicles(); }} aria-label="Aggiorna rendiconto automezzi"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100">
            <RefreshCw size={14} /> Aggiorna
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            ['Assicurazioni veicoli', registered.insurances],
            ['Revisioni', registered.inspections],
            ['Bolli', registered.taxes],
            ['Tagliandi', registered.services],
          ] as const).map(([label, amount]) => (
            <div key={label} className="rounded-xl bg-white p-3">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="mt-1 font-semibold text-slate-900">{amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-200 pt-3 font-bold text-emerald-900">
          <span>Totale importi registrati</span>
          <span>{registered.total.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
        </div>
        <p className="mt-2 text-xs text-slate-600">Fotografia degli ultimi costi per veicolo, non somma delle fatture pagate nell'anno.</p>
      </section>

      <section aria-label="Rendiconto annuale automezzi" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-slate-900">Riepilogo per anno di riferimento</h2>
          <label className="flex items-center gap-2 text-sm text-slate-700">Anno
            <select aria-label="Anno rendiconto automezzi" value={reportYear}
              onChange={(e) => setReportYear(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2">
              {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i)
                .map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            ['Assicurazioni veicoli', report.insurances],
            ['Revisioni', report.inspections],
            ['Bolli', report.taxes],
            ['Tagliandi', report.services],
          ] as const).map(([label, amount]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="mt-1 font-semibold text-slate-900">{amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 font-bold text-blue-900">
          <span>Totale {reportYear}</span>
          <span>{report.total.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Questa vista include solo i costi con data di riferimento nell'anno selezionato:
          scadenza per polizze, bolli e revisioni; ultimo intervento per tagliandi.
          Un importo appena inserito può non comparire qui se la scadenza è in un altro anno.
          Lo storico effettivo dei pagamenti richiederà registrazioni di spesa datate.
        </p>
      </section>

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
              onUpdate={async (input) => {
                const saved = await updateVehicle(v.id, input);
                setVehicles((prev) => prev.map((row) => row.id === v.id ? saved : row));
              }}
              onDelete={async () => {
                await deleteVehicle(v.id);
                setVehicles((prev) => prev.filter((row) => row.id !== v.id));
              }}
            />
          ))}
        </div>
      )}

      {showForm && (
        <VehicleFormModal onClose={() => setShowForm(false)}
          onSave={async (input) => {
            const saved = await createVehicle(input);
            setVehicles((prev) => [saved, ...prev]);
            setShowForm(false);
          }}
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
            <span title={vehicle.owner_type === 'Privato' ? 'Privato' : 'Aziendale'} aria-label={vehicle.owner_type === 'Privato' ? 'Veicolo privato' : 'Veicolo aziendale'}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
              {vehicle.owner_type === 'Privato' ? <User size={12} /> : <Building2 size={12} />}
              {vehicle.owner_type === 'Privato' ? 'Privato' : 'Aziendale'}
            </span>
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

      {vehicle.notes?.trim() && (
        <div aria-label={`Note veicolo ${vehicle.plate || 'senza targa'}`}
          className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-slate-800">
          <StickyNote size={16} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-900">Note</p>
            <p className="whitespace-pre-wrap break-words">{vehicle.notes}</p>
          </div>
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
            <DetailItem icon={Calendar} label="Scad. revisione" value={formatMonthYear(vehicle.inspection_expiry)} />
            <DetailItem icon={Flame} label="Revisione bombole gas" value={formatMonthYear(vehicle.gas_cylinders_inspection_expiry)} />
            <DetailItem icon={Flame} label="Revisione metano" value={formatMonthYear(vehicle.methane_inspection_expiry)} />
            <DetailItem icon={Shield} label="Compagnia" value={vehicle.insurance_company || 'N/D'} />
            <DetailItem icon={Shield} label="Premio assicurativo" value={vehicle.insurance_premium != null ? `€ ${vehicle.insurance_premium.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : 'N/D'} />
            <DetailItem icon={vehicle.owner_type === 'Privato' ? User : Building2} label="Intestazione" value={vehicle.owner_type === 'Privato' ? 'Privato' : 'Aziendale'} />
            <DetailItem icon={Shield} label="Garanzie" value={vehicle.insurance_categories?.join(' + ') || 'N/D'} />
            <DetailItem icon={Receipt} label="Costo bollo" value={vehicle.tax_cost != null ? `€ ${Number(vehicle.tax_cost).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : 'N/D'} />
            <DetailItem icon={Calendar} label="Costo revisione" value={vehicle.inspection_cost != null ? `€ ${Number(vehicle.inspection_cost).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : 'N/D'} />
            <DetailItem icon={Wrench} label="Costo tagliando" value={vehicle.service_cost != null ? `€ ${Number(vehicle.service_cost).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : 'N/D'} />
            <DetailItem icon={Wrench} label="Intervallo tagliando" value={`${vehicle.service_interval_km.toLocaleString('it-IT')} km`} />
            <DetailItem icon={Car} label="Tipo" value={vehicle.type} />
          </div>
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
