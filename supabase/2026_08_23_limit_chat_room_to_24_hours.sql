-- 채팅방 24시간 제한: 채팅방이 열린 시각(chat_rooms.created_at) 기준 24시간이 지나면
-- 더 이상 메시지를 보낼 수 없게 서버 단에서 강제합니다.
-- 클라이언트 코드만으로는 anon key로 API를 직접 호출하면 우회되므로 DB 트리거로 막습니다.
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

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
