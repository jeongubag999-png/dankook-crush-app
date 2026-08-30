-- 개발자(관리자)가 앱 안에서 죽전/천안 캠퍼스별 구름 현황을 바로 볼 수 있게 하는 RPC.
-- crush_posts는 캠퍼스별로 RLS가 걸려있어(자기 캠퍼스만 보임) 관리자 계정이라도 앱에서
-- 직접 select하면 상대 캠퍼스 데이터는 안 보입니다. 이 함수는 security definer로
-- RLS를 우회해서 두 캠퍼스를 한 번에 집계해주고, is_dankkum_admin()이 아니면 빈 결과를
-- 돌려줍니다 (기존 RLS 정책들은 건드리지 않습니다).
--
-- Supabase 대시보드 SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

create or replace function public.get_admin_campus_stats()
returns table (
  campus text,
  total_clouds bigint,
  today_clouds bigint,
  total_claims bigint,
  today_claims bigint,
  total_members bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.campus,
    coalesce(cp.total_clouds, 0) as total_clouds,
    coalesce(cp.today_clouds, 0) as today_clouds,
    coalesce(cl.total_claims, 0) as total_claims,
    coalesce(cl.today_claims, 0) as today_claims,
    coalesce(pr.total_members, 0) as total_members
  from (values ('죽전'), ('천안')) as c(campus)
  left join (
    select
      campus,
      count(*) as total_clouds,
      count(*) filter (
        where seen_date = (now() at time zone 'Asia/Seoul')::date
      ) as today_clouds
    from public.crush_posts
    group by campus
  ) cp on cp.campus = c.campus
  left join (
    select
      cp2.campus,
      count(*) as total_claims,
      count(*) filter (
        where (cl2.created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date
      ) as today_claims
    from public.claims cl2
    join public.crush_posts cp2 on cp2.id::text = cl2.crush_post_id::text
    group by cp2.campus
  ) cl on cl.campus = c.campus
  left join (
    select campus, count(*) as total_members
    from public.profiles
    where coalesce(is_deleted, false) = false
    group by campus
  ) pr on pr.campus = c.campus
  where public.is_dankkum_admin();
$$;

grant execute on function public.get_admin_campus_stats() to authenticated;
