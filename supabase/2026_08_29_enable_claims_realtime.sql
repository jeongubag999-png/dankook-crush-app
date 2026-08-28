-- claims 테이블 변경을 realtime으로 구독하기 위해 publication에 추가.
-- 매칭 대기 화면에서 쓰던 4초 폴링을 realtime 구독으로 대체하면서 필요해졌습니다.
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'claims'
  ) then
    alter publication supabase_realtime add table public.claims;
  end if;
end $$;
