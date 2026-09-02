-- Admin-only management/stat views, deletion masking, and stricter core table rules.
-- Run in Supabase SQL Editor. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1) Admin/stat views: expose them only to dashboard/service-level roles.
-- Views do not support table RLS directly, so broad anon/authenticated grants are
-- removed from every admin/stat view name pattern.
-- ---------------------------------------------------------------------------

drop view if exists public."관리_구름보내기_V1";

create view public."관리_구름보내기_V1" as
select
  cp.id as "구름번호",
  to_char(cp.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "작성시간",
  cp.sender_user_id as "보낸사람ID",
  cp.sender_nickname as "보낸사람닉네임",
  cp.sender_gender as "보낸사람성별",
  cp.target_gender as "찾는사람성별",
  cp.seen_date as "마주친날짜",
  cp.time_period as "시간",
  coalesce(cp.main_place, split_part(cp.place, ' - ', 1)) as "장소",
  coalesce(cp.detail_place, nullif(split_part(cp.place, ' - ', 2), '')) as "구체적인위치",
  cp.hair_color as "헤어색깔",
  cp.hat_status as "모자유무",
  cp.bangs_status as "앞머리유무",
  cp.glasses_status as "안경유무",
  cp.top_type as "상의종류",
  cp.top_color as "상의색상",
  cp.top_detail as "상의추가설명_선택사항",
  cp.outer_type as "아우터종류",
  cp.outer_color as "아우터색상",
  cp.bottom_type as "하의종류",
  cp.bottom_color as "하의색상",
  cp.bottom_detail as "하의추가설명_선택사항",
  cp.shoe_type as "신발",
  cp.shoe_detail as "신발추가설명_선택사항",
  cp.bag_type as "가방유무",
  cp.earphone_type as "이어폰_헤드셋",
  cp.item_detail as "소지품추가설명_선택사항",
  cp.message as "짧은메세지"
from public.crush_posts cp
where public.is_dankkum_admin()
order by cp.created_at desc;

drop view if exists public."관리_구름확인하기_V1";

create view public."관리_구름확인하기_V1" as
select
  cc.id as "구름확인 기록번호",
  to_char(cc.checked_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS') as "확인한 시간",
  cc.checker_user_id as "확인한 사람 id",
  cc.checker_nickname as "확인한 사람 닉네임",
  cc.checker_gender as "확인한 사람 성별",
  cc.seen_date as "입력한 날짜",
  cc.female_hair_style as "여자 헤어스타일",
  coalesce(nullif(cc.female_hair_color, ''), nullif(cc.male_hair_color, '')) as "헤어색깔",
  coalesce(nullif(cc.female_hat, ''), nullif(cc.male_hat, '')) as "모자유무",
  coalesce(nullif(cc.female_bangs, ''), nullif(cc.male_bangs, '')) as "앞머리 유무",
  cc.glasses_type as "안경 유무",
  cc.top_type as "상의 종류",
  cc.top_color as "상의 색상",
  cc.outer_type as "아우터 종류",
  cc.outer_color as "아우터 색상",
  cc.bottom_type as "하의 종류",
  cc.bottom_color as "하의 색상",
  cc.shoe_type as "신발",
  cc.bag_type as "가방 유무",
  cc.earphone_type as "이어폰/헤드셋"
from public.cloud_checks cc
where public.is_dankkum_admin()
order by cc.checked_at desc;

do $$
declare
  admin_view record;
begin
  for admin_view in
    select table_schema, table_name
    from information_schema.views
    where table_schema = 'public'
      and (
        table_name = 'cloud_posts'
        or table_name like 'admin\_%' escape '\'
        or table_name like '관리\_%' escape '\'
        or table_name like '요약\_%' escape '\'
      )
  loop
    execute format(
      'revoke all privileges on table %I.%I from anon, authenticated',
      admin_view.table_schema,
      admin_view.table_name
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Mask duplicated private data when a profile is marked as deleted.
-- ---------------------------------------------------------------------------

create or replace function public.scrub_deleted_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_deleted = true then
    new.nickname := '탈퇴한 사용자';
    new.instagram_id := null;
    new.bio := null;
    new.profile_image_url := null;
    new.department := null;
    new.student_year := null;
    new.deleted_at := coalesce(new.deleted_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_scrub_deleted_profile_fields on public.profiles;
create trigger trg_scrub_deleted_profile_fields
before insert or update of is_deleted on public.profiles
for each row
execute function public.scrub_deleted_profile_fields();

create or replace function public.mask_deleted_user_related_private_data()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_deleted = true and coalesce(old.is_deleted, false) = false then
    update public.crush_posts
       set sender_nickname = '탈퇴한 사용자',
           sender_instagram = null,
           message = null
     where sender_user_id = new.user_id;

    update public.claims
       set claimer_nickname = '탈퇴한 사용자',
           claimer_instagram = null,
           claimer_message = null,
           second_message = null,
           claimer_department = null,
           claimer_student_id = null,
           claimer_photo_url = null,
           claimer_introduction = null,
           claimer_profile_image_url = null,
           response_message = null
     where claimer_user_id = new.user_id;

    update public.cloud_checks
       set checker_nickname = '탈퇴한 사용자',
           checker_instagram = null
     where checker_user_id = new.user_id;

    update public.cloud_views
       set viewer_nickname = '탈퇴한 사용자',
           viewer_instagram = null
     where viewer_user_id = new.user_id;

    update public.chat_messages
       set body = '탈퇴한 사용자의 메시지입니다.'
     where sender_user_id = new.user_id;

    update public.app_session_logs
       set login_id = null
     where user_id = new.user_id;

    update public.app_error_logs
       set login_id = null
     where user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mask_deleted_user_related_private_data on public.profiles;
create trigger trg_mask_deleted_user_related_private_data
after update of is_deleted on public.profiles
for each row
execute function public.mask_deleted_user_related_private_data();

-- ---------------------------------------------------------------------------
-- 3) Tighten core chat/cloud/response tables.
-- NULL checks are preflighted first so existing bad rows are not silently changed.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from public.crush_posts where sender_user_id is null or sender_nickname is null or sender_gender is null or target_gender is null or seen_date is null or place is null or time_period is null or created_at is null) then
    raise exception 'crush_posts has NULL values in required columns. Fix data before setting NOT NULL.';
  end if;

  if exists (select 1 from public.claims where crush_post_id is null or claimer_user_id is null or status is null or created_at is null) then
    raise exception 'claims has NULL values in required columns. Fix data before setting NOT NULL.';
  end if;

  if exists (select 1 from public.cloud_checks where checker_user_id is null or checker_nickname is null or checker_gender is null or seen_date is null or checked_at is null or result_count is null or created_at is null) then
    raise exception 'cloud_checks has NULL values in required columns. Fix data before setting NOT NULL.';
  end if;

  if exists (select 1 from public.cloud_views where crush_post_id is null or viewer_user_id is null or viewed_at is null or created_at is null) then
    raise exception 'cloud_views has NULL values in required columns. Fix data before setting NOT NULL.';
  end if;

  if exists (select 1 from public.chat_rooms where claim_id is null or crush_post_id is null or sender_user_id is null or claimer_user_id is null or created_at is null) then
    raise exception 'chat_rooms has NULL values in required columns. Fix data before setting NOT NULL.';
  end if;

  if exists (select 1 from public.chat_messages where chat_room_id is null or sender_user_id is null or body is null or created_at is null) then
    raise exception 'chat_messages has NULL values in required columns. Fix data before setting NOT NULL.';
  end if;
end $$;

alter table public.crush_posts
  alter column sender_user_id set not null,
  alter column sender_nickname set not null,
  alter column sender_gender set not null,
  alter column target_gender set not null,
  alter column seen_date set not null,
  alter column place set not null,
  alter column time_period set not null,
  alter column created_at set not null;

alter table public.claims
  alter column crush_post_id set not null,
  alter column claimer_user_id set not null,
  alter column status set not null,
  alter column created_at set not null;

alter table public.cloud_checks
  alter column checker_user_id set not null,
  alter column checker_nickname set not null,
  alter column checker_gender set not null,
  alter column seen_date set not null,
  alter column checked_at set not null,
  alter column result_count set not null,
  alter column created_at set not null;

alter table public.cloud_views
  alter column crush_post_id set not null,
  alter column viewer_user_id set not null,
  alter column viewed_at set not null,
  alter column created_at set not null;

alter table public.chat_rooms
  alter column claim_id set not null,
  alter column crush_post_id set not null,
  alter column sender_user_id set not null,
  alter column claimer_user_id set not null,
  alter column created_at set not null;

alter table public.chat_messages
  alter column chat_room_id set not null,
  alter column sender_user_id set not null,
  alter column body set not null,
  alter column created_at set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'crush_posts_gender_values_check' and conrelid = 'public.crush_posts'::regclass) then
    alter table public.crush_posts
      add constraint crush_posts_gender_values_check
      check (sender_gender in ('여자', '남자') and target_gender in ('여자', '남자'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'claims_status_values_check' and conrelid = 'public.claims'::regclass) then
    alter table public.claims
      add constraint claims_status_values_check
      check (status in ('pending', 'accepted', 'chat_requested', 'chat_accepted', 'rejected'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'claims_rejected_by_values_check' and conrelid = 'public.claims'::regclass) then
    alter table public.claims
      add constraint claims_rejected_by_values_check
      check (rejected_by is null or rejected_by in ('sender', 'claimer'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cloud_checks_gender_values_check' and conrelid = 'public.cloud_checks'::regclass) then
    alter table public.cloud_checks
      add constraint cloud_checks_gender_values_check
      check (checker_gender in ('여자', '남자'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'cloud_checks_result_count_nonnegative_check' and conrelid = 'public.cloud_checks'::regclass) then
    alter table public.cloud_checks
      add constraint cloud_checks_result_count_nonnegative_check
      check (result_count >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chat_rooms_distinct_participants_check' and conrelid = 'public.chat_rooms'::regclass) then
    alter table public.chat_rooms
      add constraint chat_rooms_distinct_participants_check
      check (sender_user_id <> claimer_user_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chat_messages_body_not_blank_check' and conrelid = 'public.chat_messages'::regclass) then
    alter table public.chat_messages
      add constraint chat_messages_body_not_blank_check
      check (length(btrim(body)) > 0);
  end if;
end $$;
