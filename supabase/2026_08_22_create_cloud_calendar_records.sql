-- Private cloud calendar records.
-- One row is the user's own outfit/check summary for one date.

create table if not exists public.cloud_calendar_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_date date not null,
  matched_cloud_count integer not null default 0,
  hair_feature text,
  female_hair_style text,
  female_hair_color text,
  female_hat text,
  female_bangs text,
  male_hair_style text,
  male_hair_color text,
  male_hat text,
  male_bangs text,
  top_type text,
  top_color text,
  outer_type text,
  outer_color text,
  bottom_type text,
  bottom_color text,
  shoe_type text,
  bag_type text,
  earphone_type text,
  glasses_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cloud_calendar_records_user_date_unique unique (user_id, checked_date)
);

create index if not exists idx_cloud_calendar_records_user_date
  on public.cloud_calendar_records (user_id, checked_date desc);

alter table public.cloud_calendar_records enable row level security;

drop policy if exists cloud_calendar_records_all_own
  on public.cloud_calendar_records;

create policy cloud_calendar_records_all_own
  on public.cloud_calendar_records
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
