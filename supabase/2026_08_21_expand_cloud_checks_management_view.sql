-- Expand cloud_checks so the app can store the full cloud-check search form.
-- Existing rows are kept. New columns will be populated by the updated app.

alter table public.cloud_checks
  add column if not exists outer_type text,
  add column if not exists outer_color text,
  add column if not exists shoe_type text,
  add column if not exists bag_type text,
  add column if not exists earphone_type text,
  add column if not exists glasses_type text;

drop view if exists public."관리_구름확인하기_V1";

create view public."관리_구름확인하기_V1" as
select
  cc.id as "구름확인 기록번호",
  to_char(cc.checked_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "확인한 시간",
  dv.name as "확인한 사람 이름",
  cc.checker_user_id as "확인한 사람 id",
  cc.checker_nickname as "확인한 사람 닉네임",
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
left join lateral (
  select v.name
  from public.dku_verifications v
  where v.user_id = cc.checker_user_id
  order by
    case v.status
      when 'approved' then 0
      when 'pending' then 1
      when 'rejected' then 2
      else 3
    end,
    v.id desc
  limit 1
) dv on true
order by cc.checked_at desc;

