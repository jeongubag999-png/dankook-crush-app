-- admin 스키마 뷰들의 시간 컬럼을 한국시간(KST, UTC+9)으로 변환해서 보여줍니다.
-- (실제 DB에는 여전히 UTC로 저장됩니다 — 이 파일은 "보여지는 값"만 바꾸는 것으로,
-- 데이터 자체나 앱 로직에는 전혀 영향 없습니다.)
--
-- 추가로 06_현황_가입추이는 다음 두 가지를 고칩니다:
--   1) 날짜 집계를 UTC가 아니라 KST 기준으로 다시 묶습니다 (자정~오전 9시 사이 가입자가
--      전날로 잘못 집계되던 것을 방지).
--   2) 누적 가입자수 컬럼을 추가해서 회원가입 추이를 한눈에 볼 수 있게 합니다.
--
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 주의: timestamptz 컬럼을 "AT TIME ZONE"으로 바꾸면 컬럼 타입이 timestamp(without time zone)로
-- 바뀌는데, create or replace view는 기존 컬럼의 타입을 바꿀 수 없어서(42P16 에러) 아래
-- 뷰들은 drop 후 다시 만듭니다.

drop view if exists admin."02_운영_신고차단현황";
drop view if exists admin."03_운영_매칭진행중";
drop view if exists admin."09_원본_구름목록";
drop view if exists admin."10_원본_응답목록";
drop view if exists admin."12_원본_채팅방목록";
drop view if exists admin."13_원본_구름조회기록";
drop view if exists admin."14_원본_구름확인검색기록";

-- =========================================================
-- 1. 운영
-- =========================================================

create or replace view admin."02_운영_신고차단현황" as
select
  '신고' as "유형",
  r.id::text as "번호",
  r.created_at at time zone 'Asia/Seoul' as "시간",
  r.status as "상태",
  rp.nickname as "신고자",
  tp.nickname as "대상자",
  r.target_type as "대상유형",
  r.reason as "사유",
  r.reporter_user_id as "신고자ID",
  r.target_user_id as "대상자ID"
from public.reports r
left join public.profiles rp on rp.user_id = r.reporter_user_id
left join public.profiles tp on tp.user_id = r.target_user_id
union all
select
  '차단' as "유형",
  b.id::text as "번호",
  b.created_at at time zone 'Asia/Seoul' as "시간",
  null as "상태",
  bp.nickname as "신고자",
  tbp.nickname as "대상자",
  null as "대상유형",
  null as "사유",
  b.blocker_user_id as "신고자ID",
  b.blocked_user_id as "대상자ID"
from public.blocks b
left join public.profiles bp on bp.user_id = b.blocker_user_id
left join public.profiles tbp on tbp.user_id = b.blocked_user_id
order by "시간" desc;

create or replace view admin."03_운영_매칭진행중" as
select
  c.id as "응답번호",
  c.status as "상태",
  c.created_at at time zone 'Asia/Seoul' as "요청시간",
  now() - c.created_at as "대기시간",
  c.claimer_nickname as "응답한사람",
  c.claimer_instagram as "응답한사람인스타",
  cp.sender_nickname as "구름보낸사람",
  cp.sender_instagram as "구름보낸사람인스타",
  cp.seen_date as "마주친날짜",
  cp.place as "장소",
  cp.message as "원래구름메시지",
  c.crush_post_id as "구름번호",
  c.claimer_user_id as "응답한사람ID",
  cp.sender_user_id as "구름보낸사람ID"
from public.claims c
left join public.crush_posts cp
  on c.crush_post_id::text = cp.id::text
where c.status in ('pending', 'chat_requested')
order by c.created_at asc;

-- =========================================================
-- 2. 현황
-- =========================================================

