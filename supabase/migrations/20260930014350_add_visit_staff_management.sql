-- 面会スケジュールアプリの職員・管理者管理

-- ---------------------------------------------------------
-- 1. 管理者フラグ
-- ---------------------------------------------------------
alter table public.visit_staff
  add column if not exists is_admin boolean not null default false;

-- 直接操作は禁止し、下記のSECURITY DEFINER RPCだけを使用する。
revoke all on table public.visit_staff from public, anon, authenticated;

-- ---------------------------------------------------------
-- 2. 初期管理者登録
--    職員が0件の場合だけ、未ログイン状態から最初の管理者を作成できる。
-- ---------------------------------------------------------
create or replace function public.visit_initial_admin_create(
  p_display_name text,
  p_pin text
)
returns table (
  ok boolean,
  message text,
  staff_id uuid,
  display_name text
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_name text;
  v_staff_id uuid;
begin
  v_name := btrim(coalesce(p_display_name, ''));

  if v_name = '' then
    return query select false, '職員名を入力してください'::text,
                        null::uuid, null::text;
    return;
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return query select false, 'PINは4桁の数字で入力してください'::text,
                        null::uuid, null::text;
    return;
  end if;

  -- 同時実行でも最初の1人だけが登録されるよう直列化する。
  lock table public.visit_staff in exclusive mode;

  if exists (select 1 from public.visit_staff) then
    return query select false, '初期管理者はすでに登録されています'::text,
                        null::uuid, null::text;
    return;
  end if;

  insert into public.visit_staff (
    display_name,
    pin_hash,
    is_active,
    is_admin,
    failed_count,
    sort_order
  ) values (
    v_name,
    crypt(p_pin, gen_salt('bf', 10)),
    true,
    true,
    0,
    10
  )
  returning visit_staff.id into v_staff_id;

  return query select true, null::text, v_staff_id, v_name;
end;
$$;

-- ---------------------------------------------------------
-- 3. 内部用の管理者確認
-- ---------------------------------------------------------
create or replace function public.visit_admin_staff(p_token text)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_staff_id uuid;
begin
  v_staff_id := public.visit_session_staff(p_token);

  if not exists (
    select 1
      from public.visit_staff as s
     where s.id = v_staff_id
       and s.is_active
       and s.is_admin
  ) then
    raise exception '管理者権限が必要です' using errcode = '42501';
  end if;

  return v_staff_id;
end;
$$;

-- ---------------------------------------------------------
-- 4. 管理画面用職員一覧
-- ---------------------------------------------------------
create or replace function public.visit_staff_manage_list(p_token text)
returns table (
  id uuid,
  display_name text,
  is_active boolean,
  is_admin boolean,
  sort_order integer,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
begin
  perform public.visit_admin_staff(p_token);

  return query
  select s.id, s.display_name, s.is_active, s.is_admin,
         s.sort_order, s.created_at
    from public.visit_staff as s
   order by s.sort_order, s.display_name;
end;
$$;

-- ---------------------------------------------------------
-- 5. 職員追加
-- ---------------------------------------------------------
create or replace function public.visit_staff_add(
  p_token text,
  p_display_name text,
  p_pin text
)
returns table (
  ok boolean,
  message text,
  staff_id uuid,
  display_name text
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_name text;
  v_staff_id uuid;
  v_sort_order integer;
begin
  perform public.visit_admin_staff(p_token);
  v_name := btrim(coalesce(p_display_name, ''));

  if v_name = '' then
    return query select false, '職員名を入力してください'::text,
                        null::uuid, null::text;
    return;
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return query select false, 'PINは4桁の数字で入力してください'::text,
                        null::uuid, null::text;
    return;
  end if;

  if exists (
    select 1 from public.visit_staff as s where s.display_name = v_name
  ) then
    return query select false, '同じ職員名がすでに登録されています'::text,
                        null::uuid, null::text;
    return;
  end if;

  select coalesce(max(s.sort_order), 0) + 10
    into v_sort_order
    from public.visit_staff as s;

  insert into public.visit_staff (
    display_name,
    pin_hash,
    is_active,
    is_admin,
    failed_count,
    sort_order
  ) values (
    v_name,
    crypt(p_pin, gen_salt('bf', 10)),
    true,
    false,
    0,
    v_sort_order
  )
  returning visit_staff.id into v_staff_id;

  return query select true, null::text, v_staff_id, v_name;
exception
  when unique_violation then
    return query select false, '同じ職員名がすでに登録されています'::text,
                        null::uuid, null::text;
end;
$$;

-- ---------------------------------------------------------
-- 6. 職員PIN変更
-- ---------------------------------------------------------
create or replace function public.visit_staff_set_pin(
  p_token text,
  p_staff_id uuid,
  p_new_pin text
)
returns table (ok boolean, message text)
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
begin
  perform public.visit_admin_staff(p_token);

  if p_staff_id is null then
    return query select false, '対象職員を指定してください'::text;
    return;
  end if;

  if p_new_pin is null or p_new_pin !~ '^[0-9]{4}$' then
    return query select false, 'PINは4桁の数字で入力してください'::text;
    return;
  end if;

  update public.visit_staff as s
     set pin_hash = crypt(p_new_pin, gen_salt('bf', 10)),
         failed_count = 0,
         locked_until = null
   where s.id = p_staff_id;

  if not found then
    return query select false, '対象職員が見つかりません'::text;
    return;
  end if;

  delete from public.visit_staff_sessions as ss
   where ss.staff_id = p_staff_id;

  return query select true, null::text;
end;
$$;

-- ---------------------------------------------------------
-- 7. 職員の有効／無効切替
-- ---------------------------------------------------------
create or replace function public.visit_staff_set_active(
  p_token text,
  p_staff_id uuid,
  p_is_active boolean
)
returns table (ok boolean, message text)
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_target public.visit_staff%rowtype;
begin
  if p_staff_id is null or p_is_active is null then
    return query select false, '対象職員と有効状態を指定してください'::text;
    return;
  end if;

  -- 管理操作同士を直列化し、同時操作で有効な管理者が0人になるのを防ぐ。
  lock table public.visit_staff in share row exclusive mode;
  perform public.visit_admin_staff(p_token);

  select *
    into v_target
    from public.visit_staff as s
   where s.id = p_staff_id;

  if not found then
    return query select false, '対象職員が見つかりません'::text;
    return;
  end if;

  if not p_is_active and v_target.is_active and v_target.is_admin
     and not exists (
       select 1
         from public.visit_staff as s
        where s.is_active
          and s.is_admin
          and s.id <> p_staff_id
     ) then
    return query select false, '最後の有効な管理者は無効にできません'::text;
    return;
  end if;

  update public.visit_staff as s
     set is_active = p_is_active
   where s.id = p_staff_id;

  if not p_is_active then
    delete from public.visit_staff_sessions as ss
     where ss.staff_id = p_staff_id;
  end if;

  return query select true, null::text;
end;
$$;

-- ---------------------------------------------------------
-- 8. 管理者権限切替
-- ---------------------------------------------------------
create or replace function public.visit_staff_set_admin(
  p_token text,
  p_staff_id uuid,
  p_is_admin boolean
)
returns table (ok boolean, message text)
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_target public.visit_staff%rowtype;
begin
  if p_staff_id is null or p_is_admin is null then
    return query select false, '対象職員と管理者状態を指定してください'::text;
    return;
  end if;

  -- 管理操作同士を直列化し、同時操作で有効な管理者が0人になるのを防ぐ。
  lock table public.visit_staff in share row exclusive mode;
  perform public.visit_admin_staff(p_token);

  select *
    into v_target
    from public.visit_staff as s
   where s.id = p_staff_id;

  if not found then
    return query select false, '対象職員が見つかりません'::text;
    return;
  end if;

  if not p_is_admin and v_target.is_admin and v_target.is_active
     and not exists (
       select 1
         from public.visit_staff as s
        where s.is_active
          and s.is_admin
          and s.id <> p_staff_id
     ) then
    return query select false, '最後の有効な管理者を一般職員には変更できません'::text;
    return;
  end if;

  update public.visit_staff as s
     set is_admin = p_is_admin
   where s.id = p_staff_id;

  return query select true, null::text;
end;
$$;

-- ---------------------------------------------------------
-- 9. 関数実行権限
-- ---------------------------------------------------------
revoke all on function public.visit_admin_staff(text)
  from public, anon, authenticated;

revoke all on function public.visit_initial_admin_create(text, text) from public;
revoke all on function public.visit_staff_manage_list(text) from public;
revoke all on function public.visit_staff_add(text, text, text) from public;
revoke all on function public.visit_staff_set_pin(text, uuid, text) from public;
revoke all on function public.visit_staff_set_active(text, uuid, boolean) from public;
revoke all on function public.visit_staff_set_admin(text, uuid, boolean) from public;

grant execute on function public.visit_initial_admin_create(text, text)
  to anon, authenticated;
grant execute on function public.visit_staff_manage_list(text)
  to anon, authenticated;
grant execute on function public.visit_staff_add(text, text, text)
  to anon, authenticated;
grant execute on function public.visit_staff_set_pin(text, uuid, text)
  to anon, authenticated;
grant execute on function public.visit_staff_set_active(text, uuid, boolean)
  to anon, authenticated;
grant execute on function public.visit_staff_set_admin(text, uuid, boolean)
  to anon, authenticated;
