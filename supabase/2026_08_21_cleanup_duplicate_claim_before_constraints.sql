-- Cleanup one known duplicate claim before adding duplicate-prevention constraints.
-- This script keeps a rollback copy first, then preserves the accepted row.
--
-- Rollback data will be stored in:
--   public.dankkum_claims_cleanup_backup_20260821

create table if not exists public.dankkum_claims_cleanup_backup_20260821
(like public.claims including defaults including constraints);

alter table public.dankkum_claims_cleanup_backup_20260821
  add column if not exists backed_up_at timestamptz default now(),
  add column if not exists cleanup_note text;

insert into public.dankkum_claims_cleanup_backup_20260821
select
  c.*,
  now() as backed_up_at,
  'duplicate claim cleanup before claims_crush_post_claimer_unique' as cleanup_note
from public.claims c
where c.id in (
  '33ae7785-dffb-4035-9fe9-f4953be0fc72',
  '568c3028-fcbf-4bd0-9b5a-d32b03474822'
)
and not exists (
  select 1
  from public.dankkum_claims_cleanup_backup_20260821 b
  where b.id = c.id
);

-- Keep the accepted row, but preserve the more complete message from the later
-- pending duplicate.
update public.claims
set claimer_message = '[일치 정도: 거의 저 같아요] 나야 북극곰'
where id = '568c3028-fcbf-4bd0-9b5a-d32b03474822'
  and status = 'accepted';

-- Remove only the pending duplicate. The accepted record remains.
delete from public.claims
where id = '33ae7785-dffb-4035-9fe9-f4953be0fc72'
  and status = 'pending'
  and crush_post_id = '72cd91e9-477f-45c8-a31d-14ee01017f56'
  and claimer_user_id = '97bda27b-ce57-4696-8332-7281e192f7be';

-- Verify this duplicate group now has exactly one row left.
select
  crush_post_id,
  claimer_user_id,
  count(*) as remaining_count,
  array_agg(id::text order by created_at desc) as remaining_claim_ids
from public.claims
where crush_post_id = '72cd91e9-477f-45c8-a31d-14ee01017f56'
  and claimer_user_id = '97bda27b-ce57-4696-8332-7281e192f7be'
group by crush_post_id, claimer_user_id;
