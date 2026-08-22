-- Admin growth, usage, funnel, retention, and quality metrics for Dankkum.
-- This file only adds analytics log tables and read-only admin views.

create or replace function public.dankkum_rate_percent(numerator numeric, denominator numeric)
returns numeric
language sql
stable
as $$
  select case
    when denominator is null or denominator = 0 then null
    else round((numerator / denominator) * 100, 2)
  end;
$$;

-- 1) Raw logs that the app can start writing from now on.
-- Existing business tables are used for historical funnel/quality metrics below.

create table if not exists public.app_session_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  login_id text,
  session_started_at timestamptz not null default now(),
  session_ended_at timestamptz,
  app_version text,
  platform text,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_session_logs_user_id
  on public.app_session_logs (user_id);

create index if not exists idx_app_session_logs_started_at
  on public.app_session_logs (session_started_at desc);

alter table public.app_session_logs enable row level security;

drop policy if exists app_session_logs_insert_own on public.app_session_logs;
drop policy if exists app_session_logs_select_own on public.app_session_logs;

create policy app_session_logs_insert_own
  on public.app_session_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy app_session_logs_select_own
  on public.app_session_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.menu_click_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  login_id text,
  menu_group text not null default '기타',
  menu_name text not null,
  feature_name text,
  clicked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_click_logs_user_id
  on public.menu_click_logs (user_id);

create index if not exists idx_menu_click_logs_clicked_at
  on public.menu_click_logs (clicked_at desc);

create index if not exists idx_menu_click_logs_menu
  on public.menu_click_logs (menu_group, menu_name, feature_name);

alter table public.menu_click_logs enable row level security;

drop policy if exists menu_click_logs_insert_own on public.menu_click_logs;
drop policy if exists menu_click_logs_select_own on public.menu_click_logs;

create policy menu_click_logs_insert_own
  on public.menu_click_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy menu_click_logs_select_own
  on public.menu_click_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.app_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  login_id text,
  error_area text not null default '기타',
  error_name text,
  error_message text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_app_error_logs_user_id
  on public.app_error_logs (user_id);

create index if not exists idx_app_error_logs_occurred_at
  on public.app_error_logs (occurred_at desc);

alter table public.app_error_logs enable row level security;

drop policy if exists app_error_logs_insert_own on public.app_error_logs;
drop policy if exists app_error_logs_select_own on public.app_error_logs;

create policy app_error_logs_insert_own
  on public.app_error_logs
  for insert
  to authenticated
  with check (user_id is null or auth.uid() = user_id);

create policy app_error_logs_select_own
  on public.app_error_logs
  for select
  to authenticated
  using (user_id is null or auth.uid() = user_id);

-- 2) 접속/활성도

drop view if exists public."관리_활성도방문빈도_접속활성도_아이디별_V1";

