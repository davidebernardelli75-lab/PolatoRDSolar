import { supabase, STORAGE_BUCKET } from './supabase';
import type { Plant, Panel, PanelPhoto, PlantInsert, PlantUpdate, PanelInsert } from './types';

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
