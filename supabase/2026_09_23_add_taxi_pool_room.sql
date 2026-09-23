-- 택시팟 구름: 심야에 학교/보정동/죽전역 등에서 택시 같이 탈 사람을 구하는 room.
-- crush_posts 테이블을 그대로 재사용한다 (place/time_period/message 필드가 이미
-- "출발 장소/출발 시각/메시지" 용도로 충분히 들어맞음). 새로 필요한 건 알림을 보낼
-- 반경 계산용 좌표(lat/lng)뿐이다.

alter table public.crush_posts
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table public.crush_posts
  drop constraint if exists crush_posts_room_check;

alter table public.crush_posts
  add constraint crush_posts_room_check
  check (room in ('crush', 'language', 'memory', 'past_connection', 'taxi'));

-- 택시팟 구름이 새로 올라오면 send-push-notification 웹훅으로 좌표 반경 브로드캐스트를
-- 요청한다. call_push_notification_webhook()은 2026_08_29_push_notification_triggers.sql
-- 에서 이미 만들어져 있으므로 재사용한다.
create or replace function public.trg_notify_new_taxi_post_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.room = 'taxi' then
    perform public.call_push_notification_webhook('new_taxi_post', to_jsonb(new));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_new_taxi_post on public.crush_posts;
create trigger trg_notify_new_taxi_post
  after insert on public.crush_posts
  for each row execute function public.trg_notify_new_taxi_post_fn();
