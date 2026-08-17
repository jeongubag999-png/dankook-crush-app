-- 5천명 규모 대비 성능 인덱스
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다(IF NOT EXISTS).
-- Postgres는 FK/필터 컬럼을 자동으로 인덱싱하지 않으므로, 자주 필터링/조인되는 컬럼에 직접 인덱스를 걸어둡니다.

-- 1) 구름 확인하기 검색: seen_date + target_gender 로 매번 필터링
create index if not exists idx_crush_posts_seen_date_target_gender
  on public.crush_posts (seen_date, target_gender);

-- 2) 내가 보낸 구름 조회
create index if not exists idx_crush_posts_sender_user_id
  on public.crush_posts (sender_user_id);

-- 3) claims: 특정 글에 달린 응답들 / 내가 보낸 응답들
create index if not exists idx_claims_crush_post_id
  on public.claims (crush_post_id);

create index if not exists idx_claims_claimer_user_id
  on public.claims (claimer_user_id);

-- 4) 구름 확인 기록: 내 기록 조회
create index if not exists idx_cloud_checks_checker_user_id
  on public.cloud_checks (checker_user_id);

-- 5) 채팅 메시지: 방 별 메시지 로드 (매 채팅방 진입마다 실행됨)
create index if not exists idx_chat_messages_chat_room_id
  on public.chat_messages (chat_room_id);

-- 6) 차단 목록 조회
create index if not exists idx_blocks_blocker_user_id
  on public.blocks (blocker_user_id);

-- 7) 관리자 페이지: 상태별 필터 (대기중/승인/거절)
create index if not exists idx_dku_verifications_status
  on public.dku_verifications (status);

create index if not exists idx_dku_verifications_user_id
  on public.dku_verifications (user_id);

-- 8) 신고 관리: 상태별 필터
create index if not exists idx_reports_status
  on public.reports (status);
