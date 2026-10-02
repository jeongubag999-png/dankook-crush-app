-- 구름방별 실제 입력 질문과 저장 컬럼을 그대로 보여주는 관리자 전용 상세 뷰 5개와
-- 구름방별 띄우기/확인/조회/응답/채팅 전환을 한눈에 보는 요약 뷰를 만든다.
--
-- 상세 뷰 구성
--   1) 시그널 구름 띄우기
--   2) 시그널 구름 확인하기
--   3) 게시판 구름 띄우기
--   4) 고향 구름 띄우기
--   5) 글로벌 구름 띄우기
--
-- 게시판·고향·글로벌은 앱에 별도 "구름 확인하기" 로그가 없으므로 확인 뷰를 만들지 않는다.
-- 도서관 구름은 room='crush'의 하위 유형이며 crush_post_seats와 좌석 조회 로그로 집계한다.
-- 모든 시간은 Supabase Table Editor에서 읽기 쉽도록 한국 표준시로 표시한다.

-- -----------------------------------------------------------------------------
-- 도서관 자리 확인 로그 보강
-- 기존에는 조회자와 시각만 남아 어떤 질문으로 몇 건을 찾았는지 집계할 수 없었다.
-- 기존 RPC의 반환 형식은 유지하고 검색 조건과 결과 수만 함께 기록한다.
-- -----------------------------------------------------------------------------

alter table public.library_seat_lookups
  add column if not exists library text,
  add column if not exists reading_room text,
  add column if not exists seat_number integer,
  add column if not exists seen_date date,
  add column if not exists result_count integer;

create index if not exists idx_library_seat_lookups_activity
  on public.library_seat_lookups (looked_up_at desc, library, reading_room);

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
  v_result_count integer;
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

  select count(*)::integer into v_result_count
  from public.crush_post_seats s
  where s.library = p_library
    and s.reading_room = p_reading_room
    and s.seat_number = p_seat_number
    and s.seen_date = p_seen_date
    and s.sender_user_id <> v_uid;

  insert into public.library_seat_lookups
    (user_id, library, reading_room, seat_number, seen_date, result_count)
  values
    (v_uid, trim(p_library), trim(p_reading_room), p_seat_number, p_seen_date, v_result_count);

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

-- -----------------------------------------------------------------------------
-- 공통: 기존 뷰를 안전하게 다시 만들 수 있도록 제거
-- -----------------------------------------------------------------------------

drop view if exists public."관리_시그널구름_띄우기_V1";
drop view if exists public."관리_시그널구름_확인하기_V1";
drop view if exists public."관리_게시판구름_띄우기_V1";
drop view if exists public."관리_고향구름_띄우기_V1";
drop view if exists public."관리_글로벌구름_띄우기_V1";
drop view if exists public."요약_구름응답";

-- -----------------------------------------------------------------------------
-- 1. 시그널 구름 띄우기
-- 실제 질문: 누구 / 언제 / 어디 / 착장 / 추가 단서 / 상세 메시지
-- -----------------------------------------------------------------------------

