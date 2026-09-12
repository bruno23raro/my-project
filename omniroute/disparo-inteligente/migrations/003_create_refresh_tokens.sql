create table if not exists public.refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_refresh_tokens_user on public.refresh_tokens(user_id);
create index if not exists idx_refresh_tokens_active on public.refresh_tokens(token_hash, revoked_at, expires_at);
