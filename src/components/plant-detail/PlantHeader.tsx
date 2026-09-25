import { Zap, Calendar, Phone, Mail, MapPin, Sun, type LucideIcon } from 'lucide-react';
import type { Plant } from '@/lib/types';

export function InfoChip({
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

export function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-slate-400 text-xs mb-0.5">{label}</div>
      <div className="text-slate-900 font-medium">{value || 'N/D'}</div>
    </div>
  );
}

export function PlantHeader({ plant }: { plant: Plant }) {
  return (
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
          <InfoChip icon={Zap} label="Potenza" value={`${plant.total_power_kw} kWh`} />
        )}
        {plant.installation_date && (
          <InfoChip icon={Calendar} label="Installazione" value={plant.installation_date.slice(0, 10)} />
        )}
        {plant.phone && <InfoChip icon={Phone} label="Telefono" value={plant.phone} />}
        {plant.email && <InfoChip icon={Mail} label="Email" value={plant.email} truncate />}
      </div>
    </div>
  );
}

export function PlantTechnicalDetails({ plant }: { plant: Plant }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
      <h2 className="font-semibold text-slate-900 mb-4">Dettagli Tecnici</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <DetailRow label="Codice Fiscale / P.IVA" value={plant.fiscal_or_vat} />
        <DetailRow label="Città / Paese" value={plant.city} />
        <DetailRow label="Provincia" value={plant.province} />
        <DetailRow label="Regione" value={plant.region} />
        <DetailRow label="POD" value={plant.pod} />
        <DetailRow label="Codice CENSIMP" value={plant.censimp_code} />
        <DetailRow label="Potenza Totale" value={plant.total_power_kw != null ? `${plant.total_power_kw} kWh` : null} />
        <DetailRow label="Pannelli" value={plant.panel_brand_model} />
        <DetailRow label="Data Installazione" value={plant.installation_date ? plant.installation_date.slice(0, 10) : null} />
        <DetailRow label="Note" value={plant.notes} />
      </div>
    </div>
  );
}
