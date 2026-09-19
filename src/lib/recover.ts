import { supabase } from './supabase';
import type { Plant, Panel, PlantInsert, PanelInsert } from './types';

const SUPABASE_HOST = 'fjmrfxjvqsdrwjucgzla.supabase.co';

export interface RecoveredData {
  plants: number;
  panels: number;
  photos: number;
  source: string;
}

async function readFromCache<T>(cacheName: string, urlPattern: string): Promise<T[]> {
  try {
    const cache = await caches.open(cacheName);
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
  } catch {
    return [];
  }
}

async function readFromAllCaches<T>(urlPattern: string): Promise<T[]> {
  const all: T[] = [];
  const cacheNames = await caches.keys();
  for (const name of cacheNames) {
    const items = await readFromCache<T>(name, urlPattern);
    all.push(...items);
  }
  return all;
}

function readFromLocalStorage<T>(keyPattern: string): T[] {
  const results: T[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.toLowerCase().includes(keyPattern.toLowerCase()) || keyPattern === '*') {
        try {
          const val = localStorage.getItem(key);
          if (!val) continue;
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            results.push(...parsed);
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray((parsed as Record<string, unknown>).plants)) {
              results.push(...(parsed as Record<string, unknown[]>).plants as T[]);
            }
            if (Array.isArray((parsed as Record<string, unknown>).panels)) {
              results.push(...(parsed as Record<string, unknown[]>).panels as T[]);
            }
          }
        } catch { /* skip */ }
      }
    }
  } catch {
    /* localStorage not available */
  }
  return results;
}

async function readFromIndexedDB<T>(storeNamePattern: string): Promise<T[]> {
  const results: T[] = [];
  try {
    if (!('indexedDB' in window)) return results;
    const dbs = await indexedDB.databases();
    for (const dbInfo of dbs) {
      if (!dbInfo.name) continue;
      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open(dbInfo.name!);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        for (const storeName of Array.from(db.objectStoreNames)) {
          if (storeName.toLowerCase().includes(storeNamePattern.toLowerCase()) || storeNamePattern === '*') {
            try {
              const tx = db.transaction(storeName, 'readonly');
              const store = tx.objectStore(storeName);
              const allReq = store.getAll();
              const items = await new Promise<T[]>((resolve, reject) => {
                allReq.onsuccess = () => resolve(allReq.result as T[]);
                allReq.onerror = () => reject(allReq.error);
              });
              if (Array.isArray(items)) results.push(...items);
            } catch { /* skip store */ }
          }
        }
        db.close();
      } catch { /* skip db */ }
    }
  } catch {
    /* indexedDB not available */
  }
  return results;
}

function dedupeById<T extends { id?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (item.id && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export async function recoverFromCache(): Promise<RecoveredData> {
  let source = '';

  // 1. Try Cache API (all caches, not just v4)
  let cachedPlants = await readFromAllCaches<Plant>(`${SUPABASE_HOST}/rest/v1/plants`);
  let cachedPanels = await readFromAllCaches<Panel>(`${SUPABASE_HOST}/rest/v1/panels`);

  // 2. Try localStorage
  if (cachedPlants.length === 0) {
    const lsPlants = readFromLocalStorage<Plant>('plant');
    const lsPanels = readFromLocalStorage<Panel>('panel');
    if (lsPlants.length > 0 || lsPanels.length > 0) {
      cachedPlants = [...cachedPlants, ...lsPlants];
      cachedPanels = [...cachedPanels, ...lsPanels];
      source = 'localStorage';
    }
  }

  // 3. Try IndexedDB
  if (cachedPlants.length === 0) {
    const idbPlants = await readFromIndexedDB<Plant>('plant');
    const idbPanels = await readFromIndexedDB<Panel>('panel');
    if (idbPlants.length > 0 || idbPanels.length > 0) {
      cachedPlants = [...cachedPlants, ...idbPlants];
      cachedPanels = [...cachedPanels, ...idbPanels];
      source = 'IndexedDB';
    }
  }

  // 4. Try localStorage with any key
  if (cachedPlants.length === 0) {
    const allLs = readFromLocalStorage<Plant>('*');
    if (allLs.length > 0) {
      cachedPlants = [...cachedPlants, ...allLs];
      source = 'localStorage (all keys)';
    }
  }

  // 5. Try IndexedDB with any store
  if (cachedPlants.length === 0) {
    const allIdb = await readFromIndexedDB<Plant>('*');
    if (allIdb.length > 0) {
      cachedPlants = [...cachedPlants, ...allIdb];
      source = 'IndexedDB (all stores)';
    }
  }

  if (source === '') source = 'Cache API';

  // Deduplicate
  cachedPlants = dedupeById(cachedPlants);
  cachedPanels = dedupeById(cachedPanels);

  if (cachedPlants.length === 0 && cachedPanels.length === 0) {
    return { plants: 0, panels: 0, photos: 0, source: 'nessuna fonte trovata' };
  }

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

  return { plants: plantsSaved, panels: panelsSaved, photos: photosSaved, source };
}
