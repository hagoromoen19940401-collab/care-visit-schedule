alter table public.visit_schedules
  add column if not exists unit text;

do $$
begin
  if not exists (
    select 1
      from pg_catalog.pg_constraint
     where conname = 'visit_schedules_unit_check'
       and conrelid = 'public.visit_schedules'::regclass
  ) then
    alter table public.visit_schedules
      add constraint visit_schedules_unit_check
      check (unit is null or unit in ('sakura', 'keyaki'));
  end if;
end;
$$;

drop function if exists public.visit_schedules_by_date(text, date);
drop function if exists public.visit_schedules_by_month(text, date);
drop function if exists public.visit_schedules_all(text);
drop function if exists public.visit_schedule_add(text, date, time, text, text, text);
drop function if exists public.visit_schedule_update(text, text, date, time, text, text, text);

create function public.visit_schedules_by_date(
  p_token text,
  p_visit_date date
)
returns table (
  id text,
  visit_date date,
  visit_time time,
  resident_name text,
  unit text,
  visitor_name text,
  note text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
begin
  perform public.visit_session_staff(p_token);

  if p_visit_date is null then
    raise exception '日付を指定してください' using errcode = '22004';
  end if;

  return query
  select v.id, v.visit_date, v.visit_time, v.resident_name, v.unit,
         v.visitor_name, v.note, v.created_at, v.updated_at
    from public.visit_schedules as v
   where v.visit_date = p_visit_date
   order by v.visit_time, v.created_at;
end;
$$;

create function public.visit_schedules_by_month(
  p_token text,
  p_month_start date
)
returns table (
  id text,
  visit_date date,
  visit_time time,
  resident_name text,
  unit text,
  visitor_name text,
  note text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_month_start date;
  v_next_month_start date;
begin
  perform public.visit_session_staff(p_token);

  if p_month_start is null then
    raise exception '月を指定してください' using errcode = '22004';
  end if;

  v_month_start := date_trunc('month', p_month_start)::date;
  v_next_month_start := (v_month_start + interval '1 month')::date;

  return query
  select v.id, v.visit_date, v.visit_time, v.resident_name, v.unit,
         v.visitor_name, v.note, v.created_at, v.updated_at
    from public.visit_schedules as v
   where v.visit_date >= v_month_start
     and v.visit_date < v_next_month_start
   order by v.visit_date, v.visit_time, v.created_at;
end;
$$;

create function public.visit_schedules_all(p_token text)
returns table (
  id text,
  visit_date date,
  visit_time time,
  resident_name text,
  unit text,
  visitor_name text,
  note text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
begin
  perform public.visit_session_staff(p_token);

  return query
  select v.id,
         v.visit_date,
         v.visit_time,
         v.resident_name,
         v.unit,
         v.visitor_name,
         v.note,
         v.created_at,
         v.updated_at
    from public.visit_schedules as v
   order by v.visit_date, v.visit_time, v.created_at;
end;
$$;

create function public.visit_schedule_add(
  p_token text,
  p_visit_date date,
  p_visit_time time,
  p_resident_name text,
  p_unit text,
  p_visitor_name text default null,
  p_note text default null
)
returns table (
  id text,
  visit_date date,
  visit_time time,
  resident_name text,
  unit text,
  visitor_name text,
  note text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_id text;
  v_resident_name text;
begin
  perform public.visit_session_staff(p_token);

  v_resident_name := btrim(coalesce(p_resident_name, ''));
  if p_visit_date is null or p_visit_time is null or v_resident_name = '' then
    raise exception '日付・来苑時間・利用者名は必須です' using errcode = '22004';
  end if;
  if p_unit is null or p_unit not in ('sakura', 'keyaki') then
    raise exception 'ユニットはさくらまたはけやきを指定してください' using errcode = '22023';
  end if;

  v_id := 'visit_' || replace(gen_random_uuid()::text, '-', '');

  return query
  insert into public.visit_schedules as v (
    id, visit_date, visit_time, resident_name, unit, visitor_name, note
  ) values (
    v_id,
    p_visit_date,
    p_visit_time,
    v_resident_name,
    p_unit,
    nullif(btrim(coalesce(p_visitor_name, '')), ''),
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning v.id, v.visit_date, v.visit_time, v.resident_name, v.unit,
            v.visitor_name, v.note, v.created_at, v.updated_at;
end;
$$;

create function public.visit_schedule_update(
  p_token text,
  p_id text,
  p_visit_date date,
  p_visit_time time,
  p_resident_name text,
  p_unit text,
  p_visitor_name text default null,
  p_note text default null
)
returns table (
  id text,
  visit_date date,
  visit_time time,
  resident_name text,
  unit text,
  visitor_name text,
  note text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_resident_name text;
begin
  perform public.visit_session_staff(p_token);

  v_resident_name := btrim(coalesce(p_resident_name, ''));
  if p_id is null or btrim(p_id) = '' or p_visit_date is null
     or p_visit_time is null or v_resident_name = '' then
    raise exception '予定ID・日付・来苑時間・利用者名は必須です' using errcode = '22004';
  end if;
  if p_unit is null or p_unit not in ('sakura', 'keyaki') then
    raise exception 'ユニットはさくらまたはけやきを指定してください' using errcode = '22023';
  end if;

  return query
  update public.visit_schedules as v
     set visit_date = p_visit_date,
         visit_time = p_visit_time,
         resident_name = v_resident_name,
         unit = p_unit,
         visitor_name = nullif(btrim(coalesce(p_visitor_name, '')), ''),
         note = nullif(btrim(coalesce(p_note, '')), ''),
         updated_at = now()
   where v.id = p_id
  returning v.id, v.visit_date, v.visit_time, v.resident_name, v.unit,
            v.visitor_name, v.note, v.created_at, v.updated_at;

  if not found then
    raise exception '対象の面会予定が見つかりません' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.visit_schedules_by_date(text, date) from public;
revoke all on function public.visit_schedules_by_month(text, date) from public;
revoke all on function public.visit_schedules_all(text) from public;
revoke all on function public.visit_schedule_add(text, date, time, text, text, text, text) from public;
revoke all on function public.visit_schedule_update(text, text, date, time, text, text, text, text) from public;

grant execute on function public.visit_schedules_by_date(text, date) to anon, authenticated;
grant execute on function public.visit_schedules_by_month(text, date) to anon, authenticated;
grant execute on function public.visit_schedules_all(text) to anon, authenticated;
grant execute on function public.visit_schedule_add(text, date, time, text, text, text, text) to anon, authenticated;
grant execute on function public.visit_schedule_update(text, text, date, time, text, text, text, text) to anon, authenticated;
