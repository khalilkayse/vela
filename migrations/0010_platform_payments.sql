-- Platform-wide Sifalo Pay: one merchant account for every shop, with sandbox
-- and live credentials, a platform fee per sale, and manual seller payouts.
-- Demo checkout is retired.

alter table orders add column if not exists fee_amount numeric(12,2) not null default 0;
alter table orders add column if not exists net_amount numeric(12,2) not null default 0;
alter table orders add column if not exists sifalo_env text;
alter table orders add column if not exists payout_id integer;

-- A Sifalo sid identifies one real transaction — it must not be reusable
-- across orders (replay protection for `finalizeSifaloReturn`).
create unique index if not exists orders_sifalo_sid_uq
  on orders (sifalo_sid) where sifalo_sid is not null;

alter table shops add column if not exists payout_method text;
alter table shops add column if not exists payout_account text;
alter table shops add column if not exists payout_name text;

create table if not exists payouts (
  id serial primary key,
  shop_id integer not null references shops(id) on delete cascade,
  user_id text not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  method text not null default '',
  account text not null default '',
  reference text not null default '',
  note text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists payouts_shop_id_idx on payouts (shop_id);

alter table orders add constraint orders_payout_id_fkey
  foreign key (payout_id) references payouts(id) on delete set null;

-- Move the single platform merchant credentials to env-specific keys. Old
-- combined keys are dropped once copied so a stale value can't leak into the
-- new sandbox/live split.
insert into platform_settings (key, value)
select 'sifalo_live_api_user', value from platform_settings where key = 'sifalo_api_key'
on conflict (key) do update set value = excluded.value;

insert into platform_settings (key, value)
select 'sifalo_live_api_key', value from platform_settings where key = 'sifalo_api_password'
on conflict (key) do update set value = excluded.value;

delete from platform_settings where key in (
  'sifalo_api_key', 'sifalo_api_password', 'sifalo_use_platform',
  'sifalo_gateway_url', 'sifalo_verify_url', 'sifalo_checkout_page'
);

-- Sellers no longer bring their own Sifalo Pay account — every checkout runs
-- through the platform merchant above.
update shops set
  sifalo_api_key = null,
  sifalo_api_password = null,
  sifalo_connected = false,
  allow_own_sifalo = false
where sifalo_api_key is not null or sifalo_api_password is not null or allow_own_sifalo;

-- The seeded demo storefront must not take real checkouts in production.
update shops set published = false where user_id = 'demo-maya';
