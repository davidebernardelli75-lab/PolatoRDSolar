import type { Insurance, Vehicle } from './types';

export interface CostSummary {
  insurances: number;
  services: number;
  taxes: number;
  inspections: number;
  total: number;
}

// Amounts are associated with the reference date stored on each record.
// These are recorded or expected amounts, not a ledger of payments.
export function calculateCosts(vehicles: Vehicle[], policies: Insurance[], year: number): CostSummary {
  const inYear = (date: string | null) => date?.slice(0, 4) === String(year);
  const amount = (value: number | null) => value == null ? 0 : Number(value);
  const insurances = vehicles.reduce((sum, v) => sum + (inYear(v.insurance_expiry) ? amount(v.insurance_premium) : 0), 0)
    + policies.reduce((sum, p) => sum + (inYear(p.expiry_date) ? amount(p.premium_amount) : 0), 0);
  const services = vehicles.reduce((sum, v) => sum + (inYear(v.last_service_date) ? amount(v.service_cost) : 0), 0);
  const taxes = vehicles.reduce((sum, v) => sum + (inYear(v.tax_expiry) ? amount(v.tax_cost) : 0), 0);
  const inspections = vehicles.reduce((sum, v) => sum + (inYear(v.inspection_expiry) ? amount(v.inspection_cost) : 0), 0);
  return { insurances, services, taxes, inspections, total: insurances + services + taxes + inspections };
}
