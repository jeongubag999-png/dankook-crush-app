-- 심각한 권한 상승 취약점 수정.
--
-- is_dankkum_admin()이 지금까지 auth.jwt() -> 'user_metadata' ->> 'login_id'를
-- 검사하고 있었는데, user_metadata(raw_user_meta_data)는 로그인한 사용자 본인이
-- supabase.auth.updateUser({ data: { login_id: '...' } })를 호출해서 자유롭게
-- 바꿀 수 있는 값입니다. 즉 누구든 로그인한 뒤 브라우저 콘솔에서 그 한 줄만 실행하면
-- 본인의 login_id를 관리자 아이디(pjwo12356 등)로 위조해서, dku_verifications의
-- 이름·학번·인증사진 전체 열람, reports 전체 열람/처리, get_admin_campus_stats() 등
-- 관리자 전용 기능에 전부 접근할 수 있었습니다.
--
-- 수정: 관리자 판별을 user_metadata가 아니라 app_metadata(raw_app_meta_data) 기반으로
-- 바꿉니다. app_metadata는 Supabase Auth가 서버(관리자 API/서비스 롤)에서만 쓰도록
-- 강제하는 필드라서, 로그인한 사용자 본인은 절대 수정할 수 없습니다.
--
-- is_dankkum_admin()은 여러 RLS 정책과 get_admin_campus_stats()에서 재사용되고 있어서,
-- 이 함수 하나만 고치면 전부 같이 고쳐집니다.
--
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

-- 1) 기존 관리자 3개 계정에 app_metadata.is_admin = true 부여
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_admin', true)
where raw_user_meta_data ->> 'login_id' in ('pjwo12356', 'djkim5882', 'tjdgns02');

-- 2) 판별 로직을 app_metadata 기준으로 교체
create or replace function public.is_dankkum_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false);
$$;

-- 참고: 이미 로그인해 있는 관리자 세션은 JWT에 이 클레임이 없는 채로 발급돼 있을 수
-- 있습니다. 한 번 로그아웃 후 다시 로그인하면(또는 세션이 자동 갱신되면) 새 클레임이
-- 반영됩니다.
