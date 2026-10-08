create table if not exists public.quote_request_files (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  content_type text not null,
  file_size bigint not null check (file_size >= 0),
  created_at timestamptz not null default now()
);

alter table public.quote_request_files enable row level security;

drop policy if exists admin_all_quote_request_files on public.quote_request_files;
create policy admin_all_quote_request_files
on public.quote_request_files
for all
to authenticated
using (polato_internal.is_polato_admin())
with check (polato_internal.is_polato_admin());

revoke all on public.quote_request_files from anon;
grant select, insert, update, delete on public.quote_request_files to authenticated;

create index if not exists quote_request_files_quote_idx
  on public.quote_request_files (quote_request_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-files',
  'quote-files',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists admin_read_quote_files on storage.objects;
create policy admin_read_quote_files
on storage.objects
for select
to authenticated
using (
  bucket_id = 'quote-files'
  and polato_internal.is_polato_admin()
);

drop policy if exists admin_upload_quote_files on storage.objects;
create policy admin_upload_quote_files
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'quote-files'
  and (storage.foldername(name))[1] is not null
  and polato_internal.is_polato_admin()
);

drop policy if exists admin_update_quote_files on storage.objects;
create policy admin_update_quote_files
on storage.objects
for update
to authenticated
using (
  bucket_id = 'quote-files'
  and polato_internal.is_polato_admin()
)
with check (
  bucket_id = 'quote-files'
  and polato_internal.is_polato_admin()
);

drop policy if exists admin_delete_quote_files on storage.objects;
create policy admin_delete_quote_files
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'quote-files'
  and polato_internal.is_polato_admin()
);
