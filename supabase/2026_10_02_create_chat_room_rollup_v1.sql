-- Supabase Table Editor에서 채팅방별 전체 대화를 한 행으로 확인하는 관리자 전용 뷰.
-- 대화 정렬 기준은 메시지 작성 시각이며, 시간은 한국 표준시로 표시한다.
-- 앱 사용자에게는 노출하지 않고 Dashboard(postgres)와 service_role에서만 조회한다.

drop view if exists public."관리_채팅방 모아보기_V1";

create view public."관리_채팅방 모아보기_V1"
with (security_invoker = true)
as
with room_base as (
  select
    r.id as chat_room_id,
    r.created_at,
    r.closed_at,
    r.sender_user_id,
    r.claimer_user_id,
    r.crush_post_id,
    r.claim_id,
    cp.sender_nickname,
    cl.claimer_nickname,
    cp.seen_date,
    cp.time_period,
    cp.place
  from public.chat_rooms r
  left join public.crush_posts cp
    on cp.id = r.crush_post_id
  left join public.claims cl
    on cl.id = r.claim_id
)
select
  rb.chat_room_id as "채팅방번호",
  case
    when rb.closed_at is not null then '종료됨'
    when now() > rb.created_at + interval '24 hours' then '24시간경과'
    else '진행중'
  end as "상태",
  rb.created_at at time zone 'Asia/Seoul' as "채팅방생성시간",
  rb.closed_at at time zone 'Asia/Seoul' as "채팅방종료시간",
  coalesce(rb.sender_nickname, '구름보낸사람') as "구름보낸사람",
  coalesce(rb.claimer_nickname, '응답한사람') as "응답한사람",
  rb.seen_date as "마주친날짜",
  rb.time_period as "시간대",
  rb.place as "장소",
  coalesce(message_rollup.message_count, 0) as "메시지수",
  message_rollup.first_message_at at time zone 'Asia/Seoul' as "첫메시지시간",
  message_rollup.last_message_at at time zone 'Asia/Seoul' as "마지막메시지시간",
  coalesce(message_rollup.conversation_text, '메시지 없음') as "대화내용",
  coalesce(message_rollup.conversation_json, '[]'::jsonb) as "대화내용_JSON",
  rb.crush_post_id as "구름번호",
  rb.claim_id as "응답번호",
  rb.sender_user_id as "구름보낸사람ID",
  rb.claimer_user_id as "응답한사람ID"
from room_base rb
left join lateral (
  select
    count(m.id)::integer as message_count,
    min(m.created_at) as first_message_at,
    max(m.created_at) as last_message_at,
    string_agg(
      concat(
        '[',
        to_char(m.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS'),
        '] ',
        case
          when m.sender_user_id = rb.sender_user_id
            then coalesce(rb.sender_nickname, '구름보낸사람')
          when m.sender_user_id = rb.claimer_user_id
            then coalesce(rb.claimer_nickname, '응답한사람')
          else '시스템'
        end,
        ': ',
        regexp_replace(coalesce(m.body, ''), E'[\\r\\n]+', ' ', 'g')
      ),
      E'\n' order by m.created_at, m.id
    ) as conversation_text,
    jsonb_agg(
      jsonb_build_object(
        '메시지번호', m.id,
        '시간', to_char(m.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS'),
        '보낸사람', case
          when m.sender_user_id = rb.sender_user_id
            then coalesce(rb.sender_nickname, '구름보낸사람')
          when m.sender_user_id = rb.claimer_user_id
            then coalesce(rb.claimer_nickname, '응답한사람')
          else '시스템'
        end,
        '보낸사람ID', m.sender_user_id,
        '내용', m.body,
        '읽은시간', case
          when m.read_at is null then null
          else to_char(m.read_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS')
        end
      ) order by m.created_at, m.id
    ) as conversation_json
  from public.chat_messages m
  where m.chat_room_id = rb.chat_room_id
) message_rollup on true
order by coalesce(message_rollup.last_message_at, rb.created_at) desc;

comment on view public."관리_채팅방 모아보기_V1" is
  '관리자가 채팅방별 참여자와 전체 메시지를 시간순으로 모아 보는 읽기 전용 뷰';

revoke all on table public."관리_채팅방 모아보기_V1" from anon, authenticated;
grant select on table public."관리_채팅방 모아보기_V1" to service_role;