create view public."관리_활성도방문빈도_접속활성도_아이디별_V1" as
with sessions as (
  select
    user_id,
    (session_started_at at time zone 'Asia/Seoul')::date as session_date,
    session_started_at
  from public.app_session_logs
),
per_user as (
  select
    user_id,
    count(*)::numeric as total_session_count,
    count(distinct session_date)::numeric as active_day_count,
    min(session_started_at) as first_session_at,
    max(session_started_at) as last_session_at,
    count(*) filter (
      where session_date >= ((now() at time zone 'Asia/Seoul')::date - 6)
    )::numeric as recent_7_day_session_count,
    count(*) filter (
      where session_date >= ((now() at time zone 'Asia/Seoul')::date - 29)
    )::numeric as recent_30_day_session_count
  from sessions
  group by user_id
)
select
  p.user_id as "아이디",
  p.nickname as "닉네임",
  coalesce(per_user.total_session_count, 0) as "아이디별_총접속횟수",
  round(
    coalesce(per_user.total_session_count, 0)
      / nullif(per_user.active_day_count, 0),
    2
  ) as "아이디별_평균접속횟수",
  coalesce(per_user.active_day_count, 0) as "접속한날수",
  to_char(per_user.first_session_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "첫접속시간",
  to_char(per_user.last_session_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "마지막접속시간",
  coalesce(per_user.recent_7_day_session_count, 0) as "최근7일_접속횟수",
  coalesce(per_user.recent_30_day_session_count, 0) as "최근30일_접속횟수",
  case
    when per_user.last_session_at is null then null
    else ((now() at time zone 'Asia/Seoul')::date - (per_user.last_session_at at time zone 'Asia/Seoul')::date)
  end as "미접속일수"
from public.profiles p
left join per_user
  on per_user.user_id = p.user_id
order by coalesce(per_user.last_session_at, 'epoch'::timestamptz) desc, p.nickname;

drop view if exists public."요약_활성도방문빈도_접속활성도_요약_V1";

create view public."요약_활성도방문빈도_접속활성도_요약_V1" as
with 기준 as (
  select (now() at time zone 'Asia/Seoul')::date as 기준일
),
users as (
  select user_id
  from public.profiles
),
sessions as (
  select
    user_id,
    (session_started_at at time zone 'Asia/Seoul')::date as session_date
  from public.app_session_logs
),
per_user as (
  select
    u.user_id,
    count(s.user_id)::numeric as total_session_count,
    count(distinct s.session_date)::numeric as active_day_count,
    max(s.session_date) as last_session_date
  from users u
  left join sessions s
    on s.user_id = u.user_id
  group by u.user_id
),
summary as (
  select
    기준.기준일,
    count(distinct users.user_id)::numeric as total_user_count,
    count(distinct sessions.user_id) filter (
      where sessions.session_date = 기준.기준일
    )::numeric as dau,
    count(distinct sessions.user_id) filter (
      where sessions.session_date between 기준.기준일 - 6 and 기준.기준일
    )::numeric as wau,
    count(distinct sessions.user_id) filter (
      where sessions.session_date between 기준.기준일 - 29 and 기준.기준일
    )::numeric as mau,
    count(distinct users.user_id) filter (
      where per_user.total_session_count >= 2
    )::numeric as return_user_count,
    count(distinct users.user_id) filter (
      where per_user.last_session_date is null
         or per_user.last_session_date < 기준.기준일 - 6
    )::numeric as inactive_7_day_user_count,
    count(distinct users.user_id) filter (
      where per_user.last_session_date is null
         or per_user.last_session_date < 기준.기준일 - 29
    )::numeric as inactive_30_day_user_count,
    round(avg(per_user.total_session_count), 2) as avg_session_count_per_user
  from 기준
  left join users
    on true
  left join sessions
    on sessions.user_id = users.user_id
  left join per_user
    on per_user.user_id = users.user_id
  group by 기준.기준일
)
select
  기준일 as "기준일",
  total_user_count as "전체사용자수",
  dau as "DAU_아이디중복X",
  wau as "WAU_아이디중복X",
  mau as "MAU_아이디중복X",
  public.dankkum_rate_percent(dau, mau) as "Stickiness_DAU_MAU_percent",
  return_user_count as "재방문사용자수",
  public.dankkum_rate_percent(return_user_count, total_user_count) as "재방문율_percent",
  inactive_7_day_user_count as "최근7일_미접속사용자수",
  inactive_30_day_user_count as "최근30일_미접속사용자수",
  avg_session_count_per_user as "아이디별_평균접속횟수"
from summary;

-- 3) 메뉴/기능 사용량

drop view if exists public."관리_활성도방문빈도_메뉴기능사용량_TOP10_V1";
drop view if exists public."관리_활성도방문빈도_메뉴기능사용량_저사용메뉴_V1";
drop view if exists public."관리_활성도방문빈도_메뉴기능사용량_메뉴별_V1";

create view public."관리_활성도방문빈도_메뉴기능사용량_메뉴별_V1" as
with total as (
  select count(*)::numeric as total_click_count
  from public.menu_click_logs
),
menu_stats as (
  select
    coalesce(menu_group, '기타') as menu_group,
    menu_name,
    coalesce(feature_name, menu_name) as feature_name,
    count(*)::numeric as click_count,
    count(distinct user_id)::numeric as unique_user_count,
    max(clicked_at) as last_clicked_at
  from public.menu_click_logs
  group by coalesce(menu_group, '기타'), menu_name, coalesce(feature_name, menu_name)
)
select
  menu_group as "큰분류",
  menu_name as "메뉴명",
  feature_name as "기능명",
  click_count as "메뉴별_총클릭수_아이디중복O",
  unique_user_count as "메뉴별_클릭한고유사용자수_아이디중복X",
  round(click_count / nullif(unique_user_count, 0), 2) as "사용자1명당_평균클릭수",
  public.dankkum_rate_percent(click_count, total.total_click_count) as "메뉴별_클릭비중_percent",
  to_char(last_clicked_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "마지막클릭시간"
from menu_stats
cross join total
order by click_count desc, unique_user_count desc, menu_group, menu_name;

drop view if exists public."관리_활성도방문빈도_메뉴기능사용량_아이디별_V1";

create view public."관리_활성도방문빈도_메뉴기능사용량_아이디별_V1" as
select
  m.user_id as "아이디",
  p.nickname as "닉네임",
  coalesce(m.menu_group, '기타') as "큰분류",
  m.menu_name as "메뉴명",
  coalesce(m.feature_name, m.menu_name) as "기능명",
  count(*)::numeric as "아이디별_메뉴클릭수",
  min(m.clicked_at at time zone 'Asia/Seoul') as "첫클릭시간",
  max(m.clicked_at at time zone 'Asia/Seoul') as "마지막클릭시간"
from public.menu_click_logs m
left join public.profiles p
  on p.user_id = m.user_id
group by m.user_id, p.nickname, coalesce(m.menu_group, '기타'), m.menu_name, coalesce(m.feature_name, m.menu_name)
order by "아이디별_메뉴클릭수" desc, "마지막클릭시간" desc;

create view public."관리_활성도방문빈도_메뉴기능사용량_TOP10_V1" as
select *
from public."관리_활성도방문빈도_메뉴기능사용량_메뉴별_V1"
order by "메뉴별_총클릭수_아이디중복O" desc
limit 10;

create view public."관리_활성도방문빈도_메뉴기능사용량_저사용메뉴_V1" as
select *
from public."관리_활성도방문빈도_메뉴기능사용량_메뉴별_V1"
where "메뉴별_총클릭수_아이디중복O" <= 5
order by "메뉴별_총클릭수_아이디중복O" asc, "메뉴별_클릭한고유사용자수_아이디중복X" asc;

-- 4) 퍼널/전환율

drop view if exists public."요약_퍼널전환율_요약_V1";

create view public."요약_퍼널전환율_요약_V1" as
with
send_flow as (
  select
    count(*)::numeric as start_count,
    count(*) filter (where completed)::numeric as complete_count
  from public.cloud_send_exit_logs
),
check_flow as (
  select
    count(*)::numeric as start_count,
    count(*) filter (where completed)::numeric as complete_count,
    count(*) filter (where completed and coalesce(result_count, 0) = 0)::numeric as zero_result_count
  from public.cloud_check_exit_logs
),
result_exposure as (
  select count(*)::numeric as exposure_count
  from public.cloud_views
),
result_claims as (
  select
    count(*)::numeric as claim_count,
    count(*) filter (where status = 'accepted')::numeric as accepted_claim_count
  from public.claims
)
select
  '퍼널/전환율' as "큰분류",
  '구름 보내기' as "소분류",
  '구름 보내기 시작 수' as "지표명",
  send_flow.start_count as "값",
  null::numeric as "비율_percent",
  '구름 보내기를 시작한 전체 기록 수' as "설명"
from send_flow

union all

select
  '퍼널/전환율',
  '구름 보내기',
  '구름 보내기 완료 수',
  send_flow.complete_count,
  null::numeric,
  '구름 보내기를 끝까지 완료한 기록 수'
from send_flow

union all

select
  '퍼널/전환율',
  '구름 보내기',
  '구름 보내기 완료율',
  send_flow.complete_count,
  public.dankkum_rate_percent(send_flow.complete_count, send_flow.start_count),
  '구름 보내기 시작 대비 완료 비율'
from send_flow

union all

select
  '퍼널/전환율',
  '구름 확인하기',
  '구름 확인하기 시작 수',
  check_flow.start_count,
  null::numeric,
  '구름 확인하기를 시작한 전체 기록 수'
from check_flow

union all

select
  '퍼널/전환율',
  '구름 확인하기',
  '구름 확인하기 완료 수',
  check_flow.complete_count,
  null::numeric,
  '구름 확인하기를 끝까지 완료한 기록 수'
from check_flow

union all

select
  '퍼널/전환율',
  '구름 확인하기',
  '구름 확인하기 완료율',
  check_flow.complete_count,
  public.dankkum_rate_percent(check_flow.complete_count, check_flow.start_count),
  '구름 확인하기 시작 대비 완료 비율'
from check_flow

union all

select
  '퍼널/전환율',
  '검색 결과',
  '구름 확인 결과 클릭률',
  result_claims.claim_count,
  public.dankkum_rate_percent(result_claims.claim_count, result_exposure.exposure_count),
  '검색 결과로 노출된 구름 중 응답으로 이어진 비율'
from result_claims
cross join result_exposure

union all

select
  '퍼널/전환율',
  '응답',
  '응답 전환율',
  result_claims.claim_count,
  public.dankkum_rate_percent(result_claims.claim_count, check_flow.complete_count),
  '구름 확인 완료 기록 대비 응답 생성 비율'
from result_claims
cross join check_flow

union all

select
  '퍼널/전환율',
  '매칭',
  '매칭 전환율',
  result_claims.accepted_claim_count,
  public.dankkum_rate_percent(result_claims.accepted_claim_count, result_claims.claim_count),
  '응답한 구름 중 수락되어 매칭된 비율'
from result_claims;

-- 5) 리텐션

