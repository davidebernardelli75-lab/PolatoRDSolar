create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid null,
  actor_app_role text null,
  actor_session_id uuid null,
  actor_db_role text not null default session_user,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  table_schema text not null,
  table_name text not null,
  record_id text null,
  changed_columns text[] not null default '{}'::text[]
);

comment on table public.admin_audit_log is
  'Append-only audit trail for security-sensitive and business-critical data changes. Stores metadata only, not row values.';

alter table public.admin_audit_log enable row level security;

revoke all on table public.admin_audit_log from public, anon, authenticated;
grant select on table public.admin_audit_log to authenticated;
grant all on table public.admin_audit_log to service_role;

revoke all on sequence public.admin_audit_log_id_seq from public, anon, authenticated;
grant usage, select on sequence public.admin_audit_log_id_seq to service_role;

create policy admin_audit_log_admin_select
on public.admin_audit_log
for select
to authenticated
using ((select polato_internal.is_polato_admin()));

create index admin_audit_log_occurred_at_idx
  on public.admin_audit_log (occurred_at desc);

create index admin_audit_log_actor_idx
  on public.admin_audit_log (actor_user_id, occurred_at desc);

create index admin_audit_log_target_idx
  on public.admin_audit_log (table_name, record_id, occurred_at desc);

create or replace function polato_internal.capture_audit_event()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_actor uuid;
  v_actor_role text;
  v_session uuid;
  v_changed text[] := '{}'::text[];
begin
  if tg_table_schema <> 'public' or tg_table_name = 'admin_audit_log' then
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_row := v_new;

    select coalesce(array_agg(k order by k), '{}'::text[])
      into v_changed
    from jsonb_object_keys(v_new) as x(k);

  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_row := v_old;

    select coalesce(array_agg(k order by k), '{}'::text[])
      into v_changed
    from jsonb_object_keys(v_old) as x(k);

  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_row := v_new;

    select coalesce(array_agg(k order by k), '{}'::text[])
      into v_changed
    from (
      select coalesce(n.key, o.key) as k
      from jsonb_each(v_new) n
      full join jsonb_each(v_old) o on o.key = n.key
      where n.value is distinct from o.value
    ) changed;

    if cardinality(v_changed) = 0 then
      return null;
    end if;
  else
    return null;
  end if;

  v_actor := auth.uid();

  if v_actor is not null then
    select r.role
      into v_actor_role
    from public.app_user_roles r
    where r.user_id = v_actor
    limit 1;
  end if;

  begin
    v_session := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception
    when invalid_text_representation then
      v_session := null;
  end;

  insert into public.admin_audit_log (
    actor_user_id,
    actor_app_role,
    actor_session_id,
    actor_db_role,
    operation,
    table_schema,
    table_name,
    record_id,
    changed_columns
  )
  values (
    v_actor,
    v_actor_role,
    v_session,
    session_user,
    tg_op,
    tg_table_schema,
    tg_table_name,
    coalesce(
      v_row ->> 'id',
      v_row ->> 'user_id',
      v_row ->> 'report_id',
      v_row ->> 'plant_id',
      v_row ->> 'employee_id'
    ),
    v_changed
  );

  return null;
end;
$function$;

revoke all on function polato_internal.capture_audit_event() from public, anon, authenticated;
grant execute on function polato_internal.capture_audit_event() to service_role;

do $do$
declare
  v_table text;
  v_tables constant text[] := array[
    'app_members',
    'app_user_roles',
    'plants',
    'panels',
    'plant_inverters',
    'plant_storages',
    'plant_chargers',
    'plant_power_meters',
    'equipment_catalog',
    'quote_requests',
    'quote_request_files',
    'quote_type_options',
    'plant_quote_links',
    'work_sites',
    'work_site_plants',
    'work_site_scopes',
    'work_site_phases',
    'work_site_options',
    'work_reports',
    'work_report_materials',
    'work_report_workers',
    'work_report_admin_summaries',
    'work_report_material_costs',
    'work_report_worker_costs',
    'work_report_material_cost_defaults',
    'work_report_labor_rate_defaults',
    'vehicles',
    'insurances',
    'employees',
    'employee_courses',
    'training_custom_courses',
    'calendar_event_categories',
    'calendar_events'
  ];
begin
  foreach v_table in array v_tables loop
    execute format('drop trigger if exists polato_audit_change on public.%I', v_table);
    execute format(
      'create trigger polato_audit_change after insert or update or delete on public.%I for each row execute function polato_internal.capture_audit_event()',
      v_table
    );
  end loop;
end;
$do$;

revoke all privileges on table
  public.equipment_catalog,
  public.plant_chargers,
  public.plant_power_meters
from anon;
