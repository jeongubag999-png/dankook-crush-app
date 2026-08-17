-- 어뷰징 방지: 클라이언트 코드로는 anon key로 API를 직접 호출하면 우회되므로,
-- DB 트리거로 서버 단에서 강제합니다. Supabase 대시보드 SQL Editor에서 실행하세요.
-- 여러 번 실행해도 안전합니다(create or replace / drop if exists 사용).

-- 1) 신고 남용 방지: 사용자당 10분에 5건까지
create or replace function public.check_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.reports
    where reporter_user_id = new.reporter_user_id
      and created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception '신고를 너무 자주 보내고 있어요. 잠시 후 다시 시도해주세요.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_report_rate_limit on public.reports;
create trigger trg_report_rate_limit
  before insert on public.reports
  for each row execute function public.check_report_rate_limit();

-- 2) 구름 보내기 도배 방지: 사용자당 10분에 15건까지
create or replace function public.check_crush_post_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.crush_posts
    where sender_user_id = new.sender_user_id
      and created_at > now() - interval '10 minutes'
  ) >= 15 then
    raise exception '구름을 너무 빠르게 올리고 있어요. 잠시 후 다시 시도해주세요.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_crush_post_rate_limit on public.crush_posts;
create trigger trg_crush_post_rate_limit
  before insert on public.crush_posts
  for each row execute function public.check_crush_post_rate_limit();

-- 3) 채팅 메시지 도배 방지: 사용자당 1분에 30건까지 (정상 대화 속도는 넉넉히 허용)
create or replace function public.check_chat_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.chat_messages
    where sender_user_id = new.sender_user_id
      and created_at > now() - interval '1 minute'
  ) >= 30 then
    raise exception '메시지를 너무 빠르게 보내고 있어요. 잠시 후 다시 시도해주세요.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_message_rate_limit on public.chat_messages;
create trigger trg_chat_message_rate_limit
  before insert on public.chat_messages
  for each row execute function public.check_chat_message_rate_limit();