create view public."관리_시그널구름_띄우기_V1"
with (security_invoker = true)
as
select
  cp.id as "구름번호",
  cp.created_at at time zone 'Asia/Seoul' as "구름띄운시간",
  cp.campus as "캠퍼스",
  cp.sender_nickname as "구름띄운사람",
  cp.sender_gender as "구름띄운사람성별",
  cp.sender_department as "구름띄운사람학과",
  cp.sender_mbti as "구름띄운사람MBTI",
  cp.sender_bio as "구름띄운사람소개",
  cp.sender_instagram as "구름띄운사람인스타",
  cp.target_gender as "누구를찾고있나요_성별",
  cp.seen_date as "언제마주쳤나요_날짜",
  cp.time_period as "언제마주쳤나요_시간",
  cp.main_place as "어디서마주쳤나요_장소",
  cp.detail_place as "어디서마주쳤나요_구체적위치",
  cp.place as "최종장소표기",
  case when seat.post_id is not null then true else false end as "도서관구름여부",
  seat.library as "도서관",
  seat.reading_room as "열람실",
  seat.seat_number as "자리번호",
  cp.top_type as "기억나는착장_상의종류",
  cp.top_color as "기억나는착장_상의색상",
  cp.outer_type as "기억나는착장_아우터종류",
  cp.outer_color as "기억나는착장_아우터색상",
  cp.bottom_type as "기억나는착장_하의종류",
  cp.bottom_color as "기억나는착장_하의색상",
  cp.hair_color as "추가정보_헤어색깔",
  cp.hat_status as "추가정보_모자",
  cp.bangs_status as "추가정보_앞머리",
  cp.glasses_status as "추가정보_안경",
  cp.bag_type as "추가정보_가방",
  cp.earphone_type as "추가정보_이어폰",
  cp.shoe_type as "추가정보_신발",
  cp.message as "상세정보_자유입력",
  coalesce(view_stats.view_count, 0) as "조회수",
  coalesce(view_stats.viewer_count, 0) as "조회한사람수",
  coalesce(claim_stats.claim_count, 0) as "응답수",
  coalesce(claim_stats.claimer_count, 0) as "응답한사람수",
  coalesce(claim_stats.pending_count, 0) as "응답대기수",
  coalesce(claim_stats.chat_requested_count, 0) as "대화요청수",
  coalesce(chat_stats.chat_room_count, 0) as "채팅방수",
  coalesce(chat_stats.message_count, 0) as "채팅메시지수",
  cp.sender_user_id as "구름띄운사람ID"
from public.crush_posts cp
left join public.crush_post_seats seat
  on seat.post_id = cp.id
left join lateral (
  select
    count(*)::integer as view_count,
    count(distinct cv.viewer_user_id)::integer as viewer_count
  from public.cloud_views cv
  where cv.crush_post_id::text = cp.id::text
) view_stats on true
left join lateral (
  select
    count(*)::integer as claim_count,
    count(distinct c.claimer_user_id)::integer as claimer_count,
    count(*) filter (where c.status = 'pending')::integer as pending_count,
    count(*) filter (where c.status = 'chat_requested')::integer as chat_requested_count
  from public.claims c
  where c.crush_post_id::text = cp.id::text
) claim_stats on true
left join lateral (
  select
    count(distinct r.id)::integer as chat_room_count,
    count(m.id)::integer as message_count
  from public.chat_rooms r
  left join public.chat_messages m on m.chat_room_id = r.id
  where r.crush_post_id::text = cp.id::text
) chat_stats on true
where cp.room = 'crush'
order by cp.created_at desc;

-- -----------------------------------------------------------------------------
-- 2. 시그널 구름 확인하기
-- 실제 질문: 확인 날짜 / 내 헤어 / 내 착장 / 내 소지품
-- -----------------------------------------------------------------------------

create view public."관리_시그널구름_확인하기_V1"
with (security_invoker = true)
as
select
  cc.id as "확인번호",
  cc.checked_at at time zone 'Asia/Seoul' as "구름확인시간",
  p.campus as "캠퍼스",
  cc.checker_nickname as "확인한사람",
  cc.checker_gender as "내성별",
  cc.checker_instagram as "확인한사람인스타",
  cc.seen_date as "어느날짜의구름을확인했나요",
  cc.hair_feature as "내헤어정보_전체요약",
  cc.female_hair_style as "내헤어정보_여자헤어스타일",
  cc.female_hair_color as "내헤어정보_여자헤어색깔",
  cc.female_hat as "내헤어정보_여자모자",
  cc.female_bangs as "내헤어정보_여자앞머리",
  cc.male_hair_style as "내헤어정보_남자헤어스타일",
  cc.male_hair_color as "내헤어정보_남자헤어색깔",
  cc.male_hat as "내헤어정보_남자모자",
  cc.male_bangs as "내헤어정보_남자앞머리",
  cc.glasses_type as "내헤어정보_안경",
  cc.top_type as "내착장_상의종류",
  cc.top_color as "내착장_상의색상",
  cc.outer_type as "내착장_아우터종류",
  cc.outer_color as "내착장_아우터색상",
  cc.bottom_type as "내착장_하의종류",
  cc.bottom_color as "내착장_하의색상",
  cc.shoe_type as "내착장_신발",
  cc.bag_type as "내소지품_가방",
  cc.earphone_type as "내소지품_이어폰",
  cc.result_count as "검색결과수",
  cc.checker_user_id as "확인한사람ID"
