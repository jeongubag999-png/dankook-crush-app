-- 한글 관리자 뷰 2번째 파일입니다.

create or replace view public."관리_구름조회기록" as
select
  cv.id as "조회번호",
  cv.created_at as "기록생성시간",
  cv.viewed_at as "조회시간",
  cv.second_cloud_sent_at as "뭉게구름보낸시간",
  cv.viewer_nickname as "조회한사람",
  cv.viewer_instagram as "조회한사람인스타",
  cp.sender_nickname as "구름보낸사람",
  cp.seen_date as "마주친날짜",
  cp.time_period as "시간대",
  cp.place as "장소",
  cp.message as "원래구름메시지",
  case
    when cv.second_cloud_sent_at is not null then '뭉게구름보냄'
    else '조회함'
  end as "조회상태",
  cv.crush_post_id as "구름번호",
  cv.viewer_user_id as "조회한사람ID",
  cp.sender_user_id as "구름보낸사람ID"
from public.cloud_views cv
left join public.crush_posts cp
  on cv.crush_post_id::text = cp.id::text
order by coalesce(cv.second_cloud_sent_at, cv.viewed_at, cv.created_at) desc;

create or replace view public."관리_구름확인검색기록" as
select
  cc.id as "검색번호",
  cc.checked_at as "검색시간",
  cc.checker_nickname as "검색한사람",
  cc.checker_gender as "검색한사람성별",
  cc.checker_instagram as "검색한사람인스타",
  cc.seen_date as "검색날짜",
  cc.hair_feature as "입력한머리정보",
  cc.top_type as "상의종류",
  cc.top_color as "상의색",
  cc.bottom_type as "하의종류",
  cc.bottom_color as "하의색",
  cc.result_count as "검색결과수",
  cc.checker_user_id as "검색한사람ID"
from public.cloud_checks cc
order by cc.checked_at desc;

create or replace view public."관리_날짜별통계" as
with dates as (
  select seen_date as activity_date from public.crush_posts
  union
  select seen_date as activity_date from public.cloud_checks
),
sent as (
  select seen_date as activity_date, count(*) as sent_clouds
  from public.crush_posts
  group by seen_date
),
checks as (
  select
    seen_date as activity_date,
    count(*) as search_count,
    sum(result_count) as total_search_results
  from public.cloud_checks
  group by seen_date
),
claims_by_date as (
  select cp.seen_date as activity_date, count(c.id) as claim_count
  from public.claims c
  join public.crush_posts cp
    on c.crush_post_id::text = cp.id::text
  group by cp.seen_date
)
select
  d.activity_date as "날짜",
  coalesce(sent.sent_clouds, 0) as "보낸구름수",
  coalesce(checks.search_count, 0) as "구름확인횟수",
  coalesce(checks.total_search_results, 0) as "검색결과총합",
  coalesce(claims_by_date.claim_count, 0) as "응답수"
from dates d
left join sent using (activity_date)
left join checks using (activity_date)
left join claims_by_date using (activity_date)
order by d.activity_date desc;

create or replace view public."관리_장소별통계" as
select
  cp.seen_date as "날짜",
  split_part(cp.place, ' - ', 1) as "대표장소",
  count(*) as "구름수",
  count(distinct cp.sender_user_id) as "보낸사람수",
  count(c.id) as "응답수"
from public.crush_posts cp
left join public.claims c
  on c.crush_post_id::text = cp.id::text
group by cp.seen_date, split_part(cp.place, ' - ', 1)
order by cp.seen_date desc, count(*) desc;
