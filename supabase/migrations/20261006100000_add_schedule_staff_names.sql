-- 操作時点の職員名を保存する。職員削除後も名前は残し、既存データは補完しない。
alter table public.visit_schedules
  add column created_by_name text,
  add column updated_by_name text;

alter table public.outing_schedules
  add column created_by_name text,
  add column updated_by_name text;

alter table public.overnight_schedules
  add column created_by_name text,
  add column updated_by_name text;

create or replace function public.visit_schedule_add(
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
  v_staff_id uuid;
  v_staff_name text;
begin
  v_staff_id := public.visit_session_staff(p_token);
  select s.display_name into strict v_staff_name
    from public.visit_staff as s
   where s.id = v_staff_id;

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
    id, visit_date, visit_time, resident_name, unit, visitor_name, note, created_by_name, updated_by_name
  ) values (
    v_id,
    p_visit_date,
    p_visit_time,
    v_resident_name,
    p_unit,
    nullif(btrim(coalesce(p_visitor_name, '')), ''),
    nullif(btrim(coalesce(p_note, '')), ''),
    v_staff_name,
    v_staff_name
  )
  returning v.id, v.visit_date, v.visit_time, v.resident_name, v.unit,
            v.visitor_name, v.note, v.created_at, v.updated_at;
end;
$$;

