-- Add raw, analysis-friendly cloud post detail columns.
--
-- Existing app-facing columns remain untouched:
--   place, hair_feature, clothes_style, accessory
--
-- New inserts/updates from the frontend will also populate the columns below,
-- so managers can inspect uncombined raw values without parsing text.

alter table public.crush_posts
  add column if not exists main_place text,
  add column if not exists detail_place text,
  add column if not exists hair_color text,
  add column if not exists hat_status text,
  add column if not exists bangs_status text,
  add column if not exists glasses_status text,
  add column if not exists top_type text,
  add column if not exists top_color text,
  add column if not exists top_detail text,
  add column if not exists outer_type text,
  add column if not exists outer_color text,
  add column if not exists bottom_type text,
  add column if not exists bottom_color text,
  add column if not exists bottom_detail text,
  add column if not exists shoe_type text,
  add column if not exists shoe_detail text,
  add column if not exists bag_type text,
  add column if not exists earphone_type text,
  add column if not exists item_detail text;

-- New raw cloud post view. This does not replace/delete the existing
-- "관리_구름목록" view.
create or replace view public.cloud_posts as
select
  cp.id as "구름번호",
  cp.sender_user_id as "작성자id",
  cp.target_gender as "찾는사람성별",
  cp.seen_date as "마주친날짜",
  cp.time_period as "시간",
  coalesce(cp.main_place, split_part(cp.place, ' - ', 1)) as "장소",
  coalesce(
    cp.detail_place,
    nullif(split_part(cp.place, ' - ', 2), '')
  ) as "구체적인위치",
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
  cp.message as "짧은메세지",
  cp.created_at as "작성시간"
from public.crush_posts cp
order by cp.created_at desc;

-- Verification: shows whether the new raw columns and view exist.
select
  'crush_posts column' as check_type,
  column_name as name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'crush_posts'
  and column_name in (
    'main_place',
    'detail_place',
    'hair_color',
    'hat_status',
    'bangs_status',
    'glasses_status',
    'top_type',
    'top_color',
    'top_detail',
    'outer_type',
    'outer_color',
    'bottom_type',
    'bottom_color',
    'bottom_detail',
    'shoe_type',
    'shoe_detail',
    'bag_type',
    'earphone_type',
    'item_detail'
  )
union all
select
  'view' as check_type,
  table_name as name
from information_schema.views
where table_schema = 'public'
  and table_name = 'cloud_posts'
order by check_type, name;
