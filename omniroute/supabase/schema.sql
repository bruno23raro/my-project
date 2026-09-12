create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id text primary key,
  platform text not null,
  handle text not null,
  status text not null default 'connected',
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  caption text not null,
  date timestamptz not null,
  platform text not null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
alter table public.posts enable row level security;

revoke all on public.accounts from anon, authenticated;
revoke all on public.posts from anon, authenticated;

grant all on public.accounts to service_role;
grant all on public.posts to service_role;

insert into public.accounts (id, platform, handle)
values
  ('instagram-marina', 'Instagram', '@marina.costa'),
  ('linkedin-marina', 'LinkedIn', 'Marina Costa'),
  ('youtube-marina', 'YouTube', '@marinacosta'),
  ('tiktok-marina', 'TikTok', '@marinacosta')
on conflict (id) do nothing;