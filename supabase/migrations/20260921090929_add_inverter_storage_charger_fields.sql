-- Add fields for inverter brand/model/code, storage code, and EV charger brand/model/code

ALTER TABLE public.plants
  ADD COLUMN IF NOT EXISTS inverter_brand text,
  ADD COLUMN IF NOT EXISTS inverter_model text,
  ADD COLUMN IF NOT EXISTS inverter_code text,
  ADD COLUMN IF NOT EXISTS storage_code text,
  ADD COLUMN IF NOT EXISTS charger_brand text,
  ADD COLUMN IF NOT EXISTS charger_model text,
  ADD COLUMN IF NOT EXISTS charger_code text;

-- Migrate existing inverter_brand_model into inverter_brand (keep old column for now)
UPDATE public.plants
  SET inverter_brand = inverter_brand_model
  WHERE inverter_brand IS NULL AND inverter_brand_model IS NOT NULL;
