-- 버그 수정: 글로벌(언어교환) 구름에서 "선호하는 상대 성별"을 "상관없음"으로
-- 두거나 고르면 구름 띄우기가 항상 실패하던 문제.
--
-- crush_posts_gender_values_check 제약조건이 target_gender를 '여자'/'남자'만
-- 허용하고 있었는데, saveLanguagePost()는 target_gender가 비어있으면
-- "상관없음"을 기본값으로 넣고 UI에도 "상관없음" 선택지가 있어서
-- (src/App.jsx의 saveLanguagePost, 검증 화면 "선호하는 상대 성별 (선택)") 이
-- 값이 그대로 insert되면 체크 제약조건 위반으로 매번 실패했음.
-- (2026-09-15 자기소개 기능 테스트 중 실제로 재현해서 발견 — 자기소개 기능
-- 자체와는 무관한 기존 버그.)
--
-- sender_gender(본인 성별)는 그대로 여자/남자만 허용하고, target_gender
-- (상대 선호 성별)만 '상관없음'을 추가로 허용하도록 넓힌다.
--
-- Supabase SQL Editor에서 실행하세요. 여러 번 실행해도 안전합니다.

alter table public.crush_posts
  drop constraint if exists crush_posts_gender_values_check;

alter table public.crush_posts
  add constraint crush_posts_gender_values_check
  check (
    (sender_gender = any (array['여자'::text, '남자'::text]))
    and (target_gender = any (array['여자'::text, '남자'::text, '상관없음'::text]))
  );
