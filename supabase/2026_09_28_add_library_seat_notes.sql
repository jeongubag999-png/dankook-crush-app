-- 도서관 좌석 쪽지: 시그널 구름에 열람실 좌석 번호를 붙일 수 있게 한다.
--
-- crush_posts는 로그인 사용자 누구나 읽을 수 있다. 좌석 번호는 실시간 위치에 가까운
-- 정보라서 place 칼럼에는 "도서관 - 열람실"까지만 저장하고, 좌석 번호는 이 테이블에만
-- 둔다. 이 테이블은 보낸 사람 본인만 읽을 수 있다. 다른 사람은 아래 RPC로
-- "도서관+열람실+좌석+날짜"를 정확히 입력했을 때만 해당 구름 id를 받는다.
-- 좌석을 하나씩 대입해 훑는 걸 막기 위해 조회 횟수도 제한한다.

create table if not exists public.crush_post_seats (
  post_id uuid primary key references public.crush_posts(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  library text not null,
  reading_room text not null,
  seat_number integer not null check (seat_number between 1 and 9999),
  seen_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_crush_post_seats_lookup
  on public.crush_post_seats (library, reading_room, seat_number, seen_date);
create index if not exists idx_crush_post_seats_sender_created
  on public.crush_post_seats (sender_user_id, created_at desc);

alter table public.crush_post_seats enable row level security;
revoke all on table public.crush_post_seats from anon, authenticated;
grant select on table public.crush_post_seats to authenticated;

drop policy if exists "crush_post_seats_select_own" on public.crush_post_seats;
create policy "crush_post_seats_select_own" on public.crush_post_seats
  for select to authenticated
  using (sender_user_id = auth.uid());

-- 쓰기는 set_crush_post_seat() RPC로만 한다(소유권·하루 한도 검사를 서버에서 강제).

create table if not exists public.library_seat_lookups (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  looked_up_at timestamptz not null default now()
);

create index if not exists idx_library_seat_lookups_user_time
  on public.library_seat_lookups (user_id, looked_up_at desc);

alter table public.library_seat_lookups enable row level security;
revoke all on table public.library_seat_lookups from anon, authenticated;

-- 오늘(KST) 새로 좌석을 붙일 수 있는 남은 횟수. 하루 3개.
create or replace function public.library_seat_quota_left()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, 3 - count(*)::integer)
  from public.crush_post_seats
  where sender_user_id = auth.uid()
    and (created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date;
$$;

revoke all on function public.library_seat_quota_left() from public, anon;
grant execute on function public.library_seat_quota_left() to authenticated;

-- 내 시그널 구름에 좌석을 붙이거나(upsert) p_seat_number가 null이면 뗀다.
create or replace function public.set_crush_post_seat(
  p_post_id uuid,
  p_library text,
  p_reading_room text,
  p_seat_number integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_post record;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select id, sender_user_id, room, seen_date into v_post
  from public.crush_posts
  where id = p_post_id;

  if v_post.id is null or v_post.sender_user_id <> v_uid then
    raise exception 'post_not_found';
  end if;

  if p_seat_number is null then
    delete from public.crush_post_seats where post_id = p_post_id;
    return;
  end if;

  if v_post.room <> 'crush' or v_post.seen_date is null then
    raise exception 'seat_only_for_signal_cloud';
  end if;

  if coalesce(trim(p_library), '') = '' or coalesce(trim(p_reading_room), '') = '' then
    raise exception 'invalid_seat';
  end if;

  -- 이미 좌석이 붙은 구름을 수정하는 건 한도에서 빼고, 새로 붙일 때만 센다.
  if not exists (select 1 from public.crush_post_seats where post_id = p_post_id)
     and public.library_seat_quota_left() <= 0 then
    raise exception 'seat_daily_limit';
  end if;

  insert into public.crush_post_seats
    (post_id, sender_user_id, library, reading_room, seat_number, seen_date)
  values
    (p_post_id, v_uid, trim(p_library), trim(p_reading_room), p_seat_number, v_post.seen_date)
  on conflict (post_id) do update
    set library = excluded.library,
        reading_room = excluded.reading_room,
        seat_number = excluded.seat_number,
        seen_date = excluded.seen_date;
end;
$$;

revoke all on function public.set_crush_post_seat(uuid, text, text, integer) from public, anon;
grant execute on function public.set_crush_post_seat(uuid, text, text, integer) to authenticated;

-- 좌석+날짜가 정확히 일치하는 남의 시그널 구름 id를 돌려준다. 하루 20회 조회 제한.
-- 구름 본문은 클라이언트가 이 id로 crush_posts를 다시 읽는다(기존 RLS·차단 규칙 그대로 적용).
create or replace function public.find_library_seat_posts(
  p_library text,
  p_reading_room text,
  p_seat_number integer,
  p_seen_date date
)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lookups_today integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext('library_seat_lookup:' || v_uid::text));

  select count(*)::integer into v_lookups_today
  from public.library_seat_lookups
  where user_id = v_uid
    and (looked_up_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date;

  if v_lookups_today >= 20 then
    raise exception 'seat_lookup_limit';
  end if;

  insert into public.library_seat_lookups (user_id) values (v_uid);

  return query
    select s.post_id
    from public.crush_post_seats s
    where s.library = p_library
      and s.reading_room = p_reading_room
      and s.seat_number = p_seat_number
      and s.seen_date = p_seen_date
      and s.sender_user_id <> v_uid;
end;
$$;

revoke all on function public.find_library_seat_posts(text, text, integer, date) from public, anon;
grant execute on function public.find_library_seat_posts(text, text, integer, date) to authenticated;