from public.cloud_checks cc
left join public.profiles p
  on p.user_id = cc.checker_user_id
order by cc.checked_at desc;

-- -----------------------------------------------------------------------------
-- 3. 게시판 구름 띄우기
-- 실제 질문: 제목 / 기억나는 이야기를 담은 자유 본문
-- -----------------------------------------------------------------------------

create view public."관리_게시판구름_띄우기_V1"
with (security_invoker = true)
as
select
  cp.id as "구름번호",
  cp.created_at at time zone 'Asia/Seoul' as "글올린시간",
  cp.campus as "캠퍼스",
  cp.sender_nickname as "작성자",
  cp.sender_gender as "작성자성별",
  cp.sender_department as "작성자학과",
  cp.sender_instagram as "작성자인스타",
  cp.memory_title as "제목",
  coalesce(cp.memory_story, cp.message) as "내용",
  coalesce(view_stats.view_count, 0) as "조회수",
  coalesce(view_stats.viewer_count, 0) as "조회한사람수",
  coalesce(claim_stats.claim_count, 0) as "응답수",
  coalesce(claim_stats.claimer_count, 0) as "응답한사람수",
  coalesce(claim_stats.pending_count, 0) as "응답대기수",
  coalesce(claim_stats.chat_requested_count, 0) as "대화요청수",
  coalesce(chat_stats.chat_room_count, 0) as "채팅방수",
  coalesce(chat_stats.message_count, 0) as "채팅메시지수",
  cp.sender_user_id as "작성자ID"
from public.crush_posts cp
left join lateral (
  select count(*)::integer as view_count,
         count(distinct cv.viewer_user_id)::integer as viewer_count
  from public.cloud_views cv
  where cv.crush_post_id::text = cp.id::text
) view_stats on true
left join lateral (
  select count(*)::integer as claim_count,
         count(distinct c.claimer_user_id)::integer as claimer_count,
         count(*) filter (where c.status = 'pending')::integer as pending_count,
         count(*) filter (where c.status = 'chat_requested')::integer as chat_requested_count
  from public.claims c
  where c.crush_post_id::text = cp.id::text
) claim_stats on true
left join lateral (
  select count(distinct r.id)::integer as chat_room_count,
         count(m.id)::integer as message_count
  from public.chat_rooms r
  left join public.chat_messages m on m.chat_room_id = r.id
  where r.crush_post_id::text = cp.id::text
) chat_stats on true
where cp.room = 'memory'
order by cp.created_at desc;

-- -----------------------------------------------------------------------------
-- 4. 고향 구름 띄우기
-- 실제 질문: 시·도 / 시·군·구 / 초등학교 / 중학교 / 고등학교
-- -----------------------------------------------------------------------------

create view public."관리_고향구름_띄우기_V1"
with (security_invoker = true)
as
select
  cp.id as "구름번호",
  cp.created_at at time zone 'Asia/Seoul' as "구름띄운시간",
  cp.campus as "캠퍼스",
  cp.sender_nickname as "구름띄운사람",
  cp.sender_gender as "구름띄운사람성별",
  cp.sender_department as "구름띄운사람학과",
  cp.sender_instagram as "구름띄운사람인스타",
  cp.past_region as "어느지역출신_시도",
  cp.past_subregion as "어느지역출신_시군구",
  cp.past_elementary_school as "초등학교_선택",
  cp.past_middle_school as "중학교_선택",
  cp.past_high_school as "고등학교_선택",
  cp.past_school as "학교정보_전체요약",
  coalesce(view_stats.view_count, 0) as "조회수",
  coalesce(view_stats.viewer_count, 0) as "조회한사람수",
  coalesce(claim_stats.claim_count, 0) as "응답수",
  coalesce(claim_stats.claimer_count, 0) as "응답한사람수",
  coalesce(claim_stats.pending_count, 0) as "응답대기수",
  coalesce(claim_stats.chat_requested_count, 0) as "대화요청수",
  coalesce(chat_stats.chat_room_count, 0) as "채팅방수",
  coalesce(chat_stats.message_count, 0) as "채팅메시지수",
  cp.sender_user_id as "구름띄운사람ID"
