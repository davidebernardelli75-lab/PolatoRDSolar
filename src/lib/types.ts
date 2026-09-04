export type OwnerType = 'Privato' | 'Azienda';

export interface Plant {
  id: string;
  owner_type: OwnerType;
  owner_name: string;
  fiscal_or_vat: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  total_power_kw: number | null;
  panel_brand_model: string | null;
  inverter_brand_model: string | null;
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

export type PlantInsert = Omit<Plant, 'id' | 'created_at' | 'updated_at'>;
export type PlantUpdate = Partial<PlantInsert>;
export type PanelInsert = Omit<Panel, 'id' | 'created_at'>;
export type PanelPhotoInsert = Omit<PanelPhoto, 'id' | 'created_at'>;
