do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'visit_schedules'
      and policyname = 'visit_schedules_authenticated_select'
  ) then
    execute 'create policy visit_schedules_authenticated_select
      on public.visit_schedules
      for select
      to authenticated
      using (true)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'visit_schedules'
      and policyname = 'visit_schedules_authenticated_insert'
  ) then
    execute 'create policy visit_schedules_authenticated_insert
      on public.visit_schedules
      for insert
      to authenticated
      with check (true)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'visit_schedules'
      and policyname = 'visit_schedules_authenticated_update'
  ) then
    execute 'create policy visit_schedules_authenticated_update
      on public.visit_schedules
      for update
      to authenticated
      using (true)
      with check (true)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'visit_schedules'
      and policyname = 'visit_schedules_authenticated_delete'
  ) then
    execute 'create policy visit_schedules_authenticated_delete
      on public.visit_schedules
      for delete
      to authenticated
      using (true)';
  end if;
end;
$$;