from public.crush_posts cp
left join lateral (
  select count(*)::integer as view_count,
         count(distinct cv.viewer_user_id)::integer as viewer_count
  from public.cloud_views cv
  where cv.crush_post_id::text = cp.id::text
) view_stats on true
left join lateral (
  select count(*)::integer as claim_count,
         count(distinct c.claimer_user_id)::integer as claimer_count,
         count(*) filter (where c.status = 'pending')::integer as pending_count,
         count(*) filter (where c.status = 'chat_requested')::integer as chat_requested_count
  from public.claims c
  where c.crush_post_id::text = cp.id::text
) claim_stats on true
left join lateral (
  select count(distinct r.id)::integer as chat_room_count,
         count(m.id)::integer as message_count
  from public.chat_rooms r
  left join public.chat_messages m on m.chat_room_id = r.id
  where r.crush_post_id::text = cp.id::text
) chat_stats on true
where cp.room = 'past_connection'
order by cp.created_at desc;

-- -----------------------------------------------------------------------------
-- 5. 글로벌 구름 띄우기
-- 실제 질문: 국적 / 구사 언어 / 관심사 / 선호 상대 성별 / 한마디
-- -----------------------------------------------------------------------------

create view public."관리_글로벌구름_띄우기_V1"
with (security_invoker = true)
as
select
  cp.id as "구름번호",
  cp.created_at at time zone 'Asia/Seoul' as "구름띄운시간",
  cp.campus as "캠퍼스",
  cp.sender_nickname as "구름띄운사람",
  cp.sender_gender as "구름띄운사람성별",
  cp.sender_department as "구름띄운사람학과",
  cp.sender_instagram as "구름띄운사람인스타",
  cp.lang_country as "국적",
  array_to_string(cp.lang_spoken, ', ') as "구사가능한언어",
  array_to_string(cp.lang_interests, ', ') as "관심사_선택",
  cp.target_gender as "선호하는상대성별_선택",
  cp.message as "한마디",
  coalesce(view_stats.view_count, 0) as "조회수",
  coalesce(view_stats.viewer_count, 0) as "조회한사람수",
  coalesce(claim_stats.claim_count, 0) as "응답수",
  coalesce(claim_stats.claimer_count, 0) as "응답한사람수",
  coalesce(claim_stats.pending_count, 0) as "응답대기수",
  coalesce(claim_stats.chat_requested_count, 0) as "대화요청수",
  coalesce(chat_stats.chat_room_count, 0) as "채팅방수",
  coalesce(chat_stats.message_count, 0) as "채팅메시지수",
  cp.sender_user_id as "구름띄운사람ID"
from public.crush_posts cp
left join lateral (
  select count(*)::integer as view_count,
         count(distinct cv.viewer_user_id)::integer as viewer_count
  from public.cloud_views cv
  where cv.crush_post_id::text = cp.id::text
) view_stats on true
left join lateral (
  select count(*)::integer as claim_count,
         count(distinct c.claimer_user_id)::integer as claimer_count,
         count(*) filter (where c.status = 'pending')::integer as pending_count,
         count(*) filter (where c.status = 'chat_requested')::integer as chat_requested_count
  from public.claims c
  where c.crush_post_id::text = cp.id::text
) claim_stats on true
left join lateral (
  select count(distinct r.id)::integer as chat_room_count,
         count(m.id)::integer as message_count
  from public.chat_rooms r
  left join public.chat_messages m on m.chat_room_id = r.id
  where r.crush_post_id::text = cp.id::text
) chat_stats on true
where cp.room = 'language'
order by cp.created_at desc;

-- -----------------------------------------------------------------------------
-- 6. 요약_구름응답
-- 시그널·게시판·고향·글로벌을 비교하고 도서관을 시그널 하위 유형으로 별도 표시한다.
-- 시그널 확인 수는 cloud_checks, 도서관 자리 확인 수는 library_seat_lookups를 사용한다.
-- -----------------------------------------------------------------------------

