create extension if not exists pgcrypto;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  price numeric(10,2) not null default 0,
  featured boolean not null default false,
  limits jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user','admin')),
  plan_id uuid references public.plans(id),
  plan_name text not null default 'free',
  status text not null default 'active' check (status in ('active','blocked','pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Disparo Inteligente',
  logo_url text,
  favicon_url text,
  primary_color text default '#7c3aed',
  secondary_color text default '#0ea5e9',
  font_family text default 'Inter',
  hero_title text default 'Automatize vendas e atendimento em WhatsApp e Instagram.',
  hero_subtitle text default 'Crie campanhas de forma rápida e conecte sua operação ao seu funil comercial.',
  cta_primary text default 'Testar grátis',
  cta_secondary text default 'Ver demonstração',
  enabled_sections jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.landing_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null,
  title text,
  description text,
  image_url text,
  order_index integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  message text not null,
  status text not null default 'draft' check (status in ('draft','queued','sending','finished','paused')),
  scheduled_for timestamptz,
  sent_count integer not null default 0,
  delivered_count integer not null default 0,
  responded_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  name text,
  phone text not null,
  tags jsonb not null default '[]',
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  channel text not null default 'whatsapp',
  body text not null,
  status text not null default 'queued' check (status in ('queued','sent','delivered','failed','read')),
  created_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  merchant text not null,
  provider text not null,
  api_key text,
  secret_key text,
  is_enabled boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_campaigns_user on public.campaigns(user_id);
create index if not exists idx_contacts_user on public.contacts(user_id);
create index if not exists idx_integrations_user on public.integrations(user_id);
