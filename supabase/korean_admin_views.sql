-- Supabase Table Editor에서 보기 쉬운 한글 관리자 뷰입니다.
-- 기존 admin_ 뷰는 그대로 두고, 한글 이름의 뷰를 추가합니다.

create or replace view public."관리_학생인증대기" as
select
  id as "번호",
  verification_status as "인증상태",
  name as "이름",
  student_id as "학번",
  department as "학과",
  screenshot_path as "인증캡처경로",
  user_id as "회원ID",
  nickname as "닉네임",
  gender as "성별",
  instagram_id as "인스타ID",
  profile_image_url as "프로필사진"
from public.admin_verification_queue;

create or replace view public."관리_회원요약" as
select
  user_id as "회원ID",
  nickname as "닉네임",
  gender as "성별",
  department as "학과",
  student_year as "학번_또는_학년",
  instagram_id as "인스타ID",
  bio as "한줄소개",
  profile_image_url as "프로필사진",
  sent_cloud_count as "보낸구름수",
  claimed_cloud_count as "응답한구름수"
from public.admin_profiles_overview;

create or replace view public."관리_구름목록" as
select
  id as "구름번호",
  created_at as "작성시간",
  seen_date as "마주친날짜",
  time_period as "시간대",
  place as "장소",
  main_place as "대표장소",
  sender_nickname as "보낸사람",
  sender_gender as "보낸사람성별",
  sender_instagram as "보낸사람인스타",
  target_gender as "찾는사람성별",
  hair_feature as "머리정보",
  clothes_style as "옷차림",
  accessory as "소지품_분위기",
  message as "메시지",
  claim_count as "응답수",
  view_count as "조회수",
  sender_user_id as "보낸사람ID"
from public.admin_cloud_posts_readable;

create or replace view public."관리_응답목록" as
select
  id as "응답번호",
  created_at as "응답시간",
  status as "상태",
  claimer_nickname as "응답한사람",
  claimer_instagram as "응답한사람인스타",
  claimer_message as "응답메시지",
  sender_nickname as "구름보낸사람",
  sender_instagram as "구름보낸사람인스타",
  seen_date as "마주친날짜",
  time_period as "시간대",
  place as "장소",
  original_cloud_message as "원래구름메시지",
  crush_post_id as "구름번호",
  claimer_user_id as "응답한사람ID",
  sender_user_id as "구름보낸사람ID"
from public.admin_claims_readable;

create or replace view public."관리_구름조회기록" as
select
  id as "조회번호",
  created_at as "기록생성시간",
  viewed_at as "조회시간",
  second_cloud_sent_at as "뭉게구름보낸시간",
  viewer_nickname as "조회한사람",
  viewer_instagram as "조회한사람인스타",
  sender_nickname as "구름보낸사람",
  seen_date as "마주친날짜",
  time_period as "시간대",
  place as "장소",
  original_cloud_message as "원래구름메시지",
  view_status as "조회상태",
  crush_post_id as "구름번호",
  viewer_user_id as "조회한사람ID",
  sender_user_id as "구름보낸사람ID"
from public.admin_cloud_views_readable;

create or replace view public."관리_구름확인검색기록" as
select
  id as "검색번호",
  checked_at as "검색시간",
  checker_nickname as "검색한사람",
  checker_gender as "검색한사람성별",
  checker_instagram as "검색한사람인스타",
  seen_date as "검색날짜",
  hair_feature as "입력한머리정보",
  top_type as "상의종류",
  top_color as "상의색",
  bottom_type as "하의종류",
  bottom_color as "하의색",
  result_count as "검색결과수",
  checker_user_id as "검색한사람ID"
from public.admin_cloud_checks_readable;

create or replace view public."관리_날짜별통계" as
select
  activity_date as "날짜",
  sent_clouds as "보낸구름수",
  search_count as "구름확인횟수",
  total_search_results as "검색결과총합",
  claim_count as "응답수"
from public.admin_daily_dashboard;

create or replace view public."관리_장소별통계" as
select
  seen_date as "날짜",
  main_place as "대표장소",
  cloud_count as "구름수",
  sender_count as "보낸사람수",
  claim_count as "응답수"
from public.admin_place_dashboard;
