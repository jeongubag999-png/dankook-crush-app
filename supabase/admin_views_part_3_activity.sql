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
