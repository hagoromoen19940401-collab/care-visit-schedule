-- 面会スケジュール専用テーブル
create table if not exists public.visit_schedules (
  id text primary key,
  visit_date date not null,
  visit_time time not null,
  resident_name text not null,
  visitor_name text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 日付検索、および日付内での来苑時間順取得に使用するインデックス
create index if not exists visit_schedules_visit_date_idx
  on public.visit_schedules (visit_date);

create index if not exists visit_schedules_visit_date_visit_time_idx
  on public.visit_schedules (visit_date, visit_time);

-- RLSを有効化（ポリシーは別途作成する）
alter table public.visit_schedules enable row level security;

-- 更新時にupdated_atを自動更新する関数
create or replace function public.set_visit_schedules_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 同名トリガーがない場合だけ作成する
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_visit_schedules_updated_at'
      and tgrelid = 'public.visit_schedules'::regclass
      and not tgisinternal
  ) then
    create trigger set_visit_schedules_updated_at
      before update on public.visit_schedules
      for each row
      execute function public.set_visit_schedules_updated_at();
  end if;
end;
$$;
