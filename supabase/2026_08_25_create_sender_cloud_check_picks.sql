-- Let cloud senders review matching cloud-check records and mark likely matches.
-- Run in Supabase SQL Editor. Safe to run multiple times.

create table if not exists public.sender_cloud_check_picks (
  id bigint generated always as identity primary key
);

alter table public.sender_cloud_check_picks
  add column if not exists crush_post_id uuid references public.crush_posts(id) on delete cascade,
  add column if not exists cloud_check_id text,
  add column if not exists sender_user_id uuid references auth.users(id),
  add column if not exists checker_user_id uuid references auth.users(id),
  add column if not exists status text not null default 'interested',
  add column if not exists match_score integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sender_cloud_check_picks_unique'
  ) then
    alter table public.sender_cloud_check_picks
      add constraint sender_cloud_check_picks_unique
      unique (crush_post_id, cloud_check_id, sender_user_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sender_cloud_check_picks_status_check'
  ) then
    alter table public.sender_cloud_check_picks
      add constraint sender_cloud_check_picks_status_check
      check (status in ('interested', 'dismissed'));
  end if;
end $$;

create index if not exists idx_sender_cloud_check_picks_sender
  on public.sender_cloud_check_picks (sender_user_id);

create index if not exists idx_sender_cloud_check_picks_checker
  on public.sender_cloud_check_picks (checker_user_id);

create index if not exists idx_cloud_checks_seen_date_gender
  on public.cloud_checks (seen_date, checker_gender);

create index if not exists idx_cloud_checks_checked_at
  on public.cloud_checks (checked_at desc);

alter table public.blocks enable row level security;

drop policy if exists "blocks_select_involved" on public.blocks;
create policy "blocks_select_involved" on public.blocks
  for select to authenticated
  using (auth.uid() = blocker_user_id or auth.uid() = blocked_user_id);

alter table public.cloud_checks enable row level security;

drop policy if exists "cloud_checks_select_matching_sender" on public.cloud_checks;
create policy "cloud_checks_select_matching_sender" on public.cloud_checks
  for select to authenticated
  using (
    checker_user_id = auth.uid()
    or exists (
      select 1
      from public.crush_posts cp
      where cp.sender_user_id = auth.uid()
        and cp.seen_date = cloud_checks.seen_date
        and cp.target_gender = cloud_checks.checker_gender
        and cp.sender_user_id <> cloud_checks.checker_user_id
        and not exists (
          select 1
          from public.blocks b
          where
            (b.blocker_user_id = auth.uid() and b.blocked_user_id = cloud_checks.checker_user_id)
            or
            (b.blocker_user_id = cloud_checks.checker_user_id and b.blocked_user_id = auth.uid())
        )
    )
  );

alter table public.sender_cloud_check_picks enable row level security;

drop policy if exists "sender_cloud_check_picks_select_participant" on public.sender_cloud_check_picks;
create policy "sender_cloud_check_picks_select_participant" on public.sender_cloud_check_picks
  for select to authenticated
  using (auth.uid() = sender_user_id or auth.uid() = checker_user_id);

drop policy if exists "sender_cloud_check_picks_insert_sender" on public.sender_cloud_check_picks;
create policy "sender_cloud_check_picks_insert_sender" on public.sender_cloud_check_picks
  for insert to authenticated
  with check (
    auth.uid() = sender_user_id
    and exists (
      select 1
      from public.crush_posts cp
      where cp.id = sender_cloud_check_picks.crush_post_id
        and cp.sender_user_id = auth.uid()
    )
    and not exists (
      select 1
      from public.blocks b
      where
        (b.blocker_user_id = auth.uid() and b.blocked_user_id = sender_cloud_check_picks.checker_user_id)
        or
        (b.blocker_user_id = sender_cloud_check_picks.checker_user_id and b.blocked_user_id = auth.uid())
    )
  );

drop policy if exists "sender_cloud_check_picks_update_sender" on public.sender_cloud_check_picks;
create policy "sender_cloud_check_picks_update_sender" on public.sender_cloud_check_picks
  for update to authenticated
  using (auth.uid() = sender_user_id)
  with check (auth.uid() = sender_user_id);
