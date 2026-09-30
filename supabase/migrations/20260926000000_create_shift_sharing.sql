begin;
-- =========================================================
-- Tables
-- =========================================================

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.facility_members (
  facility_id uuid not null,
  user_id uuid not null,
  staff_id text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint facility_members_pkey
    primary key (facility_id, user_id),

  constraint facility_members_facility_staff_key
    unique (facility_id, staff_id),

  constraint facility_members_facility_id_fkey
    foreign key (facility_id)
    references public.facilities (id)
    on delete restrict,

  constraint facility_members_user_id_fkey
    foreign key (user_id)
    references auth.users (id)
    on delete cascade,

  constraint facility_members_staff_id_format_check
    check (staff_id ~ '^st_[a-z0-9]{8,}$')
);
create table public.shift_shared_state (
  facility_id uuid primary key,
  payload_text text not null,

  constraint shift_shared_state_facility_id_fkey
    foreign key (facility_id)
    references public.facilities (id)
    on delete restrict,

  constraint shift_shared_state_payload_not_blank_check
    check (btrim(payload_text) <> '')
);
-- =========================================================
-- RLS lookup index
-- =========================================================

create index facility_members_user_active_facility_idx
  on public.facility_members (user_id, is_active, facility_id);
-- =========================================================
-- Row Level Security
-- =========================================================

alter table public.facilities
  enable row level security;
alter table public.facility_members
  enable row level security;
alter table public.shift_shared_state
  enable row level security;
-- =========================================================
-- Privileges
-- =========================================================

revoke all privileges
  on table public.facilities
  from anon, authenticated;
revoke all privileges
  on table public.facility_members
  from anon, authenticated;
revoke all privileges
  on table public.shift_shared_state
  from anon, authenticated;
grant select
  on table public.facilities
  to authenticated;
grant select
  on table public.facility_members
  to authenticated;
grant select
  on table public.shift_shared_state
  to authenticated;
grant update (payload_text)
  on table public.shift_shared_state
  to authenticated;
-- Trusted server-side administration only. Never expose a service-role or
-- secret key to the browser.
grant select, insert, update, delete
  on table public.facilities
  to service_role;
grant select, insert, update, delete
  on table public.facility_members
  to service_role;
grant select, insert, update, delete
  on table public.shift_shared_state
  to service_role;
-- =========================================================
-- SELECT policies
-- =========================================================

create policy facility_members_select_own
  on public.facility_members
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );
create policy facilities_select_active_membership
  on public.facilities
  for select
  to authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.facility_members as fm
      where fm.facility_id = facilities.id
        and fm.user_id = (select auth.uid())
        and fm.is_active = true
    )
  );
create policy shift_shared_state_select_active_membership
  on public.shift_shared_state
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.facility_members as fm
      join public.facilities as f
        on f.id = fm.facility_id
      where fm.facility_id = shift_shared_state.facility_id
        and fm.user_id = (select auth.uid())
        and fm.is_active = true
        and f.is_active = true
    )
  );
create policy shift_shared_state_update_active_membership
  on public.shift_shared_state
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.facility_members as fm
      join public.facilities as f
        on f.id = fm.facility_id
      where fm.facility_id = shift_shared_state.facility_id
        and fm.user_id = (select auth.uid())
        and fm.is_active = true
        and f.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.facility_members as fm
      join public.facilities as f
        on f.id = fm.facility_id
      where fm.facility_id = shift_shared_state.facility_id
        and fm.user_id = (select auth.uid())
        and fm.is_active = true
        and f.is_active = true
    )
  );
commit;