create view public."요약_구름응답"
with (security_invoker = true)
as
with categories("정렬", "구름방", "DB구분값", "확인기능") as (
  values
    (1, '시그널(전체)', 'crush', '시그널 구름 확인하기'),
    (2, '게시판', 'memory', null),
    (3, '고향', 'past_connection', null),
    (4, '글로벌', 'language', null),
    (5, '도서관(시그널 하위)', 'crush+seat', '자리 번호로 확인하기')
),
post_scope as (
  select '시그널(전체)'::text as category, cp.id, cp.sender_user_id, cp.created_at
  from public.crush_posts cp where cp.room = 'crush'
  union all
  select '게시판', cp.id, cp.sender_user_id, cp.created_at
  from public.crush_posts cp where cp.room = 'memory'
  union all
  select '고향', cp.id, cp.sender_user_id, cp.created_at
  from public.crush_posts cp where cp.room = 'past_connection'
  union all
  select '글로벌', cp.id, cp.sender_user_id, cp.created_at
  from public.crush_posts cp where cp.room = 'language'
  union all
  select '도서관(시그널 하위)', cp.id, cp.sender_user_id, cp.created_at
  from public.crush_posts cp
  join public.crush_post_seats seat on seat.post_id = cp.id
  where cp.room = 'crush'
),
post_stats as (
  select
    category,
    count(*)::bigint as post_count,
    count(*) filter (
      where created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'
    )::bigint as today_post_count,
    count(*) filter (where created_at >= now() - interval '7 days')::bigint as post_count_7d,
    count(*) filter (where created_at >= now() - interval '30 days')::bigint as post_count_30d,
    count(distinct sender_user_id)::bigint as sender_count,
    max(created_at) as last_post_at
  from post_scope
  group by category
),
view_stats as (
  select
    ps.category,
    count(cv.id)::bigint as view_count,
    count(distinct cv.viewer_user_id)::bigint as viewer_count
  from post_scope ps
  left join public.cloud_views cv on cv.crush_post_id::text = ps.id::text
  group by ps.category
),
claim_stats as (
  select
    ps.category,
    count(c.id)::bigint as claim_count,
    count(distinct c.claimer_user_id)::bigint as claimer_count,
    count(distinct ps.id) filter (where c.id is not null)::bigint as responded_post_count,
    count(c.id) filter (where c.status = 'pending')::bigint as pending_count,
    count(c.id) filter (where c.status = 'chat_requested')::bigint as chat_requested_count,
    count(c.id) filter (where c.status = 'rejected')::bigint as rejected_count,
    max(c.created_at) as last_claim_at
  from post_scope ps
  left join public.claims c on c.crush_post_id::text = ps.id::text
  group by ps.category
),
chat_stats as (
  select
    ps.category,
    count(distinct r.id)::bigint as chat_room_count,
    count(m.id)::bigint as message_count,
    count(distinct ps.id) filter (where r.id is not null)::bigint as chatted_post_count
  from post_scope ps
  left join public.chat_rooms r on r.crush_post_id::text = ps.id::text
  left join public.chat_messages m on m.chat_room_id = r.id
  group by ps.category
),
check_stats as (
  select
    '시그널(전체)'::text as category,
    count(*)::bigint as check_count,
    count(distinct checker_user_id)::bigint as checker_count,
    coalesce(sum(result_count), 0)::bigint as result_count,
    max(checked_at) as last_check_at
  from public.cloud_checks
  union all
  select
    '도서관(시그널 하위)',
    count(*)::bigint,
    count(distinct user_id)::bigint,
    coalesce(sum(result_count), 0)::bigint,
    max(looked_up_at)
  from public.library_seat_lookups
)
select
  c."구름방",
  c."DB구분값",
  c."확인기능",
  coalesce(ps.post_count, 0) as "누적구름띄우기수",
  coalesce(ps.today_post_count, 0) as "오늘구름띄우기수",
  coalesce(ps.post_count_7d, 0) as "최근7일구름띄우기수",
  coalesce(ps.post_count_30d, 0) as "최근30일구름띄우기수",
  coalesce(ps.sender_count, 0) as "구름띄운사람수",
  cs.check_count as "구름확인횟수",
  cs.checker_count as "구름확인한사람수",
  cs.result_count as "확인결과총합",
  coalesce(vs.view_count, 0) as "구름조회수",
  coalesce(vs.viewer_count, 0) as "구름조회한사람수",
  coalesce(cls.claim_count, 0) as "응답수",
  coalesce(cls.claimer_count, 0) as "응답한사람수",
  coalesce(cls.responded_post_count, 0) as "응답받은구름수",
  case
    when coalesce(ps.post_count, 0) = 0 then 0::numeric
    else round(100.0 * coalesce(cls.responded_post_count, 0) / ps.post_count, 2)
  end as "구름응답률_퍼센트",
  coalesce(cls.pending_count, 0) as "응답대기수",
  coalesce(cls.chat_requested_count, 0) as "대화요청수",
  coalesce(cls.rejected_count, 0) as "거절수",
  coalesce(chs.chat_room_count, 0) as "생성된채팅방수",
  coalesce(chs.message_count, 0) as "채팅메시지수",
  case
    when coalesce(ps.post_count, 0) = 0 then 0::numeric
    else round(100.0 * coalesce(chs.chatted_post_count, 0) / ps.post_count, 2)
  end as "채팅전환율_퍼센트",
  case when c."구름방" = '도서관(시그널 하위)' then coalesce(ps.post_count, 0) end
    as "도서관구름띄우기수",
  case when c."구름방" = '도서관(시그널 하위)' then coalesce(cs.check_count, 0) end
    as "도서관자리확인시도수",
  case when c."구름방" = '도서관(시그널 하위)' then coalesce(cs.result_count, 0) end
    as "도서관자리확인결과수",
  case when c."구름방" = '도서관(시그널 하위)' then coalesce(cls.claim_count, 0) end
    as "도서관구름응답수",
  ps.last_post_at at time zone 'Asia/Seoul' as "마지막구름시간",
  cs.last_check_at at time zone 'Asia/Seoul' as "마지막확인시간",
  cls.last_claim_at at time zone 'Asia/Seoul' as "마지막응답시간"
