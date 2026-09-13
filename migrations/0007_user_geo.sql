-- Signup / last-login country, disabled accounts, per-shop Sifalo override.

create table if not exists user_profiles (
  user_id text primary key,
  signup_country text,
  last_login_at timestamptz,
  last_login_country text,
  last_login_ip text,
  disabled boolean not null default false,
  disabled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_signup_country_idx on user_profiles (signup_country);
create index if not exists user_profiles_last_login_at_idx on user_profiles (last_login_at desc);

alter table shops add column if not exists country text;
alter table shops add column if not exists allow_own_sifalo boolean not null default false;

create index if not exists shops_country_idx on shops (country);
