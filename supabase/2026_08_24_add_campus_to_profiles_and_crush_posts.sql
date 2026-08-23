-- 죽전/천안 캠퍼스 지원: profiles/crush_posts에 campus 컬럼 추가 + 캠퍼스 간 격리용 RLS.
-- 기존 사용자는 전부 '죽전'으로 기본값 백필됨 (현재 100% 죽전 사용자이므로 데이터 마이그레이션 불필요).
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

alter table public.profiles add column if not exists campus text not null default '죽전';
alter table public.crush_posts add column if not exists campus text not null default '죽전';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_campus_check'
  ) then
    alter table public.profiles
      add constraint profiles_campus_check check (campus in ('죽전', '천안'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crush_posts_campus_check'
  ) then
    alter table public.crush_posts
      add constraint crush_posts_campus_check check (campus in ('죽전', '천안'));
  end if;
end $$;

-- crush_posts의 기존 RLS 정책 내용을 몰라도 안전하게 추가만 하는 방법:
-- RESTRICTIVE 정책은 기존 PERMISSIVE 정책과 AND로 결합되어 "무조건 좁히기"만 하고 새로 허용하지 않음.
alter table public.crush_posts enable row level security;

drop policy if exists "crush_posts_campus_select_restrict" on public.crush_posts;
create policy "crush_posts_campus_select_restrict" on public.crush_posts
  as restrictive
  for select to authenticated
  using (
    campus = (select p.campus from public.profiles p where p.user_id = auth.uid())
  );

drop policy if exists "crush_posts_campus_insert_restrict" on public.crush_posts;
create policy "crush_posts_campus_insert_restrict" on public.crush_posts
  as restrictive
  for insert to authenticated
  with check (
    campus = (select p.campus from public.profiles p where p.user_id = auth.uid())
  );
