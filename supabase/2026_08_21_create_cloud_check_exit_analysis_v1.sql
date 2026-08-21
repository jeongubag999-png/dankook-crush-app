-- Track where users leave the cloud-check flow.
-- One row represents one cloud-check attempt. Step times are cumulative.

create table if not exists public.cloud_check_exit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  nickname text,
  checker_gender text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  completed boolean not null default false,
  exit_step integer,
  exit_step_name text,
  exit_type text,
  total_seconds integer not null default 0,
  step_1_seconds integer not null default 0,
  step_2_seconds integer not null default 0,
  step_3_seconds integer not null default 0,
  step_4_seconds integer not null default 0,
  step_5_seconds integer not null default 0,
  previous_count integer not null default 0,
  previous_steps text,
  result_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cloud_check_exit_logs_exit_step_check
    check (exit_step is null or exit_step between 1 and 5),
  constraint cloud_check_exit_logs_seconds_check
    check (
      total_seconds between 0 and 180
      and step_1_seconds between 0 and 180
      and step_2_seconds between 0 and 180
      and step_3_seconds between 0 and 180
      and step_4_seconds between 0 and 180
      and step_5_seconds between 0 and 180
    )
);

create index if not exists idx_cloud_check_exit_logs_user_id
  on public.cloud_check_exit_logs (user_id);

create index if not exists idx_cloud_check_exit_logs_started_at
  on public.cloud_check_exit_logs (started_at desc);

alter table public.cloud_check_exit_logs enable row level security;

drop policy if exists cloud_check_exit_logs_insert_own
  on public.cloud_check_exit_logs;
drop policy if exists cloud_check_exit_logs_select_own
  on public.cloud_check_exit_logs;
drop policy if exists cloud_check_exit_logs_update_own
  on public.cloud_check_exit_logs;

create policy cloud_check_exit_logs_insert_own
  on public.cloud_check_exit_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy cloud_check_exit_logs_select_own
  on public.cloud_check_exit_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy cloud_check_exit_logs_update_own
  on public.cloud_check_exit_logs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.format_cloud_send_seconds(seconds integer)
returns text
language sql
stable
as $$
  select case
    when seconds is null or seconds <= 0 then null
    when seconds >= 180 then '180+'
    else seconds::text
  end;
$$;

drop view if exists public."관리_구름확인하기_이탈분석_V1";

create view public."관리_구름확인하기_이탈분석_V1" as
select
  l.id as "기록번호",
  l.nickname as "나간 사람 닉네임",
  l.user_id as "나간 사람 id",
  l.checker_gender as "확인한 사람 성별",
  l.exit_step as "마지막으로 머문 단계",
  public.format_cloud_send_seconds(l.total_seconds) as "총 걸린 시간",
  public.format_cloud_send_seconds(l.step_1_seconds) as "1페이지에 머문시간",
  public.format_cloud_send_seconds(l.step_2_seconds) as "2페이지에 머문시간",
  public.format_cloud_send_seconds(l.step_3_seconds) as "3페이지에 머문시간",
  public.format_cloud_send_seconds(l.step_4_seconds) as "4페이지에 머문시간",
  public.format_cloud_send_seconds(l.step_5_seconds) as "5페이지에 머문시간",
  l.previous_count as "이전버튼 누른 횟수",
  l.previous_steps as "이전버튼 누른 단계",
  case
    when l.completed then '완료'
    else '이탈'
  end as "완료여부",
  l.exit_type as "나간 방식",
  l.result_count as "검색결과 개수",
  to_char(l.started_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "시작시간",
  to_char(l.ended_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "종료시간"
from public.cloud_check_exit_logs l
order by coalesce(l.ended_at, l.updated_at, l.started_at) desc;
