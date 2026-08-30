-- 관리자 명단 변경: djkim5882 제거, sde060904 추가.
-- is_dankkum_admin()이 app_metadata.is_admin만 보므로, 여기서 그 값만 바꿔주면 됩니다.
--
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

-- djkim5882: 관리자 권한 제거
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'is_admin'
where raw_user_meta_data ->> 'login_id' = 'djkim5882';

-- sde060904: 관리자 권한 부여
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_admin', true)
where raw_user_meta_data ->> 'login_id' = 'sde060904';

-- 확인용: 지금 관리자로 표시된 계정 목록
select id, raw_user_meta_data ->> 'login_id' as login_id, raw_app_meta_data ->> 'is_admin' as is_admin
from auth.users
where (raw_app_meta_data ->> 'is_admin')::boolean is true
   or raw_user_meta_data ->> 'login_id' in ('djkim5882', 'sde060904');
