import type { PlantInsert } from '@/lib/types';

export const emptyPlantForm: PlantInsert = {
  owner_type: 'Privato',
  owner_name: '',
  fiscal_or_vat: '',
  address: '',
  city: '',
  province: '',
  region: '',
  phone: '',
  email: '',
  pod: '',
  censimp_code: '',
  total_power_kw: null,
  panel_brand_model: '',
  inverter_brand_model: '',
  inverter_brand: '',
  inverter_model: '',
  inverter_code: '',
  storage_power_kw: null,
  storage_brand: '',
  storage_model: '',
  storage_code: '',
  charger_brand: '',
  charger_model: '',
  charger_code: '',
  installation_date: null,
  notes: '',
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  upper?: boolean;
}

export function Field({ label, value, onChange, required, type = 'text', upper = false }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
        required={required}
        className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent ${upper ? 'uppercase' : ''}`}
      />
    </div>
  );
}
