alter table public.quote_requests
  add column if not exists site_visit_at timestamptz;
