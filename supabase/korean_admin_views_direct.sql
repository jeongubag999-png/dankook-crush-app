-- 한글 관리자 뷰: 영어 admin_ 뷰 없이 원본 테이블을 직접 봅니다.
-- 먼저 이 파일을 실행한 다음, drop_english_admin_views.sql을 실행하세요.

create or replace view public."관리_학생인증대기" as
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

create or replace view public."관리_회원요약" as
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

create or replace view public."관리_구름목록" as
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
order by cp.created_at desc;

create or replace view public."관리_응답목록" as
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
