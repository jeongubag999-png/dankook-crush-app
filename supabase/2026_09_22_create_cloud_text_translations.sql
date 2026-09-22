-- Cache translations of user-authored cloud text. Original cloud columns remain untouched.
create table if not exists public.cloud_text_translations (
  id uuid primary key default gen_random_uuid(),
  source_hash text not null,
  source_text text not null,
  source_language text,
  target_language text not null check (target_language in ('ko', 'en')),
  translated_text text not null,
  post_id uuid references public.crush_posts(id) on delete set null,
  field_name text not null default 'message',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_hash, target_language)
);

create index if not exists cloud_text_translations_post_id_idx
  on public.cloud_text_translations (post_id);

alter table public.cloud_text_translations enable row level security;

-- Clients access translations through the Edge Function. No direct table policy is needed.
comment on table public.cloud_text_translations is
  'Server-managed cache for translations of user-authored cloud text.';
