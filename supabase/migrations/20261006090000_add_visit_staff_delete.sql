-- 面会アプリの管理者専用職員削除RPC
create or replace function public.visit_staff_delete(
  p_token text,
  p_staff_id uuid
)
returns table (ok boolean, message text)
language plpgsql
volatile
security definer
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_admin_id uuid;
  v_target public.visit_staff%rowtype;
begin
  -- 既存の有効状態・管理者権限変更と同じロックで管理操作を直列化する。
  lock table public.visit_staff in share row exclusive mode;
  v_admin_id := public.visit_admin_staff(p_token);

  if p_staff_id is null then
    return query select false, '対象職員を指定してください'::text;
    return;
  end if;

  if p_staff_id = v_admin_id then
    return query select false, '自分自身は削除できません'::text;
    return;
  end if;

  select *
    into v_target
    from public.visit_staff as s
   where s.id = p_staff_id;

  if not found then
    return query select false, '対象職員が見つかりません'::text;
    return;
  end if;

  if v_target.is_active and v_target.is_admin
     and not exists (
       select 1
         from public.visit_staff as s
        where s.is_active
          and s.is_admin
          and s.id <> p_staff_id
     ) then
    return query select false, '最後の有効な管理者は削除できません'::text;
    return;
  end if;

  -- visit_staff_sessionsは既存のON DELETE CASCADEで全セッションが削除される。
  delete from public.visit_staff as s where s.id = p_staff_id;

  return query select true, null::text;
end;
$$;

revoke all on function public.visit_staff_delete(text, uuid) from public;
grant execute on function public.visit_staff_delete(text, uuid)
  to anon, authenticated;
