-- Fix admin/table-editor viewer rows.
-- Do not delete raw data. Admin-only access is enforced with privileges/RLS,
-- not by filtering every row through auth.jwt() inside Supabase Table Editor.

drop view if exists public."관리_구름보내기_V1";
create view public."관리_구름보내기_V1" as
select
  cp.id as "구름번호",
  to_char(cp.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "작성시간",
  cp.sender_user_id as "보낸사람ID",
  cp.sender_nickname as "보낸사람닉네임",
  cp.sender_gender as "보낸사람성별",
  cp.target_gender as "찾는사람성별",
  cp.seen_date as "마주친날짜",
  cp.time_period as "시간",
  coalesce(cp.main_place, split_part(cp.place, ' - ', 1)) as "장소",
  coalesce(cp.detail_place, nullif(split_part(cp.place, ' - ', 2), '')) as "구체적인위치",
  cp.hair_color as "헤어색깔",
  cp.hat_status as "모자유무",
  cp.bangs_status as "앞머리유무",
  cp.glasses_status as "안경유무",
  cp.top_type as "상의종류",
  cp.top_color as "상의색상",
  cp.top_detail as "상의추가설명_선택사항",
  cp.outer_type as "아우터종류",
  cp.outer_color as "아우터색상",
  cp.bottom_type as "하의종류",
  cp.bottom_color as "하의색상",
  cp.bottom_detail as "하의추가설명_선택사항",
  cp.shoe_type as "신발",
  cp.shoe_detail as "신발추가설명_선택사항",
  cp.bag_type as "가방유무",
  cp.earphone_type as "이어폰_헤드셋",
  cp.item_detail as "소지품추가설명_선택사항",
  cp.message as "짧은메세지"
from public.crush_posts cp
where cp.created_at >= timestamptz '2026-09-01 00:00:00+09'
order by cp.created_at desc;

drop view if exists public."관리_구름확인하기_V1";
create view public."관리_구름확인하기_V1" as
select
  cc.id as "구름확인 기록번호",
  to_char(cc.checked_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "확인한 시간",
  cc.checker_user_id as "확인한 사람 id",
  cc.checker_nickname as "확인한 사람 닉네임",
  cc.checker_gender as "확인한 사람 성별",
  cc.seen_date as "입력한 날짜",
  cc.female_hair_style as "여자 헤어스타일",
  coalesce(nullif(cc.female_hair_color, ''), nullif(cc.male_hair_color, '')) as "헤어색깔",
  coalesce(nullif(cc.female_hat, ''), nullif(cc.male_hat, '')) as "모자유무",
  coalesce(nullif(cc.female_bangs, ''), nullif(cc.male_bangs, '')) as "앞머리 유무",
  cc.glasses_type as "안경 유무",
  cc.top_type as "상의 종류",
  cc.top_color as "상의 색상",
  cc.outer_type as "아우터 종류",
  cc.outer_color as "아우터 색상",
  cc.bottom_type as "하의 종류",
  cc.bottom_color as "하의 색상",
  cc.shoe_type as "신발",
  cc.bag_type as "가방 유무",
  cc.earphone_type as "이어폰/헤드셋"
from public.cloud_checks cc
where cc.checked_at >= timestamptz '2026-09-01 00:00:00+09'
order by cc.checked_at desc;

drop view if exists public."관리_회원요약";
create view public."관리_회원요약" as
select
  p.user_id as "회원ID",
  p.nickname as "닉네임",
  p.gender as "성별",
  p.department as "학과",
  p.student_year as "학번_또는_학년",
  p.instagram_id as "인스타ID",
  p.bio as "한줄소개",
  p.profile_image_url as "프로필사진",
  coalesce(sent_posts.sent_count, 0) as "보낸구름수",
  coalesce(my_claims.claimed_count, 0) as "응답한구름수"
from public.profiles p
left join (
  select sender_user_id, count(*) as sent_count
  from public.crush_posts
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
  group by sender_user_id
) sent_posts
  on sent_posts.sender_user_id = p.user_id
left join (
  select claimer_user_id, count(*) as claimed_count
  from public.claims
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
  group by claimer_user_id
) my_claims
  on my_claims.claimer_user_id = p.user_id
order by p.nickname;

drop view if exists public."관리_응답목록";
create view public."관리_응답목록" as
select
  c.id as "응답번호",
  to_char(c.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "응답시간",
  c.status as "상태",
  c.claimer_nickname as "응답한사람",
  c.claimer_instagram as "응답한사람인스타",
  c.claimer_message as "응답메시지",
  cp.sender_nickname as "구름보낸사람",
  cp.sender_instagram as "구름보낸사람인스타",
  cp.seen_date as "마주친날짜",
  cp.time_period as "시간대",
  cp.place as "장소",
  cp.message as "원래구름메시지",
  c.crush_post_id as "구름번호",
  c.claimer_user_id as "응답한사람ID",
  cp.sender_user_id as "구름보낸사람ID"
from public.claims c
left join public.crush_posts cp
  on c.crush_post_id::text = cp.id::text
where c.created_at >= timestamptz '2026-09-01 00:00:00+09'
order by c.created_at desc;

drop view if exists public."관리_날짜별통계";
create view public."관리_날짜별통계" as
with dates as (
  select (created_at at time zone 'Asia/Seoul')::date as activity_date
  from public.crush_posts
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
  union
  select (checked_at at time zone 'Asia/Seoul')::date as activity_date
  from public.cloud_checks
  where checked_at >= timestamptz '2026-09-01 00:00:00+09'
),
sent as (
  select (created_at at time zone 'Asia/Seoul')::date as activity_date, count(*) as sent_clouds
  from public.crush_posts
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
  group by (created_at at time zone 'Asia/Seoul')::date
),
checks as (
  select
    (checked_at at time zone 'Asia/Seoul')::date as activity_date,
    count(*) as search_count,
    sum(result_count) as total_search_results
  from public.cloud_checks
  where checked_at >= timestamptz '2026-09-01 00:00:00+09'
  group by (checked_at at time zone 'Asia/Seoul')::date
),
claims_by_date as (
  select (created_at at time zone 'Asia/Seoul')::date as activity_date, count(id) as claim_count
  from public.claims
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
  group by (created_at at time zone 'Asia/Seoul')::date
),
views_by_date as (
  select (viewed_at at time zone 'Asia/Seoul')::date as activity_date, count(id) as view_count
  from public.cloud_views
  where viewed_at >= timestamptz '2026-09-01 00:00:00+09'
  group by (viewed_at at time zone 'Asia/Seoul')::date
)
select
  d.activity_date as "날짜",
  coalesce(sent.sent_clouds, 0) as "보낸구름수",
  coalesce(checks.search_count, 0) as "구름확인횟수",
  coalesce(checks.total_search_results, 0) as "검색결과총합",
  coalesce(claims_by_date.claim_count, 0) as "응답수",
  coalesce(views_by_date.view_count, 0) as "조회수"
from dates d
left join sent using (activity_date)
left join checks using (activity_date)
left join claims_by_date using (activity_date)
left join views_by_date using (activity_date)
order by d.activity_date desc;

drop view if exists public."관리_장소별통계";
create view public."관리_장소별통계" as
select
  (cp.created_at at time zone 'Asia/Seoul')::date as "날짜",
  split_part(cp.place, ' - ', 1) as "대표장소",
  count(*) as "구름수",
  count(distinct cp.sender_user_id) as "보낸사람수",
  count(distinct c.id) as "응답수",
  count(distinct cv.id) as "조회수"
from public.crush_posts cp
left join public.claims c
  on c.crush_post_id::text = cp.id::text
 and c.created_at >= timestamptz '2026-09-01 00:00:00+09'
left join public.cloud_views cv
  on cv.crush_post_id::text = cp.id::text
 and cv.viewed_at >= timestamptz '2026-09-01 00:00:00+09'
where cp.created_at >= timestamptz '2026-09-01 00:00:00+09'
group by (cp.created_at at time zone 'Asia/Seoul')::date, split_part(cp.place, ' - ', 1)
order by (cp.created_at at time zone 'Asia/Seoul')::date desc, count(*) desc;

drop view if exists public."관리_활성도방문빈도_메뉴기능사용량_TOP10_V1";
drop view if exists public."관리_활성도방문빈도_메뉴기능사용량_저사용메뉴_V1";
drop view if exists public."관리_활성도방문빈도_메뉴기능사용량_아이디별_V1";
drop view if exists public."관리_활성도방문빈도_메뉴기능사용량_메뉴별_V1";

create view public."관리_활성도방문빈도_메뉴기능사용량_메뉴별_V1" as
with raw_events as (
  select
    user_id,
    coalesce(menu_group, '기타') as menu_group,
    menu_name,
    coalesce(feature_name, menu_name) as feature_name,
    clicked_at
  from public.menu_click_logs
  where clicked_at >= timestamptz '2026-09-01 00:00:00+09'
  union all
  select
    user_id,
    '구름' as menu_group,
    '구름 보내기' as menu_name,
    case when completed then '구름 보내기 완료' else coalesce(nullif(exit_step_name, ''), '구름 보내기 이탈') end as feature_name,
    started_at as clicked_at
  from public.cloud_send_exit_logs
  where started_at >= timestamptz '2026-09-01 00:00:00+09'
  union all
  select
    user_id,
    '구름' as menu_group,
    '구름 확인하기' as menu_name,
    case when completed then '구름 확인하기 완료' else coalesce(nullif(exit_step_name, ''), '구름 확인하기 이탈') end as feature_name,
    started_at as clicked_at
  from public.cloud_check_exit_logs
  where started_at >= timestamptz '2026-09-01 00:00:00+09'
),
total as (
  select count(*)::numeric as total_click_count from raw_events
),
menu_stats as (
  select
    menu_group,
    menu_name,
    feature_name,
    count(*)::numeric as click_count,
    count(distinct user_id)::numeric as unique_user_count,
    max(clicked_at) as last_clicked_at
  from raw_events
  group by menu_group, menu_name, feature_name
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

create view public."관리_활성도방문빈도_메뉴기능사용량_아이디별_V1" as
with raw_events as (
  select user_id, coalesce(menu_group, '기타') as menu_group, menu_name, coalesce(feature_name, menu_name) as feature_name, clicked_at
  from public.menu_click_logs
  where clicked_at >= timestamptz '2026-09-01 00:00:00+09'
  union all
  select user_id, '구름', '구름 보내기',
    case when completed then '구름 보내기 완료' else coalesce(nullif(exit_step_name, ''), '구름 보내기 이탈') end,
    started_at
  from public.cloud_send_exit_logs
  where started_at >= timestamptz '2026-09-01 00:00:00+09'
  union all
  select user_id, '구름', '구름 확인하기',
    case when completed then '구름 확인하기 완료' else coalesce(nullif(exit_step_name, ''), '구름 확인하기 이탈') end,
    started_at
  from public.cloud_check_exit_logs
  where started_at >= timestamptz '2026-09-01 00:00:00+09'
)
select
  e.user_id as "아이디",
  p.nickname as "닉네임",
  e.menu_group as "큰분류",
  e.menu_name as "메뉴명",
  e.feature_name as "기능명",
  count(*)::numeric as "아이디별_메뉴클릭수",
  to_char(min(e.clicked_at) at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "첫클릭시간",
  to_char(max(e.clicked_at) at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "마지막클릭시간"
from raw_events e
left join public.profiles p
  on p.user_id = e.user_id
group by e.user_id, p.nickname, e.menu_group, e.menu_name, e.feature_name
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

drop view if exists public."요약_활성도방문빈도_접속활성도_요약_V1";
create view public."요약_활성도방문빈도_접속활성도_요약_V1" as
with 기준 as (
  select (now() at time zone 'Asia/Seoul')::date as 기준일
),
users as (
  select user_id
  from public.profiles
),
activity_events as (
  select user_id, session_started_at as happened_at
  from public.app_session_logs
  where session_started_at >= timestamptz '2026-09-01 00:00:00+09'
  union all
  select user_id, started_at
  from public.cloud_send_exit_logs
  where started_at >= timestamptz '2026-09-01 00:00:00+09'
  union all
  select user_id, started_at
  from public.cloud_check_exit_logs
  where started_at >= timestamptz '2026-09-01 00:00:00+09'
  union all
  select sender_user_id, created_at
  from public.crush_posts
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
  union all
  select checker_user_id, checked_at
  from public.cloud_checks
  where checked_at >= timestamptz '2026-09-01 00:00:00+09'
  union all
  select viewer_user_id, viewed_at
  from public.cloud_views
  where viewed_at >= timestamptz '2026-09-01 00:00:00+09'
  union all
  select claimer_user_id, created_at
  from public.claims
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
),
sessions as (
  select
    user_id,
    (happened_at at time zone 'Asia/Seoul')::date as session_date
  from activity_events
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
    count(distinct sessions.user_id) filter (where sessions.session_date = 기준.기준일)::numeric as dau,
    count(distinct sessions.user_id) filter (where sessions.session_date between 기준.기준일 - 6 and 기준.기준일)::numeric as wau,
    count(distinct sessions.user_id) filter (where sessions.session_date between 기준.기준일 - 29 and 기준.기준일)::numeric as mau,
    count(distinct users.user_id) filter (where per_user.total_session_count >= 2)::numeric as return_user_count,
    count(distinct users.user_id) filter (
      where per_user.last_session_date is null or per_user.last_session_date < 기준.기준일 - 6
    )::numeric as inactive_7_day_user_count,
    count(distinct users.user_id) filter (
      where per_user.last_session_date is null or per_user.last_session_date < 기준.기준일 - 29
    )::numeric as inactive_30_day_user_count,
    round(avg(per_user.total_session_count), 2) as avg_session_count_per_user
  from 기준
  left join users on true
  left join sessions on sessions.user_id = users.user_id
  left join per_user on per_user.user_id = users.user_id
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

do $$
declare
  viewer_view record;
begin
  for viewer_view in
    select table_schema, table_name
    from information_schema.views
    where table_schema = 'public'
      and (
        table_name like '관리\_%' escape '\'
        or table_name like '요약\_%' escape '\'
        or table_name = 'cloud_posts'
      )
  loop
    execute format(
      'revoke all privileges on table %I.%I from anon, authenticated',
      viewer_view.table_schema,
      viewer_view.table_name
    );
  end loop;
end $$;
