create type app_mode as enum ('DEMO', 'LIVE');
create type user_status as enum ('ACTIVE', 'SUSPENDED');
create type kyc_status as enum ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'MORE_INFORMATION_REQUIRED', 'EXPIRED');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  status user_status not null default 'ACTIVE',
  kyc_status kyc_status not null default 'NOT_STARTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  mode app_mode not null,
  asset text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, mode, asset)
);

create table ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  mode app_mode not null,
  idempotency_key text not null unique,
  description text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references ledger_transactions(id),
  account_id uuid not null references wallet_accounts(id),
  side text not null check (side in ('DEBIT', 'CREDIT')),
  amount_minor numeric(38,0) not null check (amount_minor > 0)
);

create table kyc_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  mode app_mode not null,
  status kyc_status not null,
  provider text not null,
  review_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz
);

create table provider_configs (
  key text primary key,
  family text not null,
  display_name text not null,
  enabled boolean not null default false,
  priority integer not null check (priority between 1 and 100),
  secret_reference text,
  public_config jsonb not null default '{}',
  status text not null default 'UNCONFIGURED',
  last_tested_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  old_value jsonb,
  new_value jsonb,
  ip inet,
  device text,
  request_id text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table wallet_accounts enable row level security;
alter table ledger_transactions enable row level security;
alter table ledger_entries enable row level security;
alter table kyc_cases enable row level security;

create policy "users read own profile" on profiles for select using (auth.uid() = id);
create policy "users read own wallets" on wallet_accounts for select using (auth.uid() = user_id);
create policy "users read own kyc" on kyc_cases for select using (auth.uid() = user_id);

-- Ledger and administrative writes are service-role only. The API must verify
-- that each ledger transaction has equal debit and credit totals before commit.
