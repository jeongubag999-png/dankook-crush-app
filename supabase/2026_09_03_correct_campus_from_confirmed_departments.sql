-- Correct campus values using confirmed department aliases.
-- Confirmed by the operator on 2026-09-03:
-- - Nursing, creative writing, sports, science/health departments below are Cheonan.
-- - Global/business/liberal-college aliases below are Jukjeon.
--
-- After profiles are corrected, activity rows are synced from the owning profile.

with department_campus_map(department_alias, campus) as (
  values
    ('간호학과', '천안'),
    ('문예창작과', '천안'),
    ('생활체육학과', '천안'),
    ('경영공학과', '천안'),
    ('과학기술대학 물리학과', '천안'),
    ('과학기술대학 신소재공학과', '천안'),
    ('보건행정학과', '천안'),
    ('스포츠경영학과', '천안'),
    ('영어과', '천안'),
    ('제약공학과', '천안'),
    ('글로벌경영학과', '죽전'),
    ('율곡혁신칼리지', '죽전'),
    ('퇴계혁신칼리지', '죽전'),
    ('경영경제 경영학부', '죽전'),
    ('경영학과', '죽전'),
    ('도시계획부동산학부', '죽전'),
    ('국경', '죽전'),
    ('국제경영', '죽전')
),
normalized_map as (
  select
    public.normalize_dku_department_name(department_alias) as normalized_department,
    campus
  from department_campus_map
),
updated_profiles as (
  update public.profiles p
     set campus = nm.campus
  from normalized_map nm
  where public.normalize_dku_department_name(p.department) = nm.normalized_department
    and coalesce(p.is_deleted, false) = false
    and p.campus is distinct from nm.campus
  returning p.user_id, nm.campus
),
updated_cloud_checks as (
  update public.cloud_checks cc
     set campus = p.campus
  from public.profiles p
  where p.user_id = cc.checker_user_id
    and p.campus in ('죽전', '천안')
    and cc.campus is distinct from p.campus
  returning cc.id
),
updated_crush_posts as (
  update public.crush_posts cp
     set campus = p.campus
  from public.profiles p
  where p.user_id = cp.sender_user_id
    and p.campus in ('죽전', '천안')
    and cp.campus is distinct from p.campus
  returning cp.id
)
select 'updated_profiles' as change_type, count(*)::integer as rows_changed from updated_profiles
union all
select 'updated_cloud_checks', count(*)::integer from updated_cloud_checks
union all
select 'updated_crush_posts', count(*)::integer from updated_crush_posts;

-- Data-modifying CTEs use one statement snapshot. Run this second pass so
-- activity rows also see profile campus values changed by the first statement.
with synced_cloud_checks as (
  update public.cloud_checks cc
     set campus = p.campus
  from public.profiles p
  where p.user_id = cc.checker_user_id
    and p.campus in ('죽전', '천안')
    and cc.campus is distinct from p.campus
  returning cc.id
),
synced_crush_posts as (
  update public.crush_posts cp
     set campus = p.campus
  from public.profiles p
  where p.user_id = cp.sender_user_id
    and p.campus in ('죽전', '천안')
    and cp.campus is distinct from p.campus
  returning cp.id
)
select 'synced_cloud_checks' as change_type, count(*)::integer as rows_changed from synced_cloud_checks
union all
select 'synced_crush_posts', count(*)::integer from synced_crush_posts;
