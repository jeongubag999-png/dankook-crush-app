alter table public.dku_verifications
  add column if not exists auto_review_status text,
  add column if not exists auto_review_reason text,
  add column if not exists ocr_student_id text,
  add column if not exists ocr_department text,
  add column if not exists ocr_enrollment_status text,
  add column if not exists auto_reviewed_at timestamptz;

alter table public.dku_verifications
  alter column name drop not null,
  alter column student_id drop not null,
  alter column screenshot_path drop not null;

create index if not exists idx_dku_verifications_auto_review_status
  on public.dku_verifications (auto_review_status);

create or replace function public.scrub_dku_verification_private_fields()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('approved', 'rejected') then
    new.name := null;
    new.student_id := null;
    new.ocr_student_id := null;
    new.screenshot_path := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_scrub_dku_verification_private_fields
  on public.dku_verifications;

create trigger trg_scrub_dku_verification_private_fields
before insert or update on public.dku_verifications
for each row
execute function public.scrub_dku_verification_private_fields();
