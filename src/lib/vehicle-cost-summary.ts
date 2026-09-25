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
export function calculateVehicleCosts(vehicles: Vehicle[], year: number): VehicleCostSummary {
  const inYear = (date: string | null) => date?.slice(0, 4) === String(year);
  const amount = (value: number | null) => value == null ? 0 : Number(value);
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
