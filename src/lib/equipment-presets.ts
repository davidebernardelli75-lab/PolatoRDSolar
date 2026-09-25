export const INVERTER_BRANDS = ['HUAWEI'] as const;

export const INVERTER_MODELS: Record<string, readonly string[]> = {
  HUAWEI: [
    'SUN2000-3KTL-L1',
    'SUN2000-4KTL-L1',
    'SUN2000-5KTL-L1',
    'SUN2000-6KTL-L1',
    'SUN2000-8KTL-L1',
    'SUN2000-10KTL-L1',
    'SUN2000-12KTL-L1',
    'SUN2000-3KTL-M1',
    'SUN2000-4KTL-M1',
    'SUN2000-5KTL-M1',
    'SUN2000-6KTL-M1',
    'SUN2000-8KTL-M1',
    'SUN2000-10KTL-M1',
    'SUN2000-12KTL-M1',
  ],
};

export const STORAGE_BRANDS = ['HUAWEI'] as const;

export const STORAGE_MODELS: Record<string, readonly string[]> = {
  HUAWEI: [
    'LUNA2000-5KWH',
    'LUNA2000-7KWH',
    'LUNA2000-10KWH',
    'LUNA2000-15KWH',
  ],
};

export const PANEL_BRANDS = [
  'JA SOLAR',
  'TRINA SOLAR',
  'AIKO',
  'LONGI',
  '3SUN',
  'MEYER BURGER',
] as const;

export const PANEL_POWERS: number[] = Array.from(
  { length: (700 - 470) / 5 + 1 },
  (_, i) => 470 + i * 5,
);

export const CHARGER_BRANDS = ['DAZE'] as const;

export const CHARGER_MODELS: Record<string, readonly string[]> = {
  DAZE: [
    'DT01IT32M5',
    'DT01IT32M7',
    'DT01IT32T5',
    'DT01IT32T7',
    'DT04IT32M5C',
    'DT04IT32M7C',
    'DT04IT32T5C',
    'DT04IT32T7C',
  ],
};

export const POWER_METER_BRANDS = ['DAZE'] as const;

export const POWER_METER_MODELS: Record<string, readonly string[]> = {
  DAZE: ['PM02M', 'PM02T'],
};
