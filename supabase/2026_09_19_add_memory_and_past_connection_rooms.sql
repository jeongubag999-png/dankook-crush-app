-- 기억 구름과 과거 인연 구름을 기존 crush_posts 인프라에 추가한다.
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

alter table public.crush_posts
  add column if not exists memory_title text,
  add column if not exists memory_purpose text,
  add column if not exists memory_subpurpose text,
  add column if not exists memory_year integer,
  add column if not exists memory_semester text,
  add column if not exists memory_story text,
  add column if not exists memory_message text,
  add column if not exists past_kind text,
  add column if not exists past_school_level text,
  add column if not exists past_region text,
  add column if not exists past_subregion text,
  add column if not exists past_school_region text,
  add column if not exists past_school text,
  add column if not exists past_elementary_school text,
  add column if not exists past_middle_school text,
  add column if not exists past_high_school text,
  add column if not exists past_start_year integer,
  add column if not exists past_end_year integer,
  add column if not exists past_story text;

alter table public.crush_posts
  drop constraint if exists crush_posts_room_check;

alter table public.crush_posts
  add constraint crush_posts_room_check
  check (room in ('crush', 'language', 'memory', 'past_connection'));

create index if not exists crush_posts_room_created_at_idx
  on public.crush_posts (room, created_at desc);

-- 시그널·글로벌 구름은 기존처럼 캠퍼스별로 분리하되, 두 과거 인연 방은
-- 단국대 인증 사용자라면 죽전·천안 구분 없이 모두 볼 수 있게 한다.
drop policy if exists "crush_posts_campus_select_restrict" on public.crush_posts;
create policy "crush_posts_campus_select_restrict" on public.crush_posts
  as restrictive
  for select to authenticated
  using (
    room in ('memory', 'past_connection')
    or campus = (select p.campus from public.profiles p where p.user_id = auth.uid())
  );
