-- 24시간이 지나기 전에도 사용자가 직접 채팅방을 나갈 수 있게 하는 RPC.
-- 나가기를 누르면 chat_rooms.closed_at을 즉시 채워서 두 참여자 모두에게
-- "종료된 채팅방"으로 표시되고 더 이상 메시지를 보낼 수 없게 됩니다.
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

create or replace function public.close_chat_room(p_room_id bigint)
returns public.chat_rooms
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
    raise exception '이 채팅방의 참여자만 나갈 수 있어요.';
  end if;

  if v_room.closed_at is null then
    update public.chat_rooms
    set closed_at = now()
    where id = p_room_id
    returning * into v_room;
  end if;

  return v_room;
end;
$$;

revoke all on function public.close_chat_room(bigint) from public;
grant execute on function public.close_chat_room(bigint) to authenticated;
