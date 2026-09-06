-- 구름 게시판: 글로벌 구름판 단일 운영을 위한 보강 마이그레이션.
-- 기존 together_clouds 데이터는 보존하면서 새 UI의 '글로벌' 카테고리를 허용한다.

create table if not exists public.together_cloud_boards (
  id text primary key,
  name text not null,
  description text not null default '',
  icon text not null default '🌏',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint together_cloud_boards_id_not_blank_check check (length(trim(id)) > 0),
  constraint together_cloud_boards_name_not_blank_check check (length(trim(name)) > 0)
);

insert into public.together_cloud_boards (
  id,
  name,
  description,
  icon,
  sort_order,
  is_active
)
values (
  'global',
  '글로벌',
  '다른 언어, 다른 문화의 친구들과 구름처럼 이어져요.',
  '🌏',
  1,
  true
)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

alter table if exists public.together_clouds
  drop constraint if exists together_clouds_category_check;

alter table if exists public.together_clouds
  add constraint together_clouds_category_check check (
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
  );

create index if not exists idx_together_cloud_boards_active_sort
  on public.together_cloud_boards (is_active, sort_order, name);

alter table public.together_cloud_boards enable row level security;

drop policy if exists "together_cloud_boards_select_active" on public.together_cloud_boards;
create policy "together_cloud_boards_select_active" on public.together_cloud_boards
  for select
  using (is_active = true or public.is_dankkum_admin());

drop policy if exists "together_cloud_boards_admin_all" on public.together_cloud_boards;
create policy "together_cloud_boards_admin_all" on public.together_cloud_boards
  for all
  using (public.is_dankkum_admin())
  with check (public.is_dankkum_admin());
