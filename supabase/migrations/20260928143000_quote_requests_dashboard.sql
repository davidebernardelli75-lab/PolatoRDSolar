create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  progressive_number integer not null check (progressive_number > 0),
  series text not null default 'F',
  quote_year integer not null default extract(year from current_date)::integer,
  request_date date,
  source text,
  client text not null,
  quote_type text,
  value_ex_vat numeric check (value_ex_vat is null or value_ex_vat >= 0),
  status text not null default 'DA GESTIRE'
    check (status in ('DA VERIFICARE','DA GESTIRE','IN PREPARAZIONE','INVIATO','ACCETTATO','RIFIUTATO','SOSPESO')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quote_requests enable row level security;

drop policy if exists admin_all_quote_requests on public.quote_requests;
create policy admin_all_quote_requests
on public.quote_requests
for all
to authenticated
using (polato_internal.is_polato_admin())
with check (polato_internal.is_polato_admin());

revoke all on public.quote_requests from anon;
grant select, insert, update, delete on public.quote_requests to authenticated;

create index if not exists quote_requests_year_idx on public.quote_requests (quote_year);
create index if not exists quote_requests_date_idx on public.quote_requests (request_date desc);
create index if not exists quote_requests_source_idx on public.quote_requests (source);
create index if not exists quote_requests_status_idx on public.quote_requests (status);
