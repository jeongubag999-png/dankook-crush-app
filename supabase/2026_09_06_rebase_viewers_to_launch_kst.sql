-- Rebase admin/summary viewers to the app launch window without deleting raw data.
-- Raw timestamptz columns remain untouched; viewer timestamps are displayed in KST.

-- App launch cutoff: 2026-09-01 00:00:00 KST.
-- In PostgreSQL this equals 2026-08-31 15:00:00 UTC.

drop view if exists public.cloud_posts;

create or replace view public.cloud_posts as
select
  cp.id as "구름번호",
  to_char(cp.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "작성시간",
  cp.sender_user_id as "작성자id",
  cp.target_gender as "찾는사람성별",
  cp.seen_date as "마주친날짜",
  cp.time_period as "시간",
  coalesce(cp.main_place, split_part(cp.place, ' - ', 1)) as "장소",
  coalesce(cp.detail_place, nullif(split_part(cp.place, ' - ', 2), '')) as "구체적인위치",
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
  to_char(check_matches.latest_checked_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "최근_구름확인시간",
  check_matches.checker_nicknames as "구름확인_닉네임목록",
  check_matches.checker_genders as "구름확인_성별목록",
  coalesce(view_matches.view_count, 0)::integer as "구름확인_실제노출수",
  to_char(view_matches.latest_viewed_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "최근_실제노출시간",
  view_matches.viewer_nicknames as "실제노출_닉네임목록"
from public.crush_posts cp
left join lateral (
  select
    count(*) as check_count,
    max(cc.checked_at) as latest_checked_at,
    string_agg(distinct cc.checker_nickname, ', ' order by cc.checker_nickname) as checker_nicknames,
    string_agg(distinct cc.checker_gender, ', ' order by cc.checker_gender) as checker_genders
  from public.cloud_checks cc
  where cc.checked_at >= timestamptz '2026-09-01 00:00:00+09'
    and cc.campus = cp.campus
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
  where cv.viewed_at >= timestamptz '2026-09-01 00:00:00+09'
    and cv.crush_post_id = cp.id
    and cv.viewer_user_id <> cp.sender_user_id
) view_matches on true
where cp.created_at >= timestamptz '2026-09-01 00:00:00+09'
order by cp.created_at desc;

create or replace view public."요약_회원성별캠퍼스" as
with 대상회원 as (
  select user_id, gender, campus
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
집계 as (
  select
    count(*)::numeric as 전체_성별선택회원수,
    count(*) filter (where gender = '여자')::numeric as 여성_회원수,
    count(*) filter (where gender = '남자')::numeric as 남성_회원수,
    count(*) filter (where campus = '죽전')::numeric as 죽전캠퍼스_회원수,
    count(*) filter (where campus = '천안')::numeric as 천안캠퍼스_회원수
  from 대상회원
)
select
  전체_성별선택회원수::integer as "전체_성별선택회원수",
  여성_회원수::integer as "여성_회원수",
  남성_회원수::integer as "남성_회원수",
  case when 전체_성별선택회원수 = 0 then 0 else round((여성_회원수 / 전체_성별선택회원수) * 100, 1) end as "여성_비율_percent",
  case when 전체_성별선택회원수 = 0 then 0 else round((남성_회원수 / 전체_성별선택회원수) * 100, 1) end as "남성_비율_percent",
  죽전캠퍼스_회원수::integer as "죽전캠퍼스_회원수",
  천안캠퍼스_회원수::integer as "천안캠퍼스_회원수"
from 집계;

create or replace view public."요약_성별별_회원기본" as
with 회원 as (
  select user_id, gender, campus
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
전체 as (
  select count(*)::numeric as 전체회원수
  from 회원
)
select
  h.gender as "성별",
  count(*)::integer as "회원수",
  round(count(*)::numeric / nullif(max(t.전체회원수), 0) * 100, 1) as "전체중_비율_percent",
  count(*) filter (where h.campus = '죽전')::integer as "죽전캠퍼스_회원수",
  count(*) filter (where h.campus = '천안')::integer as "천안캠퍼스_회원수",
  round(count(*) filter (where h.campus = '죽전')::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "죽전_비율_percent",
  round(count(*) filter (where h.campus = '천안')::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "천안_비율_percent"
from 회원 h
cross join 전체 t
group by h.gender
order by h.gender;

create or replace view public."요약_성별별_구름보내기" as
with 회원 as (
  select user_id, gender, campus
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
보낸구름 as (
  select
    h.gender,
    h.user_id,
    cp.id,
    cp.target_gender,
    cp.campus,
    cp.place,
    (cp.created_at at time zone 'Asia/Seoul')::date as kst_created_date
  from 회원 h
  left join public.crush_posts cp
    on cp.sender_user_id = h.user_id
   and cp.created_at >= timestamptz '2026-09-01 00:00:00+09'
)
select
  gender as "보낸사람_성별",
  count(distinct user_id)::integer as "성별선택_회원수",
  count(id)::integer as "띄운구름수",
  count(distinct user_id) filter (where id is not null)::integer as "구름띄운_회원수",
  round(count(id)::numeric / nullif(count(distinct user_id)::numeric, 0), 2) as "회원당_평균_띄운구름수",
  count(id) filter (where target_gender = '여자')::integer as "여성을_찾는_구름수",
  count(id) filter (where target_gender = '남자')::integer as "남성을_찾는_구름수",
  count(id) filter (where campus = '죽전')::integer as "죽전에서_띄운구름수",
  count(id) filter (where campus = '천안')::integer as "천안에서_띄운구름수",
  count(distinct kst_created_date) filter (where id is not null)::integer as "구름이_뜬_날짜수",
  count(distinct split_part(place, ' - ', 1)) filter (where id is not null)::integer as "구름이_뜬_대표장소수"
from 보낸구름
group by gender
order by gender;

create or replace view public."요약_성별별_구름확인하기" as
with 회원 as (
  select user_id, gender, campus
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
확인기록 as (
  select
    h.gender,
    h.user_id,
    cc.id,
    cc.result_count,
    (cc.checked_at at time zone 'Asia/Seoul')::date as kst_checked_date
  from 회원 h
  left join public.cloud_checks cc
    on cc.checker_user_id = h.user_id
   and cc.checked_at >= timestamptz '2026-09-01 00:00:00+09'
)
select
  gender as "확인한사람_성별",
  count(distinct user_id)::integer as "성별선택_회원수",
  count(id)::integer as "구름확인_기록수",
  count(distinct user_id) filter (where id is not null)::integer as "구름확인_회원수",
  round(count(id)::numeric / nullif(count(distinct user_id)::numeric, 0), 2) as "회원당_평균_확인횟수",
  coalesce(round(avg(result_count) filter (where id is not null), 2), 0) as "평균_후보구름수",
  count(id) filter (where coalesce(result_count, 0) = 0)::integer as "후보없음_확인수",
  count(id) filter (where coalesce(result_count, 0) > 0)::integer as "후보있음_확인수",
  round(count(id) filter (where coalesce(result_count, 0) > 0)::numeric / nullif(count(id)::numeric, 0) * 100, 1) as "후보발견율_percent",
  count(distinct kst_checked_date) filter (where id is not null)::integer as "확인한_날짜수"
from 확인기록
group by gender
order by gender;

create or replace view public."요약_성별별_응답매칭" as
with 회원 as (
  select user_id, gender
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
응답 as (
  select
    c.id,
    c.status,
    c.created_at,
    c.responded_at,
    c.rejected_by,
    c.claimer_user_id,
    cp.sender_user_id,
    claimer.gender as claimer_gender,
    sender.gender as sender_gender
  from public.claims c
  left join public.crush_posts cp
    on c.crush_post_id::text = cp.id::text
  left join 회원 claimer
    on claimer.user_id = c.claimer_user_id
  left join 회원 sender
    on sender.user_id = cp.sender_user_id
  where c.created_at >= timestamptz '2026-09-01 00:00:00+09'
)
select
  gender_table.gender as "성별",
  count(r.id) filter (where r.claimer_gender = gender_table.gender)::integer as "보낸응답수",
  count(distinct r.claimer_user_id) filter (where r.claimer_gender = gender_table.gender)::integer as "응답보낸_회원수",
  count(r.id) filter (where r.sender_gender = gender_table.gender)::integer as "받은응답수",
  count(distinct r.sender_user_id) filter (where r.sender_gender = gender_table.gender)::integer as "응답받은_회원수",
  count(r.id) filter (where r.claimer_gender = gender_table.gender and r.status in ('chat_requested', 'chat_accepted'))::integer as "채팅요청_보낸수",
  count(r.id) filter (where r.sender_gender = gender_table.gender and r.status in ('chat_requested', 'chat_accepted'))::integer as "채팅요청_받은수",
  count(r.id) filter (where (r.claimer_gender = gender_table.gender or r.sender_gender = gender_table.gender) and r.status = 'chat_accepted')::integer as "채팅수락_관련수",
  count(r.id) filter (where (r.claimer_gender = gender_table.gender or r.sender_gender = gender_table.gender) and r.status = 'rejected')::integer as "거절_관련수",
  round(count(r.id) filter (where r.sender_gender = gender_table.gender and r.status = 'chat_accepted')::numeric / nullif(count(r.id) filter (where r.sender_gender = gender_table.gender)::numeric, 0) * 100, 1) as "받은응답_채팅수락률_percent",
  round(count(r.id) filter (where r.claimer_gender = gender_table.gender and r.status = 'chat_accepted')::numeric / nullif(count(r.id) filter (where r.claimer_gender = gender_table.gender)::numeric, 0) * 100, 1) as "보낸응답_채팅성사율_percent"
from (values ('여자'), ('남자')) as gender_table(gender)
left join 응답 r
  on r.claimer_gender = gender_table.gender
  or r.sender_gender = gender_table.gender
group by gender_table.gender
order by gender_table.gender;

create or replace view public."요약_성별별_발견선택" as
with 회원 as (
  select user_id, gender
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
발견 as (
  select
    p.id,
    p.status,
    p.match_score,
    p.created_at,
    sender.gender as sender_gender,
    checker.gender as checker_gender
  from public.sender_cloud_check_picks p
  left join 회원 sender
    on sender.user_id = p.sender_user_id
  left join 회원 checker
    on checker.user_id = p.checker_user_id
  where p.created_at >= timestamptz '2026-09-01 00:00:00+09'
)
select
  gender_table.gender as "성별",
  count(f.id) filter (where f.sender_gender = gender_table.gender)::integer as "상대확인기록_선택수",
  count(f.id) filter (where f.sender_gender = gender_table.gender and f.status = 'interested')::integer as "이사람같아요_선택수",
  count(f.id) filter (where f.sender_gender = gender_table.gender and f.status = 'dismissed')::integer as "아닌것같아요_선택수",
  coalesce(round(avg(f.match_score) filter (where f.sender_gender = gender_table.gender), 1), 0) as "선택후보_평균일치율",
  count(f.id) filter (where f.checker_gender = gender_table.gender)::integer as "내확인기록이_상대에게_노출된수",
  count(f.id) filter (where f.checker_gender = gender_table.gender and f.status = 'interested')::integer as "나를_이사람같아요로_고른수"
from (values ('여자'), ('남자')) as gender_table(gender)
left join 발견 f
  on f.sender_gender = gender_table.gender
  or f.checker_gender = gender_table.gender
group by gender_table.gender
order by gender_table.gender;

create or replace view public."요약_성별별_채팅인스타" as
with 회원 as (
  select user_id, gender
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
채팅참여 as (
  select
    r.id as chat_room_id,
    r.created_at,
    r.closed_at,
    r.instagram_revealed_at,
    r.sender_instagram_consent as my_instagram_consent,
    r.sender_deleted_at as my_deleted_at,
    r.sender_user_id as user_id
  from public.chat_rooms r
  where r.created_at >= timestamptz '2026-09-01 00:00:00+09'
  union all
  select
    r.id as chat_room_id,
    r.created_at,
    r.closed_at,
    r.instagram_revealed_at,
    r.claimer_instagram_consent as my_instagram_consent,
    r.claimer_deleted_at as my_deleted_at,
    r.claimer_user_id as user_id
  from public.chat_rooms r
  where r.created_at >= timestamptz '2026-09-01 00:00:00+09'
),
참여성별 as (
  select h.gender, c.*
  from 채팅참여 c
  join 회원 h
    on h.user_id = c.user_id
),
메시지 as (
  select
    h.gender,
    count(m.id)::numeric as message_count
  from public.chat_messages m
  join 회원 h
    on h.user_id = m.sender_user_id
  where m.created_at >= timestamptz '2026-09-01 00:00:00+09'
  group by h.gender
)
select
  p.gender as "성별",
  count(distinct p.chat_room_id)::integer as "참여채팅방수",
  count(distinct p.chat_room_id) filter (where p.closed_at is null and now() <= p.created_at + interval '24 hours')::integer as "진행중_채팅방수",
  count(distinct p.chat_room_id) filter (where p.closed_at is not null or now() > p.created_at + interval '24 hours')::integer as "종료된_채팅방수",
  coalesce(max(m.message_count), 0)::integer as "보낸메시지수",
  count(*) filter (where p.my_instagram_consent is true)::integer as "인스타공개_yes_선택수",
  count(*) filter (where p.my_instagram_consent is false)::integer as "인스타공개_no_선택수",
  count(*) filter (where p.my_instagram_consent is null and (p.closed_at is not null or now() > p.created_at + interval '24 hours'))::integer as "종료후_인스타선택_대기수",
  count(distinct p.chat_room_id) filter (where p.instagram_revealed_at is not null)::integer as "인스타_상호공개_채팅방수",
  count(*) filter (where p.my_deleted_at is not null)::integer as "종료채팅방_내목록삭제수"
from 참여성별 p
left join 메시지 m
  on m.gender = p.gender
group by p.gender
order by p.gender;

create or replace view public."요약_성별별_전체퍼널" as
with 회원 as (
  select user_id, gender
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
회원별 as (
  select
    h.user_id,
    h.gender,
    exists (
      select 1 from public.crush_posts cp
      where cp.sender_user_id = h.user_id
        and cp.created_at >= timestamptz '2026-09-01 00:00:00+09'
    ) as sent_cloud,
    exists (
      select 1 from public.cloud_checks cc
      where cc.checker_user_id = h.user_id
        and cc.checked_at >= timestamptz '2026-09-01 00:00:00+09'
    ) as checked_cloud,
    exists (
      select 1 from public.claims c
      where c.claimer_user_id = h.user_id
        and c.created_at >= timestamptz '2026-09-01 00:00:00+09'
    ) as sent_response,
    exists (
      select 1
      from public.claims c
      join public.crush_posts cp on c.crush_post_id::text = cp.id::text
      where cp.sender_user_id = h.user_id
        and c.created_at >= timestamptz '2026-09-01 00:00:00+09'
    ) as received_response,
    exists (
      select 1
      from public.chat_rooms r
      where r.created_at >= timestamptz '2026-09-01 00:00:00+09'
        and (r.sender_user_id = h.user_id or r.claimer_user_id = h.user_id)
    ) as joined_chat,
    exists (
      select 1
      from public.chat_rooms r
      where r.instagram_revealed_at >= timestamptz '2026-09-01 00:00:00+09'
        and (r.sender_user_id = h.user_id or r.claimer_user_id = h.user_id)
    ) as revealed_instagram
  from 회원 h
)
select
  gender as "성별",
  count(*)::integer as "성별선택_회원수",
  count(*) filter (where sent_cloud)::integer as "구름보낸_회원수",
  round(count(*) filter (where sent_cloud)::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "구름보내기_전환율_percent",
  count(*) filter (where checked_cloud)::integer as "구름확인한_회원수",
  round(count(*) filter (where checked_cloud)::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "구름확인하기_전환율_percent",
  count(*) filter (where sent_response)::integer as "응답보낸_회원수",
  round(count(*) filter (where sent_response)::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "응답보내기_전환율_percent",
  count(*) filter (where received_response)::integer as "응답받은_회원수",
  count(*) filter (where joined_chat)::integer as "채팅방참여_회원수",
  round(count(*) filter (where joined_chat)::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "채팅참여_전환율_percent",
  count(*) filter (where revealed_instagram)::integer as "인스타공개경험_회원수",
  round(count(*) filter (where revealed_instagram)::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "인스타공개_전환율_percent"
from 회원별
group by gender
order by gender;

create or replace view public."요약_날짜별_구름수요공급" as
with sent as (
  select
    campus,
    (created_at at time zone 'Asia/Seoul')::date as activity_date,
    count(*) as sent_cloud_count,
    count(distinct sender_user_id) as sent_user_count
  from public.crush_posts
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
  group by campus, (created_at at time zone 'Asia/Seoul')::date
),
checked as (
  select
    campus,
    (checked_at at time zone 'Asia/Seoul')::date as activity_date,
    count(*) as check_count,
    count(distinct checker_user_id) as check_user_count,
    coalesce(sum(result_count), 0) as total_result_count,
    count(*) filter (where result_count = 0) as zero_result_check_count,
    avg(result_count)::numeric(10, 2) as avg_result_count
  from public.cloud_checks
  where checked_at >= timestamptz '2026-09-01 00:00:00+09'
  group by campus, (checked_at at time zone 'Asia/Seoul')::date
),
shown as (
  select
    cp.campus,
    (cv.viewed_at at time zone 'Asia/Seoul')::date as activity_date,
    count(cv.id) as viewed_cloud_count,
    count(distinct cv.viewer_user_id) as viewed_user_count
  from public.cloud_views cv
  join public.crush_posts cp
    on cp.id = cv.crush_post_id
  where cv.viewed_at >= timestamptz '2026-09-01 00:00:00+09'
  group by cp.campus, (cv.viewed_at at time zone 'Asia/Seoul')::date
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
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
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
  where cv.viewed_at >= timestamptz '2026-09-01 00:00:00+09'
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
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
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
  where cv.viewed_at >= timestamptz '2026-09-01 00:00:00+09'
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
  max(cc.checked_at) as "최근확인시간",
  to_char(max(cc.checked_at) at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "최근확인시간_KST"
from public.cloud_checks cc
where cc.checked_at >= timestamptz '2026-09-01 00:00:00+09'
group by cc.campus, cc.checker_gender
order by cc.campus, cc.checker_gender;

drop view if exists public."관리_구름보내기_V1";

create view public."관리_구름보내기_V1" as
select
  cp.id as "구름번호",
  to_char(cp.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "작성시간",
  cp.sender_user_id as "보낸사람ID",
  cp.sender_nickname as "보낸사람닉네임",
  cp.sender_gender as "보낸사람성별",
  cp.target_gender as "찾는사람성별",
  cp.seen_date as "마주친날짜",
  cp.time_period as "시간",
  coalesce(cp.main_place, split_part(cp.place, ' - ', 1)) as "장소",
  coalesce(cp.detail_place, nullif(split_part(cp.place, ' - ', 2), '')) as "구체적인위치",
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
  cp.message as "짧은메세지"
from public.crush_posts cp
where public.is_dankkum_admin()
  and cp.created_at >= timestamptz '2026-09-01 00:00:00+09'
order by cp.created_at desc;

drop view if exists public."관리_구름확인하기_V1";

create view public."관리_구름확인하기_V1" as
select
  cc.id as "구름확인 기록번호",
  to_char(cc.checked_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "확인한 시간",
  cc.checker_user_id as "확인한 사람 id",
  cc.checker_nickname as "확인한 사람 닉네임",
  cc.checker_gender as "확인한 사람 성별",
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
where public.is_dankkum_admin()
  and cc.checked_at >= timestamptz '2026-09-01 00:00:00+09'
order by cc.checked_at desc;

drop view if exists public."관리_회원요약";

create view public."관리_회원요약" as
select
  p.user_id as "회원ID",
  p.nickname as "닉네임",
  p.gender as "성별",
  p.department as "학과",
  p.student_year as "학번_또는_학년",
  p.instagram_id as "인스타ID",
  p.bio as "한줄소개",
  p.profile_image_url as "프로필사진",
  coalesce(sent_posts.sent_count, 0) as "보낸구름수",
  coalesce(my_claims.claimed_count, 0) as "응답한구름수"
from public.profiles p
left join (
  select sender_user_id, count(*) as sent_count
  from public.crush_posts
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
  group by sender_user_id
) sent_posts
  on sent_posts.sender_user_id = p.user_id
left join (
  select claimer_user_id, count(*) as claimed_count
  from public.claims
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
  group by claimer_user_id
) my_claims
  on my_claims.claimer_user_id = p.user_id
where public.is_dankkum_admin()
order by p.nickname;

drop view if exists public."관리_구름목록";

create view public."관리_구름목록" as
select
  cp.id as "구름번호",
  to_char(cp.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "작성시간",
  cp.seen_date as "마주친날짜",
  cp.time_period as "시간대",
  cp.place as "장소",
  split_part(cp.place, ' - ', 1) as "대표장소",
  cp.sender_nickname as "보낸사람",
  cp.sender_gender as "보낸사람성별",
  cp.sender_instagram as "보낸사람인스타",
  cp.target_gender as "찾는사람성별",
  cp.hair_feature as "머리정보",
  cp.clothes_style as "옷차림",
  cp.accessory as "소지품_분위기",
  cp.message as "메시지",
  coalesce(claim_counts.claim_count, 0) as "응답수",
  coalesce(view_counts.view_count, 0) as "조회수",
  coalesce(second_cloud_counts.second_cloud_count, 0) as "뭉게구름수",
  cp.sender_user_id as "보낸사람ID"
from public.crush_posts cp
left join (
  select crush_post_id::text as crush_post_id, count(*) as claim_count
  from public.claims
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
  group by crush_post_id::text
) claim_counts
  on claim_counts.crush_post_id = cp.id::text
left join (
  select crush_post_id::text as crush_post_id, count(*) as view_count
  from public.cloud_views
  where viewed_at >= timestamptz '2026-09-01 00:00:00+09'
  group by crush_post_id::text
) view_counts
  on view_counts.crush_post_id = cp.id::text
left join (
  select crush_post_id::text as crush_post_id, count(*) as second_cloud_count
  from public.cloud_views
  where second_cloud_sent_at >= timestamptz '2026-09-01 00:00:00+09'
  group by crush_post_id::text
) second_cloud_counts
  on second_cloud_counts.crush_post_id = cp.id::text
where public.is_dankkum_admin()
  and cp.created_at >= timestamptz '2026-09-01 00:00:00+09'
order by cp.created_at desc;

drop view if exists public."관리_응답목록";

create view public."관리_응답목록" as
select
  c.id as "응답번호",
  to_char(c.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "응답시간",
  c.status as "상태",
  c.claimer_nickname as "응답한사람",
  c.claimer_instagram as "응답한사람인스타",
  c.claimer_message as "응답메시지",
  cp.sender_nickname as "구름보낸사람",
  cp.sender_instagram as "구름보낸사람인스타",
  cp.seen_date as "마주친날짜",
  cp.time_period as "시간대",
  cp.place as "장소",
  cp.message as "원래구름메시지",
  c.crush_post_id as "구름번호",
  c.claimer_user_id as "응답한사람ID",
  cp.sender_user_id as "구름보낸사람ID"
from public.claims c
left join public.crush_posts cp
  on c.crush_post_id::text = cp.id::text
where public.is_dankkum_admin()
  and c.created_at >= timestamptz '2026-09-01 00:00:00+09'
order by c.created_at desc;

drop view if exists public."관리_구름조회기록";

create view public."관리_구름조회기록" as
select
  cv.id as "조회번호",
  to_char(cv.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "기록생성시간",
  to_char(cv.viewed_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "조회시간",
  to_char(cv.second_cloud_sent_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "뭉게구름보낸시간",
  cv.viewer_nickname as "조회한사람",
  cv.viewer_instagram as "조회한사람인스타",
  cp.sender_nickname as "구름보낸사람",
  cp.seen_date as "마주친날짜",
  cp.time_period as "시간대",
  cp.place as "장소",
  cp.message as "원래구름메시지",
  case
    when cv.second_cloud_sent_at is not null then '뭉게구름보냄'
    else '조회함'
  end as "조회상태",
  cv.crush_post_id as "구름번호",
  cv.viewer_user_id as "조회한사람ID",
  cp.sender_user_id as "구름보낸사람ID"
from public.cloud_views cv
left join public.crush_posts cp
  on cv.crush_post_id::text = cp.id::text
where public.is_dankkum_admin()
  and cv.viewed_at >= timestamptz '2026-09-01 00:00:00+09'
order by coalesce(cv.second_cloud_sent_at, cv.viewed_at, cv.created_at) desc;

drop view if exists public."관리_구름확인검색기록";

create view public."관리_구름확인검색기록" as
select
  cc.id as "검색번호",
  to_char(cc.checked_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "검색시간",
  cc.checker_nickname as "검색한사람",
  cc.checker_gender as "검색한사람성별",
  cc.checker_instagram as "검색한사람인스타",
  cc.seen_date as "검색날짜",
  cc.hair_feature as "입력한머리정보",
  cc.top_type as "상의종류",
  cc.top_color as "상의색",
  cc.bottom_type as "하의종류",
  cc.bottom_color as "하의색",
  cc.result_count as "검색결과수",
  cc.checker_user_id as "검색한사람ID"
from public.cloud_checks cc
where public.is_dankkum_admin()
  and cc.checked_at >= timestamptz '2026-09-01 00:00:00+09'
order by cc.checked_at desc;

drop view if exists public."관리_날짜별통계";

create view public."관리_날짜별통계" as
with dates as (
  select (created_at at time zone 'Asia/Seoul')::date as activity_date
  from public.crush_posts
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
  union
  select (checked_at at time zone 'Asia/Seoul')::date as activity_date
  from public.cloud_checks
  where checked_at >= timestamptz '2026-09-01 00:00:00+09'
),
sent as (
  select (created_at at time zone 'Asia/Seoul')::date as activity_date, count(*) as sent_clouds
  from public.crush_posts
  where created_at >= timestamptz '2026-09-01 00:00:00+09'
  group by (created_at at time zone 'Asia/Seoul')::date
),
checks as (
  select
    (checked_at at time zone 'Asia/Seoul')::date as activity_date,
    count(*) as search_count,
    sum(result_count) as total_search_results
  from public.cloud_checks
  where checked_at >= timestamptz '2026-09-01 00:00:00+09'
  group by (checked_at at time zone 'Asia/Seoul')::date
),
claims_by_date as (
  select (c.created_at at time zone 'Asia/Seoul')::date as activity_date, count(c.id) as claim_count
  from public.claims c
  where c.created_at >= timestamptz '2026-09-01 00:00:00+09'
  group by (c.created_at at time zone 'Asia/Seoul')::date
),
views_by_date as (
  select (cv.viewed_at at time zone 'Asia/Seoul')::date as activity_date, count(cv.id) as view_count
  from public.cloud_views cv
  where cv.viewed_at >= timestamptz '2026-09-01 00:00:00+09'
  group by (cv.viewed_at at time zone 'Asia/Seoul')::date
)
select
  d.activity_date as "날짜",
  coalesce(sent.sent_clouds, 0) as "보낸구름수",
  coalesce(checks.search_count, 0) as "구름확인횟수",
  coalesce(checks.total_search_results, 0) as "검색결과총합",
  coalesce(claims_by_date.claim_count, 0) as "응답수",
  coalesce(views_by_date.view_count, 0) as "조회수"
from dates d
left join sent using (activity_date)
left join checks using (activity_date)
left join claims_by_date using (activity_date)
left join views_by_date using (activity_date)
where public.is_dankkum_admin()
order by d.activity_date desc;

drop view if exists public."관리_장소별통계";

create view public."관리_장소별통계" as
select
  (cp.created_at at time zone 'Asia/Seoul')::date as "날짜",
  split_part(cp.place, ' - ', 1) as "대표장소",
  count(*) as "구름수",
  count(distinct cp.sender_user_id) as "보낸사람수",
  count(distinct c.id) as "응답수",
  count(distinct cv.id) as "조회수"
from public.crush_posts cp
left join public.claims c
  on c.crush_post_id::text = cp.id::text
 and c.created_at >= timestamptz '2026-09-01 00:00:00+09'
left join public.cloud_views cv
  on cv.crush_post_id::text = cp.id::text
 and cv.viewed_at >= timestamptz '2026-09-01 00:00:00+09'
where public.is_dankkum_admin()
  and cp.created_at >= timestamptz '2026-09-01 00:00:00+09'
group by (cp.created_at at time zone 'Asia/Seoul')::date, split_part(cp.place, ' - ', 1)
order by (cp.created_at at time zone 'Asia/Seoul')::date desc, count(*) desc;

do $$
declare
  viewer_view record;
begin
  for viewer_view in
    select table_schema, table_name
    from information_schema.views
    where table_schema = 'public'
      and (
        table_name = 'cloud_posts'
        or table_name like 'admin\_%' escape '\'
        or table_name like '관리\_%' escape '\'
        or table_name like '요약\_%' escape '\'
      )
  loop
    execute format(
      'revoke all privileges on table %I.%I from anon, authenticated',
      viewer_view.table_schema,
      viewer_view.table_name
    );
  end loop;
end $$;
