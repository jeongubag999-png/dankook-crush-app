-- 여성/남성별 앱 행동 지표 모음.
-- 기준 회원: 탈퇴하지 않았고 profiles.gender가 '여자' 또는 '남자'인 회원.
-- Supabase Table Editor에서 public."요약_성별별_..." 뷰로 확인할 수 있습니다.

create or replace view public."요약_성별별_회원기본" as
with 회원 as (
  select user_id, gender, campus
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
전체 as (
  select count(*)::numeric as 전체회원수
  from 회원
)
select
  h.gender as "성별",
  count(*)::integer as "회원수",
  round(count(*)::numeric / nullif(max(t.전체회원수), 0) * 100, 1) as "전체중_비율_percent",
  count(*) filter (where h.campus = '죽전')::integer as "죽전캠퍼스_회원수",
  count(*) filter (where h.campus = '천안')::integer as "천안캠퍼스_회원수",
  round(count(*) filter (where h.campus = '죽전')::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "죽전_비율_percent",
  round(count(*) filter (where h.campus = '천안')::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "천안_비율_percent"
from 회원 h
cross join 전체 t
group by h.gender
order by h.gender;

create or replace view public."요약_성별별_구름보내기" as
with 회원 as (
  select user_id, gender, campus
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
보낸구름 as (
  select
    h.gender,
    h.user_id,
    cp.id,
    cp.target_gender,
    cp.campus,
    cp.place,
    cp.seen_date,
    cp.created_at
  from 회원 h
  left join public.crush_posts cp
    on cp.sender_user_id = h.user_id
)
select
  gender as "보낸사람_성별",
  count(distinct user_id)::integer as "성별선택_회원수",
  count(id)::integer as "띄운구름수",
  count(distinct user_id) filter (where id is not null)::integer as "구름띄운_회원수",
  round(count(id)::numeric / nullif(count(distinct user_id)::numeric, 0), 2) as "회원당_평균_띄운구름수",
  count(id) filter (where target_gender = '여자')::integer as "여성을_찾는_구름수",
  count(id) filter (where target_gender = '남자')::integer as "남성을_찾는_구름수",
  count(id) filter (where campus = '죽전')::integer as "죽전에서_띄운구름수",
  count(id) filter (where campus = '천안')::integer as "천안에서_띄운구름수",
  count(distinct seen_date) filter (where id is not null)::integer as "구름이_뜬_날짜수",
  count(distinct split_part(place, ' - ', 1)) filter (where id is not null)::integer as "구름이_뜬_대표장소수"
from 보낸구름
group by gender
order by gender;

create or replace view public."요약_성별별_구름확인하기" as
with 회원 as (
  select user_id, gender, campus
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
확인기록 as (
  select
    h.gender,
    h.user_id,
    cc.id,
    cc.result_count,
    cc.checked_at,
    cc.seen_date
  from 회원 h
  left join public.cloud_checks cc
    on cc.checker_user_id = h.user_id
)
select
  gender as "확인한사람_성별",
  count(distinct user_id)::integer as "성별선택_회원수",
  count(id)::integer as "구름확인_기록수",
  count(distinct user_id) filter (where id is not null)::integer as "구름확인_회원수",
  round(count(id)::numeric / nullif(count(distinct user_id)::numeric, 0), 2) as "회원당_평균_확인횟수",
  coalesce(round(avg(result_count) filter (where id is not null), 2), 0) as "평균_후보구름수",
  count(id) filter (where coalesce(result_count, 0) = 0)::integer as "후보없음_확인수",
  count(id) filter (where coalesce(result_count, 0) > 0)::integer as "후보있음_확인수",
  round(count(id) filter (where coalesce(result_count, 0) > 0)::numeric / nullif(count(id)::numeric, 0) * 100, 1) as "후보발견율_percent",
  count(distinct seen_date) filter (where id is not null)::integer as "확인한_날짜수"
from 확인기록
group by gender
order by gender;

create or replace view public."요약_성별별_응답매칭" as
with 회원 as (
  select user_id, gender
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
응답 as (
  select
    c.id,
    c.status,
    c.created_at,
    c.responded_at,
    c.rejected_by,
    c.claimer_user_id,
    cp.sender_user_id,
    claimer.gender as claimer_gender,
    sender.gender as sender_gender
  from public.claims c
  left join public.crush_posts cp
    on c.crush_post_id::text = cp.id::text
  left join 회원 claimer
    on claimer.user_id = c.claimer_user_id
  left join 회원 sender
    on sender.user_id = cp.sender_user_id
)
select
  gender_table.gender as "성별",
  count(r.id) filter (where r.claimer_gender = gender_table.gender)::integer as "보낸응답수",
  count(distinct r.claimer_user_id) filter (where r.claimer_gender = gender_table.gender)::integer as "응답보낸_회원수",
  count(r.id) filter (where r.sender_gender = gender_table.gender)::integer as "받은응답수",
  count(distinct r.sender_user_id) filter (where r.sender_gender = gender_table.gender)::integer as "응답받은_회원수",
  count(r.id) filter (where r.claimer_gender = gender_table.gender and r.status in ('chat_requested', 'chat_accepted'))::integer as "채팅요청_보낸수",
  count(r.id) filter (where r.sender_gender = gender_table.gender and r.status in ('chat_requested', 'chat_accepted'))::integer as "채팅요청_받은수",
  count(r.id) filter (where (r.claimer_gender = gender_table.gender or r.sender_gender = gender_table.gender) and r.status = 'chat_accepted')::integer as "채팅수락_관련수",
  count(r.id) filter (where (r.claimer_gender = gender_table.gender or r.sender_gender = gender_table.gender) and r.status = 'rejected')::integer as "거절_관련수",
  round(
    count(r.id) filter (where r.sender_gender = gender_table.gender and r.status = 'chat_accepted')::numeric
    / nullif(count(r.id) filter (where r.sender_gender = gender_table.gender)::numeric, 0) * 100,
    1
  ) as "받은응답_채팅수락률_percent",
  round(
    count(r.id) filter (where r.claimer_gender = gender_table.gender and r.status = 'chat_accepted')::numeric
    / nullif(count(r.id) filter (where r.claimer_gender = gender_table.gender)::numeric, 0) * 100,
    1
  ) as "보낸응답_채팅성사율_percent"
from (values ('여자'), ('남자')) as gender_table(gender)
left join 응답 r
  on r.claimer_gender = gender_table.gender
  or r.sender_gender = gender_table.gender
group by gender_table.gender
order by gender_table.gender;

create or replace view public."요약_성별별_발견선택" as
with 회원 as (
  select user_id, gender
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
발견 as (
  select
    p.id,
    p.status,
    p.match_score,
    p.created_at,
    sender.gender as sender_gender,
    checker.gender as checker_gender
  from public.sender_cloud_check_picks p
  left join 회원 sender
    on sender.user_id = p.sender_user_id
  left join 회원 checker
    on checker.user_id = p.checker_user_id
)
select
  gender_table.gender as "성별",
  count(f.id) filter (where f.sender_gender = gender_table.gender)::integer as "상대확인기록_선택수",
  count(f.id) filter (where f.sender_gender = gender_table.gender and f.status = 'interested')::integer as "이사람같아요_선택수",
  count(f.id) filter (where f.sender_gender = gender_table.gender and f.status = 'dismissed')::integer as "아닌것같아요_선택수",
  coalesce(round(avg(f.match_score) filter (where f.sender_gender = gender_table.gender), 1), 0) as "선택후보_평균일치율",
  count(f.id) filter (where f.checker_gender = gender_table.gender)::integer as "내확인기록이_상대에게_노출된수",
  count(f.id) filter (where f.checker_gender = gender_table.gender and f.status = 'interested')::integer as "나를_이사람같아요로_고른수"
from (values ('여자'), ('남자')) as gender_table(gender)
left join 발견 f
  on f.sender_gender = gender_table.gender
  or f.checker_gender = gender_table.gender
group by gender_table.gender
order by gender_table.gender;

create or replace view public."요약_성별별_채팅인스타" as
with 회원 as (
  select user_id, gender
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
채팅참여 as (
  select
    r.id as chat_room_id,
    r.created_at,
    r.closed_at,
    r.instagram_revealed_at,
    r.sender_instagram_consent as my_instagram_consent,
    r.sender_deleted_at as my_deleted_at,
    r.sender_user_id as user_id
  from public.chat_rooms r
  union all
  select
    r.id as chat_room_id,
    r.created_at,
    r.closed_at,
    r.instagram_revealed_at,
    r.claimer_instagram_consent as my_instagram_consent,
    r.claimer_deleted_at as my_deleted_at,
    r.claimer_user_id as user_id
  from public.chat_rooms r
),
참여성별 as (
  select
    h.gender,
    c.*
  from 채팅참여 c
  join 회원 h
    on h.user_id = c.user_id
),
메시지 as (
  select
    h.gender,
    count(m.id)::numeric as message_count
  from public.chat_messages m
  join 회원 h
    on h.user_id = m.sender_user_id
  group by h.gender
)
select
  p.gender as "성별",
  count(distinct p.chat_room_id)::integer as "참여채팅방수",
  count(distinct p.chat_room_id) filter (where p.closed_at is null and now() <= p.created_at + interval '24 hours')::integer as "진행중_채팅방수",
  count(distinct p.chat_room_id) filter (where p.closed_at is not null or now() > p.created_at + interval '24 hours')::integer as "종료된_채팅방수",
  coalesce(max(m.message_count), 0)::integer as "보낸메시지수",
  count(*) filter (where p.my_instagram_consent is true)::integer as "인스타공개_yes_선택수",
  count(*) filter (where p.my_instagram_consent is false)::integer as "인스타공개_no_선택수",
  count(*) filter (where p.my_instagram_consent is null and (p.closed_at is not null or now() > p.created_at + interval '24 hours'))::integer as "종료후_인스타선택_대기수",
  count(distinct p.chat_room_id) filter (where p.instagram_revealed_at is not null)::integer as "인스타_상호공개_채팅방수",
  count(*) filter (where p.my_deleted_at is not null)::integer as "종료채팅방_내목록삭제수"
from 참여성별 p
left join 메시지 m
  on m.gender = p.gender
group by p.gender
order by p.gender;

create or replace view public."요약_성별별_전체퍼널" as
with 회원 as (
  select user_id, gender
  from public.profiles
  where coalesce(is_deleted, false) = false
    and gender in ('여자', '남자')
),
회원별 as (
  select
    h.user_id,
    h.gender,
    exists (select 1 from public.crush_posts cp where cp.sender_user_id = h.user_id) as sent_cloud,
    exists (select 1 from public.cloud_checks cc where cc.checker_user_id = h.user_id) as checked_cloud,
    exists (select 1 from public.claims c where c.claimer_user_id = h.user_id) as sent_response,
    exists (
      select 1
      from public.claims c
      join public.crush_posts cp on c.crush_post_id::text = cp.id::text
      where cp.sender_user_id = h.user_id
    ) as received_response,
    exists (
      select 1
      from public.chat_rooms r
      where r.sender_user_id = h.user_id or r.claimer_user_id = h.user_id
    ) as joined_chat,
    exists (
      select 1
      from public.chat_rooms r
      where r.instagram_revealed_at is not null
        and (r.sender_user_id = h.user_id or r.claimer_user_id = h.user_id)
    ) as revealed_instagram
  from 회원 h
)
select
  gender as "성별",
  count(*)::integer as "성별선택_회원수",
  count(*) filter (where sent_cloud)::integer as "구름보낸_회원수",
  round(count(*) filter (where sent_cloud)::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "구름보내기_전환율_percent",
  count(*) filter (where checked_cloud)::integer as "구름확인한_회원수",
  round(count(*) filter (where checked_cloud)::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "구름확인하기_전환율_percent",
  count(*) filter (where sent_response)::integer as "응답보낸_회원수",
  round(count(*) filter (where sent_response)::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "응답보내기_전환율_percent",
  count(*) filter (where received_response)::integer as "응답받은_회원수",
  count(*) filter (where joined_chat)::integer as "채팅방참여_회원수",
  round(count(*) filter (where joined_chat)::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "채팅참여_전환율_percent",
  count(*) filter (where revealed_instagram)::integer as "인스타공개경험_회원수",
  round(count(*) filter (where revealed_instagram)::numeric / nullif(count(*)::numeric, 0) * 100, 1) as "인스타공개_전환율_percent"
from 회원별
group by gender
order by gender;

grant select on public."요약_성별별_회원기본" to authenticated;
grant select on public."요약_성별별_구름보내기" to authenticated;
grant select on public."요약_성별별_구름확인하기" to authenticated;
grant select on public."요약_성별별_응답매칭" to authenticated;
grant select on public."요약_성별별_발견선택" to authenticated;
grant select on public."요약_성별별_채팅인스타" to authenticated;
grant select on public."요약_성별별_전체퍼널" to authenticated;