-- 06_현황_가입추이: KST 기준 일자 집계 + 누적 가입자수 추가
create or replace view admin."06_현황_가입추이" as
with daily as (
  select
    date_trunc('day', u.created_at at time zone 'Asia/Seoul')::date as signup_date,
    count(*) as signup_count,
    count(*) filter (where p.gender = '남자') as male_count,
    count(*) filter (where p.gender = '여자') as female_count
  from auth.users u
  join public.profiles p on p.user_id = u.id
  group by 1
)
select
  signup_date as "날짜",
  signup_count as "가입자수",
  male_count as "남자",
  female_count as "여자",
  sum(signup_count) over (order by signup_date) as "누적가입자수"
from daily
order by signup_date desc;

-- 07_현황_구름보내기이탈: KST 기준 일자 집계로 수정
create or replace view admin."07_현황_구름보내기이탈" as
select
  date_trunc('day', started_at at time zone 'Asia/Seoul')::date as "날짜",
  count(*) as "시도수",
  count(*) filter (where completed) as "완료수",
  round(100.0 * count(*) filter (where completed) / nullif(count(*), 0), 1) as "완료율(%)",
  mode() within group (order by exit_step_name) as "최다이탈단계"
from public.cloud_send_exit_logs
group by 1
order by 1 desc;

-- 08_현황_구름확인이탈: KST 기준 일자 집계로 수정
create or replace view admin."08_현황_구름확인이탈" as
select
  date_trunc('day', started_at at time zone 'Asia/Seoul')::date as "날짜",
  count(*) as "시도수",
  count(*) filter (where completed) as "완료수",
  round(100.0 * count(*) filter (where completed) / nullif(count(*), 0), 1) as "완료율(%)",
  mode() within group (order by exit_step_name) as "최다이탈단계"
from public.cloud_check_exit_logs
group by 1
order by 1 desc;

-- =========================================================
-- 3. 원본
-- =========================================================

create or replace view admin."09_원본_구름목록" as
select
  cp.id as "구름번호",
  cp.created_at at time zone 'Asia/Seoul' as "작성시간",
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

create or replace view admin."10_원본_응답목록" as
select
  c.id as "응답번호",
  c.created_at at time zone 'Asia/Seoul' as "응답시간",
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
order by c.created_at desc;

create or replace view admin."12_원본_채팅방목록" as
select
  r.id as "채팅방번호",
  r.created_at at time zone 'Asia/Seoul' as "생성시간",
  case
    when r.closed_at is not null then '종료됨'
    when now() > r.created_at + interval '24 hours' then '24시간경과'
    else '진행중'
  end as "상태",
  cp.sender_nickname as "구름보낸사람",
  cp.sender_instagram as "구름보낸사람인스타",
  cl.claimer_nickname as "응답한사람",
  cl.claimer_instagram as "응답한사람인스타",
  (select count(*) from public.chat_messages m where m.chat_room_id = r.id) as "메시지수",
  (select max(m.created_at) at time zone 'Asia/Seoul' from public.chat_messages m where m.chat_room_id = r.id) as "마지막메시지시간",
  r.sender_instagram_consent as "보낸사람인스타공개동의",
  r.claimer_instagram_consent as "응답자인스타공개동의",
  r.instagram_revealed_at at time zone 'Asia/Seoul' as "인스타공개시간",
  r.crush_post_id as "구름번호",
  r.sender_user_id as "보낸사람ID",
  r.claimer_user_id as "응답한사람ID"
from public.chat_rooms r
left join public.crush_posts cp on cp.id = r.crush_post_id
left join public.claims cl on cl.id = r.claim_id
order by r.created_at desc;

create or replace view admin."13_원본_구름조회기록" as
select
  cv.id as "조회번호",
  cv.created_at at time zone 'Asia/Seoul' as "기록생성시간",
  cv.viewed_at at time zone 'Asia/Seoul' as "조회시간",
  cv.second_cloud_sent_at at time zone 'Asia/Seoul' as "뭉게구름보낸시간",
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
order by coalesce(cv.second_cloud_sent_at, cv.viewed_at, cv.created_at) desc;

create or replace view admin."14_원본_구름확인검색기록" as
select
  cc.id as "검색번호",
  cc.checked_at at time zone 'Asia/Seoul' as "검색시간",
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
order by cc.checked_at desc;
