create or replace function public.visit_schedules_by_month(
  p_token text,
  p_month_start date
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
  select v.id, v.visit_date, v.visit_time, v.resident_name,
         v.visitor_name, v.note, v.created_at, v.updated_at
    from public.visit_schedules as v
   where v.visit_date >= v_month_start
     and v.visit_date < v_next_month_start
   order by v.visit_date, v.visit_time, v.created_at;
end;
$$;

revoke all on function public.visit_schedules_by_month(text, date) from public;
grant execute on function public.visit_schedules_by_month(text, date)
  to anon, authenticated;
