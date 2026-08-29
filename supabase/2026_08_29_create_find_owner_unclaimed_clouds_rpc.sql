-- "이 구름 주인 찾아주기" 전용 목록.
-- claims RLS를 넓히지 않고도 응답이 하나도 없는 구름만 안전하게 조회합니다.

create or replace function public.find_owner_unclaimed_clouds(
  p_seen_date date,
  p_campus text,
  p_place text default null
)
returns table (
  id uuid,
  created_at timestamptz,
  sender_user_id uuid,
  sender_nickname text,
  seen_date date,
  place text,
  main_place text,
  detail_place text,
  campus text,
  time_period text,
  target_gender text,
  message text,
  hair_feature text,
  hair_color text,
  hat_status text,
  bangs_status text,
  glasses_status text,
  top_type text,
  top_color text,
  top_detail text,
  outer_type text,
  outer_color text,
  bottom_type text,
  bottom_color text,
  bottom_detail text,
  shoe_type text,
  shoe_detail text,
  bag_type text,
  earphone_type text,
  item_detail text,
  clothes_color text,
  clothes_style text,
  accessory text,
  sender_instagram text
)
language sql
security definer
set search_path = public
as $$
  select
    cp.id,
    cp.created_at,
    cp.sender_user_id,
    cp.sender_nickname,
    cp.seen_date,
    cp.place,
    cp.main_place,
    cp.detail_place,
    cp.campus,
    cp.time_period,
    cp.target_gender,
    cp.message,
    cp.hair_feature,
    cp.hair_color,
    cp.hat_status,
    cp.bangs_status,
    cp.glasses_status,
    cp.top_type,
    cp.top_color,
    cp.top_detail,
    cp.outer_type,
    cp.outer_color,
    cp.bottom_type,
    cp.bottom_color,
    cp.bottom_detail,
    cp.shoe_type,
    cp.shoe_detail,
    cp.bag_type,
    cp.earphone_type,
    cp.item_detail,
    cp.clothes_color,
    cp.clothes_style,
    cp.accessory,
    cp.sender_instagram
  from public.crush_posts cp
  where cp.seen_date = p_seen_date
    and cp.campus = p_campus
    and (p_place is null or p_place = '' or split_part(cp.place, ' - ', 1) = p_place)
    and not exists (
      select 1
      from public.claims c
      where c.crush_post_id = cp.id
    )
  order by cp.created_at desc;
$$;

revoke all on function public.find_owner_unclaimed_clouds(date, text, text) from public;
grant execute on function public.find_owner_unclaimed_clouds(date, text, text) to authenticated;
