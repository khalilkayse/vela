-- Key/value settings for the hidden /dashx console (SMTP, etc.).

create table if not exists platform_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);
