-- 外出・外泊スケジュール

create table public.outing_schedules (
  id text primary key,
  outing_date date not null,
  resident_name text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outing_schedules_outing_date_idx
  on public.outing_schedules (outing_date);

create table public.overnight_schedules (
  id text primary key,
  start_date date not null,
  return_date date not null,
  resident_name text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint overnight_schedules_date_range_check
    check (return_date > start_date)
);

create index overnight_schedules_date_range_idx
  on public.overnight_schedules (start_date, return_date);

alter table public.outing_schedules enable row level security;
alter table public.overnight_schedules enable row level security;

revoke all on table public.outing_schedules from public, anon, authenticated;
revoke all on table public.overnight_schedules from public, anon, authenticated;

-- ---------------------------------------------------------
-- 外出予定 RPC
-- ---------------------------------------------------------
create function public.outing_schedules_by_date(
  p_token text,
  p_outing_date date
)
returns table (
  id text,
  outing_date date,
  resident_name text,
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

  if p_outing_date is null then
    raise exception '日付を指定してください' using errcode = '22004';
  end if;

  return query
  select o.id, o.outing_date, o.resident_name, o.note,
         o.created_at, o.updated_at
    from public.outing_schedules as o
   where o.outing_date = p_outing_date
   order by o.created_at, o.id;
end;
$$;

create function public.outing_schedules_by_month(
  p_token text,
  p_month_start date
)
returns table (
  id text,
  outing_date date,
  resident_name text,
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
  select o.id, o.outing_date, o.resident_name, o.note,
         o.created_at, o.updated_at
    from public.outing_schedules as o
   where o.outing_date >= v_month_start
     and o.outing_date < v_next_month_start
   order by o.outing_date, o.created_at, o.id;
end;
$$;

create function public.outing_schedules_all(p_token text)
returns table (
  id text,
  outing_date date,
  resident_name text,
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
  select o.id, o.outing_date, o.resident_name, o.note,
         o.created_at, o.updated_at
    from public.outing_schedules as o
   order by o.outing_date, o.created_at, o.id;
end;
$$;

create function public.outing_schedule_add(
  p_token text,
  p_outing_date date,
  p_resident_name text,
  p_note text default null
)
returns table (
  id text,
  outing_date date,
  resident_name text,
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
  if p_outing_date is null or v_resident_name = '' then
    raise exception '日付・利用者名は必須です' using errcode = '22004';
  end if;

  v_id := 'outing_' || replace(gen_random_uuid()::text, '-', '');

  return query
  insert into public.outing_schedules as o (
    id, outing_date, resident_name, note
  ) values (
    v_id,
    p_outing_date,
    v_resident_name,
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning o.id, o.outing_date, o.resident_name, o.note,
            o.created_at, o.updated_at;
end;
$$;

create function public.outing_schedule_update(
  p_token text,
  p_id text,
  p_outing_date date,
  p_resident_name text,
  p_note text default null
)
returns table (
  id text,
  outing_date date,
  resident_name text,
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
  if p_id is null or btrim(p_id) = '' or p_outing_date is null
     or v_resident_name = '' then
    raise exception '予定ID・日付・利用者名は必須です' using errcode = '22004';
  end if;

  return query
  update public.outing_schedules as o
     set outing_date = p_outing_date,
         resident_name = v_resident_name,
         note = nullif(btrim(coalesce(p_note, '')), ''),
         updated_at = now()
   where o.id = p_id
  returning o.id, o.outing_date, o.resident_name, o.note,
            o.created_at, o.updated_at;

  if not found then
    raise exception '対象の外出予定が見つかりません' using errcode = 'P0002';
  end if;
end;
$$;

create function public.outing_schedule_delete(
  p_token text,
  p_id text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_deleted integer;
begin
  perform public.visit_session_staff(p_token);

  if p_id is null or btrim(p_id) = '' then
    raise exception '予定IDを指定してください' using errcode = '22004';
  end if;

  delete from public.outing_schedules as o where o.id = p_id;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

-- ---------------------------------------------------------
-- 外泊予定 RPC
-- return_date は帰所日であり、外泊対象日には含めない。
-- ---------------------------------------------------------
create function public.overnight_schedules_by_date(
  p_token text,
  p_target_date date
)
returns table (
  id text,
  start_date date,
  return_date date,
  resident_name text,
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

  if p_target_date is null then
    raise exception '日付を指定してください' using errcode = '22004';
  end if;

  return query
  select o.id, o.start_date, o.return_date, o.resident_name, o.note,
         o.created_at, o.updated_at
    from public.overnight_schedules as o
   where o.start_date <= p_target_date
     and p_target_date < o.return_date
   order by o.start_date, o.return_date, o.created_at, o.id;
end;
$$;

create function public.overnight_schedules_by_month(
  p_token text,
  p_month_start date
)
returns table (
  id text,
  start_date date,
  return_date date,
  resident_name text,
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
  select o.id, o.start_date, o.return_date, o.resident_name, o.note,
         o.created_at, o.updated_at
    from public.overnight_schedules as o
   where o.start_date < v_next_month_start
     and o.return_date > v_month_start
   order by o.start_date, o.return_date, o.created_at, o.id;
end;
$$;

create function public.overnight_schedules_all(p_token text)
returns table (
  id text,
  start_date date,
  return_date date,
  resident_name text,
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
  select o.id, o.start_date, o.return_date, o.resident_name, o.note,
         o.created_at, o.updated_at
    from public.overnight_schedules as o
   order by o.start_date, o.return_date, o.created_at, o.id;
end;
$$;

create function public.overnight_schedule_add(
  p_token text,
  p_start_date date,
  p_return_date date,
  p_resident_name text,
  p_note text default null
)
returns table (
  id text,
  start_date date,
  return_date date,
  resident_name text,
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
  if p_start_date is null or p_return_date is null or v_resident_name = '' then
    raise exception '開始日・帰所日・利用者名は必須です' using errcode = '22004';
  end if;
  if p_return_date <= p_start_date then
    raise exception '帰所日は開始日より後の日付を指定してください' using errcode = '22023';
  end if;

  v_id := 'overnight_' || replace(gen_random_uuid()::text, '-', '');

  return query
  insert into public.overnight_schedules as o (
    id, start_date, return_date, resident_name, note
  ) values (
    v_id,
    p_start_date,
    p_return_date,
    v_resident_name,
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning o.id, o.start_date, o.return_date, o.resident_name, o.note,
            o.created_at, o.updated_at;
end;
$$;

create function public.overnight_schedule_update(
  p_token text,
  p_id text,
  p_start_date date,
  p_return_date date,
  p_resident_name text,
  p_note text default null
)
returns table (
  id text,
  start_date date,
  return_date date,
  resident_name text,
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
         note = nullif(btrim(coalesce(p_note, '')), ''),
         updated_at = now()
   where o.id = p_id
  returning o.id, o.start_date, o.return_date, o.resident_name, o.note,
            o.created_at, o.updated_at;

  if not found then
    raise exception '対象の外泊予定が見つかりません' using errcode = 'P0002';
  end if;
end;
$$;

create function public.overnight_schedule_delete(
  p_token text,
  p_id text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_deleted integer;
begin
  perform public.visit_session_staff(p_token);

  if p_id is null or btrim(p_id) = '' then
    raise exception '予定IDを指定してください' using errcode = '22004';
  end if;

  delete from public.overnight_schedules as o where o.id = p_id;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

-- ---------------------------------------------------------
-- RPC 実行権限
-- ---------------------------------------------------------
revoke all on function public.outing_schedules_by_date(text, date) from public;
revoke all on function public.outing_schedules_by_month(text, date) from public;
revoke all on function public.outing_schedules_all(text) from public;
revoke all on function public.outing_schedule_add(text, date, text, text) from public;
revoke all on function public.outing_schedule_update(text, text, date, text, text) from public;
revoke all on function public.outing_schedule_delete(text, text) from public;

revoke all on function public.overnight_schedules_by_date(text, date) from public;
revoke all on function public.overnight_schedules_by_month(text, date) from public;
revoke all on function public.overnight_schedules_all(text) from public;
revoke all on function public.overnight_schedule_add(text, date, date, text, text) from public;
revoke all on function public.overnight_schedule_update(text, text, date, date, text, text) from public;
revoke all on function public.overnight_schedule_delete(text, text) from public;

grant execute on function public.outing_schedules_by_date(text, date) to anon, authenticated;
grant execute on function public.outing_schedules_by_month(text, date) to anon, authenticated;
grant execute on function public.outing_schedules_all(text) to anon, authenticated;
grant execute on function public.outing_schedule_add(text, date, text, text) to anon, authenticated;
grant execute on function public.outing_schedule_update(text, text, date, text, text) to anon, authenticated;
grant execute on function public.outing_schedule_delete(text, text) to anon, authenticated;

grant execute on function public.overnight_schedules_by_date(text, date) to anon, authenticated;
grant execute on function public.overnight_schedules_by_month(text, date) to anon, authenticated;
grant execute on function public.overnight_schedules_all(text) to anon, authenticated;
grant execute on function public.overnight_schedule_add(text, date, date, text, text) to anon, authenticated;
grant execute on function public.overnight_schedule_update(text, text, date, date, text, text) to anon, authenticated;
grant execute on function public.overnight_schedule_delete(text, text) to anon, authenticated;
