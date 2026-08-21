-- User friction metrics are kept separate from raw log tables.
-- These views calculate service-health signals from existing analytics logs.

create or replace function public.dankkum_rate_percent(numerator numeric, denominator numeric)
returns numeric
language sql
stable
as $$
  select case
    when denominator is null or denominator = 0 then null
    else round((numerator / denominator) * 100, 2)
  end;
$$;

drop view if exists public."관리_불편함지표_요약_V1";

create view public."관리_불편함지표_요약_V1" as
with
send_flow as (
  select
    count(*)::numeric as total_count,
    count(*) filter (where completed)::numeric as completed_count
  from public.cloud_send_exit_logs
),
check_flow as (
  select
    count(*)::numeric as total_count,
    count(*) filter (where completed)::numeric as completed_count,
    count(*) filter (where completed and coalesce(result_count, 0) = 0)::numeric as zero_result_count
  from public.cloud_check_exit_logs
),
result_exposure as (
  select count(*)::numeric as exposed_result_count
  from public.cloud_views
),
result_claims as (
  select
    count(*)::numeric as claim_count,
    count(*) filter (where status = 'accepted')::numeric as accepted_claim_count
  from public.claims
)
select
  '구름 보내기 완료율' as "지표명",
  send_flow.completed_count as "분자",
  send_flow.total_count as "분모",
  public.dankkum_rate_percent(send_flow.completed_count, send_flow.total_count) as "비율_percent",
  '구름 보내기를 시작한 기록 중 완료된 비율' as "설명"
from send_flow

union all

select
  '구름 확인하기 완료율',
  check_flow.completed_count,
  check_flow.total_count,
  public.dankkum_rate_percent(check_flow.completed_count, check_flow.total_count),
  '구름 확인하기를 시작한 기록 중 마지막 확인까지 완료한 비율'
from check_flow

union all

select
  '구름 확인 결과 0개 비율',
  check_flow.zero_result_count,
  check_flow.completed_count,
  public.dankkum_rate_percent(check_flow.zero_result_count, check_flow.completed_count),
  '구름 확인하기를 완료했지만 검색 결과가 0개였던 비율'
from check_flow

union all

select
  '구름 확인 결과 클릭률',
  result_claims.claim_count,
  result_exposure.exposed_result_count,
  public.dankkum_rate_percent(result_claims.claim_count, result_exposure.exposed_result_count),
  '검색 결과로 노출된 구름 중 응답으로 이어진 비율'
from result_claims
cross join result_exposure

union all

select
  '구름 확인 결과 매칭률',
  result_claims.accepted_claim_count,
  result_claims.claim_count,
  public.dankkum_rate_percent(result_claims.accepted_claim_count, result_claims.claim_count),
  '응답한 구름 중 상대가 수락해 매칭된 비율'
from result_claims;

drop view if exists public."관리_구름보내기_단계별불편함_V1";

create view public."관리_구름보내기_단계별불편함_V1" as
with steps as (
  select *
  from (values
    (1, '누구를 찾고 있나요?', 'step_1_seconds'),
    (2, '언제, 어디에서 마주쳤나요?', 'step_2_seconds'),
    (3, '헤어 정보', 'step_3_seconds'),
    (4, '상의·아우터·하의·신발', 'step_4_seconds'),
    (5, '소지품', 'step_5_seconds'),
    (6, '짧은 메시지', 'step_6_seconds')
  ) as s(step_number, step_name, step_column)
),
logs as (
  select
    l.*,
    case
      when l.previous_steps is null or l.previous_steps = '' then ''
      else ',' || l.previous_steps || ','
    end as previous_steps_wrapped
  from public.cloud_send_exit_logs l
)
select
  s.step_number as "단계번호",
  s.step_name as "단계명",
  count(l.id) filter (
    where case s.step_number
      when 1 then l.step_1_seconds
      when 2 then l.step_2_seconds
      when 3 then l.step_3_seconds
      when 4 then l.step_4_seconds
      when 5 then l.step_5_seconds
      when 6 then l.step_6_seconds
    end > 0
  ) as "머문기록수",
  count(l.id) filter (
    where not l.completed and l.exit_step = s.step_number
  ) as "이탈수",
  public.dankkum_rate_percent(
    count(l.id) filter (where not l.completed and l.exit_step = s.step_number),
    nullif(count(l.id), 0)
  ) as "이탈률_percent",
  round(avg(nullif(case s.step_number
    when 1 then l.step_1_seconds
    when 2 then l.step_2_seconds
    when 3 then l.step_3_seconds
    when 4 then l.step_4_seconds
    when 5 then l.step_5_seconds
    when 6 then l.step_6_seconds
  end, 0))::numeric, 2) as "평균머문시간_초",
  count(l.id) filter (
    where l.previous_steps_wrapped like '%,' || s.step_number::text || ',%'
  ) as "이전버튼누른기록수"
from steps s
left join logs l on true
group by s.step_number, s.step_name
order by s.step_number;

drop view if exists public."관리_구름확인하기_단계별불편함_V1";

create view public."관리_구름확인하기_단계별불편함_V1" as
with steps as (
  select *
  from (values
    (1, '확인할 날짜', 'step_1_seconds'),
    (2, '헤어 정보', 'step_2_seconds'),
    (3, '상의·아우터·하의·신발', 'step_3_seconds'),
    (4, '소지품', 'step_4_seconds'),
    (5, '최종 확인', 'step_5_seconds')
  ) as s(step_number, step_name, step_column)
),
logs as (
  select
    l.*,
    case
      when l.previous_steps is null or l.previous_steps = '' then ''
      else ',' || l.previous_steps || ','
    end as previous_steps_wrapped
  from public.cloud_check_exit_logs l
)
select
  s.step_number as "단계번호",
  s.step_name as "단계명",
  count(l.id) filter (
    where case s.step_number
      when 1 then l.step_1_seconds
      when 2 then l.step_2_seconds
      when 3 then l.step_3_seconds
      when 4 then l.step_4_seconds
      when 5 then l.step_5_seconds
    end > 0
  ) as "머문기록수",
  count(l.id) filter (
    where not l.completed and l.exit_step = s.step_number
  ) as "이탈수",
  public.dankkum_rate_percent(
    count(l.id) filter (where not l.completed and l.exit_step = s.step_number),
    nullif(count(l.id), 0)
  ) as "이탈률_percent",
  round(avg(nullif(case s.step_number
    when 1 then l.step_1_seconds
    when 2 then l.step_2_seconds
    when 3 then l.step_3_seconds
    when 4 then l.step_4_seconds
    when 5 then l.step_5_seconds
  end, 0))::numeric, 2) as "평균머문시간_초",
  count(l.id) filter (
    where l.previous_steps_wrapped like '%,' || s.step_number::text || ',%'
  ) as "이전버튼누른기록수"
from steps s
left join logs l on true
group by s.step_number, s.step_name
order by s.step_number;
