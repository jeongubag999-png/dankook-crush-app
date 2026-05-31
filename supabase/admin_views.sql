-- Dankkum Supabase admin/readability views
-- Run this in Supabase Dashboard > SQL Editor.
-- These views do not change app data. They only create easier-to-read admin tables.

create or replace view public.admin_verification_queue as
select
  v.id,
  v.status as verification_status,
  v.name,
  v.student_id,
  v.department,
  v.screenshot_path,
  v.user_id,
  p.nickname,
  p.gender,
  p.instagram_id,
  p.profile_image_url
from public.dku_verifications v
left join public.profiles p
  on p.user_id = v.user_id
order by
  case v.status
    when 'pending' then 0
    when 'approved' then 1
    when 'rejected' then 2
    else 3
  end,
  v.id desc;

create or replace view public.admin_profiles_overview as
select
  p.user_id,
  p.nickname,
  p.gender,
  p.department,
  p.student_year,
  p.instagram_id,
  p.bio,
  p.profile_image_url,
  coalesce(sent_posts.sent_count, 0) as sent_cloud_count,
  coalesce(sent_claims.received_claim_count, 0) as received_claim_count,
  coalesce(my_claims.claimed_count, 0) as claimed_cloud_count,
  coalesce(accepted_claims.accepted_count, 0) as accepted_match_count
from public.profiles p
left join (
  select sender_user_id, count(*) as sent_count
  from public.crush_posts
  group by sender_user_id
) sent_posts
  on sent_posts.sender_user_id = p.user_id
left join (
  select cp.sender_user_id, count(c.id) as received_claim_count
  from public.crush_posts cp
  left join public.claims c
    on c.crush_post_id::text = cp.id::text
  group by cp.sender_user_id
) sent_claims
  on sent_claims.sender_user_id = p.user_id
left join (
  select claimer_user_id, count(*) as claimed_count
  from public.claims
  group by claimer_user_id
) my_claims
  on my_claims.claimer_user_id = p.user_id
left join (
  select user_id, count(*) as accepted_count
  from (
    select claimer_user_id as user_id
    from public.claims
    where status = 'accepted'
    union all
    select cp.sender_user_id as user_id
    from public.claims c
    join public.crush_posts cp
      on c.crush_post_id::text = cp.id::text
    where c.status = 'accepted'
  ) matched_users
  group by user_id
) accepted_claims
  on accepted_claims.user_id = p.user_id
order by p.nickname;

create or replace view public.admin_cloud_posts_readable as
select
  cp.id,
  cp.created_at,
  cp.seen_date,
  cp.time_period,
  cp.place,
  split_part(cp.place, ' - ', 1) as main_place,
  cp.sender_nickname,
  cp.sender_gender,
  cp.sender_instagram,
  cp.target_gender,
  cp.hair_feature,
  cp.clothes_style,
  cp.accessory,
  cp.message,
  coalesce(claim_counts.claim_count, 0) as claim_count,
  coalesce(view_counts.view_count, 0) as view_count,
  coalesce(second_cloud_counts.second_cloud_count, 0) as second_cloud_count,
  cp.sender_user_id
from public.crush_posts cp
left join (
  select crush_post_id::text as crush_post_id, count(*) as claim_count
  from public.claims
  group by crush_post_id::text
) claim_counts
  on claim_counts.crush_post_id = cp.id::text
left join (
  select crush_post_id::text as crush_post_id, count(*) as view_count
  from public.cloud_views
  group by crush_post_id::text
) view_counts
  on view_counts.crush_post_id = cp.id::text
left join (
  select crush_post_id::text as crush_post_id, count(*) as second_cloud_count
  from public.cloud_views
  where second_cloud_sent_at is not null
  group by crush_post_id::text
) second_cloud_counts
  on second_cloud_counts.crush_post_id = cp.id::text
order by cp.created_at desc;

create or replace view public.admin_claims_readable as
select
  c.id,
  c.created_at,
  c.status,
  c.claimer_nickname,
  c.claimer_instagram,
  c.claimer_message,
  cp.sender_nickname,
  cp.sender_instagram,
  cp.seen_date,
  cp.time_period,
  cp.place,
  cp.target_gender,
  cp.message as original_cloud_message,
  c.crush_post_id,
  c.claimer_user_id,
  cp.sender_user_id
from public.claims c
left join public.crush_posts cp
  on c.crush_post_id::text = cp.id::text
order by c.created_at desc;

create or replace view public.admin_cloud_views_readable as
select
  cv.id,
  cv.created_at,
  cv.viewed_at,
  cv.second_cloud_sent_at,
  cv.viewer_nickname,
  cv.viewer_instagram,
  cp.sender_nickname,
  cp.seen_date,
  cp.time_period,
  cp.place,
  cp.message as original_cloud_message,
  case
    when cv.second_cloud_sent_at is not null then 'second_cloud_sent'
    else 'viewed'
  end as view_status,
  cv.crush_post_id,
  cv.viewer_user_id,
  cp.sender_user_id
from public.cloud_views cv
left join public.crush_posts cp
  on cv.crush_post_id::text = cp.id::text
order by coalesce(cv.second_cloud_sent_at, cv.viewed_at, cv.created_at) desc;

create or replace view public.admin_cloud_checks_readable as
select
  cc.id,
  cc.checked_at,
  cc.checker_nickname,
  cc.checker_gender,
  cc.checker_instagram,
  cc.seen_date,
  cc.hair_feature,
  cc.top_type,
  cc.top_color,
  cc.bottom_type,
  cc.bottom_color,
  cc.result_count,
  cc.checker_user_id
from public.cloud_checks cc
order by cc.checked_at desc;

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
  select seen_date as activity_date, count(*) as check_count, sum(result_count) as total_results
  from public.cloud_checks
  group by seen_date
),
claims_by_date as (
  select cp.seen_date as activity_date, count(c.id) as claim_count
  from public.claims c
  join public.crush_posts cp
    on c.crush_post_id::text = cp.id::text
  group by cp.seen_date
),
views_by_date as (
  select cp.seen_date as activity_date, count(cv.id) as view_count
  from public.cloud_views cv
  join public.crush_posts cp
    on cv.crush_post_id::text = cp.id::text
  group by cp.seen_date
)
select
  d.activity_date,
  coalesce(sent.sent_clouds, 0) as sent_clouds,
  coalesce(checks.check_count, 0) as search_count,
  coalesce(checks.total_results, 0) as total_search_results,
  coalesce(claims_by_date.claim_count, 0) as claim_count,
  coalesce(views_by_date.view_count, 0) as view_count
from dates d
left join sent using (activity_date)
left join checks using (activity_date)
left join claims_by_date using (activity_date)
left join views_by_date using (activity_date)
order by d.activity_date desc;

create or replace view public.admin_place_dashboard as
select
  cp.seen_date,
  split_part(cp.place, ' - ', 1) as main_place,
  count(*) as cloud_count,
  count(distinct cp.sender_user_id) as sender_count,
  count(c.id) as claim_count,
  count(cv.id) as view_count
from public.crush_posts cp
left join public.claims c
  on c.crush_post_id::text = cp.id::text
left join public.cloud_views cv
  on cv.crush_post_id::text = cp.id::text
group by cp.seen_date, split_part(cp.place, ' - ', 1)
order by cp.seen_date desc, cloud_count desc;
