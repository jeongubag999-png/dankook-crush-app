-- 성별을 선택한 가입자 기준 여성/남성 비율 + 죽전/천안 캠퍼스 수 요약.
-- Supabase Table Editor에서 public."요약_회원성별캠퍼스" 뷰로 확인할 수 있습니다.

create or replace view public."요약_회원성별캠퍼스" as
with 대상회원 as (
  select
    user_id,
    gender,
    campus
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
집계 as (
  select
    count(*)::numeric as 전체_성별선택회원수,
    count(*) filter (where gender = '여자')::numeric as 여성_회원수,
    count(*) filter (where gender = '남자')::numeric as 남성_회원수,
    count(*) filter (where campus = '죽전')::numeric as 죽전캠퍼스_회원수,
    count(*) filter (where campus = '천안')::numeric as 천안캠퍼스_회원수
  from 대상회원
)
select
  전체_성별선택회원수::integer as "전체_성별선택회원수",
  여성_회원수::integer as "여성_회원수",
  남성_회원수::integer as "남성_회원수",
  case
    when 전체_성별선택회원수 = 0 then 0
    else round((여성_회원수 / 전체_성별선택회원수) * 100, 1)
  end as "여성_비율_percent",
  case
    when 전체_성별선택회원수 = 0 then 0
    else round((남성_회원수 / 전체_성별선택회원수) * 100, 1)
  end as "남성_비율_percent",
  죽전캠퍼스_회원수::integer as "죽전캠퍼스_회원수",
  천안캠퍼스_회원수::integer as "천안캠퍼스_회원수"
from 집계;

grant select on public."요약_회원성별캠퍼스" to authenticated;
