-- 홈 화면 배너에 돌아가는 "누적 사용자 / 누적 구름 / 누적 구름 확인 / 오늘 뜬 구름 /
-- 오늘 구름 확인" 5개 통계를 보여주기 위한 공개 통계 RPC.
-- profiles는 본인 행만 select 가능하고(2026_08_29_lock_down_profiles_and_verifications_rls.sql),
-- crush_posts는 같은 캠퍼스만 select 가능해서(2026_08_29_lock_down_crush_posts_rls.sql)
-- 클라이언트에서 직접 count를 세면 전체 앱 기준 숫자가 나오지 않습니다. 이 함수는
-- security definer로 RLS를 우회해 전체 캠퍼스 합계를 집계하되, 개별 행이 아닌 집계값만
-- 반환하므로 admin 게이트 없이 로그인 유저 누구나 호출 가능합니다.
--
-- want_posts(언어교환 매칭)는 아직 이 DB에 없을 수도 있어서, plpgsql + to_regclass로
-- 있으면 더하고 없으면 건너뜁니다.
--
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

drop function if exists public.get_public_app_stats();

create or replace function public.get_public_app_stats()
returns table (
  total_users bigint,
  total_clouds bigint,
  total_checks bigint,
  today_checks bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total_users bigint;
  v_total_clouds bigint;
  v_total_checks bigint;
  v_today_checks bigint;
begin
  select count(*) into v_total_users
  from public.profiles
  where coalesce(is_deleted, false) = false;

  select count(*) into v_total_clouds from public.crush_posts;

  if to_regclass('public.want_posts') is not null then
    v_total_clouds := v_total_clouds + (select count(*) from public.want_posts);
  end if;

  select count(*) into v_total_checks from public.cloud_checks;

  select count(*) into v_today_checks
  from public.cloud_checks
  where (checked_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date;

  return query select v_total_users, v_total_clouds, v_total_checks, v_today_checks;
end;
$$;

grant execute on function public.get_public_app_stats() to authenticated;
