create or replace view public.admin_daily_dashboard as
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
  d.activity_date,
  coalesce(sent.sent_clouds, 0) as sent_clouds,
  coalesce(checks.search_count, 0) as search_count,
  coalesce(checks.total_search_results, 0) as total_search_results,
  coalesce(claims_by_date.claim_count, 0) as claim_count
from dates d
left join sent using (activity_date)
left join checks using (activity_date)
left join claims_by_date using (activity_date)
order by d.activity_date desc;

create or replace view public.admin_place_dashboard as
select
  cp.seen_date,
  split_part(cp.place, ' - ', 1) as main_place,
  count(*) as cloud_count,
  count(distinct cp.sender_user_id) as sender_count,
  count(c.id) as claim_count
from public.crush_posts cp
left join public.claims c
  on c.crush_post_id::text = cp.id::text
group by cp.seen_date, split_part(cp.place, ' - ', 1)
order by cp.seen_date desc, cloud_count desc;
