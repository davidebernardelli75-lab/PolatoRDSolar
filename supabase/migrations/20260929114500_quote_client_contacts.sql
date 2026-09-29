alter table public.quote_requests
  add column if not exists client_email text,
  add column if not exists client_phone text;
