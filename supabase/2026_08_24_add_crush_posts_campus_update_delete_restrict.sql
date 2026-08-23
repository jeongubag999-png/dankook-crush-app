-- 2026_08_24_add_campus_to_profiles_and_crush_posts.sql 후속: SELECT/INSERT에만 있던
-- 캠퍼스 RESTRICTIVE 정책을 UPDATE/DELETE에도 추가.
-- 이게 없으면 REST API를 직접 호출해 글의 campus를 다른 캠퍼스 값으로 바꿔치기해서
-- 캠퍼스 격리를 우회할 수 있음 (구름 보내기의 "빠른 구름 → 자세한 구름" 수정 경로가
-- 실제로 crush_posts를 update함, src/App.jsx의 saveCrushPost 참고).
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

drop policy if exists "crush_posts_campus_update_restrict" on public.crush_posts;
create policy "crush_posts_campus_update_restrict" on public.crush_posts
  as restrictive
  for update to authenticated
  using (
    campus = (select p.campus from public.profiles p where p.user_id = auth.uid())
  )
  with check (
    campus = (select p.campus from public.profiles p where p.user_id = auth.uid())
  );

drop policy if exists "crush_posts_campus_delete_restrict" on public.crush_posts;
create policy "crush_posts_campus_delete_restrict" on public.crush_posts
  as restrictive
  for delete to authenticated
  using (
    campus = (select p.campus from public.profiles p where p.user_id = auth.uid())
  );
