alter table public.plants
  add column if not exists pod text,
  add column if not exists city text,
  add column if not exists province text,
  add column if not exists region text,
  add column if not exists storage_power_kw numeric(10,2)
    check (storage_power_kw is null or storage_power_kw >= 0),
  add column if not exists storage_brand text,
  add column if not exists storage_model text,
  add column if not exists censimp_code text;
