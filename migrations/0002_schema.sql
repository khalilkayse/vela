-- Vela commerce schema. Idempotent. user_id is TEXT (Better Auth ids).

create table if not exists shops (
  id serial primary key,
  user_id text not null unique,
  username text not null unique,
  display_name text not null,
  tagline text not null default '',
  bio text not null default '',
  avatar_initials text not null default '',
  cover_style text not null default 'dusk',
  layout text not null default 'hybrid',
  website_url text,
  instagram_url text,
  x_url text,
  youtube_url text,
  tiktok_url text,
  sifalo_api_key text,
  sifalo_api_password text,
  sifalo_connected boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shops_username_idx on shops (username);
create index if not exists shops_published_idx on shops (published);

create table if not exists products (
  id serial primary key,
  shop_id integer not null references shops(id) on delete cascade,
  user_id text not null,
  slug text not null,
  title text not null,
  description text not null default '',
  kind text not null default 'digital',
  price numeric(10,2) not null default 0,
  currency text not null default 'USD',
  cover_style text not null default 'mesh-1',
  button_label text not null default 'Buy now',
  delivery_note text not null default '',
  delivery_url text,
  published boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, slug)
);

create index if not exists products_shop_id_idx on products (shop_id);
create index if not exists products_user_id_idx on products (user_id);

create table if not exists page_blocks (
  id serial primary key,
  shop_id integer not null references shops(id) on delete cascade,
  user_id text not null,
  kind text not null default 'link',
  title text not null,
  url text,
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists page_blocks_shop_id_idx on page_blocks (shop_id);

create table if not exists orders (
  id serial primary key,
  shop_id integer not null references shops(id) on delete cascade,
  user_id text not null,
  product_id integer references products(id) on delete set null,
  order_ref text not null unique,
  product_title text not null default '',
  customer_name text not null default '',
  customer_email text not null default '',
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  sifalo_sid text,
  sifalo_key text,
  payment_type text,
  payer_account text,
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists orders_shop_id_idx on orders (shop_id);
create index if not exists orders_user_id_idx on orders (user_id);
create index if not exists orders_order_ref_idx on orders (order_ref);
