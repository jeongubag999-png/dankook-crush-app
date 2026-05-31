-- 영어 admin_ 뷰 삭제용입니다.
-- 한글 뷰를 korean_admin_views_direct*.sql로 먼저 다시 만든 뒤 실행하세요.

drop view if exists public.admin_place_dashboard;
drop view if exists public.admin_daily_dashboard;
drop view if exists public.admin_cloud_checks_readable;
drop view if exists public.admin_cloud_views_readable;
drop view if exists public.admin_claims_readable;
drop view if exists public.admin_cloud_posts_readable;
drop view if exists public.admin_profiles_overview;
drop view if exists public.admin_verification_queue;
