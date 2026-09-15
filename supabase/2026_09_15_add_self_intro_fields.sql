-- 구름을 확인할 때/구름 찾아주기 게시판에서 "이런 사람이 이 구름을 띄웠구나"를
-- 알 수 있도록, 신원이 특정되지 않는 선에서 최소한의 자기소개(성별/학과/MBTI/한줄
-- 소개)를 보여주기 위한 스키마 변경.
--
-- 성별(sender_gender)/닉네임(sender_nickname)은 기존에 이미 crush_posts에
-- 저장되고 있었음. 여기서는 학과/MBTI/한줄소개를 같은 방식(작성 시점 스냅샷)으로
-- 추가한다. profiles.mbti는 새로 추가하는 컬럼(기존에 없었음).
--
-- 왜 crush_posts에 다시 저장(비정규화)하는가: profiles 테이블은 RLS로 "본인
-- 행만 select 가능"하게 잠겨 있어서(2026_08_29_lock_down_profiles_and_verifications_rls.sql),
-- 화면에서 다른 사람의 profiles 행을 직접 조회할 수 없다. crush_posts는 이미
-- sender_nickname/sender_instagram/sender_gender를 작성 시점에 복사해두는
-- 방식을 쓰고 있으므로 같은 패턴을 따른다.
--
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

alter table public.profiles
  add column if not exists mbti text;

alter table public.crush_posts
  add column if not exists sender_department text,
  add column if not exists sender_mbti text,
  add column if not exists sender_bio text;
