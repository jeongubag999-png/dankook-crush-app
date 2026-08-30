-- 관리자 뷰 재구성: public 스키마에 흩어져 있던 "관리_*" 뷰들을 별도의 admin 스키마로 옮기고,
-- 운영(당장 처리할 것) / 현황(추이·통계) / 원본(가공된 원본 데이터) 세 그룹으로 재정리합니다.
--
-- 효과:
--   1) public 스키마 테이블 목록(Table Editor 사이드바)이 실제 앱 테이블만 남아 깔끔해집니다.
--      Table Editor 상단의 "schema public ▾" 드롭다운에서 "admin"으로 바꾸면 이 뷰들만 모여 있습니다.
--   2) admin 스키마는 기본적으로 PostgREST(API)에 노출되지 않는 스키마라서,
--      anon/authenticated 키로는 접근이 불가능합니다 (Project Settings > API > Exposed schemas에
--      "admin"을 추가하지 않았는지 한 번 확인해주세요 — 기본값은 public만 노출입니다).
--   3) 기존 public."관리_*" 8개 뷰는 이 파일 마지막에서 삭제합니다. 앱 코드(src/)에서 참조하는 곳이
--      없는 것을 확인했습니다.
--
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다(create or replace).

create schema if not exists admin;

-- =========================================================
-- 1. 운영 — 지금 당장 확인/처리해야 할 것
-- =========================================================

-- 01_운영_인증대기: 재학생 인증 심사 대기열 (기존 관리_학생인증대기 이전)
create or replace view admin."01_운영_인증대기" as
select
  v.id as "번호",
  v.status as "인증상태",
  v.name as "이름",
  v.student_id as "학번",
  v.department as "학과",
  v.screenshot_path as "인증캡처경로",
  v.user_id as "회원ID",
  p.nickname as "닉네임",
  p.gender as "성별",
  p.instagram_id as "인스타ID",
  p.profile_image_url as "프로필사진"
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

-- 02_운영_신고차단현황: 신고 + 차단을 한 화면에서 최신순으로 확인
create or replace view admin."02_운영_신고차단현황" as
select
  '신고' as "유형",
  r.id::text as "번호",
  r.created_at as "시간",
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
  b.created_at as "시간",
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

-- 03_운영_매칭진행중: 아직 결론 안 난 응답(pending/chat_requested) — 오래된 것부터(대기시간 김)
create or replace view admin."03_운영_매칭진행중" as
select
  c.id as "응답번호",
  c.status as "상태",
  c.created_at as "요청시간",
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
-- 2. 현황 — 추이/통계를 한눈에
-- =========================================================

-- 04_현황_일별활동추이 (기존 관리_날짜별통계 이전)
create or replace view admin."04_현황_일별활동추이" as
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
  select
    seen_date as activity_date,
    count(*) as search_count,
    sum(result_count) as total_search_results
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
order by d.activity_date desc;

-- 05_현황_장소별통계 (기존 관리_장소별통계 이전)
create or replace view admin."05_현황_장소별통계" as
select
  cp.seen_date as "날짜",
  split_part(cp.place, ' - ', 1) as "대표장소",
  count(*) as "구름수",
  count(distinct cp.sender_user_id) as "보낸사람수",
  count(distinct c.id) as "응답수",
  count(distinct cv.id) as "조회수"
from public.crush_posts cp
left join public.claims c
  on c.crush_post_id::text = cp.id::text
left join public.cloud_views cv
  on cv.crush_post_id::text = cp.id::text
group by cp.seen_date, split_part(cp.place, ' - ', 1)
order by cp.seen_date desc, count(*) desc;

-- 06_현황_가입추이: 일자별 신규 가입자 수 (auth.users 기준이라 항상 정확함)
create or replace view admin."06_현황_가입추이" as
select
  date_trunc('day', u.created_at)::date as "날짜",
  count(*) as "가입자수",
  count(*) filter (where p.gender = '남자') as "남자",
  count(*) filter (where p.gender = '여자') as "여자"
