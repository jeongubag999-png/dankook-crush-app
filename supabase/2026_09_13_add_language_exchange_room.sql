-- "구름 띄우기/확인하기"에 언어교환·문화교류 방(room)을 추가하기 위한 스키마 변경.
-- 별도 테이블(want_posts 등) 대신 crush_posts에 room 판별 컬럼만 추가한다 — claims/
-- chat_rooms/chat_messages는 전부 crush_posts.id를 참조하는 매칭→클레임→채팅방 흐름이
-- 이미 완성되어 있고 RLS도 sender_user_id/campus 행 단위라, 새 테이블을 만들면 그 인프라를
-- 전부 이원화해야 해서 리스크가 크다. 언어교환 글도 그냥 room='language'인 crush_posts
-- 행일 뿐이므로 claims/chat 관련 정책은 전혀 손댈 필요가 없다.
--
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

alter table public.crush_posts
  add column if not exists room text not null default 'crush',
  add column if not exists lang_country text,
  add column if not exists lang_spoken text[],
  add column if not exists lang_wanted text[],
  add column if not exists lang_interests text[];

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crush_posts_room_check'
  ) then
    alter table public.crush_posts
      add constraint crush_posts_room_check check (room in ('crush', 'language'));
  end if;
end $$;

create index if not exists crush_posts_room_idx on public.crush_posts (room);