from categories c
left join post_stats ps on ps.category = c."구름방"
left join check_stats cs on cs.category = c."구름방"
left join view_stats vs on vs.category = c."구름방"
left join claim_stats cls on cls.category = c."구름방"
left join chat_stats chs on chs.category = c."구름방"
order by c."정렬";

-- 관리자용 설명
comment on view public."관리_시그널구름_띄우기_V1" is '시그널 구름 띄우기 질문과 응답·채팅 성과를 구름별로 보는 관리자 뷰';
comment on view public."관리_시그널구름_확인하기_V1" is '시그널 구름 확인하기에서 입력한 날짜·헤어·착장·소지품과 결과 수를 보는 관리자 뷰';
comment on view public."관리_게시판구름_띄우기_V1" is '게시판 구름의 제목·본문과 응답·채팅 성과를 보는 관리자 뷰';
comment on view public."관리_고향구름_띄우기_V1" is '고향 구름의 지역·학교 질문과 응답·채팅 성과를 보는 관리자 뷰';
comment on view public."관리_글로벌구름_띄우기_V1" is '글로벌 구름의 국적·언어·관심사·선호 성별·한마디와 성과를 보는 관리자 뷰';
comment on view public."요약_구름응답" is '구름방별 띄우기·확인·조회·응답·채팅 전환과 도서관 좌석 구름 성과 요약';

-- 민감한 원본 데이터가 포함되므로 앱 사용자에게 직접 노출하지 않는다.
revoke all on table public."관리_시그널구름_띄우기_V1" from anon, authenticated;
revoke all on table public."관리_시그널구름_확인하기_V1" from anon, authenticated;
revoke all on table public."관리_게시판구름_띄우기_V1" from anon, authenticated;
revoke all on table public."관리_고향구름_띄우기_V1" from anon, authenticated;
revoke all on table public."관리_글로벌구름_띄우기_V1" from anon, authenticated;
revoke all on table public."요약_구름응답" from anon, authenticated;

grant select on table public."관리_시그널구름_띄우기_V1" to service_role;
grant select on table public."관리_시그널구름_확인하기_V1" to service_role;
grant select on table public."관리_게시판구름_띄우기_V1" to service_role;
grant select on table public."관리_고향구름_띄우기_V1" to service_role;
grant select on table public."관리_글로벌구름_띄우기_V1" to service_role;
grant select on table public."요약_구름응답" to service_role;
