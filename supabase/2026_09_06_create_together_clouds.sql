-- 같이할 구름: 캠퍼스 활동을 함께할 사람을 찾는 승인형 모집 구름.
-- 기존 1:1 구름/채팅 구조를 건드리지 않고 별도 테이블과 RPC로 정원/권한을 관리한다.

create table if not exists public.together_clouds (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_nickname text not null,
  campus text,
  category text not null,
  title text not null,
  body text not null,
  event_date date not null,
  time_period text not null,
  place text not null,
  custom_place text not null default '',
  max_members integer not null,
  accepted_count integer not null default 0,
  status text not null default 'recruiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint together_clouds_category_check check (
    category in (
      '밥/카페',
      '술',
      '운동',
      '공부/스터디',
      '게임',
      '행사',
      '프로젝트/대외활동',
      '취미',
      '이동',
      '친구 만들기',
      '글로벌',
      '기타'
    )
  ),
  constraint together_clouds_status_check check (
    status in ('recruiting', 'full', 'closed', 'expired', 'hidden')
  ),
  constraint together_clouds_max_members_check check (max_members between 2 and 20),
  constraint together_clouds_accepted_count_check check (
    accepted_count >= 0 and accepted_count <= max_members
  ),
  constraint together_clouds_title_not_blank_check check (length(trim(title)) > 0),
  constraint together_clouds_body_not_blank_check check (length(trim(body)) > 0),
  constraint together_clouds_place_not_blank_check check (length(trim(place)) > 0),
  constraint together_clouds_author_nickname_not_blank_check check (length(trim(author_nickname)) > 0)
);

