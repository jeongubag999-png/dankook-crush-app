-- Treasure hunt event views.
-- These views only read existing cloud, claim, and view records.

drop view if exists public."이벤트_보물찾기_주간인기장소_V1";
drop view if exists public."관리_보물찾기이벤트_주간인기장소_V1";

create view public."관리_보물찾기이벤트_주간인기장소_V1" as
with weekly_places as (
  select
    date_trunc('week', cp.seen_date::timestamp)::date as week_start_date,
    (date_trunc('week', cp.seen_date::timestamp)::date + 6) as week_end_date,
    coalesce(nullif(trim(split_part(cp.place, ' - ', 1)), ''), '장소 미입력') as place_name,
    count(distinct cp.id)::numeric as cloud_count,
    count(distinct cp.sender_user_id)::numeric as sender_count,
    count(distinct c.id)::numeric as claim_count,
    count(distinct cv.id)::numeric as view_count
  from public.crush_posts cp
  left join public.claims c
    on c.crush_post_id::text = cp.id::text
  left join public.cloud_views cv
    on cv.crush_post_id::text = cp.id::text
  where cp.seen_date is not null
  group by
    date_trunc('week', cp.seen_date::timestamp)::date,
    coalesce(nullif(trim(split_part(cp.place, ' - ', 1)), ''), '장소 미입력')
),
ranked_places as (
  select
    *,
    dense_rank() over (
      partition by week_start_date
      order by cloud_count desc, sender_count desc, claim_count desc, view_count desc, place_name asc
    ) as place_rank
  from weekly_places
)
select
  week_start_date as "주차시작일",
  week_end_date as "주차종료일",
  place_name as "장소",
  cloud_count as "구름수",
  sender_count as "보낸사람수",
  claim_count as "응답수",
  view_count as "조회수",
  place_rank as "순위",
  (place_rank = 1) as "이벤트대상여부"
from ranked_places
order by week_start_date desc, place_rank asc, cloud_count desc, place_name asc;

create view public."이벤트_보물찾기_주간인기장소_V1" as
select
  "주차시작일",
  "주차종료일",
  "장소",
  "구름수",
  "순위",
  ("순위" between 1 and 3) as "이벤트대상여부"
from public."관리_보물찾기이벤트_주간인기장소_V1"
order by "주차시작일" desc, "순위" asc, "구름수" desc, "장소" asc;
