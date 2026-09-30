create or replace function public.visit_schedules_all(p_token text)
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

  return query
  select v.id,
         v.visit_date,
         v.visit_time,
         v.resident_name,
         v.visitor_name,
         v.note,
         v.created_at,
         v.updated_at
    from public.visit_schedules as v
   order by v.visit_date, v.visit_time, v.created_at;
end;
$$;

revoke all on function public.visit_schedules_all(text) from public;
grant execute on function public.visit_schedules_all(text) to anon, authenticated;
