-- 08/23에 추가된 trg_scrub_dku_verification_private_fields 트리거가
-- status가 approved/rejected로 바뀔 때마다 name/student_id/ocr_student_id/screenshot_path를
-- 서버에서 강제로 null 처리하고 있었습니다.
--
-- AdminPage.jsx에서 클라이언트 쪽 삭제 로직(스토리지 파일 삭제 + null 업데이트)을 제거했지만,
-- 이 DB 트리거가 살아있는 한 승인/거절 시 같은 필드가 계속 null로 지워집니다
-- (자동인증이 insert 시점에 status='approved'로 들어오는 경우도 동일하게 즉시 스크럽됨).
-- "이름/학번/사진 모두 남긴다"는 정책을 실제로 적용하려면 이 트리거를 없애야 합니다.
--
-- 주의: 이 트리거가 이미 적용된 채로 승인/거절 처리된 기존 행들은 name/student_id/
-- screenshot_path가 이미 null로 지워진 상태라 복구할 수 없습니다. 이 마이그레이션 이후
-- 새로 승인/거절되는 건부터 값이 보존됩니다.

drop trigger if exists trg_scrub_dku_verification_private_fields
  on public.dku_verifications;

drop function if exists public.scrub_dku_verification_private_fields();
