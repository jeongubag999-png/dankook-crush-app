-- 회원탈퇴, 신고, 차단 기능을 위한 스키마 변경
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.
-- (reports/blocks 테이블이 이미 다른 용도로 존재하더라도 필요한 컬럼만 추가합니다.)

-- 1) 회원탈퇴(탈퇴 처리) 플래그
alter table public.profiles
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz;

-- 2) 신고
create table if not exists public.reports (
  id bigint generated always as identity primary key
);

alter table public.reports
  add column if not exists reporter_user_id uuid references auth.users(id),
  add column if not exists target_type text,
  add column if not exists target_id text,
  add column if not exists target_user_id uuid,
  add column if not exists reason text,
  add column if not exists status text default 'pending',
  add column if not exists created_at timestamptz default now();

alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert to authenticated
  with check (auth.uid() = reporter_user_id);

-- 관리자 페이지는 dku_verifications와 동일하게 인증된 사용자 전체 조회 권한으로 동작함
drop policy if exists "reports_select_authenticated" on public.reports;
create policy "reports_select_authenticated" on public.reports
  for select to authenticated
  using (true);

drop policy if exists "reports_update_authenticated" on public.reports;
create policy "reports_update_authenticated" on public.reports
  for update to authenticated
  using (true)
  with check (true);

-- 3) 차단
create table if not exists public.blocks (
  id bigint generated always as identity primary key
);

alter table public.blocks
  add column if not exists blocker_user_id uuid references auth.users(id),
  add column if not exists blocked_user_id uuid references auth.users(id),
  add column if not exists created_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'blocks_blocker_blocked_unique'
  ) then
    alter table public.blocks
      add constraint blocks_blocker_blocked_unique unique (blocker_user_id, blocked_user_id);
  end if;
end $$;

alter table public.blocks enable row level security;

drop policy if exists "blocks_all_own" on public.blocks;
create policy "blocks_all_own" on public.blocks
  for all to authenticated
  using (auth.uid() = blocker_user_id)
  with check (auth.uid() = blocker_user_id);