create or replace function public.visit_schedule_update(
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
  v_staff_id uuid;
  v_staff_name text;
begin
  v_staff_id := public.visit_session_staff(p_token);
  select s.display_name into strict v_staff_name
    from public.visit_staff as s
   where s.id = v_staff_id;

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
         updated_by_name = v_staff_name,
         updated_at = now()
   where v.id = p_id
  returning v.id, v.visit_date, v.visit_time, v.resident_name, v.unit,
            v.visitor_name, v.note, v.created_at, v.updated_at;

  if not found then
    raise exception '対象の面会予定が見つかりません' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.outing_schedule_add(
  p_token text,
  p_outing_date date,
  p_resident_name text,
  p_note text default null,
  p_companion text default null
)
returns table (
  id text,
  outing_date date,
  resident_name text,
  companion text,
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
  v_staff_id uuid;
  v_staff_name text;
begin
  v_staff_id := public.visit_session_staff(p_token);
  select s.display_name into strict v_staff_name
    from public.visit_staff as s
   where s.id = v_staff_id;

  v_resident_name := btrim(coalesce(p_resident_name, ''));
  if p_outing_date is null or v_resident_name = '' then
    raise exception '日付・利用者名は必須です' using errcode = '22004';
  end if;

  v_id := 'outing_' || replace(gen_random_uuid()::text, '-', '');

  return query
  insert into public.outing_schedules as o (
    id, outing_date, resident_name, companion, note, created_by_name, updated_by_name
  ) values (
    v_id,
    p_outing_date,
    v_resident_name,
    nullif(btrim(coalesce(p_companion, '')), ''),
    nullif(btrim(coalesce(p_note, '')), ''),
    v_staff_name,
    v_staff_name
  )
  returning o.id, o.outing_date, o.resident_name, o.companion, o.note,
            o.created_at, o.updated_at;
end;
$$;

create or replace function public.outing_schedule_update(
  p_token text,
  p_id text,
  p_outing_date date,
  p_resident_name text,
  p_note text default null,
  p_companion text default null
)
returns table (
  id text,
  outing_date date,
  resident_name text,
  companion text,
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
  v_staff_id uuid;
  v_staff_name text;
begin
  v_staff_id := public.visit_session_staff(p_token);
  select s.display_name into strict v_staff_name
    from public.visit_staff as s
   where s.id = v_staff_id;

  v_resident_name := btrim(coalesce(p_resident_name, ''));
  if p_id is null or btrim(p_id) = '' or p_outing_date is null
     or v_resident_name = '' then
    raise exception '予定ID・日付・利用者名は必須です' using errcode = '22004';
  end if;

  return query
  update public.outing_schedules as o
     set outing_date = p_outing_date,
         resident_name = v_resident_name,
         companion = nullif(btrim(coalesce(p_companion, '')), ''),
         note = nullif(btrim(coalesce(p_note, '')), ''),
         updated_by_name = v_staff_name,
         updated_at = now()
   where o.id = p_id
  returning o.id, o.outing_date, o.resident_name, o.companion, o.note,
            o.created_at, o.updated_at;

  if not found then
    raise exception '対象の外出予定が見つかりません' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.overnight_schedule_add(
  p_token text,
  p_start_date date,
  p_return_date date,
  p_resident_name text,
  p_note text default null,
  p_destination text default null
)
returns table (
  id text,
  start_date date,
  return_date date,
  resident_name text,
  destination text,
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
  v_staff_id uuid;
  v_staff_name text;
begin
  v_staff_id := public.visit_session_staff(p_token);
  select s.display_name into strict v_staff_name
    from public.visit_staff as s
   where s.id = v_staff_id;

  v_resident_name := btrim(coalesce(p_resident_name, ''));
  if p_start_date is null or p_return_date is null or v_resident_name = '' then
    raise exception '開始日・帰所日・利用者名は必須です' using errcode = '22004';
  end if;
  if p_return_date <= p_start_date then
    raise exception '帰所日は開始日より後の日付を指定してください' using errcode = '22023';
  end if;

  v_id := 'overnight_' || replace(gen_random_uuid()::text, '-', '');

  return query
  insert into public.overnight_schedules as o (
    id, start_date, return_date, resident_name, destination, note, created_by_name, updated_by_name
  ) values (
    v_id,
    p_start_date,
    p_return_date,
    v_resident_name,
    nullif(btrim(coalesce(p_destination, '')), ''),
    nullif(btrim(coalesce(p_note, '')), ''),
    v_staff_name,
    v_staff_name
  )
  returning o.id, o.start_date, o.return_date, o.resident_name,
            o.destination, o.note, o.created_at, o.updated_at;
end;
$$;

create or replace function public.overnight_schedule_update(
  p_token text,
  p_id text,
  p_start_date date,
  p_return_date date,
  p_resident_name text,
  p_note text default null,
  p_destination text default null
)
returns table (
  id text,
  start_date date,
  return_date date,
  resident_name text,
  destination text,
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
  v_staff_id uuid;
  v_staff_name text;
begin
  v_staff_id := public.visit_session_staff(p_token);
  select s.display_name into strict v_staff_name
    from public.visit_staff as s
   where s.id = v_staff_id;

  v_resident_name := btrim(coalesce(p_resident_name, ''));
  if p_id is null or btrim(p_id) = '' or p_start_date is null
     or p_return_date is null or v_resident_name = '' then
    raise exception '予定ID・開始日・帰所日・利用者名は必須です' using errcode = '22004';
  end if;
  if p_return_date <= p_start_date then
    raise exception '帰所日は開始日より後の日付を指定してください' using errcode = '22023';
  end if;

  return query
  update public.overnight_schedules as o
     set start_date = p_start_date,
         return_date = p_return_date,
         resident_name = v_resident_name,
         destination = nullif(btrim(coalesce(p_destination, '')), ''),
         note = nullif(btrim(coalesce(p_note, '')), ''),
         updated_by_name = v_staff_name,
         updated_at = now()
   where o.id = p_id
  returning o.id, o.start_date, o.return_date, o.resident_name,
            o.destination, o.note, o.created_at, o.updated_at;

  if not found then
    raise exception '対象の外泊予定が見つかりません' using errcode = 'P0002';
  end if;
end;
$$;

drop function public.visit_schedules_by_date(text, date);

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
  updated_at timestamptz,
  created_by_name text,
  updated_by_name text
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
         v.visitor_name, v.note, v.created_at, v.updated_at,
         v.created_by_name, v.updated_by_name
    from public.visit_schedules as v
   where v.visit_date = p_visit_date
   order by v.visit_time, v.created_at;
end;
$$;

drop function public.outing_schedules_by_date(text, date);

create function public.outing_schedules_by_date(
  p_token text,
  p_outing_date date
)
returns table (
  id text,
  outing_date date,
  resident_name text,
  companion text,
  note text,
  created_at timestamptz,
  updated_at timestamptz,
  created_by_name text,
  updated_by_name text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
begin
  perform public.visit_session_staff(p_token);

  if p_outing_date is null then
    raise exception '日付を指定してください' using errcode = '22004';
  end if;

  return query
  select o.id, o.outing_date, o.resident_name, o.companion, o.note,
         o.created_at, o.updated_at,
         o.created_by_name, o.updated_by_name
    from public.outing_schedules as o
   where o.outing_date = p_outing_date
   order by o.created_at, o.id;
end;
$$;

drop function public.overnight_schedules_by_date(text, date);

create function public.overnight_schedules_by_date(
  p_token text,
  p_target_date date
)
returns table (
  id text,
  start_date date,
  return_date date,
  resident_name text,
  destination text,
  note text,
  created_at timestamptz,
  updated_at timestamptz,
  created_by_name text,
  updated_by_name text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
begin
  perform public.visit_session_staff(p_token);

  if p_target_date is null then
    raise exception '日付を指定してください' using errcode = '22004';
  end if;

  return query
  select o.id, o.start_date, o.return_date, o.resident_name,
         o.destination, o.note, o.created_at, o.updated_at,
         o.created_by_name, o.updated_by_name
    from public.overnight_schedules as o
   where o.start_date <= p_target_date
     and p_target_date < o.return_date
   order by o.start_date, o.return_date, o.created_at, o.id;
end;
$$;

-- 再作成したby_date RPCの既存実行権限を復元する。
revoke all on function public.visit_schedules_by_date(text, date) from public;
grant execute on function public.visit_schedules_by_date(text, date) to anon, authenticated;
revoke all on function public.outing_schedules_by_date(text, date) from public;
grant execute on function public.outing_schedules_by_date(text, date) to anon, authenticated;
revoke all on function public.overnight_schedules_by_date(text, date) from public;
grant execute on function public.overnight_schedules_by_date(text, date) to anon, authenticated;
