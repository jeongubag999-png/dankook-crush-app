-- 대화하기 매칭 플로우 + 인앱 채팅 스키마
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

-- 1) cloud_views: 검색 시점 매칭 점수 저장 (뭉게구름 대상 제한용)
alter table public.cloud_views
  add column if not exists match_score integer;

-- 2) claims: 상태 머신 확장 + 채팅방 연결
-- status 값 집합: 'pending' | 'chat_requested' | 'chat_accepted' | 'rejected' (기존 'accepted'는 레거시로 유지)
alter table public.claims
  add column if not exists chat_room_id bigint,
  add column if not exists responded_at timestamptz,
  add column if not exists rejected_by text; -- 'sender' | 'claimer'
-- claims.id, crush_posts.id는 uuid (bigint 아님) — 아래 chat_rooms 컬럼 타입 참고

-- 3) 채팅방 (claim_id unique로 A/B 동시 수락 시 방 중복 생성 방지)
create table if not exists public.chat_rooms (
  id bigint generated always as identity primary key
);

alter table public.chat_rooms
  add column if not exists claim_id uuid references public.claims(id),
  add column if not exists crush_post_id uuid references public.crush_posts(id),
  add column if not exists sender_user_id uuid references auth.users(id),
  add column if not exists claimer_user_id uuid references auth.users(id),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists closed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chat_rooms_claim_id_unique'
  ) then
    alter table public.chat_rooms
      add constraint chat_rooms_claim_id_unique unique (claim_id);
  end if;
end $$;

alter table public.chat_rooms enable row level security;

drop policy if exists "chat_rooms_select_participant" on public.chat_rooms;
create policy "chat_rooms_select_participant" on public.chat_rooms
  for select to authenticated
  using (auth.uid() = sender_user_id or auth.uid() = claimer_user_id);

drop policy if exists "chat_rooms_insert_participant" on public.chat_rooms;
create policy "chat_rooms_insert_participant" on public.chat_rooms
  for insert to authenticated
  with check (auth.uid() = sender_user_id or auth.uid() = claimer_user_id);

-- 4) 채팅 메시지
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key
);

alter table public.chat_messages
  add column if not exists chat_room_id bigint references public.chat_rooms(id),
  add column if not exists sender_user_id uuid references auth.users(id),
  add column if not exists body text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists read_at timestamptz;

alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages_select_participant" on public.chat_messages;
create policy "chat_messages_select_participant" on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.chat_rooms r
      where r.id = chat_messages.chat_room_id
        and (r.sender_user_id = auth.uid() or r.claimer_user_id = auth.uid())
    )
  );

drop policy if exists "chat_messages_insert_participant" on public.chat_messages;
create policy "chat_messages_insert_participant" on public.chat_messages
  for insert to authenticated
  with check (
    auth.uid() = sender_user_id
    and exists (
      select 1 from public.chat_rooms r
      where r.id = chat_messages.chat_room_id
        and (r.sender_user_id = auth.uid() or r.claimer_user_id = auth.uid())
        and r.closed_at is null
    )
  );

drop policy if exists "chat_messages_update_read" on public.chat_messages;
create policy "chat_messages_update_read" on public.chat_messages
  for update to authenticated
  using (
    exists (
      select 1 from public.chat_rooms r
      where r.id = chat_messages.chat_room_id
        and (r.sender_user_id = auth.uid() or r.claimer_user_id = auth.uid())
    )
  )
  with check (true);

-- 5) Realtime publication에 chat_messages 추가 (새 메시지가 즉시 반영되게 함)
alter publication supabase_realtime add table public.chat_messages;

-- 6) 타인 프로필 미리보기용 전용 뷰 (닉네임/학과/학번/한줄소개만 노출, 인스타/성별 비노출)
-- profiles 테이블 자체의 RLS는 건드리지 않고, 이 뷰만 인증된 사용자 전체에게 열어줌
create or replace view public.profiles_public as
select user_id, nickname, department, student_year, bio
from public.profiles
where is_deleted = false or is_deleted is null;

alter view public.profiles_public set (security_invoker = true);
grant select on public.profiles_public to authenticated;
