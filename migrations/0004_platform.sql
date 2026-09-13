-- Platform owner console. First matching PLATFORM_ADMIN_EMAILS user, or the
-- first account to sign up when that env is empty, is recorded here.

create table if not exists platform_admins (
  user_id text primary key,
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists platform_admins_email_idx on platform_admins (email);
