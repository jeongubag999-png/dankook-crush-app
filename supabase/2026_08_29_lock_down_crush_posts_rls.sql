-- crush_posts 테이블 RLS 잠금.
-- select/insert/update가 여러 정책이 OR로 결합되면서 원래 의도(같은 캠퍼스만 열람,
-- 본인 소유만 쓰기)가 무력화되어 있었습니다:
--   - select: "Users can view crush posts"(true, authenticated) +
--     "allow read crush posts for test"(true, anon) 때문에 로그인 안 한 사용자까지
--     전체 캠퍼스의 모든 글을 다 볼 수 있었음. campus 스코프 select 정책은 이미 있었지만
--     이 두 정책과 OR로 묶여서 사실상 무력화됨.
--   - insert: "allow insert crush posts for test"(true, anon) 때문에 로그인 없이도
--     누구나 글을 만들 수 있었고, 로그인 유저도 campus 일치 정책과 sender_user_id 일치
--     정책이 OR로 묶여 있어 같은 캠퍼스이기만 하면 sender_user_id를 다른 사람 것으로
--     위조해서 올릴 수 있었음.
--   - update: campus 일치 정책과 소유자 일치 정책이 OR로 묶여 있어, 같은 캠퍼스면
--     소유자가 아니어도 아무 글이나 수정 가능했음.
--   - delete: campus 일치만 체크하는 정책 하나뿐이라 소유자 체크가 전혀 없었음 — 같은
--     캠퍼스면 누구나 남의 글을 지울 수 있었음.
-- App.jsx의 crush_posts 호출부를 전부 확인한 결과, 정상 흐름은 항상
-- "sender_user_id = auth.uid()" AND "campus = 내 프로필 campus" 둘 다 만족합니다
-- (postData.campus는 항상 profile.campus에서 옴).
--
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

drop policy if exists "Users can view crush posts" on public.crush_posts;
drop policy if exists "allow read crush posts for test" on public.crush_posts;
drop policy if exists "allow insert crush posts for test" on public.crush_posts;
drop policy if exists "Users can insert own crush posts" on public.crush_posts;
drop policy if exists "crush_posts_campus_insert_restrict" on public.crush_posts;
drop policy if exists "Users can update own crush posts" on public.crush_posts;
drop policy if exists "crush_posts_campus_update_restrict" on public.crush_posts;
drop policy if exists "crush_posts_campus_delete_restrict" on public.crush_posts;

-- select는 기존 "crush_posts_campus_select_restrict" (campus 일치)를 그대로 둡니다.
-- 문제는 그 정책 자체가 아니라 그걸 무력화시키던 위의 두 select 정책이었습니다.
--
-- 중요: "crush_posts_campus_select_restrict"는 AS RESTRICTIVE로 만들어져 있습니다
-- (2026_08_24_add_campus_to_profiles_and_crush_posts.sql 참고). RESTRICTIVE 정책은
-- 그 자체로는 아무 행도 허용하지 않고, 다른 PERMISSIVE 정책이 이미 허용한 행을 추가로
-- 좁히기만 합니다. 위에서 유일한 PERMISSIVE select 정책들(true인 것들)을 지웠기 때문에,
-- 이 RESTRICTIVE 정책만 남으면 select가 전체 deny(0건)가 되어버립니다. 그래서 아래처럼
-- "authenticated면 일단 허용"하는 PERMISSIVE 정책을 다시 만들어야 하며, 실제 캠퍼스
-- 스코프는 기존 RESTRICTIVE 정책이 AND로 좁혀줍니다.

drop policy if exists "crush_posts_select_authenticated" on public.crush_posts;
create policy "crush_posts_select_authenticated" on public.crush_posts
  for select
  to authenticated
  using (true);

drop policy if exists "crush_posts_insert_own_campus" on public.crush_posts;
create policy "crush_posts_insert_own_campus" on public.crush_posts
  for insert
  to authenticated
  with check (
    auth.uid() = sender_user_id
    and campus = (select p.campus from public.profiles p where p.user_id = auth.uid())
  );

drop policy if exists "crush_posts_update_own_campus" on public.crush_posts;
create policy "crush_posts_update_own_campus" on public.crush_posts
  for update
  to authenticated
  using (auth.uid() = sender_user_id)
  with check (
    auth.uid() = sender_user_id
    and campus = (select p.campus from public.profiles p where p.user_id = auth.uid())
  );

drop policy if exists "crush_posts_delete_own" on public.crush_posts;
create policy "crush_posts_delete_own" on public.crush_posts
  for delete
  to authenticated
  using (auth.uid() = sender_user_id);
