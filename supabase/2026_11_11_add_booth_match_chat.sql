-- 오프라인 부스 소개팅 매칭 → 둘 다 가입하면 1:1 채팅방 자동 개설.
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 동작:
--   1) 운영진이 booth_matches에 (instagram_a, instagram_b) 짝을 넣는다.
--   2) 프로필 인스타 아이디가 일치하고 재학생 인증이 승인된 사용자가 생기면
--      그 사람을 짝의 해당 칸(user_a / user_b)에 연결한다.
--   3) 양쪽이 모두 연결되는 순간 room_kind='booth_match' 채팅방을 만들고,
--      이번 가입/인증을 한 본인이 아닌 쪽에게 푸시를 보낸다.
--      (짝을 넣는 시점에 이미 둘 다 가입돼 있었다면 둘 다에게 보낸다.)
--   채팅방 자체는 기존 1:1 방과 같은 규칙(24시간, 인스타 공개 선택, 각자 삭제)을 따른다.
--
-- 짝 넣기 (운영진):
--   insert into public.booth_matches (instagram_a, instagram_b, note)
--   values ('jaehyuun31', '_kwndkk', '1번 짝'), ...;
--
-- 진행 현황 보기 (운영진):
--   select id, instagram_a, user_a is not null as a_가입, instagram_b, user_b is not null as b_가입,
--          chat_room_id, opened_at, note
--   from public.booth_matches order by id;

-- 0) 인스타 아이디 비교용 정규화 (공백·@ 제거, 소문자)
create or replace function public.normalize_instagram(p_value text)
returns text
language sql
immutable
as $$
  select nullif(lower(replace(btrim(coalesce(p_value, '')), '@', '')), '');
$$;

-- 1) 채팅방 종류에 booth_match 추가
-- 부스 방은 구름(crush_post) 없이 만들어진다. 운영 DB의 crush_post_id에 NOT NULL이
-- 걸려 있으면 방 생성이 실패하므로 해제한다(이미 nullable이면 아무 변화 없음).
alter table public.chat_rooms
  alter column crush_post_id drop not null;

alter table public.chat_rooms
  drop constraint if exists chat_rooms_room_kind_check;
alter table public.chat_rooms
  add constraint chat_rooms_room_kind_check
  check (room_kind in ('direct', 'taxi_group', 'booth_match'));

-- 2) 짝 테이블 (운영진 전용: RLS 켜고 정책 없음 → 앱에서는 직접 접근 불가)
create table if not exists public.booth_matches (
  id bigint generated always as identity primary key,
  event_name text not null default '부스 소개팅',
  instagram_a text not null,
  instagram_b text not null,
  user_a uuid references auth.users(id) on delete set null,
  user_b uuid references auth.users(id) on delete set null,
  chat_room_id bigint references public.chat_rooms(id) on delete set null,
  opened_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  constraint booth_matches_distinct check (
    public.normalize_instagram(instagram_a) is distinct from public.normalize_instagram(instagram_b)
  )
);

alter table public.booth_matches enable row level security;
revoke all on public.booth_matches from anon, authenticated;

-- 같은 짝을 실수로 두 번 넣으면 채팅방이 두 개 생기므로 순서와 무관하게 한 번만 허용한다.
create unique index if not exists booth_matches_unique_pair
  on public.booth_matches (
    least(public.normalize_instagram(instagram_a), public.normalize_instagram(instagram_b)),
    greatest(public.normalize_instagram(instagram_a), public.normalize_instagram(instagram_b))
  );

create index if not exists booth_matches_instagram_a_idx
  on public.booth_matches (public.normalize_instagram(instagram_a));
create index if not exists booth_matches_instagram_b_idx
  on public.booth_matches (public.normalize_instagram(instagram_b));

-- 3) 인스타 아이디 → 연결 가능한 사용자 1명 찾기
--    (삭제 안 됨 + 최신 재학생 인증이 approved). 같은 아이디를 쓰는 사람이
--    둘 이상이면 누구인지 확신할 수 없으므로 연결하지 않는다.
create or replace function public.find_booth_match_user(p_instagram text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  select array_agg(p.user_id) into v_ids
  from public.profiles p
  where public.normalize_instagram(p.instagram_id) = public.normalize_instagram(p_instagram)
    and coalesce(p.is_deleted, false) = false
    and (
      select v.status
      from public.dku_verifications v
      where v.user_id = p.user_id
      order by v.id desc
      limit 1
    ) = 'approved';

  if v_ids is null or array_length(v_ids, 1) <> 1 then
    return null;
  end if;
  return v_ids[1];
end;
$$;

revoke all on function public.find_booth_match_user(text) from public, anon, authenticated;

-- 4) 짝 하나를 연결/개설 시도. p_actor = 이번 이벤트를 일으킨 사용자(없으면 null)
create or replace function public.try_open_booth_match(p_match_id bigint, p_actor uuid default null)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.booth_matches%rowtype;
  v_room_id bigint;