drop view if exists public."요약_리텐션_요약_V1";

create view public."요약_리텐션_요약_V1" as
with sessions as (
  select
    user_id,
    (session_started_at at time zone 'Asia/Seoul')::date as session_date
  from public.app_session_logs
),
first_sessions as (
  select
    user_id,
    min(session_date) as first_session_date
  from sessions
  group by user_id
),
cohort as (
  select
    f.user_id,
    f.first_session_date,
    exists (
      select 1
      from sessions s
      where s.user_id = f.user_id
        and s.session_date = f.first_session_date + 1
    ) as d1_returned,
    exists (
      select 1
      from sessions s
      where s.user_id = f.user_id
        and s.session_date between f.first_session_date + 1 and f.first_session_date + 7
    ) as d7_returned,
    exists (
      select 1
      from sessions s
      where s.user_id = f.user_id
        and s.session_date between f.first_session_date + 1 and f.first_session_date + 30
    ) as d30_returned
  from first_sessions f
),
send_first as (
  select
    user_id,
    min((started_at at time zone 'Asia/Seoul')::date) as first_send_date
  from public.cloud_send_exit_logs
  where completed
  group by user_id
),
send_retention as (
  select
    count(*)::numeric as first_send_user_count,
    count(*) filter (
      where exists (
        select 1
        from sessions s
        where s.user_id = send_first.user_id
          and s.session_date > send_first.first_send_date
      )
    )::numeric as returned_after_first_send_count
  from send_first
),
check_first as (
  select
    user_id,
    min((started_at at time zone 'Asia/Seoul')::date) as first_check_date
  from public.cloud_check_exit_logs
  where completed
  group by user_id
),
check_retention as (
  select
    count(*)::numeric as first_check_user_count,
    count(*) filter (
      where exists (
        select 1
        from sessions s
        where s.user_id = check_first.user_id
          and s.session_date > check_first.first_check_date
      )
    )::numeric as returned_after_first_check_count
  from check_first
)
select
  '리텐션' as "큰분류",
  '첫 접속 기준' as "소분류",
  'D1 retention' as "지표명",
  count(*) filter (
    where first_session_date <= ((now() at time zone 'Asia/Seoul')::date - 1)
      and d1_returned
  )::numeric as "값",
  public.dankkum_rate_percent(
    count(*) filter (
      where first_session_date <= ((now() at time zone 'Asia/Seoul')::date - 1)
        and d1_returned
    )::numeric,
    count(*) filter (
      where first_session_date <= ((now() at time zone 'Asia/Seoul')::date - 1)
    )::numeric
  ) as "비율_percent",
  '첫 접속 다음날 다시 접속한 사용자 비율' as "설명"
