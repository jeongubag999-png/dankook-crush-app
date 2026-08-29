-- claims 테이블 RLS 잠금.
-- 기존에 "Anyone can select/insert/update claims" (role: PUBLIC, using: true) 정책이
-- 남아있어서 로그인조차 안 한 사용자도 모든 유저의 claim을 읽고 마음대로 고칠 수 있는
-- 상태였습니다. App.jsx의 claims 관련 호출 17곳을 전부 확인한 결과, 실제로 필요한 접근은
-- 항상 다음 둘 중 하나입니다:
--   1) 본인이 claimer_user_id인 경우 (내가 남긴 응답)
--   2) 본인이 해당 claim이 달린 crush_post의 sender_user_id인 경우 (내 구름에 달린 응답)
-- (예: saveSenderCheckPick은 sender가 claimer_user_id가 자신이 아닌 다른 유저의 claim을
--  update함 — 이건 "본인 = sender" 케이스로 커버됨.)
-- 삭제(delete) 정책은 원래 하나도 없어서 RLS 활성화 상태에서 delete는 이미 막혀 있었습니다
-- (계정 탈퇴, deleteMyPost 폴백 경로에서 필요하므로 이번에 추가합니다).
--
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

drop policy if exists "Anyone can select claims" on public.claims;
drop policy if exists "Anyone can insert claims" on public.claims;
drop policy if exists "Anyone can update claims" on public.claims;
drop policy if exists "Users can view claims" on public.claims;
drop policy if exists "Users can update claims" on public.claims;
drop policy if exists "Users can update related claims" on public.claims;
-- "Users can insert own claims" (auth.uid() = claimer_user_id)는 이미 적절하므로 유지합니다.

drop policy if exists "claims_select_participant" on public.claims;
create policy "claims_select_participant" on public.claims
  for select
  to authenticated
  using (
    auth.uid() = claimer_user_id
    or auth.uid() = (
      select sender_user_id from public.crush_posts where id = claims.crush_post_id
    )
  );

drop policy if exists "claims_update_participant" on public.claims;
create policy "claims_update_participant" on public.claims
  for update
  to authenticated
  using (
    auth.uid() = claimer_user_id
    or auth.uid() = (
      select sender_user_id from public.crush_posts where id = claims.crush_post_id
    )
  )
  with check (
    auth.uid() = claimer_user_id
    or auth.uid() = (
      select sender_user_id from public.crush_posts where id = claims.crush_post_id
    )
  );

drop policy if exists "claims_delete_participant" on public.claims;
create policy "claims_delete_participant" on public.claims
  for delete
  to authenticated
  using (
    auth.uid() = claimer_user_id
    or auth.uid() = (
      select sender_user_id from public.crush_posts where id = claims.crush_post_id
    )
  );
