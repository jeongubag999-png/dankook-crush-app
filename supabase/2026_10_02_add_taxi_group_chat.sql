-- 택시팟 전용 단체 채팅.
-- 기존 chat_rooms의 1:1 구조는 그대로 유지하고, room_kind='taxi_group'인 방만
-- taxi_chat_members를 통해 여러 명이 참여한다.

alter table public.chat_rooms
  add column if not exists room_kind text not null default 'direct';

-- 기존 1:1 방은 claim_id/claimer_user_id를 계속 채운다. 택시 단체방만 응답 승인 없이
-- 게시글 기준으로 생성되므로 두 컬럼의 NOT NULL 제약을 해제한다.
alter table public.chat_rooms
  alter column claim_id drop not null,
  alter column claimer_user_id drop not null;

alter table public.chat_rooms
  drop constraint if exists chat_rooms_room_kind_check;
alter table public.chat_rooms
  add constraint chat_rooms_room_kind_check
  check (room_kind in ('direct', 'taxi_group'));

create unique index if not exists chat_rooms_one_taxi_group_per_post
  on public.chat_rooms (crush_post_id)
  where room_kind = 'taxi_group';

create table if not exists public.taxi_chat_members (
  chat_room_id bigint not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null default '참여자',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (chat_room_id, user_id)
);

alter table public.taxi_chat_members enable row level security;

create or replace function public.is_active_taxi_chat_member(
  p_room_id bigint,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.taxi_chat_members m
    where m.chat_room_id = p_room_id
      and m.user_id = p_user_id
      and m.left_at is null
  );
$$;

revoke all on function public.is_active_taxi_chat_member(bigint, uuid) from public;
grant execute on function public.is_active_taxi_chat_member(bigint, uuid) to authenticated;

drop policy if exists "taxi_members_select_group" on public.taxi_chat_members;
create policy "taxi_members_select_group" on public.taxi_chat_members
  for select to authenticated
  using (public.is_active_taxi_chat_member(chat_room_id, auth.uid()));

drop policy if exists "chat_rooms_select_taxi_member" on public.chat_rooms;
create policy "chat_rooms_select_taxi_member" on public.chat_rooms
  for select to authenticated
  using (
    room_kind = 'taxi_group'
    and public.is_active_taxi_chat_member(id, auth.uid())
  );

drop policy if exists "chat_messages_select_taxi_member" on public.chat_messages;
create policy "chat_messages_select_taxi_member" on public.chat_messages
  for select to authenticated
  using (public.is_active_taxi_chat_member(chat_room_id, auth.uid()));

drop policy if exists "chat_messages_insert_taxi_member" on public.chat_messages;
create policy "chat_messages_insert_taxi_member" on public.chat_messages
  for insert to authenticated
  with check (
    auth.uid() = sender_user_id
    and public.is_active_taxi_chat_member(chat_room_id, auth.uid())
    and exists (
      select 1
      from public.chat_rooms r
      where r.id = chat_messages.chat_room_id
        and r.room_kind = 'taxi_group'
        and r.closed_at is null
    )
  );

create or replace function public.join_taxi_group_chat(
  p_post_id uuid,
  p_nickname text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.crush_posts%rowtype;
  v_room_id bigint;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select * into v_post
  from public.crush_posts
  where id = p_post_id and room = 'taxi';

  if not found then
    raise exception 'taxi_post_not_found';
  end if;

  if ((v_post.seen_date + v_post.time_period::time) at time zone 'Asia/Seoul')
      < now() - interval '30 minutes' then
    raise exception 'taxi_post_expired';
  end if;

  insert into public.chat_rooms (
    crush_post_id,
    sender_user_id,
    claimer_user_id,
    room_kind
  ) values (
    v_post.id,
    v_post.sender_user_id,
    null,
    'taxi_group'
  )
  on conflict (crush_post_id) where room_kind = 'taxi_group'
  do update set crush_post_id = excluded.crush_post_id
  returning id into v_room_id;

  insert into public.taxi_chat_members (chat_room_id, user_id, nickname, left_at)
  values (
    v_room_id,
    auth.uid(),
    coalesce(nullif(btrim(p_nickname), ''), '참여자'),
    null
  )
  on conflict (chat_room_id, user_id)
  do update set
    nickname = excluded.nickname,
    joined_at = case
      when public.taxi_chat_members.left_at is not null then now()
      else public.taxi_chat_members.joined_at
    end,
    left_at = null;

  return v_room_id;
end;
$$;

revoke all on function public.join_taxi_group_chat(uuid, text) from public;
grant execute on function public.join_taxi_group_chat(uuid, text) to authenticated;

create or replace function public.leave_taxi_group_chat(p_room_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.taxi_chat_members
  set left_at = now()
  where chat_room_id = p_room_id
    and user_id = auth.uid()
    and left_at is null;

  return found;
end;
$$;

revoke all on function public.leave_taxi_group_chat(bigint) from public;
grant execute on function public.leave_taxi_group_chat(bigint) to authenticated;

create or replace function public.get_my_taxi_group_chats()
returns table (
  chat_room_id bigint,
  crush_post_id uuid,
  joined_at timestamptz,
  place text,
  destination text,
  departure_date date,
  departure_time text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.chat_room_id,
    r.crush_post_id,
    m.joined_at,
    p.place,
    p.detail_place as destination,
    p.seen_date,
    p.time_period
  from public.taxi_chat_members m
  join public.chat_rooms r on r.id = m.chat_room_id
  join public.crush_posts p on p.id = r.crush_post_id
  where m.user_id = auth.uid()
    and m.left_at is null
    and r.room_kind = 'taxi_group'
  order by m.joined_at desc;
$$;

revoke all on function public.get_my_taxi_group_chats() from public;
grant execute on function public.get_my_taxi_group_chats() to authenticated;

grant select on public.taxi_chat_members to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'taxi_chat_members'
  ) then
    alter publication supabase_realtime add table public.taxi_chat_members;
  end if;
end $$;

-- PostgREST가 새 RPC를 즉시 인식하도록 스키마 캐시를 갱신한다.
notify pgrst, 'reload schema';