from cohort

union all

select
  '리텐션',
  '첫 접속 기준',
  'D7 retention',
  count(*) filter (
    where first_session_date <= ((now() at time zone 'Asia/Seoul')::date - 7)
      and d7_returned
  )::numeric,
  public.dankkum_rate_percent(
    count(*) filter (
      where first_session_date <= ((now() at time zone 'Asia/Seoul')::date - 7)
        and d7_returned
    )::numeric,
    count(*) filter (
      where first_session_date <= ((now() at time zone 'Asia/Seoul')::date - 7)
    )::numeric
  ),
  '첫 접속 후 7일 안에 다시 접속한 사용자 비율'
from cohort

union all

select
  '리텐션',
  '첫 접속 기준',
  'D30 retention',
  count(*) filter (
    where first_session_date <= ((now() at time zone 'Asia/Seoul')::date - 30)
      and d30_returned
  )::numeric,
  public.dankkum_rate_percent(
    count(*) filter (
      where first_session_date <= ((now() at time zone 'Asia/Seoul')::date - 30)
        and d30_returned
    )::numeric,
    count(*) filter (
      where first_session_date <= ((now() at time zone 'Asia/Seoul')::date - 30)
    )::numeric
  ),
  '첫 접속 후 30일 안에 다시 접속한 사용자 비율'
