export type OwnerType = 'Privato' | 'Azienda';

export interface Plant {
  id: string;
  owner_type: OwnerType;
  owner_name: string;
  fiscal_or_vat: string | null;
  address: string;
  city: string | null;
  province: string | null;
  region: string | null;
  phone: string | null;
  email: string | null;
  pod: string | null;
  censimp_code: string | null;
  total_power_kw: number | null;
  panel_brand_model: string | null;
  inverter_brand_model: string | null;
  inverter_brand: string | null;
  inverter_model: string | null;
  inverter_code: string | null;
  storage_power_kw: number | null;
  storage_brand: string | null;
  storage_model: string | null;
  storage_code: string | null;
  charger_brand: string | null;
  charger_model: string | null;
  charger_code: string | null;
  installation_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Panel {
  id: string;
  plant_id: string;
  serial_number: string;
  position_label: string | null;
  notes: string | null;
  brand: string | null;
  power_wp: number | null;
  created_at: string;
}

export interface PanelPhoto {
  id: string;
  plant_id: string;
  panel_id: string | null;
  storage_path: string;
  file_name: string;
  content_type: string;
  file_size: number;
  created_at: string;
}

export interface PlantWithRelations extends Plant {
  panels: Panel[];
  photos: PanelPhoto[];
}

export type RoadmapCategory = 'Burocrazia' | 'Funzionale';

export interface RoadmapTask {
  id: string;
  plant_id: string;
  category: RoadmapCategory;
  label: string;
  sort_order: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlantInverter {
  id: string;
  plant_id: string;
  brand: string;
  model: string;
  code: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlantStorage {
  id: string;
  plant_id: string;
  brand: string;
  model: string;
  code: string;
  power_kw: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlantCharger {
  id: string;
  plant_id: string;
  brand: string;
  model: string;
  code: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type PlantInverterInsert = Omit<PlantInverter, 'id' | 'created_at' | 'updated_at'>;
export type PlantStorageInsert = Omit<PlantStorage, 'id' | 'created_at' | 'updated_at'>;
export type PlantChargerInsert = Omit<PlantCharger, 'id' | 'created_at' | 'updated_at'>;

export interface PlantPowerMeter {
  id: string;
  plant_id: string;
  brand: string;
  model: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type PlantPowerMeterInsert = Omit<PlantPowerMeter, 'id' | 'created_at' | 'updated_at'>;

export type EquipmentCategory = 'inverter' | 'storage';

export interface EquipmentCatalogEntry {
  id: string;
  category: EquipmentCategory;
  brand: string;
  model: string | null;
  created_at: string;
}

export type VehicleType = 'Auto' | 'Furgone' | 'Motoveicolo';

export interface Vehicle {
  id: string;
  owner_type: OwnerType;
  type: VehicleType;
  plate: string;
  brand: string;
  model: string;
  mileage_km: number;
  service_interval_km: number;
  last_service_km: number;
  last_service_date: string | null;
  insurance_expiry: string | null;
  insurance_company: string | null;
  insurance_premium: number | null;
  insurance_categories: string[];
  tax_cost: number | null;
  inspection_cost: number | null;
  service_cost: number | null;
  inspection_expiry: string | null;
  gas_cylinders_inspection_expiry: string | null;
  methane_inspection_expiry: string | null;
  tax_expiry: string | null;
  vehicle_category: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type VehicleInsert = Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>;

export interface Insurance {
  id: string;
  category: string;
  provider: string;
  insurance_type: 'Privata' | 'Aziendale' | null;
  policy_number: string | null;
  insured_item: string | null;
  premium_amount: number | null;
  start_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type InsuranceInsert = Omit<Insurance, 'id' | 'created_at' | 'updated_at'>;

export type PlantInsert = Omit<Plant, 'id' | 'created_at' | 'updated_at'>;
export type PlantUpdate = Partial<PlantInsert>;
export type PanelInsert = Omit<Panel, 'id' | 'created_at'>;
export type PanelPhotoInsert = Omit<PanelPhoto, 'id' | 'created_at'>;


export type QuoteStatus = 'DA VERIFICARE' | 'DA GESTIRE' | 'IN PREPARAZIONE' | 'INVIATO' | 'ACCETTATO' | 'RIFIUTATO' | 'SOSPESO';

export interface QuoteRequest {
  id: string;
  progressive_number: number;
  series: string;
  quote_year: number;
  request_date: string | null;
  source: string | null;
  client: string;
  client_email: string | null;
  client_phone: string | null;
  site_visit_at: string | null;
  quote_type: string | null;
  value_ex_vat: number | null;
  status: QuoteStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type QuoteRequestInsert = Omit<QuoteRequest, 'id' | 'created_at' | 'updated_at'>;

export interface QuoteRequestFile {
  id: string;
  quote_request_id: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  file_size: number;
  created_at: string;
}


export type WorkReportStatus = 'BOZZA' | 'DA_VERIFICARE' | 'APPROVATO' | 'DA_CORREGGERE';

export interface WorkReport {
  id: string;
  plant_id: string | null;
  client_reference: string;
  quote_request_id: string | null;
  report_date: string;
  team_name: string;
  work_description: string | null;
  notes: string | null;
  status: WorkReportStatus;
  created_by: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkReportWorker {
  id: string;
  report_id: string;
  worker_name: string;
  hours: number;
  rate_type: string;
  notes: string | null;
  created_at: string;
}

export interface WorkReportMaterial {
  id: string;
  report_id: string;
  item_code: string | null;
  description: string;
  quantity: number;
  unit: string;
  notes: string | null;
  created_at: string;
}

export type WorkReportInsert = Omit<WorkReport, 'id' | 'created_by' | 'submitted_at' | 'approved_by' | 'approved_at' | 'created_at' | 'updated_at'>;
export type WorkReportWorkerInput = Pick<WorkReportWorker, 'worker_name' | 'hours' | 'rate_type' | 'notes'>;
export type WorkReportMaterialInput = Pick<WorkReportMaterial, 'item_code' | 'description' | 'quantity' | 'unit' | 'notes'>;

export interface WorkReportMaterialCatalogEntry {
  id: string;
  description: string;
  normalized_description: string;
  default_unit: string;
  usage_count: number;
  last_used_at: string | null;
}

export interface WorkReportWorkerCatalogEntry {
  id: string;
  worker_name: string;
  normalized_worker_name: string;
  usage_count: number;
  last_used_at: string | null;
}

export interface WorkReportMaterialCostDefault {
  material_catalog_id: string;
  unit_price: number;
}

export interface WorkReportLaborRateDefault {
  worker_catalog_id: string;
  rate_type: string;
  hourly_rate: number;
}

export interface WorkReportMaterialCost {
  report_material_id: string;
  unit_price: number;
}

export interface WorkReportWorkerCost {
  report_worker_id: string;
  hourly_rate: number;
}

export interface WorkReportAdminSummary {
  report_id: string;
  material_markup_percent: number;
}

export interface WorkReportSiteOption {
  quote_request_id: string;
  progressive_number: number;
  series: string;
  quote_year: number;
  client: string;
  site_reference: string;
  quote_status: QuoteStatus;
  report_count: number;
}

export interface PlantQuoteLink {
  plant_id: string;
  quote_request_id: string;
}


export interface CalendarEventCategory {
  id: string;
  label: string;
  normalized_label: string;
  color_key: string;
  icon_key: string;
  sort_order: number;
  is_custom: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  category_id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  all_day: boolean;
  notes: string | null;
  reminder_minutes: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CalendarEventInsert = Omit<CalendarEvent, 'id' | 'created_by' | 'created_at' | 'updated_at'>;
