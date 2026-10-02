-- 앱 안 업데이트 팝업용 최신 버전 정보.
-- 새 버전이 스토어에 출시되면 latest_version만 올리면 된다:
--   update public.app_release_config set latest_version = '1.6.2', updated_at = now() where platform = 'ios';
-- 반드시 업데이트해야 하는 버전(치명적 버그 등)이면 min_version을 올린다.
-- min_version보다 낮은 앱은 "나중에" 없이 업데이트를 강제한다.

create table if not exists public.app_release_config (
  platform text primary key check (platform in ('ios', 'android')),
  latest_version text not null,
  min_version text not null default '0.0.0',
  store_url text not null,
  title text not null default '새 버전이 나왔어요',
  message text not null default '업데이트하고 새로운 기능을 만나보세요.',
  updated_at timestamptz not null default now()
);

alter table public.app_release_config enable row level security;

-- 로그인 전 화면에서도 확인해야 하므로 anon도 읽을 수 있다. 쓰기 정책은 두지 않는다
-- (대시보드/service role만 수정).
drop policy if exists "app_release_config_read" on public.app_release_config;
create policy "app_release_config_read"
  on public.app_release_config
  for select
  to anon, authenticated
  using (true);

insert into public.app_release_config (platform, latest_version, min_version, store_url, title, message)
values (
  'ios',
  '1.6.1',
  '0.0.0',
  'https://apps.apple.com/kr/app/id6792664390',
  '새 버전이 나왔어요 ☁️',
  '시험기간 도서관 좌석 구름이 생겼어요. 열람실에서 마주친 그 사람에게 좌석으로 구름을 보내보세요.'
)
on conflict (platform) do nothing;
