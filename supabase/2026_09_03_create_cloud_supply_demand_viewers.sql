-- Cloud supply/demand viewer views.
-- Uses crush_posts (sent clouds) and cloud_checks (cloud-check searches).

alter table public.cloud_checks
  add column if not exists campus text not null default '죽전';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cloud_checks_campus_check'
      and conrelid = 'public.cloud_checks'::regclass
  ) then
    alter table public.cloud_checks
      add constraint cloud_checks_campus_check
      check (campus in ('죽전', '천안'));
  end if;
end $$;

create index if not exists idx_cloud_checks_campus_seen_gender
  on public.cloud_checks (campus, seen_date, checker_gender);

create or replace view public.cloud_posts as
select
  cp.id as "구름번호",
  to_char(cp.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "작성시간",
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
  cp.campus as "캠퍼스",
  coalesce(check_matches.check_count, 0)::integer as "구름확인_노출가능수",
  check_matches.latest_checked_at as "최근_구름확인시간",
  check_matches.checker_nicknames as "구름확인_닉네임목록",
  check_matches.checker_genders as "구름확인_성별목록",
  coalesce(view_matches.view_count, 0)::integer as "구름확인_실제노출수",
  view_matches.latest_viewed_at as "최근_실제노출시간",
  view_matches.viewer_nicknames as "실제노출_닉네임목록"
from public.crush_posts cp
left join lateral (
  select
    count(*) as check_count,
    max(cc.checked_at) as latest_checked_at,
    string_agg(distinct cc.checker_nickname, ', ' order by cc.checker_nickname) as checker_nicknames,
    string_agg(distinct cc.checker_gender, ', ' order by cc.checker_gender) as checker_genders
  from public.cloud_checks cc
  where cc.campus = cp.campus
    and cc.seen_date = cp.seen_date
    and cc.checker_gender = cp.target_gender
    and cc.checker_user_id <> cp.sender_user_id
) check_matches on true
left join lateral (
  select
    count(*) as view_count,
    max(cv.viewed_at) as latest_viewed_at,
    string_agg(distinct cv.viewer_nickname, ', ' order by cv.viewer_nickname) as viewer_nicknames
  from public.cloud_views cv
  where cv.crush_post_id = cp.id
    and cv.viewer_user_id <> cp.sender_user_id
) view_matches on true
order by cp.created_at desc;

create or replace view public."요약_날짜별_구름수요공급" as
with sent as (
  select
    campus,
    seen_date as activity_date,
    count(*) as sent_cloud_count,
    count(distinct sender_user_id) as sent_user_count
  from public.crush_posts
  group by campus, seen_date
),
checked as (
  select
    campus,
    seen_date as activity_date,
    count(*) as check_count,
    count(distinct checker_user_id) as check_user_count,
    coalesce(sum(result_count), 0) as total_result_count,
    count(*) filter (where result_count = 0) as zero_result_check_count,
    avg(result_count)::numeric(10, 2) as avg_result_count
  from public.cloud_checks
  group by campus, seen_date
),
shown as (
  select
    cp.campus,
    cp.seen_date as activity_date,
    count(cv.id) as viewed_cloud_count,
    count(distinct cv.viewer_user_id) as viewed_user_count
  from public.cloud_views cv
  join public.crush_posts cp
    on cp.id = cv.crush_post_id
  group by cp.campus, cp.seen_date
),
dates as (
  select campus, activity_date from sent
  union
  select campus, activity_date from checked
  union
  select campus, activity_date from shown
)
select
  d.campus as "캠퍼스",
  d.activity_date as "날짜",
  coalesce(s.sent_cloud_count, 0)::integer as "띄운구름수",
  coalesce(c.check_count, 0)::integer as "구름확인수",
  coalesce(s.sent_user_count, 0)::integer as "구름보낸_사용자수",
  coalesce(c.check_user_count, 0)::integer as "구름확인_사용자수",
  coalesce(v.viewed_cloud_count, 0)::integer as "구름확인_노출구름수",
  coalesce(v.viewed_user_count, 0)::integer as "구름확인_노출사용자수",
  coalesce(c.total_result_count, 0)::integer as "검색결과총합",
  coalesce(c.zero_result_check_count, 0)::integer as "결과0개_확인수",
  coalesce(c.avg_result_count, 0)::numeric(10, 2) as "평균검색결과수",
  round(coalesce(c.check_count, 0)::numeric / nullif(coalesce(s.sent_cloud_count, 0), 0), 2) as "확인대비공급비율"
from dates d
left join sent s
  on s.campus = d.campus and s.activity_date = d.activity_date
left join checked c
  on c.campus = d.campus and c.activity_date = d.activity_date
left join shown v
  on v.campus = d.campus and v.activity_date = d.activity_date
order by d.activity_date desc, d.campus;

create or replace view public."요약_장소별_구름수요공급" as
with sent as (
  select
    campus,
    coalesce(main_place, split_part(place, ' - ', 1)) as main_place,
    count(*) as sent_cloud_count,
    count(distinct sender_user_id) as sent_user_count
  from public.crush_posts
  group by campus, coalesce(main_place, split_part(place, ' - ', 1))
),
shown as (
  select
    cp.campus,
    coalesce(cp.main_place, split_part(cp.place, ' - ', 1), '전체/미지정') as main_place,
    count(cv.id) as viewed_cloud_count,
    count(distinct cv.viewer_user_id) as viewed_user_count
  from public.cloud_views cv
  join public.crush_posts cp
    on cp.id = cv.crush_post_id
  group by cp.campus, coalesce(cp.main_place, split_part(cp.place, ' - ', 1), '전체/미지정')
),
places as (
  select campus, main_place from sent
  union
  select campus, main_place from shown
)
select
  p.campus as "캠퍼스",
  p.main_place as "장소",
  coalesce(s.sent_cloud_count, 0)::integer as "띄운구름수",
  coalesce(v.viewed_cloud_count, 0)::integer as "구름확인_노출구름수",
  coalesce(s.sent_user_count, 0)::integer as "구름보낸_사용자수",
  coalesce(v.viewed_user_count, 0)::integer as "구름확인_노출사용자수",
  (coalesce(v.viewed_cloud_count, 0) - coalesce(s.sent_cloud_count, 0))::integer as "노출공급차이"
from places p
left join sent s
  on s.campus = p.campus and s.main_place = p.main_place
left join shown v
  on v.campus = p.campus and v.main_place = p.main_place
order by "구름확인_노출구름수" desc, "띄운구름수" desc, p.campus, p.main_place;

create or replace view public."요약_시간대별_구름수요공급" as
with sent as (
  select
    campus,
    time_period,
    count(*) as sent_cloud_count,
    count(distinct sender_user_id) as sent_user_count
  from public.crush_posts
  group by campus, time_period
),
shown as (
  select
    cp.campus,
    coalesce(cp.time_period, '전체/미지정') as time_period,
    count(cv.id) as viewed_cloud_count,
    count(distinct cv.viewer_user_id) as viewed_user_count
  from public.cloud_views cv
  join public.crush_posts cp
    on cp.id = cv.crush_post_id
  group by cp.campus, coalesce(cp.time_period, '전체/미지정')
),
time_slots as (
  select campus, time_period from sent
  union
  select campus, time_period from shown
)
select
  t.campus as "캠퍼스",
  t.time_period as "시간대",
  coalesce(s.sent_cloud_count, 0)::integer as "띄운구름수",
  coalesce(v.viewed_cloud_count, 0)::integer as "구름확인_노출구름수",
  coalesce(s.sent_user_count, 0)::integer as "구름보낸_사용자수",
  coalesce(v.viewed_user_count, 0)::integer as "구름확인_노출사용자수",
  (coalesce(v.viewed_cloud_count, 0) - coalesce(s.sent_cloud_count, 0))::integer as "노출공급차이"
from time_slots t
left join sent s
  on s.campus = t.campus and s.time_period = t.time_period
left join shown v
  on v.campus = t.campus and v.time_period = t.time_period
order by "구름확인_노출구름수" desc, "띄운구름수" desc, t.campus, t.time_period;

create or replace view public."요약_구름확인_결과품질" as
select
  cc.campus as "캠퍼스",
  cc.checker_gender as "확인한사람성별",
  count(*)::integer as "구름확인수",
  count(distinct cc.checker_user_id)::integer as "구름확인_사용자수",
  coalesce(sum(cc.result_count), 0)::integer as "검색결과총합",
  round(avg(cc.result_count)::numeric, 2) as "평균검색결과수",
  percentile_disc(0.5) within group (order by cc.result_count)::integer as "중앙검색결과수",
  count(*) filter (where cc.result_count = 0)::integer as "결과0개_확인수",
  round(count(*) filter (where cc.result_count = 0)::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "결과0개비율_percent",
  count(*) filter (where cc.result_count between 1 and 2)::integer as "결과1_2개_확인수",
  count(*) filter (where cc.result_count >= 3)::integer as "결과3개이상_확인수",
  max(cc.checked_at) as "최근확인시간"
from public.cloud_checks cc
group by cc.campus, cc.checker_gender
order by cc.campus, cc.checker_gender;

do $$
declare
  admin_view record;
begin
  for admin_view in
    select table_schema, table_name
    from information_schema.views
    where table_schema = 'public'
      and (
        table_name = 'cloud_posts'
        or table_name like '요약\_%' escape '\'
      )
  loop
    execute format(
      'revoke all privileges on table %I.%I from anon, authenticated',
      admin_view.table_schema,
      admin_view.table_name
    );
  end loop;
end $$;
