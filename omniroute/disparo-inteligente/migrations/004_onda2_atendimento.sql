create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','instagram')),
  status text not null default 'open' check (status in ('open','resolved')),
  assigned_to uuid references public.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  body text not null,
  external_id text,
  status text not null default 'received' check (status in ('received','queued','sent','delivered','read','failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  body text not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp','instagram','both')),
  approval_status text not null default 'draft' check (approval_status in ('draft','pending','approved','rejected')),
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  template_id uuid references public.message_templates(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  kind text not null default 'campaign' check (kind in ('campaign','follow_up')),
  payload jsonb not null default '{}',
  scheduled_for timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','processing','completed','cancelled','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_user_status on public.conversations(user_id, status, last_message_at desc);
create index if not exists idx_conversation_messages_conversation on public.conversation_messages(conversation_id, created_at);
create index if not exists idx_templates_user on public.message_templates(user_id, updated_at desc);
create index if not exists idx_scheduled_jobs_due on public.scheduled_jobs(status, scheduled_for);
