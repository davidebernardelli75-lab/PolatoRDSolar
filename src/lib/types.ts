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

export type EquipmentCategory = 'inverter' | 'storage';

export interface EquipmentCatalogEntry {
  id: string;
  category: EquipmentCategory;
  brand: string;
  model: string | null;
  created_at: string;
}

export type VehicleType = 'Auto' | 'Furgone';

export interface Vehicle {
  id: string;
  type: VehicleType;
  plate: string;
  brand: string;
  model: string;
  mileage_km: number;
  service_interval_km: number;
  last_service_km: number;
  last_service_date: string | null;
  insurance_expiry: string | null;
  inspection_expiry: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type VehicleInsert = Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>;

export type PlantInsert = Omit<Plant, 'id' | 'created_at' | 'updated_at'>;
export type PlantUpdate = Partial<PlantInsert>;
export type PanelInsert = Omit<Panel, 'id' | 'created_at'>;
export type PanelPhotoInsert = Omit<PanelPhoto, 'id' | 'created_at'>;