begin
  select * into v_match
  from public.booth_matches
  where id = p_match_id
  for update;

  if not found or v_match.chat_room_id is not null then
    return v_match.chat_room_id;
  end if;

  if v_match.user_a is null then
    v_match.user_a := public.find_booth_match_user(v_match.instagram_a);
  end if;
  if v_match.user_b is null then
    v_match.user_b := public.find_booth_match_user(v_match.instagram_b);
  end if;

  if v_match.user_a is not null and v_match.user_a = v_match.user_b then
    v_match.user_b := null;
  end if;

  update public.booth_matches
  set user_a = v_match.user_a,
      user_b = v_match.user_b
  where id = p_match_id;

  if v_match.user_a is null or v_match.user_b is null then
    return null;
  end if;

  insert into public.chat_rooms (sender_user_id, claimer_user_id, room_kind)
  values (v_match.user_a, v_match.user_b, 'booth_match')
  returning id into v_room_id;

  update public.booth_matches
  set chat_room_id = v_room_id,
      opened_at = now()
  where id = p_match_id;

  if p_actor is distinct from v_match.user_a then
    perform public.call_push_notification_webhook(
      'booth_match_opened',
      jsonb_build_object('chat_room_id', v_room_id, 'user_id', v_match.user_a)
    );
  end if;
  if p_actor is distinct from v_match.user_b then
    perform public.call_push_notification_webhook(
      'booth_match_opened',
      jsonb_build_object('chat_room_id', v_room_id, 'user_id', v_match.user_b)
    );
  end if;

  return v_room_id;
end;
$$;

revoke all on function public.try_open_booth_match(bigint, uuid) from public, anon, authenticated;

-- 5) 특정 사용자 기준으로 걸려 있는 짝 전부 시도
create or replace function public.try_open_booth_matches_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instagram text;
  v_match_id bigint;
begin
  select public.normalize_instagram(instagram_id) into v_instagram
  from public.profiles
  where user_id = p_user_id;

  if v_instagram is null then
    return;
  end if;

  for v_match_id in
    select id
    from public.booth_matches
    where chat_room_id is null
      and (
        public.normalize_instagram(instagram_a) = v_instagram
        or public.normalize_instagram(instagram_b) = v_instagram
      )
  loop
    perform public.try_open_booth_match(v_match_id, p_user_id);
  end loop;
end;
$$;

revoke all on function public.try_open_booth_matches_for_user(uuid) from public, anon, authenticated;

-- 6) 트리거: 프로필 저장 / 인증 승인 / 짝 등록 시점에 시도
--    매칭 실패가 가입·인증 자체를 막으면 안 되므로 예외는 경고로만 남긴다.
create or replace function public.trg_booth_match_on_profile_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.instagram_id is distinct from old.instagram_id then
    begin
      perform public.try_open_booth_matches_for_user(new.user_id);
    exception when others then
      raise warning 'booth match (profile) failed: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_booth_match_on_profile on public.profiles;
create trigger trg_booth_match_on_profile
  after insert or update of instagram_id on public.profiles
  for each row execute function public.trg_booth_match_on_profile_fn();

create or replace function public.trg_booth_match_on_verification_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    begin
      perform public.try_open_booth_matches_for_user(new.user_id);
    exception when others then
      raise warning 'booth match (verification) failed: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_booth_match_on_verification on public.dku_verifications;
create trigger trg_booth_match_on_verification
  after insert or update of status on public.dku_verifications
  for each row execute function public.trg_booth_match_on_verification_fn();

create or replace function public.trg_booth_match_on_insert_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.try_open_booth_match(new.id, null);
  return new;
end;
$$;

drop trigger if exists trg_booth_match_on_insert on public.booth_matches;
create trigger trg_booth_match_on_insert
  after insert on public.booth_matches
  for each row execute function public.trg_booth_match_on_insert_fn();

-- 7) 앱용 RPC: 내 부스 매칭 상태 (채팅 목록 표시 + 안내 팝업용)
--    상대가 아직이면 chat_room_id/other_nickname은 null.
create or replace function public.get_my_booth_matches()
returns table (
  match_id bigint,
  chat_room_id bigint,
  opened_at timestamptz,
  my_role text,
  other_nickname text,
  other_department text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.chat_room_id,
    m.opened_at,
    case when m.user_a = auth.uid() then 'sender' else 'claimer' end,
    case when m.chat_room_id is not null then p.nickname end,
    case when m.chat_room_id is not null then p.department end
  from public.booth_matches m
  left join public.profiles p
    on p.user_id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
  where auth.uid() is not null
    and (m.user_a = auth.uid() or m.user_b = auth.uid())
  order by m.id desc;
$$;

revoke all on function public.get_my_booth_matches() from public, anon;
grant execute on function public.get_my_booth_matches() to authenticated;

-- 8) 보안 보강: 푸시 웹훅 함수는 트리거(security definer)에서만 부르면 되는데,
--    Supabase 기본 권한 때문에 로그인 사용자가 RPC로 직접 호출해 전체 푸시를
--    보낼 수 있는 상태였다. 앱 사용자 권한을 회수한다(트리거 동작에는 영향 없음).
revoke all on function public.call_push_notification_webhook(text, jsonb) from public, anon, authenticated;
revoke all on function public.claim_daily_push_milestone(date, text, integer) from public, anon, authenticated;

notify pgrst, 'reload schema';