create table if not exists public.together_cloud_requests (
  id uuid primary key default gen_random_uuid(),
  together_cloud_id uuid not null references public.together_clouds(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  requester_nickname text not null,
  request_message text not null default '',
  response_message text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint together_cloud_requests_status_check check (
    status in ('pending', 'accepted', 'rejected', 'cancelled')
  ),
  constraint together_cloud_requests_requester_nickname_not_blank_check
    check (length(trim(requester_nickname)) > 0),
  constraint together_cloud_requests_one_per_user_unique
    unique (together_cloud_id, requester_id)
);

create index if not exists idx_together_clouds_category_status_created_at
  on public.together_clouds (category, status, created_at desc);

create index if not exists idx_together_clouds_author_id
  on public.together_clouds (author_id);

create index if not exists idx_together_cloud_requests_cloud_status
  on public.together_cloud_requests (together_cloud_id, status);

create index if not exists idx_together_cloud_requests_requester_id
  on public.together_cloud_requests (requester_id);

create or replace function public.touch_together_cloud_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_together_clouds_updated_at on public.together_clouds;
create trigger trg_together_clouds_updated_at
  before update on public.together_clouds
  for each row
  execute function public.touch_together_cloud_updated_at();

drop trigger if exists trg_together_cloud_requests_updated_at on public.together_cloud_requests;
create trigger trg_together_cloud_requests_updated_at
  before update on public.together_cloud_requests
  for each row
  execute function public.touch_together_cloud_updated_at();

create or replace function public.request_together_cloud(
  p_together_cloud_id uuid,
  p_request_message text default ''
)
returns public.together_cloud_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cloud public.together_clouds%rowtype;
  v_request public.together_cloud_requests%rowtype;
  v_nickname text;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select *
  into v_cloud
  from public.together_clouds
  where id = p_together_cloud_id
  for update;

  if not found then
    raise exception '같이할 구름을 찾을 수 없습니다.';
  end if;

  if v_cloud.author_id = auth.uid() then
    raise exception '내가 띄운 구름에는 함께 요청을 보낼 수 없습니다.';
  end if;

  if v_cloud.status <> 'recruiting' then
    raise exception '이미 마감된 구름입니다.';
  end if;

  if exists (
    select 1
    from public.together_cloud_requests r
    where r.together_cloud_id = p_together_cloud_id
      and r.requester_id = auth.uid()
  ) then
    raise exception '이미 함께 요청을 보낸 구름입니다.';
  end if;

  select coalesce(nullif(trim(nickname), ''), '단꿈이')
  into v_nickname
  from public.profiles
  where id = auth.uid();

  insert into public.together_cloud_requests (
    together_cloud_id,
    requester_id,
    requester_nickname,
    request_message
  )
  values (
    p_together_cloud_id,
    auth.uid(),
    coalesce(v_nickname, '단꿈이'),
    trim(coalesce(p_request_message, ''))
  )
  returning * into v_request;

  return v_request;
end;
$$;

create or replace function public.respond_together_cloud_request(
  p_request_id uuid,
  p_status text,
  p_response_message text default ''
)
returns public.together_cloud_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.together_cloud_requests%rowtype;
  v_cloud public.together_clouds%rowtype;
  v_accepted_count integer;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if p_status not in ('accepted', 'rejected') then
    raise exception '수락 또는 거절만 처리할 수 있습니다.';
  end if;

  select *
  into v_request
  from public.together_cloud_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception '함께 요청을 찾을 수 없습니다.';
  end if;

  select *
  into v_cloud
  from public.together_clouds
  where id = v_request.together_cloud_id
  for update;

  if not found then
    raise exception '같이할 구름을 찾을 수 없습니다.';
  end if;

  if v_cloud.author_id <> auth.uid() and not public.is_dankkum_admin() then
    raise exception '내가 띄운 구름의 요청만 처리할 수 있습니다.';
  end if;

  if v_request.status <> 'pending' then
    raise exception '이미 처리된 함께 요청입니다.';
  end if;

  if p_status = 'accepted' then
    select accepted_count
    into v_accepted_count
    from public.together_clouds
    where id = v_cloud.id;

    if v_accepted_count >= v_cloud.max_members then
      update public.together_clouds
      set status = 'full'
      where id = v_cloud.id
        and status = 'recruiting';
      raise exception '이미 정원이 찬 구름입니다.';
    end if;
  end if;

  update public.together_cloud_requests
  set
    status = p_status,
    response_message = trim(coalesce(p_response_message, '')),
    responded_at = now()
  where id = p_request_id
  returning * into v_request;

  if p_status = 'accepted' then
    update public.together_clouds
    set accepted_count = accepted_count + 1
    where id = v_cloud.id
    returning accepted_count into v_accepted_count;

    if v_accepted_count >= v_cloud.max_members then
      update public.together_clouds
      set status = 'full'
      where id = v_cloud.id
        and status = 'recruiting';
    end if;
  end if;

  return v_request;
end;
$$;

create or replace function public.close_together_cloud(p_together_cloud_id uuid)
returns public.together_clouds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cloud public.together_clouds%rowtype;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select *
  into v_cloud
  from public.together_clouds
  where id = p_together_cloud_id
  for update;

  if not found then
    raise exception '같이할 구름을 찾을 수 없습니다.';
  end if;

  if v_cloud.author_id <> auth.uid() and not public.is_dankkum_admin() then
    raise exception '내가 띄운 구름만 마감할 수 있습니다.';
  end if;

  update public.together_clouds
  set status = 'closed', closed_at = now()
  where id = p_together_cloud_id
  returning * into v_cloud;

  return v_cloud;
end;
$$;

alter table public.together_clouds enable row level security;
alter table public.together_cloud_requests enable row level security;

drop policy if exists "together_clouds_select_visible" on public.together_clouds;
create policy "together_clouds_select_visible" on public.together_clouds
  for select
  using (
    status <> 'hidden'
    and not exists (
      select 1
      from public.blocks b
      where
        (b.blocker_user_id = auth.uid() and b.blocked_user_id = together_clouds.author_id)
        or
        (b.blocker_user_id = together_clouds.author_id and b.blocked_user_id = auth.uid())
    )
  );

drop policy if exists "together_clouds_insert_own" on public.together_clouds;
create policy "together_clouds_insert_own" on public.together_clouds
  for insert
  with check (auth.uid() = author_id);

drop policy if exists "together_clouds_update_author_or_admin" on public.together_clouds;
create policy "together_clouds_update_author_or_admin" on public.together_clouds
  for update
  using (auth.uid() = author_id or public.is_dankkum_admin())
  with check (auth.uid() = author_id or public.is_dankkum_admin());

drop policy if exists "together_cloud_requests_select_involved" on public.together_cloud_requests;
create policy "together_cloud_requests_select_involved" on public.together_cloud_requests
  for select
  using (
    requester_id = auth.uid()
    or public.is_dankkum_admin()
    or exists (
      select 1
      from public.together_clouds c
      where c.id = together_cloud_requests.together_cloud_id
        and c.author_id = auth.uid()
    )
  );

drop policy if exists "together_cloud_requests_insert_own" on public.together_cloud_requests;
create policy "together_cloud_requests_insert_own" on public.together_cloud_requests
  for insert
  with check (requester_id = auth.uid());

drop policy if exists "together_cloud_requests_update_involved" on public.together_cloud_requests;
drop policy if exists "together_cloud_requests_cancel_own_pending" on public.together_cloud_requests;
create policy "together_cloud_requests_cancel_own_pending" on public.together_cloud_requests
  for update
  using (requester_id = auth.uid() and status = 'pending')
  with check (requester_id = auth.uid() and status = 'cancelled');

drop policy if exists "together_cloud_requests_update_author_or_admin" on public.together_cloud_requests;
create policy "together_cloud_requests_update_author_or_admin" on public.together_cloud_requests
  for update
  using (
    public.is_dankkum_admin()
    or exists (
      select 1
      from public.together_clouds c
      where c.id = together_cloud_requests.together_cloud_id
        and c.author_id = auth.uid()
    )
  )
  with check (
    public.is_dankkum_admin()
    or exists (
      select 1
      from public.together_clouds c
      where c.id = together_cloud_requests.together_cloud_id
        and c.author_id = auth.uid()
    )
  );

grant execute on function public.request_together_cloud(uuid, text) to authenticated;
grant execute on function public.respond_together_cloud_request(uuid, text, text) to authenticated;
grant execute on function public.close_together_cloud(uuid) to authenticated;
