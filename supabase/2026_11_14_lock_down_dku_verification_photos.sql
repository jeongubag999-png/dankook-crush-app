-- 학생 인증 사진(dku-verifications 버킷) 접근을 본인 폴더 + 관리자로 제한한다.
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 문제(2026-11-14 발견): 버킷 정책이 bucket_id만 확인해서, 로그인한 사용자라면 누구나
-- 다른 사람의 MY DKU 캡처(이름·학번·학과)를 목록으로 보고 내려받을 수 있었다.
-- 또 업로드도 아무 경로에나 할 수 있었고, 삭제 정책이 없어 회원 탈퇴 시 본인 사진 삭제가
-- 조용히 실패하고 있었다.
--
-- 사진 경로는 항상 "<user_id>/<uuid>.<ext>" 이다(src/utils.js makeStorageFilePath).
-- 적용 전 확인: 511개 전부 첫 폴더 = owner.
-- 관리자 판별: public.is_dankkum_admin() (JWT app_metadata.is_admin, 사용자 수정 불가).
-- 자동 인증 엣지 함수는 service role이라 이 정책의 영향을 받지 않는다.

drop policy if exists "Allow authenticated uploads 1o5hzi1_0" on storage.objects;
drop policy if exists "Allow authenticated download 1o5hzi1_0" on storage.objects;
drop policy if exists "dku_verification_photos_insert_own" on storage.objects;
drop policy if exists "dku_verification_photos_select_own_or_admin" on storage.objects;
drop policy if exists "dku_verification_photos_delete_own_or_admin" on storage.objects;

-- 업로드: 본인 폴더에만
create policy "dku_verification_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dku-verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 보기/목록: 본인 사진 또는 관리자(관리자 페이지 서명 URL 생성용)
create policy "dku_verification_photos_select_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dku-verifications'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_dankkum_admin()
    )
  );

-- 삭제: 본인 사진(회원 탈퇴 정리) 또는 관리자
create policy "dku_verification_photos_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dku-verifications'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_dankkum_admin()
    )
  );
