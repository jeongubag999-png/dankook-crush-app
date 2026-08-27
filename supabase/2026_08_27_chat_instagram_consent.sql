-- 채팅방 24시간 종료 후 인스타 공개 선택/각자 삭제 기능.
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

alter table public.chat_rooms
  add column if not exists sender_instagram_consent boolean,
  add column if not exists claimer_instagram_consent boolean,
  add column if not exists instagram_revealed_at timestamptz,
  add column if not exists sender_deleted_at timestamptz,
  add column if not exists claimer_deleted_at timestamptz;

create or replace function public.check_chat_room_expiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  room_created_at timestamptz;
  room_closed_at timestamptz;
begin
  if current_setting('app.allow_expired_instagram_message', true) = '1' then
    return new;
  end if;

  select created_at, closed_at into room_created_at, room_closed_at
  from public.chat_rooms
  where id = new.chat_room_id;

  if room_closed_at is not null then
    raise exception '종료된 채팅방이에요. 더 이상 메시지를 보낼 수 없어요.';
  end if;

  if room_created_at is not null and now() > room_created_at + interval '24 hours' then
    raise exception '채팅방이 24시간이 지나 종료됐어요. 더 이상 메시지를 보낼 수 없어요.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_chat_room_expiry on public.chat_messages;
create trigger trg_chat_room_expiry
  before insert on public.chat_messages
  for each row execute function public.check_chat_room_expiry();

create or replace function public.set_chat_instagram_consent(
  p_room_id bigint,
  p_consent boolean
)
returns public.chat_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.chat_rooms%rowtype;
  v_user_id uuid := auth.uid();
  v_sender_instagram text;
  v_claimer_instagram text;
begin
  if v_user_id is null then
    raise exception '로그인이 필요해요.';
  end if;

  select * into v_room
  from public.chat_rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception '채팅방을 찾지 못했어요.';
  end if;

  if v_user_id <> v_room.sender_user_id and v_user_id <> v_room.claimer_user_id then
    raise exception '이 채팅방의 참여자만 선택할 수 있어요.';
  end if;

  if v_room.closed_at is null and now() < v_room.created_at + interval '24 hours' then
    raise exception '채팅방이 종료된 뒤에 선택할 수 있어요.';
  end if;

  if v_user_id = v_room.sender_user_id and v_room.sender_instagram_consent is null then
    update public.chat_rooms
    set sender_instagram_consent = p_consent
    where id = p_room_id
    returning * into v_room;
  elsif v_user_id = v_room.claimer_user_id and v_room.claimer_instagram_consent is null then
    update public.chat_rooms
    set claimer_instagram_consent = p_consent
    where id = p_room_id
    returning * into v_room;
  end if;

  if v_room.sender_instagram_consent is true
     and v_room.claimer_instagram_consent is true
     and v_room.instagram_revealed_at is null then
    select nullif(trim(instagram_id), '') into v_sender_instagram
    from public.profiles
    where user_id = v_room.sender_user_id;

    select nullif(trim(instagram_id), '') into v_claimer_instagram
    from public.profiles
    where user_id = v_room.claimer_user_id;

    update public.chat_rooms
    set instagram_revealed_at = now()
    where id = p_room_id
    returning * into v_room;

    perform set_config('app.allow_expired_instagram_message', '1', true);

    insert into public.chat_messages (chat_room_id, sender_user_id, body)
    values
      (p_room_id, v_room.sender_user_id, '제 인스타그램 아이디는 "' || coalesce(v_sender_instagram, '미등록') || '"입니다.'),
      (p_room_id, v_room.claimer_user_id, '제 인스타그램 아이디는 "' || coalesce(v_claimer_instagram, '미등록') || '"입니다.');
  end if;

  select * into v_room
  from public.chat_rooms
  where id = p_room_id;

  return v_room;
end;
$$;

create or replace function public.delete_my_chat_room_view(p_room_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.chat_rooms%rowtype;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception '로그인이 필요해요.';
  end if;

  select * into v_room
  from public.chat_rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception '채팅방을 찾지 못했어요.';
  end if;

  if v_user_id <> v_room.sender_user_id and v_user_id <> v_room.claimer_user_id then
    raise exception '이 채팅방의 참여자만 삭제할 수 있어요.';
  end if;

  if v_room.closed_at is null and now() < v_room.created_at + interval '24 hours' then
    raise exception '종료된 채팅방만 삭제할 수 있어요.';
  end if;

  if v_user_id = v_room.sender_user_id then
    update public.chat_rooms
    set sender_deleted_at = coalesce(sender_deleted_at, now())
    where id = p_room_id;
  else
    update public.chat_rooms
    set claimer_deleted_at = coalesce(claimer_deleted_at, now())
    where id = p_room_id;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_rooms'
  ) then
    alter publication supabase_realtime add table public.chat_rooms;
  end if;
end $$;

revoke all on function public.set_chat_instagram_consent(bigint, boolean) from public;
grant execute on function public.set_chat_instagram_consent(bigint, boolean) to authenticated;

revoke all on function public.delete_my_chat_room_view(bigint) from public;
grant execute on function public.delete_my_chat_room_view(bigint) to authenticated;
