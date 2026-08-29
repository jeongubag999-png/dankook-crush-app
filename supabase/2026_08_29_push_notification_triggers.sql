-- 구름 응답/수락/새 메시지가 생길 때 send-push-notification Edge Function을 호출해
-- OneSignal 푸시 알림을 보내는 트리거.
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 시크릿은 이 파일에 직접 넣지 않고 Vault에 보관합니다. 최초 1회, SQL Editor에서
-- 아래 명령을 실행해 시크릿을 등록하세요 (값은 Edge Function 시크릿 PUSH_WEBHOOK_SECRET과
-- 동일해야 합니다):
--   select vault.create_secret('<시크릿 값>', 'push_webhook_secret');
-- 이미 등록되어 있고 값을 바꾸고 싶다면:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'push_webhook_secret'),
--     '<새 시크릿 값>'
--   );

create extension if not exists pg_net with schema extensions;

create or replace function public.call_push_notification_webhook(p_type text, p_record jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  limit 1;

  if v_secret is null then
    raise warning 'push_webhook_secret이 vault에 등록되어 있지 않아 푸시 웹훅 호출을 건너뜁니다.';
    return;
  end if;

  perform net.http_post(
    url := 'https://ikoerlpcoqznercmteyg.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object('type', p_type, 'record', p_record)
  );
end;
$$;

-- 1) 내 구름에 새 응답(claim)이 달렸을 때
create or replace function public.trg_notify_new_claim_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.call_push_notification_webhook('new_claim', to_jsonb(NEW));
  return NEW;
end;
$$;

drop trigger if exists trg_notify_new_claim on public.claims;
create trigger trg_notify_new_claim
  after insert on public.claims
  for each row execute function public.trg_notify_new_claim_fn();

-- 2) 내 응답이 수락되어 채팅방이 열렸을 때
create or replace function public.trg_notify_claim_accepted_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'chat_accepted'
     and new.chat_room_id is not null
     and old.status is distinct from new.status then
    perform public.call_push_notification_webhook('claim_accepted', to_jsonb(new));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_claim_accepted on public.claims;
create trigger trg_notify_claim_accepted
  after update on public.claims
  for each row execute function public.trg_notify_claim_accepted_fn();

-- 3) 채팅방에 새 메시지가 도착했을 때
create or replace function public.trg_notify_new_message_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.call_push_notification_webhook('new_message', to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists trg_notify_new_message on public.chat_messages;
create trigger trg_notify_new_message
  after insert on public.chat_messages
  for each row execute function public.trg_notify_new_message_fn();
