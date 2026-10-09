create index if not exists calendar_events_created_by_idx
  on public.calendar_events (created_by);
create index if not exists plant_chargers_plant_id_idx
  on public.plant_chargers (plant_id);
create index if not exists plant_power_meters_plant_id_idx
  on public.plant_power_meters (plant_id);
create index if not exists plant_quote_links_created_by_idx
  on public.plant_quote_links (created_by);
create index if not exists work_report_admin_summaries_updated_by_idx
  on public.work_report_admin_summaries (updated_by);
create index if not exists work_report_labor_rate_defaults_updated_by_idx
  on public.work_report_labor_rate_defaults (updated_by);
create index if not exists work_report_material_cost_defaults_updated_by_idx
  on public.work_report_material_cost_defaults (updated_by);
create index if not exists work_report_material_costs_updated_by_idx
  on public.work_report_material_costs (updated_by);
create index if not exists work_report_worker_costs_updated_by_idx
  on public.work_report_worker_costs (updated_by);
create index if not exists work_reports_approved_by_idx
  on public.work_reports (approved_by);

alter policy authorized_all_plant_chargers
on public.plant_chargers
using (
  exists (
    select 1
    from public.app_members
    where app_members.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.app_members
    where app_members.user_id = (select auth.uid())
  )
);

alter policy authorized_all_equipment_catalog
on public.equipment_catalog
using (
  exists (
    select 1
    from public.app_members
    where app_members.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.app_members
    where app_members.user_id = (select auth.uid())
  )
);

alter policy select_own_power_meters
on public.plant_power_meters
using (
  exists (
    select 1
    from public.app_members
    where app_members.user_id = (select auth.uid())
  )
);

alter policy insert_own_power_meters
on public.plant_power_meters
with check (
  exists (
    select 1
    from public.app_members
    where app_members.user_id = (select auth.uid())
  )
);

alter policy update_own_power_meters
on public.plant_power_meters
using (
  exists (
    select 1
    from public.app_members
    where app_members.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.app_members
    where app_members.user_id = (select auth.uid())
  )
);

alter policy delete_own_power_meters
on public.plant_power_meters
using (
  exists (
    select 1
    from public.app_members
    where app_members.user_id = (select auth.uid())
  )
);

drop policy if exists work_reports_admin_all on public.work_reports;
drop policy if exists work_reports_operator_select on public.work_reports;
drop policy if exists work_reports_operator_insert on public.work_reports;
drop policy if exists work_reports_operator_update on public.work_reports;
drop policy if exists work_reports_operator_delete on public.work_reports;

create policy work_reports_select
on public.work_reports
for select
to authenticated
using (
  (select polato_internal.is_polato_admin())
  or (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.app_members m
      where m.user_id = (select auth.uid())
    )
  )
);

create policy work_reports_insert
on public.work_reports
for insert
to authenticated
with check (
  (select polato_internal.is_polato_admin())
  or (
    created_by = (select auth.uid())
    and status = 'BOZZA'
    and exists (
      select 1
      from public.app_members m
      where m.user_id = (select auth.uid())
    )
  )
);

create policy work_reports_update
on public.work_reports
for update
to authenticated
using (
  (select polato_internal.is_polato_admin())
  or (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.app_members m
      where m.user_id = (select auth.uid())
    )
  )
)
with check (
  (select polato_internal.is_polato_admin())
  or (
    created_by = (select auth.uid())
    and status = any (array['BOZZA'::text, 'DA_VERIFICARE'::text, 'APPROVATO'::text, 'DA_CORREGGERE'::text])
    and exists (
      select 1
      from public.app_members m
      where m.user_id = (select auth.uid())
    )
  )
);

create policy work_reports_delete
on public.work_reports
for delete
to authenticated
using (
  (select polato_internal.is_polato_admin())
  or (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.app_members m
      where m.user_id = (select auth.uid())
    )
  )
);

drop policy if exists work_report_materials_admin_all on public.work_report_materials;
drop policy if exists work_report_materials_operator_select on public.work_report_materials;
drop policy if exists work_report_materials_operator_insert on public.work_report_materials;
drop policy if exists work_report_materials_operator_update on public.work_report_materials;
drop policy if exists work_report_materials_operator_delete on public.work_report_materials;

create policy work_report_materials_select
on public.work_report_materials
for select
to authenticated
using (
  (select polato_internal.is_polato_admin())
  or exists (
    select 1
    from public.work_reports r
    where r.id = work_report_materials.report_id
      and r.created_by = (select auth.uid())
  )
);

create policy work_report_materials_insert
on public.work_report_materials
for insert
to authenticated
with check (
  (select polato_internal.is_polato_admin())
  or exists (
    select 1
    from public.work_reports r
    where r.id = work_report_materials.report_id
      and r.created_by = (select auth.uid())
  )
);

create policy work_report_materials_update
on public.work_report_materials
for update
to authenticated
using (
  (select polato_internal.is_polato_admin())
  or exists (
    select 1
    from public.work_reports r
    where r.id = work_report_materials.report_id
      and r.created_by = (select auth.uid())
  )
)
with check (
  (select polato_internal.is_polato_admin())
  or exists (
    select 1
    from public.work_reports r
    where r.id = work_report_materials.report_id
      and r.created_by = (select auth.uid())
  )
);

create policy work_report_materials_delete
on public.work_report_materials
for delete
to authenticated
using (
  (select polato_internal.is_polato_admin())
  or exists (
    select 1
    from public.work_reports r
    where r.id = work_report_materials.report_id
      and r.created_by = (select auth.uid())
  )
);

drop policy if exists work_report_workers_admin_all on public.work_report_workers;
drop policy if exists work_report_workers_operator_select on public.work_report_workers;
drop policy if exists work_report_workers_operator_insert on public.work_report_workers;
drop policy if exists work_report_workers_operator_update on public.work_report_workers;
drop policy if exists work_report_workers_operator_delete on public.work_report_workers;

create policy work_report_workers_select
on public.work_report_workers
for select
to authenticated
using (
  (select polato_internal.is_polato_admin())
  or exists (
    select 1
    from public.work_reports r
    where r.id = work_report_workers.report_id
      and r.created_by = (select auth.uid())
  )
);

create policy work_report_workers_insert
on public.work_report_workers
for insert
to authenticated
with check (
  (select polato_internal.is_polato_admin())
  or exists (
    select 1
    from public.work_reports r
    where r.id = work_report_workers.report_id
      and r.created_by = (select auth.uid())
  )
);

create policy work_report_workers_update
on public.work_report_workers
for update
to authenticated
using (
  (select polato_internal.is_polato_admin())
  or exists (
    select 1
    from public.work_reports r
    where r.id = work_report_workers.report_id
      and r.created_by = (select auth.uid())
  )
)
with check (
  (select polato_internal.is_polato_admin())
  or exists (
    select 1
    from public.work_reports r
    where r.id = work_report_workers.report_id
      and r.created_by = (select auth.uid())
  )
);

create policy work_report_workers_delete
on public.work_report_workers
for delete
to authenticated
using (
  (select polato_internal.is_polato_admin())
  or exists (
    select 1
    from public.work_reports r
    where r.id = work_report_workers.report_id
      and r.created_by = (select auth.uid())
  )
);
