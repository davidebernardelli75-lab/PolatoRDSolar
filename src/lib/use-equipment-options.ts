import { useState, useEffect, useCallback } from 'react';
import { fetchEquipmentCatalog, addEquipmentBrand, addEquipmentModel } from './api';
import type { EquipmentCategory, EquipmentCatalogEntry } from './types';
import { INVERTER_BRANDS, INVERTER_MODELS, STORAGE_BRANDS, STORAGE_MODELS } from './equipment-presets';

interface EquipmentOptions {
  brands: readonly string[];
  modelsFor: (brand: string) => readonly string[];
  ensureBrand: (brand: string) => Promise<void>;
  ensureModel: (brand: string, model: string) => Promise<void>;
}

export function useEquipmentOptions(category: EquipmentCategory): EquipmentOptions {
  const [catalog, setCatalog] = useState<EquipmentCatalogEntry[]>([]);

  const presetBrands = category === 'inverter' ? INVERTER_BRANDS : STORAGE_BRANDS;
  const presetModels = category === 'inverter' ? INVERTER_MODELS : STORAGE_MODELS;

  const loadCatalog = useCallback(async () => {
    try {
      const data = await fetchEquipmentCatalog(category);
      setCatalog(data);
    } catch {
      // skip
    }
  }, [category]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const customBrands = catalog
    .filter((e) => e.model === null)
    .map((e) => e.brand);
  const allBrands = [...new Set([...presetBrands, ...customBrands])];

  const customModelsByBrand: Record<string, string[]> = {};
  for (const entry of catalog) {
    if (entry.model !== null) {
      if (!customModelsByBrand[entry.brand]) customModelsByBrand[entry.brand] = [];
      customModelsByBrand[entry.brand].push(entry.model);
    }
  }

  const modelsFor = (brand: string): readonly string[] => {
    const preset = presetModels[brand] ?? [];
    const custom = customModelsByBrand[brand] ?? [];
    return [...new Set([...preset, ...custom])];
  };

  const ensureBrand = async (brand: string) => {
    if (!brand || brand === '__custom') return;
    if (presetBrands.includes(brand as any)) return;
    if (customBrands.includes(brand)) return;
    try {
      await addEquipmentBrand(category, brand);
      await loadCatalog();
    } catch {
      // skip
    }
  };

  const ensureModel = async (brand: string, model: string) => {
    if (!brand || !model || brand === '__custom' || model === '__custom') return;
    const existing = modelsFor(brand);
    if (existing.includes(model)) return;
    try {
      await addEquipmentModel(category, brand, model);
      await loadCatalog();
    } catch {
      // skip
    }
  };

  return { brands: allBrands, modelsFor, ensureBrand, ensureModel };
}