from cohort

union all

select
  '리텐션',
  '구름 보내기 기준',
  '첫 구름 보낸 사용자 중 재방문한 비율',
  send_retention.returned_after_first_send_count,
  public.dankkum_rate_percent(
    send_retention.returned_after_first_send_count,
    send_retention.first_send_user_count
  ),
  '첫 구름 보내기 완료 이후 다시 접속한 사용자 비율'
from send_retention

union all

select
  '리텐션',
  '구름 확인하기 기준',
  '첫 구름 확인한 사용자 중 재방문한 비율',
  check_retention.returned_after_first_check_count,
  public.dankkum_rate_percent(
    check_retention.returned_after_first_check_count,
    check_retention.first_check_user_count
  ),
  '첫 구름 확인하기 완료 이후 다시 접속한 사용자 비율'
from check_retention;

-- 6) 품질/불편함 신호

drop view if exists public."요약_품질불편함신호_요약_V1";

create view public."요약_품질불편함신호_요약_V1" as
with
send_flow as (
  select
    count(*)::numeric as total_count,
    count(*) filter (where completed)::numeric as complete_count,
    count(*) filter (where not completed)::numeric as abandoned_count,
    coalesce(sum(previous_count), 0)::numeric as previous_click_count,
    round(avg(nullif(total_seconds, 0))::numeric, 2) as avg_total_seconds
  from public.cloud_send_exit_logs
),
check_flow as (
  select
    count(*)::numeric as total_count,
    count(*) filter (where completed)::numeric as complete_count,
    count(*) filter (where not completed)::numeric as abandoned_count,
    count(*) filter (where completed and coalesce(result_count, 0) = 0)::numeric as zero_result_count,
    coalesce(sum(previous_count), 0)::numeric as previous_click_count,
    round(avg(nullif(total_seconds, 0))::numeric, 2) as avg_total_seconds
  from public.cloud_check_exit_logs
),
error_flow as (
  select count(*)::numeric as error_count
  from public.app_error_logs
),
repeat_failures as (
  select count(*)::numeric as repeat_failure_user_count
  from (
    select user_id
    from public.cloud_check_exit_logs
    where completed and coalesce(result_count, 0) = 0
    group by user_id
    having count(*) >= 2
  ) users
)
select
  '품질/불편함 신호' as "큰분류",
  '구름 보내기' as "소분류",
  '구름 작성 중 포기한 사용자 수' as "지표명",
  count(distinct user_id)::numeric as "값",
  null::numeric as "비율_percent",
  '구름 보내기를 시작했지만 완료하지 않은 고유 사용자 수' as "설명"
from public.cloud_send_exit_logs
where not completed

union all

select
  '품질/불편함 신호',
  '구름 보내기',
  '구름 보내기 평균 체류 시간',
  send_flow.avg_total_seconds,
  null::numeric,
  '구름 보내기 흐름의 평균 체류 시간(초)'
from send_flow

union all

select
  '품질/불편함 신호',
  '구름 보내기',
  '구름 보내기 이탈률',
  send_flow.abandoned_count,
  public.dankkum_rate_percent(send_flow.abandoned_count, send_flow.total_count),
  '구름 보내기 시작 기록 중 완료하지 않은 비율'
from send_flow

union all

select
  '품질/불편함 신호',
  '구름 보내기',
  '구름 보내기 뒤로가기 클릭 수',
  send_flow.previous_click_count,
  null::numeric,
  '구름 보내기 흐름에서 이전 버튼을 누른 총 횟수'