from auth.users u
join public.profiles p on p.user_id = u.id
group by 1
order by 1 desc;

-- 07_현황_구름보내기이탈: "구름 보내기" 작성 폼 이탈 추이 (일자별)
create or replace view admin."07_현황_구름보내기이탈" as
select
  date_trunc('day', started_at)::date as "날짜",
  count(*) as "시도수",
  count(*) filter (where completed) as "완료수",
  round(100.0 * count(*) filter (where completed) / nullif(count(*), 0), 1) as "완료율(%)",
  mode() within group (order by exit_step_name) as "최다이탈단계"
from public.cloud_send_exit_logs
group by 1
order by 1 desc;

-- 08_현황_구름확인이탈: "구름 확인하기" 검색 폼 이탈 추이 (일자별)
create or replace view admin."08_현황_구름확인이탈" as
select
  date_trunc('day', started_at)::date as "날짜",
  count(*) as "시도수",
  count(*) filter (where completed) as "완료수",
  round(100.0 * count(*) filter (where completed) / nullif(count(*), 0), 1) as "완료율(%)",
  mode() within group (order by exit_step_name) as "최다이탈단계"
from public.cloud_check_exit_logs
group by 1
order by 1 desc;

-- =========================================================
-- 3. 원본 — 가공된 원본 데이터 (한글 컬럼으로 읽기 편하게)
-- =========================================================

-- 09_원본_구름목록 (기존 관리_구름목록 이전)
create or replace view admin."09_원본_구름목록" as
select
  cp.id as "구름번호",
  cp.created_at as "작성시간",
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

-- 10_원본_응답목록 (기존 관리_응답목록 이전)
create or replace view admin."10_원본_응답목록" as
select
  c.id as "응답번호",
  c.created_at as "응답시간",
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

-- 11_원본_회원목록 (기존 관리_회원요약 이전)
create or replace view admin."11_원본_회원목록" as
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

-- 12_원본_채팅방목록: 매칭 성사된 1:1 채팅방 현황
create or replace view admin."12_원본_채팅방목록" as
select
  r.id as "채팅방번호",
  r.created_at as "생성시간",
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
  (select max(m.created_at) from public.chat_messages m where m.chat_room_id = r.id) as "마지막메시지시간",
  r.sender_instagram_consent as "보낸사람인스타공개동의",
  r.claimer_instagram_consent as "응답자인스타공개동의",
  r.instagram_revealed_at as "인스타공개시간",
  r.crush_post_id as "구름번호",
  r.sender_user_id as "보낸사람ID",
  r.claimer_user_id as "응답한사람ID"
from public.chat_rooms r
left join public.crush_posts cp on cp.id = r.crush_post_id
left join public.claims cl on cl.id = r.claim_id
order by r.created_at desc;

-- 13_원본_구름조회기록 (기존 관리_구름조회기록 이전)
create or replace view admin."13_원본_구름조회기록" as
select
  cv.id as "조회번호",
  cv.created_at as "기록생성시간",
  cv.viewed_at as "조회시간",
  cv.second_cloud_sent_at as "뭉게구름보낸시간",
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

-- 14_원본_구름확인검색기록 (기존 관리_구름확인검색기록 이전)
create or replace view admin."14_원본_구름확인검색기록" as
select
  cc.id as "검색번호",
  cc.checked_at as "검색시간",
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

-- =========================================================
-- 4. 정리 — public 스키마의 옛 관리_* 뷰 삭제 (admin 스키마로 이전 완료)
-- =========================================================

drop view if exists public."관리_학생인증대기";
drop view if exists public."관리_회원요약";
drop view if exists public."관리_구름목록";
drop view if exists public."관리_응답목록";
drop view if exists public."관리_구름조회기록";
drop view if exists public."관리_구름확인검색기록";
drop view if exists public."관리_날짜별통계";
drop view if exists public."관리_장소별통계";
