-- 심각한 인증 우회 취약점 수정.
--
-- dku_verifications의 insert 정책(dku_verifications_insert_own, 2026_08_29_lock_down_
-- profiles_and_verifications_rls.sql)이 auth.uid() = user_id만 검사하고 status 컬럼은
-- 전혀 제한하지 않았습니다. 즉 로그인한 사용자라면 누구든 브라우저 콘솔에서
--   supabase.from('dku_verifications').insert([{ user_id: 본인id, status: 'approved', ... }])
-- 를 직접 호출해서 MY DKU 학생 인증 전체(OCR/관리자 검토)를 완전히 우회하고 즉시
-- "인증됨" 상태를 스스로 부여할 수 있었습니다. checkVerificationStatus()가 이 status
-- 값을 그대로 신뢰해서 인증 게이트를 통과시키기 때문에 실질적인 인증 우회였습니다.
--
-- 수정: 클라이언트가 직접 insert할 수 있는 행은 status = 'pending'인 경우로만 제한합니다.
-- 'approved' 행은 오직 dku-auto-verification 엣지 함수가 서비스 롤로 직접 insert할 때만
-- 만들어지며(RLS는 서비스 롤에 적용되지 않음), 클라이언트는 더 이상 자동승인 판정이나
-- status 값을 직접 다루지 않습니다.
--
-- 재제출(VerificationPendingPage.handleRetryUpload)은 원래도 항상 status: "pending"만
-- insert하므로 이 제한으로 영향받지 않습니다.
--
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

drop policy if exists "dku_verifications_insert_own" on public.dku_verifications;
create policy "dku_verifications_insert_own" on public.dku_verifications
  for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');