from send_flow

union all

select
  '품질/불편함 신호',
  '구름 확인하기',
  '구름 확인 중 포기한 사용자 수',
  count(distinct user_id)::numeric,
  null::numeric,
  '구름 확인하기를 시작했지만 완료하지 않은 고유 사용자 수'
from public.cloud_check_exit_logs
where not completed

union all

select
  '품질/불편함 신호',
  '구름 확인하기',
  '구름 확인하기 평균 체류 시간',
  check_flow.avg_total_seconds,
  null::numeric,
  '구름 확인하기 흐름의 평균 체류 시간(초)'
from check_flow

union all

select
  '품질/불편함 신호',
  '구름 확인하기',
  '구름 확인하기 이탈률',
  check_flow.abandoned_count,
  public.dankkum_rate_percent(check_flow.abandoned_count, check_flow.total_count),
  '구름 확인하기 시작 기록 중 완료하지 않은 비율'
from check_flow

union all

select
  '품질/불편함 신호',
  '구름 확인하기',
  '구름 확인하기 뒤로가기 클릭 수',
  check_flow.previous_click_count,
  null::numeric,
  '구름 확인하기 흐름에서 이전 버튼을 누른 총 횟수'
from check_flow

union all

select
  '품질/불편함 신호',
  '검색 결과',
  '검색 결과 0개 비율',
  check_flow.zero_result_count,
  public.dankkum_rate_percent(check_flow.zero_result_count, check_flow.complete_count),
  '구름 확인하기를 완료했지만 검색 결과가 0개였던 비율'
from check_flow

union all

select
  '품질/불편함 신호',
  '검색 결과',
  '동일 사용자의 반복 실패 횟수',
  repeat_failures.repeat_failure_user_count,
  null::numeric,
  '검색 결과 0개가 2회 이상 발생한 고유 사용자 수'
from repeat_failures

union all

select
  '품질/불편함 신호',
  '오류',
  '오류 발생 수',
  error_flow.error_count,
  null::numeric,
  '앱 오류 로그에 기록된 전체 오류 수'
from error_flow;

-- 7) Whole dashboard index: one place to see what belongs together.

drop view if exists public."요약_성장지표_전체목록_요약_V1";

create view public."요약_성장지표_전체목록_요약_V1" as
select
  '1. 접속/활성도' as "큰제목",
  '요약_활성도방문빈도_접속활성도_요약_V1' as "표이름",
  'DAU, WAU, MAU, Stickiness, 재방문율, 미접속 사용자 수' as "주요내용"
union all
select
  '1. 접속/활성도',
  '관리_활성도방문빈도_접속활성도_아이디별_V1',
  '아이디별 총 접속 횟수, 평균 접속 횟수, 최근 접속 현황'
union all
select
  '2. 메뉴/기능 사용량',
  '관리_활성도방문빈도_메뉴기능사용량_메뉴별_V1',
  '메뉴별 총 클릭 수, 고유 사용자 수, 평균 클릭 수, 클릭 비중'
union all
select
  '2. 메뉴/기능 사용량',
  '관리_활성도방문빈도_메뉴기능사용량_아이디별_V1',
  '아이디별 메뉴 클릭 기록 요약'
union all
select
  '2. 메뉴/기능 사용량',
  '관리_활성도방문빈도_메뉴기능사용량_TOP10_V1',
  '가장 많이 쓰는 메뉴 TOP 10'
union all
select
  '2. 메뉴/기능 사용량',
  '관리_활성도방문빈도_메뉴기능사용량_저사용메뉴_V1',
  '클릭 수가 적은 메뉴 목록'
union all
select
  '3. 퍼널/전환율',
  '요약_퍼널전환율_요약_V1',
  '구름 보내기/확인하기 완료율, 결과 클릭률, 응답률, 매칭률'
union all
select
  '4. 리텐션',
  '요약_리텐션_요약_V1',
  'D1/D7/D30 retention, 첫 구름 보내기/확인하기 이후 재방문율'
union all
select
  '5. 품질/불편함 신호',
  '요약_품질불편함신호_요약_V1',
  '단계별 불편함 요약, 이탈률, 뒤로가기, 오류, 검색 결과 0개'
order by "큰제목", "표이름";
