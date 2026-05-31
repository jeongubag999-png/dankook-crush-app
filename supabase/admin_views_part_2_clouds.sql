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
  cp.message as original_cloud_message,
  c.crush_post_id,
  c.claimer_user_id,
  cp.sender_user_id
from public.claims c
left join public.crush_posts cp
  on c.crush_post_id::text = cp.id::text
order by c.created_at desc;
