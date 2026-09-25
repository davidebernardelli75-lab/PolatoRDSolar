import { supabase, STORAGE_BUCKET } from './supabase';
import type { Plant, Panel, PanelPhoto, PlantInsert, PlantUpdate, PanelInsert, RoadmapTask, PlantInverter, PlantStorage, PlantCharger, PlantInverterInsert, PlantStorageInsert, PlantChargerInsert, PlantPowerMeter, PlantPowerMeterInsert, Vehicle, VehicleInsert, Insurance, InsuranceInsert, EquipmentCatalogEntry, EquipmentCategory } from './types';

export async function fetchPlants(): Promise<Plant[]> {
  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPlant(id: string): Promise<Plant | null> {
  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPlant(input: PlantInsert): Promise<Plant> {
  const { data, error } = await supabase
    .from('plants')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlant(id: string, input: PlantUpdate): Promise<Plant> {
  const { data, error } = await supabase
    .from('plants')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlant(id: string): Promise<void> {
  const { error } = await supabase.from('plants').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchPanels(plantId: string): Promise<Panel[]> {
  const { data, error } = await supabase
    .from('panels')
    .select('*')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createPanel(input: PanelInsert): Promise<Panel> {
  const { data, error } = await supabase
    .from('panels')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePanel(id: string, input: Partial<PanelInsert>): Promise<Panel> {
  const { data, error } = await supabase
    .from('panels')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePanel(id: string): Promise<void> {
  const { error } = await supabase.from('panels').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchPhotos(plantId: string): Promise<PanelPhoto[]> {
  const { data, error } = await supabase
    .from('panel_photos')
    .select('*')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function uploadPhoto(
  plantId: string,
  file: File,
  panelId: string | null
): Promise<PanelPhoto> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `${plantId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: file.type || 'image/jpeg' });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('panel_photos')
    .insert({
      plant_id: plantId,
      panel_id: panelId,
      storage_path: storagePath,
      file_name: file.name,
      content_type: file.type || 'image/jpeg',
      file_size: file.size,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePhoto(photo: PanelPhoto): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([photo.storage_path]);
  if (storageError) throw storageError;

  const { error } = await supabase.from('panel_photos').delete().eq('id', photo.id);
  if (error) throw error;
}

export async function getPhotoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function downloadPhotoBlob(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(storagePath);
  if (error) throw error;
  return data;
}

// ── Inverters ─────────────────────────────────────────────────────

export async function fetchInverters(plantId: string): Promise<PlantInverter[]> {
  const { data, error } = await supabase
    .from('plant_inverters')
    .select('*')
    .eq('plant_id', plantId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createInverter(input: PlantInverterInsert): Promise<PlantInverter> {
  const { data, error } = await supabase
    .from('plant_inverters')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInverter(id: string, input: Partial<PlantInverterInsert>): Promise<PlantInverter> {
  const { data, error } = await supabase
    .from('plant_inverters')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInverter(id: string): Promise<void> {
  const { error } = await supabase.from('plant_inverters').delete().eq('id', id);
  if (error) throw error;
}

// ── Storages ──────────────────────────────────────────────────────

export async function fetchStorages(plantId: string): Promise<PlantStorage[]> {
  const { data, error } = await supabase
    .from('plant_storages')
    .select('*')
    .eq('plant_id', plantId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createStorage(input: PlantStorageInsert): Promise<PlantStorage> {
  const { data, error } = await supabase
    .from('plant_storages')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStorage(id: string, input: Partial<PlantStorageInsert>): Promise<PlantStorage> {
  const { data, error } = await supabase
    .from('plant_storages')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStorage(id: string): Promise<void> {
  const { error } = await supabase.from('plant_storages').delete().eq('id', id);
  if (error) throw error;
}

// ── Roadmap (SyncroSolar) ──────────────────────────────────────────

export async function fetchRoadmapTasks(plantId: string): Promise<RoadmapTask[]> {
  const { data, error } = await supabase
    .from('roadmap_tasks')
    .select('*')
    .eq('plant_id', plantId)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function toggleRoadmapTask(taskId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('roadmap_tasks')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);
  if (error) throw error;
}

export async function fetchRoadmapProgress(plantId: string): Promise<number> {
  const { count, error } = await supabase
    .from('roadmap_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('plant_id', plantId);
  if (error) throw error;
  if (!count || count === 0) return 0;

  const { count: doneCount, error: doneError } = await supabase
    .from('roadmap_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('plant_id', plantId)
    .eq('completed', true);
  if (doneError) throw doneError;
  return Math.round(((doneCount ?? 0) / count) * 100);
}

export async function fetchAllRoadmapProgress(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('roadmap_tasks')
    .select('plant_id, completed');
  if (error) throw error;
  if (!data || data.length === 0) return {};

  const byPlant: Record<string, { total: number; done: number }> = {};
  for (const row of data as Array<{ plant_id: string; completed: boolean }>) {
    if (!byPlant[row.plant_id]) byPlant[row.plant_id] = { total: 0, done: 0 };
    byPlant[row.plant_id].total++;
    if (row.completed) byPlant[row.plant_id].done++;
  }

  const result: Record<string, number> = {};
  for (const [pid, { total, done }] of Object.entries(byPlant)) {
    result[pid] = total > 0 ? Math.round((done / total) * 100) : 0;
  }
  return result;
}

// ── Chargers (Colonnine) ───────────────────────────────────────────

export async function fetchChargers(plantId: string): Promise<PlantCharger[]> {
  const { data, error } = await supabase
    .from('plant_chargers')
    .select('*')
    .eq('plant_id', plantId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCharger(input: PlantChargerInsert): Promise<PlantCharger> {
  const { data, error } = await supabase
    .from('plant_chargers')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCharger(id: string, input: Partial<PlantChargerInsert>): Promise<PlantCharger> {
  const { data, error } = await supabase
    .from('plant_chargers')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCharger(id: string): Promise<void> {
  const { error } = await supabase.from('plant_chargers').delete().eq('id', id);
  if (error) throw error;
}

// ── Power Meters ──────────────────────────────────────────────────

export async function fetchPowerMeters(plantId: string): Promise<PlantPowerMeter[]> {
  const { data, error } = await supabase
    .from('plant_power_meters')
    .select('*')
    .eq('plant_id', plantId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createPowerMeter(input: PlantPowerMeterInsert): Promise<PlantPowerMeter> {
  const { data, error } = await supabase
    .from('plant_power_meters')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePowerMeter(id: string, input: Partial<PlantPowerMeterInsert>): Promise<PlantPowerMeter> {
  const { data, error } = await supabase
    .from('plant_power_meters')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePowerMeter(id: string): Promise<void> {
  const { error } = await supabase.from('plant_power_meters').delete().eq('id', id);
  if (error) throw error;
}

// ── Vehicles ───────────────────────────────────────────────────────

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// The production project may not yet have the optional columns added in
// 20260925211343. Retry only when PostgREST explicitly identifies one of
// those missing columns AND no user-entered extension data would be lost.
const OPTIONAL_VEHICLE_COLUMNS = [
  'owner_type', 'insurance_categories', 'tax_cost', 'inspection_cost', 'service_cost',
] as const;

function missingOptionalVehicleColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error || !['42703', 'PGRST204'].includes(error.code ?? '')) return false;
  return OPTIONAL_VEHICLE_COLUMNS.some((column) => error.message?.includes(column));
}

function legacyVehiclePayload(input: Partial<VehicleInsert>): Partial<VehicleInsert> {
  const hasExtensionData =
    (input.owner_type !== undefined && input.owner_type !== 'Azienda') ||
    (input.insurance_categories?.length ?? 0) > 0 ||
    input.tax_cost != null ||
    input.inspection_cost != null ||
    input.service_cost != null;
  if (hasExtensionData) {
    throw new Error(
      'Salvataggio non eseguito: il database collegato non supporta ancora ' +
      'intestazione privata, garanzie o nuovi costi. Nessun dato è stato salvato. ' +
      'Non cancellare i valori inseriti: occorre allineare il database corretto.'
    );
  }

  const { owner_type, insurance_categories, tax_cost, inspection_cost, service_cost, ...legacy } = input;
  return legacy;
}

export async function createVehicle(input: VehicleInsert): Promise<Vehicle> {
  let { data, error } = await supabase.from('vehicles').insert(input).select().single();
  if (missingOptionalVehicleColumn(error)) {
    const safeInput = legacyVehiclePayload(input);
    ({ data, error } = await supabase.from('vehicles').insert(safeInput).select().single());
  }
  if (error) throw error;
  window.dispatchEvent(new Event('polato:data-changed'));
  return data as Vehicle;
}

export async function updateVehicle(id: string, input: Partial<VehicleInsert>): Promise<Vehicle> {
  const write = (payload: Partial<VehicleInsert>) =>
    supabase.from('vehicles').update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
  let { data, error } = await write(input);
  if (missingOptionalVehicleColumn(error)) {
    const safeInput = legacyVehiclePayload(input);
    ({ data, error } = await write(safeInput));
  }
  if (error) throw error;
  window.dispatchEvent(new Event('polato:data-changed'));
  return data as Vehicle;
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
  window.dispatchEvent(new Event('polato:data-changed'));
}

// ── Insurances (Assicurazioni Varie) ───────────────────────────────

export async function fetchInsurances(): Promise<Insurance[]> {
  const { data, error } = await supabase
    .from('insurances')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createInsurance(input: InsuranceInsert): Promise<Insurance> {
  const { data, error } = await supabase
    .from('insurances')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  window.dispatchEvent(new Event('polato:data-changed'));
  return data;
}

export async function updateInsurance(id: string, input: Partial<InsuranceInsert>): Promise<Insurance> {
  const { data, error } = await supabase
    .from('insurances')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  window.dispatchEvent(new Event('polato:data-changed'));
  return data;
}

export async function deleteInsurance(id: string): Promise<void> {
  const { error } = await supabase.from('insurances').delete().eq('id', id);
  if (error) throw error;
  window.dispatchEvent(new Event('polato:data-changed'));
}

// ── Equipment Catalog (custom brands/models) ──────────────────────

export async function fetchEquipmentCatalog(category?: EquipmentCategory): Promise<EquipmentCatalogEntry[]> {
  let query = supabase.from('equipment_catalog').select('*');
  if (category) query = query.eq('category', category);
  const { data, error } = await query.order('brand', { ascending: true }).order('model', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addEquipmentBrand(category: EquipmentCategory, brand: string): Promise<void> {
  const { error } = await supabase
    .from('equipment_catalog')
    .insert({ category, brand, model: null });
  if (error) throw error;
}

export async function addEquipmentModel(category: EquipmentCategory, brand: string, model: string): Promise<void> {
  const { error } = await supabase
    .from('equipment_catalog')
    .insert({ category, brand, model });
  if (error) throw error;
}
