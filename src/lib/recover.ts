import { supabase } from './supabase';
import type { Plant, Panel, PlantInsert, PanelInsert } from './types';

const SUPABASE_HOST = 'fjmrfxjvqsdrwjucgzla.supabase.co';
const OLD_CACHE = 'polato-solar-v4';

export interface RecoveredData {
  plants: number;
  panels: number;
  photos: number;
}

async function readFromCache<T>(urlPattern: string): Promise<T[]> {
  const cache = await caches.open(OLD_CACHE);
  const keys = await cache.keys();
  const results: T[] = [];
  for (const req of keys) {
    if (req.url.includes(urlPattern)) {
      const resp = await cache.match(req);
      if (resp && resp.ok) {
        try {
          const data = await resp.json();
          if (Array.isArray(data)) results.push(...data);
        } catch { /* skip */ }
      }
    }
  }
  return results;
}

export async function recoverFromCache(): Promise<RecoveredData> {
  const cachedPlants = await readFromCache<Plant>(`${SUPABASE_HOST}/rest/v1/plants`);
  const cachedPanels = await readFromCache<Panel>(`${SUPABASE_HOST}/rest/v1/panels`);

  const existingPlants = await supabase.from('plants').select('id');
  const existingIds = new Set((existingPlants.data ?? []).map((p: { id: string }) => p.id));

  let plantsSaved = 0;
  let panelsSaved = 0;
  let photosSaved = 0;

  const idMap = new Map<string, string>();

  for (const plant of cachedPlants) {
    if (existingIds.has(plant.id)) {
      idMap.set(plant.id, plant.id);
      continue;
    }
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = plant;
    const insert: PlantInsert = rest;
    const { data, error } = await supabase.from('plants').insert(insert).select().single();
    if (error || !data) continue;
    idMap.set(plant.id, data.id);
    plantsSaved++;
  }

  for (const panel of cachedPanels) {
    const newPlantId = idMap.get(panel.plant_id);
    if (!newPlantId) continue;
    const { id: _id, plant_id: _p, created_at: _c, ...rest } = panel;
    const insert: PanelInsert = { ...rest, plant_id: newPlantId };
    const { error } = await supabase.from('panels').insert(insert);
    if (!error) panelsSaved++;
  }

  const cachedPhotoUrls = await readFromCache<{ storage_path: string; file_name: string; content_type: string; plant_id: string }>(
    `${SUPABASE_HOST}/rest/v1/panel_photos`
  );

  const cache = await caches.open(OLD_CACHE);
  const allKeys = await cache.keys();

  for (const photoMeta of cachedPhotoUrls) {
    const newPlantId = idMap.get(photoMeta.plant_id);
    if (!newPlantId) continue;
    const matchingKey = allKeys.find((k) => k.url.includes(photoMeta.storage_path) || k.url.includes(encodeURIComponent(photoMeta.storage_path)));
    if (!matchingKey) continue;
    const resp = await cache.match(matchingKey);
    if (!resp) continue;
    const blob = await resp.blob();
    const ext = photoMeta.file_name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `${newPlantId}/${fileName}`;
    const { error: upErr } = await supabase.storage.from('solar-archive').upload(storagePath, blob, { contentType: photoMeta.content_type || 'image/jpeg' });
    if (upErr) continue;
    const { error: dbErr } = await supabase.from('panel_photos').insert({
      plant_id: newPlantId,
      panel_id: null,
      storage_path: storagePath,
      file_name: photoMeta.file_name,
      content_type: photoMeta.content_type || 'image/jpeg',
      file_size: blob.size,
    });
    if (!dbErr) photosSaved++;
  }

  return { plants: plantsSaved, panels: panelsSaved, photos: photosSaved };
}
