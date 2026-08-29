-- profiles / dku_verifications / cloud_views / (미사용) posts,comments,likes RLS 잠금.
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

-- ---------------------------------------------------------------------------
-- profiles: "Users can view profiles"(true)와 "Allow authenticated select profile"(true)
-- 때문에 로그인 유저 누구나 전체 profiles 테이블(인스타그램 계정, 성별 등 포함)을 읽을 수
-- 있었음. chat_matching_flow.sql의 profiles_public 뷰 코멘트("타인 프로필은 이 뷰로만
-- 노출, profiles 테이블 자체 RLS는 안 건드림")가 의도한 설계를 정면으로 어기고 있었음.
-- "allow insert profiles for test"(anon, true)로 익명이 아무 user_id로나 가짜 프로필을
-- 만들 수도 있었음. App.jsx의 .from("profiles") 직접 호출 5곳은 전부 본인 행만 다룸
-- (다른 유저 미리보기는 이미 profiles_public 뷰를 통해서만 함) — owner-only로 좁혀도
-- 안전함.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can view profiles" on public.profiles;
drop policy if exists "Allow authenticated select profile" on public.profiles;
drop policy if exists "allow insert profiles for test" on public.profiles;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 중요: profiles_public 뷰(chat_matching_flow.sql)는 security_invoker = true로 만들어져
-- 있었습니다. invoker 모드에서는 뷰를 조회해도 기반 테이블(profiles)의 RLS가 "조회하는
-- 사람" 기준으로 그대로 적용되기 때문에, 위에서 profiles select를 본인 행으로만 좁히는
-- 순간 타인 프로필 미리보기(fetchPublicProfile)가 전부 깨져버립니다(자기 자신 row만
-- 보임). "이 뷰만 전체 공개"라는 원래 의도대로 동작하려면 뷰가 소유자(postgres) 권한으로
-- 실행되어 기반 테이블 RLS를 우회해야 하므로 security_invoker를 꺼야 합니다.
alter view public.profiles_public set (security_invoker = false);

-- ---------------------------------------------------------------------------
-- dku_verifications: "Allow authenticated select/update/insert"이 전부 using/check true라
-- 로그인 유저 누구나 모든 유저의 인증 기록(스크린샷 경로 등)을 읽고, 임의로 상태를
-- approved로 바꾸거나, 남의 user_id로 가짜 인증을 insert할 수 있었음. 관리자 여부는
-- 클라이언트(AdminPage.jsx)에서만 체크하고 있었어서 서버 쪽엔 아무 방어가 없었음.
-- reports 테이블에 이미 있는 is_dankkum_admin() 헬퍼를 재사용함.
-- delete 정책이 원래 하나도 없어서 계정 탈퇴 시 dku_verifications 정리가 항상 조용히
-- 실패하고 있었음 — 이번에 추가함.
-- ---------------------------------------------------------------------------

drop policy if exists "Allow authenticated insert" on public.dku_verifications;
drop policy if exists "Allow authenticated select" on public.dku_verifications;
drop policy if exists "Allow authenticated update" on public.dku_verifications;
drop policy if exists "Allow users to update own verification" on public.dku_verifications;

drop policy if exists "dku_verifications_insert_own" on public.dku_verifications;
create policy "dku_verifications_insert_own" on public.dku_verifications
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "dku_verifications_select_own_or_admin" on public.dku_verifications;
create policy "dku_verifications_select_own_or_admin" on public.dku_verifications
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_dankkum_admin());

drop policy if exists "dku_verifications_update_admin" on public.dku_verifications;
create policy "dku_verifications_update_admin" on public.dku_verifications
  for update
  to authenticated
  using (public.is_dankkum_admin())
  with check (public.is_dankkum_admin());

drop policy if exists "dku_verifications_delete_own" on public.dku_verifications;
create policy "dku_verifications_delete_own" on public.dku_verifications
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- cloud_views: delete 정책이 원래 없어서, 계정 탈퇴 시
-- delete().eq("viewer_user_id", ...) / .in("crush_post_id", ...) 호출이 조용히
-- 0건 처리되고 있었음 (claims/dku_verifications와 같은 패턴). select/update와
-- 동일한 조건(본인이 viewer이거나 해당 crush_post의 sender)으로 delete도 허용.
-- ---------------------------------------------------------------------------

drop policy if exists "cloud_views_delete_related" on public.cloud_views;
create policy "cloud_views_delete_related" on public.cloud_views
  for delete
  to authenticated
  using (
    viewer_user_id = auth.uid()
    or exists (
      select 1 from public.crush_posts
      where crush_posts.id = cloud_views.crush_post_id
        and crush_posts.sender_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- posts / comments / likes: 앱 코드에서 전혀 쓰지 않는 빈 테이블(0 rows)이지만,
-- "_read"(true) 정책 때문에 익명(anon)까지 포함해 누구나 전체를 읽을 수 있는 상태였음.
-- 실제로 쓰는 기능이 생기기 전까지는 잠가둠.
-- ---------------------------------------------------------------------------

drop policy if exists "posts_read" on public.posts;
drop policy if exists "comments_read" on public.comments;
drop policy if exists "likes_read" on public.likes;

drop policy if exists "posts_select_own" on public.posts;
create policy "posts_select_own" on public.posts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "comments_select_own" on public.comments;
create policy "comments_select_own" on public.comments
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "likes_select_own" on public.likes;
create policy "likes_select_own" on public.likes
  for select to authenticated using (auth.uid() = user_id);
