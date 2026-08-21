-- Fix reports access and duplicate-prevention constraints.
-- Run this in Supabase SQL Editor after reviewing.
--
-- What this does:
-- 1) reports: authenticated users can only insert their own reports.
--    Only configured admins can select/update reports.
-- 2) claims: one user can respond to the same cloud only once.
-- 3) cloud_views: one viewer can be recorded once per cloud.
--
-- Admins are identified the same way as the frontend ADMIN_LOGIN_IDS.

-- Helper: keep admin checks in one place for RLS policies.
create or replace function public.is_dankkum_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'login_id', '') in (
    'pjwo12356',
    'djkim5882'
  );
$$;

-- ---------------------------------------------------------------------------
-- reports RLS: remove broad authenticated read/update policies.
-- ---------------------------------------------------------------------------
alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_insert" on public.reports;
drop policy if exists "reports_select_authenticated" on public.reports;
drop policy if exists "reports_update_authenticated" on public.reports;
drop policy if exists "reports_select_admin" on public.reports;
drop policy if exists "reports_update_admin" on public.reports;

create policy "reports_insert_own" on public.reports
  for insert to authenticated
  with check (auth.uid() = reporter_user_id);

create policy "reports_select_admin" on public.reports
  for select to authenticated
  using (public.is_dankkum_admin());

create policy "reports_update_admin" on public.reports
  for update to authenticated
  using (public.is_dankkum_admin())
  with check (public.is_dankkum_admin());

-- ---------------------------------------------------------------------------
-- Preflight checks: stop before adding unique constraints if duplicates exist.
-- Do not auto-delete/merge data. If this raises an error, inspect duplicates.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from public.claims
    where crush_post_id is not null
      and claimer_user_id is not null
    group by crush_post_id, claimer_user_id
    having count(*) > 1
  ) then
    raise exception
      'Duplicate claims exist for (crush_post_id, claimer_user_id). Resolve duplicates before adding the unique constraint.';
  end if;

  if exists (
    select 1
    from public.cloud_views
    where crush_post_id is not null
      and viewer_user_id is not null
    group by crush_post_id, viewer_user_id
    having count(*) > 1
  ) then
    raise exception
      'Duplicate cloud_views exist for (crush_post_id, viewer_user_id). Resolve duplicates before adding the unique constraint.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Unique constraints expected by the frontend upsert/duplicate-prevention flow.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'claims_crush_post_claimer_unique'
      and conrelid = 'public.claims'::regclass
  ) then
    alter table public.claims
      add constraint claims_crush_post_claimer_unique
      unique (crush_post_id, claimer_user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cloud_views_post_viewer_unique'
      and conrelid = 'public.cloud_views'::regclass
  ) then
    alter table public.cloud_views
      add constraint cloud_views_post_viewer_unique
      unique (crush_post_id, viewer_user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Verification query: shows the policies/constraints that should now exist.
-- ---------------------------------------------------------------------------
select
  'reports policies' as check_type,
  policyname as name,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'reports'
union all
select
  'unique constraints' as check_type,
  conname as name,
  'constraint' as cmd,
  pg_get_constraintdef(oid) as qual,
  null as with_check
from pg_constraint
where conrelid in ('public.claims'::regclass, 'public.cloud_views'::regclass)
  and contype = 'u'
  and conname in (
    'claims_crush_post_claimer_unique',
    'cloud_views_post_viewer_unique'
  )
order by check_type, name;
