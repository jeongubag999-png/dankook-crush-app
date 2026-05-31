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
  coalesce(my_claims.claimed_count, 0) as claimed_cloud_count
from public.profiles p
left join (
  select sender_user_id, count(*) as sent_count
  from public.crush_posts
  group by sender_user_id
) sent_posts
  on sent_posts.sender_user_id = p.user_id
left join (
  select claimer_user_id, count(*) as claimed_count
  from public.claims
  group by claimer_user_id
) my_claims
  on my_claims.claimer_user_id = p.user_id
order by p.nickname;
