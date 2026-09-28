-- 2026_09_23_add_daily_activity_milestone_push.sql 보정. 그 파일 다음에 실행한다.
--
-- 기존 로직은 2.5배 환산값이 5단위 구간을 넘을 때마다 전체 구독자에게 푸시를 보냈다.
-- 실제 구름 2개마다 알림 1회라서, 시드 스크립트(하루 25개)만으로도 하루 약 12회의
-- 전체 알림이 나갔다. 다음과 같이 줄인다.
--   1) 알림 구간을 10, 30, 50, 100, 200, 300, 500으로 드물게 둔다.
--   2) clouds와 checkers를 합쳐 하루 최대 2회까지만 보낸다.
--   3) 시드 계정(test12~test26)의 활동은 알림을 트리거하지 않는다.
--      구간 계산에는 화면과 같은 기준으로 전체 수치를 쓴다. 푸시 문구의 숫자가
--      화면 숫자와 어긋나지 않게 하기 위해서다. 실제 사용자 활동이 있을 때만 알림이 나간다.

create or replace function public.is_seed_account(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- 시드 스크립트의 makeAuthEmail(loginId)와 같은 규칙: user-<base64url(loginId)>@dankum.app
  -- auth.users.email은 사용자가 임의로 바꿀 수 없어 user_metadata보다 안전하다.
  select exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and u.email in (
        'user-dGVzdDEy@dankum.app', 'user-dGVzdDEz@dankum.app', 'user-dGVzdDE0@dankum.app',
        'user-dGVzdDE1@dankum.app', 'user-dGVzdDE2@dankum.app', 'user-dGVzdDE3@dankum.app',
        'user-dGVzdDE4@dankum.app', 'user-dGVzdDE5@dankum.app', 'user-dGVzdDIw@dankum.app',
        'user-dGVzdDIx@dankum.app', 'user-dGVzdDIy@dankum.app', 'user-dGVzdDIz@dankum.app',
        'user-dGVzdDI0@dankum.app', 'user-dGVzdDI1@dankum.app', 'user-dGVzdDI2@dankum.app'
      )
  );
$$;

revoke all on function public.is_seed_account(uuid) from public, anon, authenticated;

-- 환산값 이하에서 가장 큰 알림 구간. 10 미만이면 0이다.
create or replace function public.daily_push_milestone_for(p_display_count integer)
returns integer
language sql
immutable
as $$
  select coalesce(max(m), 0)
  from unnest(array[10, 30, 50, 100, 200, 300, 500]) as m
  where m <= p_display_count;
$$;

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
  v_sent_today integer;
begin
  if p_milestone < 10 then
    return false;
  end if;

  -- 동시 insert가 일일 한도를 함께 통과하지 않도록 날짜 단위로 직렬화한다.
  perform pg_advisory_xact_lock(hashtext('daily_push_milestone:' || p_activity_date::text));

  select count(*)::integer into v_sent_today
  from public.daily_push_milestones
  where activity_date = p_activity_date;

  if v_sent_today >= 2 then
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
  if new.sender_user_id is null or public.is_seed_account(new.sender_user_id) then
    return new;
  end if;

  v_activity_date := (coalesce(new.created_at, now()) at time zone 'Asia/Seoul')::date;

  select count(*)::integer into v_raw_count
  from public.crush_posts
  where (created_at at time zone 'Asia/Seoul')::date = v_activity_date;

  v_display_count := ceil(v_raw_count * 2.5)::integer;
  v_threshold := public.daily_push_milestone_for(v_display_count);

  if v_threshold > 0
     and public.claim_daily_push_milestone(v_activity_date, 'clouds', v_threshold) then
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
  if new.checker_user_id is null or public.is_seed_account(new.checker_user_id) then
    return new;
  end if;

  v_activity_date := (coalesce(new.checked_at, now()) at time zone 'Asia/Seoul')::date;

  select count(distinct checker_user_id)::integer into v_raw_count
  from public.cloud_checks
  where checker_user_id is not null
    and (checked_at at time zone 'Asia/Seoul')::date = v_activity_date;

  v_display_count := ceil(v_raw_count * 2.5)::integer;
  v_threshold := public.daily_push_milestone_for(v_display_count);

  if v_threshold > 0
     and public.claim_daily_push_milestone(v_activity_date, 'checkers', v_threshold) then
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
