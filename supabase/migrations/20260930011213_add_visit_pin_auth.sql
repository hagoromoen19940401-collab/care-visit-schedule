-- 面会スケジュールアプリ専用の職員選択＋PIN認証基盤
-- app-shareと同じく、PIN確認後に独自セッショントークンを発行し、
-- visit_schedulesはSECURITY DEFINERのRPC経由でのみ操作する。

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------
-- 1. 面会アプリ用職員
-- ---------------------------------------------------------
create table if not exists public.visit_staff (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  pin_hash text not null,
  is_active boolean not null default true,
  failed_count integer not null default 0 check (failed_count >= 0),
  locked_until timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_staff_display_name_not_blank check (btrim(display_name) <> '')
);

create unique index if not exists visit_staff_display_name_idx
  on public.visit_staff (display_name);

create index if not exists visit_staff_active_sort_idx
  on public.visit_staff (is_active, sort_order, display_name);

create or replace function public.visit_set_staff_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
      from pg_trigger
     where tgname = 'visit_staff_set_updated_at'
       and tgrelid = 'public.visit_staff'::regclass
       and not tgisinternal
  ) then
    create trigger visit_staff_set_updated_at
      before update on public.visit_staff
      for each row
      execute function public.visit_set_staff_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------
-- 2. 独自セッション
--    ブラウザへ返すトークン本体は保存せず、SHA-256ハッシュのみ保持する。
-- ---------------------------------------------------------
create table if not exists public.visit_staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.visit_staff (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists visit_staff_sessions_staff_id_idx
  on public.visit_staff_sessions (staff_id);

create index if not exists visit_staff_sessions_expires_at_idx
  on public.visit_staff_sessions (expires_at);

alter table public.visit_staff enable row level security;
alter table public.visit_staff_sessions enable row level security;

revoke all on table public.visit_staff from public, anon, authenticated;
revoke all on table public.visit_staff_sessions from public, anon, authenticated;

-- ---------------------------------------------------------
-- 3. 内部用セッション確認
--    公開実行権限は付与せず、下記RPCからだけ呼び出す。
-- ---------------------------------------------------------
create or replace function public.visit_session_staff(p_token text)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_staff_id uuid;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'ログインが必要です' using errcode = '28000';
  end if;

  select s.staff_id
    into v_staff_id
    from public.visit_staff_sessions as s
    join public.visit_staff as st on st.id = s.staff_id
   where s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
     and s.expires_at > now()
     and st.is_active;

  if v_staff_id is null then
    raise exception 'ログインが必要です' using errcode = '28000';
  end if;

  return v_staff_id;
end;
$$;

-- ---------------------------------------------------------
-- 4. 職員一覧・PINログイン・ログアウト
-- ---------------------------------------------------------
create or replace function public.visit_staff_list()
returns table (id uuid, display_name text)
language sql
stable
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
  select s.id, s.display_name
    from public.visit_staff as s
   where s.is_active
   order by s.sort_order, s.display_name;
$$;

create or replace function public.visit_login(p_staff_id uuid, p_pin text)
returns table (
  ok boolean,
  message text,
  token text,
  staff_id uuid,
  display_name text,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_staff public.visit_staff%rowtype;
  v_failed integer;
  v_token text;
  v_expires timestamptz;
begin
  delete from public.visit_staff_sessions as s where s.expires_at < now();

  if p_staff_id is null or p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return query select false, '職員名またはPINが違います'::text,
                        null::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  select *
    into v_staff
    from public.visit_staff as s
   where s.id = p_staff_id
   for update;

  if not found or not v_staff.is_active then
    return query select false, '職員名またはPINが違います'::text,
                        null::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  if v_staff.locked_until is not null then
    if v_staff.locked_until > now() then
      return query select false, 'PINの入力を続けて間違えたため、しばらく利用できません'::text,
                          null::text, null::uuid, null::text, null::timestamptz;
      return;
    end if;

    update public.visit_staff as s
       set failed_count = 0,
           locked_until = null
     where s.id = v_staff.id;

    v_staff.failed_count := 0;
    v_staff.locked_until := null;
  end if;

  if crypt(p_pin, v_staff.pin_hash) <> v_staff.pin_hash then
    v_failed := v_staff.failed_count + 1;

    update public.visit_staff as s
       set failed_count = v_failed,
           locked_until = case
                            when v_failed >= 5 then now() + interval '5 minutes'
                            else null
                          end
     where s.id = v_staff.id;

    return query select false, '職員名またはPINが違います'::text,
                        null::text, null::uuid, null::text, null::timestamptz;
    return;
  end if;

  update public.visit_staff as s
     set failed_count = 0,
         locked_until = null
   where s.id = v_staff.id;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires := now() + interval '12 hours';

  insert into public.visit_staff_sessions (staff_id, token_hash, expires_at)
  values (v_staff.id, encode(digest(v_token, 'sha256'), 'hex'), v_expires);

  return query select true, null::text, v_token, v_staff.id,
                      v_staff.display_name, v_expires;
end;
$$;

create or replace function public.visit_logout(p_token text)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_deleted integer;
begin
  if p_token is null or length(p_token) < 32 then
    return false;
  end if;

  delete from public.visit_staff_sessions as s
   where s.token_hash = encode(digest(p_token, 'sha256'), 'hex');

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

-- ---------------------------------------------------------
-- 5. 面会予定RPC
-- ---------------------------------------------------------
create or replace function public.visit_schedules_by_date(
  p_token text,
  p_visit_date date
)
returns table (
  id text,
  visit_date date,
  visit_time time,
  resident_name text,
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
  select v.id, v.visit_date, v.visit_time, v.resident_name,
         v.visitor_name, v.note, v.created_at, v.updated_at
    from public.visit_schedules as v
   where v.visit_date = p_visit_date
   order by v.visit_time, v.created_at;
end;
$$;

create or replace function public.visit_schedule_add(
  p_token text,
  p_visit_date date,
  p_visit_time time,
  p_resident_name text,
  p_visitor_name text default null,
  p_note text default null
)
returns table (
  id text,
  visit_date date,
  visit_time time,
  resident_name text,
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

  v_id := 'visit_' || replace(gen_random_uuid()::text, '-', '');

  return query
  insert into public.visit_schedules as v (
    id, visit_date, visit_time, resident_name, visitor_name, note
  ) values (
    v_id,
    p_visit_date,
    p_visit_time,
    v_resident_name,
    nullif(btrim(coalesce(p_visitor_name, '')), ''),
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning v.id, v.visit_date, v.visit_time, v.resident_name,
            v.visitor_name, v.note, v.created_at, v.updated_at;
end;
$$;

create or replace function public.visit_schedule_update(
  p_token text,
  p_id text,
  p_visit_date date,
  p_visit_time time,
  p_resident_name text,
  p_visitor_name text default null,
  p_note text default null
)
returns table (
  id text,
  visit_date date,
  visit_time time,
  resident_name text,
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

  return query
  update public.visit_schedules as v
     set visit_date = p_visit_date,
         visit_time = p_visit_time,
         resident_name = v_resident_name,
         visitor_name = nullif(btrim(coalesce(p_visitor_name, '')), ''),
         note = nullif(btrim(coalesce(p_note, '')), ''),
         updated_at = now()
   where v.id = p_id
  returning v.id, v.visit_date, v.visit_time, v.resident_name,
            v.visitor_name, v.note, v.created_at, v.updated_at;

  if not found then
    raise exception '対象の面会予定が見つかりません' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.visit_schedule_delete(
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

  delete from public.visit_schedules as v where v.id = p_id;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

-- ---------------------------------------------------------
-- 6. visit_schedulesの直接アクセスを遮断
--    Supabase Authを使わないため、以前のauthenticated向けポリシーを削除する。
-- ---------------------------------------------------------
drop policy if exists visit_schedules_authenticated_select
  on public.visit_schedules;
drop policy if exists visit_schedules_authenticated_insert
  on public.visit_schedules;
drop policy if exists visit_schedules_authenticated_update
  on public.visit_schedules;
drop policy if exists visit_schedules_authenticated_delete
  on public.visit_schedules;

alter table public.visit_schedules enable row level security;
revoke all on table public.visit_schedules from public, anon, authenticated;

-- ---------------------------------------------------------
-- 7. RPC実行権限
-- ---------------------------------------------------------
revoke all on function public.visit_set_staff_updated_at() from public, anon, authenticated;
revoke all on function public.visit_session_staff(text) from public, anon, authenticated;

revoke all on function public.visit_staff_list() from public;
revoke all on function public.visit_login(uuid, text) from public;
revoke all on function public.visit_logout(text) from public;
revoke all on function public.visit_schedules_by_date(text, date) from public;
revoke all on function public.visit_schedule_add(text, date, time, text, text, text) from public;
revoke all on function public.visit_schedule_update(text, text, date, time, text, text, text) from public;
revoke all on function public.visit_schedule_delete(text, text) from public;

grant execute on function public.visit_staff_list() to anon, authenticated;
grant execute on function public.visit_login(uuid, text) to anon, authenticated;
grant execute on function public.visit_logout(text) to anon, authenticated;
grant execute on function public.visit_schedules_by_date(text, date) to anon, authenticated;
grant execute on function public.visit_schedule_add(text, date, time, text, text, text) to anon, authenticated;
grant execute on function public.visit_schedule_update(text, text, date, time, text, text, text) to anon, authenticated;
grant execute on function public.visit_schedule_delete(text, text) to anon, authenticated;
