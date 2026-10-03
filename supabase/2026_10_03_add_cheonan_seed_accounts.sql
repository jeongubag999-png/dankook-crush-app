-- 천안캠퍼스 시드 계정(test27~test31)을 시드 계정 목록에 추가한다.
-- 2026_09_28_tame_daily_activity_milestone_push.sql의 is_seed_account를 덮어쓴다.
-- 시드 계정 활동은 전체 푸시 알림을 트리거하지 않는다.

create or replace function public.is_seed_account(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- 시드 스크립트의 makeAuthEmail(loginId)와 같은 규칙: user-<base64url(loginId)>@dankum.app
  -- auth.users.email은 사용자가 임의로 바꿀 수 없어 user_metadata보다 안전하다.
  -- Supabase Auth는 이메일을 소문자로 저장하므로 소문자로 비교한다.
  select exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and lower(u.email) in (
        -- 죽전 test12~test26
        'user-dgvzddey@dankum.app', 'user-dgvzddez@dankum.app', 'user-dgvzdde0@dankum.app',
        'user-dgvzdde1@dankum.app', 'user-dgvzdde2@dankum.app', 'user-dgvzdde3@dankum.app',
        'user-dgvzdde4@dankum.app', 'user-dgvzdde5@dankum.app', 'user-dgvzddiw@dankum.app',
        'user-dgvzddix@dankum.app', 'user-dgvzddiy@dankum.app', 'user-dgvzddiz@dankum.app',
        'user-dgvzddi0@dankum.app', 'user-dgvzddi1@dankum.app', 'user-dgvzddi2@dankum.app',
        -- 천안 test27~test31
        'user-dgvzddi3@dankum.app', 'user-dgvzddi4@dankum.app', 'user-dgvzddi5@dankum.app',
        'user-dgvzddmw@dankum.app', 'user-dgvzddmx@dankum.app'
      )
  );
$$;

revoke all on function public.is_seed_account(uuid) from public, anon, authenticated;
