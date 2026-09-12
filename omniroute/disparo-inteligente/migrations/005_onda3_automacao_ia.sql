create table if not exists public.automation_flows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  trigger_type text not null check (trigger_type in ('message_received','keyword','campaign_finished','schedule')),
  trigger_config jsonb not null default '{}',
  condition_config jsonb not null default '{}',
  action_config jsonb not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  provider text not null default 'openai',
  model text not null default 'gpt-4o-mini',
  system_prompt text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_faq_entries (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follow_up_sequences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  stop_on_reply boolean not null default true,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follow_up_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.follow_up_sequences(id) on delete cascade,
  step_order integer not null,
  delay_days integer not null default 1 check (delay_days >= 0),
  body text not null,
  created_at timestamptz not null default now(),
  unique(sequence_id, step_order)
);

create index if not exists idx_automation_flows_user on public.automation_flows(user_id, enabled);
create index if not exists idx_ai_agents_user on public.ai_agents(user_id, enabled);
create index if not exists idx_faq_agent on public.ai_faq_entries(agent_id);
create index if not exists idx_follow_up_sequences_user on public.follow_up_sequences(user_id, enabled);
