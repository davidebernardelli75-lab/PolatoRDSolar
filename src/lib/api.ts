import { supabase, STORAGE_BUCKET, QUOTE_FILES_BUCKET } from './supabase';
import type { Plant, Panel, PanelPhoto, PlantInsert, PlantUpdate, PanelInsert, RoadmapTask, PlantInverter, PlantStorage, PlantCharger, PlantInverterInsert, PlantStorageInsert, PlantChargerInsert, PlantPowerMeter, PlantPowerMeterInsert, Vehicle, VehicleInsert, Insurance, InsuranceInsert, EquipmentCatalogEntry, EquipmentCategory, QuoteRequest, QuoteRequestInsert, QuoteRequestFile, WorkReport, WorkReportInsert, WorkReportMaterial, WorkReportMaterialInput, WorkReportWorker, WorkReportWorkerInput, WorkReportStatus, WorkReportMaterialCatalogEntry, WorkReportWorkerCatalogEntry, WorkReportMaterialCostDefault, WorkReportLaborRateDefault, WorkReportMaterialCost, WorkReportWorkerCost, WorkReportAdminSummary, WorkReportSiteOption, PlantQuoteLink, CalendarEvent, CalendarEventInsert, CalendarEventCategory } from './types';

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

export async function fetchWorkReportMaterialCatalog(): Promise<WorkReportMaterialCatalogEntry[]> {
  const { data, error } = await supabase
    .from('work_report_material_catalog')
    .select('id, description, normalized_description, default_unit, usage_count, last_used_at')
    .order('usage_count', { ascending: false })
    .order('last_used_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchWorkReportWorkerCatalog(): Promise<WorkReportWorkerCatalogEntry[]> {
  const { data, error } = await supabase
    .from('work_report_worker_catalog')
    .select('id, worker_name, normalized_worker_name, usage_count, last_used_at')
    .order('usage_count', { ascending: false })
    .order('last_used_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchWorkReportMaterialCostDefaults(): Promise<WorkReportMaterialCostDefault[]> {
  const { data, error } = await supabase
    .from('work_report_material_cost_defaults')
    .select('material_catalog_id, unit_price');
  if (error) throw error;
  return data ?? [];
}

export async function fetchWorkReportLaborRateDefaults(): Promise<WorkReportLaborRateDefault[]> {
  const { data, error } = await supabase
    .from('work_report_labor_rate_defaults')
    .select('worker_catalog_id, rate_type, hourly_rate');
  if (error) throw error;
  return data ?? [];
}

export async function fetchWorkReportMaterialCosts(): Promise<WorkReportMaterialCost[]> {
  const { data, error } = await supabase
    .from('work_report_material_costs')
    .select('report_material_id, unit_price');
  if (error) throw error;
  return data ?? [];
}

export async function fetchWorkReportWorkerCosts(): Promise<WorkReportWorkerCost[]> {
  const { data, error } = await supabase
    .from('work_report_worker_costs')
    .select('report_worker_id, hourly_rate');
  if (error) throw error;
  return data ?? [];
}

export async function fetchWorkReportAdminSummary(reportId: string): Promise<WorkReportAdminSummary | null> {
  const { data, error } = await supabase
    .from('work_report_admin_summaries')
    .select('report_id, material_markup_percent')
    .eq('report_id', reportId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setWorkReportMaterialMarkup(reportId: string, markupPercent: number): Promise<void> {
  const { error } = await supabase.rpc('set_work_report_material_markup', {
    p_report_id: reportId,
    p_markup_percent: markupPercent,
  });
  if (error) throw error;
}

export async function fetchPlantQuoteLinks(): Promise<PlantQuoteLink[]> {
  const { data, error } = await supabase
    .from('plant_quote_links')
    .select('plant_id, quote_request_id');
  if (error) throw error;
  return data ?? [];
}

export async function setPlantQuoteLink(plantId: string, quoteRequestId: string | null): Promise<void> {
  if (!quoteRequestId) {
    const { error } = await supabase.from('plant_quote_links').delete().eq('plant_id', plantId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('plant_quote_links')
    .upsert({
      plant_id: plantId,
      quote_request_id: quoteRequestId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'plant_id' });
  if (error) throw error;
}

export async function setWorkReportQuoteLink(reportId: string, quoteRequestId: string | null): Promise<void> {
  const { error } = await supabase
    .from('work_reports')
    .update({
      quote_request_id: quoteRequestId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);
  if (error) throw error;
}

export async function setWorkReportMaterialCost(reportMaterialId: string, unitPrice: number): Promise<void> {
  const { error } = await supabase.rpc('set_work_report_material_cost', {
    p_report_material_id: reportMaterialId,
    p_unit_price: unitPrice,
  });
  if (error) throw error;
}

export async function setWorkReportWorkerCost(reportWorkerId: string, hourlyRate: number): Promise<void> {
  const { error } = await supabase.rpc('set_work_report_worker_cost', {
    p_report_worker_id: reportWorkerId,
    p_hourly_rate: hourlyRate,
  });
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

export async function createVehicle(input: VehicleInsert): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateVehicle(id: string, input: Partial<VehicleInsert>): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw error;
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
  return data;
}

export async function deleteInsurance(id: string): Promise<void> {
  const { error } = await supabase.from('insurances').delete().eq('id', id);
  if (error) throw error;
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


// ── Quote Requests (Preventivi) ───────────────────────────────────

export async function fetchQuoteRequests(): Promise<QuoteRequest[]> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*')
    .order('quote_year', { ascending: false })
    .order('progressive_number', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createQuoteRequest(input: QuoteRequestInsert): Promise<QuoteRequest> {
  const { data, error } = await supabase
    .from('quote_requests')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuoteRequest(id: string, input: Partial<QuoteRequestInsert>): Promise<QuoteRequest> {
  const { data, error } = await supabase
    .from('quote_requests')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchQuoteRequestFiles(): Promise<QuoteRequestFile[]> {
  const { data, error } = await supabase
    .from('quote_request_files')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function quoteFileContentType(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'xls') return 'application/vnd.ms-excel';
  if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return '';
}

export async function uploadQuoteRequestFile(quoteRequestId: string, file: File): Promise<QuoteRequestFile> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Il file supera il limite di 20 MB.');
  const contentType = quoteFileContentType(file);
  if (!contentType) throw new Error('Formato file non supportato.');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const storagePath = `${quoteRequestId}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(QUOTE_FILES_BUCKET)
    .upload(storagePath, file, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('quote_request_files')
    .insert({
      quote_request_id: quoteRequestId,
      storage_path: storagePath,
      file_name: file.name,
      content_type: contentType,
      file_size: file.size,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(QUOTE_FILES_BUCKET).remove([storagePath]);
    throw error;
  }
  return data;
}

export async function downloadQuoteRequestFile(file: QuoteRequestFile): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(QUOTE_FILES_BUCKET)
    .download(file.storage_path);
  if (error) throw error;
  return data;
}

export async function deleteQuoteRequestFile(file: QuoteRequestFile): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(QUOTE_FILES_BUCKET)
    .remove([file.storage_path]);
  if (storageError) throw storageError;

  const { error } = await supabase
    .from('quote_request_files')
    .delete()
    .eq('id', file.id);
  if (error) throw error;
}

export async function deleteQuoteRequest(id: string): Promise<void> {
  const { data: files, error: filesError } = await supabase
    .from('quote_request_files')
    .select('storage_path')
    .eq('quote_request_id', id);
  if (filesError) throw filesError;

  const paths = (files ?? []).map((file) => file.storage_path);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(QUOTE_FILES_BUCKET)
      .remove(paths);
    if (storageError) throw storageError;
  }

  const { error } = await supabase.from('quote_requests').delete().eq('id', id);
  if (error) throw error;
}


// ── Work Reports (Rapportini squadre) ─────────────────────────────

export async function fetchWorkReports(): Promise<WorkReport[]> {
  const { data, error } = await supabase
    .from('work_reports')
    .select('*')
    .order('report_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchWorkReportSiteOptions(): Promise<WorkReportSiteOption[]> {
  const { data, error } = await supabase.rpc('list_work_report_sites');
  if (error) throw error;
  return (data ?? []) as WorkReportSiteOption[];
}

export async function fetchWorkReportWorkers(): Promise<WorkReportWorker[]> {
  const { data, error } = await supabase
    .from('work_report_workers')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchWorkReportMaterials(): Promise<WorkReportMaterial[]> {
  const { data, error } = await supabase
    .from('work_report_materials')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createWorkReport(input: WorkReportInsert): Promise<WorkReport> {
  const { data, error } = await supabase
    .from('work_reports')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorkReport(
  id: string,
  input: Partial<WorkReportInsert> & {
    status?: WorkReportStatus;
    submitted_at?: string | null;
    approved_at?: string | null;
    approved_by?: string | null;
  },
): Promise<WorkReport> {
  const { data, error } = await supabase
    .from('work_reports')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkReport(id: string): Promise<void> {
  const { error } = await supabase.from('work_reports').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteWorkReportGroup(
  quoteRequestId: string | null,
  reportIds: string[],
): Promise<number> {
  const { data, error } = await supabase.rpc('delete_work_report_group', {
    p_quote_request_id: quoteRequestId,
    p_report_ids: reportIds,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function replaceWorkReportWorkers(reportId: string, workers: WorkReportWorkerInput[]): Promise<void> {
  const { error: deleteError } = await supabase.from('work_report_workers').delete().eq('report_id', reportId);
  if (deleteError) throw deleteError;
  if (workers.length === 0) return;
  const { error } = await supabase.from('work_report_workers').insert(
    workers.map((worker) => ({
      report_id: reportId,
      worker_name: worker.worker_name.trim().toUpperCase(),
      hours: worker.hours,
      rate_type: worker.rate_type.trim().toUpperCase() || 'ORDINARIA',
      notes: worker.notes?.trim().toUpperCase() || null,
    })),
  );
  if (error) throw error;
  await Promise.all(workers.map(async (worker) => {
    const { error: rememberError } = await supabase.rpc('remember_work_report_worker', {
      p_worker_name: worker.worker_name,
    });
    if (rememberError) throw rememberError;
  }));
}

export async function replaceWorkReportMaterials(reportId: string, materials: WorkReportMaterialInput[]): Promise<WorkReportMaterial[]> {
  const { error: deleteError } = await supabase.from('work_report_materials').delete().eq('report_id', reportId);
  if (deleteError) throw deleteError;
  if (materials.length === 0) return [];

  const inserted: WorkReportMaterial[] = [];
  for (const material of materials) {
    const { data, error } = await supabase.from('work_report_materials').insert({
      report_id: reportId,
      item_code: material.item_code?.trim().toUpperCase() || null,
      description: material.description.trim().toUpperCase(),
      quantity: material.quantity,
      unit: material.unit.trim().toUpperCase() || 'PZ',
      notes: material.notes?.trim().toUpperCase() || null,
    }).select().single();
    if (error) throw error;
    inserted.push(data);

    const { error: rememberError } = await supabase.rpc('remember_work_report_material', {
      p_description: material.description,
      p_unit: material.unit || 'PZ',
    });
    if (rememberError) throw rememberError;
  }
  return inserted;
}


// ── Admin Calendar ─────────────────────────────────────────────────

export async function fetchCalendarEventCategories(): Promise<CalendarEventCategory[]> {
  const { data, error } = await supabase
    .from('calendar_event_categories')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function rememberCalendarCustomCategory(label: string): Promise<CalendarEventCategory> {
  const { data, error } = await supabase.rpc('remember_calendar_custom_category', {
    p_label: label,
  });
  if (error) throw error;
  return data as CalendarEventCategory;
}

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCalendarEvent(input: CalendarEventInsert): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCalendarEvent(id: string, input: Partial<CalendarEventInsert>): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
