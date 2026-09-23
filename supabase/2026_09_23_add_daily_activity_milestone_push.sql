-- 오늘 등록된 구름 수와 오늘 구름을 확인한 고유 사용자 수에 화면과 동일한 2.5배
-- 환산(ceil)을 적용하고, 환산값이 새 5단위 구간에 도달할 때 전체 푸시 구독자에게
-- 활동 알림을 보낸다. 환산값이 6처럼 경계값을 넘어 도달하면 메시지에는 5가 아니라
-- 실제 환산값 6을 표시한다.
--
-- daily_push_milestones는 같은 날짜/종류/구간의 알림이 삭제·재등록이나 동시 요청으로
-- 중복 발송되지 않도록 서버 내부에서 발송권을 한 번만 확보하는 용도다.

create table if not exists public.daily_push_milestones (
  activity_date date not null,
  metric text not null check (metric in ('clouds', 'checkers')),
  milestone integer not null check (milestone > 0 and milestone % 5 = 0),
  created_at timestamptz not null default now(),
  primary key (activity_date, metric, milestone)
);

alter table public.daily_push_milestones enable row level security;
revoke all on table public.daily_push_milestones from anon, authenticated;

create or replace function public.claim_daily_push_milestone(
  p_activity_date date,
  p_metric text,
  p_milestone integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
begin
  if p_milestone < 5 or p_milestone % 5 <> 0 then
    return false;
  end if;

  insert into public.daily_push_milestones (activity_date, metric, milestone)
  values (p_activity_date, p_metric, p_milestone)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$$;

revoke all on function public.claim_daily_push_milestone(date, text, integer) from public;

create or replace function public.trg_notify_daily_cloud_milestone_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_date date;
  v_raw_count integer;
  v_display_count integer;
  v_threshold integer;
begin
  v_activity_date := (coalesce(new.created_at, now()) at time zone 'Asia/Seoul')::date;

  select count(*)::integer into v_raw_count
  from public.crush_posts
  where (created_at at time zone 'Asia/Seoul')::date = v_activity_date;

  v_display_count := ceil(v_raw_count * 2.5)::integer;
  v_threshold := floor(v_display_count / 5.0)::integer * 5;

  if public.claim_daily_push_milestone(v_activity_date, 'clouds', v_threshold) then
    perform public.call_push_notification_webhook(
      'daily_cloud_milestone',
      jsonb_build_object(
        'activity_date', v_activity_date,
        'milestone', v_threshold,
        'display_count', v_display_count
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_daily_cloud_milestone on public.crush_posts;
create trigger trg_notify_daily_cloud_milestone
  after insert on public.crush_posts
  for each row execute function public.trg_notify_daily_cloud_milestone_fn();

create or replace function public.trg_notify_daily_checker_milestone_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_date date;
  v_raw_count integer;
  v_display_count integer;
  v_threshold integer;
begin
  v_activity_date := (coalesce(new.checked_at, now()) at time zone 'Asia/Seoul')::date;

  select count(distinct checker_user_id)::integer into v_raw_count
  from public.cloud_checks
  where checker_user_id is not null
    and (checked_at at time zone 'Asia/Seoul')::date = v_activity_date;

  v_display_count := ceil(v_raw_count * 2.5)::integer;
  v_threshold := floor(v_display_count / 5.0)::integer * 5;

  if public.claim_daily_push_milestone(v_activity_date, 'checkers', v_threshold) then
    perform public.call_push_notification_webhook(
      'daily_checker_milestone',
      jsonb_build_object(
        'activity_date', v_activity_date,
        'milestone', v_threshold,
        'display_count', v_display_count
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_daily_checker_milestone on public.cloud_checks;
create trigger trg_notify_daily_checker_milestone
  after insert on public.cloud_checks
  for each row execute function public.trg_notify_daily_checker_milestone_fn();
