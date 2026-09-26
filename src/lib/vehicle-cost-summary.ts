import type { Vehicle } from './types';

export interface VehicleCostSummary {
  insurances: number;
  inspections: number;
  taxes: number;
  services: number;
  total: number;
}

// A single registered amount per vehicle, associated with its reference year.
// These values represent recorded/expected costs, not paid expenses or history.
// Live snapshot: the most recent amounts entered in each vehicle's form.
// Do not filter by insurance/tax/inspection expiry: a cost entered today may
// refer to a policy or inspection whose *expiry* is in another year.
export function calculateRegisteredVehicleCosts(vehicles: Vehicle[]): VehicleCostSummary {
  const amount = (value: number | null) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };
  const insurances = vehicles.reduce((sum, v) => sum + amount(v.insurance_premium), 0);
  const inspections = vehicles.reduce((sum, v) => sum + amount(v.inspection_cost), 0);
  const taxes = vehicles.reduce((sum, v) => sum + amount(v.tax_cost), 0);
  const services = vehicles.reduce((sum, v) => sum + amount(v.service_cost), 0);
  return { insurances, inspections, taxes, services, total: insurances + inspections + taxes + services };
}

// Reference-year breakdown only. It is NOT a payment ledger; historic paid
// expenses need a dated vehicle_expenses table to avoid overwriting old values.
export function calculateVehicleCosts(vehicles: Vehicle[], year: number): VehicleCostSummary {
  const inYear = (date: string | null) => date?.slice(0, 4) === String(year);
  const amount = (value: number | null) => { const parsed = Number(value ?? 0); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; };
  const insurances = vehicles.reduce((sum, v) =>
    sum + (inYear(v.insurance_expiry) ? amount(v.insurance_premium) : 0), 0);
  const inspections = vehicles.reduce((sum, v) =>
    sum + (inYear(v.inspection_expiry) ? amount(v.inspection_cost) : 0), 0);
  const taxes = vehicles.reduce((sum, v) =>
    sum + (inYear(v.tax_expiry) ? amount(v.tax_cost) : 0), 0);
  const services = vehicles.reduce((sum, v) =>
    sum + (inYear(v.last_service_date) ? amount(v.service_cost) : 0), 0);
  return { insurances, inspections, taxes, services,
    total: insurances + inspections + taxes + services };
}
